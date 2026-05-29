import type { Character } from '../../types/character';
import type { SkillName } from '../../types/skills';
import { SKILL_TO_ABILITY } from '../../types/skills';
import type { DiceRoller } from '../dice';
import { modifierFor, proficiencyBonus } from './derived';

export interface SkillCheckResult {
  skill: SkillName;
  dc: number;
  /** The natural d20 face (before modifiers). */
  d20: number;
  /** Governing-ability modifier (the skill's ability per SKILL_TO_ABILITY). */
  abilityMod: number;
  /** Proficiency added: 0 if untrained, prof if proficient, 2×prof if expert. */
  proficiencyMod: number;
  /** Final tally = d20 + abilityMod + proficiencyMod. */
  total: number;
  passed: boolean;
  proficient: boolean;
  expert: boolean;
}

/**
 * The flat bonus a character brings to a skill: governing-ability modifier plus
 * proficiency (doubled for expertise). Used both by `skillCheck` and by the UI
 * to show the player their odds before they commit — legible numbers over a
 * hidden roll.
 */
export function skillBonus(character: Character, skill: SkillName): number {
  const ability = SKILL_TO_ABILITY[skill];
  const abilityMod = modifierFor(character, ability);
  const expert = character.expertSkills.includes(skill);
  const proficient = expert || character.skillProficiencies.includes(skill);
  const prof = proficiencyBonus(character.level);
  const proficiencyMod = expert ? prof * 2 : proficient ? prof : 0;
  return abilityMod + proficiencyMod;
}

/**
 * Resolve a d20 skill check: d20 + ability modifier + proficiency (doubled for
 * expertise) against a DC. A natural 20 always passes and a natural 1 always
 * fails regardless of the tally — 5e RAW doesn't crit ability checks, but the
 * swing keeps every check a live gamble (a long-shot persuasion can still land;
 * a sure thing can still flop), which is the better game feel here.
 */
export function skillCheck(
  character: Character,
  skill: SkillName,
  dc: number,
  roller: DiceRoller,
): SkillCheckResult {
  const ability = SKILL_TO_ABILITY[skill];
  const abilityMod = modifierFor(character, ability);
  const expert = character.expertSkills.includes(skill);
  const proficient = expert || character.skillProficiencies.includes(skill);
  const prof = proficiencyBonus(character.level);
  const proficiencyMod = expert ? prof * 2 : proficient ? prof : 0;

  const roll = roller.d20();
  const d20 = roll.rolls[0];
  const total = d20 + abilityMod + proficiencyMod;

  let passed = total >= dc;
  if (roll.natural20) passed = true;
  if (roll.natural1) passed = false;

  return { skill, dc, d20, abilityMod, proficiencyMod, total, passed, proficient, expert };
}
