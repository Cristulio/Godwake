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

/** Rounds the displacement holds. Read by the monster-attack path as a disadvantage source. */
export const BLUR_ROUNDS = 3;

export function castBlur(character: Readonly<Character>, state: CombatState): CastResult {
  let nextCharacter: Character = consumeSlot(character, 2);
  nextCharacter = patchResources(nextCharacter, { blurRoundsRemaining: BLUR_ROUNDS });
  nextCharacter = markActionUsed(nextCharacter);
  let nextState: CombatState = appendLog(state, {
    id: nextLogId(state),
    kind: 'narration',
    text: `${nextCharacter.name}'s outline smears into a doubled blur — for ${BLUR_ROUNDS} rounds, attackers strike at disadvantage.`,
  });
  // Reuse the Misty Step self-shimmer overlay — a smear of displacement.
  nextState = attachSpellEffect(nextState, 'misty-step', 'player');
  return { state: nextState, character: nextCharacter, cast: true };
}
