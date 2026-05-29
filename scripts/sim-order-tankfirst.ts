/**
 * "Tank-first" swap-order meta-journey sim.
 *
 * Question under test: a soul plays MANY lives (default 60), carrying renown +
 * Grove + ascension across deaths AND clears (the real wheel turns on both).
 * Does opening with several FIGHTER lives to bank renown safely, then swapping
 * to a squishier payoff class (Rogue / Wizard) once the Grove is built, beat
 * just staying one class the whole way?
 *
 * This is NOT the single-run reincarnation sim (sim-reincarnation-loop.ts): that
 * one stops the chain on first clear and ignores ascension. The meta journey
 * here mirrors the live loop:
 *   - play at the frontier ascension level (metaStore.ascensionUnlocked),
 *   - a clear at the frontier unlocks the next rung (delveStore.finishDelve →
 *     unlockNextAscension), capped at MAX_ASCENSION,
 *   - both clear and death turn the wheel: quirks reroll, gear resets to kit,
 *     renown settles (clear premium + depth credit, scaled by the ascension
 *     renown multiplier),
 *   - between lives the soul spends renown greedily on a class-tuned Grove
 *     priority list, and — per the swap order — may descend as a different class
 *     (carrySoulProgress: renown + Grove + quirks ride along, gear/level reset).
 *
 * Class-swap fidelity (the whole point):
 *   - Grove ledger (unlockedUpgrades) is ACCOUNT-level — it survives a swap, so
 *     a Fighter who banks Cloak-of-the-Grove AC keeps it as a Rogue.
 *   - But class-LOCKED nodes are inert on the wrong body: Wellspring Vigil only
 *     fires for a Fighter; Shadowstep / Knife-in-the-Dark only for a Rogue; the
 *     spell-damage trees only pay a Wizard. Renown sunk into a node the soul's
 *     destination class can't use is wasted — the sim tracks that waste.
 *
 * Two buyer policies model how a tank-first player spends during the Fighter
 * phase:
 *   - NAIVE: buy for whoever descends next. During the Fighter phase this buys
 *     Fighter-locked nodes that the post-swap class throws away.
 *   - PLANNED: buy for SHARED survivability + the EVENTUAL target class from
 *     life 1 (Grove nodes persist, so a Fighter can pre-kit the Rogue it will
 *     become). Zero class-locked waste.
 *
 * Run:
 *   SOULS=200 LIVES=60 SWAP_AT=6 npx tsx scripts/sim-order-tankfirst.ts
 *
 * Writes raw matrix to docs/gameplay-quality/order-tankfirst.raw.md.
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

const SOULS = Number(process.env.SOULS ?? 200);
const LIVES = Number(process.env.LIVES ?? 60);
const SWAP_AT = Number(process.env.SWAP_AT ?? 6); // Fighter lives before the swap.
const MAX_TURNS_PER_FIGHT = 200;
const SEED_BASE = 0xc0ffee >>> 0;

// Mirrors delveStore.ts renown constants (current formula, incl. depth credit).
const RENOWN_PER_DELVE_CLEAR = 50;
const RENOWN_PER_DELVE_FAILURE = 15;
const RENOWN_PER_CHAPTER_BOSS = 10;
const RENOWN_PER_ROOM_REACHED = 1;
const GROVE_UNLOCK_THRESHOLD = 30;

const TOTAL_ROOMS = 50;

// ─── Grove purchase priorities ──────────────────────────────────────────────
// Greedy buy between lives. `unlock` gates the deeper tiers behind ascension
// (mirrors metaStore.purchaseUpgrade). Lists favour defensive scaling first,
// then class damage.

interface PriorityEntry {
  id: string;
  maxAtRank: number;
}

const SHARED_PRIORITY: PriorityEntry[] = [
  { id: 'pilgrims-boots', maxAtRank: 1 }, // +2 HP, cost 25 — first target
  { id: 'mielikki-cache', maxAtRank: 4 }, // +N potions/delve
  { id: 'mantle-of-the-wakened', maxAtRank: 5 }, // +5 HP/rank
  { id: 'cloak-of-the-grove', maxAtRank: 3 }, // +1 AC/rank
  { id: 'wellspring-depths', maxAtRank: 3 }, // +10 HP/rank — A1-gated deeper tier
  { id: 'hardier-soul', maxAtRank: 3 }, // +1 stabilise/rank
  { id: 'coin-in-pocket', maxAtRank: 3 }, // +gold start / per ch-boss
  { id: 'iron-will', maxAtRank: 1 }, // +5 HP one-shot
  { id: 'crown-of-the-returned', maxAtRank: 2 }, // +1 atk & spell-atk — A3-gated tier
];

const CLASS_PRIORITY: Record<ClassId, PriorityEntry[]> = {
  rogue: [
    { id: 'shadowstep', maxAtRank: 3 }, // +N Cunning Action
    { id: 'knife-in-the-dark', maxAtRank: 3 }, // +Nd6 sneak
    { id: 'heirloom-blade', maxAtRank: 4 }, // +N attack
    { id: 'whetstone-resolve', maxAtRank: 4 }, // +N damage
    { id: 'killers-eye', maxAtRank: 2 }, // crit range
  ],
  fighter: [
    { id: 'wellspring-vigil', maxAtRank: 3 }, // +N second wind
    { id: 'heirloom-blade', maxAtRank: 4 },
    { id: 'whetstone-resolve', maxAtRank: 4 },
    { id: 'first-cut', maxAtRank: 3 }, // +N first attack dmg
    { id: 'fellfast-strike', maxAtRank: 3 }, // +N crit dmg
  ],
  wizard: [
    { id: 'burning-tongue', maxAtRank: 5 }, // +N spell dmg
    { id: 'arcane-focus', maxAtRank: 3 }, // +N spell attack
    { id: 'sigil-of-the-wakened-mind', maxAtRank: 3 }, // +N spell DC
  ],
};

// Nodes whose entire value is locked to one class. Renown spent on a node not
// matching the soul's destination class is wasted (inert no-op or, for the
// spell trees, useless on a martial body).
const CLASS_LOCKED: Record<string, ClassId> = {
  'wellspring-vigil': 'fighter',
  shadowstep: 'rogue',
  'knife-in-the-dark': 'rogue',
  'burning-tongue': 'wizard',
  'arcane-focus': 'wizard',
  'sigil-of-the-wakened-mind': 'wizard',
};

function priorityFor(classId: ClassId): PriorityEntry[] {
  const cls = CLASS_PRIORITY[classId];
  const out: PriorityEntry[] = [];
  out.push(SHARED_PRIORITY[0]); // pilgrims-boots first
  const maxLen = Math.max(cls.length, SHARED_PRIORITY.length - 1);
  for (let i = 0; i < maxLen; i++) {
    if (i < cls.length) out.push(cls[i]);
    if (i + 1 < SHARED_PRIORITY.length) out.push(SHARED_PRIORITY[i + 1]);
  }
  return out;
}

interface Purchase {
  id: string;
  rank: number;
  cost: number;
  buyerClass: ClassId;
}

/** Greedy "spend renown" between lives. Respects ascension gates. */
function buyUpgrades(
  buyClass: ClassId,
  renown: number,
  unlocked: UnlockedUpgrades,
  ascensionUnlocked: number,
): { renown: number; unlocked: UnlockedUpgrades; purchased: Purchase[] } {
  let r = renown;
  const u: UnlockedUpgrades = { ...unlocked };
  const purchased: Purchase[] = [];
  if (r < GROVE_UNLOCK_THRESHOLD) {
    return { renown: r, unlocked: u, purchased };
  }
  const list = priorityFor(buyClass);
  let bought = true;
  let safety = 0;
  while (bought && safety < 200) {
    bought = false;
    safety += 1;
    for (const { id, maxAtRank } of list) {
      const up = findUpgrade(id);
      if (!up) continue;
      // Ascension gate (mirrors metaStore.purchaseUpgrade).
      const reqAsc = up.unlock?.ascension ?? 0;
      if (ascensionUnlocked < reqAsc) continue;
      const curRank = u[id] ?? 0;
      const targetRank = Math.min(maxAtRank, up.maxRank);
      if (curRank >= targetRank) continue;
      const nextRank = curRank + 1;
      const cost = up.costForRank(nextRank);
      if (r >= cost) {
        r -= cost;
        u[id] = nextRank;
        purchased.push({ id, rank: nextRank, cost, buyerClass: buyClass });
        bought = true;
        break;
      }
    }
  }
  return { renown: r, unlocked: u, purchased };
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

interface SoulState {
  renown: number;
  unlockedUpgrades: UnlockedUpgrades;
  quirks: string[];
  ascensionUnlocked: number;
}

function freshSoul(): SoulState {
  return { renown: 0, unlockedUpgrades: {}, quirks: [], ascensionUnlocked: 0 };
}

/**
 * Build the character that descends for one life. Fresh L1 archetype of the
 * given class + all permanent Grove upgrades + delve-start upgrades, fresh
 * quirks (the wheel rerolls them every life — clear or death), full HP.
 */
function descend(roller: DiceRoller, classId: ClassId, soul: SoulState): Character {
  let c = characterAtLevel(classId, 1);
  c = applyPermanentUpgrades(c, soul.unlockedUpgrades);
  c = applyDelveStartUpgrades(c, soul.unlockedUpgrades);
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
  const isBoss = room.kind === 'boss';
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
  unlockedRanksAtStart: number;
}

function liveOneLife(
  roller: DiceRoller,
  classId: ClassId,
  soul: SoulState,
  lifeIdx: number,
  seedBase: number,
): { outcome: LifeOutcome; finalQuirks: string[] } {
  const ascension = soul.ascensionUnlocked;
  let character = descend(roller, classId, soul);
  const delveSeed =
    ((seedBase + lifeIdx * 7919) ^ (classId.charCodeAt(0) * 1009) ^ (ascension * 7561)) >>> 0;
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
      const options = rollBlessingOptions(
        roller,
        3 + (character.shrineOptionBonus ?? 0),
        character.classId,
        character.blessings,
      );
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
  // Current renown formula (delveStore.finishDelve): clear/fail base + per-boss
  // + depth credit, scaled by soul-mark AND the ascension renown multiplier.
  const renownBase =
    (cleared ? RENOWN_PER_DELVE_CLEAR : RENOWN_PER_DELVE_FAILURE) +
    RENOWN_PER_CHAPTER_BOSS * bossesKilled +
    RENOWN_PER_ROOM_REACHED * finalRoomIdx;
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
      unlockedRanksAtStart,
    },
    finalQuirks: character.quirks,
  };
}

