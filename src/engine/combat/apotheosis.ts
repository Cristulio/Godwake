import type { Character } from '../../types/character';

/**
 * Apotheosis — the wizard's 9th-level transform-self capstone. The numbers live
 * here in a dependency-free leaf module so the AC read (derived.ts), the spell
 * damage read (spells/helpers.ts), the weapon damage read (playerAttack.ts), the
 * round decrement (turn.ts), and the spell handler (spells/ninthLevel.ts) can
 * all share one source of truth without an import cycle.
 */
export const APOTHEOSIS_ROUNDS = 4;
export const APOTHEOSIS_TEMP_HP = 30;
export const APOTHEOSIS_AC_BONUS = 2;
/** Flat bonus added to every weapon hit and spell's damage while ascendant. */
export const APOTHEOSIS_BONUS_DAMAGE = 6;

/** True while the Apotheosis transformation burns (the ascendant state). */
export function isAscendant(character: Readonly<Character>): boolean {
  return (character.resources.ascendantRoundsRemaining ?? 0) > 0;
}
