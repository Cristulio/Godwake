/**
 * Rogue meta-journey sim — Maelis Vell, the fixed-stat selectable Rogue, run
 * through the FULL meta loop across many continuous reincarnation journeys.
 *
 * Unlike the 3-class matrix in `sim-reincarnation-loop.ts` (1/3/5-life chains),
 * this models the real long-haul progression a player lives:
 *
 *   pick Maelis (preset stats, no point-buy) → descend the 50-room 4-chapter
 *   Godwake chain at the soul's current ascension → fight via the SHARED
 *   action policy (runAutoTurn, #147 — the same brain that powers in-game
 *   Auto-Battle) → die or clear → earn DEPTH-SCALED renown (mirrors
 *   delveStore.finishDelve: clear/fail base + per-boss credit + per-room depth,
 *   × soul-mark × ascension renownMult) → greedily spend renown on Grove
 *   upgrades (ascension-gated tiers respected) → reincarnate (reroll 2 quirks,
 *   keep renown + Grove) → repeat. Clearing the chain at the highest unlocked
 *   ascension unlocks the next rung (Spire-style, mirrors
 *   metaStore.unlockNextAscension); a soul always pushes the highest rung it
 *   has unlocked. The journey ends when the soul clears Ascension 6 (the top)
 *   or hits the per-soul life cap.
 *
 * Each soul is one continuous journey; we run MANY souls and aggregate. Total
 * lives across souls is in the thousands — far past the ≥100-life floor.
 *
 * Faithful to the canonical character + engine:
 *  - Maelis is built from `presetCreationInput('rogue')` (the real selection
 *    path), NOT the stale encounterStress archetype.
 *  - Inventory resets to the class kit each descent (gearResetToKit) — found
 *    gear is intra-delve only; Grove delveStart upgrades (Mielikki's Cache
 *    potions, Shadowstep, Hardier Soul, ...) re-seed each life.
 *  - Enemy HP + per-attack damage scale with ascension via createCombat.
 *
 * Known simplifications (shared with the existing sim infra, noted in the
 * report so the numbers are read as a conservative floor):
 *  - No ASI: applyLevelUp doesn't auto-allocate the L4/L6/L8 ability bumps the
 *    LevelUpScreen forces a real player to take. A real Maelis pushes DEX to
 *    18 then 20 — strictly stronger than modelled here. Matches rogueSim +
 *    sim-reincarnation-loop.
 *  - Camp boon picker skipped (long rest only); shrine picks options[0].
 *
 * Run:
 *   SOULS=200 MAX_LIVES=150 npx tsx scripts/sim-rogue-meta-journey.ts
 *
 * Writes raw output to docs/gameplay-quality/rogue-meta-journey.raw.md.
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
import { takeTurn } from '../src/test/sim/encounterStress';
import { rollQuirks, renownSoulMarkMultiplier } from '../src/engine/character/quirks';
import { rollBlessingOptions } from '../src/engine/character/blessings';
import { buildPlayerCharacter, presetCreationInput } from '../src/engine/character/defaultCharacter';
import { getAscensionLevel, MAX_ASCENSION } from '../src/engine/delve/ascension';
import type { Character } from '../src/types/character';
import type { CombatState } from '../src/types/combat';
import type { RoomSpec } from '../src/types/delve';

const SOULS = Number(process.env.SOULS ?? 300);
const MAX_LIVES_PER_SOUL = Number(process.env.MAX_LIVES ?? 150);
const MAX_TURNS_PER_FIGHT = 200;

// Mirrors delveStore.ts renown formula (the live depth-scaled version).
const RENOWN_PER_DELVE_CLEAR = 50;
const RENOWN_PER_DELVE_FAILURE = 15;
const RENOWN_PER_CHAPTER_BOSS = 10;
const RENOWN_PER_ROOM_REACHED = 1;
const GROVE_UNLOCK_THRESHOLD = 30;

const TOTAL_ROOMS = 50;

// ─── Grove purchase priority (rogue, sensible greedy) ────────────────────────
// Defensive scaling early (HP, potions, AC), interleaved with the rogue's own
// consistency/burst levers (Cunning Action uses, Sneak dice, accuracy). Deeper
// ascension-gated tiers (Wellspring's Depth @asc1, Crown of the Returned @asc3)
// sit lower — bought once the rung that unlocks them is reached. Soul Marrow
// (more renown per bane) accelerates the whole loop, placed mid.
//
// Deliberately EXCLUDES the gold-economy upgrades (coin-in-pocket,
// quartermasters-stipend, shrine-tithe): the Godwake chain has no merchant
// room and this sim (like all the sim infra) skips event rooms, so gold is
// never spent — buying them would just burn renown that should buy power. A
// real player with a working shop would value them; here they're inert.
const ROGUE_PRIORITY: { id: string; maxAtRank: number }[] = [
  { id: 'pilgrims-boots', maxAtRank: 1 },        // +2 HP, cost 25 — cheap floor
  { id: 'mielikki-cache', maxAtRank: 2 },        // +N potions/delve
  { id: 'shadowstep', maxAtRank: 3 },            // +N Cunning Action uses (more Hide→Sneak)
  { id: 'mantle-of-the-wakened', maxAtRank: 5 }, // +5 HP/rank
  { id: 'knife-in-the-dark', maxAtRank: 3 },     // +Nd6 Sneak Attack
  { id: 'cloak-of-the-grove', maxAtRank: 3 },    // +1 AC/rank
  { id: 'heirloom-blade', maxAtRank: 4 },        // +1 attack/rank
  { id: 'mielikki-cache', maxAtRank: 4 },        // top up potions later
  { id: 'whetstone-resolve', maxAtRank: 4 },     // +1 damage/rank
  { id: 'hardier-soul', maxAtRank: 3 },          // +N stabilise charges
  { id: 'bleed-out', maxAtRank: 2 },             // +dmg vs wounded (sneak synergy)
  { id: 'killers-eye', maxAtRank: 2 },           // crit range
  { id: 'iron-will', maxAtRank: 1 },             // +5 HP one-shot
  { id: 'soul-marrow', maxAtRank: 3 },           // +renown/bane (meta accelerant)
  { id: 'wellspring-depths', maxAtRank: 3 },     // +10 HP/rank  [asc1]
  { id: 'crown-of-the-returned', maxAtRank: 2 }, // +1 attack/rank  [asc3]
];

interface SoulState {
  renown: number;
  unlockedUpgrades: UnlockedUpgrades;
  quirks: string[];
  /** Highest ascension level UNLOCKED (clearing this unlocks the next). */
  ascensionUnlocked: number;
}

