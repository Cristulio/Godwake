import { describe, it, expect } from 'vitest';
import { createCharacter, STANDARD_ARRAY } from './initialize';
import { computeAC } from './derived';
import { canEquip, equipItem } from './equip';
import { spellSaveDC } from '../combat/spells/helpers';
import { eligibleAffixes, rollItem } from '../items';
import { createDiceRoller } from '../dice';
import { getItem } from '../../content/items';
import type { Character } from '../../types/character';
import type { Armor, ItemRef } from '../../schemas/item';
import type { ClassId } from '../../schemas/ids';

function charOfClass(classId: ClassId): Character {
  return createCharacter({
    id: 't',
    name: 'Test',
    raceId: 'human',
    classId,
    baseAbilityScores: {
      str: STANDARD_ARRAY[5],
      con: STANDARD_ARRAY[2],
      dex: STANDARD_ARRAY[1],
      wis: STANDARD_ARRAY[3],
      cha: STANDARD_ARRAY[4],
      int: STANDARD_ARRAY[0],
    },
    skillProficiencies: [],
  });
}

function robeRef(affixes: string[] = []): ItemRef {
  return {
    itemId: 'silk-robe',
    rolled: { baseId: 'silk-robe', rarity: 'green', affixes, name: 'Silk Robe' },
  };
}

describe('robes — wizard body-slot caster gear', () => {
  it('is a no-AC body-slot item', () => {
    const robe = getItem('silk-robe') as Armor;
    expect(robe.category).toBe('robe');
    expect(robe.baseAC).toBe(0);
  });

  it('only the Wizard can equip a robe', () => {
    const wizard = { ...charOfClass('wizard'), inventory: [robeRef()] };
    expect(canEquip(wizard, 'silk-robe')).toBe(true);
    const after = equipItem(wizard, 0);
    expect(after.equipped.armor?.itemId).toBe('silk-robe');

    const fighter = { ...charOfClass('fighter'), inventory: [robeRef()] };
    expect(canEquip(fighter, 'silk-robe')).toBe(false);
    expect(equipItem(fighter, 0)).toBe(fighter); // identity preserved when blocked
  });

  it('keeps Mage Armour active while a robe is worn (the !bodyArmor check)', () => {
    const bare = charOfClass('wizard');
    const robed: Character = { ...bare, equipped: { ...bare.equipped, armor: robeRef() } };

    // The robe itself adds no AC.
    expect(computeAC(robed)).toBe(computeAC(bare));

    // Mage Armour's +3 still lands over a robe (a robe is not body armour).
    const robedMage: Character = {
      ...robed,
      resources: { ...robed.resources, mageArmorActive: true },
    };
    expect(computeAC(robedMage)).toBe(computeAC(robed) + 3);
  });

  it("applies the robe's caster affixes from the body slot", () => {
    const bare = charOfClass('wizard');
    const robed: Character = {
      ...bare,
      equipped: { ...bare.equipped, armor: robeRef(['arcane']) },
    };
    expect(spellSaveDC(robed)).toBe(spellSaveDC(bare) + 1);
  });

  it('lets caster affixes roll onto a wizard robe', () => {
    expect(eligibleAffixes('armor', 'wizard').map((a) => a.id)).toEqual(
      expect.arrayContaining(['arcane', 'archmage', 'lucid', 'runic']),
    );
  });

  it('routes wizard armour rolls to robes only, and never to martials', () => {
    const wizRoll = rollItem(createDiceRoller('robe-seed'), {
      rarity: 'blue',
      classId: 'wizard',
      kind: 'armor',
    });
    expect((getItem(wizRoll.itemId) as Armor).category).toBe('robe');

    const roller = createDiceRoller('martial-seed');
    for (let i = 0; i < 50; i++) {
      const ref = rollItem(roller, { rarity: 'blue', classId: 'fighter', kind: 'armor' });
      expect((getItem(ref.itemId) as Armor).category).not.toBe('robe');
    }
  });
});
