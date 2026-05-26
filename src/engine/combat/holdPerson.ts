import type { AbilityName } from '../../types/abilities';
import type { ActiveCondition } from '../../types/conditions';
import type { Character } from '../../types/character';
import type { CombatState } from '../../types/combat';
import type { DiceRoller } from '../dice';
import { modifierFor } from '../character/derived';

/**
 * Hold Person and other paralyze effects. Boss-scoped for now (the Magistrate)
 * but written against the generic ActiveCondition shape so future spells reuse it.
 */

export function isPlayerParalyzed(character: Character): boolean {
  return character.conditions.some((c) => c.name === 'paralyzed');
}

export function getPlayerParalyzed(character: Character): ActiveCondition | undefined {
  return character.conditions.find((c) => c.name === 'paralyzed');
}

/**
 * Roll a saving throw against an applied paralyze effect. Returns whether the
 * save succeeded plus the natural and total for logging. Fighter saving-throw
 * proficiencies aren't honored yet (only WIS/CHA/INT saves come up in practice
 * via paralyze/charm/fear effects, and Fighter has none of those proficient
 * RAW). Add prof bonus tracking when we have a class that needs it.
 */
export function rollPlayerSave(
  roller: DiceRoller,
  character: Character,
  ability: AbilityName,
  dc: number,
): { success: boolean; natural: number; total: number; mod: number } {
  const mod = modifierFor(character, ability);
  const roll = roller.d20('normal', mod);
  return {
    success: roll.total >= dc,
    natural: roll.rolls[0],
    total: roll.total,
    mod,
  };
}

/**
 * Append a paralyzed condition to the player, replacing any existing one.
 * Caller is responsible for logging the application.
 */
export function applyParalyze(
  character: Character,
  options: { rounds: number; saveDC: number; saveAbility: AbilityName; source?: string },
): void {
  const without = character.conditions.filter((c) => c.name !== 'paralyzed');
  const condition: ActiveCondition = {
    name: 'paralyzed',
    duration: { kind: 'rounds', value: options.rounds },
    saveDC: options.saveDC,
    saveAbility: options.saveAbility,
    source: options.source,
  };
  character.conditions = [...without, condition];
}

export function removeParalyze(character: Character): void {
  character.conditions = character.conditions.filter((c) => c.name !== 'paralyzed');
}

/**
 * Decrement remaining rounds on the active paralyzed condition. Returns whether
 * the condition expired naturally (durations of 1 → 0 → expired).
 */
export function decrementParalyzeDuration(character: Character): boolean {
  const cond = getPlayerParalyzed(character);
  if (!cond || cond.duration.kind !== 'rounds') return false;
  const next = cond.duration.value - 1;
  if (next <= 0) {
    removeParalyze(character);
    return true;
  }
  character.conditions = character.conditions.map((c) =>
    c.name === 'paralyzed'
      ? { ...c, duration: { kind: 'rounds', value: next } }
      : c,
  );
  return false;
}

/**
 * Lock out the player's action economy for a paralyzed turn so the auto-end
 * turn effect picks the turn up immediately.
 */
export function lockOutActionEconomy(character: Character): void {
  character.actionEconomy = {
    ...character.actionEconomy,
    actionUsed: true,
    bonusActionUsed: true,
    reactionUsed: true,
    movementRemaining: 0,
  };
}

export function nextLogId(state: CombatState): number {
  return state.log.length + 1;
}
