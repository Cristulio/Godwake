import type { AbilityName, AbilityScores } from '../../types/abilities';
import { ABILITY_NAMES } from '../../types/abilities';
import type { ClassId } from '../../schemas/ids';

export const POINT_BUY_FLOOR = 8;
export const POINT_BUY_CAP = 20;

/** Score values distributed across the six abilities, highest-to-lowest. */
const BASE_ARRAY = [15, 14, 13, 12, 10, 8] as const;

/**
 * Per-class ability priority, highest score first. BASE_ARRAY maps onto these
 * in order, so the primary stat always gets the 15. Secondary slots are tuned
 * for what each class actually leans on (CON for survivability, then the
 * class's save/utility stats, dump stat last).
 */
const CLASS_PRIORITY: Record<ClassId, readonly AbilityName[]> = {
  fighter: ['str', 'con', 'dex', 'wis', 'int', 'cha'],
  rogue: ['dex', 'con', 'int', 'wis', 'cha', 'str'],
  wizard: ['int', 'dex', 'con', 'wis', 'cha', 'str'],
  cleric: ['wis', 'con', 'str', 'dex', 'int', 'cha'],
  barbarian: ['str', 'con', 'dex', 'wis', 'int', 'cha'],
};

/** The class's auto-assigned base array — valid by default (budget-balanced). */
export function defaultScoresForClass(classId: ClassId): AbilityScores {
  const priority = CLASS_PRIORITY[classId];
  const scores = {} as AbilityScores;
  priority.forEach((ability, i) => {
    scores[ability] = BASE_ARRAY[i];
  });
  return scores;
}

/**
 * Point-buy cost of a single base score. Floor 8 costs 0; each step up to 18
 * costs 1 (so 18 = 10). The 19th and 20th steps cost 2 each, so 19 = 12 and
 * 20 = 14 — the surcharge above 18.
 */
export function pointBuyCost(score: number): number {
  const linear = Math.max(0, Math.min(score, 18) - POINT_BUY_FLOOR);
  const surcharge = Math.max(0, Math.min(score, POINT_BUY_CAP) - 18) * 2;
  return linear + surcharge;
}

export function totalCost(scores: AbilityScores): number {
  return ABILITY_NAMES.reduce((sum, a) => sum + pointBuyCost(scores[a]), 0);
}

/** Budget = total cost of the class's auto-assigned array (conserved). */
export function budgetForClass(classId: ClassId): number {
  return totalCost(defaultScoresForClass(classId));
}

export function pointsRemaining(scores: AbilityScores, budget: number): number {
  return budget - totalCost(scores);
}

/** Cost to raise a score by one step. 2 above 18, 1 below, ∞ at the cap. */
export function raiseCost(score: number): number {
  if (score >= POINT_BUY_CAP) return Infinity;
  return pointBuyCost(score + 1) - pointBuyCost(score);
}

export function canRaise(score: number, remaining: number): boolean {
  if (score >= POINT_BUY_CAP) return false;
  return remaining >= raiseCost(score);
}

export function canLower(score: number): boolean {
  return score > POINT_BUY_FLOOR;
}