function freshSoul(): SoulState {
  return { renown: 0, unlockedUpgrades: {}, quirks: [], ascensionUnlocked: 0 };
}

/** Greedy "spend renown" between lives, respecting ascension-gated tiers. */
function buyUpgrades(soul: SoulState): { renown: number; unlocked: UnlockedUpgrades; purchased: string[] } {
  let r = soul.renown;
  const u: UnlockedUpgrades = { ...soul.unlockedUpgrades };
  const purchased: string[] = [];
  if (r < GROVE_UNLOCK_THRESHOLD) return { renown: r, unlocked: u, purchased };
  let bought = true;
  let safety = 0;
  while (bought && safety < 200) {
    bought = false;
    safety += 1;
    for (const { id, maxAtRank } of ROGUE_PRIORITY) {
      const up = findUpgrade(id);
      if (!up) continue;
      const gate = up.unlock?.ascension ?? 0;
      if (soul.ascensionUnlocked < gate) continue; // locked tier
      const curRank = u[id] ?? 0;
      const targetRank = Math.min(maxAtRank, up.maxRank);
      if (curRank >= targetRank) continue;
      const nextRank = curRank + 1;
      const cost = up.costForRank(nextRank);
      if (r >= cost) {
        r -= cost;
        u[id] = nextRank;
        purchased.push(`${id}@${nextRank}`);
        bought = true;
        break; // restart priority scan after each buy
      }
    }
  }
  return { renown: r, unlocked: u, purchased };
}

