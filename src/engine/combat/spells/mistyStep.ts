import type { Character } from '../../../types/character';
import type { CombatState } from '../../../types/combat';
import { appendLog } from '../log';
import {
  type CastResult,
  attachSpellEffect,
  consumeSlot,
  nextLogId,
} from './helpers';

export function castMistyStep(character: Character, state: CombatState): CastResult {
  consumeSlot(character, 2);
  character.resources = { ...character.resources, mistyStepActive: true };
  character.actionEconomy = { ...character.actionEconomy, bonusActionUsed: true };
  let nextState: CombatState = appendLog(state, {
    id: nextLogId(state),
    kind: 'narration',
    text: `${character.name} steps through a curl of silver mist — +2 AC until next turn.`,
  });
  nextState = attachSpellEffect(nextState, 'misty-step', 'player');
  return { state: nextState, character, cast: true };
}
