import type { Character } from '../../../types/character';
import type { CombatState } from '../../../types/combat';
import { appendLog } from '../log';
import { patchResources } from '../types';
import {
  type CastResult,
  attachSpellEffect,
  consumeSlot,
  markActionUsed,
  nextLogId,
} from './helpers';

export function castMageArmor(character: Readonly<Character>, state: CombatState): CastResult {
  let nextCharacter: Character = consumeSlot(character, 1);
  nextCharacter = patchResources(nextCharacter, { mageArmorActive: true });
  nextCharacter = markActionUsed(nextCharacter);
  let nextState: CombatState = appendLog(state, {
    id: nextLogId(state),
    kind: 'narration',
    text: `${nextCharacter.name} wraps themselves in shimmering force — +3 AC for this fight.`,
  });
  nextState = attachSpellEffect(nextState, 'mage-armor', 'player');
  return { state: nextState, character: nextCharacter, cast: true };
}
