/**
 * Sir Brick the Fighter — full meta-loop reincarnation sim.
 *
 * Runs the fixed-stat selectable Fighter (`SIR_BRICK_PRESET`) through MANY
 * reincarnation chains. Each chain is a soul that lives life after life,
 * climbing the Ascension ladder, until it tops Ascension 6 or hits a life cap.
 *
 * Faithful to the SHIPPED meta loop — improves on the older
 * `sim-reincarnation-loop.ts` in three ways that matter for a Fighter verdict:
 *  - DEPTH-SCALED renown: `+1 renown / room reached` on BOTH clear and death,
 *    times the soul-mark bane multiplier, times the ASCENSION reward multiplier
 *    (mirrors delveStore.finishDelve exactly, not the old flat 50/15 model).
 *  - ASCENSION LADDER as the spine: the soul plays at the highest ascension it
 *    has unlocked; a clear there opens the next rung (Spire-style,
 *    metaStore.unlockNextAscension). Enemy HP/damage + boss HP + starting gold
 *    are all scaled per ascension via createCombat({ ascension }).
 *  - Soul-mark XP: combat XP is scaled by the bane soul-mark multiplier, so
 *    bane-quirk lives level faster (mirrors delveStore.addDelveReward).
 *
 * Combat is resolved by the COMPETENT shared policy (`runAutoTurn`, the same
 * decision logic that powers the in-game Auto-Battle toggle), so the bot uses
 * Second Wind, Action Surge, and potions like a watching player would.
 *
 * Grove purchases: greedy between every life from a sensible Fighter priority
 * list (defensive spine first, then accuracy/damage, then the ascension-gated
 * deeper tiers), respecting each upgrade's ascension unlock gate exactly as
 * metaStore.purchaseUpgrade does.
 *
 * READ-ONLY: writes only a findings doc. No game state is touched.
 *
 * Run:
 *   npx tsx scripts/sim-fighter-meta.ts
 *   CHAINS=200 LIFE_CAP=60 npx tsx scripts/sim-fighter-meta.ts
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
import { runAutoTurn } from '../src/engine/combat/actionPolicy';
import {
  applyPermanentUpgrade,
  applyDelveStartUpgrades,
  type UnlockedUpgrades,
} from '../src/engine/character/upgrades';
import { findUpgrade } from '../src/content/upgrades';
import { buildPlayerCharacter, SIR_BRICK_PRESET } from '../src/engine/character/defaultCharacter';
import { rollQuirks, renownSoulMarkMultiplier, soulMarkMultiplier } from '../src/engine/character/quirks';
import { rollBlessingOptions } from '../src/engine/character/blessings';
import { getBlessing } from '../src/content/blessings';
import { baneQuirkCount } from '../src/engine/character/quirks';
import { getAscensionLevel, MAX_ASCENSION } from '../src/engine/delve/ascension';
import type { Character } from '../src/types/character';
import type { CombatState } from '../src/types/combat';
import type { RoomSpec } from '../src/types/delve';

// ─── Config ──────────────────────────────────────────────────────────────
const NUM_CHAINS = Number(process.env.CHAINS ?? 200);
const LIFE_CAP = Number(process.env.LIFE_CAP ?? 60);
const MAX_TURNS_PER_FIGHT = 200;
const SEED_BASE = 0xb12c4 >>> 0; // "BRICK"

// ─── Real-game renown constants (delveStore.ts) ─────────────────────────────
const RENOWN_PER_DELVE_CLEAR = 50;
const RENOWN_PER_DELVE_FAILURE = 15;
const RENOWN_PER_CHAPTER_BOSS = 10;
const RENOWN_PER_ROOM_REACHED = 1;
const GROVE_UNLOCK_THRESHOLD = 30;

// Godwake chain: 50 rooms (0-based). Boss rooms sit at these indices.
const TOTAL_ROOMS = 50;
const BOSS_ROOM_IDS = new Set(['room-10', 'room-22', 'room-34', 'room-46']);

// ─── Fighter Grove priority (sensible greedy) ───────────────────────────────
// Defensive spine first (HP / AC / sustain) so the soul survives deeper and
// banks more depth-renown + clears, then accuracy/damage to fell bosses, then
// the deeper ascension-gated tiers once they open. Greedy restarts from the
// top after each buy, so cheap high-priority ranks fill first.
const FIGHTER_PRIORITY: string[] = [
  'pilgrims-boots', // +2 HP, cheap opener (25)
  'mantle-of-the-wakened', // +5 HP/rank ×5 — HP spine
  'cloak-of-the-grove', // +1 AC/rank ×3 — fewer hits land
  'heirloom-blade', // +1 attack/rank ×4 — accuracy
  'wellspring-vigil', // +Second Wind charges ×3 — in-fight sustain
  'whetstone-resolve', // +1 dmg/rank ×4 — faster kills
  'mielikki-cache', // +potion/rank ×4 — emergency heals
  'iron-will', // +5 HP one-shot
  'wellspring-depths', // +10 HP/rank ×3 — ASC≥1 deep-HP tier
  'first-cut', // +first-hit dmg ×3
  'fellfast-strike', // +crit dmg ×3
  'bleed-out', // +wounded-target dmg ×2
  'killers-eye', // crit range ×2
  'crown-of-the-returned', // +1 atk ×2 — ASC≥3 tier
  'hardier-soul', // +stabilise charges ×3
  'soul-marrow', // renown engine (+% per bane) ×3
  'coin-in-pocket', // gold trickle
];

interface Meta {
  renown: number; // spendable balance
  cumulativeRenown: number; // total ever earned (never decremented)
  unlocked: UnlockedUpgrades;
  ascensionUnlocked: number;
}

/** Sensible-greedy blessing value for a Fighter. Survival-leaning (dying is
 *  the failure mode) but rewards offense too. Reads the real BlessingModifiers
 *  so the shrine pick is a deliberate "best card" rather than an arbitrary one.
 *  Approximations: ~17 combats/run, avg level ~4, current bane count from the
 *  carried quirks. */
