/**
 * Caster-first swap-order meta-journey sim.
 *
 * Tests the hub character-swap feature (`selectCharacter` / `carrySoulProgress`):
 * between lives the soul can change class WITHOUT losing renown — renown and the
 * Grove ledger (metaStore) persist; the new vessel starts a fresh L1 run.
 *
 * STRATEGY UNDER TEST — "Caster-first": open the journey on the glass-cannon
 * Wizard, then swap to the durable Fighter to close out the harder ascension
 * tiers (the inverse of tank-first). Two swap-timing variants:
 *   - caster-first-half:    Wizard for the first half of the life budget, Fighter after.
 *   - caster-first-onclear: Wizard until the FIRST full-chain clear, Fighter after.
 * Baselines for "does swapping beat staying one class?":
 *   - wizard-only / fighter-only (never swap).
 *
 * Unlike sim-reincarnation-loop (which stops a chain on the first clear and asks
 * "did the soul ever clear in N lives"), this models the FULL meta journey: it
 * keeps reincarnating across a fixed life budget, accumulating renown past
 * clears, buying Grove upgrades, and CLIMBING THE ASCENSION LADDER. Each run is
 * played at the soul's highest-unlocked ascension; a full-chain clear at that
 * level unlocks the next rung (mirrors delveStore.finishDelve + metaStore).
 *
 * Combat uses the shared competent auto-battle policy (encounterStress.takeTurn
 * -> runAutoTurn, #147), so results track real play.
 *
 * Persistence modelled (mirrors carrySoulProgress + startDelve + finishDelve):
 *  - renown            (cumulative; soul-level; survives swaps and the wheel)
 *  - unlockedUpgrades  (Grove ledger; metaStore — untouched by a swap)
 *  - ascensionUnlocked (highest rung reachable; only climbs)
 *  - inventory         (carried forward)
 *  - quirks            (rerolled per life — every transition here is a death/clear)
 *
 * Renown formula matches delveStore.finishDelve EXACTLY:
 *   base = (clear ? 50 : 15) + 10*bossesKilled + 1*roomsReached
 *   gain = floor(base * soulMarkMult * ascensionRenownMult)
 *
 * Run:
 *   JOURNEYS=200 LIVES=40 npx tsx scripts/sim-order-casterfirst.ts
 *
 * Writes raw matrix to docs/gameplay-quality/order-casterfirst.raw.md.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

import { createDiceRoller, setActiveRoller, type DiceRoller } from '../src/engine/dice';
import { getMonster } from '../src/content/monsters';
import { applyLevelUp, xpForLevel, MAX_LEVEL } from '../src/engine/character/leveling';
import { shortRestHeal, longRest } from '../src/engine/character/actions';
import { createGodwakeDelve } from '../src/engine/delve/createDelve';
import { createCombat, _resetMonsterInstanceCounter } from '../src/engine/combat/createCombat';
import { monsterAttack } from '../src/engine/combat/attack/monsterAttack';
import { endTurn, isPlayerTurn } from '../src/engine/combat/turn';
import {
  applyPermanentUpgrade,
  applyDelveStartUpgrades,
  type UnlockedUpgrades,
} from '../src/engine/character/upgrades';
import { findUpgrade } from '../src/content/upgrades';
import { characterAtLevel, takeTurn } from '../src/test/sim/encounterStress';
import { rollQuirks, renownSoulMarkMultiplier } from '../src/engine/character/quirks';
import { rollBlessingOptions } from '../src/engine/character/blessings';
import { getAscensionLevel, MAX_ASCENSION } from '../src/engine/delve/ascension';
import type { Character } from '../src/types/character';
import type { CombatState } from '../src/types/combat';
import type { RoomSpec } from '../src/types/delve';

type ClassId = 'rogue' | 'fighter' | 'wizard';
type Policy = 'caster-first-half' | 'caster-first-onclear' | 'wizard-only' | 'fighter-only';

const JOURNEYS = Number(process.env.JOURNEYS ?? process.env.RUNS_PER_CELL ?? 400);
const LIVES_PER_JOURNEY = Number(process.env.LIVES ?? 60);
const MAX_TURNS_PER_FIGHT = 200;
const SEED_BASE = 0xca57e7 >>> 0;

// Mirrors delveStore.ts constants.
const RENOWN_PER_DELVE_CLEAR = 50;
const RENOWN_PER_DELVE_FAILURE = 15;
const RENOWN_PER_CHAPTER_BOSS = 10;
const RENOWN_PER_ROOM_REACHED = 1;
const GROVE_UNLOCK_THRESHOLD = 30;

const TOTAL_ROOMS = 50;

// ─── Grove purchase priorities ──────────────────────────────────────────────
// Greedy buy at each life transition: the soul re-evaluates and buys the
// affordable upgrade highest in its class list. Deeper-tier gated upgrades
// (wellspring-depths @asc1, crown-of-the-returned @asc3) are included — a real
// climbing soul buys them once the ascension gate opens; buyUpgrades enforces
// the gate so they never appear early.

const SHARED_PRIORITY: { id: string; maxAtRank: number }[] = [
  { id: 'pilgrims-boots', maxAtRank: 1 },        // +5 ft move, cost 25 — first target
  { id: 'mielikki-cache', maxAtRank: 4 },        // +N potions/delve
  { id: 'mantle-of-the-wakened', maxAtRank: 5 }, // +5 HP/rank
  { id: 'wellspring-depths', maxAtRank: 3 },     // +10 HP/rank — gated @asc1
  { id: 'cloak-of-the-grove', maxAtRank: 3 },    // +1 AC/rank
  { id: 'crown-of-the-returned', maxAtRank: 2 }, // +1 atk & spell-atk — gated @asc3, both classes
  { id: 'hardier-soul', maxAtRank: 3 },          // +1 stabilise/rank
  { id: 'stoneweave-boots', maxAtRank: 4 },      // +1 init/rank
  { id: 'coin-in-pocket', maxAtRank: 3 },        // +25 gold start / +5 per ch-boss
  { id: 'iron-will', maxAtRank: 1 },             // +5 HP one-shot
];

const CLASS_PRIORITY: Record<ClassId, { id: string; maxAtRank: number }[]> = {
  rogue: [
    { id: 'shadowstep', maxAtRank: 3 },
    { id: 'knife-in-the-dark', maxAtRank: 3 },
    { id: 'heirloom-blade', maxAtRank: 4 },
    { id: 'whetstone-resolve', maxAtRank: 4 },
    { id: 'killers-eye', maxAtRank: 2 },
  ],
  fighter: [
    { id: 'wellspring-vigil', maxAtRank: 3 },
    { id: 'heirloom-blade', maxAtRank: 4 },
    { id: 'whetstone-resolve', maxAtRank: 4 },
    { id: 'first-cut', maxAtRank: 3 },
    { id: 'fellfast-strike', maxAtRank: 3 },
  ],
  wizard: [
    { id: 'burning-tongue', maxAtRank: 5 },
    { id: 'arcane-focus', maxAtRank: 3 },
    { id: 'sigil-of-the-wakened-mind', maxAtRank: 3 },
  ],
};

function priorityFor(classId: ClassId): { id: string; maxAtRank: number }[] {
  const cls = CLASS_PRIORITY[classId];
  const out: { id: string; maxAtRank: number }[] = [];
  out.push(SHARED_PRIORITY[0]); // pilgrims-boots
  const maxLen = Math.max(cls.length, SHARED_PRIORITY.length - 1);
  for (let i = 0; i < maxLen; i++) {
    if (i < cls.length) out.push(cls[i]);
    if (i + 1 < SHARED_PRIORITY.length) out.push(SHARED_PRIORITY[i + 1]);
  }
  return out;
}

/** Greedy "spend renown" between lives. Respects the ascension unlock gate. */
function buyUpgrades(
  classId: ClassId,
  renown: number,
  unlocked: UnlockedUpgrades,
  ascensionUnlocked: number,
): { renown: number; unlocked: UnlockedUpgrades; purchased: string[]; spent: number } {
  let r = renown;
  const u: UnlockedUpgrades = { ...unlocked };
  const purchased: string[] = [];
  let spent = 0;
  if (r < GROVE_UNLOCK_THRESHOLD) {
    return { renown: r, unlocked: u, purchased, spent };
  }
  const list = priorityFor(classId);
  let bought = true;
  let safety = 0;
  while (bought && safety < 80) {
    bought = false;
    safety += 1;
    for (const { id, maxAtRank } of list) {
      const up = findUpgrade(id);
      if (!up) continue;
      // Deeper-tier gate: cannot buy until the ascension ladder has opened it.
      if (up.unlock && ascensionUnlocked < up.unlock.ascension) continue;
      const curRank = u[id] ?? 0;
      const targetRank = Math.min(maxAtRank, up.maxRank);
      if (curRank >= targetRank) continue;
      const nextRank = curRank + 1;
      const cost = up.costForRank(nextRank);
      if (r >= cost) {
        r -= cost;
        spent += cost;
        u[id] = nextRank;
        purchased.push(`${id}@${nextRank}`);
        bought = true;
        break; // restart from top of priority list each purchase
      }
    }
  }
  return { renown: r, unlocked: u, purchased, spent };
}

