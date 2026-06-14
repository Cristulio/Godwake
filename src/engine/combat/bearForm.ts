import type { Character } from '../../types/character';

/**
 * Avatar of the Wilds → the Great Bear — the druid's 9th-level transform
 * capstone, the tankier counterpart to the wizard's dragon (shapeChange.ts).
 * The druid pours the wild through itself whole and rises as a primal bear: an
 * upgraded Wild Shape that stands above the whole beast ladder. The numbers live
 * here in a dependency-free leaf module so the attack count + weapon read
 * (playerAttack.ts), the weapon pick at the call sites (CombatScreen.tsx /
 * actionPolicy.ts), the AC read (derived.ts), the round decrement (turn.ts), and
 * the spell handler (spells/ninthLevel.ts) can all share one source of truth
 * without an import cycle. Distinct from the shared `apotheosis` buff that the
 * wizard's Apotheosis and bard's Final Crescendo still use.
 */
export const BEAR_FORM_ROUNDS = 5;
export const BEAR_FORM_TEMP_HP = 90;
export const BEAR_FORM_AC_BONUS = 3;
/** Claw swings per Attack action while in the Great Bear — twin rending paws. */
export const BEAR_CLAW_ATTACKS = 2;
/**
 * The bear's claws strike like a +3 weapon: flat to-hit/damage on top of the
 * claw profile. The form's ATTACK STAT is the druid's spellcasting (Wisdom)
 * modifier — the `casterWeapon` flag on the worldbear-claws weapon routes
 * playerAttack's ability read there — so the bear swings off the stat the druid
 * actually grew, never its dumped STR. Both bonuses are PROVISIONAL — the
 * end-of-campaign sim batch calibrates them with the claw dice.
 */
export const BEAR_CLAW_HIT_BONUS = 3;
export const BEAR_CLAW_DAMAGE_BONUS = 3;
/** The natural weapon the Great Bear fights with (2d12 slashing, WIS-driven). */
export const BEAR_CLAW_WEAPON_ID = 'worldbear-claws';

/** True while the Avatar of the Wilds (Great Bear) transformation holds. */
export function isBearForm(character: Readonly<Character>): boolean {
  return (character.resources.bearFormRoundsRemaining ?? 0) > 0;
}
