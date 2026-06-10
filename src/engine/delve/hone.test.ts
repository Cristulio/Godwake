import { describe, it, expect } from 'vitest';
import {
  honeItem,
  canHoneSlot,
  slotTakesEnhancement,
  honeableSlots,
  hasHoneableItem,
  MAX_ENHANCEMENT,
  MAX_HONE_PER_ITEM,
} from './hone';
import { enhancementOf } from '../items/affixMods';
import { computeAC } from '../character/derived';
import { createCharacter, STANDARD_ARRAY } from '../character/initialize';
import { setPieceRef } from '../items/setGear';
import { getSetPiece, SET_PIECE_ORDER } from '../../content/sets';
import type { Character } from '../../types/character';
import type { ItemRef } from '../../schemas/item';

function baseFighter(): Character {
  return createCharacter({
    id: 'hone-fighter',
    name: 'Edge',
    raceId: 'human',
    classId: 'fighter',
    baseAbilityScores: {
      str: STANDARD_ARRAY[0],
      dex: STANDARD_ARRAY[1],
      con: STANDARD_ARRAY[2],
      int: STANDARD_ARRAY[5],
      wis: STANDARD_ARRAY[4],
      cha: STANDARD_ARRAY[3],
    },
    skillProficiencies: ['athletics', 'intimidation'],
  });
}

/** A fighter wielding the given equipped refs (also seeded into the bag, shared identity). */
function fighterWith(equipped: Partial<Character['equipped']>): Character {
  const base = baseFighter();
  const refs = Object.values(equipped).filter((r): r is ItemRef => r != null);
  return {
    ...base,
    equipped: { ...base.equipped, ...equipped },
    inventory: [...refs],
  };
}

function rolledWeapon(enhancement: number, honedThisRun?: number): ItemRef {
  return {
    itemId: 'longsword',
    rolled: {
      baseId: 'longsword',
      rarity: 'blue',
      affixes: [],
      enhancement,
      ...(honedThisRun !== undefined ? { honedThisRun } : {}),
      name: `+${enhancement} Longsword`,
    },
  };
}

describe('honeItem — raises the rolled enhancement the combat path reads', () => {
  it('weapon +1 lands and is read by enhancementOf (attack/damage axis)', () => {
    const char = fighterWith({ mainHand: rolledWeapon(1) });
    const after = honeItem(char, 'mainHand');
    expect(enhancementOf(after.equipped.mainHand)).toBe(2);
    expect(after.equipped.mainHand!.rolled!.honedThisRun).toBe(1);
  });

  it('a plain base (no rolled) becomes a +1 white item', () => {
    const char = fighterWith({ mainHand: { itemId: 'longsword' } });
    const after = honeItem(char, 'mainHand');
    expect(enhancementOf(after.equipped.mainHand)).toBe(1);
    expect(after.equipped.mainHand!.rolled!.rarity).toBe('white');
    expect(after.equipped.mainHand!.rolled!.honedThisRun).toBe(1);
  });

  it('armour +1 lands and is read by computeAC', () => {
    const char = fighterWith({
      armor: {
        itemId: 'chain-mail',
        rolled: { baseId: 'chain-mail', rarity: 'green', affixes: [], enhancement: 0, name: 'Chain Mail' },
      },
    });
    const before = computeAC(char);
    const after = honeItem(char, 'armor');
    expect(computeAC(after)).toBe(before + 1);
  });

  it('is immutable — the input character and ref are untouched', () => {
    const ref = rolledWeapon(1);
    const char = fighterWith({ mainHand: ref });
    honeItem(char, 'mainHand');
    expect(ref.rolled!.enhancement).toBe(1);
    expect(char.equipped.mainHand!.rolled!.enhancement).toBe(1);
  });

  it('keeps the worn slot and its backpack entry pointing at the same honed ref (shared identity)', () => {
    const ref = rolledWeapon(0);
    const char = fighterWith({ mainHand: ref });
    const after = honeItem(char, 'mainHand');
    const invEntry = after.inventory.find((r) => r.itemId === 'longsword');
    expect(invEntry).toBe(after.equipped.mainHand);
    expect(enhancementOf(invEntry)).toBe(1);
  });

  it('syncs the bag entry even when slot and bag are separate literals (starting-kit case)', () => {
    const base = baseFighter();
    const char: Character = {
      ...base,
      equipped: { ...base.equipped, mainHand: { itemId: 'longsword' } },
      inventory: [{ itemId: 'longsword' }], // distinct object, same id
    };
    const after = honeItem(char, 'mainHand');
    expect(enhancementOf(after.inventory[0])).toBe(1);
    expect(after.inventory[0]).toBe(after.equipped.mainHand);
  });
});

