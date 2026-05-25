import { describe, it, expect } from 'vitest';
import {
  createDiceRoller,
  createDiceRollerFromState,
  parseDiceExpression,
} from './dice';

describe('parseDiceExpression', () => {
  it('parses 1d20', () => {
    expect(parseDiceExpression('1d20')).toEqual({ count: 1, die: 20, modifier: 0 });
  });

  it('parses d20 without count', () => {
    expect(parseDiceExpression('d20')).toEqual({ count: 1, die: 20, modifier: 0 });
  });

  it('parses 2d6+3', () => {
    expect(parseDiceExpression('2d6+3')).toEqual({ count: 2, die: 6, modifier: 3 });
  });

  it('parses 3d8-2', () => {
    expect(parseDiceExpression('3d8-2')).toEqual({ count: 3, die: 8, modifier: -2 });
  });

  it('parses with spaces around modifier', () => {
    expect(parseDiceExpression('2d6 + 3')).toEqual({ count: 2, die: 6, modifier: 3 });
  });

  it('is case-insensitive', () => {
    expect(parseDiceExpression('1D20')).toEqual({ count: 1, die: 20, modifier: 0 });
  });

  it('rejects invalid expressions', () => {
    expect(() => parseDiceExpression('garbage')).toThrow();
    expect(() => parseDiceExpression('1d20+')).toThrow();
  });

  it('rejects unsupported die sizes', () => {
    expect(() => parseDiceExpression('1d7')).toThrow();
    expect(() => parseDiceExpression('1d11')).toThrow();
  });
});

describe('dice roller — bounds', () => {
  const roller = createDiceRoller(42);

  it('d20 rolls in [1, 20]', () => {
    for (let i = 0; i < 1000; i++) {
      const r = roller.d20();
      expect(r.rolls[0]).toBeGreaterThanOrEqual(1);
      expect(r.rolls[0]).toBeLessThanOrEqual(20);
    }
  });

  it('2d6+3 total is in [5, 15]', () => {
    for (let i = 0; i < 1000; i++) {
      const r = roller.roll('2d6+3');
      expect(r.total).toBeGreaterThanOrEqual(5);
      expect(r.total).toBeLessThanOrEqual(15);
    }
  });

  it('1d4 rolls in [1, 4]', () => {
    for (let i = 0; i < 200; i++) {
      const r = roller.roll('1d4');
      expect(r.rolls[0]).toBeGreaterThanOrEqual(1);
      expect(r.rolls[0]).toBeLessThanOrEqual(4);
    }
  });

  it('1d100 rolls in [1, 100]', () => {
    for (let i = 0; i < 200; i++) {
      const r = roller.roll('1d100');
      expect(r.rolls[0]).toBeGreaterThanOrEqual(1);
      expect(r.rolls[0]).toBeLessThanOrEqual(100);
    }
  });
});

describe('dice roller — determinism', () => {
  it('same seed gives same sequence', () => {
    const a = createDiceRoller(12345);
    const b = createDiceRoller(12345);
    for (let i = 0; i < 50; i++) {
      expect(a.d20().total).toBe(b.d20().total);
    }
  });

  it('different seeds give different sequences', () => {
    const a = createDiceRoller(12345);
    const b = createDiceRoller(67890);
    const aRolls = Array.from({ length: 20 }, () => a.d20().total);
    const bRolls = Array.from({ length: 20 }, () => b.d20().total);
    expect(aRolls).not.toEqual(bRolls);
  });

  it('string seeds are deterministic', () => {
    const a = createDiceRoller('godwake');
    const b = createDiceRoller('godwake');
    for (let i = 0; i < 50; i++) {
      expect(a.d20().total).toBe(b.d20().total);
    }
  });

  it('serialize and resume reproduces the same sequence', () => {
    const a = createDiceRoller(99);
    for (let i = 0; i < 10; i++) a.d20();
    const snapshot = a.serialize();
    const b = createDiceRollerFromState(snapshot);

    for (let i = 0; i < 20; i++) {
      expect(b.d20().total).toBe(a.d20().total);
    }
  });
});

describe('dice roller — advantage / disadvantage', () => {
  it('advantage on d20 picks the higher of two rolls', () => {
    const roller = createDiceRoller(1);
    const result = roller.d20('advantage');
    expect(result.advantage).toBe('advantage');
    expect(result.discardedRoll).toBeDefined();
    expect(result.rolls[0]).toBeGreaterThanOrEqual(result.discardedRoll!);
  });

  it('disadvantage on d20 picks the lower of two rolls', () => {
    const roller = createDiceRoller(7);
    const result = roller.d20('disadvantage');
    expect(result.advantage).toBe('disadvantage');
    expect(result.discardedRoll).toBeDefined();
    expect(result.rolls[0]).toBeLessThanOrEqual(result.discardedRoll!);
  });

  it('rejects advantage on non-d20', () => {
    const roller = createDiceRoller(1);
    expect(() => roller.roll('2d6', 'advantage')).toThrow();
  });

  it('rejects advantage on multi-d20', () => {
    const roller = createDiceRoller(1);
    expect(() => roller.roll('2d20', 'advantage')).toThrow();
  });
});

describe('dice roller — natural 1 and 20', () => {
  it('natural20 is true when rolling a 20', () => {
    // brute-force: with enough rolls we'll see a 20
    const roller = createDiceRoller(1);
    let foundNat20 = false;
    let foundNat1 = false;
    for (let i = 0; i < 1000 && (!foundNat20 || !foundNat1); i++) {
      const r = roller.d20();
      if (r.rolls[0] === 20) {
        expect(r.natural20).toBe(true);
        expect(r.natural1).toBe(false);
        foundNat20 = true;
      }
      if (r.rolls[0] === 1) {
        expect(r.natural1).toBe(true);
        expect(r.natural20).toBe(false);
        foundNat1 = true;
      }
    }
    expect(foundNat20).toBe(true);
    expect(foundNat1).toBe(true);
  });

  it('natural20/natural1 only applies to single d20 rolls', () => {
    const roller = createDiceRoller(1);
    const r = roller.roll('2d6');
    expect(r.natural20).toBe(false);
    expect(r.natural1).toBe(false);
  });
});

describe('dice roller — modifier math', () => {
  it('1d20+5 total is roll + 5', () => {
    const roller = createDiceRoller(123);
    for (let i = 0; i < 100; i++) {
      const r = roller.roll('1d20+5');
      expect(r.total).toBe(r.rolls[0] + 5);
    }
  });

  it('1d8-1 total is roll - 1', () => {
    const roller = createDiceRoller(123);
    for (let i = 0; i < 100; i++) {
      const r = roller.roll('1d8-1');
      expect(r.total).toBe(r.rolls[0] - 1);
    }
  });

  it('d20(advantage, modifier=5) applies the modifier', () => {
    const roller = createDiceRoller(123);
    const r = roller.d20('advantage', 5);
    expect(r.total).toBe(r.rolls[0] + 5);
    expect(r.modifier).toBe(5);
  });
});
