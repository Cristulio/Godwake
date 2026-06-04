import type { Character } from '../../../types/character';
import { spellcastingMod } from '../../character/derived';
import { enhancementOf } from '../../items/affixMods';

/**
 * Parametric spell-damage scaling — ONE place, called by every damage handler.
 *
 * Every damage spell (leveled AND cantrip) takes a BASE — its rolled dice total
 * at acquisition (Burning Hands 3d6, Fireball 8d6, Fire Bolt 1d10) — and grows
 * that base by a multiplier that climbs with character level and the caster's
 * spellcasting modifier:
 *
 *     final = round(diceTotal × levelFactor × intFactor) + weaponEnhancement
 *
 *   levelFactor = 1 + LEVEL_K × max(0, level − acqLevel)   (anchored at acquisition)
 *   intFactor   = 1 + INT_K   × (castingMod − REF_CASTING_MOD)
 *
 * weaponEnhancement is the +N on the equipped main-hand (the same flat axis
 * playerAttack adds to a weapon swing) — a caster's +N staff/dagger now adds
 * that many points of flat damage to every spell that routes through here. It is
 * a FLAT rider added AFTER the multiplier, so it never scales or doubles on a
 * crit (crit doubles the dice upstream, before this is called), exactly mirroring
 * how a martial enhancement lands once per hit and is not doubled on a crit.
 *
 * At level == acqLevel and castingMod == REF_CASTING_MOD the multiplier is exactly
 * 1, so a spell is precisely as strong as it is today the moment you gain it
 * (acquisition power preserved). Above that it scales up; a lower casting mod
 * scales it down. Flat riders the handlers add (gear spell-damage, the additive
 * INT on the single-target strikes, ignite/fork/drain-heal) are layered on top of
 * the scaled base, unchanged.
 *
 * Constants are deliberately CONSERVATIVE and provisional — a separate sim pass
 * calibrates them against the caster band after merge. Do not hand-tune them to a
 * win-rate target here.
 */
export const LEVEL_K = 0.05;
export const INT_K = 0.05;

/**
 * The spellcasting modifier a full caster typically holds at level 1 — Veyra the
 * tiefling wizard (INT 15 +1 = 16 → +3) and Lureth the wood-elf druid (WIS 15 +1
 * = 16 → +3) both land here. The reference point at which intFactor == 1, so a
 * fresh caster's spells read at exactly their printed dice.
 */
export const REF_CASTING_MOD = 3;

/** intFactor can never drop a spell below half its base, however debuffed the caster. */
const INT_FACTOR_FLOOR = 0.5;

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
 * The level + casting-mod growth multiplier for a spell acquired at `acqLevel`.
 * 1.0 at the acquisition reference point; climbs with level and casting mod.
 */
export function spellDamageMultiplier(
  character: Readonly<Character>,
  acqLevel: number,
): number {
  const levelFactor = 1 + LEVEL_K * Math.max(0, character.level - acqLevel);
  const intFactor = Math.max(
    INT_FACTOR_FLOOR,
    1 + INT_K * (spellcastingMod(character) - REF_CASTING_MOD),
  );
  return levelFactor * intFactor;
}

/**
 * Scale a rolled base-dice total for a spell acquired at `acqLevel`, then add the
 * equipped weapon's flat +N enhancement. Returns the grown total to deal. A zero
 * roll (e.g. every Scorching Ray missed) stays zero — a miss deals nothing, so no
 * enhancement rides it; a real hit never rounds away to nothing.
 */
export function scaleSpellDamage(
  diceTotal: number,
  character: Readonly<Character>,
  acqLevel: number,
): number {
  if (diceTotal <= 0) return 0;
  const scaled = Math.max(1, Math.round(diceTotal * spellDamageMultiplier(character, acqLevel)));
  return scaled + enhancementOf(character.equipped.mainHand);
}
