/**
 * Character-ORDER sim. Tests the hub character-swap feature (PR #141): you can
 * change character (Fighter / Rogue / Wizard) at Phandalin between runs WITHOUT
 * losing renown — renown + Grove upgrades + quirks are soul/account-level and
 * carry across the swap; the new soul starts a fresh L1 run.
 *
 * QUESTION: does the character you play, and the ORDER you swap them in, matter
 * for the meta-progression loop? Is there a dominant swap strategy?
 *
 * Method (mirrors the live code):
 *  - Each life's body is built from the chosen class's FIXED preset
 *    (`buildPlayerCharacter(presetCreationInput(classId))`) — the SELECTION
 *    model, Sir Brick / Maelis Vell / Veyra Ash.
 *  - Renown is DEPTH-SCALED (delveStore.ts current formula): per-room credit +
 *    per-chapter-boss + clear/failure base, all ×soul-mark multiplier.
 *  - Across a swap the soul carries renown + the Grove ledger
 *    (`unlockedUpgrades`, re-applied to every fresh body by
 *    applyPermanentUpgrades / applyDelveStartUpgrades — exactly what startDelve
 *    does) + quirks. This is `carrySoulProgress` modelled.
 *  - Between lives the soul greedily spends renown on the priority list of the
 *    class it is ABOUT TO descend as (you shop the Grove for who you'll play).
 *  - Quirks reroll per life (death → reincarnate rerolls; the swap then carries
 *    the rerolled marks). 2 fresh quirks per descent, the game default.
 *
 * FAIRNESS: life L of soul S faces the same dungeon seed + the same quirk roll
 * in EVERY strategy (seeds keyed on (soulIdx, lifeIdx), class-independent). The
 * only variables across strategies are which class plays each life and the
 * endogenous carried meta. So any difference is the order effect, not luck.
 *
 * Ascension stays at 0: an L1-start soul never clears the 50-room chain (see
 * the report), so the ladder never advances — noted, not modelled.
 *
 * Run:  npx tsx scripts/sim-character-order.ts
 *       SOULS=600 LIVES=24 npx tsx scripts/sim-character-order.ts
 * Writes raw matrix to docs/gameplay-quality/character-order.raw.md.
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
import { buildPlayerCharacter, presetCreationInput } from '../src/engine/character/defaultCharacter';
import { rollQuirks, renownSoulMarkMultiplier } from '../src/engine/character/quirks';
import { rollBlessingOptions } from '../src/engine/character/blessings';
import type { Character } from '../src/types/character';
import type { CombatState } from '../src/types/combat';
import type { RoomSpec } from '../src/types/delve';

type ClassId = 'rogue' | 'fighter' | 'wizard';

const SOULS = Number(process.env.SOULS ?? 400);
const LIVES = Number(process.env.LIVES ?? 20);
const SWAP_AT = Number(process.env.SWAP_AT ?? 6); // directional-swap pivot life
const MAX_TURNS_PER_FIGHT = 200;
const SEED_BASE = 0xc0ffee >>> 0;

// Mirrors delveStore.ts (depth-scaled renown, main @ acb1003).
const RENOWN_PER_DELVE_CLEAR = 50;
const RENOWN_PER_DELVE_FAILURE = 15;
const RENOWN_PER_CHAPTER_BOSS = 10;
const RENOWN_PER_ROOM_REACHED = 1;
const GROVE_UNLOCK_THRESHOLD = 30;

const TOTAL_ROOMS = 50;

// ─── Upgrade class-utility map (which Grove buys are dead on the wrong body) ──
// Hard class-gates: the upgrade's apply() returns the character unchanged off
// its class (verified in content/upgrades/index.ts).
const FIGHTER_GATED = new Set(['wellspring-vigil']);
const ROGUE_GATED = new Set(['shadowstep', 'knife-in-the-dark']);
const WIZARD_GATED = new Set(['burning-tongue', 'arcane-focus', 'sigil-of-the-wakened-mind']);
// Weapon-edge upgrades feed weapon hits — live for Fighter+Rogue, dead for the
// (mostly-casting) Wizard.
const WEAPON_EDGE = new Set([
  'heirloom-blade',
  'whetstone-resolve',
  'killers-eye',
  'first-cut',
  'bleed-out',
  'fellfast-strike',
]);

/** True if a banked rank of `id` does nothing for a body of class `cls`. */
function deadForClass(id: string, cls: ClassId): boolean {
  if (FIGHTER_GATED.has(id)) return cls !== 'fighter';
  if (ROGUE_GATED.has(id)) return cls !== 'rogue';
  if (WIZARD_GATED.has(id)) return cls !== 'wizard';
  if (WEAPON_EDGE.has(id)) return cls === 'wizard';
  return false;
}

