/**
 * Veyra Ash (Wizard) reincarnation-chain sim — class-focused build on top of
 * `sim-reincarnation-loop.ts`, faithful to the FULL meta loop:
 *
 *   build the real fixed-stat Veyra preset (tiefling: fire/poison resist,
 *   +1 HP/level) → descend the 50-room four-chapter Godwake chain at the
 *   soul's highest-unlocked ascension → fight every room with the SHARED
 *   auto-battle policy (chooseCombatAction / runAutoTurn, #147) → die or clear
 *   → settle DEPTH-scaled renown (room-reached credit + chapter-boss stack +
 *   clear premium, × soul-mark × ascension multiplier) → greedily spend renown
 *   on Druid Grove upgrades → reincarnate (reroll 2 quirks, keep renown + Grove,
 *   reset gear to kit) → repeat. A clear at the current ceiling unlocks the next
 *   ascension rung (Spire-style), so the soul climbs the ladder over its lives.
 *
 * Differences from the generic reincarnation-loop sim (why this exists):
 *  - Uses the ACTUAL selectable character (buildPlayerCharacter +
 *    presetCreationInput('wizard')) — tiefling Veyra, not the human "Quill"
 *    archetype. Resistances + bonus HP materially change wizard survival.
 *  - Levels with simulateLevelUp (auto-learns Misty Step at L3, Fireball at L5).
 *    applyLevelUp alone would leave the wizard unable to cast its best spells.
 *  - Faithful renown (depth credit + ascension renownMult), mirroring
 *    delveStore.finishDelve exactly.
 *  - Passes ascension into createCombat so enemy HP / damage actually scale.
 *
 * READ-ONLY: writes a raw report, mutates no game state.
 *
 * Run:
 *   npx tsx scripts/sim-wizard-reincarnation.ts
 *   SOULS=300 LIVES=80 npx tsx scripts/sim-wizard-reincarnation.ts
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

import { createDiceRoller, setActiveRoller, type DiceRoller } from '../src/engine/dice';
import { getMonster } from '../src/content/monsters';
import { simulateLevelUp, xpForLevel, MAX_LEVEL } from '../src/engine/character/leveling';
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
import {
  rollQuirks,
  renownSoulMarkMultiplier,
  soulMarkMultiplier,
} from '../src/engine/character/quirks';
import { rollBlessingOptions } from '../src/engine/character/blessings';
import {
  buildPlayerCharacter,
  presetCreationInput,
} from '../src/engine/character/defaultCharacter';
import { getAscensionLevel, MAX_ASCENSION } from '../src/engine/delve/ascension';
import type { Character } from '../src/types/character';
import type { CombatState } from '../src/types/combat';
import type { RoomSpec } from '../src/types/delve';

// ─── Knobs ──────────────────────────────────────────────────────────────────
const SOULS = Number(process.env.SOULS ?? 250);
const LIVES_PER_SOUL = Number(process.env.LIVES ?? 70);
const MAX_TURNS_PER_FIGHT = 200;
const SEED_BASE = 0x5eed_a54 >>> 0;

// ─── delveStore.ts renown constants (mirrored 1:1) ───────────────────────────
const RENOWN_PER_DELVE_CLEAR = 50;
const RENOWN_PER_DELVE_FAILURE = 15;
const RENOWN_PER_CHAPTER_BOSS = 10;
const RENOWN_PER_ROOM_REACHED = 1;
const GROVE_UNLOCK_THRESHOLD = 30;

const TOTAL_ROOMS = 50; // 0..49; final boss is room index 49.

// ─── Grove purchase priority (sensible greedy for a Wizard) ──────────────────
// Survival floor first (a d6 wizard dies to one bad opening), then the spell
// edge that compounds across the run, then potions / utility. Greedy buy
// restarts from the top after each purchase, so cheap high-priority ranks land
// before expensive ones. Ids verified against content/upgrades.
const WIZARD_GROVE_PRIORITY: { id: string; maxAtRank: number }[] = [
  { id: 'pilgrims-boots', maxAtRank: 1 },             // +5 ft move, flat 25 — cheap opener
  { id: 'mantle-of-the-wakened', maxAtRank: 5 },      // +5 HP / rank — the survival spine
  { id: 'burning-tongue', maxAtRank: 5 },             // +1 spell dmg / rank — compounds every cast
  { id: 'cloak-of-the-grove', maxAtRank: 3 },         // +1 AC / rank — fewer hits land
  { id: 'mielikki-cache', maxAtRank: 4 },             // +N potions / delve — emergency heals
  { id: 'arcane-focus', maxAtRank: 3 },               // +1 spell attack / rank
  { id: 'sigil-of-the-wakened-mind', maxAtRank: 3 },  // +1 spell save DC / rank
  { id: 'iron-will', maxAtRank: 1 },                  // +5 HP one-shot
  { id: 'hardier-soul', maxAtRank: 3 },               // +1 death-save stabilise / rank
  { id: 'coin-in-pocket', maxAtRank: 3 },             // +gold start / per ch-boss
];

/** Greedy spend between lives. Mirrors metaStore.purchaseUpgrade affordability. */
function buyUpgrades(
  renown: number,
  unlocked: UnlockedUpgrades,
): { renown: number; unlocked: UnlockedUpgrades; purchased: string[] } {
  let r = renown;
  const u: UnlockedUpgrades = { ...unlocked };
  const purchased: string[] = [];
  if (r < GROVE_UNLOCK_THRESHOLD) return { renown: r, unlocked: u, purchased };
  let bought = true;
  let safety = 0;
  while (bought && safety < 80) {
    bought = false;
    safety += 1;
    for (const { id, maxAtRank } of WIZARD_GROVE_PRIORITY) {
      const up = findUpgrade(id);
      if (!up) continue;
      const cur = u[id] ?? 0;
      const target = Math.min(maxAtRank, up.maxRank);
      if (cur >= target) continue;
      const cost = up.costForRank(cur + 1);
      if (r >= cost) {
        r -= cost;
        u[id] = cur + 1;
        purchased.push(`${id}@${cur + 1}`);
        bought = true;
        break;
      }
    }
  }
  return { renown: r, unlocked: u, purchased };
}