function scoreBlessingForFighter(id: string, baneCount: number): number {
  let b;
  try {
    b = getBlessing(id);
  } catch {
    return 0;
  }
  const m = b.modifiers ?? {};
  let s = 0;
  // Survival
  s += (m.extraTempHpPerRoom ?? 0) * 1.6;
  s += (m.tempHpPerDelveLevel ?? 0) * 4 * 1.2;
  s += (m.tempHpPerBaneQuirk ?? 0) * baneCount * 1.1;
  s += (m.bossTempHp ?? 0) * 0.45;
  s += (m.regenPerCombat ?? 0) * 2.2;
  s += ((m.regenPctPerCombat ?? 0) / 100) * 30 * 2.2;
  s += (m.acBonus ?? 0) * 6;
  s += (m.acBonusWhileFull ?? 0) * 3;
  s += (m.acBonusWhileBloodied ?? 0) * 3.5;
  s += (m.acBonusPerBaneQuirk ?? 0) * baneCount * 4;
  s += (m.extraStabiliseCharges ?? 0) * 5;
  // Offense
  s += (m.damageBonus ?? 0) * 3;
  s += (m.holyDamageBonus ?? 0) * 3;
  s += (m.firstAttackBonus ?? 0) * 1.5;
  s += (m.firstAttackDamage ?? 0) * 1;
  s += (m.firstAttackAdvantage ? 3 : 0);
  s += (m.critRangeBonus ?? 0) * 2.5;
  s += (m.critRangeBonusWhileFull ?? 0) * 1.5;
  s += (m.critRangeBonusWhileBloodied ?? 0) * 1.5;
  s += (m.rerollMissesPerEncounter ?? 0) * 2;
  return s;
}

/** Greedy: spend the spendable renown balance on the highest-priority,
 *  affordable, not-maxed, ascension-unlocked upgrade. Bakes permanent
 *  upgrades onto the soul character (mirrors metaStore.purchaseUpgrade). */
function buyUpgrades(
  soulChar: Character,
  meta: Meta,
  lifeIdx: number,
  acquisitionLife: Record<string, number>,
): Character {
  if (meta.renown < GROVE_UNLOCK_THRESHOLD) return soulChar;
  let ch = soulChar;
  let bought = true;
  let safety = 0;
  while (bought && safety < 80) {
    bought = false;
    safety += 1;
    for (const id of FIGHTER_PRIORITY) {
      const up = findUpgrade(id);
      if (!up) continue;
      const requiredAsc = up.unlock?.ascension ?? 0;
      if (meta.ascensionUnlocked < requiredAsc) continue; // gate, like the store
      const cur = meta.unlocked[id] ?? 0;
      if (cur >= up.maxRank) continue;
      const next = cur + 1;
      const cost = up.costForRank(next);
      if (meta.renown < cost) continue;
      meta.renown -= cost;
      meta.unlocked[id] = next;
      if (up.kind === 'permanent') ch = applyPermanentUpgrade(ch, id, next);
      if (acquisitionLife[id] === undefined) acquisitionLife[id] = lifeIdx + 1;
      bought = true;
      break; // restart from the top of the priority list
    }
  }
  return ch;
}

