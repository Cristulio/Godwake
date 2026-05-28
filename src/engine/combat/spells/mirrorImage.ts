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

/** Duplicates conjured. Each absorbs one blow that would otherwise land. */
export const MIRROR_IMAGE_COUNT = 3;

export function castMirrorImage(character: Readonly<Character>, state: CombatState): CastResult {
  let nextCharacter: Character = consumeSlot(character, 2);
  nextCharacter = patchResources(nextCharacter, { mirrorImages: MIRROR_IMAGE_COUNT });
  nextCharacter = markActionUsed(nextCharacter);
  let nextState: CombatState = appendLog(state, {
    id: nextLogId(state),
    kind: 'narration',
    text: `${nextCharacter.name} splits into ${MIRROR_IMAGE_COUNT} flickering duplicates — each will take a blow meant for you.`,
  });
  // Reuse the Mage Armor self-shimmer overlay for the conjured duplicates.
  nextState = attachSpellEffect(nextState, 'mage-armor', 'player');
  return { state: nextState, character: nextCharacter, cast: true };
}
