/**
 * Reincarnation-loop quality sim. Measures whether multi-life chains actually
 * produce deeper runs than a single life, and whether life N+1 reaches further
 * than life N inside a chain.
 *
 * Three modes: 1-life / 3-life / 5-life × 3 classes × 200 souls.
 *
 * What persists across lives (modelled here, mirrors delveStore.startDelve +
 * delveStore.failDelve):
 *  - renown   (accumulates from clears + chapter-boss credit)
 *  - unlockedUpgrades (Grove purchases — bought greedily between lives from a
 *    class-tuned priority list)
 *  - inventory (the per-game `freshlyDescended` keeps `...character` so any
 *    Mielikki's Cache potions / merchant items survive the wheel)
 *  - quirks   (rerolled per death — Wheelturner carry not modelled)
 *  - permanentBonuses (folded in by applyPermanentUpgrade at purchase time)
 *
 * What resets per life (also mirrors startDelve):
 *  - level=1, xp=0, hp, blessings, campBoons, conditions, delve budgets
 *
 * Run:
 *   RUNS_PER_CELL=200 npx tsx scripts/sim-reincarnation-loop.ts
 *
 * Writes raw matrix to docs/gameplay-quality/reincarnation-loop.raw.md.
 * Curated verdict lives in docs/gameplay-quality/reincarnation-loop.md.
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
import type { Character } from '../src/types/character';
import type { CombatState } from '../src/types/combat';
import type { RoomSpec } from '../src/types/delve';

type ClassId = 'rogue' | 'fighter' | 'wizard';
type Mode = '1-life' | '3-life' | '5-life' | '3-life-no-meta';

const RUNS_PER_CELL = Number(process.env.RUNS_PER_CELL ?? 200);
const MAX_TURNS_PER_FIGHT = 200;
const SEED_BASE = 0xc0ffee >>> 0;

// Mirrors delveStore.ts constants.
const RENOWN_PER_DELVE_CLEAR = 50;
const RENOWN_PER_DELVE_FAILURE = 15;
const RENOWN_PER_CHAPTER_BOSS = 10;
const GROVE_UNLOCK_THRESHOLD = 30;

const BOSS_DEF_IDS = {
  ilyich: 'duergar-ilyich',
  magistrate: 'athkatla-magistrate',
  director: 'asylum-director',
  matron: 'drow-matron-mother',
} as const;
const CHAPTER_OF_BOSS: Record<string, number> = {
  [BOSS_DEF_IDS.ilyich]: 1,
  [BOSS_DEF_IDS.magistrate]: 2,
  [BOSS_DEF_IDS.director]: 3,
  [BOSS_DEF_IDS.matron]: 4,
};

// Total rooms in the full Godwake chain.
const TOTAL_ROOMS = 37;

// ─── Grove purchase priorities ──────────────────────────────────────────────
// Greedy buy: at each life transition, the soul re-evaluates and buys the
// affordable upgrade highest in this list. Lists were picked from upgrades/
// to favour defensive scaling first (HP, AC) then class-specific damage.

const SHARED_PRIORITY: { id: string; maxAtRank: number }[] = [
  { id: 'pilgrims-boots', maxAtRank: 1 },        // +5 ft move, cost 25 — first purchase target
  { id: 'mielikki-cache', maxAtRank: 4 },        // +N potions/delve, cost rankCost(100, r)
  { id: 'mantle-of-the-wakened', maxAtRank: 5 }, // +5 HP/rank, cost rankCost(80, r)
  { id: 'cloak-of-the-grove', maxAtRank: 3 },    // +1 AC/rank, cost rankCost(150, r)
  { id: 'hardier-soul', maxAtRank: 3 },          // +1 stabilise/rank
  { id: 'stoneweave-boots', maxAtRank: 4 },      // +1 init/rank
  { id: 'coin-in-pocket', maxAtRank: 3 },        // +25 gold start / +5 per ch-boss
  { id: 'iron-will', maxAtRank: 1 },             // +5 HP one-shot
];

const CLASS_PRIORITY: Record<ClassId, { id: string; maxAtRank: number }[]> = {
  rogue: [
    { id: 'shadowstep', maxAtRank: 3 },          // +N Cunning Action uses
    { id: 'knife-in-the-dark', maxAtRank: 3 },   // +Nd6 sneak
    { id: 'heirloom-blade', maxAtRank: 4 },      // +N attack
    { id: 'whetstone-resolve', maxAtRank: 4 },   // +N damage
    { id: 'killers-eye', maxAtRank: 2 },         // crit range
  ],
  fighter: [
    { id: 'wellspring-vigil', maxAtRank: 3 },    // +N second wind charges
    { id: 'heirloom-blade', maxAtRank: 4 },
    { id: 'whetstone-resolve', maxAtRank: 4 },
    { id: 'first-cut', maxAtRank: 3 },           // +N first attack dmg
    { id: 'fellfast-strike', maxAtRank: 3 },     // +N crit dmg
  ],
  wizard: [
    { id: 'burning-tongue', maxAtRank: 5 },      // +N spell dmg
    { id: 'arcane-focus', maxAtRank: 3 },        // +N spell attack
    { id: 'sigil-of-the-wakened-mind', maxAtRank: 3 }, // +N spell DC
  ],
};

function priorityFor(classId: ClassId): { id: string; maxAtRank: number }[] {
  // Interleave class-priority above shared-priority so HP/AC don't drown
  // class-defining buys. Pattern: pilgrims-boots first, then alternate class
  // and shared.
  const cls = CLASS_PRIORITY[classId];
  const out: { id: string; maxAtRank: number }[] = [];
  out.push(SHARED_PRIORITY[0]); // pilgrims-boots
  // Interleave the rest
  const maxLen = Math.max(cls.length, SHARED_PRIORITY.length - 1);
  for (let i = 0; i < maxLen; i++) {
    if (i < cls.length) out.push(cls[i]);
    if (i + 1 < SHARED_PRIORITY.length) out.push(SHARED_PRIORITY[i + 1]);
  }
  return out;
}

/** Greedy "spend renown" between lives. Returns updated unlocked + remaining renown. */
function buyUpgrades(
  classId: ClassId,
  renown: number,
  unlocked: UnlockedUpgrades,
): { renown: number; unlocked: UnlockedUpgrades; purchased: string[] } {
  let r = renown;
  const u: UnlockedUpgrades = { ...unlocked };
  const purchased: string[] = [];
  if (r < GROVE_UNLOCK_THRESHOLD) {
    return { renown: r, unlocked: u, purchased };
  }
  const list = priorityFor(classId);
  let bought = true;
  let safety = 0;
  while (bought && safety < 50) {
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
        purchased.push(`${id}@${nextRank}`);
        bought = true;
        break; // restart from top of priority list each purchase
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
  // applyLevelUp doesn't see permanentBonuses.hp — add the cumulative bump once.
  const permHp = ch.permanentBonuses?.hp ?? 0;
  if (permHp > 0) {
    const newMax = ch.hp.max + permHp;
    ch = { ...ch, hp: { current: newMax, max: newMax, temp: ch.hp.temp } };
  }
  return ch;
}

interface SoulState {
  classId: ClassId;
  renown: number;
  unlockedUpgrades: UnlockedUpgrades;
  inventory: Character['inventory'];
  quirks: string[];
  carriesMeta: boolean;
}

function freshSoul(classId: ClassId, carriesMeta: boolean): SoulState {
  return {
    classId,
    renown: 0,
    unlockedUpgrades: {},
    inventory: [],
    quirks: [],
    carriesMeta,
  };
}

/**
 * Build the character that descends for life `lifeIdx`. Applies the soul's
 * persistent upgrades + carries the inventory forward. Rerolls quirks per
 * life (mirrors `failDelve` behaviour). Mirrors `delveStore.startDelve` for
 * the freshly-descended character shape.
 */
function descend(roller: DiceRoller, soul: SoulState): Character {
  // 1) Build the bare archetype at level 1 (every descent starts at L1, per
  //    startDelve: `level: 1, xp: 0`).
  let c = characterAtLevel(soul.classId, 1);
  // 2) Apply permanent grove upgrades from the soul (persists)
  if (soul.carriesMeta) {
    c = applyPermanentUpgrades(c, soul.unlockedUpgrades);
  }
  // 3) Apply delve-start upgrades (Mielikki's Cache potions, Hardier Soul, etc.)
  if (soul.carriesMeta) {
    c = applyDelveStartUpgrades(c, soul.unlockedUpgrades);
  }
  // 4) Carry inventory from soul (this matches the real `startDelve` which
  //    spreads `...ch` and does NOT clear inventory). Stable identity across
  //    rolls keeps potion / sword pickups meaningful.
  if (soul.carriesMeta && soul.inventory.length > 0) {
    // Dedup: shared archetype already gives potions + weapon. Soul inventory
    // would otherwise duplicate Mielikki's Cache potions. Use the bigger of
    // the two.
    const merged = soul.inventory.length > c.inventory.length ? soul.inventory : c.inventory;
    c = { ...c, inventory: [...merged] };
  }
  // 5) Roll fresh quirks per life. Sim model is "no Wheelturner" — 2 fresh
  //    quirks rolled per descent. This matches the game's default and lets us
  //    measure whether soul-mark renown bonuses pay off.
  const quirks = rollQuirks(roller, 2);
  c = { ...c, quirks };
  // Reset HP to full for the new descent
  c = { ...c, hp: { ...c.hp, current: c.hp.max } };
  return longRest(c);
}

interface LifeOutcome {
  lifeIdx: number;
  cleared: boolean;
  finalRoomIdx: number;
  finalChapter: number;
  finalLevel: number;
  bossesKilled: number;
  bossesReached: number;
  renownEarned: number;
  goldEarned: number;
  xpEarned: number;
  deathCause: string | null;
  unlockedAtStart: number; // count of upgrade ranks owned
}

function roomChapter(idx: number): number {
  if (idx <= 9) return 1;
  if (idx === 10) return 1;
  if (idx <= 18) return 2;
  if (idx === 19) return 2;
  if (idx <= 27) return 3;
  if (idx === 28) return 3;
  return 4;
}

function runCombatRoom(
  roller: DiceRoller,
  characterIn: Character,
  room: RoomSpec,
): { character: Character; victory: boolean; defIds: string[] } {
  _resetMonsterInstanceCounter();
  const monsterRefs = (room.monsters ?? []).flatMap((rm) => {
    const def = getMonster(rm.defId);
    return Array.from({ length: rm.count }, () => ({ def, displayName: rm.displayPrefix }));
  });
  const init = createCombat({ roller, character: characterIn, monsters: monsterRefs });
  let state: CombatState = init.state;
  let character: Character = init.character;
  const defIds = monsterRefs.map((m) => m.def.id);

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
  return { character, victory: state.status === 'player-victory', defIds };
}

function liveOneLife(
  roller: DiceRoller,
  soul: SoulState,
  lifeIdx: number,
  seedBase: number,
): { outcome: LifeOutcome; finalCharacter: Character } {
  let character = descend(roller, soul);
  const delveSeed = ((seedBase + lifeIdx * 7919) ^ (soul.classId.charCodeAt(0) * 1009)) >>> 0;
  const delve = createGodwakeDelve({ seed: delveSeed });

  const unlockedAtStart = Object.values(soul.unlockedUpgrades).reduce((a, b) => a + b, 0);

  let bossesKilled = 0;
  let bossesReached = 0;
  let xpEarned = 0;
  let goldEarned = 0;
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
      // Loaded variant: greedy pick a temp-HP blessing for survival lift.
      // Mirrors the rogueSim heuristic without the full scorer.
      const options = rollBlessingOptions(roller, 3 + (character.shrineOptionBonus ?? 0));
      const pick = options[0];
      if (pick && !character.blessings.includes(pick)) {
        character = { ...character, blessings: [...character.blessings, pick] };
      }
      continue;
    }
    if (room.kind === 'event') continue;

    const isBoss = room.kind === 'boss';
    let bossDefId: string | null = null;
    if (isBoss) {
      bossDefId = room.monsters?.[0]?.defId ?? null;
      if (bossDefId) bossesReached += 1;
    }

    const result = runCombatRoom(roller, character, room);
    character = result.character;

    if (!result.victory) {
      died = true;
      deathCause = isBoss && bossDefId ? bossDefId : room.id;
      break;
    }

    if (isBoss && bossDefId) bossesKilled += 1;
    const rXp = room.xpReward ?? 0;
    const rGold = room.goldReward ?? 0;
    xpEarned += rXp;
    goldEarned += rGold;
    if (rXp > 0) {
      character = { ...character, xp: character.xp + rXp };
      while (character.level < MAX_LEVEL && character.xp >= xpForLevel(character.level + 1)) {
        character = applyLevelUp(character);
      }
    }
  }

  const cleared = !died;
  const chaptersKilledBoss = bossesKilled;
  const renownBase = cleared
    ? RENOWN_PER_DELVE_CLEAR
    : RENOWN_PER_DELVE_FAILURE + RENOWN_PER_CHAPTER_BOSS * chaptersKilledBoss;
  const renownEarned = Math.floor(renownBase * renownSoulMarkMultiplier(character));

  return {
    outcome: {
      lifeIdx,
      cleared,
      finalRoomIdx,
      finalChapter: roomChapter(finalRoomIdx),
      finalLevel: character.level,
      bossesKilled,
      bossesReached,
      renownEarned,
      goldEarned,
      xpEarned,
      deathCause,
      unlockedAtStart,
    },
    finalCharacter: character,
  };
}

