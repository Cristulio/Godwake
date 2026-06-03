/**
 * Fighter L1-FLOOR diagnostic harness.
 *
 * The leveled-start `sim-feel` pass put the Fighter dead-last at L1 (depth 3.4
 * rooms) yet deepest from L3 on (60+). Since the Fighter is the delve-0 STARTER,
 * that L1 floor is literally a new player's first life — the harshest read in the
 * game. This harness pins WHY the L1 Fighter dies and pressure-tests candidate
 * L1 cushions, WITHOUT shipping any balance change.
 *
 * It walks the same real delve loop as `sim-feel` (createGodwakeDelve →
 * createCombat → the shared Auto-Battle policy → monsterAttack), but instruments
 * the L1 death precisely:
 *
 *   - DEPTH      rooms-reached distribution (mean / median / p90 / max) + the
 *                share of lives that even reach Chapter 2 / 3.
 *   - DEATH      which chapter / room-kind the killing fight sat in, the HP the
 *                life walked INTO that fight with (burst vs attrition), and the
 *                enemy compositions that land the kill ("what kills it").
 *   - KILL-SPEED rounds per WON fight + won-fight min-HP (does it win clean or
 *                claw?) — the offense read behind a slow single-attacker.
 *   - PRESSURE   damage taken per enemy turn — the size of the cushion the kit
 *                is missing.
 *
 * ── AI-FLOOR CAVEAT ──────────────────────────────────────────────────────────
 * Absolute depths are an Auto-Battle artifact; read them RELATIVE (Fighter vs
 * the other starters, baseline vs candidate). The Fighter is decision-forgiving
 * (attack, Second Wind when low, spend Resolve), so its bot L1 floor is about as
 * representative as the bot gets — see feedback-balance-from-sims.
 *
 * ── CANDIDATE MODES (measurement only; NOTHING here ships) ───────────────────
 * Phases flip `process.env.SIM_FIGHTER_BUFF`, read by a THROWAWAY experimental
 * block in the engine (printed verbatim in the findings doc appendix). Two of the
 * phases (temp-HP, extra Second Wind) are modelled purely sim-side here through
 * fields the engine already owns (`hp.temp`, `secondWindBonusRemaining`), so they
 * stay faithful and need no engine edit. The disadvantage / flat-DR / physical-
 * halve phases DO need the engine block; WITHOUT it those phases silently measure
 * baseline (the script prints a probe check so you can tell). The block is reverted
 * before the PR — the diagnostic ships findings + this harness, never a buff.
 *
 *   N=300 BAND_N=80 npx tsx scripts/sim-fighter-l1.ts     # default
 *   N=60  BAND_N=20 npx tsx scripts/sim-fighter-l1.ts     # smoke
 *   FULL_CHAIN=1 npx tsx scripts/sim-fighter-l1.ts        # NG+ chain (default base)
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

import { createDiceRoller, setActiveRoller, type DiceRoller } from '../src/engine/dice';
import { getMonster } from '../src/content/monsters';
import { createGodwakeDelve } from '../src/engine/delve/createDelve';
import { createCombat, _resetMonsterInstanceCounter } from '../src/engine/combat/createCombat';
import { monsterAttack } from '../src/engine/combat/attack';
import { endTurn } from '../src/engine/combat/turn';
import { chooseCombatAction, applyPlannedAction } from '../src/engine/combat/actionPolicy';
import { simulateLevelUp, xpForLevel, MAX_LEVEL } from '../src/engine/character/leveling';
import { shortRestHeal, longRest, withResetActionEconomy } from '../src/engine/character/actions';
import { characterAtLevel, pickBlessingAtShrine } from '../src/test/sim/encounterStress';
import type { Character } from '../src/types/character';
import type { CombatState } from '../src/types/combat';
import type { RoomSpec } from '../src/types/delve';
import type { ClassId } from '../src/schemas/ids';

// ─── Config ──────────────────────────────────────────────────────────────────

/** Lives per class for the L1 deep-dive (single short L1 lives → cheap). */
const N = Number(process.env.N ?? 300);
/** Lives per class per level for the L1/3/5/7 band-preservation check. */
const BAND_N = Number(process.env.BAND_N ?? 80);
/** Default BASE chain (Cells→Irenicus) — the first-life experience. */
const FULL_CHAIN = process.env.FULL_CHAIN === '1';
const ASCENSION = 0;
const SEED_BASE = 0xf16b >>> 0;
const ARCHETYPE = 'balanced' as const;
const MAX_ROUNDS = 25;
const MAX_STEPS = MAX_ROUNDS * 8;

