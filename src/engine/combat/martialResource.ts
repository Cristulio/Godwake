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
import { t } from '../../i18n';

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
 *  - Three spends — OFFENSE (a heavy/aimed strike), DEFENSE (a guard that blunts
 *    the next incoming hit, costs 1), DISRUPT (a stagger that costs a telegraphing
 *    foe its next turn). DISRUPT costs 2 for ALL three classes — denying a whole
 *    turn is the pool's strongest effect, and at 2 points (against a shallow pool,
 *    slow regen, and one spend/turn) a stun lands every OTHER turn at best, never
 *    every turn: no stunlock. So the Barbarian pays 2 / 1 / 2 and the Fighter
 *    2 / 1 / 2; the Ranger's Focus is 1 / 1 / 2 — Aimed Shot is a cheap 1-point
 *    poke (half the spike) while Crippling Shot pays the full 2 (see
 *    {@link martialOffenseCost} / {@link martialDisruptCost}).
 *  - At most ONE spend per turn (`martialSpentThisTurn`), so the pool is paced
 *    across the fight's key turns rather than dumped on turn one. Cap + one-per-
 *    turn + slow regen keep it save-vs-spend (bank one or two, pick the moment),
 *    never spam.
 *  - Spending is pure upside — the only cost is a point. No accuracy/defense
 *    tax.
 *
 * The Fighter carries a DEEPER well — it has no Rage / Hunter's-Mark damage
 * multiplier to lean on between spends, so the pool is its whole turn-to-turn
 * lever — but tops it up on the same slow cadence as the others, so it stays a
 * scarce, save-it resource rather than one that refills as fast as it is spent.
 */

export const MARTIAL_POOL_MAX = 3;
/** The Fighter's deeper pool — it leans hardest on the resource (no Rage/Mark). */
export const MARTIAL_POOL_MAX_FIGHTER = 4;
/** DEFENSE costs the same single point for all three martial classes. OFFENSE
 *  and DISRUPT vary by class — see {@link martialOffenseCost} /
 *  {@link martialDisruptCost}. */
export const MARTIAL_DEFENSE_COST = 1;
/** Turns a foe felled by a DISRUPT strike loses (one whole turn). */
export const MARTIAL_DISRUPT_STAGGER_TURNS = 1;
/**
 * Rounds between mid-fight regen ticks — every OTHER round for ALL three pools.
 * The pool refreshes full at the start of each fight (createCombat); this paces
 * the mid-fight top-up so Resolve / Fury / Focus stays a scarce, save-it resource
 * rather than one that refills as fast as it is spent.
 */
export const MARTIAL_REGEN_INTERVAL = 2;

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
 * Mid-fight pool regen. Called at the start of each of the hero's turns (endTurn).
 * Adds one point on a regen-tick round, capped at the class max. The pool already
 * refreshes full on round 1 (createCombat), so ticks begin on rounds 3,5,7,… for
 * every martial class ({@link MARTIAL_REGEN_INTERVAL}) — the Fighter just tops up
 * into a deeper pool. Returns the SAME reference when nothing changes, so callers
 * can cheaply detect a real top-up.
 */
