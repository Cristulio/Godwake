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
 * Per the no-flavor-only rule: a skill is "enabled" only if it has an engine
 * consumer. Skills were removed from the player flow (no creation or level-up
 * picker), so the enabled set now exists purely to keep the event ↔ skill-check
 * contract honest: every enabled skill is read by at least one event, and every
 * event skill-check names an enabled skill (both asserted in `content/events`).
 * The four still-disabled skills (acrobatics, animal-handling, nature,
 * performance) have no natural event home and would be contrived to wire, so
 * they stay disabled. Disabled skills remain in the type union so existing save
 * data and any future engine hook keep resolving; consumers filter by this map.
 */
export const SKILL_ENABLED: Record<SkillName, boolean> = {
  acrobatics: false,
  'animal-handling': false,
  arcana: true,
  athletics: true,
  deception: true,
  history: true,
  insight: true,
  intimidation: true,
  investigation: true,
  medicine: true,
  nature: false,
  perception: true,
  performance: false,
  persuasion: true,
  religion: true,
  'sleight-of-hand': true,
  stealth: true,
  survival: true,
};

export function isSkillEnabled(s: SkillName): boolean {
  return SKILL_ENABLED[s] === true;
}

export const SKILL_DESCRIPTIONS: Record<SkillName, string> = {
  acrobatics: 'Keep your footing on broken ground and slick stone.',
  'animal-handling': 'Calm or command beasts encountered in the deep.',
  arcana: 'Read magical scripts, identify enchantments, and handle the Weave safely at shrines and in lore chambers.',
  athletics: 'Force open bars and heavy doors, upend obstacles, and outlast whatever physical demand the road puts on your body.',
  deception: 'Lie convincingly to wardens, cultists, and city guards.',
  history: 'Recall lore at shrines and ancient sites.',
  insight: 'Read the person in front of you — their real intent, their fear, the moment they fold.',
  intimidation: 'Make someone decide that cooperation costs less than defiance.',
  investigation: 'Find the thing that was meant to stay hidden — a spring-trap, a false bottom, a cache worked into the stonework.',
  medicine: "Treat wounds on the road — yours or a stranger's — and read a living body's danger quickly.",
  nature: 'Read the wilds — track game, name plants, feel a storm coming.',
  perception: "Spot what others walk past — a hidden pack, a watching face, a cord that shouldn't be there.",
  performance: 'Hold a crowd with song or story for coin or favour.',
  persuasion: 'Talk a stranger into a kindness they did not plan to give.',
  religion: 'Recognise divine signs at altars and shrines.',
  'sleight-of-hand': 'Lift a purse, palm a coin, and take what is loose before a hand catches yours.',
  stealth: 'Move without sound or silhouette past anyone who would rather you did not.',
  survival: 'Read danger quickly — judge an animal, sort fouled food from good, assess how long something has left.',
};
