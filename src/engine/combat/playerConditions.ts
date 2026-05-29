import type { AbilityName } from '../../types/abilities';
import type { ActiveCondition, ConditionName } from '../../types/conditions';
import type { Character } from '../../types/character';

/**
 * Generic player-condition handling for monster `debuff` actions. Paralysis is
 * the one exception — it has its own save-each-turn loop in holdPerson.ts and
 * is NOT touched here (tickPlayerConditions deliberately skips it).
 *
 * All functions are PURE: they take a Readonly<Character> and return a freshly
 * patched Character. Callers thread the result through their accumulator.
 */

/** Default weapon-damage loss per hit while 'weakened' (when the debuff omits an amount). */
export const DEFAULT_WEAKENED_AMOUNT = 3;

export function playerHasCondition(
  character: Readonly<Character>,
  name: ConditionName,
): boolean {
  return character.conditions.some((c) => c.name === name);
}

/**
 * Apply (or refresh) a rounds-based condition on the player, replacing any
 * existing instance of the same name. `level` carries the weaken amount for
 * 'weakened'; ignored for the others.
 */
export function applyPlayerCondition(
  character: Readonly<Character>,
  options: {
    name: ConditionName;
    rounds: number;
    saveDC?: number;
    saveAbility?: AbilityName;
    source?: string;
    level?: number;
  },
): Character {
  const without = character.conditions.filter((c) => c.name !== options.name);
  const condition: ActiveCondition = {
    name: options.name,
    duration: { kind: 'rounds', value: options.rounds },
    saveDC: options.saveDC,
    saveAbility: options.saveAbility,
    source: options.source,
    level: options.level,
  };
  return { ...character, conditions: [...without, condition] };
}

export interface PlayerConditionMods {
  /** Player rolls attacks at disadvantage (poisoned, frightened, blinded, restrained). */
  attackDisadvantage: boolean;
  /** Attackers gain advantage against the player (blinded, restrained). */
  grantsAttackerAdvantage: boolean;
  /** Flat reduction to the player's outgoing weapon damage (weakened, summed). */
  outgoingDamagePenalty: number;
}

/**
 * Fold the player's active conditions into combat modifiers. Read by
 * playerAttack (to-hit disadvantage + damage penalty) and monsterAttack
 * (attacker advantage). Paralyzed is handled separately and not folded here.
 */
export function playerConditionMods(character: Readonly<Character>): PlayerConditionMods {
  let attackDisadvantage = false;
  let grantsAttackerAdvantage = false;
  let outgoingDamagePenalty = 0;
  for (const c of character.conditions) {
    switch (c.name) {
      case 'poisoned':
      case 'frightened':
        attackDisadvantage = true;
        break;
      case 'blinded':
      case 'restrained':
        attackDisadvantage = true;
        grantsAttackerAdvantage = true;
        break;
      case 'weakened':
        outgoingDamagePenalty += c.level ?? DEFAULT_WEAKENED_AMOUNT;
        break;
      default:
        break;
    }
  }
  return { attackDisadvantage, grantsAttackerAdvantage, outgoingDamagePenalty };
}

/**
 * Tick down every rounds-based condition on the player by one round at the
 * start of their turn, dropping any that expire. Paralyzed is skipped — its
 * save-each-turn resolution owns its own duration. Returns the patched
 * character plus the names that just expired, for logging.
 */
export function tickPlayerConditions(
  character: Readonly<Character>,
): { character: Character; expired: ConditionName[] } {
  const expired: ConditionName[] = [];
  const next: ActiveCondition[] = [];
  let changed = false;
  for (const c of character.conditions) {
    if (c.name === 'paralyzed' || c.duration.kind !== 'rounds') {
      next.push(c);
      continue;
    }
    const value = c.duration.value - 1;
    changed = true;
    if (value <= 0) {
      expired.push(c.name);
      continue;
    }
    next.push({ ...c, duration: { kind: 'rounds', value } });
  }
  if (!changed) return { character: character as Character, expired };
  return { character: { ...character, conditions: next }, expired };
}
