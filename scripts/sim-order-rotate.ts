/**
 * "Rotate" strategy sim — does swapping class between lives (Fighter → Rogue →
 * Wizard → repeat) beat committing to one class, when renown + Grove persist
 * across the swap (the hub `selectCharacter` / `carrySoulProgress` feature)?
 *
 * Models the FULL meta loop including the ascension ladder, which the older
 * `sim-reincarnation-loop.ts` does not:
 *  - A soul lives MANY lives. Renown, Grove upgrades, and the unlocked
 *    ascension level persist across lives AND across class swaps (this is the
 *    feature under test — meta is soul/account-level, not tied to the build).
 *  - Each life builds a FRESH L1 character from the chosen class preset (the
 *    rotation order for the "rotate" strategy; a fixed class for the baselines),
 *    applies the soul's permanent Grove upgrades, rolls 2 fresh quirks.
 *  - The soul always pushes its HIGHEST unlocked ascension (the climb-focused
 *    policy). Clearing the chain at that level unlocks the next rung
 *    (Spire-style, mirrors metaStore.unlockNextAscension), capped at A6.
 *  - Combat is scaled by the ascension level (enemy HP + per-hit damage + boss
 *    HP), exactly as createCombat does in-game.
 *  - Renown is settled with the live delveStore formula: depth credit per room
 *    reached + boss credit + clear/fail base, all times the soul-mark
 *    multiplier times the ascension renown multiplier.
 *  - Between lives the soul greedily spends renown on a class-tuned Grove
 *    priority list for the NEXT life's class.
 *
 * NOT modelled (shared with sim-reincarnation-loop.ts, and the reason absolute
 * clear rates read low): merchant shops / spending gold on gear+potions, and a
 * scoring blessing picker (we greedily take the first rolled blessing). Both
 * are survival levers a real player uses, so treat ABSOLUTE clear rates as a
 * floor — the rotate-vs-stay COMPARISON is apples-to-apples and is the point.
 *
 * Run:
 *   SOULS=200 LIVES=40 npx tsx scripts/sim-order-rotate.ts
 *
 * Writes raw matrix → docs/gameplay-quality/order-rotate.raw.md
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
import { getBlessing } from '../src/content/blessings';
import type { BlessingModifiers } from '../src/schemas/blessing';
import { getAscensionLevel, MAX_ASCENSION } from '../src/engine/delve/ascension';
import type { Character } from '../src/types/character';
import type { CombatState } from '../src/types/combat';
import type { RoomSpec } from '../src/types/delve';

type ClassId = 'rogue' | 'fighter' | 'wizard';
type Strategy = 'rotate' | 'fighter-only' | 'rogue-only' | 'wizard-only';

const SOULS = Number(process.env.SOULS ?? 200);
const LIVES = Number(process.env.LIVES ?? 40);
const MAX_TURNS_PER_FIGHT = 200;
const SEED_BASE = 0xc0ffee >>> 0;

// Mirrors delveStore.ts constants.
const RENOWN_PER_DELVE_CLEAR = 50;
const RENOWN_PER_DELVE_FAILURE = 15;
const RENOWN_PER_CHAPTER_BOSS = 10;
const RENOWN_PER_ROOM_REACHED = 1;
const GROVE_UNLOCK_THRESHOLD = 30;

const TOTAL_ROOMS = 50;

// The rotation order under test: Fighter → Rogue → Wizard → repeat.
const ROTATE_ORDER: ClassId[] = ['fighter', 'rogue', 'wizard'];

function classForLife(strategy: Strategy, lifeIdx: number): ClassId {
  switch (strategy) {
    case 'rotate':
      return ROTATE_ORDER[lifeIdx % ROTATE_ORDER.length];
    case 'fighter-only':
      return 'fighter';
    case 'rogue-only':
      return 'rogue';
    case 'wizard-only':
      return 'wizard';
  }
}

// ─── Grove purchase priorities (copied from sim-reincarnation-loop.ts) ───────
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

const SHARED_IDS = new Set(SHARED_PRIORITY.map((u) => u.id));

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

/** Greedy "spend renown" between lives for the upcoming class. */
function buyUpgrades(
  classId: ClassId,
  renown: number,
  unlocked: UnlockedUpgrades,
): { renown: number; unlocked: UnlockedUpgrades; spent: number } {
  let r = renown;
  const u: UnlockedUpgrades = { ...unlocked };
  let spent = 0;
  if (r < GROVE_UNLOCK_THRESHOLD) return { renown: r, unlocked: u, spent };
  const list = priorityFor(classId);
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
        spent += cost;
        u[id] = nextRank;
        bought = true;
        break;
      }
    }
  }
  return { renown: r, unlocked: u, spent };
}

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
  inventory: Character['inventory'];
  ascensionUnlocked: number;
}

