import { z } from 'zod';
import { AbilitySchema, ClassIdSchema, RaceIdSchema, SkillSchema } from './ids';
import { WeaponPropertySchema } from './item';

/**
 * Which weapons a class is trained to wield. A weapon is proficient if it
 * matches ANY clause: its category is listed, it carries one of the listed
 * properties (e.g. a Rogue and any `finesse` blade), or its id is named
 * explicitly. Absent = no restriction. Enforced in `equip.ts`.
 */
export const WeaponProficiencySchema = z.object({
  categories: z.array(z.enum(['simple', 'martial'])),
  properties: z.array(WeaponPropertySchema).optional(),
  ids: z.array(z.string()).optional(),
});

/**
 * Which armour categories a class is trained to wear. This is the armour-
 * restriction gate (mirrors `weaponProficiency`): a class can equip/roll only
 * the listed categories. Absent = unrestricted; an empty `categories` = wears
 * no armour at all (the Wizard). Enforced in `equip.ts`.
 */
export const ArmorProficiencySchema = z.object({
  categories: z.array(z.enum(['light', 'medium', 'heavy', 'shield'])),
});

export const ClassFeatureSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  /** Optional flag a feature exposes for engine wiring (e.g., 'second-wind'). */
  mechanicKey: z.string().optional(),
});

export const SubclassSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  /** Map of character-level -> features gained that level. */
  featuresByLevel: z.record(z.string(), z.array(ClassFeatureSchema)),
});

export const ClassPresetSchema = z.object({
  characterName: z.string(),
  recommendedRaceId: RaceIdSchema,
  abilityScores: z.object({
    str: z.number().int(),
    dex: z.number().int(),
    con: z.number().int(),
    int: z.number().int(),
    wis: z.number().int(),
    cha: z.number().int(),
  }),
  recommendedSkills: z.array(SkillSchema),
  flavorBlurb: z.string(),
});

export const ClassSchema = z.object({
  id: ClassIdSchema,
  name: z.string(),
  hitDie: z.union([z.literal(6), z.literal(8), z.literal(10), z.literal(12)]),
  primaryAbility: z.array(AbilitySchema),
  savingThrowProficiencies: z.array(AbilitySchema).length(2),
  /** Weapons the class is trained to wield. Absent = no restriction. */
  weaponProficiency: WeaponProficiencySchema.optional(),
  /** Armour categories the class is trained to wear. Absent = no restriction. */
  armorProficiency: ArmorProficiencySchema.optional(),
  /** Skills the player can pick from at character creation. */
  skillChoiceCount: z.number().int().nonnegative(),
  skillChoiceFrom: z.array(SkillSchema),
  /** Extra skill picks granted on level-up, keyed by character level. */
  skillGrantsByLevel: z.record(z.string(), z.number().int().positive()).optional(),
  /** Level at which a subclass is selected. */
  subclassLevel: z.number().int().positive(),
  /** Class features by character level, e.g., {1: [...], 2: [...]}. */
  featuresByLevel: z.record(z.string(), z.array(ClassFeatureSchema)),
  subclasses: z.array(SubclassSchema),
  /** Designer-tuned quick-start preset, surfaced in character creation. */
  preset: ClassPresetSchema.optional(),
});

export type WeaponProficiency = z.infer<typeof WeaponProficiencySchema>;
export type ArmorProficiency = z.infer<typeof ArmorProficiencySchema>;
export type ClassFeature = z.infer<typeof ClassFeatureSchema>;
export type Subclass = z.infer<typeof SubclassSchema>;
export type ClassPreset = z.infer<typeof ClassPresetSchema>;
export type Class = z.infer<typeof ClassSchema>;
