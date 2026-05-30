import { describe, it, expect } from 'vitest';
import { createCharacter, STANDARD_ARRAY } from '../character/initialize';
import { computeAC, critRange } from '../character/derived';
import type { Character } from '../../types/character';
import type { ItemRef } from '../../schemas/item';
import { aggregateAffixMods, characterAffixMods, equippedAffixIds } from './affixMods';

function fighter(): Character {
  return createCharacter({
    id: 't',
    name: 'Brick',
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
  });
}

function rolled(itemId: string, affixes: string[]): ItemRef {
  return { itemId, rolled: { baseId: itemId, rarity: 'blue', affixes, name: `Rolled ${itemId}` } };
}

describe('aggregateAffixMods', () => {
  it('sums numeric channels and collects resists', () => {
    const mods = aggregateAffixMods(['cruel', 'honed', 'salamander', 'frostward']);
    expect(mods.damageBonus).toBe(2);
    expect(mods.attackBonus).toBe(1);
    expect(mods.resists).toEqual(expect.arrayContaining(['fire', 'cold']));
  });

  it('stacks the same channel across two affixes', () => {
    // Two damage affixes sum (gear is a deliberate, slot-limited choice).
    const mods = aggregateAffixMods(['cruel', 'cruel']);
    expect(mods.damageBonus).toBe(4);
  });

  it('ignores unknown affix ids', () => {
    expect(aggregateAffixMods(['nope']).damageBonus).toBe(0);
  });
});

describe('equippedAffixIds', () => {
  it('collects affixes across all equipped slots', () => {
    const c: Character = {
      ...fighter(),
      equipped: {
        mainHand: rolled('longsword', ['cruel']),
        offHand: null,
        armor: rolled('chain-mail', ['warded']),
      },
    };
    expect(equippedAffixIds(c).sort()).toEqual(['cruel', 'warded']);
  });
});

describe('affix application in derived stats', () => {
  it('a Warded armour affix raises AC by 1', () => {
    const base = fighter();
    const baseAC = computeAC({
      ...base,
      equipped: { mainHand: null, offHand: null, armor: { itemId: 'chain-mail' } },
    });
    const warded = computeAC({
      ...base,
      equipped: { mainHand: null, offHand: null, armor: rolled('chain-mail', ['warded']) },
    });
    expect(warded).toBe(baseAC + 1);
  });

  it('a Keen weapon affix widens the crit range to 19-20', () => {
    const base = fighter();
    expect(critRange(base)).toEqual([20]);
    const keen: Character = {
      ...base,
      equipped: { mainHand: rolled('longsword', ['keen']), offHand: null, armor: null },
    };
    expect(critRange(keen)).toEqual([19, 20]);
    expect(characterAffixMods(keen).critRangeBonus).toBe(1);
  });
});
