/**
 * Boss-fight deep validation harness. Reuses `encounterStress.ts` archetypes
 * and per-class turn AI, but stages an isolated boss fight only (no delve,
 * no warmups), with optional defensive blessings + a modest L5+ Grove
 * loadout applied to the character.
 *
 * Each simulated fight reports rich telemetry: rounds, HP%, damage dealt /
 * taken, crits, Hold Person save outcomes, and resource burn (Second Wind /
 * spell slots / Cunning Action). The matrix runner aggregates 500 fights per
 * cell across all 4 bosses × 3 classes × 2 at-level levels × 2 loadouts.
 *
 * Pure sim plumbing — no React, no store. Gated test runner lives in
 * `bossesDeep.sim.test.ts`.
 */
import type { Character } from '../../types/character';
import type { CombatState, MonsterCombatant } from '../../types/combat';
import type { ClassId } from '../../schemas/ids';
import { createDiceRoller } from '../../engine/dice';
import { createCombat } from '../../engine/combat/createCombat';
import { monsterAttack } from '../../engine/combat/attack';
import { endTurn } from '../../engine/combat/turn';
import { getMonster } from '../../content/monsters';
import { characterAtLevel, takeTurn } from './encounterStress';

export type Loadout = 'vacuum' | 'loaded';

export type BossId =
  | 'duergar-ilyich'
  | 'athkatla-magistrate'
  | 'asylum-director'
  | 'drow-matron-mother';

export interface BossSpec {
  id: BossId;
  shortName: string;
  chapter: 1 | 2 | 3 | 4;
  /** At-level character levels to test against. */
  levels: number[];
  /** Pre-tune baseline win-rate by class at the "primary" at-level level for that boss. */
  preBaseline: { rogue: number; fighter: number; wizard: number; levelTested: number };
  /** Pre-tune avg rounds at primary level. */
  preBaselineRounds: { rogue: number; fighter: number; wizard: number };
}

/**
 * Pre-Phase-1 baselines from docs/sim-findings/encounter-stress.md (30 runs/cell
 * at the encounter-stress matrix's expected at-level). Used to render the
 * before/after table.
 */
export const BOSSES: BossSpec[] = [
  {
    id: 'duergar-ilyich',
    shortName: 'Ilyich',
    chapter: 1,
    // Ch1 boss arrives end of chapter — player is typically L1 fresh-rolled
    // (under-level scramble) or L3 (full at-level).
    levels: [1, 3],
    preBaseline: { rogue: 40, fighter: 70, wizard: 87, levelTested: 3 },
    preBaselineRounds: { rogue: 7.5, fighter: 8.7, wizard: 4.2 },
  },
  {
    id: 'athkatla-magistrate',
    shortName: 'Magistrate',
    chapter: 2,
    // Ch2 boss: player is at L3 entering and L4 by the boss (encounter-stress
    // matrix's primary at-level). Test both.
    levels: [3, 4],
    preBaseline: { rogue: 7, fighter: 7, wizard: 27, levelTested: 4 },
    preBaselineRounds: { rogue: 7.8, fighter: 8.7, wizard: 7.3 },
  },
  {
    id: 'asylum-director',
    shortName: 'Director',
    chapter: 3,
    // Ch3 boss: L5 is the primary at-level (encounter-stress baseline). L7
    // is the over-level (player who farmed Ch2 elites + early Ch3).
    levels: [5, 7],
    preBaseline: { rogue: 7, fighter: 57, wizard: 3, levelTested: 5 },
    preBaselineRounds: { rogue: 8.7, fighter: 9.3, wizard: 9.2 },
  },
  {
    id: 'drow-matron-mother',
    shortName: 'Matron Mother',
    chapter: 4,
    // Ch4 boss: L7 is the primary at-level. L6 is the under-level (player
    // rushed Ust Natha without farming the elite cluster).
    levels: [6, 7],
    preBaseline: { rogue: 0, fighter: 50, wizard: 0, levelTested: 7 },
    preBaselineRounds: { rogue: 9.9, fighter: 11.8, wizard: 9.7 },
  },
];

/**
 * Defensive blessings: each picks a distinct mechanical lever so the
 * aggregator's max-of carve-outs don't squash the bundle. Reaches +1 AC,
 * +3 tempHp per combat, an Ilmater stabilise charge, a first-attack
 * advantage, and one miss-reroll per combat.
 */
const LOADED_BLESSINGS: string[] = [
  'helms-aegis',         // +1 AC (acBonus 1)
  'lathanders-dawn',     // +3 tempHp per combat
  'ilmaters-patience',   // +1 stabilise charge per delve
  'selunes-veil',        // first-attack advantage
  'tymoras-coin',        // 1 miss reroll per encounter
];

/**
 * Modest L5+ Grove loadout, defensive bent. Mirrors a player who has
 * unlocked the core survival ranks by the time they're poking at chapter
 * bosses — not a maxed soul, just credible. AC + HP + a touch of damage
 * + init.
 */
