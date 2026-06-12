import type { Character } from '../../../types/character';
import type { CombatState } from '../../../types/combat';
import { effectiveAC } from '../../character/effectiveAC';
import { appendLog } from '../log';
import { patchActionEconomy, patchResources } from '../types';
import {
  type CastResult,
  attachSpellEffect,
  consumeSlot,
  nextLogId,
  slotsAt,
} from './helpers';
import { t } from '../../../i18n';

export function castShield(character: Readonly<Character>, state: CombatState): CastResult {
  let nextCharacter: Character = consumeSlot(character, 1);
  nextCharacter = patchResources(nextCharacter, { shieldActive: true });
  // Shield is a reaction in 5e — does NOT cost the player's action. Marking
  // the reaction so a follow-up Shield in the same round is gated.
  nextCharacter = patchActionEconomy(nextCharacter, { reactionUsed: true });
  let nextState: CombatState = appendLog(state, {
    id: nextLogId(state),
    kind: 'narration',
    text: t('combat.log.shieldCast', { name: nextCharacter.name }),
  });
  nextState = attachSpellEffect(nextState, 'shield', 'player');
  return { state: nextState, character: nextCharacter, cast: true };
}

/** AC bonus Shield adds while reactive flag is up. Mirrors 5e RAW. */
export const SHIELD_AC_BONUS = 5;

/**
 * HP fraction at/above which the Shield reaction stands down — chip damage on a
 * healthy wizard is let through so the caster actually feels threatened (the
 * "too-tanky mage" fix). Below this it auto-fires as the clutch survival wall it
 * was designed to be. Keeping the slot back at full HP also eases the wizard's
 * documented sustain lag (fewer L1 slots burnt walling glancing blows).
 */
export const SHIELD_REACTION_HP = 0.5;

export interface ShieldReactionTrigger {
  state: CombatState;
  character: Character;
}

/**
 * Try to fire Shield as a reaction in response to an incoming hit. Auto-casts
 * only when the wizard is at/below half HP (a clutch wall, not a free per-hit
 * buff — see {@link SHIELD_REACTION_HP}) AND the +5 AC would actually turn the
 * hit into a miss — otherwise the slot would be wasted. Returns null if no
 * reaction fires (caller proceeds with the original hit).
 *
 * Mirrors the Uncanny Dodge pattern (PR #70): no UI picker, reactionUsed flag
 * resets at turn start. Crits (nat 20) bypass Shield by RAW — Shield only
 * raises AC; a nat 20 hits regardless.
 *
 * Takes the RAW AC: the +5 lands on raw armour and is then compressed by the
 * monster-side softcap (effectiveAC), so the would-it-miss check and the
 * logged values match exactly what the rest of the round will resolve at.
 */
export function tryShieldReaction(
  character: Readonly<Character>,
  state: CombatState,
  rawAc: number,
  attackTotal: number,
): ShieldReactionTrigger | null {
  if (character.classId !== 'wizard') return null;
  if (!character.resources.knownSpells?.includes('shield')) return null;
  if (character.actionEconomy.reactionUsed) return null;
  if (slotsAt(character, 1) <= 0) return null;
  if (character.resources.shieldAutoFire === false) return null;
  // Clutch only: a healthy wizard eats the glancing blow (feels threatened);
  // Shield is reserved for when HP actually matters.
  if (character.hp.current > character.hp.max * SHIELD_REACTION_HP) return null;
  const ac = effectiveAC(rawAc);
  const newAc = effectiveAC(rawAc + SHIELD_AC_BONUS);
  if (attackTotal >= newAc) return null;

  let nextCharacter: Character = consumeSlot(character, 1);
  nextCharacter = patchResources(nextCharacter, { shieldActive: true });
  nextCharacter = patchActionEconomy(nextCharacter, { reactionUsed: true });

  let nextState: CombatState = appendLog(state, {
    id: nextLogId(state),
    kind: 'system',
    text: t('combat.log.shieldReact', { name: nextCharacter.name, ac, newAc }),
  });
  nextState = attachSpellEffect(nextState, 'shield', 'player');
  return { state: nextState, character: nextCharacter };
}
