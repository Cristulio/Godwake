import type { Character } from '../../types/character';
import type { CombatState, CombatLogEntry } from '../../types/combat';
import type { ClassId } from '../../schemas/ids';
import { characterHasMechanic } from '../character/derived';
import {
  combatResult,
  patchResources,
  type CombatActionResult,
} from './types';
import { appendLog } from './log';
import { attachCombatVfx } from './vfx';

/**
 * The shared martial resource — the engine the Fighter, Barbarian, and Ranger
 * spend each fight to turn auto-attack turns into save-vs-spend decisions. One
 * pool, IDENTICAL rules for all three; only the flavor (pool name + ability
 * names) differs per class.
 *
 *  - A pool that REFRESHES at the start of every encounter (createCombat) AND
 *    REGENERATES one point on a cadence through the fight (regenMartialPoolForRound,
 *    ticked in endTurn), capped at the class max — so a lever stays live across the
 *    WHOLE fight, not just the opening rounds (the pool used to empty by round 3
 *    while the average fight runs ~4, so the tail reverted to auto-attack).
 *  - Three spends — OFFENSE (a heavy/aimed strike, costs 2), DEFENSE (a guard
 *    that blunts the next incoming hit, costs 1), DISRUPT (a stagger that costs
 *    a telegraphing foe its next turn, costs 1).
 *  - At most ONE spend per turn (`martialSpentThisTurn`), so the pool is paced
 *    across the fight's key turns rather than dumped on turn one. Cap + one-per-
 *    turn + slow regen keep it save-vs-spend (bank one or two, pick the moment),
 *    never spam.
 *  - Spending is pure upside — the only cost is a point. No accuracy/defense
 *    tax.
 *
 * The Fighter carries a DEEPER well and regenerates it FASTER: it has no Rage /
 * Hunter's-Mark damage multiplier to lean on between spends, so the pool is its
 * whole turn-to-turn lever.
 */

export const MARTIAL_POOL_MAX = 3;
/** The Fighter's deeper pool — it leans hardest on the resource (no Rage/Mark). */
export const MARTIAL_POOL_MAX_FIGHTER = 4;
export const MARTIAL_OFFENSE_COST = 2;
export const MARTIAL_DEFENSE_COST = 1;
export const MARTIAL_DISRUPT_COST = 1;
/** Turns a foe felled by a DISRUPT strike loses (one whole turn). */
export const MARTIAL_DISRUPT_STAGGER_TURNS = 1;

const MARTIAL_CLASSES: ReadonlySet<ClassId> = new Set(['fighter', 'barbarian', 'ranger']);

/** True for the three classes that wield the martial resource pool. */
export function isMartialClass(character: Readonly<Character>): boolean {
  return MARTIAL_CLASSES.has(character.classId);
}

/**
 * The class's pool ceiling — both the per-fight refresh target and the regen cap.
 * The Fighter's is deeper ({@link MARTIAL_POOL_MAX_FIGHTER}); Barbarian and Ranger
 * share the baseline ({@link MARTIAL_POOL_MAX}). Zero for non-martial classes.
 */
export function martialPoolMax(character: Readonly<Character>): number {
  if (!isMartialClass(character)) return 0;
  return character.classId === 'fighter' ? MARTIAL_POOL_MAX_FIGHTER : MARTIAL_POOL_MAX;
}

/**
 * Rounds between mid-fight regen ticks. The Fighter tops up every round; the
 * Barbarian and Ranger every OTHER round (they have a damage multiplier — Rage /
 * Hunter's Mark — to ride between spends, so they don't need the pool as often).
 */
export function martialRegenInterval(character: Readonly<Character>): number {
  return character.classId === 'fighter' ? 1 : 2;
}