describe('honeItem — caps', () => {
  it('never exceeds +2 over the rolled baseline (MAX_HONE_PER_ITEM)', () => {
    let char = fighterWith({ mainHand: rolledWeapon(1) });
    char = honeItem(char, 'mainHand'); // +2, honed 1
    char = honeItem(char, 'mainHand'); // +3, honed 2
    expect(enhancementOf(char.equipped.mainHand)).toBe(1 + MAX_HONE_PER_ITEM);
    expect(canHoneSlot(char, 'mainHand')).toBe(false);
    const blocked = honeItem(char, 'mainHand'); // no-op
    expect(blocked).toBe(char);
    expect(enhancementOf(blocked.equipped.mainHand)).toBe(3);
  });

  it('never exceeds the game max enhancement, even on the first hone', () => {
    const char = fighterWith({ mainHand: rolledWeapon(MAX_ENHANCEMENT - 1) });
    const after = honeItem(char, 'mainHand'); // → MAX, honed 1
    expect(enhancementOf(after.equipped.mainHand)).toBe(MAX_ENHANCEMENT);
    expect(canHoneSlot(after, 'mainHand')).toBe(false);
    expect(honeItem(after, 'mainHand')).toBe(after);
  });

  it('an already-maxed item cannot be honed at all', () => {
    const char = fighterWith({ mainHand: rolledWeapon(MAX_ENHANCEMENT) });
    expect(canHoneSlot(char, 'mainHand')).toBe(false);
    expect(honeItem(char, 'mainHand')).toBe(char);
  });
});

describe('honeable slots — only the engine-read +N axes', () => {
  it('weapon, body armour, and shield are honeable; orb / robe / accessory are not', () => {
    const char = fighterWith({
      mainHand: { itemId: 'longsword' },
      armor: { itemId: 'leather-armor' },
      offHand: { itemId: 'shield' },
    });
    expect(slotTakesEnhancement(char, 'mainHand')).toBe(true);
    expect(slotTakesEnhancement(char, 'armor')).toBe(true);
    expect(slotTakesEnhancement(char, 'offHand')).toBe(true);

    const orbChar = fighterWith({ offHand: { itemId: 'crystal-orb' }, armor: { itemId: 'apprentice-robe' } });
    expect(slotTakesEnhancement(orbChar, 'offHand')).toBe(false);
    expect(slotTakesEnhancement(orbChar, 'armor')).toBe(false);
  });

  it('honeableSlots lists exactly the read axes; hasHoneableItem reflects cap', () => {
    const char = fighterWith({
      mainHand: rolledWeapon(MAX_ENHANCEMENT),
      armor: { itemId: 'leather-armor' },
    });
    expect(honeableSlots(char).sort()).toEqual(['armor', 'mainHand']);
    // mainHand is maxed but armour can still be honed
    expect(hasHoneableItem(char)).toBe(true);
    expect(canHoneSlot(char, 'mainHand')).toBe(false);
    expect(canHoneSlot(char, 'armor')).toBe(true);
  });
});

describe('honeItem — set-piece banking is untouched', () => {
  it('honing an equipped set piece never mutates the banked materialisation', () => {
    const pieceId = SET_PIECE_ORDER[0];
    const piece = getSetPiece(pieceId)!;
    const equippedPiece = setPieceRef(piece);
    const originalEnhancement = equippedPiece.rolled!.enhancement;
    const char = fighterWith({ armor: equippedPiece });

    honeItem(char, 'armor');

    // The bank holds string ids and re-materialises fresh each descent — a new
    // setPieceRef from the same definition still carries the rolled enhancement.
    const fresh = setPieceRef(piece);
    expect(fresh.rolled!.enhancement).toBe(originalEnhancement);
    expect(fresh.rolled!.honedThisRun).toBeUndefined();
    // And the input ref itself was not mutated.
    expect(equippedPiece.rolled!.enhancement).toBe(originalEnhancement);
  });
});
