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

/** Duplicates conjured. Each absorbs one blow that would otherwise land. */
export const MIRROR_IMAGE_COUNT = 3;

/**
 * Flat illusion DC an attacker must meet (raw d20) to see through a duplicate.
 * On a success it picks out the real wizard and lands the blow; on a failure the
 * blow is wasted on an afterimage. 13 → a ~40% see-through chance, so the screen
 * erodes and leaks hits instead of granting near-immunity, but is still worth a
 * 2nd-level slot.
 */
export const MIRROR_IMAGE_SEE_THROUGH_DC = 13;

export function castMirrorImage(character: Readonly<Character>, state: CombatState): CastResult {
  let nextCharacter: Character = consumeSlot(character, 2);
  nextCharacter = patchResources(nextCharacter, { mirrorImages: MIRROR_IMAGE_COUNT });
  nextCharacter = markActionUsed(nextCharacter);
  let nextState: CombatState = appendLog(state, {
    id: nextLogId(state),
    kind: 'narration',
    text: t('combat.log.mirrorImage', { name: nextCharacter.name, count: MIRROR_IMAGE_COUNT }),
  });
  // Reuse the Mage Armor self-shimmer overlay for the conjured duplicates.
  nextState = attachSpellEffect(nextState, 'mage-armor', 'player');
  return { state: nextState, character: nextCharacter, cast: true };
}
