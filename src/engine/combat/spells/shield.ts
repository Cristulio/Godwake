import type { Character } from '../../../types/character';
import type { CombatState } from '../../../types/combat';
import { appendLog } from '../log';
import {
  type CastResult,
  attachSpellEffect,
  consumeSlot,
  nextLogId,
} from './helpers';

export function castShield(character: Character, state: CombatState): CastResult {
  consumeSlot(character, 1);
  character.resources = { ...character.resources, shieldActive: true };
  // Shield is a reaction in 5e — does NOT cost the player's action. Marking
  // the reaction so a follow-up Shield in the same round is gated.
  character.actionEconomy = { ...character.actionEconomy, reactionUsed: true };
  let nextState: CombatState = appendLog(state, {
    id: nextLogId(state),
    kind: 'narration',
    text: `${character.name} snaps a wall of force into place — +5 AC until next turn.`,
  });
  nextState = attachSpellEffect(nextState, 'shield', 'player');
  return { state: nextState, character, cast: true };
}
