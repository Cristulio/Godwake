import { z } from 'zod';
import { AbilitySchema, ClassIdSchema, DamageTypeSchema, RaceIdSchema } from './ids';

export const RaceFeatureSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
});

export const RaceSchema = z.object({
  id: RaceIdSchema,
  name: z.string(),
  abilityScoreBonuses: z.record(AbilitySchema, z.number()),
  speed: z.number().int().positive(),
  features: z.array(RaceFeatureSchema),
  /** Classes this race is permitted to take. See dd-roguelite race-class matrix. */
  validClasses: z.array(ClassIdSchema),
  /** Extra HP added at every character level (e.g. Hill Dwarf: 1). */
  bonusHpPerLevel: z.number().int().nonnegative().optional(),
  /** Damage types the race resists (damage halved). E.g. Tiefling fire. */
  damageResistances: z.array(DamageTypeSchema).optional(),
});

export type RaceFeature = z.infer<typeof RaceFeatureSchema>;
export type Race = z.infer<typeof RaceSchema>;
