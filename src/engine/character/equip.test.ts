import { describe, it, expect } from 'vitest';
import { equipItem, unequipSlot, slotForItem } from './equip';
import { createCharacter, STANDARD_ARRAY } from './initialize';
import type { Character } from '../../types/character';

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
