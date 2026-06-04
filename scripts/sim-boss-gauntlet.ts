/**
 * BOSS-GAUNTLET harness — measures each of the 14 chapter bosses in ISOLATION,
 * across all playable classes, at a level-appropriate hero.
 *
 * Why a dedicated gauntlet: the full-delve sims (sim-feel / sim-class-viability)
 * only ever FIGHT a chapter-N boss on runs that SURVIVED to chapter N. At the
 * AI-floor that is a heavy survival-selection bias — the deep ToB bosses are
 * almost never reached, so their intrinsic difficulty is invisible. Dropping a
 * calibrated hero straight into each boss room removes that bias and lets us read
 * every boss's teeth, including Ch12-14.
 *
 * It drives the REAL engine path (createCombat{isBoss} → monsterAttack / endTurn
 * with the trusted actionPolicy bot), so the data-driven boss framework that
 * shipped this cycle — telegraphed wind-ups, HP-threshold phases, multi-action
 * turns (Ch9+), condition gates, summons, sustains, battle-rage — fires exactly
 * as it does in play. Each fight is INSTRUMENTED against the boss instance so we
 * can audit which mechanics a boss HAS (from its def) vs which actually FIRED.
 *
 * MEASUREMENT ONLY. No magnitudes are tuned here. Absolute win-rates are an
 * AI-floor / bare-soul-at-level read (preset gear, no shop/meta power) — read the
 * SHAPE across chapters and the relative class ordering, not the raw magnitudes.
 *
 *   npx tsx scripts/sim-boss-gauntlet.ts                  # default, asc 0
 *   SEEDS=80 npx tsx scripts/sim-boss-gauntlet.ts         # tighter
 *   ASCENSION=6 npx tsx scripts/sim-boss-gauntlet.ts      # apex ladder
 *   BOSS_LEVELS=5,6,... npx tsx scripts/sim-boss-gauntlet.ts  # override schedule
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

import { createDiceRoller, setActiveRoller, type DiceRoller } from '../src/engine/dice';
import { getMonster } from '../src/content/monsters';
import { createGodwakeDelve } from '../src/engine/delve/createDelve';
import { createCombat, _resetMonsterInstanceCounter } from '../src/engine/combat/createCombat';
import { monsterAttack } from '../src/engine/combat/attack';
import { endTurn } from '../src/engine/combat/turn';
import {
  chooseCombatAction,
  applyPlannedAction,
  ARCHETYPES,
  type Archetype,
} from '../src/engine/combat/actionPolicy';
import { simulateLevelUp, MAX_LEVEL } from '../src/engine/character/leveling';
import { withResetActionEconomy } from '../src/engine/character/actions';
import { buildPlayerCharacter, presetCreationInput } from '../src/engine/character/defaultCharacter';
import { pickBlessingAtShrine } from '../src/test/sim/encounterStress';
import { clampAscension } from '../src/engine/delve/ascension';
import { rollItem } from '../src/engine/items/rollItem';
import { equipItem } from '../src/engine/character/equip';
import {
  legendaryDropPool,
  aggregateLegendaryEffects,
  canEquipLegendary,
} from '../src/content/legendaries';
import { spellcastingMod } from '../src/engine/character/derived';
import {
  scaleSpellDamage,
  spellDamageMultiplier,
} from '../src/engine/combat/spells/scaling';
import { spellDamageBonus } from '../src/engine/combat/spells/helpers';
import { magicMissileDartCount } from '../src/engine/combat/spells/magicMissile';
import { scorchingRayCount } from '../src/engine/combat/spells/scorchingRay';
import type { Character } from '../src/types/character';
import type { CombatState, MonsterCombatant } from '../src/types/combat';
import type { Monster, MonsterAction } from '../src/schemas/monster';
import type { RoomSpec } from '../src/types/delve';
import type { ClassId } from '../src/schemas/ids';
import type { GearRarity, BaseKind } from '../src/schemas/item';

// ─── Config ──────────────────────────────────────────────────────────────────

const CLASSES: ClassId[] = ['fighter', 'barbarian', 'ranger', 'rogue', 'monk', 'wizard', 'druid'];
const SEEDS = Number(process.env.SEEDS ?? 60);
const ASCENSION = clampAscension(Number(process.env.ASCENSION ?? 0));
const ARCHETYPE: Archetype = (ARCHETYPES as readonly string[]).includes(process.env.ARCHETYPE ?? '')
  ? (process.env.ARCHETYPE as Archetype)
  : 'balanced';
// GEAR=1 brackets the bare-soul floor: the hero also carries a representative
// rolled loadout (one high-rarity item per slot at the chapter's depth + two
// attuned class legendaries), mirroring sim-ngplus-tob's gearUpArriving but at
// THIS gauntlet's correct per-chapter level. The gear-sensitive boss fixes
// (Ch7 sustain/adds, Ch9 gate) target the geared hero, so this is the lens that
// shows their payoff; the bare default stays the apples-to-apples floor read.
const GEAR = process.env.GEAR === '1';
// Hero level when entering each chapter's boss room (ch1..14). Default is a
// monotone schedule that lands L20 at Ch14 and ~L18-19 by Ch12-13 — the band the
// xp-curve sim reports for the realized routed-XP median. Override with BOSS_LEVELS.
const DEFAULT_BOSS_LEVELS = [3, 4, 5, 6, 8, 9, 11, 12, 13, 15, 16, 18, 19, 20];
const BOSS_LEVELS = (process.env.BOSS_LEVELS ?? DEFAULT_BOSS_LEVELS.join(','))
  .split(',')
  .map((s) => Math.min(MAX_LEVEL, Math.max(1, Number(s.trim()))));
// Blessings a realistic hero carries entering each chapter's boss (ch1..14) — a
// shrine pick every chapter or two. Lifts the bare-soul floor toward a real
// mid-run loadout so the deep band is readable instead of a wall of 0%. Set
// BLESSINGS=0 to read the pure bare-soul floor.
const DEFAULT_BLESSINGS = [1, 1, 2, 2, 3, 4, 4, 5, 6, 6, 7, 7, 8, 8];
const BLESSING_OVERRIDE = process.env.BLESSINGS !== undefined ? Number(process.env.BLESSINGS) : undefined;
const SEED_BASE = 0xb055 >>> 0;
const MAX_ROUNDS = 30;
const MAX_STEPS = MAX_ROUNDS * 10;

// ─── Character builder (all playable classes, via the real factory) ───────────

const charCache = new Map<string, Character>();
function heroAtLevel(classId: ClassId, level: number): Character {
  const key = `${classId}@${level}`;
  const hit = charCache.get(key);
  if (hit) return hit;
  let c = buildPlayerCharacter(presetCreationInput(classId));
  while (c.level < level) c = simulateLevelUp({ ...c, xp: 9_999_999 });
  charCache.set(key, c);
  return c;
}

const hashStr = (s: string): number => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0);
  return h >>> 0;
};

// Representative loadout slots (matches sim-ngplus-tob.gearUpArriving). Rarity is
// the slot QUALITY; the per-slot affix magnitudes auto-scale with `depth`, so the
// same slot set rolled at depth=chapter yields a chapter-appropriate kit — strong
// for the ToB arc, modest for the lower delve. Brackets the bare floor from above.
const GEAR_SLOTS: { kind: BaseKind; rarity: GearRarity }[] = [
  { kind: 'weapon', rarity: 'legendary' },
  { kind: 'armor', rarity: 'legendary' },
  { kind: 'accessory', rarity: 'purple' },
  { kind: 'accessory', rarity: 'purple' },
];
function gearUpForChapter(roller: DiceRoller, base: Character, chapter: number): Character {
  let c = base;
  for (const { kind, rarity } of GEAR_SLOTS) {
    const ref = rollItem(roller, { rarity, classId: c.classId, kind, depth: chapter });
    const idx = c.inventory.length;
    c = equipItem({ ...c, inventory: [...c.inventory, ref] }, idx);
  }
  const relics = legendaryDropPool(c.classId)
    .filter((id) => canEquipLegendary(id, c.classId))
    .slice(0, 2);
  if (relics.length) c = { ...c, legendaryEffects: aggregateLegendaryEffects(relics) };
  return { ...c, hp: { ...c.hp, current: c.hp.max, temp: 0 } };
}

/** Hero entering chapter C's boss: at the level schedule + a realistic blessing
 *  loadout (picked by the shared policy, deterministic per class+chapter so the
 *  boss fight is the only variable across seeds). With GEAR=1 it also carries a
 *  representative depth-scaled loadout. Cached. */
