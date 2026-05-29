/**
 * Per-character fairness sim. Runs each of the THREE fixed-stat selectable
 * characters — Sir Brick (Fighter), Maelis Vell (Rogue), Veyra Ash (Wizard) —
 * through many reincarnation chains under IDENTICAL methodology, then compares
 * survivability + meta-progression speed.
 *
 * Methodology held constant across classes so the comparison is fair:
 *  - SAME seed set. Chain index `i` uses the same chain seed for all three
 *    classes; the delve layout for (chain, life) is class-INDEPENDENT, so every
 *    class walks the same 50-room composition at the same life position.
 *  - SAME AI (`takeTurn` from encounterStress) and SAME greedy Grove-spend
 *    policy (class-tuned priority list, buys the highest affordable item each
 *    life, respecting the ascension unlock gate).
 *  - SAME ascension policy: greedy climb. The soul always descends at its
 *    highest-unlocked ascension; clearing the frontier unlocks the next rung.
 *
 * Faithful to the live game (main @ acb1003):
 *  - Characters are built from the real class `preset` via
 *    `buildPlayerCharacter(presetCreationInput(classId))` — fixed stats, real
 *    race, real starting kit. NOT the standard-array archetypes.
 *  - DEPTH-SCALED renown: `(clear?50:15) + 10*bossesKilled + 1*roomsReached`,
 *    × soul-mark × ascension renownMult (mirrors delveStore.finishDelve).
 *  - Ascension is threaded into combat (enemy HP / damage / boss HP) AND payout.
 *  - `simulateLevelUp` (NOT applyLevelUp) so the wizard actually learns its
 *    leveled spells on the way up — applyLevelUp silently skips spell-learning.
 *
 * The full meta loop runs PAST clears: a clear reincarnates the soul too, so a
 * chain is a fixed run of LIVES_PER_CHAIN lives and we watch the soul climb the
 * ascension ladder and saturate the Grove over its lifetime.
 *
 * Known, deliberately-shared limitations (fair because identical across classes):
 *  - No merchant shopping: gold accumulates but is not spent (mirrors the
 *    existing reincarnation-loop harness). Wizards never buy mage-armor scrolls
 *    etc.; martials never buy better weapons. Same constraint for all three.
 *  - Shrine pick is greedy-first-option; camps are a long rest (no boon picker).
 *
 * Run:
 *   CHAINS_PER_CLASS=40 LIVES_PER_CHAIN=25 npx tsx scripts/sim-per-character.ts
 *
 * Writes the raw matrix to docs/gameplay-quality/per-character-sim.raw.md.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

import { createDiceRoller, setActiveRoller, type DiceRoller } from '../src/engine/dice';
import { getMonster } from '../src/content/monsters';
import { getClass } from '../src/content/classes';
import { getRace } from '../src/content/races';
import { simulateLevelUp, xpForLevel, MAX_LEVEL } from '../src/engine/character/leveling';
import { shortRestHeal, longRest, withResetActionEconomy } from '../src/engine/character/actions';
import { effectiveAbilityScores } from '../src/engine/character/derived';
import { abilityModifier } from '../src/types/abilities';
import { classStartingResources } from '../src/engine/character/initialize';
import { buildPlayerCharacter, presetCreationInput } from '../src/engine/character/defaultCharacter';
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
import { rollQuirks, renownSoulMarkMultiplier, characterQuirkMods } from '../src/engine/character/quirks';
import { rollBlessingOptions } from '../src/engine/character/blessings';
import { getAscensionLevel, MAX_ASCENSION } from '../src/engine/delve/ascension';
import type { Character } from '../src/types/character';
import type { CombatState } from '../src/types/combat';
import type { RoomSpec } from '../src/types/delve';

type ClassId = 'fighter' | 'rogue' | 'wizard';

const CHAINS_PER_CLASS = Number(process.env.CHAINS_PER_CLASS ?? 40);
const LIVES_PER_CHAIN = Number(process.env.LIVES_PER_CHAIN ?? 25);
const MAX_TURNS_PER_FIGHT = 200;
const SEED_BASE = 0xc0ffee >>> 0;

// Mirrors delveStore.ts renown constants (depth-scaled model).
const RENOWN_PER_DELVE_CLEAR = 50;
const RENOWN_PER_DELVE_FAILURE = 15;
const RENOWN_PER_CHAPTER_BOSS = 10;
const RENOWN_PER_ROOM_REACHED = 1;
const GROVE_UNLOCK_THRESHOLD = 30;

const TOTAL_ROOMS = 50;

const CHAR_NAME: Record<ClassId, string> = {
  fighter: 'Sir Brick',
  rogue: 'Maelis Vell',
  wizard: 'Veyra Ash',
};

// ─── Grove purchase priorities ──────────────────────────────────────────────
// Greedy buy between lives: re-evaluate and buy the affordable upgrade highest
// in the (interleaved) list. Defensive scaling first (HP/AC), then the
// class-defining damage line, then the deeper ascension-gated tiers.

const SHARED_PRIORITY: { id: string; maxAtRank: number }[] = [
  { id: 'pilgrims-boots', maxAtRank: 1 },        // +2 HP, flat 25 — cheap opener
  { id: 'mantle-of-the-wakened', maxAtRank: 5 }, // +5 HP/rank
  { id: 'mielikki-cache', maxAtRank: 4 },        // +N potions/delve
  { id: 'cloak-of-the-grove', maxAtRank: 3 },    // +1 AC/rank
  { id: 'iron-will', maxAtRank: 1 },             // +5 HP one-shot
  { id: 'wellspring-depths', maxAtRank: 3 },     // +10 HP/rank (ascension>=1)
  { id: 'coin-in-pocket', maxAtRank: 3 },        // start gold + ch-boss gold
  { id: 'soul-marrow', maxAtRank: 3 },           // +renown/bane
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
    { id: 'crown-of-the-returned', maxAtRank: 2 }, // ascension>=3
  ],
};

function priorityFor(classId: ClassId): { id: string; maxAtRank: number }[] {
  const cls = CLASS_PRIORITY[classId];
  const out: { id: string; maxAtRank: number }[] = [];
  out.push(SHARED_PRIORITY[0]); // pilgrims-boots first
  const maxLen = Math.max(cls.length, SHARED_PRIORITY.length - 1);
  for (let i = 0; i < maxLen; i++) {
    if (i < cls.length) out.push(cls[i]);
    if (i + 1 < SHARED_PRIORITY.length) out.push(SHARED_PRIORITY[i + 1]);
  }
  return out;
}

/** Greedy "spend renown" between lives, respecting the ascension unlock gate. */
function buyUpgrades(
  classId: ClassId,
  renown: number,
  unlocked: UnlockedUpgrades,
  ascensionUnlocked: number,
): { renown: number; unlocked: UnlockedUpgrades; purchased: string[] } {
  let r = renown;
  const u: UnlockedUpgrades = { ...unlocked };
  const purchased: string[] = [];
  if (r < GROVE_UNLOCK_THRESHOLD && Object.keys(u).length === 0) {
    // Grove not yet revealed and nothing owned: still gated below threshold.
    return { renown: r, unlocked: u, purchased };
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
      const requiredAscension = up.unlock?.ascension ?? 0;
      if (ascensionUnlocked < requiredAscension) continue; // gated
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
        break;
      }
    }
  }
  return { renown: r, unlocked: u, purchased };
}