/**
 * Mid-fight pool regen. Called at the start of each of the hero's turns (endTurn).
 * Adds one point on a regen-tick round, capped at the class max. The pool already
 * refreshes full on round 1 (createCombat), so ticks begin the next time the hero
 * acts: rounds 2,3,4,… for the Fighter (interval 1); rounds 3,5,7,… for the
 * Barbarian/Ranger (interval 2). Returns the SAME reference when nothing changes,
 * so callers can cheaply detect a real top-up.
 */
export function regenMartialPoolForRound(
  character: Readonly<Character>,
  round: number,
): Character {
  const self = character as Character;
  if (!isMartialClass(character)) return self;
  const interval = martialRegenInterval(character);
  if (round <= 1 || (round - 1) % interval !== 0) return self;
  const max = martialPoolMax(character);
  const current = martialPointsLeft(character);
  if (current >= max) return self;
  return patchResources(self, { martialPointsRemaining: current + 1 });
}

export interface MartialFlavor {
  /** The pool's in-world name. */
  pool: string;
  offense: string;
  defense: string;
  disrupt: string;
}

const FLAVOR: Partial<Record<ClassId, MartialFlavor>> = {
  fighter: { pool: 'Resolve', offense: 'Power Attack', defense: 'Brace', disrupt: 'Shield Bash' },
  barbarian: { pool: 'Fury', offense: 'Savage Cleave', defense: 'Bloodied Guard', disrupt: 'Knockdown' },
  ranger: { pool: 'Focus', offense: 'Aimed Shot', defense: 'Set Stance', disrupt: 'Crippling Shot' },
};

/** The class's martial flavor strings, or null for a non-martial class. */
export function martialFlavor(character: Readonly<Character>): MartialFlavor | null {
  return FLAVOR[character.classId] ?? null;
}

export function martialPointsLeft(character: Readonly<Character>): number {
  return character.resources.martialPointsRemaining ?? 0;
}

/**
 * Flat bonus damage an OFFENSE strike adds to EACH weapon strike this turn,
 * applied per strike so it rides Extra Attack.
 *
 * The Fighter's Power Attack is the reliability spend — it trades the big flat
 * spike for a small +2 bite paired with a +2 to-hit ({@link
 * martialOffenseAttackBonus}). A class that misses often wants the blow to LAND
 * surer, not just hit harder. The Barbarian (Savage Cleave) and Ranger (Aimed
 * Shot) keep the level-scaled spike — tuned UP so at 2 points it clearly
 * out-earns two 1-point spends.
 */
export function martialOffenseDamage(character: Readonly<Character>): number {
  if (character.classId === 'fighter') return 2;
  return 6 + Math.floor(character.level / 2);
}

/**
 * To-hit bonus the OFFENSE strike adds to every swing this turn. Only the
 * Fighter's Power Attack carries one (+2) — its whole point is reliability. The
 * Barbarian/Ranger OFFENSE keeps no accuracy axis (Savage Cleave spills a second
 * blow; Aimed Shot rides the flat spike), so they read zero.
 */
export function martialOffenseAttackBonus(character: Readonly<Character>): number {
  return character.classId === 'fighter' ? 2 : 0;
}

/** Damage a DEFENSE guard blunts off the next incoming hit. */
export function martialDefenseReduction(character: Readonly<Character>): number {
  return 4 + Math.floor(character.level / 2);
}

export interface MartialContext {
  character: Character;
  state: CombatState;
}

function canSpend(character: Readonly<Character>, mechanicKey: string, cost: number): boolean {
  if (!isMartialClass(character)) return false;
  if (!characterHasMechanic(character as Character, mechanicKey)) return false;
  if (character.martialSpentThisTurn === true) return false;
  return martialPointsLeft(character) >= cost;
}

/**
 * OFFENSE — a heavy/aimed strike. A free stance declared before the swing:
 * spends {@link MARTIAL_OFFENSE_COST} points to add {@link martialOffenseDamage}
 * to every strike this turn (read in playerAttack). For the Barbarian the same
 * declaration also cleaves a glancing blow into a second foe.
 */