const heroCache = new Map<string, Character>();
function heroForChapter(classId: ClassId, chapter: number): Character {
  const level = BOSS_LEVELS[chapter - 1] ?? 20;
  const nBless = BLESSING_OVERRIDE ?? DEFAULT_BLESSINGS[chapter - 1] ?? 8;
  const key = `${classId}@ch${chapter}`;
  const hit = heroCache.get(key);
  if (hit) return hit;
  let c = heroAtLevel(classId, level);
  if (nBless > 0 || GEAR) {
    const setup = createDiceRoller((SEED_BASE ^ hashStr(classId) ^ (chapter * 2654435761)) >>> 0);
    for (let i = 0; i < nBless; i++) c = pickBlessingAtShrine(setup, c);
    if (GEAR) c = gearUpForChapter(setup, c, chapter);
  }
  heroCache.set(key, c);
  return c;
}

// ─── Boss-room extraction (authoritative composition from the live delve) ─────

interface BossRoom {
  chapter: number;
  bossDefId: string;
  room: RoomSpec;
}

/** Pull the canonical boss room for every chapter from a full-chain delve. */
function extractBossRooms(seed: number): BossRoom[] {
  const delve = createGodwakeDelve({ seed, ascension: ASCENSION, fullChain: true });
  const out: BossRoom[] = [];
  const seen = new Set<number>();
  for (const room of delve.rooms) {
    if (room.kind !== 'boss') continue;
    const chapter = room.chapter ?? 0;
    if (seen.has(chapter)) continue;
    seen.add(chapter);
    const bossDefId = room.monsters?.[0]?.defId ?? '';
    out.push({ chapter, bossDefId, room });
  }
  return out.sort((a, b) => a.chapter - b.chapter);
}