// ─── Faithful descent (mirrors delveStore.startDelve + reincarnateSoul) ──────

function level1HpMax(ch: Character): number {
  const cls = getClass(ch.classId);
  const conMod = abilityModifier(effectiveAbilityScores(ch).con);
  const raceBonusHp = getRace(ch.raceId).bonusHpPerLevel ?? 0;
  const classBonusHp = ch.classId === 'wizard' ? 1 : 0;
  const permanentHp = ch.permanentBonuses?.hp ?? 0;
  return cls.hitDie + conMod + raceBonusHp + classBonusHp + permanentHp;
}

function applyDelveStartQuirks(c: Character): Character {
  const mods = characterQuirkMods(c);
  return {
    ...c,
    goldInPocket: c.goldInPocket + (mods.startBonusGold ?? 0),
    delveBudgets: {
      quirkRerollMissesRemaining: mods.rerollMissesPerDelve ?? 0,
      stabilisesUsed: 0,
    },
  };
}

interface SoulState {
  classId: ClassId;
  renown: number;
  unlockedUpgrades: UnlockedUpgrades;
  ascensionUnlocked: number;
}

/** Build the body that descends for `lifeIdx`. Mirrors startDelve exactly. */
function descend(roller: DiceRoller, soul: SoulState, lifeIdx: number): Character {
  // 1) Fresh vessel from the class preset (fixed stats, real race + kit).
  const base = buildPlayerCharacter(presetCreationInput(soul.classId));
  // 2) Bake every owned permanent-upgrade rank (delta-applied, as at purchase).
  let c = base;
  for (const [id, rank] of Object.entries(soul.unlockedUpgrades)) {
    const up = findUpgrade(id);
    if (!up || up.kind !== 'permanent') continue;
    for (let r = 1; r <= rank; r++) c = applyPermanentUpgrade(c, id, r);
  }
  // 3) Quirks: a soul's FIRST life wears none ("the soul earns no marks before
  //    its first death"); every life after the wheel turns rolls two.
  const quirks = lifeIdx === 0 ? [] : rollQuirks(roller, 2);
  c = { ...c, quirks };
  // 4) startDelve transform: level/xp/gold/hp/resources reset to baseline.
  const asc = getAscensionLevel(soul.ascensionUnlocked);
  const startingGold = Math.floor((c.permanentBonuses?.startingGold ?? 0) * asc.startingGoldMult);
  const baseHpMax = level1HpMax(c);
  const cls = getClass(c.classId);
  let fresh: Character = {
    ...c,
    level: 1,
    xp: 0,
    goldInPocket: startingGold,
    hp: { current: baseHpMax, max: baseHpMax, temp: 0 },
    hitDice: { current: 1, max: 1, die: cls.hitDie },
    resources: classStartingResources(c.classId),
    blessings: [],
    campBoons: [],
    delveAttackBonus: 0,
    delveSpellAttackBonus: 0,
    nextAttackAdvantage: false,
    poisonImmuneEncounter: false,
    conditions: [],
    bossIntel: {},
    boldApproachBosses: [],
  };
  fresh = applyDelveStartUpgrades(withResetActionEconomy(fresh), soul.unlockedUpgrades);
  fresh = applyDelveStartQuirks(fresh);
  return fresh;
}

