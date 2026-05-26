import { describe, it, expect, vi } from 'vitest';

// Inject synthetic attunement-required items into the catalog so the gate has
// something real to test against. The shipped item set is all attunement:false.
vi.mock('../../content/items', async () => {
  const actual = await vi.importActual<typeof import('../../content/items')>(
    '../../content/items',
  );
  const SYNTHETIC = new Map<string, ReturnType<typeof actual.getItem>>([
    [
      'test-attuned-sword',
      {
        id: 'test-attuned-sword',
        kind: 'weapon',
        name: 'Test Attuned Sword',
        category: 'martial',
        damage: '1d8',
        damageType: 'slashing',
        properties: [],
        weight: 3,
        cost: 0,
        rarity: 'rare',
        attunement: true,
      },
    ],
    [
      'test-attuned-2h',
      {
        id: 'test-attuned-2h',
        kind: 'weapon',
        name: 'Test Attuned Greatblade',
        category: 'martial',
        damage: '2d6',
        damageType: 'slashing',
        properties: ['two-handed'],
        weight: 6,
        cost: 0,
        rarity: 'rare',
        attunement: true,
      },
    ],
    [
      'test-attuned-shield',
      {
        id: 'test-attuned-shield',
        kind: 'armor',
        name: 'Test Attuned Shield',
        category: 'shield',
        baseAC: 2,
        stealthDisadvantage: false,
        weight: 6,
        cost: 0,
        rarity: 'rare',
        attunement: true,
      },
    ],
    [
      'test-attuned-armor',
      {
        id: 'test-attuned-armor',
        kind: 'armor',
        name: 'Test Attuned Mail',
        category: 'medium',
        baseAC: 14,
        stealthDisadvantage: false,
        weight: 20,
        cost: 0,
        rarity: 'rare',
        attunement: true,
      },
    ],
  ] as const);
  return {
    ...actual,
    getItem: (id: string) => SYNTHETIC.get(id) ?? actual.getItem(id),
  };
});

import {
  equipItem,
  unequipSlot,
  slotForItem,
  attunementSlotsCap,
  attunementSlotsUsed,
  canEquip,
  DEFAULT_ATTUNEMENT_SLOTS,
} from './equip';
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

function attunedChar(): Character {
  return {
    ...baseChar(),
    inventory: [
      { itemId: 'test-attuned-sword' },
      { itemId: 'test-attuned-shield' },
      { itemId: 'test-attuned-armor' },
      { itemId: 'test-attuned-2h' },
      { itemId: 'longsword' },
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

describe('attunement', () => {
  it('default cap is the engine constant (2)', () => {
    expect(attunementSlotsCap(baseChar())).toBe(DEFAULT_ATTUNEMENT_SLOTS);
    expect(DEFAULT_ATTUNEMENT_SLOTS).toBe(2);
  });

  it("Sage's Pact adds 1 to the cap", () => {
    const c = { ...baseChar(), attunementSlotsBonus: 1 };
    expect(attunementSlotsCap(c)).toBe(DEFAULT_ATTUNEMENT_SLOTS + 1);
  });

  it('used count is 0 with only non-attuned gear', () => {
    let c = baseChar();
    c = equipItem(c, 0); // longsword
    c = equipItem(c, 1); // shield
    c = equipItem(c, 3); // leather armor
    expect(attunementSlotsUsed(c)).toBe(0);
  });

  it('used count rises as attuned items are equipped (up to the cap)', () => {
    let c = attunedChar();
    expect(attunementSlotsUsed(c)).toBe(0);
    c = equipItem(c, 0); // sword (mainHand attuned)
    expect(attunementSlotsUsed(c)).toBe(1);
    c = equipItem(c, 1); // shield (offHand attuned)
    expect(attunementSlotsUsed(c)).toBe(2);
  });

  it('canEquip returns true for non-attuned items regardless of cap', () => {
    let c = attunedChar();
    c = equipItem(c, 0); // sword
    c = equipItem(c, 1); // shield → 2/2 attuned
    expect(canEquip(c, 'longsword')).toBe(true);
    expect(canEquip(c, 'leather-armor')).toBe(true);
  });

  it('canEquip blocks a third attuned item at the default cap', () => {
    let c = attunedChar();
    c = equipItem(c, 0); // sword
    c = equipItem(c, 1); // shield → 2/2 attuned
    expect(canEquip(c, 'test-attuned-armor')).toBe(false);
  });

  it('equipItem refuses to equip past the cap and returns the same identity', () => {
    let c = attunedChar();
    c = equipItem(c, 0);
    c = equipItem(c, 1);
    const before = c;
    const after = equipItem(c, 2); // try test-attuned-armor → would be 3rd
    expect(after).toBe(before);
    expect(after.equipped.armor).toBeNull();
  });

  it('replacing an attuned slot with another attuned item is allowed at the cap', () => {
    let c = attunedChar();
    c = equipItem(c, 0); // mainHand attuned sword
    c = equipItem(c, 1); // offHand attuned shield
    expect(attunementSlotsUsed(c)).toBe(2);
    // Swap the 1H sword for an attuned 2H — clears the offHand, net stays at 1.
    c = equipItem(c, 3);
    expect(c.equipped.mainHand?.itemId).toBe('test-attuned-2h');
    expect(c.equipped.offHand).toBeNull();
    expect(attunementSlotsUsed(c)).toBe(1);
  });

  it("Sage's Pact unblocks the third attuned slot", () => {
    let c: Character = { ...attunedChar(), attunementSlotsBonus: 1 };
    c = equipItem(c, 0); // sword
    c = equipItem(c, 1); // shield
    expect(canEquip(c, 'test-attuned-armor')).toBe(true);
    c = equipItem(c, 2); // armor → 3rd attuned
    expect(c.equipped.armor?.itemId).toBe('test-attuned-armor');
    expect(attunementSlotsUsed(c)).toBe(3);
    expect(attunementSlotsCap(c)).toBe(3);
  });

  it('unequipping an attuned item frees a slot', () => {
    let c = attunedChar();
    c = equipItem(c, 0);
    c = equipItem(c, 1);
    expect(attunementSlotsUsed(c)).toBe(2);
    c = unequipSlot(c, 'offHand');
    expect(attunementSlotsUsed(c)).toBe(1);
    // Now there's room again.
    expect(canEquip(c, 'test-attuned-armor')).toBe(true);
  });
});