/** Apply ALL ranks of currently-owned permanent upgrades to a fresh character. */
function applyPermanentUpgrades(c: Character, unlocked: UnlockedUpgrades): Character {
  let ch = c;
  for (const [id, rank] of Object.entries(unlocked)) {
    const up = findUpgrade(id);
    if (!up || up.kind !== 'permanent') continue;
    for (let r = 1; r <= rank; r++) ch = applyPermanentUpgrade(ch, id, r);
  }
  // applyLevelUp/buildPlayerCharacter don't fold permanentBonuses.hp into the
  // HP pool — add the cumulative bump once (mirrors level1HpMax in delveStore).
  const permHp = ch.permanentBonuses?.hp ?? 0;
  if (permHp > 0) {
    const newMax = ch.hp.max + permHp;
    ch = { ...ch, hp: { current: newMax, max: newMax, temp: ch.hp.temp } };
  }
  return ch;
}

/** Build the character that descends this life — Maelis from the real preset. */
function descend(roller: DiceRoller, soul: SoulState): Character {
  // Canonical selection path: the fixed-stat Maelis Vell, level 1, class kit.
  let c = buildPlayerCharacter(presetCreationInput('rogue'));
  c = applyPermanentUpgrades(c, soul.unlockedUpgrades);
  c = applyDelveStartUpgrades(c, soul.unlockedUpgrades);
  // Fresh 2 quirks per life (no Wheelturner modelled).
  c = { ...c, quirks: rollQuirks(roller, 2) };
  c = { ...c, hp: { ...c.hp, current: c.hp.max } };
  return longRest(c);
}

function roomChapter(idx: number): number {
  // 50-room Godwake layout. ch1 0–11 (boss 10, camp 11), ch2 12–24 (boss 23,
  // camp 24), ch3 25–37 (boss 36, camp 37), ch4 38–49 (boss 49).
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
  isBoss: boolean,
): { character: Character; victory: boolean } {
  _resetMonsterInstanceCounter();
  const monsterRefs = (room.monsters ?? []).flatMap((rm) => {
    const def = getMonster(rm.defId);
    return Array.from({ length: rm.count }, () => ({ def, displayName: rm.displayPrefix }));
  });
  const init = createCombat({ roller, character: characterIn, monsters: monsterRefs, ascension, isBoss });
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
      const r = monsterAttack({ roller, character, state }, state.turnOrder[state.currentTurnIndex]);
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
  lifeIdx: number;            // 0-based within the soul's journey
  ascensionPlayed: number;
  cleared: boolean;
  finalRoomIdx: number;
  finalChapter: number;
  finalLevel: number;
  bossesKilled: number;
  renownEarned: number;
  deathCause: string | null;
  unlockedRanksAtStart: number;
}