// ─── One combat room, ascension-scaled ───────────────────────────────────────

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
  // No monsters (e.g. a stray non-combat room routed here) → free pass.
  if (monsterRefs.length === 0) return { character: characterIn, victory: true };

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

function roomChapter(idx: number): number {
  if (idx <= 11) return 1;
  if (idx <= 24) return 2;
  if (idx <= 37) return 3;
  return 4;
}

interface LifeOutcome {
  lifeIdx: number;
  cleared: boolean;
  roomsReached: number; // == currentRoomIdx at run end
  chapter: number;
  finalLevel: number;
  bossesKilled: number;
  renownEarned: number;
  ascensionPlayed: number;
  upgradeRanksAtStart: number;
}

/** Live one descent; settle renown the way finishDelve does. */
function runLife(
  roller: DiceRoller,
  soul: SoulState,
  lifeIdx: number,
  delveSeed: number,
): LifeOutcome {
  let character = descend(roller, soul, lifeIdx);
  const delve = createGodwakeDelve({ seed: delveSeed, ascension: soul.ascensionUnlocked });
  const upgradeRanksAtStart = Object.values(soul.unlockedUpgrades).reduce((a, b) => a + b, 0);

  let bossesKilled = 0;
  let currentRoomIdx = 0;
  let died = false;

  for (let i = 0; i < delve.rooms.length; i++) {
    currentRoomIdx = i;
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
      const options = rollBlessingOptions(roller, 3 + (character.shrineOptionBonus ?? 0), character.classId);
      const pick = options[0];
      if (pick && !character.blessings.includes(pick)) {
        character = { ...character, blessings: [...character.blessings, pick] };
      }
      continue;
    }
    if (room.kind === 'event') continue;

    const isBoss = room.kind === 'boss';
    const result = runCombatRoom(roller, character, room, soul.ascensionUnlocked, isBoss);
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
        character = simulateLevelUp(character);
      }
    }
  }

  const cleared = !died;
  const depthRenown = RENOWN_PER_ROOM_REACHED * currentRoomIdx;
  const renownBase =
    (cleared ? RENOWN_PER_DELVE_CLEAR : RENOWN_PER_DELVE_FAILURE) +
    RENOWN_PER_CHAPTER_BOSS * bossesKilled +
    depthRenown;
  const ascensionMult = getAscensionLevel(soul.ascensionUnlocked).renownMult;
  const renownEarned = Math.floor(renownBase * renownSoulMarkMultiplier(character) * ascensionMult);

  return {
    lifeIdx,
    cleared,
    roomsReached: currentRoomIdx,
    chapter: roomChapter(currentRoomIdx),
    finalLevel: character.level,
    bossesKilled,
    renownEarned,
    ascensionPlayed: soul.ascensionUnlocked,
    upgradeRanksAtStart,
  };
}