// ─── Mechanic detection (what a boss HAS, from its def) ───────────────────────

interface MechSet {
  telegraph: boolean;
  phases: boolean;
  multiAction: boolean; // actionsPerTurn>=2 at spawn OR a phase raises it
  gate: boolean;
  summon: boolean;
  sustain: boolean;
  battleRage: boolean;
}

function phaseActions(def: Monster): MonsterAction[] {
  return (def.phases ?? []).flatMap((p) => p.addActions ?? []);
}
function allActions(def: Monster): MonsterAction[] {
  return [...def.actions, ...phaseActions(def)];
}
function bossHas(def: Monster): MechSet {
  const acts = allActions(def);
  const phaseRaisesApt = (def.phases ?? []).some((p) => (p.actionsPerTurn ?? 1) >= 2);
  return {
    telegraph: acts.some((a) => 'telegraph' in a && !!a.telegraph),
    phases: !!def.phases?.length,
    multiAction: (def.actionsPerTurn ?? 1) >= 2 || phaseRaisesApt,
    gate: !!def.gate,
    summon: acts.some((a) => a.kind === 'summon'),
    sustain: acts.some((a) => a.kind === 'sustain'),
    battleRage: def.bossMechanic === 'battle-rage',
  };
}

// ─── Per-fight instrumentation ────────────────────────────────────────────────

interface FightOutcome {
  result: 'win' | 'loss' | 'stall';
  rounds: number;
  minHpPct: number;
  // mechanic-fired flags (observed on the boss instance during the fight)
  telegraphCharged: boolean;
  telegraphCanceled: boolean;
  phasesEntered: number;
  maxActionsPerTurn: number;
  summonsSpawned: number;
  gateEngaged: boolean; // boss was warded by a live add at some point
  wardLifted: boolean; // gate add spawned and was fully cleared mid-fight while boss lived
  rageEntered: boolean;
}

function bossInstanceOf(state: CombatState, bossDefId: string): MonsterCombatant | undefined {
  return state.combatants.find(
    (c): c is MonsterCombatant => c.kind === 'monster' && c.instance.defId === bossDefId,
  );
}

function liveAddCount(state: CombatState, defId: string): number {
  return state.combatants.filter(
    (c) => c.kind === 'monster' && c.instance.defId === defId && c.instance.hp.current > 0,
  ).length;
}

