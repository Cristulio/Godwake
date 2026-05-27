import { z } from 'zod';
import { DamageTypeSchema } from './ids';

export const SpellLevelSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
]);
export type SpellLevel = z.infer<typeof SpellLevelSchema>;

export const SpellSchoolSchema = z.enum([
  'abjuration',
  'conjuration',
  'divination',
  'enchantment',
  'evocation',
  'illusion',
  'necromancy',
  'transmutation',
]);
export type SpellSchool = z.infer<typeof SpellSchoolSchema>;

export const SpellTargetSchema = z.enum(['single', 'area', 'self']);
export type SpellTarget = z.infer<typeof SpellTargetSchema>;

export const SpellEffectKeySchema = z.enum([
  'fire-bolt',
  'magic-missile',
  'burning-hands',
  'shield',
  'mage-armor',
  'hold-person',
  'misty-step',
  'fireball',
  'lightning-bolt',
]);
export type SpellEffectKey = z.infer<typeof SpellEffectKeySchema>;

export const SpellSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** 0 = cantrip (free, no slot cost). 1-3 supported at launch. */
  level: SpellLevelSchema,
  school: SpellSchoolSchema,
  range: z.string(),
  target: SpellTargetSchema,
  damageType: DamageTypeSchema.optional(),
  description: z.string(),
  /** Engine handler key. The `castSpell` switch routes off this. */
  effectKey: SpellEffectKeySchema,
});

export type Spell = z.infer<typeof SpellSchema>;
