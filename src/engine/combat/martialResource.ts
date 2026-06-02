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
 *  - A small pool that REFRESHES at the start of every encounter (createCombat).
 *  - Three spends — OFFENSE (a heavy/aimed strike, costs 2), DEFENSE (a guard
 *    that blunts the next incoming hit, costs 1), DISRUPT (a stagger that costs
 *    a telegraphing foe its next turn, costs 1).
 *  - At most ONE spend per turn (`martialSpentThisTurn`), so the pool is paced
 *    across the fight's key turns rather than dumped on turn one.
 *  - Spending is pure upside — the only cost is a point. No accuracy/defense
 *    tax.
 */

export const MARTIAL_POOL_MAX = 3;
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
 * Flat bonus damage an OFFENSE strike adds to EACH weapon strike this turn —
 * scales with level so the spike stays relevant as enemy HP climbs. Applies per
 * strike, so it compounds with Extra Attack.
 */
export function martialOffenseDamage(character: Readonly<Character>): number {
  return 4 + Math.floor(character.level / 2);
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
  const log: CombatLogEntry = {
    id: state.log.length + 1,
    kind: 'narration',
    text: `${next.name} commits to a ${flavor.offense} — this turn's strikes bite for ${martialOffenseDamage(next)} more.`,
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
