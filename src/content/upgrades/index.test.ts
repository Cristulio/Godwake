import { describe, it, expect } from 'vitest';
import {
  findUpgrade,
  getUpgrade,
  groveUpgradeCost,
  listUpgrades,
} from './index';
import { MAX_ASCENSION } from '../../engine/delve/ascension';
import { createCharacter, STANDARD_ARRAY } from '../../engine/character/initialize';

const BASE_CHAR = createCharacter({
  id: 'test-economy',
  name: 'Tester',
  raceId: 'human',
  classId: 'fighter',
  baseAbilityScores: {
    str: STANDARD_ARRAY[0],
    dex: STANDARD_ARRAY[2],
    con: STANDARD_ARRAY[1],
    int: STANDARD_ARRAY[5],
    wis: STANDARD_ARRAY[3],
    cha: STANDARD_ARRAY[4],
  },
  skillProficiencies: ['athletics', 'perception'],
});

describe('groveUpgradeCost — ascension price scaling', () => {
  const up = getUpgrade('mantle-of-the-wakened');

  it('equals the base curve at Ascension 0', () => {
    expect(groveUpgradeCost(up, 1, 0)).toBe(up.costForRank(1));
    expect(groveUpgradeCost(up, 3, 0)).toBe(up.costForRank(3));
  });

  it('costs strictly more as ascension standing climbs', () => {
    for (let i = 1; i <= MAX_ASCENSION; i++) {
      expect(groveUpgradeCost(up, 2, i)).toBeGreaterThan(groveUpgradeCost(up, 2, i - 1));
    }
  });
});

describe('upgrade catalog — economy tuning', () => {
  it('pinchpurse-insurance has been removed (consolidated into coin-in-pocket)', () => {
    expect(findUpgrade('pinchpurse-insurance')).toBeUndefined();
    expect(listUpgrades().some((u) => u.id === 'pinchpurse-insurance')).toBe(false);
  });

  it('coin-in-pocket r1 grants +25 starting gold AND +5 chapter-clear gold', () => {
    const up = getUpgrade('coin-in-pocket');
    expect(up.kind).toBe('permanent');
    const applied = up.apply(BASE_CHAR, 1);
    expect(applied.permanentBonuses?.startingGold ?? 0).toBe(25);
    expect(applied.permanentBonuses?.chapterClearGold ?? 0).toBe(5);
  });

  it("coin-in-pocket's effect text describes both halves of the new dual effect", () => {
    const txt = getUpgrade('coin-in-pocket').effectAtRank(3);
    expect(txt).toContain('75'); // 25 * 3 starting gold
    expect(txt).toContain('15'); // 5 * 3 per chapter cleared
  });

  it('arcane-focus rank 1 cost is 100 (was 140)', () => {
    expect(getUpgrade('arcane-focus').costForRank(1)).toBe(100);
  });

  it('burning-tongue rank 1 cost is 140 (was 100)', () => {
    expect(getUpgrade('burning-tongue').costForRank(1)).toBe(140);
  });
});

describe('cheap Grove on-ramps — early traction that opens the game', () => {
  it('wayfarers-map has been removed (branching map made the reveal redundant)', () => {
    expect(findUpgrade('wayfarers-map')).toBeUndefined();
    expect(listUpgrades().some((u) => u.id === 'wayfarers-map')).toBe(false);
  });

  it('pilgrims-step repriced as a cheap early on-ramp (rank 1 = 60, was 200)', () => {
    expect(getUpgrade('pilgrims-step').costForRank(1)).toBe(60);
  });

  it('wider-pantheon repriced as a cheap early on-ramp (rank 1 = 40, was 150)', () => {
    expect(getUpgrade('wider-pantheon').costForRank(1)).toBe(40);
  });
});