// ─── Strategies ───────────────────────────────────────────────────────────

interface Strategy {
  id: string;
  label: string;
  /** Class that descends for the given life index. */
  classForLife: (life: number) => ClassId;
  /** Class whose Grove priority to buy after the given life ends. */
  buyClassAfter: (life: number) => ClassId;
  /** The class the soul ends on — for waste accounting. */
  targetClass: ClassId;
}

function baseline(classId: ClassId): Strategy {
  return {
    id: `baseline-${classId}`,
    label: `Single-class ${classId} (×${LIVES})`,
    classForLife: () => classId,
    buyClassAfter: () => classId,
    targetClass: classId,
  };
}

function tankFirst(target: ClassId, planned: boolean): Strategy {
  const classForLife = (life: number): ClassId => (life < SWAP_AT ? 'fighter' : target);
  return {
    id: `tankfirst-${target}-${planned ? 'planned' : 'naive'}`,
    label: `Tank-first → ${target} (${planned ? 'planned' : 'naive'} buys, swap@${SWAP_AT})`,
    classForLife,
    // PLANNED: always buy for the eventual target (+shared) — a Fighter pre-kits
    // the class it becomes, zero class-locked waste. NAIVE: buy for whoever
    // descends next — Fighter-locked nodes bought in the Fighter phase are lost.
    buyClassAfter: planned ? () => target : (life: number) => classForLife(life + 1),
    targetClass: target,
  };
}