const LOADED_PERM_BONUSES = {
  ac: 1,
  hp: 10,
  init: 1,
  damage: 1,
};

function applyLoadout(character: Character, loadout: Loadout): Character {
  if (loadout === 'vacuum') return character;
  const withBlessings: Character = {
    ...character,
    blessings: [...character.blessings, ...LOADED_BLESSINGS],
  };
  const permBonuses = {
    ...(withBlessings.permanentBonuses ?? {}),
    ...LOADED_PERM_BONUSES,
  };
  const hpBoost = LOADED_PERM_BONUSES.hp;
  return {
    ...withBlessings,
    permanentBonuses: permBonuses,
    hp: {
      current: withBlessings.hp.max + hpBoost,
      max: withBlessings.hp.max + hpBoost,
      temp: withBlessings.hp.temp,
    },
  };
}

export interface FightResult {
  win: boolean;
  rounds: number;
  hpPctOnWin: number;     // 0-100
  damageDealt: number;
  damageTaken: number;
  playerCrits: number;
  bossCrits: number;
  /** Hold Person was offered (boss has a paralyze action). True for all but Ilyich. */
  paralyzeOffered: boolean;
  /** Player saved against Hold Person. */
  paralyzeSaved: boolean;
  /** Player failed Hold Person (i.e. got locked down). */
  paralyzeFailed: boolean;
  /** Fighter: 1 if Second Wind burned, 0 otherwise. */
  secondWindUsed: number;
  /** Rogue: Cunning Action uses spent in the fight. */
  cunningUsed: number;
  /** Wizard: total spell slots consumed (sum across slot levels). */
  slotsCast: number;
}

function liveMonsters(state: CombatState): MonsterCombatant[] {
  return state.combatants.filter(
    (c) => c.kind === 'monster' && c.instance.hp.current > 0,
  ) as MonsterCombatant[];
}

function totalSlots(c: Character): number {
  const s = c.resources.spellSlots ?? {};
  return (s[1] ?? 0) + (s[2] ?? 0) + (s[3] ?? 0) + (s[4] ?? 0);
}

const MAX_ROUNDS = 25;

export function simulateBossFight(
  bossId: BossId,
  classId: ClassId,
  level: number,
  loadout: Loadout,
  seed: number,
): FightResult {
  const roller = createDiceRoller(seed);
  let character = characterAtLevel(classId, level);
  character = applyLoadout(character, loadout);

  const def = getMonster(bossId);
  const init = createCombat({
    roller,
    character,
    monsters: [{ def, displayName: def.name }],
  });
  let s = init.state;
  let ch = init.character;

  const startSlots = totalSlots(ch);
  const startCunning = ch.resources.cunningActionUsesRemaining ?? 0;
  const startSecondWind = ch.resources.secondWindAvailable === true;
  const bossStartHp = liveMonsters(s).reduce(
    (sum, m) => sum + m.instance.hp.current,
    0,
  );

  let lastAttackId = s.attackEventCounter;
  let lastSaveId = s.saveEventCounter ?? 0;

  let damageDealt = 0;
  let damageTaken = 0;
  let playerCrits = 0;
  let bossCrits = 0;
  let paralyzeSaved = false;
  let paralyzeFailed = false;

  function ingest(state: CombatState): void {
    if (state.lastAttack && state.lastAttack.id > lastAttackId) {
      lastAttackId = state.lastAttack.id;
      const dmg = state.lastAttack.damageDealt ?? 0;
      if (state.lastAttack.attackerKind === 'player') {
        damageDealt += dmg;
        if (state.lastAttack.crit) playerCrits += 1;
      } else {
        damageTaken += dmg;
        if (state.lastAttack.crit) bossCrits += 1;
      }
    }
    const sid = state.saveEventCounter ?? 0;
    if (state.lastSave && sid > lastSaveId) {
      lastSaveId = sid;
      // Only count paralyze (Hold Person and any future paralyze source).
      if (
        state.lastSave.sourceName.toLowerCase().includes('hold') ||
        state.lastSave.sourceName.toLowerCase().includes('stilling')
      ) {
        if (state.lastSave.success) paralyzeSaved = true;
        else paralyzeFailed = true;
      }
    }
  }

  for (let i = 0; i < MAX_ROUNDS * 8; i++) {
    if (s.status !== 'active') break;
    if (s.round > MAX_ROUNDS) break;
    const currentId = s.turnOrder[s.currentTurnIndex];
    if (currentId === 'player') {
      if (ch.hp.current <= 0) break;
      const r = takeTurn(roller, s, ch);
      s = r.state;
      ch = r.character;
      ingest(s);
      if (s.status !== 'active') break;
      const e = endTurn(s, ch);
      s = e.state;
      ch = e.character;
    } else {
      const r = monsterAttack({ roller, character: ch, state: s }, currentId);
      s = r.state;
      ch = r.character;
      ingest(s);
      if (s.status !== 'active') break;
      const e = endTurn(s, ch);
      s = e.state;
      ch = e.character;
    }
  }

  // Final damage-dealt fallback: if the fight ended mid-action and the
  // boss is dead, ensure damageDealt at least reflects bossStartHp.
  const bossEndHp = s.combatants
    .filter((c) => c.kind === 'monster')
    .reduce((sum, m) => sum + Math.max(0, m.instance.hp.current), 0);
  const dmgFromHp = bossStartHp - bossEndHp;
  if (dmgFromHp > damageDealt) damageDealt = dmgFromHp;

  const win = s.status === 'player-victory';
  const hpPct = win ? (ch.hp.current / ch.hp.max) * 100 : 0;

  const endSlots = totalSlots(ch);
  const endCunning = ch.resources.cunningActionUsesRemaining ?? 0;
  const endSecondWind = ch.resources.secondWindAvailable === true;

  const paralyzeOffered = paralyzeSaved || paralyzeFailed;

  return {
    win,
    rounds: s.round,
    hpPctOnWin: hpPct,
    damageDealt,
    damageTaken,
    playerCrits,
    bossCrits,
    paralyzeOffered,
    paralyzeSaved,
    paralyzeFailed,
    secondWindUsed: classId === 'fighter' && startSecondWind && !endSecondWind ? 1 : 0,
    cunningUsed: classId === 'rogue' ? Math.max(0, startCunning - endCunning) : 0,
    slotsCast: classId === 'wizard' ? Math.max(0, startSlots - endSlots) : 0,
  };
}

