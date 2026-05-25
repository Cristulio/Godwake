import { z } from 'zod';
import { AbilitySchema, ClassIdSchema, RaceIdSchema, SizeSchema } from './ids';

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
  size: SizeSchema,
  features: z.array(RaceFeatureSchema),
  /** Classes this race is permitted to take. See dd-roguelite race-class matrix. */
  validClasses: z.array(ClassIdSchema),
});

export type RaceFeature = z.infer<typeof RaceFeatureSchema>;
export type Race = z.infer<typeof RaceSchema>;