/** The five sim-feel field classes; Fighter and the two other STARTERS first. */
const FIELD: ClassId[] = ['fighter', 'barbarian', 'ranger', 'rogue', 'wizard'];
const BAND_LEVELS = [1, 3, 5, 7];

/** A won fight whose HP never dipped below this was a zero-tension blowout. */
const BLOWOUT_FLOOR = 0.8;

/**
 * Candidate cushions. `env` drives the engine block (disadvantage / DR / halve);
 * `tempHpBase` and `bonusSecondWind` are applied sim-side through existing engine
 * fields. All are gated to Fighter L1–4 so they FADE by L5 (the #282 pattern) —
 * the harness verifies the fade by checking Fighter L5/7 == baseline.
 */
interface Phase {
  id: string;
  label: string;
  env?: string;
  tempHpBase?: number;
  bonusSecondWind?: number;
}
const PHASES: Phase[] = [
  { id: 'base', label: 'baseline (no cushion)' },
  { id: 'halve', label: 'CONTROL: Rage-style halve physical (L1–4)', env: 'halve' },
  { id: 'dodge', label: 'A1: first incoming attack/round at disadvantage (L1–4)', env: 'dodge' },
  { id: 'dr2', label: 'A2: flat damage reduction 2 per hit (L1–4)', env: 'dr2' },
  { id: 'dr3', label: 'A2: flat damage reduction 3 per hit (L1–4)', env: 'dr3' },
  { id: 'temphp3', label: 'A3: temp HP (3 + level) at combat start (L1–4)', tempHpBase: 3 },
  { id: 'temphp5', label: 'A3: temp HP (5 + level) at combat start (L1–4)', tempHpBase: 5 },
  { id: 'sw', label: 'B: +1 Second Wind charge (L1–4)', bonusSecondWind: 1 },
];
const FIGHTER_BUFF_MAX_LEVEL = 4;

// ─── Per-life record ─────────────────────────────────────────────────────────

interface FightLog {
  chapter: number;
  kind: RoomSpec['kind'];
  enemyNames: string[];
  compKey: string;
  rounds: number;
  victory: boolean;
  startHpPct: number;
  minHpPct: number;
  enemyTurns: number;
  damageTaken: number;
}

interface Life {
  classId: ClassId;
  startLevel: number;
  roomsReached: number;
  combatsWon: number;
  maxChapter: number;
  died: boolean;
  deathChapter: number | null;
  deathKind: RoomSpec['kind'] | null;
  deathComp: string | null;
  deathEnterHpPct: number | null;
  deathRounds: number | null;
  fights: FightLog[];
}

function applyFighterSimSideBuff(ch: Character, phase: Phase): Character {
  if (ch.classId !== 'fighter' || ch.level > FIGHTER_BUFF_MAX_LEVEL) return ch;
  let next = ch;
  if (phase.tempHpBase != null) {
    next = { ...next, hp: { ...next.hp, temp: Math.max(next.hp.temp, phase.tempHpBase + next.level) } };
  }
  if (phase.bonusSecondWind != null) {
    next = {
      ...next,
      resources: {
        ...next.resources,
        secondWindBonusRemaining: (next.resources.secondWindBonusRemaining ?? 0) + phase.bonusSecondWind,
      },
    };
  }
  return next;
}

// ─── Combat driver (instrumented) ────────────────────────────────────────────