/** Apply ALL ranks of currently-unlocked permanent upgrades to a fresh character. */
function applyPermanentUpgrades(c: Character, unlocked: UnlockedUpgrades): Character {
  let ch = c;
  for (const [id, rank] of Object.entries(unlocked)) {
    const up = findUpgrade(id);
    if (!up || up.kind !== 'permanent') continue;
    for (let r = 1; r <= rank; r++) {
      ch = applyPermanentUpgrade(ch, id, r);
    }
  }
  const permHp = ch.permanentBonuses?.hp ?? 0;
  if (permHp > 0) {
    const newMax = ch.hp.max + permHp;
    ch = { ...ch, hp: { current: newMax, max: newMax, temp: ch.hp.temp } };
  }
  return ch;
}

interface JourneyState {
  renown: number;
  unlockedUpgrades: UnlockedUpgrades;
  ascensionUnlocked: number;
  inventory: Character['inventory'];
  quirks: string[];
}

/**
 * Build the vessel for one descent at `classId`. Mirrors selectCharacter ->
 * carrySoulProgress + startDelve: fresh L1 archetype of the chosen class, with
 * the persistent Grove ledger re-baked on and the inventory carried forward.
 * Quirks rerolled (every transition in a journey is a death/clear = the wheel).
 */
function descend(roller: DiceRoller, classId: ClassId, soul: JourneyState): Character {
  let c = characterAtLevel(classId, 1);
  c = applyPermanentUpgrades(c, soul.unlockedUpgrades);
  c = applyDelveStartUpgrades(c, soul.unlockedUpgrades);
  if (soul.inventory.length > 0) {
    const merged =
      soul.inventory.length > c.inventory.length ? soul.inventory : c.inventory;
    c = { ...c, inventory: [...merged] };
  }
  const quirks = rollQuirks(roller, 2);
  c = { ...c, quirks };
  c = { ...c, hp: { ...c.hp, current: c.hp.max } };
  return longRest(c);
}