interface ChainResult {
  classId: ClassId;
  lives: LifeOutcome[];
  finalRenown: number;
  totalRenownEarned: number;
  finalUpgradeRanks: number;
  finalAscensionUnlocked: number;
  firstClearLife: number | null; // 1-based life index of first clear
}

function runChain(classId: ClassId, chainSeed: number): ChainResult {
  const roller = createDiceRoller(chainSeed);
  setActiveRoller(chainSeed);
  let soul: SoulState = { classId, renown: 0, unlockedUpgrades: {}, ascensionUnlocked: 0 };
  const lives: LifeOutcome[] = [];
  let totalRenownEarned = 0;
  let firstClearLife: number | null = null;

  for (let life = 0; life < LIVES_PER_CHAIN; life++) {
    // Delve layout is class-INDEPENDENT — same (chain, life) → same rooms for
    // all three classes. Ascension is folded into combat scaling, not layout.
    const delveSeed = (chainSeed + life * 7919) >>> 0;
    const ascensionBefore = soul.ascensionUnlocked;
    const outcome = runLife(roller, soul, life, delveSeed);
    lives.push(outcome);
    totalRenownEarned += outcome.renownEarned;
    soul = { ...soul, renown: soul.renown + outcome.renownEarned };

    if (outcome.cleared) {
      if (firstClearLife === null) firstClearLife = life + 1;
      // Clearing the frontier opens the next rung (Spire-style).
      if (ascensionBefore >= soul.ascensionUnlocked && soul.ascensionUnlocked < MAX_ASCENSION) {
        soul = { ...soul, ascensionUnlocked: soul.ascensionUnlocked + 1 };
      }
    }

    // Spend renown greedily between every life (death AND clear reincarnate).
    const buy = buyUpgrades(classId, soul.renown, soul.unlockedUpgrades, soul.ascensionUnlocked);
    soul = { ...soul, renown: buy.renown, unlockedUpgrades: buy.unlocked };
  }

  const finalUpgradeRanks = Object.values(soul.unlockedUpgrades).reduce((a, b) => a + b, 0);
  return {
    classId,
    lives,
    finalRenown: soul.renown,
    totalRenownEarned,
    finalUpgradeRanks,
    finalAscensionUnlocked: soul.ascensionUnlocked,
    firstClearLife,
  };
}

// ─── Aggregation ──────────────────────────────────────────────────────────