function runFight(
  roller: DiceRoller,
  characterIn: Character,
  room: RoomSpec,
  phase: Phase,
): { fight: FightLog; character: Character } {
  _resetMonsterInstanceCounter();
  const monsterRefs = (room.monsters ?? []).flatMap((rm) => {
    const def = getMonster(rm.defId);
    return Array.from({ length: rm.count }, (_, i) => ({
      def,
      displayName: rm.displayPrefix ? `${rm.displayPrefix} ${i + 1}` : def.name,
    }));
  });

  const isBoss = room.kind === 'boss';
  const isElite = room.kind === 'elite';
  const init = createCombat({
    roller,
    character: withResetActionEconomy(characterIn),
    monsters: monsterRefs,
    ascension: ASCENSION,
    isBoss,
    isElite,
    twistId: room.twistId,
  });
  let s = init.state;
  let ch = applyFighterSimSideBuff(init.character, phase);

  const startHpPct = ch.hp.current / ch.hp.max;
  let minHpPct = startHpPct;
  let enemyTurns = 0;
  let damageTaken = 0;

  const enemyNames = monsterRefs.map((m) => m.def.name);
  const compKey = countKey(monsterRefs.map((m) => m.def.id));

  let guard = 0;
  while (s.status === 'active' && guard < MAX_STEPS) {
    guard += 1;
    if (s.round > MAX_ROUNDS) break;
    const currentId = s.turnOrder[s.currentTurnIndex];

    if (currentId === 'player') {
      if (ch.hp.current <= 0) break;
      for (let i = 0; i < 16; i += 1) {
        if (s.status !== 'active') break;
        const action = chooseCombatAction(s, ch, ARCHETYPE);
        if (action.kind === 'end-turn') break;
        const r = applyPlannedAction({ roller, state: s, character: ch }, action);
        if (r.state === s && r.character === ch) break;
        s = r.state;
        ch = r.character;
        minHpPct = Math.min(minHpPct, ch.hp.current / ch.hp.max);
      }
      if (s.status !== 'active') break;
      const e = endTurn(s, ch);
      s = e.state;
      ch = e.character;
    } else {
      enemyTurns += 1;
      const hpBefore = ch.hp.current + ch.hp.temp;
      const r = monsterAttack({ roller, character: ch, state: s }, currentId);
      s = r.state;
      ch = r.character;
      damageTaken += Math.max(0, hpBefore - (ch.hp.current + ch.hp.temp));
      minHpPct = Math.min(minHpPct, ch.hp.current / ch.hp.max);
      if (s.status !== 'active') break;
      const e = endTurn(s, ch);
      s = e.state;
      ch = e.character;
    }
  }

  const victory = s.status === 'player-victory';
  return {
    fight: {
      chapter: room.chapter ?? 0,
      kind: room.kind,
      enemyNames,
      compKey,
      rounds: s.round,
      victory,
      startHpPct,
      minHpPct,
      enemyTurns,
      damageTaken,
    },
    character: ch,
  };
}

// ─── Run driver (walk the full delve, single life) ───────────────────────────

function runOneLife(classId: ClassId, startLevel: number, seed: number, phase: Phase): Life {
  const roller = createDiceRoller(seed);
  setActiveRoller(seed);
  let character = characterAtLevel(classId, startLevel);
  const delve = createGodwakeDelve({ seed, ascension: ASCENSION, fullChain: FULL_CHAIN });

  const life: Life = {
    classId,
    startLevel,
    roomsReached: 0,
    combatsWon: 0,
    maxChapter: 0,
    died: false,
    deathChapter: null,
    deathKind: null,
    deathComp: null,
    deathEnterHpPct: null,
    deathRounds: null,
    fights: [],
  };

  const byId = new Map(delve.rooms.map((r) => [r.id, r] as const));
  const isBranching = delve.rooms.some((r) => (r.next?.length ?? 0) > 0);
  let curId: string | undefined = delve.rooms[0]?.id;
  const visited = new Set<string>();

  while (curId && !visited.has(curId)) {
    visited.add(curId);
    const room = byId.get(curId);
    if (!room) break;
    life.roomsReached += 1;
    life.maxChapter = Math.max(life.maxChapter, room.chapter ?? 0);

    if (room.kind === 'rest') {
      character = shortRestHeal(character, Math.floor(character.hp.max * 0.7));
    } else if (room.kind === 'camp') {
      character = longRest(character);
    } else if (room.kind === 'shrine') {
      character = pickBlessingAtShrine(roller, character);
    } else if (room.kind === 'event' || room.kind === 'shop' || room.kind === 'treasure') {
      // sim skips these the way sim-feel does
    } else {
      const enterHpPct = character.hp.current / character.hp.max;
      const { fight, character: after } = runFight(roller, character, room, phase);
      character = after;
      life.fights.push(fight);

      if (!fight.victory) {
        life.died = true;
        life.deathChapter = fight.chapter;
        life.deathKind = fight.kind;
        life.deathComp = fight.enemyNames.join(' + ');
        life.deathEnterHpPct = enterHpPct;
        life.deathRounds = fight.rounds;
        break;
      }
      life.combatsWon += 1;

      const xp = room.xpReward ?? 0;
      if (xp > 0) {
        character = { ...character, xp: character.xp + xp };
        while (character.level < MAX_LEVEL && character.xp >= xpForLevel(character.level + 1)) {
          character = simulateLevelUp(character);
        }
      }
    }

    const nexts = room.next ?? [];
    if (nexts.length >= 1) {
      const idx = nexts.length === 1 ? 0 : roller.roll({ count: 1, die: 20, modifier: 0 }).total % nexts.length;
      curId = nexts[idx];
    } else if (isBranching || room.kind === 'boss') {
      break;
    } else {
      const ni = delve.rooms.findIndex((r) => r.id === curId) + 1;
      curId = ni > 0 && ni < delve.rooms.length ? delve.rooms[ni].id : undefined;
    }
  }

  return life;
}

