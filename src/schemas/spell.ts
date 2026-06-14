import { z } from 'zod';
import { DamageTypeSchema } from './ids';

export const SpellLevelSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal(7),
  z.literal(8),
  z.literal(9),
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
  'scorching-ray',
  'blur',
  'mirror-image',
  'fireball',
  'lightning-bolt',
  // Higher-tier workings (level 4-9) authored for the L8→20 progression.
  'rime-blast', // 4: cold AoE
  'force-lance', // 4: single-target force, auto-lands
  'glacial-cone', // 5: cold AoE
  'void-ray', // 5: single-target necrotic ray (attack roll)
  'sunfire-burst', // 6: fire AoE
  'dissolution', // 6: single-target force, CON save for half
  'stormcrash', // 7: lightning AoE
  'soul-snare', // 7: single-target binding (paralysis)
  'cataclysm', // 8: fire AoE
  'wither', // 8: single-target necrotic + weaken
  'vampiric-touch', // 3: single-target necrotic drain, heals caster for half
  'exsanguinate', // 6: heavier single-target necrotic drain, heals caster for half
  'apotheosis', // 9: transform-self power buff (capstone)
  'unmake', // 9: remake-the-enemy (capstone)
  'time-stop', // 9: three free player turns, enemies frozen (capstone)
  'shape-change', // 9: become a dragon — temp HP wall + triple claw (capstone)
  'great-bear', // 9: druid — become the Great Bear, temp HP wall + twin claw, +AC (capstone)
  'power-word-kill', // 9: save-or-die — normals/elites die on a failed CON save; bosses never die, only bleed (capstone)
  // --- Druid signature workings — mechanics the arcane book lacks. ---
  'regrowth', // 2: self heal-over-time (the Druid's only sustain)
  'entangle', // 2: AoE root — every enemy saves or loses its next turn
  'summon-beast', // 7: persistent spirit companion, auto-damage each turn
  'vicious-mockery', // 0: Bard cantrip — psychic damage + rattles the target (disadvantage)
  'thunder-wave', // 2: Bard thunder AoE — every enemy, DEX save for half (the pack tool)
]);
export type SpellEffectKey = z.infer<typeof SpellEffectKeySchema>;

export const SpellSchema = z.object({
  id: z.string(),
  /** Which class book offers this spell; the level-up picker filters on it. */
  book: z.enum(['wizard', 'druid', 'bard', 'paladin']),
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
  /** Action economy this spell spends. Omitted reads as the main action;
   *  'bonus' spends the bonus action instead (Misty Step, Entangling Roots), so
   *  the caster can still take its main action the same turn. Read at the cast
   *  gate (`canCastSpell`) and surfaced by the UI/bot. */
  castTime: z.enum(['action', 'bonus']).optional(),
  /** When false, this spell is excluded from offer pools (level-up picker,
   *  future scroll drops). Code still ships for combat reference. Undefined
   *  reads as true. */
  enabled: z.boolean().optional(),
});

export type Spell = z.infer<typeof SpellSchema>;
