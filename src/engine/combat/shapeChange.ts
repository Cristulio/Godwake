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
/**
 * The dragon's claws strike like a +3 enchanted weapon: flat to-hit/damage on
 * top of the claw profile. The form's ATTACK STAT is the wizard's spellcasting
 * (Intelligence) modifier — the `casterWeapon` flag on the dragon-claws weapon
 * routes playerAttack's ability read there — so the dragon swings off the stat
 * the wizard actually grew, never its dumped STR. Net to-hit at L17+:
 * INT mod + proficiency + this bonus (≈ +14 with INT 20), a real martial
 * beast's accuracy. Both bonuses are PROVISIONAL — the end-of-campaign sim
 * batch calibrates them with the claw dice (3d8, on the weapon def).
 */
export const DRAGON_CLAW_HIT_BONUS = 3;
export const DRAGON_CLAW_DAMAGE_BONUS = 3;
/** The natural weapon the dragon form fights with (3d8 slashing, INT-driven). */
export const DRAGON_CLAW_WEAPON_ID = 'dragon-claws';

/** True while the Shape Change (dragon) transformation holds. */
export function isDragonForm(character: Readonly<Character>): boolean {
  return (character.resources.dragonFormRoundsRemaining ?? 0) > 0;
}
