import { describe, it, expect } from 'vitest';
import {
  findUpgrade,
  getUpgrade,
  listUpgrades,
} from './index';
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
  it('wayfarers-map exists, is cheap, and is a delveStart no-op marker', () => {
    const up = getUpgrade('wayfarers-map');
    expect(up.category).toBe('spirit');
    expect(up.kind).toBe('delveStart');
    expect(up.maxRank).toBe(2);
    // Cheap entry: a first-life soul can reach it after a few deaths.
    expect(up.costForRank(1)).toBe(35);
    expect(up.costForRank(1)).toBeLessThan(getUpgrade('mantle-of-the-wakened').costForRank(1));
  });

  it('wayfarers-map apply is a pure no-op — RoomHeader reads the rank directly', () => {
    const up = getUpgrade('wayfarers-map');
    expect(up.apply(BASE_CHAR, 2)).toBe(BASE_CHAR);
  });

  it("wayfarers-map effect text describes the road ahead, never the delve's depth", () => {
    const up = getUpgrade('wayfarers-map');
    expect(up.effectAtRank(1)).toMatch(/next turn of the road/i);
    expect(up.effectAtRank(2)).toMatch(/next 2 turns of the road/i);
    expect(up.effectAtRank(2)).not.toMatch(/\b\d+\s+rooms?\b/i);
  });

  it('pilgrims-step repriced as a cheap early on-ramp (rank 1 = 60, was 200)', () => {
    expect(getUpgrade('pilgrims-step').costForRank(1)).toBe(60);
  });

  it('wider-pantheon repriced as a cheap early on-ramp (rank 1 = 40, was 150)', () => {
    expect(getUpgrade('wider-pantheon').costForRank(1)).toBe(40);
  });
});