/** Build the L1 body that descends this life. Mirrors delveStore.startDelve:
 *  clean Sir Brick kit + level-1 HP ceiling (+ permanent Grove HP), then
 *  delve-start upgrades (cache potions, Second Wind bonus, stabilise). Quirks
 *  ride from the soul (rerolled between lives; empty on the very first life). */
function descend(soulChar: Character, meta: Meta): Character {
  const fresh = buildPlayerCharacter(SIR_BRICK_PRESET);
  const permHp = soulChar.permanentBonuses?.hp ?? 0;
  const hpMax = fresh.hp.max + permHp;
  let c: Character = {
    ...fresh,
    renown: meta.renown,
    quirks: soulChar.quirks,
    permanentBonuses: soulChar.permanentBonuses,
    permanentFirstAttackDamage: soulChar.permanentFirstAttackDamage,
    permanentWoundedTargetDamage: soulChar.permanentWoundedTargetDamage,
    permanentCritDamageBonus: soulChar.permanentCritDamageBonus,
    permanentRenownBonusPerBane: soulChar.permanentRenownBonusPerBane,
    attunementSlotsBonus: soulChar.attunementSlotsBonus,
    wheelturnerUnlocked: soulChar.wheelturnerUnlocked,
    hp: { current: hpMax, max: hpMax, temp: 0 },
  };
  c = applyDelveStartUpgrades(c, meta.unlocked);
  return c;
}

/** Reroll the next life's quirks. Wheelturner carries the first quirk forward
 *  (mirrors reincarnateSoul / rollReincarnationQuirks). */
function rerollQuirks(roller: DiceRoller, soulChar: Character): string[] {
  const carry =
    soulChar.wheelturnerUnlocked && soulChar.quirks.length > 0 ? [soulChar.quirks[0]] : [];
  const result = [...carry];
  for (const id of rollQuirks(roller, Math.max(2 - result.length, 1))) {
    if (!result.includes(id)) result.push(id);
  }
  for (let attempt = 0; result.length < 2 && attempt < 32; attempt++) {
    const [id] = rollQuirks(roller, 1);
    if (id && !result.includes(id)) result.push(id);
  }
  return result;
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
      const turn = runAutoTurn(roller, state, character);
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
  cleared: boolean;
  finalRoomIdx: number; // index of the terminal room (death room, or 49 on clear)
  chaptersCleared: number; // chapter bosses felled
  finalLevel: number;
  ascension: number;
  renownEarned: number;
  deathCause: string | null;
}

