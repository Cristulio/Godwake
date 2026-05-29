import { describe, it, expect } from 'vitest';
import { createCharacter } from './initialize';
import { modifierFor, proficiencyBonus } from './derived';
import { skillCheck, skillBonus } from './skillCheck';
import type { Character } from '../../types/character';
import type { SkillName } from '../../types/skills';
import type { DiceRoller } from '../dice';
import type { RollResult } from '../../types/dice';

/** A roller pinned to a single d20 face — the only call skillCheck makes. */
function fixedD20(face: number): DiceRoller {
  const result: RollResult = {
    expression: { count: 1, die: 20, modifier: 0 },
    rolls: [face],
    modifier: 0,
    total: face,
    natural20: face === 20,
    natural1: face === 1,
    advantage: 'normal',
  };
  return {
    roll: () => result,
    d20: () => result,
    serialize: () => ({ state: 0 }),
  };
}

function fighter(skills: SkillName[] = []): Character {
  return createCharacter({
    id: 'f',
    name: 'F',
    raceId: 'human',
    classId: 'fighter',
    baseAbilityScores: { str: 14, dex: 12, con: 13, int: 10, wis: 11, cha: 12 },
    skillProficiencies: skills,
  });
}

describe('skillBonus — flat sheet bonus', () => {
  it('untrained = governing ability modifier only', () => {
    const c = fighter([]);
    expect(skillBonus(c, 'persuasion')).toBe(modifierFor(c, 'cha'));
    expect(skillBonus(c, 'athletics')).toBe(modifierFor(c, 'str'));
  });

  it('proficient adds the proficiency bonus', () => {
    const c = fighter(['persuasion']);
    expect(skillBonus(c, 'persuasion')).toBe(
      modifierFor(c, 'cha') + proficiencyBonus(c.level),
    );
  });

  it('expertise doubles the proficiency bonus', () => {
    const c: Character = { ...fighter([]), expertSkills: ['athletics'] };
    expect(skillBonus(c, 'athletics')).toBe(
      modifierFor(c, 'str') + proficiencyBonus(c.level) * 2,
    );
  });
});

describe('skillCheck — d20 + ability + proficiency vs DC', () => {
  it('totals d20 + ability mod (no proficiency when untrained)', () => {
    const c = fighter([]);
    const r = skillCheck(c, 'persuasion', 5, fixedD20(10));
    expect(r.d20).toBe(10);
    expect(r.abilityMod).toBe(modifierFor(c, 'cha'));
    expect(r.proficiencyMod).toBe(0);
    expect(r.total).toBe(10 + r.abilityMod);
    expect(r.proficient).toBe(false);
  });

  it('adds proficiency for a trained skill', () => {
    const c = fighter(['intimidation']);
    const r = skillCheck(c, 'intimidation', 5, fixedD20(10));
    expect(r.proficient).toBe(true);
    expect(r.proficiencyMod).toBe(proficiencyBonus(c.level));
    expect(r.total).toBe(10 + r.abilityMod + r.proficiencyMod);
  });

  it('reads the governing ability per skill (athletics → STR)', () => {
    const c = fighter([]);
    const r = skillCheck(c, 'athletics', 5, fixedD20(8));
    expect(r.abilityMod).toBe(modifierFor(c, 'str'));
  });

  it('passes when total meets the DC and fails just below it', () => {
    const c = fighter([]);
    const mod = modifierFor(c, 'cha');
    const dc = 12;
    // Pick the d20 face that lands total exactly on the DC.
    const onDc = dc - mod;
    expect(skillCheck(c, 'persuasion', dc, fixedD20(onDc)).passed).toBe(true);
    expect(skillCheck(c, 'persuasion', dc, fixedD20(onDc - 1)).passed).toBe(false);
  });

  it('natural 20 always passes, even against an impossible DC', () => {
    const c = fighter([]);
    const r = skillCheck(c, 'persuasion', 99, fixedD20(20));
    expect(r.passed).toBe(true);
  });

  it('natural 1 always fails, even when the modifiers would clear the DC', () => {
    const c = fighter(['persuasion']);
    const r = skillCheck(c, 'persuasion', 1, fixedD20(1));
    expect(r.passed).toBe(false);
  });
});
