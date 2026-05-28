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

/**
 * Short in-world descriptions shown under each skill name in the picker.
 * `(future)` marks skills that aren't yet consumed by event/dialogue gates —
 * kept on the sheet so proficiencies don't have to be re-plumbed later.
 */
export const SKILL_DESCRIPTIONS: Record<SkillName, string> = {
  acrobatics: 'Keep your footing on broken ground and slick stone. (future)',
  'animal-handling': 'Calm or command beasts encountered in the deep. (future)',
  arcana: 'Identify magical effects and recognise spells in combat. (future)',
  athletics: 'Climb, shove, and grapple your way through obstacles. (future)',
  deception: 'Lie convincingly to wardens, cultists, and city guards. (future)',
  history: 'Recall lore at shrines and ancient sites. (future)',
  insight: 'See through deceptions in dialogue. (future)',
  intimidation: 'Cow weaker foes into yielding gold or passage. (future)',
  investigation: 'Spot traps and hidden items in rooms. (future)',
  medicine: 'Stabilise allies and stop bleeding wounds. (future)',
  nature: 'Read the wilds — track game, name plants, feel a storm coming. (future)',
  perception: 'Notice ambushes, hidden doors, and small things astray. (future)',
  performance: 'Hold a crowd with song or story for coin or favour. (future)',
  persuasion: 'Talk a stranger into a kindness they did not plan to give. (future)',
  religion: 'Recognise divine signs at altars and shrines. (future)',
  'sleight-of-hand': 'Lift a purse, palm a coin, plant a blade. (future)',
  stealth: 'Move unseen past patrols and sleeping things. (future)',
  survival: 'Find shelter, water, and the right road in unmarked country. (future)',
};