function liveOneLife(
  roller: DiceRoller,
  soulChar: Character,
  meta: Meta,
  lifeIdx: number,
  chainSeed: number,
): LifeOutcome {
  const ascension = meta.ascensionUnlocked;
  let character = descend(soulChar, meta);
  const delveSeed = (chainSeed + lifeIdx * 7919 + ascension * 104729) >>> 0;
  const delve = createGodwakeDelve({ seed: delveSeed, ascension });
  const smMult = soulMarkMultiplier(character); // bane XP/gold multiplier

  let finalRoomIdx = 0;
  let died = false;
  let deathCause: string | null = null;

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
      const baneCount = baneQuirkCount(character);
      const pick = options
        .filter((id) => !character.blessings.includes(id))
        .sort((a, b) => scoreBlessingForFighter(b, baneCount) - scoreBlessingForFighter(a, baneCount))[0];
      if (pick) {
        character = { ...character, blessings: [...character.blessings, pick] };
      }
      continue;
    }
    if (room.kind === 'event') continue; // intel rooms are kind 'event' too

    // combat or boss
    const result = runCombatRoom(roller, character, room, ascension);
    character = result.character;
    if (!result.victory) {
      died = true;
      deathCause = room.kind === 'boss' ? (room.monsters?.[0]?.defId ?? room.id) : room.id;
      break;
    }
    const rXp = Math.floor((room.xpReward ?? 0) * smMult);
    if (rXp > 0) {
      character = { ...character, xp: character.xp + rXp };
      while (character.level < MAX_LEVEL && character.xp >= xpForLevel(character.level + 1)) {
        character = applyLevelUp(character);
      }
    }
  }

  const cleared = !died;
  // Mirror finishDelve: depth credit pays per room reached; clear swaps the
  // failure base for the clear premium; bosses felled ride on top.
  const currentRoomIdx = cleared ? TOTAL_ROOMS - 1 : finalRoomIdx;
  const bossLimitIdx = cleared ? currentRoomIdx + 1 : currentRoomIdx;
  let bossesKilled = 0;
  for (let i = 0; i < bossLimitIdx; i++) {
    if (BOSS_ROOM_IDS.has(delve.rooms[i].id)) bossesKilled += 1;
  }
  const depthRenown = RENOWN_PER_ROOM_REACHED * currentRoomIdx;
  const renownBase =
    (cleared ? RENOWN_PER_DELVE_CLEAR : RENOWN_PER_DELVE_FAILURE) +
    RENOWN_PER_CHAPTER_BOSS * bossesKilled +
    depthRenown;
  const ascensionMult = getAscensionLevel(ascension).renownMult;
  const renownEarned = Math.floor(
    renownBase * renownSoulMarkMultiplier(character) * ascensionMult,
  );

  return {
    cleared,
    finalRoomIdx: cleared ? TOTAL_ROOMS - 1 : finalRoomIdx,
    chaptersCleared: bossesKilled,
    finalLevel: character.level,
    ascension,
    renownEarned,
    deathCause,
  };
}

interface ChainResult {
  lives: LifeOutcome[];
  livesToFirstClear: number | null;
  ascensionReached: number; // highest ascension UNLOCKED at chain end
  toppedLadder: boolean; // cleared Ascension 6
  finalUpgradeRanks: number;
  finalCumulativeRenown: number;
  acquisitionLife: Record<string, number>; // upgrade id -> life of first rank
  finalUnlocked: UnlockedUpgrades;
  ranksAtLifeStart: number[]; // total ranks owned entering each life
}

function runChain(chainSeed: number): ChainResult {
  const roller = createDiceRoller(chainSeed);
  setActiveRoller(chainSeed);
  // Fresh soul: clean Sir Brick, no quirks on the first life (marks are earned
  // only after the first death), renown 0, no upgrades, Ascension 0.
  let soulChar = buildPlayerCharacter(SIR_BRICK_PRESET);
  const meta: Meta = { renown: 0, cumulativeRenown: 0, unlocked: {}, ascensionUnlocked: 0 };
  const lives: LifeOutcome[] = [];
  const acquisitionLife: Record<string, number> = {};
  const ranksAtLifeStart: number[] = [];
  let livesToFirstClear: number | null = null;
  let toppedLadder = false;

  for (let life = 0; life < LIFE_CAP; life++) {
    ranksAtLifeStart.push(Object.values(meta.unlocked).reduce((a, b) => a + b, 0));
    const outcome = liveOneLife(roller, soulChar, meta, life, chainSeed);
    lives.push(outcome);
    meta.renown += outcome.renownEarned;
    meta.cumulativeRenown += outcome.renownEarned;

    if (outcome.cleared) {
      if (livesToFirstClear === null) livesToFirstClear = life + 1;
      if (outcome.ascension >= meta.ascensionUnlocked && meta.ascensionUnlocked < MAX_ASCENSION) {
        meta.ascensionUnlocked += 1;
      } else if (outcome.ascension >= MAX_ASCENSION) {
        toppedLadder = true;
      }
    }

    // Hub: spend renown greedily (bakes permanent upgrades onto the soul).
    soulChar = { ...soulChar, renown: meta.renown };
    soulChar = buyUpgrades(soulChar, meta, life, acquisitionLife);
    soulChar = { ...soulChar, renown: meta.renown };

    // Turn the wheel: reroll quirks for the next life.
    soulChar = { ...soulChar, quirks: rerollQuirks(roller, soulChar) };

    if (toppedLadder) break;
  }

  return {
    lives,
    livesToFirstClear,
    ascensionReached: meta.ascensionUnlocked,
    toppedLadder,
    finalUpgradeRanks: Object.values(meta.unlocked).reduce((a, b) => a + b, 0),
    finalCumulativeRenown: meta.cumulativeRenown,
    acquisitionLife,
    finalUnlocked: meta.unlocked,
    ranksAtLifeStart,
  };
}