interface ChainResult {
  classId: ClassId;
  mode: Mode;
  lives: LifeOutcome[];
  runCleared: boolean;
  totalRenown: number;
  finalUpgrades: UnlockedUpgrades;
  finalUpgradeRanks: number;
  purchasesLog: string[][];
}

function runChain(
  classId: ClassId,
  mode: Mode,
  maxLives: number,
  carriesMeta: boolean,
  seedBase: number,
): ChainResult {
  const roller = createDiceRoller(seedBase);
  setActiveRoller(seedBase);
  let soul = freshSoul(classId, carriesMeta);
  const lives: LifeOutcome[] = [];
  const purchasesLog: string[][] = [];
  let runCleared = false;
  for (let life = 0; life < maxLives; life++) {
    const { outcome, finalCharacter } = liveOneLife(roller, soul, life, seedBase);
    lives.push(outcome);
    // Renown accumulates regardless of meta-mode for tracking, but only feeds
    // back into upgrades if the soul carries meta.
    soul = {
      ...soul,
      renown: soul.renown + outcome.renownEarned,
      inventory: finalCharacter.inventory,
      quirks: finalCharacter.quirks,
    };
    if (outcome.cleared) {
      runCleared = true;
      break;
    }
    // Between-life purchase phase
    if (carriesMeta) {
      const buy = buyUpgrades(classId, soul.renown, soul.unlockedUpgrades);
      soul = { ...soul, renown: buy.renown, unlockedUpgrades: buy.unlocked };
      purchasesLog.push(buy.purchased);
    } else {
      purchasesLog.push([]);
    }
  }
  const finalUpgradeRanks = Object.values(soul.unlockedUpgrades).reduce((a, b) => a + b, 0);
  return {
    classId,
    mode,
    lives,
    runCleared,
    totalRenown: soul.renown,
    finalUpgrades: soul.unlockedUpgrades,
    finalUpgradeRanks,
    purchasesLog,
  };
}