// ─── Grove purchase priorities (identical to sim-reincarnation-loop.ts) ───────
const SHARED_PRIORITY: { id: string; maxAtRank: number }[] = [
  { id: 'pilgrims-boots', maxAtRank: 1 },
  { id: 'mielikki-cache', maxAtRank: 4 },
  { id: 'mantle-of-the-wakened', maxAtRank: 5 },
  { id: 'cloak-of-the-grove', maxAtRank: 3 },
  { id: 'hardier-soul', maxAtRank: 3 },
  { id: 'stoneweave-boots', maxAtRank: 4 },
  { id: 'coin-in-pocket', maxAtRank: 3 },
  { id: 'iron-will', maxAtRank: 1 },
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
  out.push(SHARED_PRIORITY[0]);
  const maxLen = Math.max(cls.length, SHARED_PRIORITY.length - 1);
  for (let i = 0; i < maxLen; i++) {
    if (i < cls.length) out.push(cls[i]);
    if (i + 1 < SHARED_PRIORITY.length) out.push(SHARED_PRIORITY[i + 1]);
  }
  return out;
}

/** Greedy spend toward `forClass`'s priority list. Returns spend-by-id too. */
function buyUpgrades(
  forClass: ClassId,
  renown: number,
  unlocked: UnlockedUpgrades,
): { renown: number; unlocked: UnlockedUpgrades; spentById: Record<string, number> } {
  let r = renown;
  const u: UnlockedUpgrades = { ...unlocked };
  const spentById: Record<string, number> = {};
  if (r < GROVE_UNLOCK_THRESHOLD) return { renown: r, unlocked: u, spentById };
  const list = priorityFor(forClass);
  let bought = true;
  let safety = 0;
  while (bought && safety < 80) {
    bought = false;
    safety += 1;
    for (const { id, maxAtRank } of list) {
      const up = findUpgrade(id);
      if (!up) continue;
      const curRank = u[id] ?? 0;
      const targetRank = Math.min(maxAtRank, up.maxRank);
      if (curRank >= targetRank) continue;
      const nextRank = curRank + 1;
      const cost = up.costForRank(nextRank);
      if (r >= cost) {
        r -= cost;
        u[id] = nextRank;
        spentById[id] = (spentById[id] ?? 0) + cost;
        bought = true;
        break;
      }
    }
  }
  return { renown: r, unlocked: u, spentById };
}

/** Bake all owned permanent-upgrade ranks onto a fresh body. */
function applyPermanentUpgrades(c: Character, unlocked: UnlockedUpgrades): Character {
  let ch = c;
  for (const [id, rank] of Object.entries(unlocked)) {
    const up = findUpgrade(id);
    if (!up || up.kind !== 'permanent') continue;
    for (let r = 1; r <= rank; r++) ch = applyPermanentUpgrade(ch, id, r);
  }
  const permHp = ch.permanentBonuses?.hp ?? 0;
  if (permHp > 0) {
    const newMax = ch.hp.max + permHp;
    ch = { ...ch, hp: { current: newMax, max: newMax, temp: ch.hp.temp } };
  }
  return ch;
}

interface SoulState {
  renown: number;
  unlockedUpgrades: UnlockedUpgrades;
  /** Cumulative renown spent on each upgrade id (for waste accounting). */
  spentById: Record<string, number>;
  cumulativeRenownEarned: number;
}

function freshSoul(): SoulState {
  return { renown: 0, unlockedUpgrades: {}, spentById: {}, cumulativeRenownEarned: 0 };
}