// ─── Aggregation + rendering ────────────────────────────────────────────────
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

function main(): void {
  const t0 = Date.now();
  console.log(`Sir Brick meta-loop sim — ${NUM_CHAINS} chains, life cap ${LIFE_CAP}\n`);

  const chains: ChainResult[] = [];
  for (let i = 0; i < NUM_CHAINS; i++) {
    const seed = (SEED_BASE ^ (i * 2654435761)) >>> 0;
    chains.push(runChain(seed));
  }

  const allLives = chains.flatMap((c) => c.lives);
  const totalLives = allLives.length;
  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`Simulated ${totalLives} lives across ${NUM_CHAINS} chains in ${dt}s\n`);

  // ── Per-life-position curve ──
  const maxLifePos = Math.max(...chains.map((c) => c.lives.length));
  interface PosAgg {
    pos: number;
    n: number;
    deathRate: number;
    clearRate: number;
    avgRooms: number;
    avgChapters: number;
    avgLevel: number;
    avgAsc: number;
    avgRenown: number;
    avgRanks: number;
  }
  const posAggs: PosAgg[] = [];
  for (let p = 0; p < maxLifePos; p++) {
    const ls = chains.flatMap((c) => (c.lives[p] ? [{ o: c.lives[p], ranks: c.ranksAtLifeStart[p] ?? 0 }] : []));
    if (ls.length === 0) continue;
    posAggs.push({
      pos: p + 1,
      n: ls.length,
      deathRate: ls.filter((x) => !x.o.cleared).length / ls.length,
      clearRate: ls.filter((x) => x.o.cleared).length / ls.length,
      avgRooms: mean(ls.map((x) => x.o.finalRoomIdx + (x.o.cleared ? 1 : 0))),
      avgChapters: mean(ls.map((x) => x.o.chaptersCleared)),
      avgLevel: mean(ls.map((x) => x.o.finalLevel)),
      avgAsc: mean(ls.map((x) => x.o.ascension)),
      avgRenown: mean(ls.map((x) => x.o.renownEarned)),
      avgRanks: mean(ls.map((x) => x.ranks)),
    });
  }

  // ── Per-ascension-level breakdown ──
  interface AscAgg {
    asc: number;
    attempts: number;
    clears: number;
    clearRate: number;
    avgRooms: number;
    avgRenown: number;
  }
  const ascAggs: AscAgg[] = [];
  for (let a = 0; a <= MAX_ASCENSION; a++) {
    const ls = allLives.filter((l) => l.ascension === a);
    if (ls.length === 0) continue;
    ascAggs.push({
      asc: a,
      attempts: ls.length,
      clears: ls.filter((l) => l.cleared).length,
      clearRate: ls.filter((l) => l.cleared).length / ls.length,
      avgRooms: mean(ls.map((l) => l.finalRoomIdx + (l.cleared ? 1 : 0))),
      avgRenown: mean(ls.map((l) => l.renownEarned)),
    });
  }

  // ── Chain-level summaries ──
  const firstClears = chains.map((c) => c.livesToFirstClear).filter((x): x is number => x !== null);
  const everCleared = firstClears.length;
  const ascReached = chains.map((c) => c.ascensionReached);
  const topped = chains.filter((c) => c.toppedLadder).length;
  const overallDeathRate = allLives.filter((l) => !l.cleared).length / totalLives;
  const overallClearRate = allLives.filter((l) => l.cleared).length / totalLives;

  // ascension-reached distribution
  const ascDist: Record<number, number> = {};
  for (const a of ascReached) ascDist[a] = (ascDist[a] ?? 0) + 1;

  // death-cause histogram
  const deathCause: Record<string, number> = {};
  for (const l of allLives) if (!l.cleared && l.deathCause) deathCause[l.deathCause] = (deathCause[l.deathCause] ?? 0) + 1;
  const topDeaths = Object.entries(deathCause).sort((a, b) => b[1] - a[1]).slice(0, 12);

  // upgrade acquisition timeline
  interface UpAgg {
    id: string;
    name: string;
    ownedChains: number;
    avgFirstLife: number;
    avgFinalRank: number;
    maxRank: number;
  }
  const upAggs: UpAgg[] = [];
  for (const id of FIGHTER_PRIORITY) {
    const up = findUpgrade(id);
    if (!up) continue;
    const firstLives = chains.flatMap((c) => (c.acquisitionLife[id] !== undefined ? [c.acquisitionLife[id]] : []));
    const finalRanks = chains.map((c) => c.finalUnlocked[id] ?? 0);
    upAggs.push({
      id,
      name: up.name,
      ownedChains: firstLives.length,
      avgFirstLife: mean(firstLives),
      avgFinalRank: mean(finalRanks),
      maxRank: up.maxRank,
    });
  }

  // ── Console headline ──
  console.log('Per-ascension clear rates:');
  for (const a of ascAggs) {
    console.log(
      `  A${a.asc}: ${a.attempts} attempts, clear ${pct(a.clearRate).padStart(6)}, avg depth ${num(a.avgRooms, 1)}/${TOTAL_ROOMS}, avg renown ${num(a.avgRenown, 0)}`,
    );
  }
  console.log(
    `\nEver-cleared chains: ${everCleared}/${NUM_CHAINS} (${pct(everCleared / NUM_CHAINS)}); topped A6: ${topped}/${NUM_CHAINS} (${pct(topped / NUM_CHAINS)})`,
  );
  console.log(
    `Lives-to-first-clear: mean ${num(mean(firstClears), 1)}, median ${num(median(firstClears), 1)}`,
  );
  console.log(`Mean ascension reached: ${num(mean(ascReached), 2)}`);

  // ── Write findings doc ──
  const doc = renderDoc({
    totalLives,
    dt,
    posAggs,
    ascAggs,
    upAggs,
    firstClears,
    everCleared,
    ascReached,
    ascDist,
    topped,
    overallDeathRate,
    overallClearRate,
    topDeaths,
    finalRanks: chains.map((c) => c.finalUpgradeRanks),
    cumulativeRenown: chains.map((c) => c.finalCumulativeRenown),
    livesUsed: chains.map((c) => c.lives.length),
  });
  const outPath = resolve(process.cwd(), 'docs/sim-findings/fighter-meta.md');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, doc, 'utf8');
  console.log(`\nWrote findings → ${outPath}`);
}