function runBossFight(
  roller: DiceRoller,
  hero: Character,
  bossRoom: BossRoom,
): FightOutcome {
  _resetMonsterInstanceCounter();
  const def = getMonster(bossRoom.bossDefId);
  const monsterRefs = (bossRoom.room.monsters ?? []).flatMap((rm) => {
    const d = getMonster(rm.defId);
    return Array.from({ length: rm.count }, (_, i) => ({
      def: d,
      displayName: rm.displayPrefix ? `${rm.displayPrefix} ${i + 1}` : d.name,
    }));
  });

  const init = createCombat({
    roller,
    character: withResetActionEconomy(hero),
    monsters: monsterRefs,
    ascension: ASCENSION,
    isBoss: true,
    twistId: bossRoom.room.twistId,
  });
  let s = init.state;
  let ch = init.character;

  const initialCombatants = s.combatants.length;
  let maxCombatants = initialCombatants;
  let minHpPct = ch.hp.current / ch.hp.max;
  let telegraphCharged = false;
  let prevPending = false;
  let phasesEntered = 0;
  let maxActionsPerTurn = 1;
  let gateEngaged = false;
  let gateAddSpawned = false;
  let wardLifted = false;
  let rageEntered = false;

  const gateAddId = def.gate?.whileAddAlive;

  const observe = () => {
    const boss = bossInstanceOf(s, bossRoom.bossDefId);
    const bossAlive = (boss?.instance.hp.current ?? 0) > 0;
    if (boss) {
      const pending = !!boss.instance.pendingTelegraph;
      if (pending && !prevPending) telegraphCharged = true;
      prevPending = pending;
      phasesEntered = Math.max(phasesEntered, boss.instance.phasesEntered?.length ?? 0);
      maxActionsPerTurn = Math.max(
        maxActionsPerTurn,
        boss.instance.actionsPerTurn ?? def.actionsPerTurn ?? 1,
      );
      if (boss.instance.bossRageActive) rageEntered = true;
    }
    if (gateAddId) {
      const addsAlive = liveAddCount(s, gateAddId);
      if (addsAlive > 0) {
        gateAddSpawned = true;
        if (bossAlive) gateEngaged = true;
      } else if (gateAddSpawned && bossAlive) {
        // adds were summoned and are now all cleared while the boss still lives
        wardLifted = true;
      }
    }
    maxCombatants = Math.max(maxCombatants, s.combatants.length);
  };
  observe();

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
      observe();
      if (s.status !== 'active') break;
      const e = endTurn(s, ch);
      s = e.state;
      ch = e.character;
    } else {
      const r = monsterAttack({ roller, character: ch, state: s }, currentId);
      s = r.state;
      ch = r.character;
      minHpPct = Math.min(minHpPct, ch.hp.current / ch.hp.max);
      observe();
      if (s.status !== 'active') break;
      const e = endTurn(s, ch);
      s = e.state;
      ch = e.character;
    }
  }
  observe();

  const result: FightOutcome['result'] =
    s.status === 'player-victory' ? 'win' : s.status === 'active' ? 'stall' : 'loss';
  // telegraph canceled = the boss had a charge that collapsed (hard-control denial)
  const telegraphCanceled = s.log.some((l) => /collapses, uncast/.test(l.text));

  return {
    result,
    rounds: s.round,
    minHpPct: result === 'win' ? minHpPct : 0,
    telegraphCharged,
    telegraphCanceled,
    phasesEntered,
    maxActionsPerTurn,
    summonsSpawned: maxCombatants - initialCombatants,
    gateEngaged,
    wardLifted,
    rageEntered,
  };
}

// ─── Aggregation ──────────────────────────────────────────────────────────────

interface Cell {
  n: number;
  wins: number;
  losses: number;
  stalls: number;
  rounds: number[];
  minHp: number[]; // winners only
  telegraphCharged: number;
  telegraphCanceled: number;
  phaseEnters: number[];
  maxApt: number;
  summons: number[];
  gateEngaged: number;
  wardLifted: number;
  rageEntered: number;
}
function emptyCell(): Cell {
  return {
    n: 0, wins: 0, losses: 0, stalls: 0, rounds: [], minHp: [],
    telegraphCharged: 0, telegraphCanceled: 0, phaseEnters: [], maxApt: 1,
    summons: [], gateEngaged: 0, wardLifted: 0, rageEntered: 0,
  };
}
function record(cell: Cell, o: FightOutcome): void {
  cell.n += 1;
  if (o.result === 'win') { cell.wins += 1; cell.minHp.push(o.minHpPct); }
  else if (o.result === 'loss') cell.losses += 1;
  else cell.stalls += 1;
  cell.rounds.push(o.rounds);
  if (o.telegraphCharged) cell.telegraphCharged += 1;
  if (o.telegraphCanceled) cell.telegraphCanceled += 1;
  cell.phaseEnters.push(o.phasesEntered);
  cell.maxApt = Math.max(cell.maxApt, o.maxActionsPerTurn);
  cell.summons.push(o.summonsSpawned);
  if (o.gateEngaged) cell.gateEngaged += 1;
  if (o.wardLifted) cell.wardLifted += 1;
  if (o.rageEntered) cell.rageEntered += 1;
}
const mean = (a: number[]): number => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);
const pct = (n: number, d: number): number => (d ? Math.round((100 * n) / d) : 0);