/** Build the L1 body that descends this life: preset + carried Grove ledger. */
function descend(classId: ClassId, soul: SoulState, quirkRoller: DiceRoller): Character {
  let c = buildPlayerCharacter(presetCreationInput(classId));
  c = applyPermanentUpgrades(c, soul.unlockedUpgrades);
  c = applyDelveStartUpgrades(c, soul.unlockedUpgrades);
  c = { ...c, quirks: rollQuirks(quirkRoller, 2) };
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
): { character: Character; victory: boolean } {
  _resetMonsterInstanceCounter();
  const monsterRefs = (room.monsters ?? []).flatMap((rm) => {
    const def = getMonster(rm.defId);
    return Array.from({ length: rm.count }, () => ({ def, displayName: rm.displayPrefix }));
  });
  const init = createCombat({ roller, character: characterIn, monsters: monsterRefs });
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
  classId: ClassId;
  cleared: boolean;
  finalRoomIdx: number;
  finalChapter: number;
  finalLevel: number;
  bossesKilled: number;
  renownEarned: number;
  ranksAtStart: number;
}

function liveOneLife(
  classId: ClassId,
  soul: SoulState,
  combatSeed: number,
  quirkSeed: number,
  delveSeed: number,
): { outcome: LifeOutcome; renownEarned: number; cleared: boolean } {
  const roller = createDiceRoller(combatSeed);
  setActiveRoller(combatSeed);
  const quirkRoller = createDiceRoller(quirkSeed);

  let character = descend(classId, soul, quirkRoller);
  const delve = createGodwakeDelve({ seed: delveSeed });
  const ranksAtStart = Object.values(soul.unlockedUpgrades).reduce((a, b) => a + b, 0);

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
    const result = runCombatRoom(roller, character, room);
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
  const depthRenown = RENOWN_PER_ROOM_REACHED * finalRoomIdx;
  const renownBase =
    (cleared ? RENOWN_PER_DELVE_CLEAR : RENOWN_PER_DELVE_FAILURE) +
    RENOWN_PER_CHAPTER_BOSS * bossesKilled +
    depthRenown;
  const renownEarned = Math.floor(renownBase * renownSoulMarkMultiplier(character));

  return {
    outcome: {
      classId,
      cleared,
      finalRoomIdx,
      finalChapter: roomChapter(finalRoomIdx),
      finalLevel: character.level,
      bossesKilled,
      renownEarned,
      ranksAtStart,
    },
    renownEarned,
    cleared,
  };
}

// ─── Strategies ───────────────────────────────────────────────────────────
interface Strategy {
  name: string;
  blurb: string;
  classForLife: (lifeIdx: number) => ClassId;
}

const STRATEGIES: Strategy[] = [
  {
    name: 'rotate-FRW',
    blurb: 'F→R→W→F→R→W… — swap class every life.',
    classForLife: (i) => (['fighter', 'rogue', 'wizard'] as ClassId[])[i % 3],
  },
  {
    name: `tank-first→caster (swap@${SWAP_AT})`,
    blurb: `Fighter for the first ${SWAP_AT} lives (bank via the durable body), then Wizard for the rest.`,
    classForLife: (i) => (i < SWAP_AT ? 'fighter' : 'wizard'),
  },
  {
    name: `glass-first→tank (swap@${SWAP_AT})`,
    blurb: `Wizard for the first ${SWAP_AT} lives (bank via the deep-reaching body), then Fighter for the rest.`,
    classForLife: (i) => (i < SWAP_AT ? 'wizard' : 'fighter'),
  },
  {
    // Matched-mix order test: same 10 wizard + 10 fighter lives as its twin
    // below, only the ORDER flips. Isolates whether front-loading the better
    // banker compounds through the Grove (vs. just the class mix mattering).
    name: `bank-first (W×${Math.floor(LIVES / 2)}→F×${LIVES - Math.floor(LIVES / 2)})`,
    blurb: 'Best banker (Wizard) front-loaded, then Fighter — same mix as enjoy-first, reversed.',
    classForLife: (i) => (i < Math.floor(LIVES / 2) ? 'wizard' : 'fighter'),
  },
  {
    name: `enjoy-first (F×${Math.floor(LIVES / 2)}→W×${LIVES - Math.floor(LIVES / 2)})`,
    blurb: 'Fighter front-loaded, best banker (Wizard) last — same mix as bank-first, reversed.',
    classForLife: (i) => (i < Math.floor(LIVES / 2) ? 'fighter' : 'wizard'),
  },
  {
    name: 'pure-fighter',
    blurb: 'Fighter every life (baseline, no swap).',
    classForLife: () => 'fighter',
  },
  {
    name: 'pure-rogue',
    blurb: 'Rogue every life (baseline, no swap).',
    classForLife: () => 'rogue',
  },
  {
    name: 'pure-wizard',
    blurb: 'Wizard every life (baseline, no swap).',
    classForLife: () => 'wizard',
  },
];