interface DocData {
  totalLives: number;
  dt: string;
  posAggs: Array<{ pos: number; n: number; deathRate: number; clearRate: number; avgRooms: number; avgChapters: number; avgLevel: number; avgAsc: number; avgRenown: number; avgRanks: number }>;
  ascAggs: Array<{ asc: number; attempts: number; clears: number; clearRate: number; avgRooms: number; avgRenown: number }>;
  upAggs: Array<{ id: string; name: string; ownedChains: number; avgFirstLife: number; avgFinalRank: number; maxRank: number }>;
  firstClears: number[];
  everCleared: number;
  ascReached: number[];
  ascDist: Record<number, number>;
  topped: number;
  overallDeathRate: number;
  overallClearRate: number;
  topDeaths: Array<[string, number]>;
  finalRanks: number[];
  cumulativeRenown: number[];
  livesUsed: number[];
}

function renderDoc(d: DocData): string {
  const L: string[] = [];
  L.push('# Sir Brick the Fighter — meta-loop sim (raw findings)');
  L.push('');
  L.push(`> Auto-generated by \`scripts/sim-fighter-meta.ts\`. Re-run with`);
  L.push(`> \`CHAINS=${NUM_CHAINS} LIFE_CAP=${LIFE_CAP} npx tsx scripts/sim-fighter-meta.ts\`.`);
  L.push('');
  L.push(`- **Chains (souls):** ${NUM_CHAINS} · **Life cap:** ${LIFE_CAP}`);
  L.push(`- **Total lives simulated:** ${d.totalLives} · **Wall clock:** ${d.dt}s`);
  L.push(`- **Combat AI:** shared competent policy (\`runAutoTurn\`).`);
  L.push(`- **Renown:** depth-scaled (+1/room) × soul-mark × ascension mult (mirrors \`finishDelve\`).`);
  L.push(`- **Ascension:** soul plays the highest unlocked rung; a clear opens the next (Spire-style).`);
  L.push('');
  L.push('## Headline');
  L.push('');
  L.push(`- Overall per-life **death rate ${pct(d.overallDeathRate)}** · clear rate ${pct(d.overallClearRate)}.`);
  L.push(`- Chains that ever cleared the chain: **${d.everCleared}/${NUM_CHAINS}** (${pct(d.everCleared / NUM_CHAINS)}).`);
  L.push(`- Chains that topped **Ascension 6**: **${d.topped}/${NUM_CHAINS}** (${pct(d.topped / NUM_CHAINS)}).`);
  L.push(`- Lives to first clear: mean **${num(mean(d.firstClears), 1)}**, median **${num(median(d.firstClears), 1)}** (min ${Math.min(...d.firstClears)}, max ${Math.max(...d.firstClears)}).`);
  L.push(`- Mean ascension reached at chain end: **${num(mean(d.ascReached), 2)}** / ${MAX_ASCENSION}.`);
  L.push(`- Mean lives used per chain: ${num(mean(d.livesUsed), 1)} · mean final upgrade ranks: ${num(mean(d.finalRanks), 1)} · mean cumulative renown: ${num(mean(d.cumulativeRenown), 0)}.`);
  L.push('');

  L.push('## Ascension reached — distribution');
  L.push('');
  L.push('| Ascension reached | Chains | Share |');
  L.push('|------------------:|-------:|------:|');
  for (let a = 0; a <= MAX_ASCENSION; a++) {
    const c = d.ascDist[a] ?? 0;
    if (c === 0) continue;
    L.push(`| ${a} | ${c} | ${pct(c / NUM_CHAINS)} |`);
  }
  L.push('');

  L.push('## Per-ascension difficulty (every life at each rung)');
  L.push('');
  L.push('| Ascension | Attempts | Clears | Clear% | Avg depth (rooms) | Avg renown/life |');
  L.push('|----------:|---------:|-------:|-------:|------------------:|----------------:|');
  for (const a of d.ascAggs) {
    L.push(`| ${a.asc} | ${a.attempts} | ${a.clears} | ${pct(a.clearRate)} | ${num(a.avgRooms, 1)} / ${TOTAL_ROOMS} | ${num(a.avgRenown, 0)} |`);
  }
  L.push('');

  L.push('## Per-life-position trajectory');
  L.push('');
  L.push('Averaged across all chains that reached that life position. "Ranks" = total Grove upgrade ranks owned entering the life.');
  L.push('');
  L.push('| Life | n | Death% | Clear% | Avg rooms | Avg chapters | Avg lvl | Avg ascension | Renown earned | Ranks owned |');
  L.push('|----:|--:|------:|------:|---------:|------------:|-------:|-------------:|-------------:|-----------:|');
  for (const p of d.posAggs) {
    if (p.pos > 40) break; // table cap; aggregates above use all lives
    L.push(
      `| ${p.pos} | ${p.n} | ${pct(p.deathRate)} | ${pct(p.clearRate)} | ${num(p.avgRooms, 1)} | ${num(p.avgChapters, 2)} | ${num(p.avgLevel, 2)} | ${num(p.avgAsc, 2)} | ${num(p.avgRenown, 1)} | ${num(p.avgRanks, 1)} |`,
    );
  }
  L.push('');

  L.push('## Grove upgrades over time (acquisition timeline)');
  L.push('');
  L.push('Greedy Fighter priority. "Owned" = chains that bought ≥1 rank; "Avg first life" = mean life index of the first rank; "Avg final rank" = mean rank at chain end.');
  L.push('');
  L.push('| Upgrade | Max rank | Owned by chains | Avg first life | Avg final rank |');
  L.push('|--------|--------:|---------------:|--------------:|--------------:|');
  for (const u of d.upAggs) {
    L.push(`| ${u.name} | ${u.maxRank} | ${u.ownedChains}/${NUM_CHAINS} | ${u.avgFirstLife > 0 ? num(u.avgFirstLife, 1) : '—'} | ${num(u.avgFinalRank, 2)} |`);
  }
  L.push('');

  L.push('## Where Sir Brick dies');
  L.push('');
  L.push('| Death cause | Deaths |');
  L.push('|------------|------:|');
  for (const [cause, n] of d.topDeaths) {
    L.push(`| ${cause} | ${n} |`);
  }
  L.push('');
  return L.join('\n');
}

main();