/** Bake every owned permanent Grove rank onto a fresh vessel (+ HP fold). */
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

/** The real fixed-stat Veyra Ash vessel, freshly descended for this life. */
function descend(roller: DiceRoller, unlocked: UnlockedUpgrades): Character {
  // gear resets to the wizard kit every descent (startDelve → gearResetToKit),
  // so we rebuild from the preset rather than carrying inventory across lives.
  let c = buildPlayerCharacter(presetCreationInput('wizard'));
  c = applyPermanentUpgrades(c, unlocked);   // Grove permanent ranks (HP/AC/spell power)
  c = applyDelveStartUpgrades(c, unlocked);  // Mielikki's Cache potions, Hardier Soul, etc.
  c = { ...c, quirks: rollQuirks(roller, 2) }; // soul re-marked each death
  return longRest(c); // full HP + fresh slots for the descent
}

// ─── Chapter map (matches createGodwakeDelve room order) ─────────────────────
// Ch1 idx 0–11 (boss 10, camp 11), Ch2 12–24 (boss 23, camp 24),
// Ch3 25–37 (boss 36, camp 37), Ch4 38–49 (boss 49).
function chapterOfRoom(idx: number): number {
  if (idx <= 11) return 1;
  if (idx <= 24) return 2;
  if (idx <= 37) return 3;
  return 4;
}

