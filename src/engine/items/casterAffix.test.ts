import { describe, it, expect } from 'vitest';
import { createCharacter, STANDARD_ARRAY } from '../character/initialize';
import { wizardSpellSlots } from '../character/actions';
import { spellSaveDC, spellDamageBonus, spellAttackBonus } from '../combat/spells/helpers';
import { characterAffixMods } from './affixMods';
import type { Character } from '../../types/character';
import type { ItemRef } from '../../schemas/item';

function wizard(): Character {
  return createCharacter({
    id: 'w',
    name: 'Edwin',
    raceId: 'human',
    classId: 'wizard',
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

function withRing(base: Character, affixId: string): Character {
  const ref: ItemRef = {
    itemId: 'iron-ring',
    rolled: { baseId: 'iron-ring', rarity: 'green', affixes: [affixId], name: `Test ${affixId}` },
  };
  return { ...base, equipped: { ...base.equipped, ring1: ref } };
}

describe('caster affixes', () => {
  it('Arcane raises the spell save DC by 1', () => {
    const base = wizard();
    expect(spellSaveDC(withRing(base, 'arcane'))).toBe(spellSaveDC(base) + 1);
    expect(characterAffixMods(withRing(base, 'arcane')).spellDcBonus).toBe(1);
  });

  it('of the Archmage adds +2 spell damage', () => {
    const base = wizard();
    expect(spellDamageBonus(withRing(base, 'archmage'))).toBe(spellDamageBonus(base) + 2);
  });

  it('of Lucidity adds +1 to spell attack rolls', () => {
    const base = wizard();
    expect(spellAttackBonus(withRing(base, 'lucid'))).toBe(spellAttackBonus(base) + 1);
  });

  it('Runic grants +1 level-1 spell slot on refill', () => {
    const base = wizard();
    const plainSlots = wizardSpellSlots(base);
    const runicSlots = wizardSpellSlots(withRing(base, 'runic'));
    expect(runicSlots[1]).toBe((plainSlots[1] ?? 0) + 1);
    // Higher tiers are untouched.
    expect(runicSlots[2]).toBe(plainSlots[2]);
  });

  it('caster affix channels sum across two slots', () => {
    const base = wizard();
    const ref = (id: string): ItemRef => ({
      itemId: 'jade-amulet',
      rolled: { baseId: 'jade-amulet', rarity: 'green', affixes: [id], name: id },
    });
    const decked: Character = {
      ...base,
      equipped: {
        ...base.equipped,
        ring1: { itemId: 'iron-ring', rolled: { baseId: 'iron-ring', rarity: 'green', affixes: ['arcane'], name: 'a' } },
        amulet: ref('arcane'),
      },
    };
    expect(characterAffixMods(decked).spellDcBonus).toBe(2);
    expect(spellSaveDC(decked)).toBe(spellSaveDC(base) + 2);
  });
});