export function regenMartialPoolForRound(
  character: Readonly<Character>,
  round: number,
): Character {
  const self = character as Character;
  if (!isMartialClass(character)) return self;
  if (round <= 1 || (round - 1) % MARTIAL_REGEN_INTERVAL !== 0) return self;
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

const FLAVOR_CLASSES: ReadonlySet<ClassId> = new Set(['fighter', 'barbarian', 'ranger']);

/** The class's martial flavor strings, or null for a non-martial class. Resolved
 *  through t() each call so a language switch re-localizes the pool + ability
 *  names live (ActionBar/HUD read these as button + pip labels). */
export function martialFlavor(character: Readonly<Character>): MartialFlavor | null {
  const cls = character.classId;
  if (!FLAVOR_CLASSES.has(cls)) return null;
  return {
    pool: t(`combat.martial.${cls}.pool`),
    offense: t(`combat.martial.${cls}.offense`),
    defense: t(`combat.martial.${cls}.defense`),
    disrupt: t(`combat.martial.${cls}.disrupt`),
  };
}

export function martialPointsLeft(character: Readonly<Character>): number {
  return character.resources.martialPointsRemaining ?? 0;
}

/**
 * Pool cost to declare an OFFENSE strike. The Fighter and Barbarian pay 2 for
 * the heavy spike; the Ranger's Aimed Shot is a cheap 1-point poke that lands
 * for half the spike ({@link martialOffenseDamage}) — a small recurring bite,
 * not a 2-point burst.
 */
export function martialOffenseCost(character: Readonly<Character>): number {
  return character.classId === 'ranger' ? 1 : 2;
}

/**
 * Pool cost to arm a DISRUPT strike — a uniform 2 for all three martial classes
 * (Barbarian Knockdown, Fighter Shield Bash, Ranger Crippling Shot). Denying a
 * foe a whole turn is the pool's strongest effect, so it always pays the top
 * price: at 2 points against a shallow pool, slow regen, and one spend/turn, a
 * stun lands every OTHER turn at best — never every turn, so no recoverable
 * resource buys an every-turn stunlock.
 */
export function martialDisruptCost(_character: Readonly<Character>): number {
  return 2;
}

/**
 * Flat bonus damage an OFFENSE strike adds to EACH weapon strike this turn,
 * applied per strike so it rides Extra Attack.
 *
 * The Fighter's Power Attack is the reliability spend — it trades the big flat
 * spike for a small +2 bite paired with a +2 to-hit ({@link
 * martialOffenseAttackBonus}). A class that misses often wants the blow to LAND
 * surer, not just hit harder. The Barbarian (Savage Cleave) keeps the full
 * level-scaled spike at its 2-point cost. The Ranger's Aimed Shot is a cheap
 * 1-point poke ({@link martialOffenseCost}), so it lands for HALF that spike.
 */
export function martialOffenseDamage(character: Readonly<Character>): number {
  if (character.classId === 'fighter') return 2;
  const spike = 6 + Math.floor(character.level / 2);
  return character.classId === 'ranger' ? Math.floor(spike / 2) : spike;
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
 * spends {@link martialOffenseCost} points to add {@link martialOffenseDamage}
 * to every strike this turn (read in playerAttack). For the Barbarian the same
 * declaration also cleaves a glancing blow into a second foe.
 */
export function useMartialOffense(ctx: MartialContext): CombatActionResult {
  const { character, state } = ctx;
  if (character.martialOffenseActive === true) return combatResult(state, character);
  if (character.actionEconomy.actionUsed) return combatResult(state, character);
  const cost = martialOffenseCost(character);
  if (!canSpend(character, 'martial-offense', cost)) {
    return combatResult(state, character);
  }
  const flavor = martialFlavor(character)!;
  let next: Character = { ...character, martialOffenseActive: true, martialSpentThisTurn: true };
  next = patchResources(next, {
    martialPointsRemaining: martialPointsLeft(character) - cost,
  });
  const offenseText =
    next.classId === 'fighter'
      ? t('combat.log.offenseFighter', {
          name: next.name,
          offense: flavor.offense,
          hit: martialOffenseAttackBonus(next),
          dmg: martialOffenseDamage(next),
        })
      : t('combat.log.offenseOther', {
          name: next.name,
          offense: flavor.offense,
          dmg: martialOffenseDamage(next),
        });
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
    text: t('combat.log.defense', { name: next.name, defense: flavor.defense, reduction }),
  };
  return combatResult(attachCombatVfx(appendLog(state, log), 'shield', 'player'), next);
}

/**
 * DISRUPT — a control strike that interrupts a foe's wind-up. Free: spends
 * {@link martialDisruptCost} point(s) to arm a staggering strike. The next weapon
 * hit fells its target — it loses its next turn (resolved in playerAttack). The
 * point is spent on declaration and the strike is a ONE-SHOT that must connect:
 * a landing hit staggers, but a clean MISS burns both the stagger and the spent
 * point — the stance does not carry to the next swing.
 */
export function useMartialDisrupt(ctx: MartialContext): CombatActionResult {
  const { character, state } = ctx;
  if (character.martialDisruptActive === true) return combatResult(state, character);
  if (character.actionEconomy.actionUsed) return combatResult(state, character);
  const cost = martialDisruptCost(character);
  if (!canSpend(character, 'martial-disrupt', cost)) {
    return combatResult(state, character);
  }
  const flavor = martialFlavor(character)!;
  let next: Character = { ...character, martialDisruptActive: true, martialSpentThisTurn: true };
  next = patchResources(next, {
    martialPointsRemaining: martialPointsLeft(character) - cost,
  });
  const log: CombatLogEntry = {
    id: state.log.length + 1,
    kind: 'narration',
    text: t('combat.log.disrupt', { name: next.name, disrupt: flavor.disrupt }),
  };
  return combatResult(attachCombatVfx(appendLog(state, log), 'reckless', 'player'), next);
}
