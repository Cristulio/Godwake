import { describe, it, expect } from 'vitest';
import {
  POINT_BUY_FLOOR,
  POINT_BUY_CAP,
  pointBuyCost,
  totalCost,
  budgetForClass,
  pointsRemaining,
  raiseCost,
  canRaise,
  canLower,
  defaultScoresForClass,
} from './abilityPointBuy';
import { ABILITY_NAMES } from '../../types/abilities';
import type { ClassId } from '../../schemas/ids';

const CLASS_IDS: ClassId[] = ['fighter', 'rogue', 'wizard', 'cleric', 'barbarian'];

describe('pointBuyCost — cost curve', () => {
  it('floor 8 costs 0', () => {
    expect(pointBuyCost(8)).toBe(0);
  });

  it('is linear (1/step) from 8 up to 18', () => {
    expect(pointBuyCost(9)).toBe(1);
    expect(pointBuyCost(13)).toBe(5);
    expect(pointBuyCost(15)).toBe(7);
    expect(pointBuyCost(18)).toBe(10);
  });

  it('charges 2 per step above 18 (the surcharge)', () => {
    expect(pointBuyCost(19)).toBe(12);
    expect(pointBuyCost(20)).toBe(14);
  });
});

describe('raiseCost — surcharge threshold sits on 18', () => {
  it('costs 1 to raise below 18', () => {
    expect(raiseCost(8)).toBe(1);
    expect(raiseCost(17)).toBe(1);
  });

  it('costs 2 to raise 18→19 and 19→20', () => {
    expect(raiseCost(18)).toBe(2);
    expect(raiseCost(19)).toBe(2);
  });

  it('cannot raise at the cap', () => {
    expect(raiseCost(POINT_BUY_CAP)).toBe(Infinity);
    expect(canRaise(POINT_BUY_CAP, 999)).toBe(false);
  });
});

describe('floor and cap gates', () => {
  it('cannot lower at the floor', () => {
    expect(canLower(POINT_BUY_FLOOR)).toBe(false);
    expect(canLower(9)).toBe(true);
  });

  it('raise is gated by remaining points', () => {
    expect(canRaise(17, 1)).toBe(true);
    expect(canRaise(17, 0)).toBe(false);
    // Above 18 needs 2 points, so 1 remaining is not enough.
    expect(canRaise(18, 1)).toBe(false);
    expect(canRaise(18, 2)).toBe(true);
  });
});

describe('budget conservation', () => {
  for (const classId of CLASS_IDS) {
    it(`${classId}: auto-assigned array spends exactly the budget (0 remaining)`, () => {
      const scores = defaultScoresForClass(classId);
      const budget = budgetForClass(classId);
      expect(pointsRemaining(scores, budget)).toBe(0);
    });

    it(`${classId}: default array uses the (15,14,13,12,10,8) value multiset`, () => {
      const scores = defaultScoresForClass(classId);
      const values = ABILITY_NAMES.map((a) => scores[a]).sort((x, y) => y - x);
      expect(values).toEqual([15, 14, 13, 12, 10, 8]);
    });

    it(`${classId}: primary stat gets the highest value`, () => {
      const scores = defaultScoresForClass(classId);
      const max = Math.max(...ABILITY_NAMES.map((a) => scores[a]));
      expect(max).toBe(15);
    });
  }

  it('a balanced trade (lower one, raise another by equal cost) conserves the budget', () => {
    const scores = defaultScoresForClass('fighter');
    const budget = budgetForClass('fighter');
    // 15→14 frees 1, 10→11 spends 1: still fully allocated.
    const traded = { ...scores, str: scores.str - 1, int: scores.int + 1 };
    expect(pointsRemaining(traded, budget)).toBe(0);
  });

  it('totalCost of the all-floor array is 0', () => {
    const allFloor = ABILITY_NAMES.reduce(
      (acc, a) => ({ ...acc, [a]: POINT_BUY_FLOOR }),
      {} as Record<(typeof ABILITY_NAMES)[number], number>,
    );
    expect(totalCost(allFloor as never)).toBe(0);
  });
});
