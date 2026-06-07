import type { Character } from '../../../types/character';
import type { CombatState } from '../../../types/combat';
import { appendLog } from '../log';
import { patchActionEconomy, patchResources } from '../types';
import {
  type CastResult,
  attachSpellEffect,
  consumeSlot,
  nextLogId,
} from './helpers';
import { t } from '../../../i18n';

export function castMistyStep(character: Readonly<Character>, state: CombatState): CastResult {
  let nextCharacter: Character = consumeSlot(character, 2);
  nextCharacter = patchResources(nextCharacter, { mistyStepActive: true });
  nextCharacter = patchActionEconomy(nextCharacter, { bonusActionUsed: true });
  nextCharacter = { ...nextCharacter, nextSaveAdvantage: true };
  let nextState: CombatState = appendLog(state, {
    id: nextLogId(state),
    kind: 'narration',
    text: t('combat.log.mistyStep', { name: nextCharacter.name }),
  });
  nextState = attachSpellEffect(nextState, 'misty-step', 'player');
  return { state: nextState, character: nextCharacter, cast: true };
}