interface ChainResult {
  lives: LifeOutcome[];
  cumulativeRenown: number;
  clears: number;
  finalUnlocked: UnlockedUpgrades;
  finalRanks: number;
  spentById: Record<string, number>;
  groveUnlockLife: number | null; // 1-indexed life at which renown first ≥ 30
  maxDepth: number;
  // Averaged over lives: renown of accumulated Grove spend that is DEAD for the
  // body piloted that life (and the fraction of total spend it represents).
  meanInactiveRenown: number;
  meanInactiveFraction: number;
}

/** Renown of owned-upgrade spend that does nothing for a `cls` body. */
function inactiveSpendFor(spentById: Record<string, number>, cls: ClassId): number {
  let dead = 0;
  for (const [id, amt] of Object.entries(spentById)) {
    if (deadForClass(id, cls)) dead += amt;
  }
  return dead;
}

function totalSpend(spentById: Record<string, number>): number {
  return Object.values(spentById).reduce((a, b) => a + b, 0);
}

function hash3(a: number, b: number, c: number): number {
  let h = (a * 2654435761) >>> 0;
  h = (h ^ (b * 40503)) >>> 0;
  h = (h ^ (c * 2246822519)) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  return h >>> 0;
}

function runChain(strategy: Strategy, soulIdx: number): ChainResult {
  let soul = freshSoul();
  const lives: LifeOutcome[] = [];
  let clears = 0;
  let groveUnlockLife: number | null = null;
  let maxDepth = 0;
  let inactiveRenownSum = 0;
  let inactiveFractionSum = 0;
  let livesWithSpend = 0;

  for (let life = 0; life < LIVES; life++) {
    const classId = strategy.classForLife(life);

    // Snapshot how much of the Grove already bought is dead for THIS body.
    const spentNow = totalSpend(soul.spentById);
    if (spentNow > 0) {
      const dead = inactiveSpendFor(soul.spentById, classId);
      inactiveRenownSum += dead;
      inactiveFractionSum += dead / spentNow;
      livesWithSpend += 1;
    }
    // Class-INDEPENDENT seeds: life L of soul S is the same dungeon + same
    // quirk roll across every strategy.
    const combatSeed = hash3(SEED_BASE ^ soulIdx, life, 11);
    const quirkSeed = hash3(SEED_BASE ^ soulIdx, life, 23);
    const delveSeed = hash3(SEED_BASE ^ soulIdx, life, 37);

    const { outcome, renownEarned, cleared } = liveOneLife(
      classId,
      soul,
      combatSeed,
      quirkSeed,
      delveSeed,
    );
    lives.push(outcome);
    maxDepth = Math.max(maxDepth, outcome.finalRoomIdx + (cleared ? 1 : 0));
    if (cleared) clears += 1;

    soul = {
      ...soul,
      renown: soul.renown + renownEarned,
      cumulativeRenownEarned: soul.cumulativeRenownEarned + renownEarned,
    };
    if (groveUnlockLife === null && soul.cumulativeRenownEarned >= GROVE_UNLOCK_THRESHOLD) {
      groveUnlockLife = life + 1;
    }

    // Shop the Grove for the class you'll descend as NEXT.
    if (life + 1 < LIVES) {
      const nextClass = strategy.classForLife(life + 1);
      const buy = buyUpgrades(nextClass, soul.renown, soul.unlockedUpgrades);
      const mergedSpent = { ...soul.spentById };
      for (const [id, amt] of Object.entries(buy.spentById)) {
        mergedSpent[id] = (mergedSpent[id] ?? 0) + amt;
      }
      soul = { ...soul, renown: buy.renown, unlockedUpgrades: buy.unlocked, spentById: mergedSpent };
    }
  }

  const finalRanks = Object.values(soul.unlockedUpgrades).reduce((a, b) => a + b, 0);
  return {
    lives,
    cumulativeRenown: soul.cumulativeRenownEarned,
    clears,
    finalUnlocked: soul.unlockedUpgrades,
    finalRanks,
    spentById: soul.spentById,
    groveUnlockLife,
    maxDepth,
    meanInactiveRenown: livesWithSpend ? inactiveRenownSum / livesWithSpend : 0,
    meanInactiveFraction: livesWithSpend ? inactiveFractionSum / livesWithSpend : 0,
  };
}

