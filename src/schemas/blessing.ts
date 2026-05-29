import { z } from 'zod';
import { ClassIdSchema } from './ids';

/**
 * Faerûn gods that grant blessings at shrine rooms.
 */
export const BlessingGodSchema = z.enum([
  'tymora',
  'helm',
  'tempus',
  'mystra',
  'lathander',
  'selune',
  'ilmater',
  'silvanus',
]);
export type BlessingGod = z.infer<typeof BlessingGodSchema>;

export const BLESSING_GOD_LABEL: Record<BlessingGod, string> = {
  tymora: 'Tymora · Luck',
  helm: 'Helm · Protection',
  tempus: 'Tempus · War',
  mystra: 'Mystra · Magic',
  lathander: 'Lathander · Dawn',
  selune: 'Selûne · Moon',
  ilmater: 'Ilmater · Endurance',
  silvanus: 'Silvanus · Nature',
};

/**
 * Mechanical hooks a blessing can apply. Engine code reads these where
 * relevant. Unset = flavor-only.
 */
export const BlessingModifiersSchema = z
  .object({
    /** Flat bonus to AC. */
    acBonus: z.number().optional(),
    /** +N to-hit on the first attack of each combat. */
    firstAttackBonus: z.number().optional(),
    /** +N damage on the first attack of each combat. */
    firstAttackDamage: z.number().optional(),
    /** First attack each combat has advantage. */
    firstAttackAdvantage: z.boolean().optional(),
    /** Flat +N damage on all attacks. */
    damageBonus: z.number().optional(),
    /** +N extra radiant damage on hits. */
    holyDamageBonus: z.number().optional(),
    /** Temp HP gained at the start of each combat room. */
    extraTempHpPerRoom: z.number().optional(),
    /**
     * Temp HP at the start of each combat scaling with the character's current
     * delve level (N × level). Folds into the shared start-of-combat temp HP
     * pool (RAW: temp HP doesn't stack — engine takes the max source).
     */
    tempHpPerDelveLevel: z.number().optional(),
    /**
     * Temp HP at the start of each combat scaling with the number of bane
     * quirks the soul carries (N × baneQuirkCount). Soul-mark synergy: the
     * more curses you bear, the harder you are to put down. Folds into the
     * shared temp HP pool.
     */
    tempHpPerBaneQuirk: z.number().optional(),
    /**
     * Flat temp HP granted ONLY at the start of a chapter-boss encounter.
     * Folds into the shared temp HP pool but is inert in normal rooms.
     */
    bossTempHp: z.number().optional(),
    /** Flat HP healed at the start of each combat (real healing, capped at max). */
    regenPerCombat: z.number().optional(),
    /** Percent of max HP healed at the start of each combat (0-100, floored). */
    regenPctPerCombat: z.number().optional(),
    /** +N AC while at full HP (turtle stance — drops the moment you're scratched). */
    acBonusWhileFull: z.number().optional(),
    /** +N AC while bloodied (HP at half or less) — a desperate, defensive last stand. */
    acBonusWhileBloodied: z.number().optional(),
    /** +N AC for each bane quirk the soul carries (soul-mark synergy). */
    acBonusPerBaneQuirk: z.number().optional(),
    /** Crit range widens by N while at full HP (predator's poise). */
    critRangeBonusWhileFull: z.number().optional(),
    /** Crit range widens by N while bloodied (HP at half or less) — a bloodied gamble. */
    critRangeBonusWhileBloodied: z.number().optional(),
    /** Rerolls available per encounter for missed d20s. */
    rerollMissesPerEncounter: z.number().optional(),
    /**
     * Extra "stabilise" charges added on top of the free one each delve. When
     * the player would be reduced to 0 HP and a charge is available, they
     * stabilise at 1 HP instead and the charge is spent.
     */
    extraStabiliseCharges: z.number().optional(),
    /** Crit range expansion (e.g. +1 means crit on 19-20 stacks to 18-20). */
    critRangeBonus: z.number().optional(),
  })
  .default({});
export type BlessingModifiers = z.infer<typeof BlessingModifiersSchema>;

export const BlessingSchema = z.object({
  id: z.string(),
  name: z.string(),
  god: BlessingGodSchema,
  flavor: z.string(),
  effect: z.string(),
  modifiers: BlessingModifiersSchema,
  /**
   * Class ids this blessing is meaningful for. Omit (or empty) = all classes.
   * Sim PR #105 caught that weapon-attack-keyed blessings (first-attack
   * to-hit / damage, crit range, weapon damageBonus, holyDamageBonus,
   * rerollMissesPerEncounter) are entirely dead for Wizard — those spells
   * either save-for-half or auto-hit, never roll-to-hit. Shrine/camp
   * blessing offers filter by this list so Wizards never get a flavor-only
   * card on their pick screen.
   */
  classRelevance: z.array(ClassIdSchema).optional(),
});
export type Blessing = z.infer<typeof BlessingSchema>;