// ─── Spell-scaling table (the caster / cantrip question, no combat noise) ─────

function spellScalingTable(): string[] {
  const L: string[] = [];
  L.push('## Caster damage scaling by level (expected values, real helpers)\n');
  L.push(
    'Fire Bolt is the cantrip arm of the parametric model (1d10 base × levelFactor + ' +
      'weaponEnh, anchored at acquisition; #418 dropped the inert intFactor). The cantrip ' +
      'rides the steeper CANTRIP_LEVEL_K (0.12) so its L20 dice-core climbs back near the ' +
      'old 4d10 ≈ 22 cap, while leveled spells keep LEVEL_K (0.05). Magic Missile (darts) ' +
      'and Scorching Ray (rays) are deliberately left on COUNT scaling — a separate axis. ' +
      'Fireball is the L3 nuke on the parametric model (8d6 base, acq L5).\n',
  );
  L.push(
    '| Level | castMod | Fire Bolt mult | Fire Bolt dice-core | Fire Bolt full (avg) | Magic Missile (auto) | Scorching Ray (raw) | Fireball dice-core |',
  );
  L.push('|---|---|---|---|---|---|---|---|');
  const FIRE_BOLT_DICE = 5.5; // 1d10
  const FIREBALL_DICE = 28; // 8d6
  const MM_DART = 3.5; // 1d4+1
  const RAY = 7; // 2d6
  // #418 changed the scaler to take the spell TIER (not an acq-level): tier 0
  // selects the steeper CANTRIP_LEVEL_K, leveled tiers use LEVEL_K. Pass the tier
  // directly, exactly as the engine call sites (fireBolt.ts) now do.
  const CANTRIP_TIER = 0; // Fire Bolt
  const FIREBALL_TIER = 3; // Fireball (8d6, acq L5)
  for (const level of [1, 3, 5, 8, 11, 14, 17, 20]) {
    const wiz = heroAtLevel('wizard', level);
    const castMod = spellcastingMod(wiz);
    const mult = spellDamageMultiplier(wiz, CANTRIP_TIER);
    const fbDice = scaleSpellDamage(FIRE_BOLT_DICE, wiz, CANTRIP_TIER);
    const fbFull = fbDice + spellDamageBonus(wiz) + castMod;
    const mm = magicMissileDartCount(level) * MM_DART + spellDamageBonus(wiz);
    const ray = scorchingRayCount(level) * RAY;
    const fireball = scaleSpellDamage(FIREBALL_DICE, wiz, FIREBALL_TIER);
    L.push(
      `| ${level} | +${castMod} | ${mult.toFixed(2)}× | ${fbDice} | ${fbFull.toFixed(1)} | ${mm.toFixed(1)} | ${ray.toFixed(0)} | ${fireball} |`,
    );
  }
  L.push('\n_Reference: OLD Fire Bolt cap = 4d10 ≈ 22 dice (no flat add, attack-vs-AC ~55% landed)._\n');
  return L;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main(): void {
  const t0 = Date.now();
  const bossRooms = extractBossRooms(SEED_BASE);
  const chapters = bossRooms.map((b) => b.chapter);

  // cells[chapter][classId]
  const cells = new Map<number, Map<ClassId, Cell>>();
  for (const { chapter } of bossRooms) {
    const m = new Map<ClassId, Cell>();
    for (const c of CLASSES) m.set(c, emptyCell());
    cells.set(chapter, m);
  }

  for (const bossRoom of bossRooms) {
    for (const classId of CLASSES) {
      const hero = heroForChapter(classId, bossRoom.chapter);
      const cell = cells.get(bossRoom.chapter)!.get(classId)!;
      for (let seed = 0; seed < SEEDS; seed++) {
        const s = (SEED_BASE + bossRoom.chapter * 7919 + seed * 31) >>> 0;
        const roller = createDiceRoller(s);
        setActiveRoller(s);
        // Re-extract the boss room on THIS seed so any seed-varied composition is honored.
        const perSeed = extractBossRooms(s).find((b) => b.chapter === bossRoom.chapter) ?? bossRoom;
        record(cell, runBossFight(roller, hero, perSeed));
      }
    }
  }

  // ── Report ──
  const L: string[] = [];
  L.push('# Boss gauntlet — per-chapter boss difficulty + mechanic-firing audit\n');
  const gearClause = GEAR
    ? `PLUS a representative depth-scaled loadout (GEAR=1: a high-rarity item per slot ` +
      `rolled at the chapter's depth + two attuned class legendaries) — this BRACKETS the bare ` +
      `floor from above, so win-rates here are an UPPER read for a realistically-geared hero.`
    : `BUT preset gear (no shop/legendary/meta power) — so MARTIAL win-rates on the deep bosses ` +
      `are a LOWER bound (a real L18 hero swings a +N legendary, not a starting weapon).`;
  L.push(
    `Ascension **${ASCENSION}**, archetype **${ARCHETYPE}**, gear **${GEAR ? 'representative (depth-scaled)' : 'bare floor'}**, ` +
      `**${SEEDS}** seeds × ${CLASSES.length} classes per boss ` +
      `= **${SEEDS * CLASSES.length}** fights/boss, **${SEEDS * CLASSES.length * bossRooms.length}** total. ` +
      `Hero = level schedule + a realistic per-chapter blessing loadout, ${gearClause} ` +
      `Read SHAPE + relative ordering, not magnitudes. Wall: ${((Date.now() - t0) / 1000).toFixed(1)}s.\n`,
  );
  L.push(
    '> Level schedule (ch→L, #blessings): ' +
      bossRooms
        .map((b) => `${b.chapter}→L${BOSS_LEVELS[b.chapter - 1]}/${BLESSING_OVERRIDE ?? DEFAULT_BLESSINGS[b.chapter - 1]}b`)
        .join(', ') +
      '\n',
  );

  // Boss roster + HAS-mechanics
  L.push('## Boss roster + declared mechanics\n');
  L.push('| Ch | Boss | telegraph | phases | multi-act | gate | summon | sustain | rage |');
  L.push('|---|---|---|---|---|---|---|---|---|');
  const hasByChapter = new Map<number, MechSet>();
  for (const b of bossRooms) {
    const def = getMonster(b.bossDefId);
    const h = bossHas(def);
    hasByChapter.set(b.chapter, h);
    const y = (v: boolean) => (v ? '✓' : '·');
    const aptDecl = def.actionsPerTurn ?? 1;
    const aptPhase = Math.max(1, ...(def.phases ?? []).map((p) => p.actionsPerTurn ?? 1));
    const aptStr = h.multiAction ? `✓(${Math.max(aptDecl, aptPhase)})` : '·';
    L.push(
      `| ${b.chapter} | ${def.name} | ${y(h.telegraph)} | ${y(h.phases)} | ${aptStr} | ${y(h.gate)} | ${y(h.summon)} | ${y(h.sustain)} | ${y(h.battleRage)} |`,
    );
  }
  L.push('');

  // Difficulty per chapter (overall + per class win%)
  L.push('## Difficulty per chapter — win% (overall), rounds, min-HP%\n');
  L.push(
    '| Ch | Boss | overall win% | stall% | avg rounds | win min-HP% | ' +
      CLASSES.join('% | ') + '% |',
  );
  L.push('|---|---|---|---|---|---|' + CLASSES.map(() => '---').join('|') + '|');
  for (const b of bossRooms) {
    const m = cells.get(b.chapter)!;
    let n = 0, wins = 0, stalls = 0;
    const rounds: number[] = [];
    const minHp: number[] = [];
    const perClassWin: string[] = [];
    for (const c of CLASSES) {
      const cell = m.get(c)!;
      n += cell.n; wins += cell.wins; stalls += cell.stalls;
      rounds.push(...cell.rounds); minHp.push(...cell.minHp);
      perClassWin.push(String(pct(cell.wins, cell.n)));
    }
    L.push(
      `| ${b.chapter} | ${getMonster(b.bossDefId).name} | ${pct(wins, n)} | ${pct(stalls, n)} | ${mean(rounds).toFixed(1)} | ${Math.round(mean(minHp) * 100)} | ${perClassWin.join(' | ')} |`,
    );
  }
  L.push('');

  // Mechanic-FIRED audit (HAS vs FIRED)
  L.push('## Mechanic-firing audit — did the declared mechanics actually FIRE?\n');
  L.push('Share of fights (all classes) in which each mechanic was observed on the boss instance. A HAS-but-0%-FIRED is a red flag (sim wiring or unreachable phase).\n');
  L.push('| Ch | Boss | telegraph% | canceled% | avg phases | maxApt | avg summons | gate-engaged% | ward-lifted% | rage% |');
  L.push('|---|---|---|---|---|---|---|---|---|---|');
  for (const b of bossRooms) {
    const m = cells.get(b.chapter)!;
    let n = 0, tc = 0, tcx = 0, ge = 0, wl = 0, rage = 0, maxApt = 1;
    const phaseEnters: number[] = [];
    const summons: number[] = [];
    for (const c of CLASSES) {
      const cell = m.get(c)!;
      n += cell.n; tc += cell.telegraphCharged; tcx += cell.telegraphCanceled;
      ge += cell.gateEngaged; wl += cell.wardLifted; rage += cell.rageEntered;
      maxApt = Math.max(maxApt, cell.maxApt);
      phaseEnters.push(...cell.phaseEnters); summons.push(...cell.summons);
    }
    const has = hasByChapter.get(b.chapter)!;
    const cellv = (v: string, present: boolean) => (present ? v : '—');
    L.push(
      `| ${b.chapter} | ${getMonster(b.bossDefId).name} | ${cellv(pct(tc, n) + '%', has.telegraph)} | ${cellv(pct(tcx, n) + '%', has.telegraph)} | ${cellv(mean(phaseEnters).toFixed(1), has.phases)} | ${cellv(String(maxApt), has.multiAction)} | ${cellv(mean(summons).toFixed(1), has.summon)} | ${cellv(pct(ge, n) + '%', has.gate)} | ${cellv(pct(wl, n) + '%', has.gate)} | ${cellv(pct(rage, n) + '%', has.battleRage)} |`,
    );
  }
  L.push('');

  // Class band (overall across all bosses)
  L.push('## Class band — overall win% across all 14 bosses\n');
  const classTotals = CLASSES.map((c) => {
    let n = 0, wins = 0;
    for (const b of bossRooms) {
      const cell = cells.get(b.chapter)!.get(c)!;
      n += cell.n; wins += cell.wins;
    }
    return { c, n, wins, win: pct(wins, n) };
  }).sort((a, b) => b.win - a.win);
  L.push('| rank | class | overall win% |');
  L.push('|---|---|---|');
  classTotals.forEach((t, i) => L.push(`| ${i + 1} | ${t.c} | ${t.win} |`));
  L.push('');

  // Caster scaling cross-check: caster vs martial win% per chapter
  L.push('## Caster vs martial — win% per chapter (scaling sanity)\n');
  const MARTIAL: ClassId[] = ['fighter', 'barbarian', 'ranger', 'rogue', 'monk'];
  const CASTER: ClassId[] = ['wizard', 'druid'];
  const groupWin = (chapter: number, group: ClassId[]) => {
    let n = 0, wins = 0;
    for (const c of group) { const cell = cells.get(chapter)!.get(c)!; n += cell.n; wins += cell.wins; }
    return pct(wins, n);
  };
  L.push('| Ch | martial win% | caster win% | wizard% | druid% |');
  L.push('|---|---|---|---|---|');
  for (const b of bossRooms) {
    L.push(
      `| ${b.chapter} | ${groupWin(b.chapter, MARTIAL)} | ${groupWin(b.chapter, CASTER)} | ${pct(cells.get(b.chapter)!.get('wizard')!.wins, cells.get(b.chapter)!.get('wizard')!.n)} | ${pct(cells.get(b.chapter)!.get('druid')!.wins, cells.get(b.chapter)!.get('druid')!.n)} |`,
    );
  }
  L.push('');

  // Spell scaling table
  L.push(...spellScalingTable());

  const doc = L.join('\n') + '\n';
  const outPath = resolve(process.cwd(), 'sim-reports/boss-gauntlet.raw.md');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, doc, 'utf8');
  process.stdout.write(doc);
  process.stdout.write(`\n[boss-gauntlet] wrote ${outPath}\n`);
  void chapters;
}

main();