// ─── Aggregation ────────────────────────────────────────────────────────────
interface StrategyAgg {
  name: string;
  blurb: string;
  souls: number;
  meanCumulativeRenown: number;
  meanFinalRanks: number;
  totalClears: number;
  meanGroveUnlockLife: number;
  meanMaxDepth: number;
  // Reach over the chain, bucketed by life position.
  reachByLife: number[]; // avg rooms reached at each life index
  earlyReach: number; // avg reach lives 1..SWAP_AT
  lateReach: number; // avg reach lives SWAP_AT+1..end
  firstHalfRenown: number;
  secondHalfRenown: number;
  // Stranded Grove: averaged over lives, the renown of accumulated upgrade
  // spend that is dead for the body piloted that life, and its fraction of
  // total spend. Quantifies the swap penalty (class-specific buys you abandon).
  meanInactiveRenown: number;
  meanInactiveFraction: number;
  meanFinalSpend: number;
}

function aggregate(strategy: Strategy, chains: ChainResult[]): StrategyAgg {
  const n = chains.length;
  const sum = (sel: (c: ChainResult) => number) => chains.reduce((s, c) => s + sel(c), 0);

  const reachByLife: number[] = [];
  for (let life = 0; life < LIVES; life++) {
    const reaches = chains.map((c) => {
      const lo = c.lives[life];
      return lo.finalRoomIdx + (lo.cleared ? 1 : 0);
    });
    reachByLife.push(reaches.reduce((s, x) => s + x, 0) / n);
  }
  const avgRange = (lo: number, hi: number) => {
    const slice = reachByLife.slice(lo, hi);
    return slice.length ? slice.reduce((s, x) => s + x, 0) / slice.length : 0;
  };

  const half = Math.floor(LIVES / 2);
  const firstHalfRenown =
    sum((c) => c.lives.slice(0, half).reduce((s, l) => s + l.renownEarned, 0)) / n;
  const secondHalfRenown =
    sum((c) => c.lives.slice(half).reduce((s, l) => s + l.renownEarned, 0)) / n;

  return {
    name: strategy.name,
    blurb: strategy.blurb,
    souls: n,
    meanCumulativeRenown: sum((c) => c.cumulativeRenown) / n,
    meanFinalRanks: sum((c) => c.finalRanks) / n,
    totalClears: sum((c) => c.clears),
    meanGroveUnlockLife: sum((c) => c.groveUnlockLife ?? LIVES + 1) / n,
    meanMaxDepth: sum((c) => c.maxDepth) / n,
    reachByLife,
    earlyReach: avgRange(0, SWAP_AT),
    lateReach: avgRange(SWAP_AT, LIVES),
    firstHalfRenown,
    secondHalfRenown,
    meanInactiveRenown: sum((c) => c.meanInactiveRenown) / n,
    meanInactiveFraction: sum((c) => c.meanInactiveFraction) / n,
    meanFinalSpend: sum((c) => totalSpend(c.spentById)) / n,
  };
}

// ─── Run + render ────────────────────────────────────────────────────────────
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const num = (n: number, d = 1) => n.toFixed(d);

