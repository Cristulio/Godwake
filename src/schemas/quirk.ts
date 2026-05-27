import { z } from 'zod';

/**
 * Mechanical hooks a quirk can fire. Engine code reads these where relevant
 * (combat math, treasure rewards, etc.). Unset = flavor-only quirk.
 */
export const QuirkModifiersSchema = z
  .object({
    /** Multiply gold rewards (1.25 = +25%). */
    goldMultiplier: z.number().optional(),
    /** Immune to poison damage. */
    poisonImmune: z.boolean().optional(),
    /** Flat modifier to initiative rolls. */
    initiativeMod: z.number().optional(),
    /** Flat modifier to AC. */
    acMod: z.number().optional(),
    /** When below half HP, +N to damage rolls. */
    hangryDamageBonus: z.number().optional(),
    /** +N to-hit vs enemies below half HP. */
    woundedAttackBonus: z.number().optional(),
    /** +N to-hit on the very first attack roll per combat. */
    firstTurnAttackBonus: z.number().optional(),
    /** -N to-hit on the very first attack roll per combat. */
    firstAttackPenalty: z.number().optional(),
    /** Rerolls available per delve for missed d20s. */
    rerollMissesPerDelve: z.number().optional(),
    /** Extra gold at the start of each delve. */
    startBonusGold: z.number().optional(),
  })
  .default({});
export type QuirkModifiers = z.infer<typeof QuirkModifiersSchema>;

export const QuirkSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** Boon = mostly good, Bane = mostly bad, Odd = neutral/flavor/trade. */
  sentiment: z.enum(['boon', 'bane', 'odd']),
  /** One-line italic flavor shown in tooltips and the reincarnation reveal. */
  flavor: z.string(),
  /** Plain-language mechanical effect for the UI. */
  effect: z.string(),
  modifiers: QuirkModifiersSchema,
});
export type Quirk = z.infer<typeof QuirkSchema>;
