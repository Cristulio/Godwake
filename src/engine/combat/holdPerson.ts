import type { AbilityName } from '../../types/abilities';
import type { ActiveCondition } from '../../types/conditions';
import type { Character } from '../../types/character';
import type { CombatState } from '../../types/combat';
import type { DiceRoller } from '../dice';
import { modifierFor } from '../character/derived';
import { patchActionEconomy } from './types';

/**
 * Hold Person and other paralyze effects. Boss-scoped for now (the Magistrate)
 * but written against the generic ActiveCondition shape so future spells reuse it.
 *
 * All mutators in this module are PURE — they take a Readonly<Character> and
 * return a freshly-patched Character. Callers thread the returned value
 * through their local `nextCharacter` accumulator.
 */

export function isPlayerParalyzed(character: Readonly<Character>): boolean {
  return character.conditions.some((c) => c.name === 'paralyzed');
}

export function getPlayerParalyzed(
  character: Readonly<Character>,
): ActiveCondition | undefined {
  return character.conditions.find((c) => c.name === 'paralyzed');
}

/**
 * Roll a saving throw against an applied paralyze effect. Returns whether the
 * save succeeded plus the natural and total for logging. Honors
 * `character.nextSaveAdvantage` (Rogue Steel Yourself / Wizard Misty Step) —
 * if set, the roll is made with advantage and the flag is consumed regardless
 * of outcome. The returned `character` reflects the consumed flag; callers
 * must thread it through their `nextCharacter` accumulator.
 *
 * Fighter saving-throw proficiencies aren't honored yet (only WIS/CHA/INT
 * saves come up in practice via paralyze/charm/fear effects, and Fighter has
 * none of those proficient RAW). Add prof bonus tracking when we have a class
 * that needs it.
 */
export function rollPlayerSave(
  roller: DiceRoller,
  character: Readonly<Character>,
  ability: AbilityName,
  dc: number,
): {
  success: boolean;
  natural: number;
  total: number;
  mod: number;
  advantage: boolean;
  character: Character;
} {
  const mod = modifierFor(character, ability);
  const advantage = !!character.nextSaveAdvantage;
  const roll = roller.d20(advantage ? 'advantage' : 'normal', mod);
  const next: Character = advantage
    ? { ...character, nextSaveAdvantage: false }
    : (character as Character);
  return {
    success: roll.total >= dc,
    natural: roll.rolls[0],
    total: roll.total,
    mod,
    advantage,
    character: next,
  };
}

/**
 * Append a paralyzed condition to the player, replacing any existing one.
 * Returns the patched character; caller logs the application separately.
 */
export function applyParalyze(
  character: Readonly<Character>,
  options: { rounds: number; saveDC: number; saveAbility: AbilityName; source?: string },
): Character {
  const without = character.conditions.filter((c) => c.name !== 'paralyzed');
  const condition: ActiveCondition = {
    name: 'paralyzed',
    duration: { kind: 'rounds', value: options.rounds },
    saveDC: options.saveDC,
    saveAbility: options.saveAbility,
    source: options.source,
  };
  return { ...character, conditions: [...without, condition] };
}

export function removeParalyze(character: Readonly<Character>): Character {
  return {
    ...character,
    conditions: character.conditions.filter((c) => c.name !== 'paralyzed'),
  };
}

/**
 * Decrement remaining rounds on the active paralyzed condition. Returns the
 * patched character along with whether the condition expired naturally
 * (durations of 1 → 0 → expired).
 */
export function decrementParalyzeDuration(
  character: Readonly<Character>,
): { character: Character; expired: boolean } {
  const cond = getPlayerParalyzed(character);
  if (!cond || cond.duration.kind !== 'rounds') {
    return { character, expired: false };
  }
  const next = cond.duration.value - 1;
  if (next <= 0) {
    return { character: removeParalyze(character), expired: true };
  }
  return {
    character: {
      ...character,
      conditions: character.conditions.map((c) =>
        c.name === 'paralyzed'
          ? { ...c, duration: { kind: 'rounds', value: next } }
          : c,
      ),
    },
    expired: false,
  };
}

/**
 * Lock out the player's action economy for a paralyzed turn so the auto-end
 * turn effect picks the turn up immediately. Returns the patched character.
 */
export function lockOutActionEconomy(character: Readonly<Character>): Character {
  return patchActionEconomy(character, {
    actionUsed: true,
    bonusActionUsed: true,
    reactionUsed: true,
    movementRemaining: 0,
  });
}

export function nextLogId(state: CombatState): number {
  return state.log.length + 1;
}
