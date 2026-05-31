import type { Character } from '../../../types/character';
import type { CombatState } from '../../../types/combat';
import { appendLog } from '../log';
import { patchActionEconomy, patchResources } from '../types';
import {
  type CastResult,
  attachSpellEffect,
  consumeSlot,
  nextLogId,
  slotsAt,
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

/** AC bonus Shield adds while reactive flag is up. Mirrors 5e RAW. */
export const SHIELD_AC_BONUS = 5;

export interface ShieldReactionTrigger {
  state: CombatState;
  character: Character;
}

/**
 * Try to fire Shield as a reaction in response to an incoming hit. Auto-casts
 * only when the +5 AC would actually turn the hit into a miss — otherwise the
 * slot would be wasted. Returns null if no reaction fires (caller proceeds with
 * the original hit).
 *
 * Mirrors the Uncanny Dodge pattern (PR #70): no UI picker, reactionUsed flag
 * resets at turn start. Crits (nat 20) bypass Shield by RAW — Shield only
 * raises AC; a nat 20 hits regardless.
 */
export function tryShieldReaction(
  character: Readonly<Character>,
  state: CombatState,
  ac: number,
  attackTotal: number,
): ShieldReactionTrigger | null {
  if (character.classId !== 'wizard') return null;
  if (!character.resources.knownSpells?.includes('shield')) return null;
  if (character.actionEconomy.reactionUsed) return null;
  if (slotsAt(character, 1) <= 0) return null;
  if (character.resources.shieldAutoFire === false) return null;
  const newAc = ac + SHIELD_AC_BONUS;
  if (attackTotal >= newAc) return null;

  let nextCharacter: Character = consumeSlot(character, 1);
  nextCharacter = patchResources(nextCharacter, { shieldActive: true });
  nextCharacter = patchActionEconomy(nextCharacter, { reactionUsed: true });

  let nextState: CombatState = appendLog(state, {
    id: nextLogId(state),
    kind: 'system',
    text: `${nextCharacter.name} reacts with Shield — AC ${ac} → ${newAc}, the blow glances off (−1 L1 slot).`,
  });
  nextState = attachSpellEffect(nextState, 'shield', 'player');
  return { state: nextState, character: nextCharacter };
}
