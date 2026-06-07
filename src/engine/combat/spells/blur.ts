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
import { t } from '../../../i18n';

/**
 * Rounds the displacement holds. Read by the monster-attack path as a
 * disadvantage source. Set to 5 (a full combat's worth) so Blur is worth a
 * whole action + 2nd-level slot — it's the sustained-defense pick, distinct
 * from Mirror Image's burst soak and Misty Step's one-turn panic button.
 */
export const BLUR_ROUNDS = 5;

export function castBlur(character: Readonly<Character>, state: CombatState): CastResult {
  let nextCharacter: Character = consumeSlot(character, 2);
  nextCharacter = patchResources(nextCharacter, { blurRoundsRemaining: BLUR_ROUNDS });
  nextCharacter = markActionUsed(nextCharacter);
  let nextState: CombatState = appendLog(state, {
    id: nextLogId(state),
    kind: 'narration',
    text: t('combat.log.blur', { name: nextCharacter.name, rounds: BLUR_ROUNDS }),
  });
  // Reuse the Misty Step self-shimmer overlay — a smear of displacement.
  nextState = attachSpellEffect(nextState, 'misty-step', 'player');
  return { state: nextState, character: nextCharacter, cast: true };
}
