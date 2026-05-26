import { z } from 'zod';

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
    /** Flat modifier to initiative rolls. */
    initiativeBonus: z.number().optional(),
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
    /** Rerolls available per encounter for missed d20s. */
    rerollMissesPerEncounter: z.number().optional(),
    /** Rerolls available per delve for death saves. */
    rerollDeathSavesPerDelve: z.number().optional(),
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
});
export type Blessing = z.infer<typeof BlessingSchema>;
