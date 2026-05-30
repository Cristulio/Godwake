import { describe, it, expect } from 'vitest';
import type { ItemRef } from '../../schemas/item';
import { buildPlayerCharacter, presetCreationInput } from '../character/defaultCharacter';
import { computeAC } from '../character/derived';
import { equipItem, slotForItem } from '../character/equip';
import { characterAffixMods } from './affixMods';

function rolledAccessory(baseId: string, affixId: string): ItemRef {
  return {
    itemId: baseId,
    rolled: { baseId, rarity: 'green', affixes: [affixId], name: `Test ${baseId}` },
  };
}

describe('accessory-slot affix application', () => {
  it('applies an accessory affix to AC through the new slots', () => {
    const base = buildPlayerCharacter(presetCreationInput('fighter'));
    const baseAC = computeAC(base);
    const withRing = {
      ...base,
      equipped: { ...base.equipped, ring1: rolledAccessory('iron-ring', 'warding') },
    };
    expect(characterAffixMods(withRing).acBonus).toBe(1);
    expect(computeAC(withRing)).toBe(baseAC + 1);
  });

  it('sums affixes across multiple accessory slots', () => {
    const base = buildPlayerCharacter(presetCreationInput('fighter'));
    const decked = {
      ...base,
      equipped: {
        ...base.equipped,
        ring1: rolledAccessory('iron-ring', 'warding'),
        amulet: rolledAccessory('jade-amulet', 'warding'),
        belt: rolledAccessory('worn-belt', 'vigorous'),
      },
    };
    const mods = characterAffixMods(decked);
    expect(mods.acBonus).toBe(2);
    expect(mods.tempHpPerCombat).toBe(6);
  });

  it('routes rings into the first free ring slot, then the second', () => {
    const base = buildPlayerCharacter(presetCreationInput('fighter'));
    expect(slotForItem('iron-ring')).toBe('ring1');
    const inv: ItemRef[] = [
      ...base.inventory,
      rolledAccessory('iron-ring', 'warding'),
      rolledAccessory('silver-ring', 'predators'),
    ];
    const c0 = { ...base, inventory: inv };
    const c1 = equipItem(c0, inv.length - 2);
    expect(c1.equipped.ring1?.itemId).toBe('iron-ring');
    const c2 = equipItem(c1, inv.length - 1);
    expect(c2.equipped.ring1?.itemId).toBe('iron-ring');
    expect(c2.equipped.ring2?.itemId).toBe('silver-ring');
  });
});