function roomChapter(idx: number): number {
  if (idx <= 11) return 1;
  if (idx <= 24) return 2;
  if (idx <= 37) return 3;
  return 4;
}

function runCombatRoom(
  roller: DiceRoller,
  characterIn: Character,
  room: RoomSpec,
  ascension: number,
): { character: Character; victory: boolean } {
  _resetMonsterInstanceCounter();
  const monsterRefs = (room.monsters ?? []).flatMap((rm) => {
    const def = getMonster(rm.defId);
    return Array.from({ length: rm.count }, () => ({ def, displayName: rm.displayPrefix }));
  });
  const init = createCombat({ roller, character: characterIn, monsters: monsterRefs, ascension });
  let state: CombatState = init.state;
  let character: Character = init.character;

  let turns = 0;
  while (state.status === 'active' && turns < MAX_TURNS_PER_FIGHT * 4) {
    if (isPlayerTurn(state)) {
      const turn = takeTurn(roller, state, character);
      state = turn.state;
      character = turn.character;
      if (state.status !== 'active') break;
      const ended = endTurn(state, character);
      state = ended.state;
      character = ended.character;
    } else {
      const r = monsterAttack(
        { roller, character, state },
        state.turnOrder[state.currentTurnIndex],
      );
      state = r.state;
      character = r.character;
      if (state.status !== 'active') break;
      const ended = endTurn(state, character);
      state = ended.state;
      character = ended.character;
    }
    turns += 1;
  }
  return { character, victory: state.status === 'player-victory' };
}

