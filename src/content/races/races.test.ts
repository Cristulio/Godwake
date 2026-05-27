import { describe, it, expect } from 'vitest';
import { createCharacter, STANDARD_ARRAY } from '../../engine/character/initialize';
import { effectiveAbilityScores, modifierFor } from '../../engine/character/derived';
import { applyLevelUp, hpGainForLevelUp } from '../../engine/character/leveling';
import { listRaces, getRace } from './index';

const BASE_SCORES = {
  str: STANDARD_ARRAY[0], // 15
  dex: STANDARD_ARRAY[2], // 13
  con: STANDARD_ARRAY[1], // 14
  int: STANDARD_ARRAY[5], // 8
  wis: STANDARD_ARRAY[3], // 12
  cha: STANDARD_ARRAY[4], // 10
};

describe('race registry', () => {
  it('lists Human, Wood Elf, Hill Dwarf, Half-Elf, and Tiefling', () => {
    const ids = listRaces().map((r) => r.id).sort();
    expect(ids).toEqual(['half-elf', 'hill-dwarf', 'human', 'tiefling', 'wood-elf']);
  });
});

describe('Wood Elf', () => {
  const elf = createCharacter({
    id: 'we-1',
    name: 'Tarian',
    raceId: 'wood-elf',
    classId: 'fighter',
    baseAbilityScores: BASE_SCORES,
    skillProficiencies: ['athletics', 'perception'],
  });

  it('applies +2 DEX, +1 WIS bonuses', () => {
    const scores = effectiveAbilityScores(elf);
    expect(scores.dex).toBe(BASE_SCORES.dex + 2);
    expect(scores.wis).toBe(BASE_SCORES.wis + 1);
    expect(scores.str).toBe(BASE_SCORES.str); // no bonus
  });

  it('has 35 ft. speed', () => {
    expect(getRace('wood-elf').speed).toBe(35);
  });
});

describe('Hill Dwarf', () => {
  const dwarf = createCharacter({
    id: 'hd-1',
    name: 'Borrik',
    raceId: 'hill-dwarf',
    classId: 'fighter',
    baseAbilityScores: BASE_SCORES,
    skillProficiencies: ['athletics', 'perception'],
  });

  it('applies +2 CON, +1 WIS bonuses', () => {
    const scores = effectiveAbilityScores(dwarf);
    expect(scores.con).toBe(BASE_SCORES.con + 2);
    expect(scores.wis).toBe(BASE_SCORES.wis + 1);
  });

  it('has 25 ft. speed', () => {
    expect(getRace('hill-dwarf').speed).toBe(25);
  });

  it('gains +1 HP at level 1 from Dwarven Toughness', () => {
    // fighter d10 + CON mod (16 → +3) + bonusHp(1) = 14
    expect(dwarf.hp.max).toBe(10 + 3 + 1);
  });

  it('gains +1 HP every level via hpGainForLevelUp', () => {
    // avg fighter HP (6) + CON mod (+3) + dwarf bonus (+1) = 10
    expect(hpGainForLevelUp(dwarf)).toBe(6 + 3 + 1);
  });

  it('applyLevelUp bakes the dwarven +1 into max HP each level', () => {
    const l2 = applyLevelUp({ ...dwarf, xp: 300 });
    expect(l2.hp.max).toBe(dwarf.hp.max + (6 + 3 + 1));
  });
});

describe('Half-Elf — class-aware +1/+1 auto-route', () => {
  it('fighter half-elf routes +1 to STR (primary) and +1 to DEX (martial secondary)', () => {
    const halfElfFighter = createCharacter({
      id: 'he-fighter',
      name: 'Imoen',
      raceId: 'half-elf',
      classId: 'fighter',
      baseAbilityScores: BASE_SCORES,
      skillProficiencies: ['athletics', 'perception'],
    });
    const scores = effectiveAbilityScores(halfElfFighter);
    expect(scores.cha).toBe(BASE_SCORES.cha + 2);
    expect(scores.str).toBe(BASE_SCORES.str + 1);
    expect(scores.dex).toBe(BASE_SCORES.dex + 1);
    expect(scores.con).toBe(BASE_SCORES.con);
    expect(scores.int).toBe(BASE_SCORES.int);
    expect(scores.wis).toBe(BASE_SCORES.wis);
  });

  it('wizard half-elf routes +1 to INT (primary) and +1 to CON (caster secondary)', () => {
    // Wizard preset usually puts the highest array slot on INT. Use 15 INT
    // here so the bumped score lands at 16 → +3 mod (spell attack +5 at lv1
    // with proficiency, spell save DC 14).
    const wizardScores = {
      str: 8,
      dex: 14,
      con: 13,
      int: 15,
      wis: 12,
      cha: 10,
    };
    const halfElfWizard = createCharacter({
      id: 'he-wizard',
      name: 'Aerie',
      raceId: 'half-elf',
      classId: 'wizard',
      baseAbilityScores: wizardScores,
      skillProficiencies: ['arcana', 'history'],
    });
    const scores = effectiveAbilityScores(halfElfWizard);
    expect(scores.cha).toBe(wizardScores.cha + 2);
    expect(scores.int).toBe(wizardScores.int + 1); // 16
    expect(scores.con).toBe(wizardScores.con + 1);
    expect(scores.str).toBe(wizardScores.str);
    expect(scores.dex).toBe(wizardScores.dex);
    expect(scores.wis).toBe(wizardScores.wis);
    // INT 16 → +3 mod. With L1 prof +2 and wizard +1 baseline, that's
    // DC 14 and spell attack +5 — parity with other-race wizards.
    expect(modifierFor(halfElfWizard, 'int')).toBe(3);
  });

  it('rogue half-elf routes +1 to DEX (primary) and +1 to CON (DEX-primary fallback)', () => {
    const halfElfRogue = createCharacter({
      id: 'he-rogue',
      name: 'Yoshimo',
      raceId: 'half-elf',
      classId: 'rogue',
      baseAbilityScores: BASE_SCORES,
      skillProficiencies: ['stealth', 'sleight-of-hand'],
    });
    const scores = effectiveAbilityScores(halfElfRogue);
    expect(scores.cha).toBe(BASE_SCORES.cha + 2);
    expect(scores.dex).toBe(BASE_SCORES.dex + 1);
    expect(scores.con).toBe(BASE_SCORES.con + 1);
  });

  it('has 30 ft. speed', () => {
    expect(getRace('half-elf').speed).toBe(30);
  });
});

describe('Tiefling', () => {
  const tiefling = createCharacter({
    id: 'tf-1',
    name: 'Ozzy',
    raceId: 'tiefling',
    classId: 'fighter',
    baseAbilityScores: BASE_SCORES,
    skillProficiencies: ['athletics', 'perception'],
  });

  it('applies +2 CHA, +1 INT bonuses', () => {
    const scores = effectiveAbilityScores(tiefling);
    expect(scores.cha).toBe(BASE_SCORES.cha + 2);
    expect(scores.int).toBe(BASE_SCORES.int + 1);
  });

  it('resists fire AND poison damage', () => {
    const resists = getRace('tiefling').damageResistances ?? [];
    expect(resists).toContain('fire');
    expect(resists).toContain('poison');
  });
});
