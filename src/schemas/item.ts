import { z } from 'zod';
import { DamageTypeSchema, RaritySchema } from './ids';

const WeaponPropertySchema = z.enum([
  'light',
  'heavy',
  'finesse',
  'thrown',
  'two-handed',
  'versatile',
  'reach',
  'ammunition',
  'loading',
  'special',
]);
export type WeaponProperty = z.infer<typeof WeaponPropertySchema>;

const DiceExpressionStringSchema = z
  .string()
  .regex(/^(\d+)?d(\d+)(?:\s*[+-]\s*\d+)?$/i, 'Expected dice expression like "1d8" or "2d6+3"');

export const WeaponSchema = z.object({
  id: z.string(),
  kind: z.literal('weapon'),
  name: z.string(),
  category: z.enum(['simple', 'martial']),
  damage: DiceExpressionStringSchema,
  damageType: DamageTypeSchema,
  properties: z.array(WeaponPropertySchema),
  /** Damage dice when wielded two-handed (only for versatile weapons). */
  versatileDamage: DiceExpressionStringSchema.optional(),
  /** Range in feet for ranged or thrown weapons: [normal, long]. */
  range: z.tuple([z.number(), z.number()]).optional(),
  weight: z.number(),
  cost: z.number(),
  rarity: RaritySchema,
  attunement: z.boolean(),
  description: z.string().optional(),
});
export type Weapon = z.infer<typeof WeaponSchema>;

export const ArmorSchema = z.object({
  id: z.string(),
  kind: z.literal('armor'),
  name: z.string(),
  category: z.enum(['light', 'medium', 'heavy', 'shield']),
  /** Base AC value (for shield, this is +N bonus). */
  baseAC: z.number(),
  stealthDisadvantage: z.boolean(),
  strRequirement: z.number().optional(),
  weight: z.number(),
  cost: z.number(),
  rarity: RaritySchema,
  attunement: z.boolean(),
  description: z.string().optional(),
});
export type Armor = z.infer<typeof ArmorSchema>;

export const ItemSchema = z.discriminatedUnion('kind', [WeaponSchema, ArmorSchema]);
export type Item = z.infer<typeof ItemSchema>;

/** A reference to a specific item instance carried by a character. */
export interface ItemRef {
  itemId: string;
  /** For charged items. */
  charges?: number;
}