let timeoutCount = 0; // fights that hit the turn cap (would be false deaths)

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
  const cap = MAX_TURNS_PER_FIGHT * 4;
  while (state.status === 'active' && turns < cap) {
    if (isPlayerTurn(state)) {
      const turn = runAutoTurn(roller, state, character);
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
  if (turns >= cap && state.status === 'active') timeoutCount += 1;
  return { character, victory: state.status === 'player-victory' };
}

interface LifeOutcome {
  ascension: number;
  cleared: boolean;
  roomsReached: number; // deepest room index reached (== currentRoomIdx in finishDelve)
  chapterReached: number;
  deathChapter: number | null; // chapter the run ended in, if it died
  bossesKilled: number;
  finalLevel: number;
  fireballOnline: boolean; // L5+ reached → knows Fireball
  renownEarned: number;
  upgradeRanksAtStart: number;
}

function runLife(
  roller: DiceRoller,
  unlocked: UnlockedUpgrades,
  ascension: number,
  seed: number,
): LifeOutcome {
  let character = descend(roller, unlocked);
  const delve = createGodwakeDelve({ seed, ascension });

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
    if (room.kind === 'event') continue; // events floor HP at 1 (#145); skipped like base sim

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
      const xpGain = Math.floor(rXp * soulMarkMultiplier(character));
      character = { ...character, xp: character.xp + xpGain };
      while (
        character.level < MAX_LEVEL &&
        character.xp >= xpForLevel(character.level + 1)
      ) {
        character = simulateLevelUp(character);
      }
    }
  }

  const cleared = !died;
  const roomsReached = cleared ? TOTAL_ROOMS - 1 : finalRoomIdx;
  const depthRenown = RENOWN_PER_ROOM_REACHED * roomsReached;
  const renownBase =
    (cleared ? RENOWN_PER_DELVE_CLEAR : RENOWN_PER_DELVE_FAILURE) +
    RENOWN_PER_CHAPTER_BOSS * bossesKilled +
    depthRenown;
  const ascensionMult = getAscensionLevel(ascension).renownMult;
  const renownEarned = Math.floor(
    renownBase * renownSoulMarkMultiplier(character) * ascensionMult,
  );

  return {
    ascension,
    cleared,
    roomsReached,
    chapterReached: chapterOfRoom(finalRoomIdx),
    deathChapter: cleared ? null : chapterOfRoom(finalRoomIdx),
    bossesKilled,
    finalLevel: character.level,
    fireballOnline: character.level >= 5,
    renownEarned,
    upgradeRanksAtStart: 0, // filled by caller (owned ranks before this life)
  };
}

interface SoulChain {
  lives: LifeOutcome[];
  cumulativeRenown: number[]; // lifetime renown EARNED through each life (monotonic)
  firstClearLife: number | null;
  livesToAscension: (number | null)[]; // index a = first life reaching ascensionUnlocked >= a
  finalAscensionUnlocked: number;
  finalUpgrades: UnlockedUpgrades;
}

function runSoul(seed: number): SoulChain {
  const roller = createDiceRoller(seed);
  setActiveRoller(seed);

  let renown = 0;
  let unlocked: UnlockedUpgrades = {};
  let ascensionUnlocked = 0;
  let firstClearLife: number | null = null;
  const livesToAscension: (number | null)[] = Array(MAX_ASCENSION + 1).fill(null);
  livesToAscension[0] = 0;

  const lives: LifeOutcome[] = [];
  const cumulativeRenown: number[] = [];
  let lifetimeEarned = 0;

  for (let life = 1; life <= LIVES_PER_SOUL; life++) {
    const ascension = ascensionUnlocked; // climb: always descend at the ceiling
    const ranksAtStart = Object.values(unlocked).reduce((a, b) => a + b, 0);
    const lifeSeed = (seed + life * 7919) >>> 0;
    const outcome = runLife(roller, unlocked, ascension, lifeSeed);
    outcome.upgradeRanksAtStart = ranksAtStart;

    renown += outcome.renownEarned;
    lifetimeEarned += outcome.renownEarned;
    cumulativeRenown.push(lifetimeEarned);
    lives.push(outcome);

    if (outcome.cleared) {
      if (firstClearLife === null) firstClearLife = life;
      if (ascension >= ascensionUnlocked && ascensionUnlocked < MAX_ASCENSION) {
        ascensionUnlocked += 1;
        if (livesToAscension[ascensionUnlocked] === null) {
          livesToAscension[ascensionUnlocked] = life;
        }
      }
    }

    const buy = buyUpgrades(renown, unlocked);
    renown = buy.renown;
    unlocked = buy.unlocked;
  }

  return {
    lives,
    cumulativeRenown,
    firstClearLife,
    livesToAscension,
    finalAscensionUnlocked: ascensionUnlocked,
    finalUpgrades: unlocked,
  };
}

// ─── Aggregation ─────────────────────────────────────────────────────────────
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const num = (n: number, d = 2) => n.toFixed(d);

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}
function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

interface PerLifeAgg {
  life: number;
  n: number;
  deathRate: number;
  clearRate: number;
  avgRooms: number;
  avgChapter: number;
  avgFinalLevel: number;
  avgRenownEarned: number;
  avgCumRenown: number;
  avgUpgradeRanks: number;
  avgAscension: number;
}