export interface CellAggregate {
  bossId: BossId;
  classId: ClassId;
  level: number;
  loadout: Loadout;
  runs: number;
  wins: number;
  winRate: number;          // 0-100
  avgRounds: number;
  avgHpPctOnWin: number;    // 0-100
  avgDamageDealt: number;
  avgDamageTaken: number;
  /** Crits per fight, averaged. */
  avgPlayerCrits: number;
  avgBossCrits: number;
  /** Fraction of fights in which the boss offered a paralyze (0-1). */
  paralyzeOfferedRate: number;
  /**
   * Per-attempt save success rate against Hold Person — denominator is fights
   * where paralyze was attempted (not total fights). 0 if boss has no
   * paralyze.
   */
  paralyzeSaveSuccessRate: number;
  /** Fighter only: rate of fights that burned Second Wind (0-1). */
  secondWindBurnRate: number;
  /** Rogue only: avg Cunning Action uses per fight. */
  avgCunningUsed: number;
  /** Wizard only: avg slots consumed per fight. */
  avgSlotsCast: number;
}

export function aggregateCell(
  bossId: BossId,
  classId: ClassId,
  level: number,
  loadout: Loadout,
  runs: number,
  seedBase: number,
): CellAggregate {
  let wins = 0;
  let totalRounds = 0;
  let totalHpPctOnWin = 0;
  let totalDamageDealt = 0;
  let totalDamageTaken = 0;
  let totalPlayerCrits = 0;
  let totalBossCrits = 0;
  let paralyzeAttempts = 0;
  let paralyzeSaves = 0;
  let secondWindBurns = 0;
  let totalCunning = 0;
  let totalSlotsConsumed = 0;
  for (let i = 0; i < runs; i++) {
    const r = simulateBossFight(bossId, classId, level, loadout, seedBase + i);
    if (r.win) {
      wins += 1;
      totalHpPctOnWin += r.hpPctOnWin;
    }
    totalRounds += r.rounds;
    totalDamageDealt += r.damageDealt;
    totalDamageTaken += r.damageTaken;
    totalPlayerCrits += r.playerCrits;
    totalBossCrits += r.bossCrits;
    if (r.paralyzeOffered) {
      paralyzeAttempts += 1;
      if (r.paralyzeSaved) paralyzeSaves += 1;
    }
    secondWindBurns += r.secondWindUsed;
    totalCunning += r.cunningUsed;
    totalSlotsConsumed += r.slotsCast;
  }
  return {
    bossId,
    classId,
    level,
    loadout,
    runs,
    wins,
    winRate: (wins / runs) * 100,
    avgRounds: totalRounds / runs,
    avgHpPctOnWin: wins > 0 ? totalHpPctOnWin / wins : 0,
    avgDamageDealt: totalDamageDealt / runs,
    avgDamageTaken: totalDamageTaken / runs,
    avgPlayerCrits: totalPlayerCrits / runs,
    avgBossCrits: totalBossCrits / runs,
    paralyzeOfferedRate: paralyzeAttempts / runs,
    paralyzeSaveSuccessRate:
      paralyzeAttempts > 0 ? (paralyzeSaves / paralyzeAttempts) * 100 : 0,
    secondWindBurnRate: classId === 'fighter' ? secondWindBurns / runs : 0,
    avgCunningUsed: classId === 'rogue' ? totalCunning / runs : 0,
    avgSlotsCast: classId === 'wizard' ? totalSlotsConsumed / runs : 0,
  };
}