interface ClassAggregate {
  classId: ClassId;
  chains: number;
  totalLives: number;
  deathRate: number;
  clearRate: number;
  bossFootholdRate: number; // fraction of lives that felled >=1 chapter boss
  avgBossesKilled: number;
  avgRoomsReached: number;
  avgChapter: number;
  avgFinalLevel: number;
  avgRenownPerLife: number;
  meanCumulativeRenown: number; // total earned over the whole chain
  meanFinalUpgradeRanks: number;
  everClearedRate: number; // fraction of chains that cleared at least once
  medianLivesToFirstClear: number | null;
  meanLivesToFirstClear: number | null;
  meanFinalAscension: number;
  maxAscensionReached: number;
  ascensionDist: Record<number, number>; // chains ending at each ascension
  perLife: Array<{
    position: number;
    n: number;
    deathRate: number;
    clearRate: number;
    avgRooms: number;
    avgRenown: number;
    avgUpgradeRanksAtStart: number;
    avgAscension: number;
  }>;
  perAscension: Array<{
    level: number;
    livesPlayed: number;
    clearRate: number;
    avgRooms: number;
  }>;
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function aggregate(classId: ClassId, chains: ChainResult[]): ClassAggregate {
  const allLives = chains.flatMap((c) => c.lives);
  const totalLives = allLives.length;
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

  const clears = allLives.filter((l) => l.cleared).length;
  const cleared = chains.filter((c) => c.firstClearLife !== null);
  const firstClears = cleared.map((c) => c.firstClearLife as number);

  const ascensionDist: Record<number, number> = {};
  for (const c of chains) {
    ascensionDist[c.finalAscensionUnlocked] = (ascensionDist[c.finalAscensionUnlocked] ?? 0) + 1;
  }

  const maxLives = Math.max(...chains.map((c) => c.lives.length), 0);
  const perLife: ClassAggregate['perLife'] = [];
  for (let pos = 0; pos < maxLives; pos++) {
    const lives = chains.flatMap((c) => (c.lives[pos] ? [c.lives[pos]] : []));
    if (lives.length === 0) continue;
    perLife.push({
      position: pos + 1,
      n: lives.length,
      deathRate: lives.filter((l) => !l.cleared).length / lives.length,
      clearRate: lives.filter((l) => l.cleared).length / lives.length,
      avgRooms: mean(lives.map((l) => l.roomsReached)),
      avgRenown: mean(lives.map((l) => l.renownEarned)),
      avgUpgradeRanksAtStart: mean(lives.map((l) => l.upgradeRanksAtStart)),
      avgAscension: mean(lives.map((l) => l.ascensionPlayed)),
    });
  }

  const perAscension: ClassAggregate['perAscension'] = [];
  for (let lvl = 0; lvl <= MAX_ASCENSION; lvl++) {
    const lives = allLives.filter((l) => l.ascensionPlayed === lvl);
    if (lives.length === 0) continue;
    perAscension.push({
      level: lvl,
      livesPlayed: lives.length,
      clearRate: lives.filter((l) => l.cleared).length / lives.length,
      avgRooms: mean(lives.map((l) => l.roomsReached)),
    });
  }

  return {
    classId,
    chains: chains.length,
    totalLives,
    deathRate: (totalLives - clears) / totalLives,
    clearRate: clears / totalLives,
    bossFootholdRate: allLives.filter((l) => l.bossesKilled >= 1).length / totalLives,
    avgBossesKilled: mean(allLives.map((l) => l.bossesKilled)),
    avgRoomsReached: mean(allLives.map((l) => l.roomsReached)),
    avgChapter: mean(allLives.map((l) => l.chapter)),
    avgFinalLevel: mean(allLives.map((l) => l.finalLevel)),
    avgRenownPerLife: mean(allLives.map((l) => l.renownEarned)),
    meanCumulativeRenown: mean(chains.map((c) => c.totalRenownEarned)),
    meanFinalUpgradeRanks: mean(chains.map((c) => c.finalUpgradeRanks)),
    everClearedRate: cleared.length / chains.length,
    medianLivesToFirstClear: median(firstClears),
    meanLivesToFirstClear: firstClears.length ? mean(firstClears) : null,
    meanFinalAscension: mean(chains.map((c) => c.finalAscensionUnlocked)),
    maxAscensionReached: Math.max(...chains.map((c) => c.finalAscensionUnlocked), 0),
    ascensionDist,
    perLife,
    perAscension,
  };
}

// ─── Rendering ──────────────────────────────────────────────────────────

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const num = (n: number, d = 2) => n.toFixed(d);

function renderHeadline(aggs: ClassAggregate[]): string {
  const L: string[] = [];
  L.push(`| Character | Class | Lives | Death% | Clear% | Boss foothold% | Avg bosses | Avg rooms /${TOTAL_ROOMS} | Avg chapter | Avg lvl | Renown/life | Cumul. renown/chain | Final Grove ranks |`);
  L.push('|----------|------|-----:|------:|------:|-------------:|----------:|------------:|----------:|------:|----------:|------------------:|----------------:|');
  for (const a of aggs) {
    L.push(
      `| ${CHAR_NAME[a.classId]} | ${a.classId} | ${a.totalLives} | ${pct(a.deathRate)} | ${pct(a.clearRate)} | ${pct(a.bossFootholdRate)} | ${num(a.avgBossesKilled)} | ${num(a.avgRoomsReached, 1)} | ${num(a.avgChapter)} | ${num(a.avgFinalLevel)} | ${num(a.avgRenownPerLife, 1)} | ${num(a.meanCumulativeRenown, 0)} | ${num(a.meanFinalUpgradeRanks, 1)} |`,
    );
  }
  return L.join('\n');
}

function renderProgression(aggs: ClassAggregate[]): string {
  const L: string[] = [];
  L.push('| Character | Ever cleared (chains) | Median lives→1st clear | Mean lives→1st clear | Mean final ascension | Max ascension | Ascension distribution |');
  L.push('|----------|--------------------:|----------------------:|--------------------:|-------------------:|------------:|-----------------------|');
  for (const a of aggs) {
    const dist = Object.entries(a.ascensionDist)
      .sort((x, y) => Number(x[0]) - Number(y[0]))
      .map(([lvl, n]) => `A${lvl}:${n}`)
      .join(' ');
    L.push(
      `| ${CHAR_NAME[a.classId]} | ${pct(a.everClearedRate)} | ${a.medianLivesToFirstClear ?? '—'} | ${a.meanLivesToFirstClear !== null ? num(a.meanLivesToFirstClear, 1) : '—'} | ${num(a.meanFinalAscension)} | ${a.maxAscensionReached} | ${dist} |`,
    );
  }
  return L.join('\n');
}

function renderPerLife(a: ClassAggregate): string {
  const L: string[] = [];
  L.push(`### ${CHAR_NAME[a.classId]} (${a.classId}) — per-life-position curve`);
  L.push('');
  L.push('| Life | n | Death% | Clear% | Avg rooms | Renown earned | Grove ranks @start | Avg ascension |');
  L.push('|----:|--:|------:|------:|---------:|-------------:|------------------:|-------------:|');
  for (const p of a.perLife) {
    L.push(
      `| ${p.position} | ${p.n} | ${pct(p.deathRate)} | ${pct(p.clearRate)} | ${num(p.avgRooms, 1)} | ${num(p.avgRenown, 1)} | ${num(p.avgUpgradeRanksAtStart, 1)} | ${num(p.avgAscension, 2)} |`,
    );
  }
  L.push('');
  L.push('**Clear rate by ascension level played:**');
  L.push('');
  L.push('| Ascension | Lives played | Clear% | Avg rooms |');
  L.push('|---------:|-----------:|------:|---------:|');
  for (const p of a.perAscension) {
    L.push(`| A${p.level} | ${p.livesPlayed} | ${pct(p.clearRate)} | ${num(p.avgRooms, 1)} |`);
  }
  L.push('');
  return L.join('\n');
}

function renderRawDoc(aggs: ClassAggregate[], wallSec: string): string {
  return `# Per-character fairness sim — raw output

> Auto-generated by \`scripts/sim-per-character.ts\`. Re-run with
> \`CHAINS_PER_CLASS=${CHAINS_PER_CLASS} LIVES_PER_CHAIN=${LIVES_PER_CHAIN} npx tsx scripts/sim-per-character.ts\`.

**Chains / class:** ${CHAINS_PER_CLASS} · **Lives / chain:** ${LIVES_PER_CHAIN} · **Lives / class:** ${CHAINS_PER_CLASS * LIVES_PER_CHAIN}.
**Wall clock:** ${wallSec}s.

Each chain is a single soul living ${LIVES_PER_CHAIN} consecutive lives. Renown,
Grove upgrades, and ascension persist across lives; quirks reroll each death
(first life wears none). Same chain seed → same delve layout per (chain, life)
across all three classes. Greedy ascension climb + greedy Grove spend.

## Headline — survivability + renown

${renderHeadline(aggs)}

## Meta-progression — first clear + ascension climb

${renderProgression(aggs)}

## Per-life-position curves

${aggs.map(renderPerLife).join('\n')}
`;
}

function main(): void {
  const tWall0 = Date.now();
  console.log(
    `Per-character sim — 3 classes × ${CHAINS_PER_CLASS} chains × ${LIVES_PER_CHAIN} lives = ${3 * CHAINS_PER_CLASS * LIVES_PER_CHAIN} lives\n`,
  );

  const aggs: ClassAggregate[] = [];
  for (const classId of ['fighter', 'rogue', 'wizard'] as ClassId[]) {
    const t0 = Date.now();
    const chains: ChainResult[] = [];
    for (let i = 0; i < CHAINS_PER_CLASS; i++) {
      // SAME chain seed across classes (class not folded into the seed).
      const chainSeed = (SEED_BASE ^ (i * 104729)) >>> 0;
      chains.push(runChain(classId, chainSeed));
    }
    const a = aggregate(classId, chains);
    aggs.push(a);
    const dt = Date.now() - t0;
    console.log(
      `${CHAR_NAME[classId].padEnd(12)} ${classId.padEnd(8)} death ${pct(a.deathRate).padStart(6)}  clear ${pct(a.clearRate).padStart(6)}  boss ${pct(a.bossFootholdRate).padStart(6)}  rooms ${num(a.avgRoomsReached, 1).padStart(5)}  ren/life ${num(a.avgRenownPerLife, 1).padStart(6)}  maxAsc ${a.maxAscensionReached}  everClr ${pct(a.everClearedRate).padStart(6)}  ${dt}ms`,
    );
  }

  const dtTotal = ((Date.now() - tWall0) / 1000).toFixed(1);
  const doc = renderRawDoc(aggs, dtTotal);
  const outPath = resolve(process.cwd(), 'docs/gameplay-quality/per-character-sim.raw.md');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, doc, 'utf8');
  console.log(`\nWrote raw output → ${outPath}  (${dtTotal}s wall)`);
}

main();