function liveOneLife(
  roller: DiceRoller,
  soul: SoulState,
  lifeIdx: number,
  seedBase: number,
): { outcome: LifeOutcome; finalCharacter: Character } {
  let character = descend(roller, soul);
  const ascension = soul.ascensionUnlocked;
  const delveSeed = ((seedBase + lifeIdx * 7919) ^ (ascension * 1009) ^ 0x52) >>> 0;
  const delve = createGodwakeDelve({ seed: delveSeed, ascension });

  const unlockedRanksAtStart = Object.values(soul.unlockedUpgrades).reduce((a, b) => a + b, 0);
  let bossesKilled = 0;
  let finalRoomIdx = 0;
  let deathCause: string | null = null;
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
      const options = rollBlessingOptions(roller, 3 + (character.shrineOptionBonus ?? 0), 'rogue');
      const pick = options[0];
      if (pick && !character.blessings.includes(pick)) {
        character = { ...character, blessings: [...character.blessings, pick] };
      }
      continue;
    }
    if (room.kind === 'event') continue;

    const isBoss = room.kind === 'boss';
    const bossDefId = isBoss ? room.monsters?.[0]?.defId ?? null : null;

    const result = runCombatRoom(roller, character, room, ascension, isBoss);
    character = result.character;

    if (!result.victory) {
      died = true;
      deathCause = isBoss && bossDefId ? bossDefId : room.id;
      break;
    }

    if (isBoss && bossDefId) bossesKilled += 1;
    const rXp = room.xpReward ?? 0;
    if (rXp > 0) {
      character = { ...character, xp: character.xp + rXp };
      while (character.level < MAX_LEVEL && character.xp >= xpForLevel(character.level + 1)) {
        character = applyLevelUp(character);
      }
    }
  }

  const cleared = !died;
  // Mirror delveStore.finishDelve: depth credit pays per room reached on both
  // paths; clear swaps the failure base for the clear premium. ascensionMult
  // composes MULTIPLICATIVELY with the soul-mark (audit-flagged stacking rule).
  const depthRenown = RENOWN_PER_ROOM_REACHED * finalRoomIdx;
  const renownBase =
    (cleared ? RENOWN_PER_DELVE_CLEAR : RENOWN_PER_DELVE_FAILURE) +
    RENOWN_PER_CHAPTER_BOSS * bossesKilled +
    depthRenown;
  const ascensionMult = getAscensionLevel(ascension).renownMult;
  const renownEarned = Math.floor(renownBase * renownSoulMarkMultiplier(character) * ascensionMult);

  return {
    outcome: {
      lifeIdx,
      ascensionPlayed: ascension,
      cleared,
      finalRoomIdx,
      finalChapter: roomChapter(finalRoomIdx),
      finalLevel: character.level,
      bossesKilled,
      renownEarned,
      deathCause,
      unlockedRanksAtStart,
    },
    finalCharacter: character,
  };
}

interface SoulJourney {
  lives: LifeOutcome[];
  finalRenown: number;
  finalUpgrades: UnlockedUpgrades;
  /** life# (1-based) of first clear at each ascension level, or null. */
  clearedAtLevelLife: (number | null)[];
  /** life# (1-based) at which each upgrade first reached rank ≥ 1, or null. */
  upgradeFirstLife: Record<string, number>;
  highestAscensionCleared: number; // -1 = never cleared the chain
}