// ─── Journey ────────────────────────────────────────────────────────────────

interface JourneyResult {
  strategyId: string;
  lives: LifeOutcome[];
  totalClears: number;
  firstClearLife: number | null; // 1-based
  ascensionReached: number;
  /** 1-based life index at which each ascension level (1..6) was first unlocked; null if never. */
  ascensionUnlockLife: (number | null)[];
  grossRenown: number; // total earned across all lives (pre-spend)
  finalBankedRenown: number;
  finalGroveRanks: number;
  wastedRenown: number; // spent on nodes locked to a non-target class
  /** Cumulative gross renown after each life (length LIVES). */
  cumRenownByLife: number[];
  /** Frontier ascension at the START of each life (length LIVES). */
  ascensionByLife: number[];
  /** finalRoomIdx reached each life (length LIVES). */
  depthByLife: number[];
  /** cleared flag each life. */
  clearedByLife: boolean[];
}

function runJourney(strategy: Strategy, seedBase: number): JourneyResult {
  const roller = createDiceRoller(seedBase);
  setActiveRoller(seedBase);
  let soul = freshSoul();

  const lives: LifeOutcome[] = [];
  const ascensionUnlockLife: (number | null)[] = Array(MAX_ASCENSION + 1).fill(null);
  const cumRenownByLife: number[] = [];
  const ascensionByLife: number[] = [];
  const depthByLife: number[] = [];
  const clearedByLife: boolean[] = [];

  let grossRenown = 0;
  let totalClears = 0;
  let firstClearLife: number | null = null;
  let wastedRenown = 0;

  for (let life = 0; life < LIVES; life++) {
    const classId = strategy.classForLife(life);
    ascensionByLife.push(soul.ascensionUnlocked);

    const { outcome, finalQuirks } = liveOneLife(roller, classId, soul, life, seedBase);
    lives.push(outcome);
    depthByLife.push(outcome.finalRoomIdx + (outcome.cleared ? 1 : 0));
    clearedByLife.push(outcome.cleared);

    grossRenown += outcome.renownEarned;
    cumRenownByLife.push(grossRenown);
    soul = {
      ...soul,
      renown: soul.renown + outcome.renownEarned,
      quirks: finalQuirks,
    };

    if (outcome.cleared) {
      totalClears += 1;
      if (firstClearLife === null) firstClearLife = life + 1;
      // Frontier clear opens the next rung (Spire-style).
      if (
        outcome.ascensionPlayed >= soul.ascensionUnlocked &&
        soul.ascensionUnlocked < MAX_ASCENSION
      ) {
        soul = { ...soul, ascensionUnlocked: soul.ascensionUnlocked + 1 };
        if (ascensionUnlockLife[soul.ascensionUnlocked] === null) {
          ascensionUnlockLife[soul.ascensionUnlocked] = life + 1;
        }
      }
    }

    // Between-life Grove spend.
    const buyClass = strategy.buyClassAfter(life);
    const buy = buyUpgrades(buyClass, soul.renown, soul.unlockedUpgrades, soul.ascensionUnlocked);
    soul = { ...soul, renown: buy.renown, unlockedUpgrades: buy.unlocked };
    for (const p of buy.purchased) {
      const locked = CLASS_LOCKED[p.id];
      if (locked && locked !== strategy.targetClass) wastedRenown += p.cost;
    }
  }

  const finalGroveRanks = Object.values(soul.unlockedUpgrades).reduce((a, b) => a + b, 0);
  return {
    strategyId: strategy.id,
    lives,
    totalClears,
    firstClearLife,
    ascensionReached: soul.ascensionUnlocked,
    ascensionUnlockLife,
    grossRenown,
    finalBankedRenown: soul.renown,
    finalGroveRanks,
    wastedRenown,
    cumRenownByLife,
    ascensionByLife,
    depthByLife,
    clearedByLife,
  };
}