function main(): void {
  const t0 = Date.now();
  console.log(`Character-order sim — ${STRATEGIES.length} strategies × ${SOULS} souls × ${LIVES} lives\n`);

  const aggs: StrategyAgg[] = [];
  for (const strat of STRATEGIES) {
    const chains: ChainResult[] = [];
    for (let s = 0; s < SOULS; s++) chains.push(runChain(strat, s));
    const a = aggregate(strat, chains);
    aggs.push(a);
    console.log(
      `${a.name.padEnd(28)} cumRenown ${num(a.meanCumulativeRenown, 0).padStart(5)}  ` +
        `ranks ${num(a.meanFinalRanks).padStart(4)}  maxDepth ${num(a.meanMaxDepth).padStart(4)}/50  ` +
        `groveLife ${num(a.meanGroveUnlockLife).padStart(4)}  clears ${a.totalClears}  ` +
        `stranded ${num(a.meanInactiveRenown, 0).padStart(4)}r (${pct(a.meanInactiveFraction)} of spend)`,
    );
  }

  const wall = ((Date.now() - t0) / 1000).toFixed(1);
  const doc = renderDoc(aggs, wall);
  const outPath = resolve(process.cwd(), 'docs/gameplay-quality/character-order.raw.md');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, doc, 'utf8');
  console.log(`\nWrote raw output → ${outPath}  (${wall}s wall)`);
}

function renderDoc(aggs: StrategyAgg[], wall: string): string {
  const lines: string[] = [];
  lines.push('# Character-order sim — raw output');
  lines.push('');
  lines.push('> Auto-generated by `scripts/sim-character-order.ts`.');
  lines.push(`> Re-run with \`SOULS=${SOULS} LIVES=${LIVES} npx tsx scripts/sim-character-order.ts\`.`);
  lines.push('');
  lines.push(`**Souls/strategy:** ${SOULS}. **Lives/soul:** ${LIVES}. **Directional swap pivot:** life ${SWAP_AT}. **Wall:** ${wall}s.`);
  lines.push('');
  lines.push('Renown is depth-scaled (per-room + per-boss + clear/fail base, ×soul-mark). Each body is the fixed class preset. Life L of soul S is the same dungeon + quirk roll across every strategy.');
  lines.push('');
  lines.push('## Headline');
  lines.push('');
  lines.push('| Strategy | Cumulative renown | Final Grove ranks | Mean max depth /50 | Grove-unlock life | Clears | Stranded renown/life | Stranded % of spend |');
  lines.push('|---|--:|--:|--:|--:|--:|--:|--:|');
  for (const a of aggs) {
    lines.push(
      `| ${a.name} | ${num(a.meanCumulativeRenown, 0)} | ${num(a.meanFinalRanks)} | ${num(a.meanMaxDepth)} | ${num(a.meanGroveUnlockLife)} | ${a.totalClears} | ${num(a.meanInactiveRenown, 0)} | ${pct(a.meanInactiveFraction)} |`,
    );
  }
  lines.push('');
  lines.push('## Renown split (first vs second half of the chain)');
  lines.push('');
  lines.push(`| Strategy | Lives 1–${Math.floor(LIVES / 2)} renown | Lives ${Math.floor(LIVES / 2) + 1}–${LIVES} renown | Early reach (1–${SWAP_AT}) | Late reach (${SWAP_AT + 1}–${LIVES}) |`);
  lines.push('|---|--:|--:|--:|--:|');
  for (const a of aggs) {
    lines.push(
      `| ${a.name} | ${num(a.firstHalfRenown, 0)} | ${num(a.secondHalfRenown, 0)} | ${num(a.earlyReach)} | ${num(a.lateReach)} |`,
    );
  }
  lines.push('');
  lines.push('## Reach-by-life curves (avg rooms reached, /50)');
  lines.push('');
  for (const a of aggs) {
    lines.push(`### ${a.name}`);
    lines.push(`_${a.blurb}_`);
    lines.push('');
    lines.push('| Life | ' + a.reachByLife.map((_, i) => i + 1).join(' | ') + ' |');
    lines.push('|---' + '|---'.repeat(a.reachByLife.length) + '|');
    lines.push('| rooms | ' + a.reachByLife.map((r) => num(r)).join(' | ') + ' |');
    lines.push('');
  }
  return lines.join('\n');
}

main();
