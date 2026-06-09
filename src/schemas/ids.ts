import { z } from 'zod';

export const RaceIdSchema = z.enum([
  'human',
  'half-elf',
  'elf',
  'wood-elf',
  'dwarf',
  'hill-dwarf',
  'halfling',
  'half-orc',
  'gnome',
  'tiefling',
]);
export type RaceId = z.infer<typeof RaceIdSchema>;

export const ClassIdSchema = z.enum([
  'fighter',
  'wizard',
  'cleric',
  'rogue',
  'barbarian',
  'ranger',
  'druid',
  'monk',
  'bard',
]);
export type ClassId = z.infer<typeof ClassIdSchema>;

export const SizeSchema = z.enum(['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan']);
export type Size = z.infer<typeof SizeSchema>;

export const AbilitySchema = z.enum(['str', 'dex', 'con', 'int', 'wis', 'cha']);

export const SkillSchema = z.enum([
  'acrobatics', 'animal-handling', 'arcana', 'athletics', 'deception',
  'history', 'insight', 'intimidation', 'investigation', 'medicine',
  'nature', 'perception', 'performance', 'persuasion', 'religion',
  'sleight-of-hand', 'stealth', 'survival',
]);

export const DamageTypeSchema = z.enum([
  'slashing', 'piercing', 'bludgeoning',
  'fire', 'cold', 'lightning', 'thunder',
  'acid', 'poison',
  'psychic', 'necrotic', 'radiant',
  'force',
]);

export const RaritySchema = z.enum([
  'common', 'uncommon', 'rare', 'very-rare', 'legendary', 'artifact',
]);
export type Rarity = z.infer<typeof RaritySchema>;