function runCohort(classId: ClassId, level: number, n: number, phase: Phase): Life[] {
  // Drive the (throwaway) engine block for this cohort. Reverted block → inert.
  process.env.SIM_FIGHTER_BUFF = phase.env ?? '';
  const lives: Life[] = [];
  for (let i = 0; i < n; i += 1) {
    // Seed schedule keyed on class+level+i only (NOT phase) so every phase is a
    // PAIRED comparison on the identical seed sequence.
    const seed = (SEED_BASE + hashStr(`${classId}|${level}|${i}`)) >>> 0;
    lives.push(runOneLife(classId, level, seed, phase));
  }
  return lives;
}

// ─── Stats helpers ───────────────────────────────────────────────────────────

function countKey(ids: string[]): string {
  const m = new Map<string, number>();
  for (const id of ids) m.set(id, (m.get(id) ?? 0) + 1);
  return [...m.entries()].sort().map(([k, v]) => `${k}:${v}`).join(',');
}
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
function quantile(xs: number[], q: number): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const idx = Math.min(s.length - 1, Math.max(0, Math.floor(q * (s.length - 1))));
  return s[idx];
}
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const f1 = (n: number) => n.toFixed(1);
const f2 = (n: number) => n.toFixed(2);

interface Cohort {
  classId: ClassId;
  level: number;
  phase: string;
  lives: Life[];
}

function depthStats(lives: Life[]) {
  const depth = lives.map((l) => l.roomsReached);
  const reachedCh2 = lives.filter((l) => l.maxChapter >= 2).length / Math.max(1, lives.length);
  const reachedCh3 = lives.filter((l) => l.maxChapter >= 3).length / Math.max(1, lives.length);
  return {
    n: lives.length,
    meanDepth: mean(depth),
    medianDepth: quantile(depth, 0.5),
    p90Depth: quantile(depth, 0.9),
    maxDepth: Math.max(0, ...depth),
    reachedCh2,
    reachedCh3,
  };
}

function combatStats(lives: Life[]) {
  const allFights = lives.flatMap((l) => l.fights);
  const won = allFights.filter((f) => f.victory);
  const wonRounds = won.map((f) => f.rounds);
  const wonMinHp = won.map((f) => f.minHpPct);
  const blowouts = won.filter((f) => f.minHpPct >= BLOWOUT_FLOOR).length;
  const dmgPerEnemyTurn = allFights
    .filter((f) => f.enemyTurns > 0)
    .map((f) => f.damageTaken / f.enemyTurns);
  return {
    fights: allFights.length,
    meanWonRounds: mean(wonRounds),
    meanWonMinHp: mean(wonMinHp),
    blowoutPct: blowouts / Math.max(1, won.length),
    meanDmgPerEnemyTurn: mean(dmgPerEnemyTurn),
  };
}