function main(): void {
  const t0 = Date.now();
  console.log(
    `Veyra Ash (Wizard) reincarnation sim — ${SOULS} souls × ${LIVES_PER_SOUL} lives = ${SOULS * LIVES_PER_SOUL} lives\n`,
  );

  const souls: SoulChain[] = [];
  for (let i = 0; i < SOULS; i++) {
    const seed = (SEED_BASE ^ (i * 2654435761)) >>> 0;
    souls.push(runSoul(seed));
    if ((i + 1) % 50 === 0) {
      process.stdout.write(`  …${i + 1}/${SOULS} souls (${((Date.now() - t0) / 1000).toFixed(1)}s)\n`);
    }
  }

  // Per-life-position aggregation.
  const perLife: PerLifeAgg[] = [];
  for (let p = 0; p < LIVES_PER_SOUL; p++) {
    const ls = souls.map((s) => s.lives[p]).filter(Boolean);
    if (!ls.length) continue;
    const cum = souls.map((s) => s.cumulativeRenown[p]).filter((x) => x !== undefined);
    perLife.push({
      life: p + 1,
      n: ls.length,
      deathRate: ls.filter((l) => !l.cleared).length / ls.length,
      clearRate: ls.filter((l) => l.cleared).length / ls.length,
      avgRooms: mean(ls.map((l) => l.roomsReached + 1)), // +1: rooms cleared count, not 0-based idx
      avgChapter: mean(ls.map((l) => l.chapterReached)),
      avgFinalLevel: mean(ls.map((l) => l.finalLevel)),
      avgRenownEarned: mean(ls.map((l) => l.renownEarned)),
      avgCumRenown: mean(cum),
      avgUpgradeRanks: mean(ls.map((l) => l.upgradeRanksAtStart)),
      avgAscension: mean(ls.map((l) => l.ascension)),
    });
  }

  // Whole-chain stats.
  const allLives = souls.flatMap((s) => s.lives);
  const overallDeathRate = allLives.filter((l) => !l.cleared).length / allLives.length;
  const overallClearRate = allLives.filter((l) => l.cleared).length / allLives.length;
  const firstClears = souls.map((s) => s.firstClearLife).filter((x): x is number => x !== null);
  const neverCleared = souls.filter((s) => s.firstClearLife === null).length;

  // Ascension reached histogram (final unlocked after the window).
  const ascHist: Record<number, number> = {};
  for (const s of souls) ascHist[s.finalAscensionUnlocked] = (ascHist[s.finalAscensionUnlocked] ?? 0) + 1;

  // Mean lives to first reach each ascension rung (souls that reached it).
  const livesToAsc: { rung: number; reachedPct: number; meanLife: number; medianLife: number }[] = [];
  for (let a = 1; a <= MAX_ASCENSION; a++) {
    const reached = souls
      .map((s) => s.livesToAscension[a])
      .filter((x): x is number => x !== null);
    livesToAsc.push({
      rung: a,
      reachedPct: reached.length / souls.length,
      meanLife: mean(reached),
      medianLife: median(reached),
    });
  }

  // Clear rate by ascension level (across all lives played at that level).
  const byAsc: Record<number, { played: number; cleared: number; avgRooms: number[] }> = {};
  for (const l of allLives) {
    const b = (byAsc[l.ascension] ??= { played: 0, cleared: 0, avgRooms: [] });
    b.played += 1;
    if (l.cleared) b.cleared += 1;
    b.avgRooms.push(l.roomsReached + 1);
  }

  // Death-chapter histogram (where the wall is) across all non-cleared lives.
  const deathChapHist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const l of allLives) if (l.deathChapter !== null) deathChapHist[l.deathChapter] += 1;
  const totalDeaths = allLives.filter((l) => !l.cleared).length;

  // Fireball-online: share of lives that reach L5+ (the wizard's payload spell).
  const fireballOnlineRate = mean(allLives.map((l) => (l.fireballOnline ? 1 : 0)));
  // Deepest room ever reached per soul (best single life).
  const deepestEver = souls.map((s) => Math.max(...s.lives.map((l) => l.roomsReached + 1)));

  // Grove adoption: how many souls own ≥1 rank of each priority upgrade at end.
  const adoption: Record<string, { ranks: number[]; owners: number }> = {};
  for (const { id } of WIZARD_GROVE_PRIORITY) adoption[id] = { ranks: [], owners: 0 };
  for (const s of souls) {
    for (const { id } of WIZARD_GROVE_PRIORITY) {
      const r = s.finalUpgrades[id] ?? 0;
      adoption[id].ranks.push(r);
      if (r > 0) adoption[id].owners += 1;
    }
  }

  // ── Console summary ──
  console.log(`\n=== Veyra Ash · Wizard — ${SOULS}×${LIVES_PER_SOUL} = ${allLives.length} lives ===`);
  console.log(`Overall per-life death ${pct(overallDeathRate)} | clear ${pct(overallClearRate)}`);
  console.log(
    `Lives-to-first-clear: mean ${num(mean(firstClears), 2)} median ${median(firstClears)} | never cleared ${neverCleared}/${SOULS} (${pct(neverCleared / SOULS)})`,
  );
  console.log(`Final ascension unlocked: ${Object.entries(ascHist).sort((a, b) => Number(a[0]) - Number(b[0])).map(([k, v]) => `A${k}=${v}`).join(' ')}`);
  console.log(`Deepest room ever (best life): mean ${num(mean(deepestEver), 1)}/${TOTAL_ROOMS} max ${Math.max(...deepestEver)}`);
  console.log(`Fireball online (L5+) share of lives: ${pct(fireballOnlineRate)} | combat timeouts: ${timeoutCount}`);
  console.log(`Death by chapter (of ${totalDeaths} deaths): ${Object.entries(deathChapHist).map(([k, v]) => `Ch${k}=${v} (${pct(v / Math.max(1, totalDeaths))})`).join(' ')}`);
  console.log(`\nClear rate by ascension played:`);
  for (const a of Object.keys(byAsc).map(Number).sort((x, y) => x - y)) {
    const b = byAsc[a];
    console.log(`  A${a}: ${b.played} lives, clear ${pct(b.cleared / b.played)}, avg rooms ${num(mean(b.avgRooms), 1)}/${TOTAL_ROOMS}`);
  }
  console.log(`\nMean lives to reach each ascension rung:`);
  for (const x of livesToAsc) {
    console.log(`  A${x.rung}: reached by ${pct(x.reachedPct)} of souls, mean life ${num(x.meanLife, 1)} median ${x.medianLife}`);
  }
  console.log(`\nPer-life curve (first 12 + every 5th):`);
  for (const p of perLife) {
    if (p.life <= 12 || p.life % 5 === 0) {
      console.log(
        `  L${String(p.life).padStart(2)}: death ${pct(p.deathRate).padStart(6)} clear ${pct(p.clearRate).padStart(6)} | rooms ${num(p.avgRooms, 1).padStart(4)} ch ${num(p.avgChapter, 2)} lvl ${num(p.avgFinalLevel, 1)} | ren/life ${num(p.avgRenownEarned, 0).padStart(4)} cum ${num(p.avgCumRenown, 0).padStart(6)} ranks ${num(p.avgUpgradeRanks, 1).padStart(4)} asc ${num(p.avgAscension, 2)}`,
      );
    }
  }

  const wall = ((Date.now() - t0) / 1000).toFixed(1);
  const doc = renderDoc({
    perLife,
    overallDeathRate,
    overallClearRate,
    firstClears,
    neverCleared,
    ascHist,
    livesToAsc,
    byAsc,
    adoption,
    deathChapHist,
    totalDeaths,
    fireballOnlineRate,
    deepestEver,
    timeouts: timeoutCount,
    totalLives: allLives.length,
    wall,
  });
  const outPath = resolve(process.cwd(), 'docs/gameplay-quality/wizard-reincarnation.raw.md');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, doc, 'utf8');
  console.log(`\nWrote raw report → ${outPath}  (${wall}s wall)`);
}