function runJourney(soulSeed: number): SoulJourney {
  const roller = createDiceRoller(soulSeed);
  setActiveRoller(soulSeed);
  let soul = freshSoul();
  const lives: LifeOutcome[] = [];
  const clearedAtLevelLife: (number | null)[] = Array.from({ length: MAX_ASCENSION + 1 }, () => null);
  const upgradeFirstLife: Record<string, number> = {};
  let highestAscensionCleared = -1;

  for (let life = 0; life < MAX_LIVES_PER_SOUL; life++) {
    const { outcome } = liveOneLife(roller, soul, life, soulSeed);
    lives.push(outcome);
    soul = { ...soul, renown: soul.renown + outcome.renownEarned };

    if (outcome.cleared) {
      const lvl = outcome.ascensionPlayed;
      if (clearedAtLevelLife[lvl] === null) clearedAtLevelLife[lvl] = life + 1;
      highestAscensionCleared = Math.max(highestAscensionCleared, lvl);
      // Clearing the highest unlocked rung opens the next (Spire-style).
      if (lvl >= soul.ascensionUnlocked && soul.ascensionUnlocked < MAX_ASCENSION) {
        soul = { ...soul, ascensionUnlocked: soul.ascensionUnlocked + 1 };
      } else if (lvl >= MAX_ASCENSION) {
        break; // cleared the top — journey complete
      }
    }

    // Between-life Grove spend.
    const buy = buyUpgrades(soul);
    soul = { ...soul, renown: buy.renown, unlockedUpgrades: buy.unlocked };
    for (const id of Object.keys(buy.unlocked)) {
      if (upgradeFirstLife[id] === undefined) upgradeFirstLife[id] = life + 1;
    }
  }

  return {
    lives,
    finalRenown: soul.renown,
    finalUpgrades: soul.unlockedUpgrades,
    clearedAtLevelLife,
    upgradeFirstLife,
    highestAscensionCleared,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Aggregation + rendering
// ─────────────────────────────────────────────────────────────────────────

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const num = (n: number, d = 2) => n.toFixed(d);

function mean(xs: number[]): number {
  return xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;
}
function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

interface Report {
  souls: number;
  totalLives: number;
  overallDeathRate: number;
  overallClearRate: number;
  livesToFirstClear: { mean: number; median: number; reached: number };
  ascensionReached: number[];          // count of souls whose highest-cleared == k (k=-1..6 mapped 0..7)
  ascensionReachedAtLeast: number[];   // count of souls that cleared >= k (k=0..6)
  meanFinalRenown: number;
  byAscension: Array<{
    level: number;
    lives: number;
    deathRate: number;
    clearRate: number;
    avgRooms: number;
    avgChapter: number;
    avgRenownEarned: number;
  }>;
  perLife: Array<{
    position: number;
    n: number;
    avgRooms: number;
    avgChapter: number;
    clearRate: number;
    avgLevel: number;
    avgRenownEarned: number;
    cumRenown: number;
    avgRanks: number;
    avgAscension: number;
  }>;
  livesToClearLevel: Array<{ level: number; n: number; meanLife: number; medianLife: number }>;
  upgradeAdoption: Array<{ id: string; adoption: number; meanFinalRank: number; meanFirstLife: number }>;
  deathCauses: Array<{ cause: string; count: number; share: number }>;
}

function aggregate(journeys: SoulJourney[]): Report {
  const allLives = journeys.flatMap((j) => j.lives);
  const totalLives = allLives.length;
  const deaths = allLives.filter((l) => !l.cleared).length;
  const clears = allLives.filter((l) => l.cleared).length;

  const firstClearLives = journeys
    .map((j) => j.clearedAtLevelLife[0])
    .filter((x): x is number => x !== null);

  // Ascension-reached distribution.
  const ascensionReached = Array.from({ length: MAX_ASCENSION + 2 }, () => 0); // index 0 => never(-1)
  const ascensionReachedAtLeast = Array.from({ length: MAX_ASCENSION + 1 }, () => 0);
  for (const j of journeys) {
    ascensionReached[j.highestAscensionCleared + 1] += 1;
    for (let k = 0; k <= MAX_ASCENSION; k++) {
      if (j.highestAscensionCleared >= k) ascensionReachedAtLeast[k] += 1;
    }
  }

  // By-ascension breakdown.
  const byAscension: Report['byAscension'] = [];
  for (let lvl = 0; lvl <= MAX_ASCENSION; lvl++) {
    const lives = allLives.filter((l) => l.ascensionPlayed === lvl);
    if (lives.length === 0) continue;
    byAscension.push({
      level: lvl,
      lives: lives.length,
      deathRate: lives.filter((l) => !l.cleared).length / lives.length,
      clearRate: lives.filter((l) => l.cleared).length / lives.length,
      avgRooms: mean(lives.map((l) => l.finalRoomIdx + (l.cleared ? 1 : 0))),
      avgChapter: mean(lives.map((l) => l.finalChapter)),
      avgRenownEarned: mean(lives.map((l) => l.renownEarned)),
    });
  }

  // Per-life-position curves (averaged across souls present at that position).
  const maxLen = journeys.reduce((m, j) => Math.max(m, j.lives.length), 0);
  // Precompute per-soul cumulative renown.
  const cum: number[][] = journeys.map((j) => {
    const out: number[] = [];
    let s = 0;
    for (const l of j.lives) {
      s += l.renownEarned;
      out.push(s);
    }
    return out;
  });
  const perLife: Report['perLife'] = [];
  for (let p = 0; p < maxLen; p++) {
    const lives = journeys.flatMap((j) => (j.lives[p] ? [j.lives[p]] : []));
    if (lives.length === 0) continue;
    const cums = journeys.flatMap((j, idx) => (j.lives[p] ? [cum[idx][p]] : []));
    perLife.push({
      position: p + 1,
      n: lives.length,
      avgRooms: mean(lives.map((l) => l.finalRoomIdx + (l.cleared ? 1 : 0))),
      avgChapter: mean(lives.map((l) => l.finalChapter)),
      clearRate: lives.filter((l) => l.cleared).length / lives.length,
      avgLevel: mean(lives.map((l) => l.finalLevel)),
      avgRenownEarned: mean(lives.map((l) => l.renownEarned)),
      cumRenown: mean(cums),
      avgRanks: mean(lives.map((l) => l.unlockedRanksAtStart)),
      avgAscension: mean(lives.map((l) => l.ascensionPlayed)),
    });
  }

  // Lives to first clear of each ascension level.
  const livesToClearLevel: Report['livesToClearLevel'] = [];
  for (let lvl = 0; lvl <= MAX_ASCENSION; lvl++) {
    const ls = journeys
      .map((j) => j.clearedAtLevelLife[lvl])
      .filter((x): x is number => x !== null);
    livesToClearLevel.push({
      level: lvl,
      n: ls.length,
      meanLife: mean(ls),
      medianLife: median(ls),
    });
  }

  // Grove adoption.
  const allIds = ROGUE_PRIORITY.map((p) => p.id).filter((v, i, a) => a.indexOf(v) === i);
  const upgradeAdoption: Report['upgradeAdoption'] = allIds.map((id) => {
    const owners = journeys.filter((j) => (j.finalUpgrades[id] ?? 0) > 0);
    const firstLives = journeys
      .map((j) => j.upgradeFirstLife[id])
      .filter((x): x is number => x !== undefined);
    return {
      id,
      adoption: owners.length / journeys.length,
      meanFinalRank: mean(journeys.map((j) => j.finalUpgrades[id] ?? 0)),
      meanFirstLife: mean(firstLives),
    };
  });
  upgradeAdoption.sort((a, b) => b.adoption - a.adoption || a.meanFirstLife - b.meanFirstLife);

  // Death causes.
  const causeCounts = new Map<string, number>();
  for (const l of allLives) {
    if (l.cleared || !l.deathCause) continue;
    causeCounts.set(l.deathCause, (causeCounts.get(l.deathCause) ?? 0) + 1);
  }
  const deathCauses = [...causeCounts.entries()]
    .map(([cause, count]) => ({ cause, count, share: count / Math.max(1, deaths) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  return {
    souls: journeys.length,
    totalLives,
    overallDeathRate: deaths / Math.max(1, totalLives),
    overallClearRate: clears / Math.max(1, totalLives),
    livesToFirstClear: {
      mean: mean(firstClearLives),
      median: median(firstClearLives),
      reached: firstClearLives.length,
    },
    ascensionReached,
    ascensionReachedAtLeast,
    meanFinalRenown: mean(journeys.map((j) => j.finalRenown)),
    byAscension,
    perLife,
    livesToClearLevel,
    upgradeAdoption,
    deathCauses,
  };
}

function renderConsole(r: Report): void {
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log(`  MAELIS VELL — Rogue meta-journey  ·  ${r.souls} souls · ${r.totalLives} lives`);
  console.log('══════════════════════════════════════════════════════════════');
  console.log(`Death rate / life:        ${pct(r.overallDeathRate)}`);
  console.log(`Clear rate / life:        ${pct(r.overallClearRate)}`);
  console.log(`Lives to first clear:     mean ${num(r.livesToFirstClear.mean, 1)} · median ${num(r.livesToFirstClear.median, 0)}  (${r.livesToFirstClear.reached}/${r.souls} souls cleared A0)`);
  console.log(`Mean final renown:        ${num(r.meanFinalRenown, 0)}`);
  console.log('\nAscension reached (highest rung cleared):');
  for (let k = 0; k <= MAX_ASCENSION; k++) {
    console.log(`  ≥ A${k}: ${pct(r.ascensionReachedAtLeast[k] / r.souls).padStart(6)}  (${r.ascensionReachedAtLeast[k]}/${r.souls})`);
  }
  console.log('\nBy ascension level played:');
  console.log('  Lvl   lives   death%   clear%   avgRooms   avgRenown');
  for (const a of r.byAscension) {
    console.log(`  A${a.level}   ${String(a.lives).padStart(6)}   ${pct(a.deathRate).padStart(6)}   ${pct(a.clearRate).padStart(6)}   ${num(a.avgRooms, 1).padStart(8)}   ${num(a.avgRenownEarned, 0).padStart(8)}`);
  }
  console.log('\nGrove adoption (top):');
  for (const u of r.upgradeAdoption.slice(0, 10)) {
    console.log(`  ${u.id.padEnd(24)} adopt ${pct(u.adoption).padStart(6)}  finalRank ${num(u.meanFinalRank, 2)}  firstLife ${num(u.meanFirstLife, 1)}`);
  }
}

function renderRawDoc(r: Report, wallSec: string): string {
  const lines: string[] = [];
  lines.push('# Rogue meta-journey sim — raw output (Maelis Vell)');
  lines.push('');
  lines.push('> Auto-generated by `scripts/sim-rogue-meta-journey.ts`. Re-run with');
  lines.push(`> \`SOULS=${SOULS} MAX_LIVES=${MAX_LIVES_PER_SOUL} npx tsx scripts/sim-rogue-meta-journey.ts\`.`);
  lines.push('');
  lines.push(`**Souls:** ${r.souls}. **Total lives:** ${r.totalLives}. **Wall clock:** ${wallSec}s.`);
  lines.push('');
  lines.push('Character: the fixed-stat selectable Rogue (`presetCreationInput(\'rogue\')`) — wood-elf, DEX 16 / CON 14 / WIS 13. Combat resolved by the shared action policy (`runAutoTurn`). Renown mirrors the live depth-scaled `delveStore.finishDelve` formula; ascension scales enemies + payout via `createCombat`.');
  lines.push('');
  lines.push('Known simplifications (conservative floor): no ASI (a real Maelis pushes DEX→18→20), camp-boon picker skipped, shrine picks `options[0]`.');
  lines.push('');

  lines.push('## Headline');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|--------|------:|');
  lines.push(`| Death rate / life | ${pct(r.overallDeathRate)} |`);
  lines.push(`| Clear rate / life | ${pct(r.overallClearRate)} |`);
  lines.push(`| Lives to first clear (A0) — mean | ${num(r.livesToFirstClear.mean, 1)} |`);
  lines.push(`| Lives to first clear (A0) — median | ${num(r.livesToFirstClear.median, 0)} |`);
  lines.push(`| Souls that cleared A0 | ${r.livesToFirstClear.reached}/${r.souls} |`);
  lines.push(`| Mean final renown (cumulative, end of journey) | ${num(r.meanFinalRenown, 0)} |`);
  lines.push('');

  lines.push('## Ascension reached (highest rung cleared)');
  lines.push('');
  lines.push('| Rung | Souls reaching (≥) | Share |');
  lines.push('|------|------:|------:|');
  for (let k = 0; k <= MAX_ASCENSION; k++) {
    lines.push(`| A${k} | ${r.ascensionReachedAtLeast[k]}/${r.souls} | ${pct(r.ascensionReachedAtLeast[k] / r.souls)} |`);
  }
  lines.push('');

  lines.push('## By ascension level played');
  lines.push('');
  lines.push('| Lvl | Lives | Death% | Clear% | Avg rooms | Avg chapter | Avg renown/life |');
  lines.push('|----|------:|------:|------:|--------:|----------:|---------------:|');
  for (const a of r.byAscension) {
    lines.push(`| A${a.level} | ${a.lives} | ${pct(a.deathRate)} | ${pct(a.clearRate)} | ${num(a.avgRooms, 1)} / ${TOTAL_ROOMS} | ${num(a.avgChapter)} | ${num(a.avgRenownEarned, 0)} |`);
  }
  lines.push('');

  lines.push('## Lives to first clear of each ascension rung');
  lines.push('');
  lines.push('| Rung | Souls clearing | Mean life# | Median life# |');
  lines.push('|------|------:|------:|------:|');
  for (const x of r.livesToClearLevel) {
    lines.push(`| A${x.level} | ${x.n}/${r.souls} | ${num(x.meanLife, 1)} | ${num(x.medianLife, 0)} |`);
  }
  lines.push('');

  lines.push('## Grove adoption');
  lines.push('');
  lines.push('| Upgrade | Adoption | Mean final rank | Mean first-buy life# |');
  lines.push('|---------|------:|------:|------:|');
  for (const u of r.upgradeAdoption) {
    lines.push(`| ${u.id} | ${pct(u.adoption)} | ${num(u.meanFinalRank, 2)} | ${num(u.meanFirstLife, 1)} |`);
  }
  lines.push('');

  lines.push('## Death causes (share of all deaths)');
  lines.push('');
  lines.push('| Cause (monster/room) | Deaths | Share |');
  lines.push('|----------------------|------:|------:|');
  for (const d of r.deathCauses) {
    lines.push(`| ${d.cause} | ${d.count} | ${pct(d.share)} |`);
  }
  lines.push('');

  lines.push('## Per-life-position curve (averaged across souls alive that life)');
  lines.push('');
  lines.push('| Life | n souls | Avg rooms | Avg chapter | Clear% | Avg lvl | Renown/life | Cum renown | Owned ranks | Avg ascension |');
  lines.push('|----:|------:|--------:|----------:|------:|------:|----------:|---------:|----------:|------------:|');
  for (const p of r.perLife) {
    lines.push(
      `| ${p.position} | ${p.n} | ${num(p.avgRooms, 1)} | ${num(p.avgChapter, 2)} | ${pct(p.clearRate)} | ${num(p.avgLevel, 1)} | ${num(p.avgRenownEarned, 0)} | ${num(p.cumRenown, 0)} | ${num(p.avgRanks, 1)} | ${num(p.avgAscension, 2)} |`,
    );
  }
  lines.push('');
  return lines.join('\n');
}

function main(): void {
  const t0 = Date.now();
  const seedRoot = 0xc0ffee >>> 0;
  console.log(`Rogue meta-journey — ${SOULS} souls × up to ${MAX_LIVES_PER_SOUL} lives each\n`);
  const journeys: SoulJourney[] = [];
  for (let i = 0; i < SOULS; i++) {
    const seed = (seedRoot ^ (i * 2654435761)) >>> 0;
    journeys.push(runJourney(seed));
    if ((i + 1) % 25 === 0 || i === SOULS - 1) {
      const done = i + 1;
      const livesSoFar = journeys.reduce((s, j) => s + j.lives.length, 0);
      const dt = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`  ${done}/${SOULS} souls · ${livesSoFar} lives · ${dt}s`);
    }
  }
  const report = aggregate(journeys);
  renderConsole(report);
  const wallSec = ((Date.now() - t0) / 1000).toFixed(1);
  const doc = renderRawDoc(report, wallSec);
  const outPath = resolve(process.cwd(), 'docs/gameplay-quality/rogue-meta-journey.raw.md');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, doc, 'utf8');
  console.log(`\nWrote raw output → ${outPath}  (${wallSec}s wall)`);
}

main();