function deathStats(lives: Life[]) {
  const dead = lives.filter((l) => l.died);
  const byChapter = new Map<number, number>();
  const byComp = new Map<string, number>();
  const enterHp: number[] = [];
  for (const l of dead) {
    byChapter.set(l.deathChapter ?? 0, (byChapter.get(l.deathChapter ?? 0) ?? 0) + 1);
    if (l.deathComp) byComp.set(l.deathComp, (byComp.get(l.deathComp) ?? 0) + 1);
    if (l.deathEnterHpPct != null) enterHp.push(l.deathEnterHpPct);
  }
  const topComps = [...byComp.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const chapterHist = [...byChapter.entries()].sort((a, b) => a[0] - b[0]);
  return {
    deaths: dead.length,
    deathRate: dead.length / Math.max(1, lives.length),
    meanEnterHp: mean(enterHp),
    burstShare: enterHp.filter((h) => h >= 0.8).length / Math.max(1, enterHp.length),
    chapterHist,
    topComps,
  };
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main(): void {
  const out: string[] = [];
  const log = (s = '') => out.push(s);

  log(`# Fighter L1-floor diagnostic — raw sim output`);
  log('');
  log(
    `Chain: ${FULL_CHAIN ? 'FULL/NG+' : 'BASE (Cells→Irenicus)'} · Ascension ${ASCENSION} · ` +
      `Archetype ${ARCHETYPE} · L1 cohort N=${N} · band cohort N=${BAND_N}`,
  );
  log(`Seed base 0x${SEED_BASE.toString(16)} · paired seed schedule across phases.`);
  log('');

  // Probe: is the engine experimental block present? Run one fighter L1 cohort
  // under `halve` and compare incoming damage to baseline.
  const probeBase = combatStats(runCohort('fighter', 1, 40, PHASES[0]));
  const probeHalve = combatStats(runCohort('fighter', 1, 40, { id: 'p', label: 'p', env: 'halve' }));
  const engineBlockActive = Math.abs(probeBase.meanDmgPerEnemyTurn - probeHalve.meanDmgPerEnemyTurn) > 0.05;
  log(
    `> Engine experimental block: **${engineBlockActive ? 'ACTIVE' : 'ABSENT'}** ` +
      `(probe dmg/enemy-turn base ${f2(probeBase.meanDmgPerEnemyTurn)} vs halve ${f2(probeHalve.meanDmgPerEnemyTurn)}). ` +
      `${engineBlockActive ? '' : 'env-driven phases (halve/dodge/dr*) are measuring BASELINE — re-add the appendix block to measure them.'}`,
  );
  log('');

  // ── 1. L1 field head-to-head (baseline) ──────────────────────────────────
  log(`## 1. L1 floor — field head-to-head (baseline)`);
  log('');
  log(`| Class | n | mean | median | p90 | max | →Ch2 | →Ch3 | death% | mean death ch | mean rounds/won | won minHP | blowout% | dmg/enemy-turn |`);
  log(`|-------|--:|-----:|-------:|----:|----:|-----:|-----:|-------:|--------------:|----------------:|----------:|---------:|---------------:|`);
  const baseL1: Record<string, Life[]> = {};
  for (const cls of FIELD) {
    const lives = runCohort(cls, 1, N, PHASES[0]);
    baseL1[cls] = lives;
    const d = depthStats(lives);
    const c = combatStats(lives);
    const x = deathStats(lives);
    const meanDeathCh = mean(lives.filter((l) => l.died).map((l) => l.deathChapter ?? 0));
    log(
      `| ${cls} | ${d.n} | ${f2(d.meanDepth)} | ${d.medianDepth} | ${d.p90Depth} | ${d.maxDepth} | ` +
        `${pct(d.reachedCh2)} | ${pct(d.reachedCh3)} | ${pct(x.deathRate)} | ${f1(meanDeathCh)} | ` +
        `${f2(c.meanWonRounds)} | ${pct(c.meanWonMinHp)} | ${pct(c.blowoutPct)} | ${f2(c.meanDmgPerEnemyTurn)} |`,
    );
  }
  log('');

  // ── 2. What kills the L1 Fighter ─────────────────────────────────────────
  log(`## 2. What kills the L1 Fighter (baseline) — vs the other starters`);
  log('');
  for (const cls of ['fighter', 'barbarian', 'ranger'] as ClassId[]) {
    const x = deathStats(baseL1[cls]);
    log(`### ${cls}`);
    log(
      `deaths ${x.deaths}/${baseL1[cls].length} (${pct(x.deathRate)}) · ` +
        `mean HP entering the lethal fight ${pct(x.meanEnterHp)} · ` +
        `burst share (entered ≥80% HP) ${pct(x.burstShare)}`,
    );
    log(`death-chapter histogram: ${x.chapterHist.map(([ch, n]) => `Ch${ch}:${n}`).join('  ') || '—'}`);
    log(`top lethal compositions:`);
    for (const [comp, n] of x.topComps) log(`  - ${n}× ${comp}`);
    log('');
  }

  // ── 3. Candidate pressure-test — Fighter L1 floor under each cushion ──────
  log(`## 3. Candidate cushions — Fighter L1 floor lift`);
  log('');
  log(`Target band: lift Fighter L1 toward ranger (${f2(depthStats(baseL1['ranger']).meanDepth)}) / barbarian (${f2(depthStats(baseL1['barbarian']).meanDepth)}) WITHOUT overshooting.`);
  log('');
  log(`| Phase | mean | median | p90 | →Ch2 | →Ch3 | death% | won minHP | dmg/enemy-turn | Δmean vs base |`);
  log(`|-------|-----:|-------:|----:|-----:|-----:|-------:|----------:|---------------:|-------------:|`);
  const fighterBaseL1 = depthStats(baseL1['fighter']).meanDepth;
  for (const phase of PHASES) {
    const lives = phase.id === 'base' ? baseL1['fighter'] : runCohort('fighter', 1, N, phase);
    const d = depthStats(lives);
    const c = combatStats(lives);
    const x = deathStats(lives);
    log(
      `| ${phase.id} | ${f2(d.meanDepth)} | ${d.medianDepth} | ${d.p90Depth} | ${pct(d.reachedCh2)} | ${pct(d.reachedCh3)} | ` +
        `${pct(x.deathRate)} | ${pct(c.meanWonMinHp)} | ${f2(c.meanDmgPerEnemyTurn)} | ${d.meanDepth >= fighterBaseL1 ? '+' : ''}${f2(d.meanDepth - fighterBaseL1)} |`,
    );
  }
  log('');
  log(`_Phase legend:_`);
  for (const p of PHASES) log(`  - \`${p.id}\` — ${p.label}`);
  log('');

  // ── 4. Band-preservation / inversion check (L1/3/5/7) ────────────────────
  log(`## 4. Band-preservation — does a Fighter cushion invert the L3+ order?`);
  log('');
  log(`Fighter at each level under each phase, vs the fixed baseline field. A cushion`);
  log(`gated to L1–4 must (a) fade by L5 [Fighter L5/7 == base] and (b) not vault`);
  log(`Fighter past the field at L3.`);
  log('');

  // Fixed baseline field band (non-fighter classes never change across phases).
  const fieldBand: Record<string, Record<number, number>> = {};
  for (const cls of FIELD) {
    fieldBand[cls] = {};
    for (const L of BAND_LEVELS) {
      fieldBand[cls][L] = depthStats(runCohort(cls, L, BAND_N, PHASES[0])).meanDepth;
    }
  }
  log(`Baseline field (mean rooms reached):`);
  log('');
  log(`| Class | L1 | L3 | L5 | L7 |`);
  log(`|-------|---:|---:|---:|---:|`);
  for (const cls of FIELD) {
    log(`| ${cls} | ${f2(fieldBand[cls][1])} | ${f2(fieldBand[cls][3])} | ${f2(fieldBand[cls][5])} | ${f2(fieldBand[cls][7])} |`);
  }
  log('');
  log(`Fighter band under each cushion (other classes hold their baseline above):`);
  log('');
  log(`| Phase | L1 | L3 | L5 | L7 | inverts field@L3? |`);
  log(`|-------|---:|---:|---:|---:|:------------------|`);
  const fieldMaxL3 = Math.max(...FIELD.filter((c) => c !== 'fighter').map((c) => fieldBand[c][3]));
  for (const phase of PHASES) {
    const byL: Record<number, number> = {};
    for (const L of BAND_LEVELS) {
      byL[L] = depthStats(runCohort('fighter', L, BAND_N, phase)).meanDepth;
    }
    const inverts = byL[3] > fieldMaxL3 * 1.15; // >15% over the best non-fighter = a real vault
    log(`| ${phase.id} | ${f2(byL[1])} | ${f2(byL[3])} | ${f2(byL[5])} | ${f2(byL[7])} | ${inverts ? `YES (>${f2(fieldMaxL3)})` : 'no'} |`);
  }
  log('');
  log(`> Fighter L5/L7 should read identical across phases (buff faded). Any drift there`);
  log(`> is RNG-noise at this cohort size, not a leak past L4.`);
  log('');

  const outPath = resolve(dirname(new URL(import.meta.url).pathname), '../docs/sim-findings/fighter-l1-diagnostic.raw.md');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, out.join('\n'));
  // eslint-disable-next-line no-console
  console.log(out.join('\n'));
  // eslint-disable-next-line no-console
  console.log(`\n\nWrote ${outPath}`);
}

main();
