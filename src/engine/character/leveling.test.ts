import { describe, it, expect } from 'vitest';
import { applyLevelUp, hasPendingLevelUp, xpForLevel } from './leveling';
import { createCharacter, STANDARD_ARRAY } from './initialize';

const SIR_BRICK = createCharacter({
  id: 'test-sir-brick',
  name: 'Sir Brick',
  raceId: 'human',
  classId: 'fighter',
  baseAbilityScores: {
    str: STANDARD_ARRAY[0], // 15
    dex: STANDARD_ARRAY[2], // 13
    con: STANDARD_ARRAY[1], // 14
    int: STANDARD_ARRAY[5], // 8
    wis: STANDARD_ARRAY[3], // 12
    cha: STANDARD_ARRAY[4], // 10
  },
  skillProficiencies: ['athletics', 'perception'],
});

describe('xpForLevel', () => {
  it('returns 0 for level 1', () => {
    expect(xpForLevel(1)).toBe(0);
  });
  it('matches routed-play thresholds for levels 2-5 (cliff flattened so a route reaches the expected level)', () => {
    expect(xpForLevel(2)).toBe(250);
    expect(xpForLevel(3)).toBe(550);
    expect(xpForLevel(4)).toBe(1100);
    expect(xpForLevel(5)).toBe(2200);
  });
  it('uses routed-play thresholds for levels 6-8', () => {
    expect(xpForLevel(6)).toBe(4000);
    expect(xpForLevel(7)).toBe(6200);
    expect(xpForLevel(8)).toBe(9000);
  });
});

describe('hasPendingLevelUp', () => {
  it('false when below next-level threshold', () => {
    expect(hasPendingLevelUp({ ...SIR_BRICK, xp: 100 })).toBe(false);
  });
  it('true at or above next-level threshold', () => {
    expect(hasPendingLevelUp({ ...SIR_BRICK, xp: 300 })).toBe(true);
  });
  it('false once level cap reached', () => {
    expect(hasPendingLevelUp({ ...SIR_BRICK, level: 8, xp: 99999 })).toBe(false);
  });
});

describe('applyLevelUp', () => {
  it('advances level by 1, adds avg fighter HP + CON mod', () => {
    // CON 14 + human +1 = 15 → +2 mod; avg(d10) = 6; +2 = 8 HP
    const next = applyLevelUp({ ...SIR_BRICK, xp: 300 });
    expect(next.level).toBe(2);
    expect(next.hp.max).toBe(SIR_BRICK.hp.max + 8);
    expect(next.hp.current).toBe(SIR_BRICK.hp.current + 8);
  });

  it('grants Action Surge charge at level 2', () => {
    expect(SIR_BRICK.resources.actionSurgeRemaining).toBe(0);
    const next = applyLevelUp({ ...SIR_BRICK, xp: 300 });
    expect(next.resources.actionSurgeRemaining).toBe(1);
  });

  it('auto-picks Champion subclass at level 2', () => {
    const l2 = applyLevelUp({ ...SIR_BRICK, xp: 300 });
    expect(l2.subclassId).toBe('champion');
  });

  it('bumps hit dice in lockstep with level', () => {
    const l2 = applyLevelUp({ ...SIR_BRICK, xp: 300 });
    expect(l2.hitDice.max).toBe(SIR_BRICK.hitDice.max + 1);
  });

  it('ASI override at L4 boosts ability scores', () => {
    let c = applyLevelUp({ ...SIR_BRICK, xp: 300 });
    c = applyLevelUp({ ...c, xp: 900 });
    const l4 = applyLevelUp({
      ...c,
      xp: 2700,
      baseAbilityScores: { ...c.baseAbilityScores, str: c.baseAbilityScores.str + 2 },
    });
    expect(l4.baseAbilityScores.str).toBe(SIR_BRICK.baseAbilityScores.str + 2);
  });
});