function freshSoul(): SoulState {
  return { renown: 0, unlockedUpgrades: {}, inventory: [], ascensionUnlocked: 0 };
}

/** Build the L1 character that descends this life, from the chosen class preset. */
function descend(roller: DiceRoller, classId: ClassId, soul: SoulState): Character {
  let c = characterAtLevel(classId, 1);
  c = applyPermanentUpgrades(c, soul.unlockedUpgrades);
  c = applyDelveStartUpgrades(c, soul.unlockedUpgrades);
  if (soul.inventory.length > c.inventory.length) {
    c = { ...c, inventory: [...soul.inventory] };
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

/**
 * Survival-weighted blessing value. A competent player at a shrine takes the
 * card that keeps them alive deepest — flat AC, temp-HP-per-room, regen,
 * conditional AC, free death-saves — with offense as a tiebreaker (a faster
 * kill is also fewer incoming hits). This is the "greedy temp-HP pick" the
 * older sim's comment claimed but never implemented; here it is, honestly.
 */
function blessingSurvivalScore(m: BlessingModifiers): number {
  let s = 0;
  s += (m.acBonus ?? 0) * 12;
  s += (m.extraTempHpPerRoom ?? 0) * 3;
  s += (m.tempHpPerDelveLevel ?? 0) * 3;
  s += (m.tempHpPerBaneQuirk ?? 0) * 2;
  s += (m.bossTempHp ?? 0) * 0.6;
  s += (m.regenPerCombat ?? 0) * 2.5;
  s += (m.regenPctPerCombat ?? 0) * 0.4;
  s += (m.extraStabiliseCharges ?? 0) * 4;
  s += (m.acBonusWhileFull ?? 0) * 5;
  s += (m.acBonusWhileBloodied ?? 0) * 7;
  s += (m.acBonusPerBaneQuirk ?? 0) * 3;
  // Offense — small positive weight (faster clears reduce attrition).
  s += (m.damageBonus ?? 0) * 1.5;
  s += (m.firstAttackDamage ?? 0) * 0.8;
  s += (m.firstAttackBonus ?? 0) * 0.6;
  s += (m.firstAttackAdvantage ? 1 : 0) * 1.2;
  s += (m.critRangeBonus ?? 0) * 1;
  s += (m.rerollMissesPerEncounter ?? 0) * 1;
  s += (m.critRangeBonusWhileFull ?? 0) * 0.8;
  s += (m.critRangeBonusWhileBloodied ?? 0) * 0.8;
  return s;
}

/** Pick the highest survival-value blessing from a class-filtered, dedup'd roll. */
function pickBlessing(roller: DiceRoller, character: Character): string | undefined {
  const options = rollBlessingOptions(
    roller,
    3 + (character.shrineOptionBonus ?? 0),
    character.classId,
    character.blessings,
  );
  let best: string | undefined;
  let bestScore = -Infinity;
  for (const id of options) {
    let b;
    try {
      b = getBlessing(id);
    } catch {
      continue;
    }
    const score = blessingSurvivalScore(b.modifiers ?? {});
    if (score > bestScore) {
      bestScore = score;
      best = id;
    }
  }
  return best;
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

interface LifeRec {
  life: number;
  classId: ClassId;
  ascension: number;
  cleared: boolean;
  finalRoomIdx: number;
  finalChapter: number;
  bossesKilled: number;
  finalLevel: number;
  renownEarned: number;
  ranksAtStart: number;
}

function liveOneLife(
  roller: DiceRoller,
  classId: ClassId,
  soul: SoulState,
  lifeIdx: number,
  seedBase: number,
): { rec: LifeRec; finalInventory: Character['inventory'] } {
  const ascension = soul.ascensionUnlocked;
  let character = descend(roller, classId, soul);
  const delveSeed = ((seedBase + lifeIdx * 7919) ^ (classId.charCodeAt(0) * 1009) ^ (ascension * 33)) >>> 0;
  const delve = createGodwakeDelve({ seed: delveSeed, ascension });

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
      const pick = pickBlessing(roller, character);
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
  // Faithful to delveStore.finishDelve renown settlement.
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
    rec: {
      life: lifeIdx,
      classId,
      ascension,
      cleared,
      finalRoomIdx,
      finalChapter: roomChapter(finalRoomIdx),
      bossesKilled,
      finalLevel: character.level,
      renownEarned,
      ranksAtStart,
    },
    finalInventory: character.inventory,
  };
}

interface SoulRec {
  strategy: Strategy;
  lives: LifeRec[];
  finalRenown: number;
  totalRenownEarned: number;
  renownSpent: number;
  totalClears: number;
  finalAscension: number;
  finalUpgrades: UnlockedUpgrades;
  finalRanks: number;
  firstClearLife: number | null;
}

function runSoul(strategy: Strategy, lives: number, seedBase: number): SoulRec {
  const roller = createDiceRoller(seedBase);
  setActiveRoller(seedBase);
  let soul = freshSoul();
  const lifeRecs: LifeRec[] = [];
  let totalRenownEarned = 0;
  let renownSpent = 0;
  let totalClears = 0;
  let firstClearLife: number | null = null;

  for (let life = 0; life < lives; life++) {
    const classId = classForLife(strategy, life);
    const { rec } = liveOneLife(roller, classId, soul, life, seedBase);
    lifeRecs.push(rec);
    soul = { ...soul, renown: soul.renown + rec.renownEarned };
    totalRenownEarned += rec.renownEarned;

    if (rec.cleared) {
      totalClears += 1;
      if (firstClearLife === null) firstClearLife = life;
      // Spire-style: clearing at the highest unlocked rung opens the next.
      if (rec.ascension >= soul.ascensionUnlocked && soul.ascensionUnlocked < MAX_ASCENSION) {
        soul = { ...soul, ascensionUnlocked: soul.ascensionUnlocked + 1 };
      }
    }

    // Buy Grove upgrades for the NEXT life's class.
    const nextClass = classForLife(strategy, life + 1);
    const buy = buyUpgrades(nextClass, soul.renown, soul.unlockedUpgrades);
    soul = { ...soul, renown: buy.renown, unlockedUpgrades: buy.unlocked };
    renownSpent += buy.spent;
  }

  const finalRanks = Object.values(soul.unlockedUpgrades).reduce((a, b) => a + b, 0);
  return {
    strategy,
    lives: lifeRecs,
    finalRenown: soul.renown,
    totalRenownEarned,
    renownSpent,
    totalClears,
    finalAscension: soul.ascensionUnlocked,
    finalUpgrades: soul.unlockedUpgrades,
    finalRanks,
    firstClearLife,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Aggregation
// ─────────────────────────────────────────────────────────────────────────

interface Aggregate {
  strategy: Strategy;
  souls: number;
  lives: number;
  meanFinalRenown: number;
  meanTotalRenownEarned: number;
  meanRenownSpent: number;
  meanClears: number;
  everClearedRate: number;
  meanFirstClearLife: number | null;
  meanFinalAscension: number;
  maxFinalAscension: number;
  ascensionDist: number[]; // index = level, value = #souls whose finalAscension >= level
  meanFinalRanks: number;
  meanReach: number; // mean rooms reached across all lives
  // Clear rate per ascension level (attempts vs clears at that level, all souls).
  perAscension: Array<{ level: number; attempts: number; clears: number; clearRate: number; meanReach: number }>;
  // Death chapter histogram (non-clear lives).
  deathChapter: Record<number, number>;
  // Grove spend split.
  sharedRanks: number;
  classRanks: number;
  // Rotate-only: per-class clear breakdown.
  perClass?: Array<{ classId: ClassId; attempts: number; clears: number; clearRate: number; meanReach: number }>;
  // Progression over life windows: mean ascension being played + clear rate +
  // mean reach within each block of lives. Shows whether later lives climb.
  windows: Array<{ from: number; to: number; meanAscension: number; clearRate: number; meanReach: number; meanRanks: number }>;
}

const WINDOW = 20;

function aggregate(strategy: Strategy, souls: SoulRec[]): Aggregate {
  const n = souls.length;
  const mean = (sel: (s: SoulRec) => number) => souls.reduce((a, s) => a + sel(s), 0) / Math.max(1, n);

  const everCleared = souls.filter((s) => s.totalClears > 0);
  const meanFirstClearLife =
    everCleared.length === 0
      ? null
      : everCleared.reduce((a, s) => a + (s.firstClearLife ?? 0), 0) / everCleared.length;

  const ascensionDist: number[] = [];
  for (let lvl = 0; lvl <= MAX_ASCENSION; lvl++) {
    ascensionDist[lvl] = souls.filter((s) => s.finalAscension >= lvl).length;
  }

  const allLives = souls.flatMap((s) => s.lives);
  const meanReach = allLives.reduce((a, l) => a + l.finalRoomIdx + (l.cleared ? 1 : 0), 0) / Math.max(1, allLives.length);

  const perAscension: Aggregate['perAscension'] = [];
  for (let lvl = 0; lvl <= MAX_ASCENSION; lvl++) {
    const at = allLives.filter((l) => l.ascension === lvl);
    if (at.length === 0) continue;
    const clears = at.filter((l) => l.cleared).length;
    perAscension.push({
      level: lvl,
      attempts: at.length,
      clears,
      clearRate: clears / at.length,
      meanReach: at.reduce((a, l) => a + l.finalRoomIdx + (l.cleared ? 1 : 0), 0) / at.length,
    });
  }

  const deathChapter: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const l of allLives) {
    if (!l.cleared) deathChapter[l.finalChapter] += 1;
  }

  let sharedRanks = 0;
  let classRanks = 0;
  for (const s of souls) {
    for (const [id, rank] of Object.entries(s.finalUpgrades)) {
      if (SHARED_IDS.has(id)) sharedRanks += rank;
      else classRanks += rank;
    }
  }
  sharedRanks /= Math.max(1, n);
  classRanks /= Math.max(1, n);

  const windows: Aggregate['windows'] = [];
  for (let a = 0; a < LIVES; a += WINDOW) {
    const b = Math.min(LIVES, a + WINDOW);
    const block = allLives.filter((l) => l.life >= a && l.life < b);
    if (block.length === 0) continue;
    windows.push({
      from: a + 1,
      to: b,
      meanAscension: block.reduce((x, l) => x + l.ascension, 0) / block.length,
      clearRate: block.filter((l) => l.cleared).length / block.length,
      meanReach: block.reduce((x, l) => x + l.finalRoomIdx + (l.cleared ? 1 : 0), 0) / block.length,
      meanRanks: block.reduce((x, l) => x + l.ranksAtStart, 0) / block.length,
    });
  }

  let perClass: Aggregate['perClass'];
  if (strategy === 'rotate') {
    perClass = ROTATE_ORDER.map((classId) => {
      const at = allLives.filter((l) => l.classId === classId);
      const clears = at.filter((l) => l.cleared).length;
      return {
        classId,
        attempts: at.length,
        clears,
        clearRate: at.length ? clears / at.length : 0,
        meanReach: at.length ? at.reduce((a, l) => a + l.finalRoomIdx + (l.cleared ? 1 : 0), 0) / at.length : 0,
      };
    });
  }

  return {
    strategy,
    souls: n,
    lives: LIVES,
    meanFinalRenown: mean((s) => s.finalRenown),
    meanTotalRenownEarned: mean((s) => s.totalRenownEarned),
    meanRenownSpent: mean((s) => s.renownSpent),
    meanClears: mean((s) => s.totalClears),
    everClearedRate: everCleared.length / Math.max(1, n),
    meanFirstClearLife,
    meanFinalAscension: mean((s) => s.finalAscension),
    maxFinalAscension: souls.reduce((m, s) => Math.max(m, s.finalAscension), 0),
    ascensionDist,
    meanFinalRanks: mean((s) => s.finalRanks),
    meanReach,
    perAscension,
    deathChapter,
    sharedRanks,
    classRanks,
    perClass,
    windows,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Run + render
// ─────────────────────────────────────────────────────────────────────────

const STRATEGIES: Strategy[] = ['rotate', 'fighter-only', 'rogue-only', 'wizard-only'];

function runStrategy(strategy: Strategy): Aggregate {
  const souls: SoulRec[] = [];
  for (let i = 0; i < SOULS; i++) {
    const seed = (SEED_BASE ^ (strategy.length * 7919) ^ (i * 104729)) >>> 0;
    souls.push(runSoul(strategy, LIVES, seed));
  }
  return aggregate(strategy, souls);
}

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const num = (x: number, d = 2) => x.toFixed(d);

function renderHeadline(aggs: Aggregate[]): string {
  const L: string[] = [];
  L.push('| Strategy | Souls×Lives | Mean clears/soul | Ever-cleared% | Mean final ascension | Max asc | Mean final renown | Mean Grove ranks | Mean reach (rooms) |');
  L.push('|------|------|---:|---:|---:|---:|---:|---:|---:|');
  for (const a of aggs) {
    L.push(
      `| ${a.strategy} | ${a.souls}×${a.lives} | ${num(a.meanClears)} | ${pct(a.everClearedRate)} | ${num(a.meanFinalAscension)} | ${a.maxFinalAscension} | ${num(a.meanFinalRenown, 0)} | ${num(a.meanFinalRanks, 1)} | ${num(a.meanReach, 1)} / ${TOTAL_ROOMS} |`,
    );
  }
  return L.join('\n');
}

function renderAscensionDist(aggs: Aggregate[]): string {
  const L: string[] = [];
  L.push('Share of souls that reached at least each ascension level (by end of life budget):');
  L.push('');
  L.push('| Strategy | A1+ | A2+ | A3+ | A4+ | A5+ | A6 |');
  L.push('|------|---:|---:|---:|---:|---:|---:|');
  for (const a of aggs) {
    const d = a.ascensionDist;
    const r = (lvl: number) => pct((d[lvl] ?? 0) / Math.max(1, a.souls));
    L.push(`| ${a.strategy} | ${r(1)} | ${r(2)} | ${r(3)} | ${r(4)} | ${r(5)} | ${r(6)} |`);
  }
  return L.join('\n');
}

function renderPerAscension(aggs: Aggregate[]): string {
  const L: string[] = [];
  for (const a of aggs) {
    L.push(`### ${a.strategy} — clear rate per ascension level`);
    L.push('');
    L.push('| Asc | Attempts | Clears | Clear% | Mean reach |');
    L.push('|---:|---:|---:|---:|---:|');
    for (const p of a.perAscension) {
      L.push(`| ${p.level} | ${p.attempts} | ${p.clears} | ${pct(p.clearRate)} | ${num(p.meanReach, 1)} |`);
    }
    L.push('');
  }
  return L.join('\n');
}

function renderDeath(aggs: Aggregate[]): string {
  const L: string[] = [];
  L.push('Death distribution by chapter (share of all non-clear lives):');
  L.push('');
  L.push('| Strategy | Ch1 | Ch2 | Ch3 | Ch4 | First-clear life (mean) |');
  L.push('|------|---:|---:|---:|---:|---:|');
  for (const a of aggs) {
    const tot = Object.values(a.deathChapter).reduce((x, y) => x + y, 0);
    const r = (c: number) => (tot ? pct(a.deathChapter[c] / tot) : '—');
    L.push(`| ${a.strategy} | ${r(1)} | ${r(2)} | ${r(3)} | ${r(4)} | ${a.meanFirstClearLife === null ? '—' : num(a.meanFirstClearLife, 1)} |`);
  }
  return L.join('\n');
}

function renderGrove(aggs: Aggregate[]): string {
  const L: string[] = [];
  L.push('Grove investment split — shared (HP/AC/potions, helps every class) vs class-specific (idle when off-class):');
  L.push('');
  L.push('| Strategy | Mean shared ranks | Mean class-specific ranks | Mean renown earned | Mean renown spent |');
  L.push('|------|---:|---:|---:|---:|');
  for (const a of aggs) {
    L.push(`| ${a.strategy} | ${num(a.sharedRanks, 1)} | ${num(a.classRanks, 1)} | ${num(a.meanTotalRenownEarned, 0)} | ${num(a.meanRenownSpent, 0)} |`);
  }
  return L.join('\n');
}

function renderProgression(aggs: Aggregate[]): string {
  const L: string[] = [];
  L.push('Mean ascension being played / clear% / mean reach per block of lives — the climb curve as Grove compounds:');
  L.push('');
  for (const a of aggs) {
    L.push(`### ${a.strategy}`);
    L.push('');
    L.push('| Lives | Mean asc played | Clear% | Mean reach | Mean Grove ranks at start |');
    L.push('|------|---:|---:|---:|---:|');
    for (const w of a.windows) {
      L.push(`| ${w.from}–${w.to} | ${num(w.meanAscension)} | ${pct(w.clearRate)} | ${num(w.meanReach, 1)} | ${num(w.meanRanks, 1)} |`);
    }
    L.push('');
  }
  return L.join('\n');
}

function renderRotateClass(rotate: Aggregate): string {
  if (!rotate.perClass) return '';
  const L: string[] = [];
  L.push('Within the rotate chain — which class actually carries the clears:');
  L.push('');
  L.push('| Class | Lives (attempts) | Clears | Clear% | Mean reach |');
  L.push('|------|---:|---:|---:|---:|');
  for (const p of rotate.perClass) {
    L.push(`| ${p.classId} | ${p.attempts} | ${p.clears} | ${pct(p.clearRate)} | ${num(p.meanReach, 1)} |`);
  }
  return L.join('\n');
}

function main(): void {
  const t0 = Date.now();
  console.log(`Order-rotate sim — ${STRATEGIES.length} strategies × ${SOULS} souls × ${LIVES} lives\n`);
  const aggs: Aggregate[] = [];
  for (const strat of STRATEGIES) {
    const ts = Date.now();
    const a = runStrategy(strat);
    aggs.push(a);
    console.log(
      `${strat.padEnd(13)} → clears/soul ${num(a.meanClears).padStart(5)}  everCleared ${pct(a.everClearedRate).padStart(6)}  meanAsc ${num(a.meanFinalAscension).padStart(4)}  maxAsc ${a.maxFinalAscension}  finalRen ${num(a.meanFinalRenown, 0).padStart(6)}  ranks ${num(a.meanFinalRanks, 1).padStart(4)}  reach ${num(a.meanReach, 1).padStart(4)}  ${Date.now() - ts}ms`,
    );
  }
  const wall = ((Date.now() - t0) / 1000).toFixed(1);
  const doc = renderDoc(aggs, wall);
  const outPath = resolve(process.cwd(), 'docs/gameplay-quality/order-rotate.raw.md');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, doc, 'utf8');
  console.log(`\nWrote raw output → ${outPath}  (${wall}s wall)`);
}

function renderDoc(aggs: Aggregate[], wall: string): string {
  const rotate = aggs.find((a) => a.strategy === 'rotate')!;
  return `# Order-rotate sim — raw output

> Auto-generated by \`scripts/sim-order-rotate.ts\`. Re-run with
> \`SOULS=${SOULS} LIVES=${LIVES} npx tsx scripts/sim-order-rotate.ts\`.

**Strategies:** ${aggs.length}.  **Souls/strategy:** ${SOULS}.  **Lives/soul:** ${LIVES}.  **Wall:** ${wall}s.

The "rotate" soul swaps class every life (Fighter → Rogue → Wizard → repeat),
carrying renown + Grove + unlocked ascension across the swap. The three
\`*-only\` strategies are single-class baselines under the identical meta loop.
Every soul pushes its highest unlocked ascension each life; a clear at that
level opens the next rung (capped A${MAX_ASCENSION}). Between lives the soul
greedily buys Grove upgrades for the NEXT life's class.

> Caveat: shops/gold-spend and a scoring blessing picker are NOT modelled, so
> absolute clear rates are a FLOOR. The rotate-vs-stay comparison is
> apples-to-apples — that is the deliverable.

## Headline

${renderHeadline(aggs)}

## Ascension ladder reached

${renderAscensionDist(aggs)}

## Clear rate per ascension level

${renderPerAscension(aggs)}

## Death distribution

${renderDeath(aggs)}

## Progression over lives

${renderProgression(aggs)}

## Grove / meta build

${renderGrove(aggs)}

## Rotate internals

${renderRotateClass(rotate)}
`;
}

main();