interface LifeOutcome {
  lifeIdx: number;
  classId: ClassId;
  ascensionPlayed: number;
  cleared: boolean;
  finalRoomIdx: number;
  finalChapter: number;
  finalLevel: number;
  bossesKilled: number;
  renownEarned: number;
  renownSpent: number;
  unlockedRanksAtStart: number;
}

/** Play one full 50-room descent. Returns outcome + the final (run-scoped) char. */
function liveOneLife(
  roller: DiceRoller,
  classId: ClassId,
  soul: JourneyState,
  lifeIdx: number,
  seedBase: number,
): { outcome: LifeOutcome; finalCharacter: Character } {
  let character = descend(roller, classId, soul);
  const ascension = soul.ascensionUnlocked;
  const delveSeed =
    ((seedBase + lifeIdx * 7919) ^ (classId.charCodeAt(0) * 1009) ^ (ascension * 2654435761)) >>> 0;
  const delve = createGodwakeDelve({ seed: delveSeed, ascension });

  const unlockedRanksAtStart = Object.values(soul.unlockedUpgrades).reduce((a, b) => a + b, 0);

  let bossesKilled = 0;
  let finalRoomIdx = 0;
  let died = false;

  for (let i = 0; i < delve.rooms.length; i++) {
    finalRoomIdx = i;
    const room = delve.rooms[i];

    if (room.kind === 'rest') {
      character = shortRestHeal(character, Math.floor(character.hp.max * 0.7));
      continue;
    }
    if (room.kind === 'camp') {
      character = longRest(character);
      continue;
    }
    if (room.kind === 'shrine') {
      const options = rollBlessingOptions(roller, 3 + (character.shrineOptionBonus ?? 0));
      const pick = options[0];
      if (pick && !character.blessings.includes(pick)) {
        character = { ...character, blessings: [...character.blessings, pick] };
      }
      continue;
    }
    if (room.kind === 'event') continue;

    const isBoss = room.kind === 'boss';
    const result = runCombatRoom(roller, character, room, ascension);
    character = result.character;

    if (!result.victory) {
      died = true;
      break;
    }
    if (isBoss) bossesKilled += 1;

    const rXp = room.xpReward ?? 0;
    if (rXp > 0) {
      character = { ...character, xp: character.xp + rXp };
      while (character.level < MAX_LEVEL && character.xp >= xpForLevel(character.level + 1)) {
        character = applyLevelUp(character);
      }
    }
  }

  const cleared = !died;
  // Renown EXACTLY per delveStore.finishDelve.
  const depthRenown = RENOWN_PER_ROOM_REACHED * finalRoomIdx;
  const renownBase =
    (cleared ? RENOWN_PER_DELVE_CLEAR : RENOWN_PER_DELVE_FAILURE) +
    RENOWN_PER_CHAPTER_BOSS * bossesKilled +
    depthRenown;
  const ascensionMult = getAscensionLevel(ascension).renownMult;
  const renownEarned = Math.floor(
    renownBase * renownSoulMarkMultiplier(character) * ascensionMult,
  );

  return {
    outcome: {
      lifeIdx,
      classId,
      ascensionPlayed: ascension,
      cleared,
      finalRoomIdx,
      finalChapter: roomChapter(finalRoomIdx),
      finalLevel: character.level,
      bossesKilled,
      renownEarned,
      renownSpent: 0,
      unlockedRanksAtStart,
    },
    finalCharacter: character,
  };
}