interface CellAggregate {
  classId: ClassId;
  mode: Mode;
  souls: number;
  // Per-life-position averages (1st = idx 0, 2nd = idx 1, ...). Only counts
  // souls that lived that life (so 2nd-life averages exclude souls that
  // cleared on life 1).
  perLifePosition: Array<{
    position: number;
    n: number;
    avgRooms: number;
    avgChapter: number;
    deathRate: number;
    clearRate: number;
    avgFinalLevel: number;
    avgRenownEarned: number;
    avgUnlockedRanksAtStart: number;
  }>;
  livesUsedMean: number;
  runWinRate: number;
  meanFinalRenown: number;
  meanFinalUpgradeRanks: number;
  // Reach lift: avg rooms of life N+1 vs life N (for souls that had both).
  lifeLift: Array<{ from: number; to: number; lift: number; lifts: number[] }>;
  // First-vs-last average reach for souls that used all lives in the chain.
  firstLifeReach: number;
  lastLifeReach: number;
  // Trivial-clear detection: % of souls that cleared on life >= 3
  lateClearRate: number;
}

function aggregate(classId: ClassId, mode: Mode, chains: ChainResult[]): CellAggregate {
  const totalLives = chains.reduce((s, c) => s + c.lives.length, 0);
  const livesUsedMean = totalLives / Math.max(1, chains.length);
  const runWinRate = chains.filter((c) => c.runCleared).length / Math.max(1, chains.length);
  const meanFinalRenown = chains.reduce((s, c) => s + c.totalRenown, 0) / Math.max(1, chains.length);
  const meanFinalUpgradeRanks =
    chains.reduce((s, c) => s + c.finalUpgradeRanks, 0) / Math.max(1, chains.length);

  const maxLives = chains.reduce((m, c) => Math.max(m, c.lives.length), 0);
  const perLifePosition: CellAggregate['perLifePosition'] = [];
  for (let pos = 0; pos < maxLives; pos++) {
    const lives = chains.flatMap((c) => (c.lives[pos] ? [c.lives[pos]] : []));
    if (lives.length === 0) continue;
    const avg = (sel: (l: LifeOutcome) => number) =>
      lives.reduce((s, l) => s + sel(l), 0) / lives.length;
    perLifePosition.push({
      position: pos + 1,
      n: lives.length,
      avgRooms: avg((l) => l.finalRoomIdx + (l.cleared ? 1 : 0)),
      avgChapter: avg((l) => l.finalChapter),
      deathRate: lives.filter((l) => !l.cleared).length / lives.length,
      clearRate: lives.filter((l) => l.cleared).length / lives.length,
      avgFinalLevel: avg((l) => l.finalLevel),
      avgRenownEarned: avg((l) => l.renownEarned),
      avgUnlockedRanksAtStart: avg((l) => l.unlockedAtStart),
    });
  }

  const lifeLift: CellAggregate['lifeLift'] = [];
  for (let pos = 0; pos < maxLives - 1; pos++) {
    const pairs = chains
      .filter((c) => c.lives[pos] && c.lives[pos + 1])
      .map((c) => ({
        from: c.lives[pos].finalRoomIdx + (c.lives[pos].cleared ? 1 : 0),
        to: c.lives[pos + 1].finalRoomIdx + (c.lives[pos + 1].cleared ? 1 : 0),
      }));
    if (pairs.length === 0) continue;
    const lifts = pairs.map((p) => p.to - p.from);
    const lift = lifts.reduce((s, x) => s + x, 0) / lifts.length;
    lifeLift.push({ from: pos + 1, to: pos + 2, lift, lifts });
  }

  // First-vs-last reach for full-chain souls (used max lives, didn't clear early)
  const fullChainSouls = chains.filter((c) => c.lives.length === maxLives);
  const firstLifeReach =
    fullChainSouls.length === 0
      ? 0
      : fullChainSouls
          .map((c) => c.lives[0].finalRoomIdx + (c.lives[0].cleared ? 1 : 0))
          .reduce((s, x) => s + x, 0) / fullChainSouls.length;
  const lastLifeReach =
    fullChainSouls.length === 0
      ? 0
      : fullChainSouls
          .map((c) => {
            const last = c.lives[c.lives.length - 1];
            return last.finalRoomIdx + (last.cleared ? 1 : 0);
          })
          .reduce((s, x) => s + x, 0) / fullChainSouls.length;

  const lateClearRate =
    chains.filter((c) => c.runCleared && c.lives.length >= 3).length / Math.max(1, chains.length);

  return {
    classId,
    mode,
    souls: chains.length,
    perLifePosition,
    livesUsedMean,
    runWinRate,
    meanFinalRenown,
    meanFinalUpgradeRanks,
    lifeLift,
    firstLifeReach,
    lastLifeReach,
    lateClearRate,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Matrix
// ─────────────────────────────────────────────────────────────────────────

interface CellSpec {
  classId: ClassId;
  mode: Mode;
  maxLives: number;
  carriesMeta: boolean;
}

const CELLS: CellSpec[] = [
  ...(['rogue', 'fighter', 'wizard'] as ClassId[]).flatMap((c): CellSpec[] => [
    { classId: c, mode: '1-life', maxLives: 1, carriesMeta: true },
    { classId: c, mode: '3-life', maxLives: 3, carriesMeta: true },
    { classId: c, mode: '5-life', maxLives: 5, carriesMeta: true },
    // Control: 3 lives, no soul carries (each life independent). Lets us see
    // exactly how much of the 3-life lift is meta vs. just "more attempts".
    { classId: c, mode: '3-life-no-meta', maxLives: 3, carriesMeta: false },
  ]),
];

function runCell(spec: CellSpec): CellAggregate {
  const chains: ChainResult[] = [];
  for (let i = 0; i < RUNS_PER_CELL; i++) {
    const seed =
      (SEED_BASE ^
        (spec.classId.charCodeAt(0) * 7919) ^
        (spec.mode.length * 1009) ^
        (i * 104729)) >>>
      0;
    chains.push(runChain(spec.classId, spec.mode, spec.maxLives, spec.carriesMeta, seed));
  }
  return aggregate(spec.classId, spec.mode, chains);
}

// ─────────────────────────────────────────────────────────────────────────
// Rendering
// ─────────────────────────────────────────────────────────────────────────

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const num = (n: number, d = 2) => n.toFixed(d);

function renderHeadline(aggs: CellAggregate[]): string {
  const lines: string[] = [];
  lines.push('| Class | Mode | Souls | Lives used | Run-win% | Mean final renown | Mean final upgrade ranks | Late-clear% (life 3+) |');
  lines.push('|------|------|------:|----------:|--------:|-----------------:|------------------------:|---------------------:|');
  for (const a of aggs) {
    lines.push(
      `| ${a.classId} | ${a.mode} | ${a.souls} | ${num(a.livesUsedMean)} | ${pct(a.runWinRate)} | ${num(a.meanFinalRenown, 0)} | ${num(a.meanFinalUpgradeRanks)} | ${pct(a.lateClearRate)} |`,
    );
  }
  return lines.join('\n');
}

function renderPerLife(aggs: CellAggregate[]): string {
  const lines: string[] = [];
  for (const a of aggs) {
    lines.push(`### ${a.classId} · ${a.mode}`);
    lines.push('');
    lines.push('| Life | n | Avg rooms | Avg chapter | Death% | Clear% | Avg final lvl | Renown earned | Unlocked ranks at start |');
    lines.push('|----:|--:|---------:|-----------:|------:|------:|-------------:|-------------:|----------------------:|');
    for (const p of a.perLifePosition) {
      lines.push(
        `| ${p.position} | ${p.n} | ${num(p.avgRooms, 1)} / ${TOTAL_ROOMS} | ${num(p.avgChapter)} | ${pct(p.deathRate)} | ${pct(p.clearRate)} | ${num(p.avgFinalLevel)} | ${num(p.avgRenownEarned, 1)} | ${num(p.avgUnlockedRanksAtStart)} |`,
      );
    }
    lines.push('');
    if (a.lifeLift.length > 0) {
      lines.push('**Life-to-life reach lift (avg rooms gained):**');
      for (const l of a.lifeLift) {
        lines.push(`- Life ${l.from} → Life ${l.to}: **${l.lift >= 0 ? '+' : ''}${num(l.lift, 2)}** rooms (n=${l.lifts.length})`);
      }
      lines.push('');
    }
    if (a.firstLifeReach > 0 || a.lastLifeReach > 0) {
      lines.push(`**Full-chain souls — first life: ${num(a.firstLifeReach, 1)} rooms · last life: ${num(a.lastLifeReach, 1)} rooms · delta: ${a.lastLifeReach - a.firstLifeReach >= 0 ? '+' : ''}${num(a.lastLifeReach - a.firstLifeReach, 2)}**`);
      lines.push('');
    }
  }
  return lines.join('\n');
}

function renderComparison(aggs: CellAggregate[]): string {
  // For each class, contrast 1L / 3L / 5L / 3L-no-meta on run-win rate and
  // mean reach per life (averaged across all life positions).
  const byClass: Record<ClassId, CellAggregate[]> = { rogue: [], fighter: [], wizard: [] };
  for (const a of aggs) byClass[a.classId].push(a);
  const lines: string[] = [];
  lines.push('| Class | Mode | Run-win% | Mean reach (rooms) — last life | Lives used | Δ vs 1-life run-win |');
  lines.push('|------|------|--------:|---------------------------:|----------:|-------------------:|');
  for (const classId of Object.keys(byClass) as ClassId[]) {
    const cells = byClass[classId];
    const oneLife = cells.find((c) => c.mode === '1-life');
    const baseline = oneLife?.runWinRate ?? 0;
    for (const c of cells) {
      const lastReach = c.perLifePosition.length > 0
        ? c.perLifePosition[c.perLifePosition.length - 1].avgRooms
        : 0;
      lines.push(
        `| ${classId} | ${c.mode} | ${pct(c.runWinRate)} | ${num(lastReach, 1)} | ${num(c.livesUsedMean)} | ${(c.runWinRate - baseline) * 100 >= 0 ? '+' : ''}${num((c.runWinRate - baseline) * 100, 1)}pp |`,
      );
    }
  }
  return lines.join('\n');
}

function main(): void {
  const tWall0 = Date.now();
  console.log(`Reincarnation-loop sim — ${CELLS.length} cells × ${RUNS_PER_CELL} souls/cell\n`);

  const aggs: CellAggregate[] = [];
  for (const spec of CELLS) {
    const t0 = Date.now();
    const a = runCell(spec);
    aggs.push(a);
    const dt = Date.now() - t0;
    const last = a.perLifePosition[a.perLifePosition.length - 1];
    console.log(
      `${spec.classId.padEnd(8)} ${spec.mode.padEnd(16)} → runWin ${pct(a.runWinRate).padStart(6)}  livesUsed ${num(a.livesUsedMean).padStart(5)}  lastLifeRooms ${num(last?.avgRooms ?? 0, 1).padStart(5)}  finalRen ${num(a.meanFinalRenown, 0).padStart(4)}  ranks ${num(a.meanFinalUpgradeRanks).padStart(4)}  ${dt}ms`,
    );
  }

  const dtTotal = ((Date.now() - tWall0) / 1000).toFixed(1);
  const doc = renderRawDoc(aggs, dtTotal);
  const outPath = resolve(process.cwd(), 'docs/gameplay-quality/reincarnation-loop.raw.md');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, doc, 'utf8');
  console.log(`\nWrote raw output → ${outPath}  (${dtTotal}s wall)`);
}

function renderRawDoc(aggs: CellAggregate[], wallSec: string): string {
  return `# Reincarnation-loop sim — raw output

> Auto-generated by \`scripts/sim-reincarnation-loop.ts\`. Re-run with
> \`RUNS_PER_CELL=${RUNS_PER_CELL} npx tsx scripts/sim-reincarnation-loop.ts\`.
> Curated verdict lives in [\`reincarnation-loop.md\`](./reincarnation-loop.md).

**Cells:** ${aggs.length}.
**Souls / cell:** ${RUNS_PER_CELL}.
**Wall clock:** ${wallSec}s.

## Modes

- \`1-life\`: single L1 descent, no reincarnation, no upgrades.
- \`3-life\`: standard 3-life chain. Soul carries renown / Grove upgrades /
  inventory / quirks (rerolled) between lives. Between each death the sim
  greedily spends renown on a class-tuned priority list.
- \`5-life\`: 5-life chain, same persistence rules.
- \`3-life-no-meta\` (CONTROL): 3 lives, each life is an independent fresh soul.
  No persistence. Isolates "more attempts" from "meta-progression".

## Headline

${renderHeadline(aggs)}

## Mode comparison per class

${renderComparison(aggs)}

## Per-life reach curves

${renderPerLife(aggs)}
`;
}

main();
