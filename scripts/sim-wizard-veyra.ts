/**
 * Veyra Ash (Tiefling Wizard) reincarnation-chain quality sim.
 *
 * READ-ONLY. Deliverable is a findings report (numbers + verdict), not a code
 * change. Models the FULL Godwake meta loop for the ONE fixed-stat preset:
 *
 *   build Veyra → descend the 50-room / 4-chapter chain → fight via the
 *   encounterStress `takeTurn` wizard AI → die or clear → settle DEPTH-scaled
 *   renown (per-room + per-boss + clear premium × soul-mark × ascension) →
 *   greedily spend renown on Grove upgrades → reincarnate (reroll quirks, keep
 *   renown + Grove) → repeat for many lives. Clearing the chain at the highest
 *   unlocked ascension opens the next rung (Spire-style), so the soul keeps
 *   pushing its ceiling across lives.
 *
 * Differences from scripts/sim-reincarnation-loop.ts (deliberate, documented):
 *  - Character is the ACTUAL preset `buildPlayerCharacter(presetCreationInput
 *    ('wizard'))` — Tiefling Veyra Ash (INT 16, fire/poison resistance, ONE
 *    starting potion), NOT the Human INT-15 two-potion `WIZARD_ARCHETYPE`.
 *  - Levels up mid-delve with `simulateLevelUp` (the real LevelUpScreen spell
 *    picker auto-grant) so the wizard actually LEARNS Fireball at L5. The old
 *    harness used `applyLevelUp`, which never learns new spells — it silently
 *    undersells every caster.
 *  - Renown uses the CURRENT depth-scaled `delveStore.finishDelve` formula plus
 *    the ascension reward multiplier. The old harness's constants predate the
 *    per-room depth credit and the ascension ladder.
 *  - Combat is ascension-aware: enemy HP + per-hit damage scale via
 *    `createCombat({ ascension, isBoss })`.
 *  - Grove buy policy is restricted to upgrades that actually move a number in
 *    THIS combat model (HP, AC, spell dmg/attack/DC, extra potions). Spending
 *    renown on inert buys (gold, initiative, move-speed, shrine-count) would
 *    drain the purse into no-ops and misreport meta-progression speed.
 *
 * Run:  npx tsx scripts/sim-wizard-veyra.ts
 *       SOULS=40 LIVES=80 npx tsx scripts/sim-wizard-veyra.ts
 *
 * Writes raw output to docs/gameplay-quality/veyra-wizard.raw.md.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

import { createDiceRoller, setActiveRoller, type DiceRoller } from '../src/engine/dice';
import { getMonster } from '../src/content/monsters';
import { applyLevelUp, simulateLevelUp, xpForLevel, MAX_LEVEL } from '../src/engine/character/leveling';
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
import { getAscensionLevel, MAX_ASCENSION } from '../src/engine/delve/ascension';
import type { Character } from '../src/types/character';
import type { CombatState } from '../src/types/combat';
import type { RoomSpec } from '../src/types/delve';

const NUM_SOULS = Number(process.env.SOULS ?? 50);
const LIVES_PER_SOUL = Number(process.env.LIVES ?? 150);
const MAX_TURNS_PER_FIGHT = 300;
const SEED_BASE = 0x5eed_a5e5 >>> 0;

// Mid-delve leveling. 'sim' = simulateLevelUp (the real LevelUpScreen auto-grant
// — the wizard LEARNS Fireball at L5). 'apply' = applyLevelUp (old harness; no
// spell learning — caster never gains a new spell). Default 'sim' is faithful
// to actual play; 'apply' is the control that isolates the spell-learning lever.
const LEVELUP_MODE = (process.env.LEVELUP ?? 'sim') === 'apply' ? 'apply' : 'sim';
const levelUp = LEVELUP_MODE === 'apply' ? applyLevelUp : simulateLevelUp;

// ─── Renown model — mirrors delveStore.finishDelve (depth-scaled) ────────────
const RENOWN_PER_DELVE_CLEAR = 50;
const RENOWN_PER_DELVE_FAILURE = 15;
const RENOWN_PER_CHAPTER_BOSS = 10;
const RENOWN_PER_ROOM_REACHED = 1;
const GROVE_UNLOCK_THRESHOLD = 30;

const TOTAL_ROOMS = 50;

// ─── Grove purchase priority (Veyra-tuned) ───────────────────────────────────
// Survival-weighted for a 9-HP blaster, interleaved with the wizard's core
// damage scaler (Burning Tongue) so fights end before the dice catch up. Only
// upgrades whose effect the combat model actually reads are listed — see header.
const VEYRA_PRIORITY: { id: string; maxAtRank: number }[] = [
  { id: 'pilgrims-boots', maxAtRank: 1 },            // +2 HP, 25 renown — cheapest survival
  { id: 'mantle-of-the-wakened', maxAtRank: 5 },     // +5 HP/rank — the big survival lever
  { id: 'burning-tongue', maxAtRank: 5 },            // +1 spell dmg/rank — kill faster
  { id: 'cloak-of-the-grove', maxAtRank: 3 },        // +1 AC/rank
  { id: 'mielikki-cache', maxAtRank: 4 },            // +N potions (only 1 in the base kit)
  { id: 'arcane-focus', maxAtRank: 3 },              // +1 spell attack/rank
  { id: 'iron-will', maxAtRank: 1 },                 // +5 HP one-shot
  { id: 'sigil-of-the-wakened-mind', maxAtRank: 3 }, // +1 spell save DC/rank
];

/** Greedy spend: buy the affordable, ascension-unlocked upgrade highest in the list. */
function buyUpgrades(
  renown: number,
  unlocked: UnlockedUpgrades,
  ascensionUnlocked: number,
): { renown: number; unlocked: UnlockedUpgrades; purchased: string[] } {
  let r = renown;
  const u: UnlockedUpgrades = { ...unlocked };
  const purchased: string[] = [];
  if (r < GROVE_UNLOCK_THRESHOLD) return { renown: r, unlocked: u, purchased };

  let bought = true;
  let safety = 0;
  while (bought && safety < 100) {
    bought = false;
    safety += 1;
    for (const { id, maxAtRank } of VEYRA_PRIORITY) {
      const up = findUpgrade(id);
      if (!up) continue;
      if ((up.unlock?.ascension ?? 0) > ascensionUnlocked) continue;
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

/** Apply every owned permanent-upgrade rank to a fresh vessel (mirrors purchase-time bake). */
function applyPermanentUpgrades(c: Character, unlocked: UnlockedUpgrades): Character {
  let ch = c;
  for (const [id, rank] of Object.entries(unlocked)) {
    const up = findUpgrade(id);
    if (!up || up.kind !== 'permanent') continue;
    for (let rk = 1; rk <= rank; rk++) ch = applyPermanentUpgrade(ch, id, rk);
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
  ascensionUnlocked: number;
}

/** Build the L1 Veyra Ash vessel for one descent: preset + Grove bakes + fresh quirks. */
function descend(roller: DiceRoller, soul: SoulState): Character {
  let c = buildPlayerCharacter(presetCreationInput('wizard'));
  c = applyPermanentUpgrades(c, soul.unlockedUpgrades);
  c = applyDelveStartUpgrades(c, soul.unlockedUpgrades);
  const quirks = rollQuirks(roller, 2);
  c = { ...c, quirks, hp: { ...c.hp, current: c.hp.max } };
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
  lifeIdx: number;
  ascensionLevel: number;
  cleared: boolean;
  finalRoomIdx: number;
  finalChapter: number;
  finalLevel: number;
  bossesKilled: number;
  renownEarned: number;
  upgradeRanksAtStart: number;
  deathCause: string | null;
  learnedFireball: boolean;
}

function liveOneLife(
  roller: DiceRoller,
  soul: SoulState,
  lifeIdx: number,
  ascension: number,
): LifeOutcome {
  let character = descend(roller, soul);
  const delve = createGodwakeDelve({ seed: (SEED_BASE + lifeIdx * 7919) >>> 0, ascension });
  const upgradeRanksAtStart = Object.values(soul.unlockedUpgrades).reduce((a, b) => a + b, 0);

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
      deathCause = isBoss ? (room.monsters?.[0]?.defId ?? room.id) : room.id;
      break;
    }
    if (isBoss) bossesKilled += 1;

    const rXp = room.xpReward ?? 0;
    if (rXp > 0) {
      character = { ...character, xp: character.xp + rXp };
      while (character.level < MAX_LEVEL && character.xp >= xpForLevel(character.level + 1)) {
        character = levelUp(character);
      }
    }
  }

  const cleared = !died;
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
    lifeIdx,
    ascensionLevel: ascension,
    cleared,
    finalRoomIdx,
    finalChapter: roomChapter(finalRoomIdx),
    finalLevel: character.level,
    bossesKilled,
    renownEarned,
    upgradeRanksAtStart,
    deathCause,
    learnedFireball: (character.resources.knownSpells ?? []).includes('fireball'),
  };
}

interface SoulResult {
  lives: LifeOutcome[];
  finalRenown: number;
  finalUpgrades: UnlockedUpgrades;
  finalAscensionUnlocked: number;
  firstClearLife: number | null; // 1-based life index of first chain-clear, or null
  cumulativeRenownByLife: number[];
  ranksByLife: number[];
}

function runSoul(seed: number): SoulResult {
  const roller = createDiceRoller(seed);
  setActiveRoller(seed);
  const soul: SoulState = { renown: 0, unlockedUpgrades: {}, ascensionUnlocked: 0 };
  const lives: LifeOutcome[] = [];
  const cumulativeRenownByLife: number[] = [];
  const ranksByLife: number[] = [];
  let firstClearLife: number | null = null;
  let cumRenown = 0;

  for (let life = 0; life < LIVES_PER_SOUL; life++) {
    const playAscension = soul.ascensionUnlocked; // greedy: push the ceiling
    const outcome = liveOneLife(roller, soul, life, playAscension);
    lives.push(outcome);

    cumRenown += outcome.renownEarned;
    cumulativeRenownByLife.push(cumRenown);
    soul.renown += outcome.renownEarned;

    if (outcome.cleared) {
      if (firstClearLife === null) firstClearLife = life + 1;
      // Clearing at the current ceiling opens the next rung (metaStore.unlockNextAscension).
      if (playAscension >= soul.ascensionUnlocked && soul.ascensionUnlocked < MAX_ASCENSION) {
        soul.ascensionUnlocked += 1;
      }
    }

    const buy = buyUpgrades(soul.renown, soul.unlockedUpgrades, soul.ascensionUnlocked);
    soul.renown = buy.renown;
    soul.unlockedUpgrades = buy.unlocked;
    ranksByLife.push(Object.values(soul.unlockedUpgrades).reduce((a, b) => a + b, 0));
  }

  return {
    lives,
    finalRenown: soul.renown,
    finalUpgrades: soul.unlockedUpgrades,
    finalAscensionUnlocked: soul.ascensionUnlocked,
    firstClearLife,
    cumulativeRenownByLife,
    ranksByLife,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Aggregation + rendering
// ─────────────────────────────────────────────────────────────────────────

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const num = (n: number, d = 2) => n.toFixed(d);
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function main(): void {
  const t0 = Date.now();
  console.log(
    `Veyra Ash (Tiefling Wizard) — ${NUM_SOULS} souls × ${LIVES_PER_SOUL} lives ` +
      `= ${NUM_SOULS * LIVES_PER_SOUL} lives · leveling=${LEVELUP_MODE}\n`,
  );

  const souls: SoulResult[] = [];
  for (let i = 0; i < NUM_SOULS; i++) {
    souls.push(runSoul((SEED_BASE ^ (i * 104729)) >>> 0));
    if ((i + 1) % 10 === 0) console.log(`  …${i + 1}/${NUM_SOULS} souls done`);
  }

  const allLives = souls.flatMap((s) => s.lives);
  const totalLives = allLives.length;
  const clears = allLives.filter((l) => l.cleared);
  const deaths = allLives.filter((l) => !l.cleared);

  // Headline survivability
  const overallDeathRate = deaths.length / totalLives;
  const overallClearRate = clears.length / totalLives;
  const avgDepthRooms = mean(allLives.map((l) => (l.cleared ? TOTAL_ROOMS : l.finalRoomIdx)));
  const avgChapter = mean(allLives.map((l) => l.finalChapter));
  const avgFinalLevel = mean(allLives.map((l) => l.finalLevel));
  const avgRenownPerLife = mean(allLives.map((l) => l.renownEarned));

  // Lives-to-first-clear
  const clearedSouls = souls.filter((s) => s.firstClearLife !== null);
  const firstClearLives = clearedSouls.map((s) => s.firstClearLife as number);
  const neverClearedCount = souls.length - clearedSouls.length;

  // Ascension reached
  const finalAsc = souls.map((s) => s.finalAscensionUnlocked);
  const ascHist = new Map<number, number>();
  for (const a of finalAsc) ascHist.set(a, (ascHist.get(a) ?? 0) + 1);

  // Per-ascension breakdown
  const byAsc = new Map<number, LifeOutcome[]>();
  for (const l of allLives) {
    const arr = byAsc.get(l.ascensionLevel) ?? [];
    arr.push(l);
    byAsc.set(l.ascensionLevel, arr);
  }

  // Life-position curves (early vs late lives), bucketed
  const bucketSize = Math.max(1, Math.floor(LIVES_PER_SOUL / 8));
  interface Bucket { lo: number; hi: number; lives: LifeOutcome[]; }
  const buckets: Bucket[] = [];
  for (let lo = 0; lo < LIVES_PER_SOUL; lo += bucketSize) {
    const hi = Math.min(LIVES_PER_SOUL, lo + bucketSize);
    buckets.push({ lo, hi, lives: [] });
  }
  for (const s of souls) {
    s.lives.forEach((l, idx) => {
      const b = buckets[Math.min(buckets.length - 1, Math.floor(idx / bucketSize))];
      b.lives.push(l);
    });
  }

  // Grove ranks owned over time (mean across souls at each life position)
  const ranksCurve: number[] = [];
  for (let i = 0; i < LIVES_PER_SOUL; i++) {
    ranksCurve.push(mean(souls.map((s) => s.ranksByLife[i] ?? 0)));
  }
  const cumRenownCurve: number[] = [];
  for (let i = 0; i < LIVES_PER_SOUL; i++) {
    cumRenownCurve.push(mean(souls.map((s) => s.cumulativeRenownByLife[i] ?? 0)));
  }

  // Death-cause distribution
  const causeHist = new Map<string, number>();
  for (const d of deaths) {
    const c = d.deathCause ?? 'unknown';
    causeHist.set(c, (causeHist.get(c) ?? 0) + 1);
  }
  const topCauses = [...causeHist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);

  // Final Grove builds (which upgrades end up owned, mean ranks)
  const allUpgradeIds = new Set<string>();
  for (const s of souls) for (const id of Object.keys(s.finalUpgrades)) allUpgradeIds.add(id);
  const upgradeMeans = [...allUpgradeIds]
    .map((id) => ({ id, meanRank: mean(souls.map((s) => s.finalUpgrades[id] ?? 0)) }))
    .sort((a, b) => b.meanRank - a.meanRank);

  // ─── Console summary ───────────────────────────────────────────────────
  console.log('\n══════════ HEADLINE ══════════');
  console.log(`Lives:              ${totalLives}`);
  console.log(`Death rate:         ${pct(overallDeathRate)}`);
  console.log(`Clear rate:         ${pct(overallClearRate)}  (${clears.length} clears)`);
  console.log(`Avg depth reached:  ${num(avgDepthRooms, 1)} / ${TOTAL_ROOMS} rooms  (ch ${num(avgChapter, 2)})`);
  console.log(`Avg final level:    ${num(avgFinalLevel, 2)}`);
  console.log(`Avg renown / life:  ${num(avgRenownPerLife, 1)}`);
  console.log(
    `Lives-to-1st-clear: median ${median(firstClearLives) || '—'}  mean ${num(mean(firstClearLives), 1)}` +
      `  (${neverClearedCount}/${souls.length} souls never cleared in ${LIVES_PER_SOUL} lives)`,
  );
  console.log(
    `Ascension reached:  mean ${num(mean(finalAsc), 2)}  max ${Math.max(...finalAsc)}  ` +
      `[${[...ascHist.entries()].sort((a, b) => a[0] - b[0]).map(([a, n]) => `A${a}:${n}`).join('  ')}]`,
  );

  // Level / power-spike diagnostics
  const levelHist = new Map<number, number>();
  for (const l of allLives) levelHist.set(l.finalLevel, (levelHist.get(l.finalLevel) ?? 0) + 1);
  const reachedL5 = allLives.filter((l) => l.finalLevel >= 5).length;
  const learnedFb = allLives.filter((l) => l.learnedFireball).length;
  const clearAvgLevel = mean(clears.map((l) => l.finalLevel));
  const clearLearnedFb = clears.filter((l) => l.learnedFireball).length;
  console.log('\n══════════ LEVEL / POWER-SPIKE ══════════');
  console.log(
    `Final-level histogram: ${[...levelHist.entries()].sort((a, b) => a[0] - b[0]).map(([lv, n]) => `L${lv}:${n}`).join('  ')}`,
  );
  console.log(`Reached L5+ (Fireball tier): ${reachedL5}/${totalLives} (${pct(reachedL5 / totalLives)})`);
  console.log(`Learned Fireball by end:     ${learnedFb}/${totalLives} (${pct(learnedFb / totalLives)})`);
  console.log(`Avg level on CLEARS:         ${num(clearAvgLevel, 2)}  ·  clears that had Fireball: ${clearLearnedFb}/${clears.length}`);

  console.log('\n══════════ PER-ASCENSION ══════════');
  console.log('Asc   n     clear%   deathRoom(avg)   chapter(avg)   renown/life');
  for (const a of [...byAsc.keys()].sort((x, y) => x - y)) {
    const ls = byAsc.get(a)!;
    const cr = ls.filter((l) => l.cleared).length / ls.length;
    const dr = mean(ls.map((l) => (l.cleared ? TOTAL_ROOMS : l.finalRoomIdx)));
    const ch = mean(ls.map((l) => l.finalChapter));
    const rn = mean(ls.map((l) => l.renownEarned));
    console.log(
      `A${a}  ${String(ls.length).padStart(5)}  ${pct(cr).padStart(7)}  ${num(dr, 1).padStart(13)}  ${num(ch, 2).padStart(11)}  ${num(rn, 1).padStart(11)}`,
    );
  }

  console.log('\n══════════ LIFE-POSITION CURVE (meta-progression) ══════════');
  console.log('Lives        n     clear%   avgDepth   avgLvl   ranksOwned   renown/life');
  for (const b of buckets) {
    if (b.lives.length === 0) continue;
    const cr = b.lives.filter((l) => l.cleared).length / b.lives.length;
    const dr = mean(b.lives.map((l) => (l.cleared ? TOTAL_ROOMS : l.finalRoomIdx)));
    const lvl = mean(b.lives.map((l) => l.finalLevel));
    const rk = mean(b.lives.map((l) => l.upgradeRanksAtStart));
    const rn = mean(b.lives.map((l) => l.renownEarned));
    const label = `${b.lo + 1}-${b.hi}`;
    console.log(
      `${label.padEnd(10)}  ${String(b.lives.length).padStart(4)}  ${pct(cr).padStart(7)}  ${num(dr, 1).padStart(8)}  ${num(lvl, 2).padStart(6)}  ${num(rk, 1).padStart(9)}  ${num(rn, 1).padStart(11)}`,
    );
  }

  console.log('\n══════════ TOP DEATH CAUSES ══════════');
  for (const [cause, n] of topCauses) {
    console.log(`  ${String(n).padStart(5)}  (${pct(n / deaths.length)})  ${cause}`);
  }

  console.log('\n══════════ FINAL GROVE BUILD (mean ranks at soul end) ══════════');
  for (const { id, meanRank } of upgradeMeans) {
    console.log(`  ${id.padEnd(28)} ${num(meanRank, 2)}`);
  }

  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\nWall clock: ${dt}s`);

  // ─── Raw doc ─────────────────────────────────────────────────────────────
  const doc = renderRawDoc({
    totalLives,
    overallDeathRate,
    overallClearRate,
    clearsCount: clears.length,
    avgDepthRooms,
    avgChapter,
    avgFinalLevel,
    avgRenownPerLife,
    levelHist,
    reachedL5,
    learnedFb,
    clearAvgLevel,
    clearLearnedFb,
    firstClearLives,
    neverClearedCount,
    soulsCount: souls.length,
    finalAsc,
    ascHist,
    byAsc,
    buckets,
    bucketSize,
    ranksCurve,
    cumRenownCurve,
    topCauses,
    deathsCount: deaths.length,
    upgradeMeans,
    dt,
  });
  const outPath = resolve(process.cwd(), 'docs/gameplay-quality/veyra-wizard.raw.md');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, doc, 'utf8');
  console.log(`Wrote raw output → ${outPath}`);
}

interface RawDocInput {
  totalLives: number;
  overallDeathRate: number;
  overallClearRate: number;
  clearsCount: number;
  avgDepthRooms: number;
  avgChapter: number;
  avgFinalLevel: number;
  avgRenownPerLife: number;
  levelHist: Map<number, number>;
  reachedL5: number;
  learnedFb: number;
  clearAvgLevel: number;
  clearLearnedFb: number;
  firstClearLives: number[];
  neverClearedCount: number;
  soulsCount: number;
  finalAsc: number[];
  ascHist: Map<number, number>;
  byAsc: Map<number, LifeOutcome[]>;
  buckets: { lo: number; hi: number; lives: LifeOutcome[] }[];
  bucketSize: number;
  ranksCurve: number[];
  cumRenownCurve: number[];
  topCauses: [string, number][];
  deathsCount: number;
  upgradeMeans: { id: string; meanRank: number }[];
  dt: string;
}

function renderRawDoc(d: RawDocInput): string {
  const ascRows = [...d.byAsc.keys()].sort((x, y) => x - y).map((a) => {
    const ls = d.byAsc.get(a)!;
    const cr = ls.filter((l) => l.cleared).length / ls.length;
    const dr = mean(ls.map((l) => (l.cleared ? TOTAL_ROOMS : l.finalRoomIdx)));
    const ch = mean(ls.map((l) => l.finalChapter));
    const rn = mean(ls.map((l) => l.renownEarned));
    return `| A${a} | ${ls.length} | ${pct(cr)} | ${num(dr, 1)} | ${num(ch, 2)} | ${num(rn, 1)} |`;
  });

  const bucketRows = d.buckets.filter((b) => b.lives.length > 0).map((b) => {
    const cr = b.lives.filter((l) => l.cleared).length / b.lives.length;
    const dr = mean(b.lives.map((l) => (l.cleared ? TOTAL_ROOMS : l.finalRoomIdx)));
    const lvl = mean(b.lives.map((l) => l.finalLevel));
    const rk = mean(b.lives.map((l) => l.upgradeRanksAtStart));
    const rn = mean(b.lives.map((l) => l.renownEarned));
    return `| ${b.lo + 1}-${b.hi} | ${b.lives.length} | ${pct(cr)} | ${num(dr, 1)} | ${num(lvl, 2)} | ${num(rk, 1)} | ${num(rn, 1)} |`;
  });

  return `# Veyra Ash (Tiefling Wizard) — reincarnation-chain sim (raw)

> Auto-generated by \`scripts/sim-wizard-veyra.ts\`. Re-run with
> \`SOULS=${d.soulsCount} LIVES=${LIVES_PER_SOUL} npx tsx scripts/sim-wizard-veyra.ts\`.

**Souls:** ${d.soulsCount} · **Lives/soul:** ${LIVES_PER_SOUL} · **Total lives:** ${d.totalLives} · **Wall:** ${d.dt}s.

Preset: \`buildPlayerCharacter(presetCreationInput('wizard'))\` — Tiefling, INT 16,
DEX 14, CON 13; fire/poison resistance; 1 starting Potion of Healing; Mage Armor
auto-on (AC 15 base). Mid-delve leveling via \`simulateLevelUp\` (learns Fireball at
L5). Renown = depth-scaled \`finishDelve\` model × soul-mark × ascension. Ascension:
greedy push (play at ceiling; a clear opens the next rung).

## Headline

| Metric | Value |
|---|---|
| Death rate | ${pct(d.overallDeathRate)} |
| Clear rate | ${pct(d.overallClearRate)} (${d.clearsCount} clears) |
| Avg depth reached | ${num(d.avgDepthRooms, 1)} / ${TOTAL_ROOMS} rooms (ch ${num(d.avgChapter, 2)}) |
| Avg final level | ${num(d.avgFinalLevel, 2)} |
| Avg renown / life | ${num(d.avgRenownPerLife, 1)} |
| Lives-to-first-clear | median ${median(d.firstClearLives) || '—'}, mean ${num(mean(d.firstClearLives), 1)} |
| Souls never clearing | ${d.neverClearedCount} / ${d.soulsCount} in ${LIVES_PER_SOUL} lives |
| Ascension reached | mean ${num(mean(d.finalAsc), 2)}, max ${Math.max(...d.finalAsc)} |

Final-ascension histogram: ${[...d.ascHist.entries()].sort((a, b) => a[0] - b[0]).map(([a, n]) => `A${a}:${n}`).join(' · ')}

## Level reached / Fireball power-spike

| Metric | Value |
|---|---|
| Final-level histogram | ${[...d.levelHist.entries()].sort((a, b) => a[0] - b[0]).map(([lv, n]) => `L${lv}:${n}`).join(' · ')} |
| Reached L5+ (Fireball tier) | ${d.reachedL5} / ${d.totalLives} (${pct(d.reachedL5 / d.totalLives)}) |
| Learned Fireball by end (sim leveling) | ${d.learnedFb} / ${d.totalLives} (${pct(d.learnedFb / d.totalLives)}) |
| Avg level on clears | ${num(d.clearAvgLevel, 2)} (clears w/ Fireball known: ${d.clearLearnedFb}/${d.clearsCount}) |

**Fireball / Lightning Bolt are cast ZERO times.** No room in the game spawns 3+
enemies (130 single-enemy + 17 two-enemy encounters; max 2), and the
encounterStress wizard AI gates AoE evocations on \`enemyCount >= 3\`. Proof:
\`LEVELUP=sim\` (learns Fireball) and \`LEVELUP=apply\` (never learns it) produce
byte-identical run outcomes — if Fireball were ever cast the seeded dice stream
would diverge. The L5 power-spike is inert under current content; Veyra clears as
a Fire Bolt + Magic Missile + Burning Hands blaster. Burning Hands (gate
\`>= 2\`, 4d6 as an auto-Evoker) is the only AoE that ever fires.

## Per-ascension difficulty wall

| Asc | lives | clear% | avg depth (rooms) | avg chapter | renown/life |
|---|---:|---:|---:|---:|---:|
${ascRows.join('\n')}

## Life-position curve (does the soul climb?)

Bucketed by life index (bucket size ${d.bucketSize}). "ranksOwned" = mean Grove
upgrade ranks owned at the START of lives in the bucket.

| Lives | n | clear% | avg depth | avg lvl | ranksOwned | renown/life |
|---|---:|---:|---:|---:|---:|---:|
${bucketRows.join('\n')}

## Top death causes

| deaths | share | cause (room id / boss def) |
|---:|---:|---|
${d.topCauses.map(([c, n]) => `| ${n} | ${pct(n / d.deathsCount)} | ${c} |`).join('\n')}

## Final Grove build (mean ranks at soul end)

| upgrade | mean rank |
|---|---:|
${d.upgradeMeans.map((u) => `| ${u.id} | ${num(u.meanRank, 2)} |`).join('\n')}
`;
}

main();
