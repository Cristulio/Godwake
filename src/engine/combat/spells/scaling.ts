import type { Character } from '../../../types/character';
import { enhancementOf } from '../../items/affixMods';

/**
 * Parametric spell-damage scaling — ONE place, called by every damage handler.
 *
 * Every damage spell (leveled AND cantrip) takes a BASE — its rolled dice total
 * at acquisition (Burning Hands 3d6, Fireball 8d6, Fire Bolt 1d10) — and grows
 * that base by a level multiplier anchored at the spell's acquisition level:
 *
 *     final = round(diceTotal × levelFactor) + weaponEnhancement
 *
 *   levelFactor = 1 + K × max(0, level − acqLevel)   (anchored at acquisition)
 *
 * K is steeper for cantrips than for leveled spells. A cantrip's base is tiny
 * (Fire Bolt 1d10 ≈ 5.5), so the leveled growth rate gives it almost no ABSOLUTE
 * climb — at L20 the flat-K curve left Fire Bolt at a ~11 dice-core, HALF the old
 * 4d10 ≈ 22 cap, and the at-will fell off a cliff by endgame. The steeper
 * {@link CANTRIP_LEVEL_K} restores it to a relevant endgame at-will (~18 dice-core
 * at L20) while keeping it BELOW the cheapest leveled spell sharing its L1 anchor
 * (Burning Hands 3d6) — a cantrip stays an opener, never eclipses a real slot.
 *
 * weaponEnhancement is the +N on the equipped main-hand (the same flat axis
 * playerAttack adds to a weapon swing) — a caster's +N staff/dagger now adds
 * that many points of flat damage to every spell that routes through here. It is
 * a FLAT rider added AFTER the multiplier, so it never scales or doubles on a
 * crit (crit doubles the dice upstream, before this is called), exactly mirroring
 * how a martial enhancement lands once per hit and is not doubled on a crit. This
 * +N IS the "INT/gear matters" lever for casters (see #398); there is no separate
 * casting-modifier term — stats are fixed at character creation (no ASIs), so a
 * caster sits at the same casting mod the whole game and an INT factor would never
 * move with progression. It only ever differentiated builds that, in practice,
 * all start at the same mod, so it was dead weight and is gone.
 *
 * At level == acqLevel the multiplier is exactly 1, so a spell is precisely as
 * strong as it is today the moment you gain it (acquisition power preserved).
 * Above that it scales up. Flat riders the handlers add (gear spell-damage, the
 * additive INT on the single-target strikes, ignite/fork/drain-heal) are layered
 * on top of the scaled base, unchanged.
 *
 * Constants are deliberately CONSERVATIVE and provisional — a separate sim pass
 * calibrates them against the caster band after merge. Do not hand-tune them to a
 * win-rate target here.
 */
export const LEVEL_K = 0.05;

/**
 * Cantrip level factor — steeper than {@link LEVEL_K} so an at-will with a tiny
 * base stays a relevant (if never a closing) damage option at endgame. Tuned so
 * Fire Bolt's L20 dice-core climbs back near its old 4d10 cap
 * (5.5 × (1 + 0.12 × 19) ≈ 18) without overtaking the cheapest leveled spell on
 * the same L1 anchor (Burning Hands 3d6 ≈ 20 at L20). Provisional — pending the
 * validation sim.
 */
export const CANTRIP_LEVEL_K = 0.12;

/**
 * The character level at which a full caster first gains a spell of the given
 * tier, derived from the wizard/druid learn ladder (see
 * `wizardSpellLearnTierForLevel`): cantrips and 1st-level spells at L1, then each
 * higher tier at the odd level that opens its slot — 2nd@3, 3rd@5, … 9th@17.
 */
export function spellAcquisitionLevel(spellTier: number): number {
  return spellTier <= 1 ? 1 : 2 * spellTier - 1;
}

/**
 * The level-growth multiplier for a spell of the given tier. 1.0 at the spell's
 * acquisition level (acquisition power preserved); climbs with character level —
 * steeper for a cantrip (tier 0) than for a leveled spell.
 */
export function spellDamageMultiplier(
  character: Readonly<Character>,
  spellTier: number,
): number {
  const acqLevel = spellAcquisitionLevel(spellTier);
  const k = spellTier === 0 ? CANTRIP_LEVEL_K : LEVEL_K;
  return 1 + k * Math.max(0, character.level - acqLevel);
}

/**
 * Scale a rolled base-dice total for a spell of the given tier, then add the
 * equipped weapon's flat +N enhancement. Returns the grown total to deal. A zero
 * roll (e.g. every Scorching Ray missed) stays zero — a miss deals nothing, so no
 * enhancement rides it; a real hit never rounds away to nothing.
 */
export function scaleSpellDamage(
  diceTotal: number,
  character: Readonly<Character>,
  spellTier: number,
): number {
  if (diceTotal <= 0) return 0;
  const scaled = Math.max(1, Math.round(diceTotal * spellDamageMultiplier(character, spellTier)));
  return scaled + enhancementOf(character.equipped.mainHand);
}
