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

export function castShield(character: Readonly<Character>, state: CombatState): CastResult {
  let nextCharacter: Character = consumeSlot(character, 1);
  nextCharacter = patchResources(nextCharacter, { shieldActive: true });
  // Shield is a reaction in 5e — does NOT cost the player's action. Marking
  // the reaction so a follow-up Shield in the same round is gated.
  nextCharacter = patchActionEconomy(nextCharacter, { reactionUsed: true });
  let nextState: CombatState = appendLog(state, {
    id: nextLogId(state),
    kind: 'narration',
    text: `${nextCharacter.name} snaps a wall of force into place — +5 AC until next turn.`,
  });
  nextState = attachSpellEffect(nextState, 'shield', 'player');
  return { state: nextState, character: nextCharacter, cast: true };
}
