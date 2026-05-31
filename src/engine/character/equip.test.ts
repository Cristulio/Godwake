import { describe, it, expect } from 'vitest';

import {
  equipItem,
  equipItemToSlot,
  unequipSlot,
  slotForItem,
  canEquipToSlot,
  canEquip,
  equipDenialReason,
  isWeaponProficient,
} from './equip';
import { computeAC } from './derived';
import { createCharacter, STANDARD_ARRAY } from './initialize';
import { getItem } from '../../content/items';
import type { Character } from '../../types/character';
import type { ClassId } from '../../schemas/ids';
import type { Weapon } from '../../schemas/item';

function baseChar(): Character {
  return {
    ...createCharacter({
      id: 'test',
      name: 'Test',
      raceId: 'human',
      classId: 'fighter',
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
    inventory: [
      { itemId: 'longsword' },
      { itemId: 'shield' },
      { itemId: 'greatsword' },
      { itemId: 'leather-armor' },
      { itemId: 'potion-of-healing' },
    ],
  };
}

function charOfClass(classId: ClassId, inventory: string[]): Character {
  return {
    ...createCharacter({
      id: 'test',
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

const weapon = (id: string) => getItem(id) as Weapon;

describe('weapon proficiency', () => {
  it('Fighter is trained with every simple and martial arm', () => {
    const c = charOfClass('fighter', []);
    for (const id of ['dagger', 'longsword', 'greatsword', 'battleaxe', 'rapier', 'hand-crossbow']) {
      expect(isWeaponProficient(c, weapon(id))).toBe(true);
    }
  });

  it('Wizard is limited to simple weapons', () => {
    const c = charOfClass('wizard', []);
    expect(isWeaponProficient(c, weapon('dagger'))).toBe(true);
    expect(isWeaponProficient(c, weapon('quarterstaff'))).toBe(true);
    expect(isWeaponProficient(c, weapon('mace'))).toBe(true);
    expect(isWeaponProficient(c, weapon('battleaxe'))).toBe(false);
    expect(isWeaponProficient(c, weapon('greatsword'))).toBe(false);
    expect(isWeaponProficient(c, weapon('rapier'))).toBe(false);
  });

  it('Rogue wields simple, finesse, and light weapons but not heavy martial', () => {
    const c = charOfClass('rogue', []);
    expect(isWeaponProficient(c, weapon('dagger'))).toBe(true); // simple
    expect(isWeaponProficient(c, weapon('shortbow'))).toBe(true); // simple ranged
    expect(isWeaponProficient(c, weapon('rapier'))).toBe(true); // martial, finesse
    expect(isWeaponProficient(c, weapon('hand-crossbow'))).toBe(true); // martial, light
    expect(isWeaponProficient(c, weapon('greatsword'))).toBe(false);
    expect(isWeaponProficient(c, weapon('battleaxe'))).toBe(false);
  });

  it('equipItem refuses a non-proficient weapon and keeps identity', () => {
    const c = charOfClass('wizard', ['battleaxe']);
    const after = equipItem(c, 0);
    expect(after).toBe(c);
    expect(after.equipped.mainHand).toBeNull();
  });

  it('equipItem allows a proficient weapon', () => {
    const c = charOfClass('wizard', ['quarterstaff']);
    const after = equipItem(c, 0);
    expect(after.equipped.mainHand?.itemId).toBe('quarterstaff');
  });

  it('canEquip / equipDenialReason reflect the class gate with a class-named reason', () => {
    const wiz = charOfClass('wizard', []);
    expect(canEquip(wiz, 'battleaxe')).toBe(false);
    expect(equipDenialReason(wiz, 'battleaxe')).toBe("A Wizard can't wield this");
    expect(equipDenialReason(wiz, 'dagger')).toBeNull();

    const rog = charOfClass('rogue', []);
    expect(equipDenialReason(rog, 'greatsword')).toBe("A Rogue can't wield this");
    expect(equipDenialReason(rog, 'rapier')).toBeNull();
  });
});

describe('slotForItem', () => {
  it('weapons go to mainHand', () => {
    expect(slotForItem('longsword')).toBe('mainHand');
  });
  it('shields go to offHand', () => {
    expect(slotForItem('shield')).toBe('offHand');
  });
  it('body armor goes to armor', () => {
    expect(slotForItem('leather-armor')).toBe('armor');
  });
  it('consumables are not equippable', () => {
    expect(slotForItem('potion-of-healing')).toBeNull();
  });
});

describe('equipItem', () => {
  it('equips a weapon into main hand', () => {
    const c = equipItem(baseChar(), 0);
    expect(c.equipped.mainHand?.itemId).toBe('longsword');
  });

  it('equips a shield into off hand', () => {
    const c = equipItem(baseChar(), 1);
    expect(c.equipped.offHand?.itemId).toBe('shield');
  });

  it('two-handed weapon clears off-hand', () => {
    let c = baseChar();
    c = equipItem(c, 1); // shield in off-hand
    expect(c.equipped.offHand?.itemId).toBe('shield');
    c = equipItem(c, 2); // greatsword (two-handed)
    expect(c.equipped.mainHand?.itemId).toBe('greatsword');
    expect(c.equipped.offHand).toBeNull();
  });

  it('equipping shield clears two-handed main-hand', () => {
    let c = baseChar();
    c = equipItem(c, 2); // greatsword
    expect(c.equipped.mainHand?.itemId).toBe('greatsword');
    c = equipItem(c, 1); // shield
    expect(c.equipped.offHand?.itemId).toBe('shield');
    expect(c.equipped.mainHand).toBeNull();
  });

  it('ignores consumables', () => {
    const before = baseChar();
    const c = equipItem(before, 4);
    expect(c.equipped).toEqual(before.equipped);
  });

  it('does not mutate inventory', () => {
    const before = baseChar();
    const c = equipItem(before, 0);
    expect(c.inventory).toEqual(before.inventory);
  });
});

describe('equipItemToSlot (drag-drop routing)', () => {
  // inventory: 0 iron-ring, 1 silver-ring, 2 longsword, 3 jade-amulet
  const ringChar = () =>
    charOfClass('fighter', ['iron-ring', 'silver-ring', 'longsword', 'jade-amulet']);

  it('ring slots are independent — a 2nd ring on ring2 keeps the 1st', () => {
    let c = equipItemToSlot(ringChar(), 0, 'ring1');
    expect(c.equipped.ring1?.itemId).toBe('iron-ring');
    c = equipItemToSlot(c, 1, 'ring2');
    expect(c.equipped.ring1?.itemId).toBe('iron-ring'); // not overwritten
    expect(c.equipped.ring2?.itemId).toBe('silver-ring');
  });

  it('honours the exact ring band dropped on (ring2 first leaves ring1 empty)', () => {
    const c = equipItemToSlot(ringChar(), 0, 'ring2');
    expect(c.equipped.ring2?.itemId).toBe('iron-ring');
    expect(c.equipped.ring1 ?? null).toBeNull();
  });

  it('auto-routes a non-matching drop to the item natural slot', () => {
    // Drop a weapon onto a ring band → it still goes to main hand.
    const c = equipItemToSlot(ringChar(), 2, 'ring1');
    expect(c.equipped.mainHand?.itemId).toBe('longsword');
    expect(c.equipped.ring1 ?? null).toBeNull();
  });

  it('auto-routes a ring dropped on a non-ring slot to a free ring band', () => {
    const c = equipItemToSlot(ringChar(), 0, 'amulet');
    expect(c.equipped.amulet ?? null).toBeNull();
    expect(c.equipped.ring1?.itemId).toBe('iron-ring');
  });
});

describe('unequipSlot', () => {
  it('clears the slot', () => {
    let c = baseChar();
    c = equipItem(c, 0);
    c = unequipSlot(c, 'mainHand');
    expect(c.equipped.mainHand).toBeNull();
  });

  it('returns same character when slot already empty', () => {
    const c = baseChar();
    const result = unequipSlot(c, 'armor');
    expect(result).toBe(c);
  });
});

describe('two ring slots', () => {
  // A ring carrying the +1 AC "of Warding" affix, so we can see both bands act.
  function wardingRing(baseId: string): { itemId: string; rolled: { baseId: string; rarity: 'green'; affixes: string[]; name: string } } {
    return {
      itemId: baseId,
      rolled: { baseId, rarity: 'green', affixes: ['warding'], name: `${baseId} of Warding` },
    };
  }

  function ringChar(): Character {
    return {
      ...createCharacter({
        id: 'test',
        name: 'Test',
        raceId: 'human',
        classId: 'fighter',
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
      inventory: [wardingRing('iron-ring'), wardingRing('silver-ring'), { itemId: 'gold-ring' }],
      equipped: { mainHand: null, offHand: null, armor: null },
    };
  }

  it('a ring may be dropped onto either band', () => {
    expect(canEquipToSlot('iron-ring', 'ring1')).toBe(true);
    expect(canEquipToSlot('iron-ring', 'ring2')).toBe(true);
    expect(canEquipToSlot('iron-ring', 'amulet')).toBe(false);
  });

  it('equips two rings — first fills ring1, second fills ring2', () => {
    let c = ringChar();
    c = equipItem(c, 0);
    expect(c.equipped.ring1?.itemId).toBe('iron-ring');
    expect(c.equipped.ring2 ?? null).toBeNull();
    c = equipItem(c, 1);
    expect(c.equipped.ring1?.itemId).toBe('iron-ring');
    expect(c.equipped.ring2?.itemId).toBe('silver-ring');
  });

  it('a third ring displaces the first band when both are full', () => {
    let c = ringChar();
    c = equipItem(c, 0); // ring1 = iron
    c = equipItem(c, 1); // ring2 = silver
    c = equipItem(c, 2); // gold → first band
    expect(c.equipped.ring1?.itemId).toBe('gold-ring');
    expect(c.equipped.ring2?.itemId).toBe('silver-ring');
  });

  it('both equipped rings contribute their affixes — AC sums', () => {
    let c = ringChar();
    const baseAc = computeAC(c);
    c = equipItem(c, 0);
    expect(computeAC(c)).toBe(baseAc + 1);
    c = equipItem(c, 1);
    expect(computeAC(c)).toBe(baseAc + 2);
  });
});