// ─── Aggregation ──────────────────────────────────────────────────────────

interface CellAggregate {
  strategy: Strategy;
  souls: number;
  meanTotalClears: number;
  meanFirstClearLife: number | null;
  pctEverCleared: number;
  meanAscensionReached: number;
  pctReachedA6: number;
  pctReachedA1: number;
  /** Mean 1-based life at which each ascension level was first reached (over souls that reached it); null if none. */
  meanAscensionUnlockLife: (number | null)[];
  pctReachedAscension: number[]; // per level 1..6
  meanGrossRenown: number;
  meanFinalGroveRanks: number;
  meanWastedRenown: number;
  /** Mean cumulative gross renown at life checkpoints. */
  cumRenownCheckpoints: { life: number; mean: number }[];
  /** Mean frontier ascension at life checkpoints. */
  ascensionCheckpoints: { life: number; mean: number }[];
  /** Clear-rate over lives, bucketed into thirds of the journey. */
  clearRateByThird: number[];
  meanFinalDepth: number; // mean depth of the last life
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

const CHECKPOINTS = [1, 5, 10, 20, 30, 45, 60].filter((l) => l <= LIVES);

function aggregate(strategy: Strategy, journeys: JourneyResult[]): CellAggregate {
  const n = journeys.length;

  const meanAscensionUnlockLife: (number | null)[] = [];
  const pctReachedAscension: number[] = [];
  for (let lvl = 1; lvl <= MAX_ASCENSION; lvl++) {
    const reached = journeys
      .map((j) => j.ascensionUnlockLife[lvl])
      .filter((x): x is number => x !== null);
    meanAscensionUnlockLife.push(reached.length ? mean(reached) : null);
    pctReachedAscension.push(reached.length / n);
  }

  const cumRenownCheckpoints = CHECKPOINTS.map((life) => ({
    life,
    mean: mean(journeys.map((j) => j.cumRenownByLife[life - 1] ?? 0)),
  }));
  const ascensionCheckpoints = CHECKPOINTS.map((life) => ({
    life,
    mean: mean(journeys.map((j) => j.ascensionByLife[life - 1] ?? 0)),
  }));

  const third = Math.max(1, Math.floor(LIVES / 3));
  const clearRateByThird = [0, 1, 2].map((t) => {
    const lo = t * third;
    const hi = t === 2 ? LIVES : (t + 1) * third;
    const flags: boolean[] = [];
    for (const j of journeys) for (let l = lo; l < hi; l++) flags.push(j.clearedByLife[l]);
    return flags.length ? flags.filter(Boolean).length / flags.length : 0;
  });

  const firstClears = journeys
    .map((j) => j.firstClearLife)
    .filter((x): x is number => x !== null);

  return {
    strategy,
    souls: n,
    meanTotalClears: mean(journeys.map((j) => j.totalClears)),
    meanFirstClearLife: firstClears.length ? mean(firstClears) : null,
    pctEverCleared: firstClears.length / n,
    meanAscensionReached: mean(journeys.map((j) => j.ascensionReached)),
    pctReachedA6: journeys.filter((j) => j.ascensionReached >= 6).length / n,
    pctReachedA1: journeys.filter((j) => j.ascensionReached >= 1).length / n,
    meanAscensionUnlockLife,
    pctReachedAscension,
    meanGrossRenown: mean(journeys.map((j) => j.grossRenown)),
    meanFinalGroveRanks: mean(journeys.map((j) => j.finalGroveRanks)),
    meanWastedRenown: mean(journeys.map((j) => j.wastedRenown)),
    cumRenownCheckpoints,
    ascensionCheckpoints,
    clearRateByThird,
    meanFinalDepth: mean(journeys.map((j) => j.depthByLife[LIVES - 1] ?? 0)),
  };
}

// ─── Cells ──────────────────────────────────────────────────────────────────

const STRATEGIES: Strategy[] = [
  baseline('fighter'),
  baseline('rogue'),
  baseline('wizard'),
  tankFirst('rogue', false),
  tankFirst('rogue', true),
  tankFirst('wizard', false),
  tankFirst('wizard', true),
];

function runCell(strategy: Strategy): CellAggregate {
  const journeys: JourneyResult[] = [];
  for (let i = 0; i < SOULS; i++) {
    const seed = (SEED_BASE ^ (hashStr(strategy.id) * 2654435761) ^ (i * 104729)) >>> 0;
    journeys.push(runJourney(strategy, seed));
  }
  return aggregate(strategy, journeys);
}

function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ─── Rendering ────────────────────────────────────────────────────────────

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const num = (x: number, d = 2) => x.toFixed(d);
const orDash = (x: number | null, d = 1) => (x === null ? '—' : num(x, d));

function renderHeadline(aggs: CellAggregate[]): string {
  const lines: string[] = [];
  lines.push(
    '| Strategy | Souls | Mean clears | 1st-clear life | Asc reached | % A6 | Mean Grove ranks | Wasted renown |',
  );
  lines.push(
    '|----------|------:|-----------:|--------------:|-----------:|-----:|----------------:|-------------:|',
  );
  for (const a of aggs) {
    lines.push(
      `| ${a.strategy.label} | ${a.souls} | ${num(a.meanTotalClears, 1)} | ${orDash(a.meanFirstClearLife)} | ${num(a.meanAscensionReached, 2)} | ${pct(a.pctReachedA6)} | ${num(a.meanFinalGroveRanks, 1)} | ${num(a.meanWastedRenown, 0)} |`,
    );
  }
  return lines.join('\n');
}

function renderAscensionLadder(aggs: CellAggregate[]): string {
  const lines: string[] = [];
  lines.push('Mean life index at which each ascension rung is first unlocked (— = never, over souls that reached it):');
  lines.push('');
  const header = ['Strategy', ...Array.from({ length: MAX_ASCENSION }, (_, i) => `A${i + 1}`)];
  lines.push(`| ${header.join(' | ')} |`);
  lines.push(`|${header.map(() => '---:').join('|')}|`.replace('---:', '---'));
  for (const a of aggs) {
    const cells = a.meanAscensionUnlockLife.map(
      (m, i) => `${orDash(m)}${a.pctReachedAscension[i] < 1 ? ` (${pct(a.pctReachedAscension[i])})` : ''}`,
    );
    lines.push(`| ${a.strategy.label} | ${cells.join(' | ')} |`);
  }
  return lines.join('\n');
}

function renderRenownCurve(aggs: CellAggregate[]): string {
  const lines: string[] = [];
  lines.push('Mean cumulative gross renown earned by life N:');
  lines.push('');
  const header = ['Strategy', ...CHECKPOINTS.map((l) => `L${l}`)];
  lines.push(`| ${header.join(' | ')} |`);
  lines.push(`| ${header.map(() => '---').join(' | ')} |`);
  for (const a of aggs) {
    const cells = a.cumRenownCheckpoints.map((c) => num(c.mean, 0));
    lines.push(`| ${a.strategy.label} | ${cells.join(' | ')} |`);
  }
  lines.push('');
  lines.push('Mean frontier ascension level at the START of life N:');
  lines.push('');
  lines.push(`| ${header.join(' | ')} |`);
  lines.push(`| ${header.map(() => '---').join(' | ')} |`);
  for (const a of aggs) {
    const cells = a.ascensionCheckpoints.map((c) => num(c.mean, 2));
    lines.push(`| ${a.strategy.label} | ${cells.join(' | ')} |`);
  }
  return lines.join('\n');
}

function renderClearCurve(aggs: CellAggregate[]): string {
  const lines: string[] = [];
  lines.push('Clear-rate across the journey, bucketed into thirds (early / mid / late lives):');
  lines.push('');
  lines.push(`| Strategy | Early third | Mid third | Late third | Final-life depth (/${TOTAL_ROOMS}) |`);
  lines.push('|----------|-----------:|---------:|----------:|----------------------:|');
  for (const a of aggs) {
    lines.push(
      `| ${a.strategy.label} | ${pct(a.clearRateByThird[0])} | ${pct(a.clearRateByThird[1])} | ${pct(a.clearRateByThird[2])} | ${num(a.meanFinalDepth, 1)} |`,
    );
  }
  return lines.join('\n');
}

function renderRawDoc(aggs: CellAggregate[], wallSec: string): string {
  return `# Tank-first swap-order meta-journey — raw output

> Auto-generated by \`scripts/sim-order-tankfirst.ts\`. Re-run with
> \`SOULS=${SOULS} LIVES=${LIVES} SWAP_AT=${SWAP_AT} npx tsx scripts/sim-order-tankfirst.ts\`.

**Souls / cell:** ${SOULS}. **Lives / soul:** ${LIVES}. **Swap after:** ${SWAP_AT} Fighter lives.
**Wall clock:** ${wallSec}s.

The soul plays at the frontier ascension level; a clear there opens the next rung
(cap A${MAX_ASCENSION}). Both clear and death turn the wheel (quirks reroll, gear resets,
renown settles with depth credit × ascension multiplier). Renown is spent greedily
between lives on a class-tuned Grove list; gear does NOT persist across lives.

## Headline

${renderHeadline(aggs)}

## Ascension ladder — when each rung opens

${renderAscensionLadder(aggs)}

## Renown + ascension growth curves

${renderRenownCurve(aggs)}

## Clear-rate progression + final depth

${renderClearCurve(aggs)}
`;
}

function main(): void {
  const tWall0 = Date.now();
  console.log(
    `Tank-first order sim — ${STRATEGIES.length} strategies × ${SOULS} souls × ${LIVES} lives (swap@${SWAP_AT})\n`,
  );

  const aggs: CellAggregate[] = [];
  for (const strategy of STRATEGIES) {
    const t0 = Date.now();
    const a = runCell(strategy);
    aggs.push(a);
    const dt = Date.now() - t0;
    console.log(
      `${strategy.id.padEnd(26)} → clears ${num(a.meanTotalClears, 1).padStart(5)}  1stClear L${orDash(a.meanFirstClearLife).padStart(5)}  ascReached ${num(a.meanAscensionReached, 2).padStart(5)}  %A6 ${pct(a.pctReachedA6).padStart(6)}  groveRanks ${num(a.meanFinalGroveRanks, 1).padStart(5)}  wasted ${num(a.meanWastedRenown, 0).padStart(5)}  ${dt}ms`,
    );
  }

  const dtTotal = ((Date.now() - tWall0) / 1000).toFixed(1);
  const doc = renderRawDoc(aggs, dtTotal);
  const outPath = resolve(process.cwd(), 'docs/gameplay-quality/order-tankfirst.raw.md');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, doc, 'utf8');
  console.log(`\nWrote raw output → ${outPath}  (${dtTotal}s wall)`);
}

main();
