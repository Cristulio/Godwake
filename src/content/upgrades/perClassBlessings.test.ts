import { describe, it, expect } from 'vitest';
import { getUpgrade, listClassUpgrades } from './index';
import { createCharacter, STANDARD_ARRAY } from '../../engine/character/initialize';
import { martialPoolMax } from '../../engine/combat/martialResource';
import { bardInspirationMax } from '../../engine/combat/bard';
import { layOnHandsMax } from '../../engine/combat/paladin';
import type { ClassId } from '../../schemas/ids';
import type { Character } from '../../types/character';

function char(classId: ClassId, subclassId: string | null = null): Character {
  const c = createCharacter({
    id: `t-${classId}`,
    name: 'T',
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
    skillProficiencies: ['athletics', 'perception'],
  });
  return { ...c, level: 5, subclassId };
}

describe('per-class renown blessings — every playable class has a meaningful spread', () => {
  const PLAYABLE: ClassId[] = [
    'fighter',
    'barbarian',
    'rogue',
    'ranger',
    'wizard',
    'bard',
    'druid',
    'monk',
    'paladin',
  ];

  it('every class carries at least 3 class-gated Grove nodes', () => {
    for (const classId of PLAYABLE) {
      const nodes = listClassUpgrades(classId);
      expect(nodes.length, `${classId} class nodes`).toBeGreaterThanOrEqual(3);
    }
  });

  it('class-gated nodes are inert for the wrong class (apply is a no-op)', () => {
    const wizard = char('wizard');
    const before = JSON.stringify(wizard);
    // A fighter node applied to a wizard must change nothing.
    const after = getUpgrade('tempered-edge').apply(wizard, 1);
    expect(JSON.stringify(after)).toBe(before);
  });
});

describe('new folded levers reach their per-fight max functions', () => {
  it('Tactician’s Reserve deepens the martial Resolve pool', () => {
    const base = char('fighter');
    expect(martialPoolMax(base)).toBe(3);
    const r2 = getUpgrade('tactician-reserve').apply(
      getUpgrade('tactician-reserve').apply(base, 1),
      2,
    );
    expect(r2.permanentBonuses?.martialPool).toBe(2);
    expect(martialPoolMax(r2)).toBe(5);
  });

  it('Wellspring Refrain deepens the Bardic Inspiration pool', () => {
    const base = char('bard');
    const baseMax = bardInspirationMax(base);
    const r2 = getUpgrade('wellspring-refrain').apply(
      getUpgrade('wellspring-refrain').apply(base, 1),
      2,
    );
    expect(r2.permanentBonuses?.inspirationDice).toBe(2);
    expect(bardInspirationMax(r2)).toBe(baseMax + 2);
  });

  it('Deepwell Mercy deepens the Lay on Hands well', () => {
    const base = char('paladin');
    const baseMax = layOnHandsMax(base);
    const r1 = getUpgrade('deepwell-mercy').apply(base, 1);
    expect(r1.permanentBonuses?.layOnHands).toBe(4);
    expect(layOnHandsMax(r1)).toBe(baseMax + 4);
  });
});
