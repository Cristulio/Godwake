import type { Character } from '../../../types/character';
import type { CombatState } from '../../../types/combat';
import { appendLog } from '../log';
import {
  type CastResult,
  attachSpellEffect,
  consumeSlot,
  markActionUsed,
  nextLogId,
} from './helpers';

export function castMageArmor(character: Character, state: CombatState): CastResult {
  consumeSlot(character, 1);
  character.resources = { ...character.resources, mageArmorActive: true };
  markActionUsed(character);
  let nextState: CombatState = appendLog(state, {
    id: nextLogId(state),
    kind: 'narration',
    text: `${character.name} wraps themselves in shimmering force — +3 AC for this fight.`,
  });
  nextState = attachSpellEffect(nextState, 'mage-armor', 'player');
  return { state: nextState, character, cast: true };
}
