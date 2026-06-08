import { describe, it, expect } from 'vitest';
import { buildPlayerCharacter, presetCreationInput } from './defaultCharacter';
import { STANDARD_ARRAY } from './initialize';
import { characterHasMechanic } from './derived';
import { listClasses } from '../../content/classes';

function baseScores() {
  return {
    str: STANDARD_ARRAY[0],
    dex: STANDARD_ARRAY[1],
    con: STANDARD_ARRAY[2],
    int: STANDARD_ARRAY[3],
    wis: STANDARD_ARRAY[4],
    cha: STANDARD_ARRAY[5],
  };
}

describe('skills removed from the player flow', () => {
  for (const cls of listClasses().filter((c) => c.preset)) {
    it(`${cls.id} forges with zero skill proficiencies`, () => {
      const c = buildPlayerCharacter(presetCreationInput(cls.id));
      expect(c.skillProficiencies).toEqual([]);
      expect(c.expertSkills).toEqual([]);
    });
  }
});

describe('starting kits — safety-net baseline', () => {
  it('Fighter starts with 2 potions of healing', () => {
    const c = buildPlayerCharacter({
      name: 'Brick',
      raceId: 'human',
      classId: 'fighter',
      baseAbilityScores: baseScores(),
    });
    const potions = c.inventory.filter((i) => i.itemId === 'potion-of-healing');
    expect(potions.length).toBe(2);
  });

  it('Wizard starts with 3 potions of healing (glass-cannon cushion)', () => {
    const c = buildPlayerCharacter({
      name: 'Mage',
      raceId: 'human',
      classId: 'wizard',
      baseAbilityScores: baseScores(),
    });
    const potions = c.inventory.filter((i) => i.itemId === 'potion-of-healing');
    expect(potions.length).toBe(3);
  });

  it('Rogue starts with 2 potions of healing, rapier equipped, dagger + shortbow in pack', () => {
    const c = buildPlayerCharacter({
      name: 'Sneak',
      raceId: 'human',
      classId: 'rogue',
      baseAbilityScores: baseScores(),
    });
    const potions = c.inventory.filter((i) => i.itemId === 'potion-of-healing');
    expect(potions.length).toBe(2);
    expect(c.equipped.mainHand?.itemId).toBe('rapier');
    expect(c.inventory.some((i) => i.itemId === 'dagger')).toBe(true);
    expect(c.inventory.some((i) => i.itemId === 'shortbow')).toBe(true);
    expect(c.inventory.some((i) => i.itemId === 'rapier')).toBe(true);
  });
});

describe('Champion Improved Critical — earlier feature gate', () => {
  it('fires at character level 2 via characterHasMechanic', () => {
    const c = buildPlayerCharacter({
      name: 'Brick',
      raceId: 'human',
      classId: 'fighter',
      baseAbilityScores: baseScores(),
    });
    const champ2 = { ...c, level: 2, subclassId: 'champion' as const };
    expect(characterHasMechanic(champ2, 'improved-critical')).toBe(true);
  });
});