interface DocInput {
  perLife: PerLifeAgg[];
  overallDeathRate: number;
  overallClearRate: number;
  firstClears: number[];
  neverCleared: number;
  ascHist: Record<number, number>;
  livesToAsc: { rung: number; reachedPct: number; meanLife: number; medianLife: number }[];
  byAsc: Record<number, { played: number; cleared: number; avgRooms: number[] }>;
  adoption: Record<string, { ranks: number[]; owners: number }>;
  deathChapHist: Record<number, number>;
  totalDeaths: number;
  fireballOnlineRate: number;
  deepestEver: number[];
  timeouts: number;
  totalLives: number;
  wall: string;
}

function renderDoc(d: DocInput): string {
  const lines: string[] = [];
  lines.push('# Veyra Ash (Wizard) — reincarnation-chain sim (raw)');
  lines.push('');
  lines.push(`> Auto-generated by \`scripts/sim-wizard-reincarnation.ts\`. Re-run with`);
  lines.push(`> \`SOULS=${SOULS} LIVES=${LIVES_PER_SOUL} npx tsx scripts/sim-wizard-reincarnation.ts\`.`);
  lines.push('');
  lines.push(`**Souls:** ${SOULS} · **Lives/soul:** ${LIVES_PER_SOUL} · **Total lives:** ${d.totalLives} · **Wall:** ${d.wall}s`);
  lines.push('');
  lines.push('## Headline');
  lines.push('');
  lines.push(`- Per-life death rate: **${pct(d.overallDeathRate)}** · clear rate: **${pct(d.overallClearRate)}** (across all lives, all ascensions).`);
  lines.push(`- Lives-to-first-clear: mean **${num(mean(d.firstClears), 2)}**, median **${median(d.firstClears)}** · never cleared in window: ${d.neverCleared}/${SOULS} (${pct(d.neverCleared / SOULS)}).`);
  lines.push(`- Final ascension unlocked: ${Object.entries(d.ascHist).sort((a, b) => Number(a[0]) - Number(b[0])).map(([k, v]) => `A${k}=${v}`).join(', ')}.`);
  lines.push(`- Deepest room ever (best life/soul): mean **${num(mean(d.deepestEver), 1)}/${TOTAL_ROOMS}**, max ${Math.max(...d.deepestEver)}.`);
  lines.push(`- Fireball online (L5+ reached) in **${pct(d.fireballOnlineRate)}** of lives. Combat turn-cap timeouts (would be false deaths): ${d.timeouts}.`);
  lines.push('');
  lines.push('## Where the wall is — deaths by chapter');
  lines.push('');
  lines.push('| Chapter | Deaths | Share |');
  lines.push('|--------:|-------:|------:|');
  for (const c of [1, 2, 3, 4]) {
    lines.push(`| Ch${c} | ${d.deathChapHist[c]} | ${pct(d.deathChapHist[c] / Math.max(1, d.totalDeaths))} |`);
  }
  lines.push('');
  lines.push('## Clear rate by ascension played');
  lines.push('');
  lines.push('| Ascension | Lives played | Clear% | Avg rooms (/50) |');
  lines.push('|----------:|-------------:|-------:|----------------:|');
  for (const a of Object.keys(d.byAsc).map(Number).sort((x, y) => x - y)) {
    const b = d.byAsc[a];
    lines.push(`| A${a} | ${b.played} | ${pct(b.cleared / b.played)} | ${num(mean(b.avgRooms), 1)} |`);
  }
  lines.push('');
  lines.push('## Lives to reach each ascension rung');
  lines.push('');
  lines.push('| Rung | Souls reaching | Mean life | Median life |');
  lines.push('|-----:|---------------:|----------:|------------:|');
  for (const x of d.livesToAsc) {
    lines.push(`| A${x.rung} | ${pct(x.reachedPct)} | ${num(x.meanLife, 1)} | ${x.medianLife} |`);
  }
  lines.push('');
  lines.push('## Grove adoption (end of window)');
  lines.push('');
  lines.push('| Upgrade | Owners% | Mean rank |');
  lines.push('|---------|--------:|----------:|');
  for (const { id } of WIZARD_GROVE_PRIORITY) {
    const a = d.adoption[id];
    lines.push(`| ${id} | ${pct(a.owners / SOULS)} | ${num(mean(a.ranks), 2)} |`);
  }
  lines.push('');
  lines.push('## Per-life curve');
  lines.push('');
  lines.push('| Life | n | Death% | Clear% | Avg rooms | Avg chapter | Avg lvl | Renown/life | Cum renown | Upgrade ranks | Avg ascension |');
  lines.push('|----:|--:|------:|------:|---------:|-----------:|-------:|-----------:|----------:|-------------:|-------------:|');
  for (const p of d.perLife) {
    lines.push(
      `| ${p.life} | ${p.n} | ${pct(p.deathRate)} | ${pct(p.clearRate)} | ${num(p.avgRooms, 1)} | ${num(p.avgChapter, 2)} | ${num(p.avgFinalLevel, 1)} | ${num(p.avgRenownEarned, 0)} | ${num(p.avgCumRenown, 0)} | ${num(p.avgUpgradeRanks, 1)} | ${num(p.avgAscension, 2)} |`,
    );
  }
  lines.push('');
  return lines.join('\n');
}

main();
