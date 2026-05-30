import { describe, it, expect } from 'vitest';
import { createCharacter, STANDARD_ARRAY } from './initialize';
import {
  equipItem,
  equipDenialReason,
  canEquip,
  isArmorProficient,
  classArmorProficient,
} from './equip';
import { getItem } from '../../content/items';
import type { Character } from '../../types/character';
import type { ClassId } from '../../schemas/ids';
import type { Armor } from '../../schemas/item';

function charOfClass(classId: ClassId, inventory: string[]): Character {
  return {
    ...createCharacter({
      id: 't',
      name: 'Test',
      raceId: 'human',
      classId,
      baseAbilityScores: {
        str: STANDARD_ARRAY[0],
        con: STANDARD_ARRAY[1],
        dex: STANDARD_ARRAY[2],
        wis: STANDARD_ARRAY[3],
        cha: STANDARD_ARRAY[4],
        int: STANDARD_ARRAY[5],
      },
      skillProficiencies: [],
    }),
    inventory: inventory.map((itemId) => ({ itemId })),
    equipped: { mainHand: null, offHand: null, armor: null },
  };
}

const armor = (id: string) => getItem(id) as Armor;

describe('armour class-gating', () => {
  it('only the Fighter can wear heavy chain mail', () => {
    expect(classArmorProficient('fighter', armor('chain-mail'))).toBe(true);
    expect(classArmorProficient('ranger', armor('chain-mail'))).toBe(false);
    expect(classArmorProficient('barbarian', armor('chain-mail'))).toBe(false);
    expect(classArmorProficient('rogue', armor('chain-mail'))).toBe(false);
    expect(classArmorProficient('wizard', armor('chain-mail'))).toBe(false);
  });

  it('the Rogue is light-armour only', () => {
    expect(classArmorProficient('rogue', armor('leather-armor'))).toBe(true); // light
    expect(classArmorProficient('rogue', armor('half-plate'))).toBe(false); // medium
    expect(classArmorProficient('rogue', armor('shield'))).toBe(false); // no shield
  });

  it('the Wizard wears no armour at all', () => {
    expect(classArmorProficient('wizard', armor('leather-armor'))).toBe(false);
    expect(isArmorProficient(charOfClass('wizard', []), armor('leather-armor'))).toBe(false);
  });

  it('surfaces a class-named denial reason and blocks the equip', () => {
    const ranger = charOfClass('ranger', ['chain-mail']);
    expect(equipDenialReason(ranger, 'chain-mail')).toBe("A Ranger can't wear this");
    expect(canEquip(ranger, 'chain-mail')).toBe(false);
    const after = equipItem(ranger, 0);
    expect(after).toBe(ranger); // identity preserved on a blocked equip
    expect(after.equipped.armor).toBeNull();
  });

  it('lets a proficient class equip its armour', () => {
    const fighter = charOfClass('fighter', ['chain-mail']);
    expect(equipDenialReason(fighter, 'chain-mail')).toBeNull();
    const after = equipItem(fighter, 0);
    expect(after.equipped.armor?.itemId).toBe('chain-mail');
  });
});