export function useMartialOffense(ctx: MartialContext): CombatActionResult {
  const { character, state } = ctx;
  if (character.martialOffenseActive === true) return combatResult(state, character);
  if (character.actionEconomy.actionUsed) return combatResult(state, character);
  if (!canSpend(character, 'martial-offense', MARTIAL_OFFENSE_COST)) {
    return combatResult(state, character);
  }
  const flavor = martialFlavor(character)!;
  let next: Character = { ...character, martialOffenseActive: true, martialSpentThisTurn: true };
  next = patchResources(next, {
    martialPointsRemaining: martialPointsLeft(character) - MARTIAL_OFFENSE_COST,
  });
  const offenseText =
    next.classId === 'fighter'
      ? `${next.name} commits to a ${flavor.offense} — this turn's strikes land surer (+${martialOffenseAttackBonus(next)} to hit) and bite for ${martialOffenseDamage(next)} more.`
      : `${next.name} commits to a ${flavor.offense} — this turn's strikes bite for ${martialOffenseDamage(next)} more.`;
  const log: CombatLogEntry = {
    id: state.log.length + 1,
    kind: 'narration',
    text: offenseText,
  };
  return combatResult(attachCombatVfx(appendLog(state, log), 'reckless', 'player'), next);
}

/**
 * DEFENSE — a guard set against a telegraphed blow. Free: spends {@link
 * MARTIAL_DEFENSE_COST} point to blunt the next incoming hit by {@link
 * martialDefenseReduction}. Folds onto the shared one-shot `incomingDamageReduction`
 * field (taking the larger of any pending reduction) so it never silently
 * overwrites a Rogue's Disengage.
 */
export function useMartialDefense(ctx: MartialContext): CombatActionResult {
  const { character, state } = ctx;
  if (!canSpend(character, 'martial-defense', MARTIAL_DEFENSE_COST)) {
    return combatResult(state, character);
  }
  const flavor = martialFlavor(character)!;
  const reduction = martialDefenseReduction(character);
  let next: Character = {
    ...character,
    incomingDamageReduction: Math.max(character.incomingDamageReduction ?? 0, reduction),
    martialSpentThisTurn: true,
  };
  next = patchResources(next, {
    martialPointsRemaining: martialPointsLeft(character) - MARTIAL_DEFENSE_COST,
  });
  const log: CombatLogEntry = {
    id: state.log.length + 1,
    kind: 'narration',
    text: `${next.name} sets a ${flavor.defense} — the next blow is blunted by ${reduction}.`,
  };
  return combatResult(attachCombatVfx(appendLog(state, log), 'shield', 'player'), next);
}

/**
 * DISRUPT — a control strike that interrupts a foe's wind-up. Free: spends
 * {@link MARTIAL_DISRUPT_COST} point to arm a staggering strike. The next weapon
 * hit fells its target — it loses its next turn (resolved in playerAttack). The
 * point is spent on declaration; the stagger only lands on a connecting hit.
 */
export function useMartialDisrupt(ctx: MartialContext): CombatActionResult {
  const { character, state } = ctx;
  if (character.martialDisruptActive === true) return combatResult(state, character);
  if (character.actionEconomy.actionUsed) return combatResult(state, character);
  if (!canSpend(character, 'martial-disrupt', MARTIAL_DISRUPT_COST)) {
    return combatResult(state, character);
  }
  const flavor = martialFlavor(character)!;
  let next: Character = { ...character, martialDisruptActive: true, martialSpentThisTurn: true };
  next = patchResources(next, {
    martialPointsRemaining: martialPointsLeft(character) - MARTIAL_DISRUPT_COST,
  });
  const log: CombatLogEntry = {
    id: state.log.length + 1,
    kind: 'narration',
    text: `${next.name} winds up a ${flavor.disrupt} — the next hit will stagger its mark.`,
  };
  return combatResult(attachCombatVfx(appendLog(state, log), 'reckless', 'player'), next);
}
