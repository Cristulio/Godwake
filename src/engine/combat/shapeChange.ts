import type { Character } from '../../types/character';

/**
 * Shape Change → Dragon — the wizard's 9th-level transform-self capstone. The
 * numbers live here in a dependency-free leaf module so the attack count and
 * weapon read (playerAttack.ts), the weapon pick at the attack call sites
 * (CombatScreen.tsx / actionPolicy.ts), the round decrement (turn.ts), and the
 * spell handler (spells/ninthLevel.ts) can all share one source of truth without
 * an import cycle. Mirrors apotheosis.ts.
 */
export const SHAPE_CHANGE_ROUNDS = 5;
export const SHAPE_CHANGE_TEMP_HP = 100;
/** Claw swings per Attack action while in dragon form. */
export const DRAGON_CLAW_ATTACKS = 3;
/** The dragon's claws strike like a +3 enchanted weapon: flat to-hit/damage. */
export const DRAGON_CLAW_HIT_BONUS = 3;
export const DRAGON_CLAW_DAMAGE_BONUS = 3;
/** The natural weapon the dragon form fights with (2d8 slashing). */
export const DRAGON_CLAW_WEAPON_ID = 'dragon-claws';

/** True while the Shape Change (dragon) transformation holds. */
export function isDragonForm(character: Readonly<Character>): boolean {
  return (character.resources.dragonFormRoundsRemaining ?? 0) > 0;
}