function classForLife(
  policy: Policy,
  lifeIdx: number,
  hasClearedYet: boolean,
): ClassId {
  switch (policy) {
    case 'wizard-only':
      return 'wizard';
    case 'fighter-only':
      return 'fighter';
    case 'caster-first-half':
      return lifeIdx < Math.floor(LIVES_PER_JOURNEY / 2) ? 'wizard' : 'fighter';
    case 'caster-first-onclear':
      return hasClearedYet ? 'fighter' : 'wizard';
  }
}

interface JourneyResult {
  policy: Policy;
  lives: LifeOutcome[];
  totalRenownEarned: number;
  finalRenown: number;
  totalClears: number;
  highestAscensionCleared: number; // -1 if never cleared the chain
  ascensionUnlocked: number;
  finalUpgradeRanks: number;
  finalUpgrades: UnlockedUpgrades;
  wizardLives: number;
  fighterLives: number;
  swapLife: number; // first life on the second class, -1 if no swap happened
}

function runJourney(policy: Policy, seedBase: number): JourneyResult {
  const roller = createDiceRoller(seedBase);
  setActiveRoller(seedBase);
  const soul: JourneyState = {
    renown: 0,
    unlockedUpgrades: {},
    ascensionUnlocked: 0,
    inventory: [],
    quirks: [],
  };

  const lives: LifeOutcome[] = [];
  let totalRenownEarned = 0;
  let totalClears = 0;
  let highestAscensionCleared = -1;
  let hasClearedYet = false;
  let wizardLives = 0;
  let fighterLives = 0;
  let swapLife = -1;
  let prevClass: ClassId | null = null;

  for (let life = 0; life < LIVES_PER_JOURNEY; life++) {
    const classId = classForLife(policy, life, hasClearedYet);
    if (prevClass !== null && classId !== prevClass && swapLife === -1) swapLife = life;
    prevClass = classId;
    if (classId === 'wizard') wizardLives += 1;
    else if (classId === 'fighter') fighterLives += 1;

    const { outcome, finalCharacter } = liveOneLife(roller, classId, soul, life, seedBase);

    soul.renown += outcome.renownEarned;
    soul.inventory = finalCharacter.inventory;
    soul.quirks = finalCharacter.quirks;
    totalRenownEarned += outcome.renownEarned;

    if (outcome.cleared) {
      totalClears += 1;
      hasClearedYet = true;
      // A clear at the highest unlocked rung opens the next (Spire-style).
      if (
        outcome.ascensionPlayed >= soul.ascensionUnlocked &&
        soul.ascensionUnlocked < MAX_ASCENSION
      ) {
        soul.ascensionUnlocked += 1;
      }
      if (outcome.ascensionPlayed > highestAscensionCleared) {
        highestAscensionCleared = outcome.ascensionPlayed;
      }
    }

    // Between-life Grove spend.
    const buy = buyUpgrades(classId, soul.renown, soul.unlockedUpgrades, soul.ascensionUnlocked);
    soul.renown = buy.renown;
    soul.unlockedUpgrades = buy.unlocked;
    outcome.renownSpent = buy.spent;

    lives.push(outcome);
  }

  const finalUpgradeRanks = Object.values(soul.unlockedUpgrades).reduce((a, b) => a + b, 0);
  return {
    policy,
    lives,
    totalRenownEarned,
    finalRenown: soul.renown,
    totalClears,
    highestAscensionCleared,
    ascensionUnlocked: soul.ascensionUnlocked,
    finalUpgradeRanks,
    finalUpgrades: soul.unlockedUpgrades,
    wizardLives,
    fighterLives,
    swapLife,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Aggregation
// ─────────────────────────────────────────────────────────────────────────

interface PolicyAggregate {
  policy: Policy;
  journeys: number;
  meanTotalRenownEarned: number;
  meanFinalRenown: number;
  meanTotalClears: number;
  pctEverCleared: number;
  meanHighestAscensionCleared: number; // over journeys that cleared at least once
  ascensionUnlockedHist: number[]; // index 0..6 -> count of journeys ending there
  meanAscensionUnlocked: number;
  pctReachedMaxAscension: number;
  meanFinalUpgradeRanks: number;
  firstClearLifeMean: number; // mean life index of first clear (clearing journeys)
  // Per-life-position curves (averaged across journeys).
  perLife: Array<{
    position: number;
    avgRoomsReached: number;
    avgChapter: number;
    clearRate: number;
    avgAscensionPlayed: number;
    avgFinalLevel: number;
    avgUpgradeRanksAtStart: number;
    wizardShare: number;
    fighterShare: number;
  }>;
  meanWizardLives: number;
  meanFighterLives: number;
  // Wasted off-class Grove ranks at journey end (spell-only ranks for a soul
  // that finished on Fighter, etc.) — surfaces swap dead-weight.
  meanWastedOffClassRanks: number;
}

const WIZARD_ONLY_UPGRADES = new Set([
  'burning-tongue',
  'arcane-focus',
  'sigil-of-the-wakened-mind',
]);
const FIGHTER_ONLY_UPGRADES = new Set([
  'wellspring-vigil',
  'first-cut',
  'fellfast-strike',
]);
const ROGUE_ONLY_UPGRADES = new Set([
  'shadowstep',
  'knife-in-the-dark',
  'killers-eye',
]);

function wastedRanksForFinalClass(u: UnlockedUpgrades, finalClass: ClassId): number {
  let wasted = 0;
  for (const [id, rank] of Object.entries(u)) {
    const offClass =
      (finalClass !== 'wizard' && WIZARD_ONLY_UPGRADES.has(id)) ||
      (finalClass !== 'fighter' && FIGHTER_ONLY_UPGRADES.has(id)) ||
      (finalClass !== 'rogue' && ROGUE_ONLY_UPGRADES.has(id));
    if (offClass) wasted += rank;
  }
  return wasted;
}

function aggregate(policy: Policy, journeys: JourneyResult[]): PolicyAggregate {
  const n = journeys.length;
  const mean = (sel: (j: JourneyResult) => number) =>
    journeys.reduce((s, j) => s + sel(j), 0) / Math.max(1, n);

  const cleared = journeys.filter((j) => j.totalClears > 0);
  const ascensionUnlockedHist = Array.from({ length: MAX_ASCENSION + 1 }, () => 0);
  for (const j of journeys) ascensionUnlockedHist[j.ascensionUnlocked] += 1;

  const firstClearLives = journeys
    .map((j) => j.lives.findIndex((l) => l.cleared))
    .filter((idx) => idx >= 0);
  const firstClearLifeMean =
    firstClearLives.length > 0
      ? firstClearLives.reduce((a, b) => a + b, 0) / firstClearLives.length
      : -1;

  const perLife: PolicyAggregate['perLife'] = [];
  for (let pos = 0; pos < LIVES_PER_JOURNEY; pos++) {
    const slice = journeys.flatMap((j) => (j.lives[pos] ? [j.lives[pos]] : []));
    if (slice.length === 0) continue;
    const a = (sel: (l: LifeOutcome) => number) =>
      slice.reduce((s, l) => s + sel(l), 0) / slice.length;
    perLife.push({
      position: pos + 1,
      avgRoomsReached: a((l) => l.finalRoomIdx + (l.cleared ? 1 : 0)),
      avgChapter: a((l) => l.finalChapter),
      clearRate: slice.filter((l) => l.cleared).length / slice.length,
      avgAscensionPlayed: a((l) => l.ascensionPlayed),
      avgFinalLevel: a((l) => l.finalLevel),
      avgUpgradeRanksAtStart: a((l) => l.unlockedRanksAtStart),
      wizardShare: slice.filter((l) => l.classId === 'wizard').length / slice.length,
      fighterShare: slice.filter((l) => l.classId === 'fighter').length / slice.length,
    });
  }

  const meanWastedOffClassRanks =
    journeys.reduce((s, j) => {
      const finalClass = j.lives[j.lives.length - 1]?.classId ?? 'wizard';
      return s + wastedRanksForFinalClass(j.finalUpgrades, finalClass);
    }, 0) / Math.max(1, n);

  return {
    policy,
    journeys: n,
    meanTotalRenownEarned: mean((j) => j.totalRenownEarned),
    meanFinalRenown: mean((j) => j.finalRenown),
    meanTotalClears: mean((j) => j.totalClears),
    pctEverCleared: cleared.length / Math.max(1, n),
    meanHighestAscensionCleared:
      cleared.length > 0
        ? cleared.reduce((s, j) => s + j.highestAscensionCleared, 0) / cleared.length
        : 0,
    ascensionUnlockedHist,
    meanAscensionUnlocked: mean((j) => j.ascensionUnlocked),
    pctReachedMaxAscension:
      journeys.filter((j) => j.ascensionUnlocked >= MAX_ASCENSION).length / Math.max(1, n),
    meanFinalUpgradeRanks: mean((j) => j.finalUpgradeRanks),
    firstClearLifeMean,
    perLife,
    meanWizardLives: mean((j) => j.wizardLives),
    meanFighterLives: mean((j) => j.fighterLives),
    meanWastedOffClassRanks,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Run matrix
// ─────────────────────────────────────────────────────────────────────────

const POLICIES: Policy[] = [
  'caster-first-half',
  'caster-first-onclear',
  'wizard-only',
  'fighter-only',
];

function runPolicy(policy: Policy): { agg: PolicyAggregate; journeys: JourneyResult[] } {
  const journeys: JourneyResult[] = [];
  for (let i = 0; i < JOURNEYS; i++) {
    // Shared seed stream per journey index across policies → paired comparison.
    const seed = (SEED_BASE ^ (i * 104729) ^ 0x9e3779b9) >>> 0;
    journeys.push(runJourney(policy, seed));
  }
  return { agg: aggregate(policy, journeys), journeys };
}

// ─────────────────────────────────────────────────────────────────────────
// Rendering
// ─────────────────────────────────────────────────────────────────────────

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const num = (n: number, d = 2) => n.toFixed(d);

function renderHeadline(aggs: PolicyAggregate[]): string {
  const lines: string[] = [];
  lines.push(
    '| Policy | Journeys | Ever cleared | Mean clears | Mean Ascension unlocked | Reached Asc 6 | Mean highest Asc cleared | Mean cumul. renown | Mean Grove ranks |',
  );
  lines.push(
    '|------|------:|-----------:|----------:|----------------------:|------------:|----------------------:|-----------------:|---------------:|',
  );
  for (const a of aggs) {
    lines.push(
      `| ${a.policy} | ${a.journeys} | ${pct(a.pctEverCleared)} | ${num(a.meanTotalClears)} | ${num(a.meanAscensionUnlocked)} | ${pct(a.pctReachedMaxAscension)} | ${num(a.meanHighestAscensionCleared)} | ${num(a.meanTotalRenownEarned, 0)} | ${num(a.meanFinalUpgradeRanks)} |`,
    );
  }
  return lines.join('\n');
}

function renderAscensionDist(aggs: PolicyAggregate[]): string {
  const lines: string[] = [];
  lines.push('| Policy | Asc0 | Asc1 | Asc2 | Asc3 | Asc4 | Asc5 | Asc6 | First-clear life (mean) |');
  lines.push('|------|----:|----:|----:|----:|----:|----:|----:|---------------------:|');
  for (const a of aggs) {
    const h = a.ascensionUnlockedHist.map((c) => pct(c / Math.max(1, a.journeys)));
    lines.push(
      `| ${a.policy} | ${h[0]} | ${h[1]} | ${h[2]} | ${h[3]} | ${h[4]} | ${h[5]} | ${h[6]} | ${a.firstClearLifeMean >= 0 ? num(a.firstClearLifeMean + 1, 1) : 'n/a'} |`,
    );
  }
  return lines.join('\n');
}

function renderSwapShape(aggs: PolicyAggregate[]): string {
  const lines: string[] = [];
  lines.push('| Policy | Mean wizard lives | Mean fighter lives | Mean wasted off-class Grove ranks |');
  lines.push('|------|----------------:|-----------------:|-------------------------------:|');
  for (const a of aggs) {
    lines.push(
      `| ${a.policy} | ${num(a.meanWizardLives, 1)} | ${num(a.meanFighterLives, 1)} | ${num(a.meanWastedOffClassRanks, 2)} |`,
    );
  }
  return lines.join('\n');
}

function renderPerLife(a: PolicyAggregate): string {
  const lines: string[] = [];
  lines.push(`### ${a.policy}`);
  lines.push('');
  lines.push(
    '| Life | Class mix (W/F) | Avg rooms | Avg chapter | Clear% | Avg Asc played | Avg final lvl | Grove ranks @ start |',
  );
  lines.push(
    '|----:|:------------|--------:|-----------:|------:|-------------:|-------------:|------------------:|',
  );
  for (const p of a.perLife) {
    const mix =
      p.wizardShare > 0.99
        ? 'W'
        : p.fighterShare > 0.99
          ? 'F'
          : `${pct(p.wizardShare)}/${pct(p.fighterShare)}`;
    lines.push(
      `| ${p.position} | ${mix} | ${num(p.avgRoomsReached, 1)}/${TOTAL_ROOMS} | ${num(p.avgChapter)} | ${pct(p.clearRate)} | ${num(p.avgAscensionPlayed)} | ${num(p.avgFinalLevel)} | ${num(p.avgUpgradeRanksAtStart)} |`,
    );
  }
  lines.push('');
  return lines.join('\n');
}

function main(): void {
  const tWall0 = Date.now();
  console.log(
    `Caster-first order sim — ${POLICIES.length} policies × ${JOURNEYS} journeys × ${LIVES_PER_JOURNEY} lives\n`,
  );

  const aggs: PolicyAggregate[] = [];
  for (const policy of POLICIES) {
    const t0 = Date.now();
    const { agg } = runPolicy(policy);
    aggs.push(agg);
    const dt = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(
      `${policy.padEnd(22)} → everCleared ${pct(agg.pctEverCleared).padStart(6)}  clears ${num(agg.meanTotalClears).padStart(5)}  ascUnlocked ${num(agg.meanAscensionUnlocked).padStart(4)}  reachedAsc6 ${pct(agg.pctReachedMaxAscension).padStart(6)}  cumulRenown ${num(agg.meanTotalRenownEarned, 0).padStart(6)}  ${dt}s`,
    );
  }

  const dtTotal = ((Date.now() - tWall0) / 1000).toFixed(1);
  const doc = renderRawDoc(aggs, dtTotal);
  const outPath = resolve(process.cwd(), 'docs/gameplay-quality/order-casterfirst.raw.md');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, doc, 'utf8');
  console.log(`\nWrote raw output → ${outPath}  (${dtTotal}s wall)`);
}

function renderRawDoc(aggs: PolicyAggregate[], wallSec: string): string {
  return `# Caster-first order sim — raw output

> Auto-generated by \`scripts/sim-order-casterfirst.ts\`. Re-run with
> \`JOURNEYS=${JOURNEYS} LIVES=${LIVES_PER_JOURNEY} npx tsx scripts/sim-order-casterfirst.ts\`.

**Policies:** ${aggs.length}.
**Journeys / policy:** ${JOURNEYS}.
**Life budget / journey:** ${LIVES_PER_JOURNEY}.
**Wall clock:** ${wallSec}s.

## What's modelled

Full meta journey: keep reincarnating across a fixed life budget, accumulating
renown past clears, buying Grove upgrades, climbing the ascension ladder. Each
run is played at the soul's highest-unlocked ascension; a full-chain clear at
that rung unlocks the next (mirrors delveStore.finishDelve + metaStore). Combat
uses the shared competent auto-battle policy (#147). Renown matches
delveStore.finishDelve exactly: \`(clear?50:15) + 10·bosses + 1·roomsReached\`,
times soul-mark × ascension renown multipliers.

## Policies

- \`caster-first-half\`: Wizard for the first ${Math.floor(LIVES_PER_JOURNEY / 2)} lives, Fighter after.
- \`caster-first-onclear\`: Wizard until the FIRST full-chain clear, Fighter after.
- \`wizard-only\` / \`fighter-only\`: never swap (baselines).

## Headline

${renderHeadline(aggs)}

## Ascension-unlocked distribution (where each journey ended)

${renderAscensionDist(aggs)}

## Swap shape & dead-weight

${renderSwapShape(aggs)}

## Per-life curves

${aggs.map(renderPerLife).join('\n')}
`;
}

main();
