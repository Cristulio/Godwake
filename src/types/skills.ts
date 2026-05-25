import type { AbilityName } from './abilities';

export type SkillName =
  | 'acrobatics'
  | 'animal-handling'
  | 'arcana'
  | 'athletics'
  | 'deception'
  | 'history'
  | 'insight'
  | 'intimidation'
  | 'investigation'
  | 'medicine'
  | 'nature'
  | 'perception'
  | 'performance'
  | 'persuasion'
  | 'religion'
  | 'sleight-of-hand'
  | 'stealth'
  | 'survival';

export const SKILL_NAMES: readonly SkillName[] = [
  'acrobatics', 'animal-handling', 'arcana', 'athletics', 'deception',
  'history', 'insight', 'intimidation', 'investigation', 'medicine',
  'nature', 'perception', 'performance', 'persuasion', 'religion',
  'sleight-of-hand', 'stealth', 'survival',
] as const;

export const SKILL_TO_ABILITY: Record<SkillName, AbilityName> = {
  'acrobatics': 'dex',
  'animal-handling': 'wis',
  'arcana': 'int',
  'athletics': 'str',
  'deception': 'cha',
  'history': 'int',
  'insight': 'wis',
  'intimidation': 'cha',
  'investigation': 'int',
  'medicine': 'wis',
  'nature': 'int',
  'perception': 'wis',
  'performance': 'cha',
  'persuasion': 'cha',
  'religion': 'int',
  'sleight-of-hand': 'dex',
  'stealth': 'dex',
  'survival': 'wis',
};

export type ProficiencyLevel = 'none' | 'proficient' | 'expert';
