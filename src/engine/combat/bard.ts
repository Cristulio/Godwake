import type { DiceRoller } from '../dice';
import type { DieSize } from '../../types/dice';
import type { Character } from '../../types/character';
import type { CombatState, CombatLogEntry } from '../../types/combat';
import { abilityModifier } from '../../types/abilities';
import { characterHasMechanic, effectiveAbilityScores } from '../character/derived';
import {
  combatResult,
  patchActionEconomy,
  patchResources,
  type CombatActionResult,
} from './types';
import { appendLog } from './log';
import { attachCombatVfx } from './vfx';
import { t } from '../../i18n';

/** True for the Charisma support-caster. */
export function isBard(character: Readonly<Character>): boolean {
  return character.classId === 'bard';
}

/**
 * The Bardic Inspiration die size at the Bard's current level. Grows on the same
 * cadence as the Monk's Martial Arts die — d6 → d8 (L5) → d10 (L10) → d12 (L15)
 * — so every banked die bites harder as the soul deepens. Read both when the die
 * is rolled onto an attack/damage (playerAttack) and when Cutting Words spends it
 * defensively (monsterAttack). Zero for a non-Bard.
 */
export function bardInspirationDieSize(character: Readonly<Character>): DieSize {
  const lvl = character.level;
  if (lvl >= 15) return 12;
  if (lvl >= 10) return 10;
  if (lvl >= 5) return 8;
  return 6;
}

/**
 * Max Bardic Inspiration dice the Bard holds — the pool refreshed each encounter
 * (createCombat). The base is the Charisma modifier (min 1, so a fresh Bard never
 * walks in empty); the chosen college's L10 beat (Lore Peerless Skill / Valor
 * Combat Superiority) deepens it by one, and the L20 capstone (Peerless
 * Performer) by two more. Zero for a non-Bard or one that hasn't learned the
 * inspiration kit yet.
 */
export function bardInspirationMax(character: Readonly<Character>): number {
  if (!isBard(character) || !characterHasMechanic(character as Character, 'bardic-inspiration')) {
    return 0;
  }
  const chaMod = abilityModifier(effectiveAbilityScores(character as Character).cha);
  const base = Math.max(1, chaMod);
  const collegeDeepening =
    characterHasMechanic(character as Character, 'peerless-skill') ||
    characterHasMechanic(character as Character, 'combat-superiority')
      ? 1
      : 0;
  const capstone = characterHasMechanic(character as Character, 'peerless-performer') ? 2 : 0;
  return base + collegeDeepening + capstone;
}

/** Inspiration dice the Bard has banked right now. */
export function bardInspirationLeft(character: Readonly<Character>): number {
  return character.resources.inspirationDiceRemaining ?? 0;
}

/** A Valor bard spends its inspiration die on weapon DAMAGE (Combat Inspiration)
 *  rather than the attack roll — the martial fork of the core self-buff. */
export function spendsInspirationOnDamage(character: Readonly<Character>): boolean {
  return characterHasMechanic(character as Character, 'combat-inspiration');
}

export interface BardContext {
  character: Character;
  state: CombatState;
}

/**
 * Bardic Inspiration. Bonus action, 1 die: bank an inspiration die onto the
 * Bard's next own roll. A core or Lore bard applies it to the next ATTACK ROLL
 * (helping the War Lute / a finesse blade land); a Valor bard with Combat
 * Inspiration applies it to the next weapon HIT's damage instead. The die is
 * rolled when it lands (playerAttack); here it is only armed. One die at a time —
 * a banked die must be spent before another can be raised.
 */
export function useBardicInspiration(ctx: BardContext): CombatActionResult {
  const { character, state } = ctx;
  if (!isBard(character)) return combatResult(state, character);
  if (!characterHasMechanic(character, 'bardic-inspiration')) return combatResult(state, character);
  if (character.inspirationActive === true) return combatResult(state, character);
  if (character.actionEconomy.bonusActionUsed) return combatResult(state, character);
  if (bardInspirationLeft(character) <= 0) return combatResult(state, character);

  let nextCharacter: Character = { ...character, inspirationActive: true };
  nextCharacter = patchResources(nextCharacter, {
    inspirationDiceRemaining: bardInspirationLeft(character) - 1,
  });
  nextCharacter = patchActionEconomy(nextCharacter, { bonusActionUsed: true });

  const log: CombatLogEntry = {
    id: state.log.length + 1,
    kind: 'narration',
    text: t('combat.log.bardicInspiration', {
      name: nextCharacter.name,
      die: bardInspirationDieSize(nextCharacter),
    }),
  };
  return combatResult(attachCombatVfx(appendLog(state, log), 'reckless', 'player'), nextCharacter);
}

/**
 * College of Lore — Cutting Words. A reaction the Lore bard fires when a foe's
 * blow would land: spend an inspiration die to roll it off the enemy's attack
 * total. The engine only spends the die when it would actually flip the hit to a
 * miss (the smart-play auto-fire, mirroring the Wizard's Shield reaction), so the
 * scarce pool is never wasted on a blow that lands anyway. Spends the reaction;
 * a crit (nat 20) can't be cut. Returns the patched `{ state, character, hit }`,
 * or null to leave the incoming attack untouched.
 */
export function tryCuttingWords(
  character: Readonly<Character>,
  state: CombatState,
  ac: number,
  attackTotal: number,
  roller: DiceRoller,
): { state: CombatState; character: Character; hit: boolean } | null {
  if (!isBard(character)) return null;
  if (!characterHasMechanic(character as Character, 'cutting-words')) return null;
  if (character.actionEconomy.reactionUsed) return null;
  if (bardInspirationLeft(character) <= 0) return null;

  const die = roller.roll({ count: 1, die: bardInspirationDieSize(character), modifier: 0 });
  // Only spend the die when it would actually negate the hit.
  if (attackTotal - die.total >= ac) return null;

  let nextCharacter: Character = patchResources(character as Character, {
    inspirationDiceRemaining: bardInspirationLeft(character) - 1,
  });
  nextCharacter = patchActionEconomy(nextCharacter, { reactionUsed: true });

  const logged = appendLog(state, {
    id: state.log.length + 1,
    kind: 'system',
    text: t('combat.log.cuttingWords', { name: character.name, n: die.total }),
  });
  return { state: attachCombatVfx(logged, 'shield', 'player'), character: nextCharacter, hit: false };
}
