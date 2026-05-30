import { describe, it, expect } from 'vitest';
import { createDiceRoller } from '../dice';
import { dropSourceForRoom, rollGearDrop } from './drops';

describe('dropSourceForRoom', () => {
  it('maps combat room kinds and ignores the rest', () => {
    expect(dropSourceForRoom('combat')).toBe('combat');
    expect(dropSourceForRoom('elite')).toBe('elite');
    expect(dropSourceForRoom('boss')).toBe('boss');
    expect(dropSourceForRoom('rest')).toBeNull();
    expect(dropSourceForRoom('shop')).toBeNull();
    expect(dropSourceForRoom('event')).toBeNull();
  });
});

describe('rollGearDrop', () => {
  it('never drops from a non-combat room', () => {
    for (let i = 0; i < 20; i++) {
      expect(rollGearDrop(createDiceRoller(`r-${i}`), 'rest')).toBeNull();
    }
  });

  it('only ever yields green/blue/purple rarities', () => {
    const valid = new Set([null, 'green', 'blue', 'purple']);
    for (let i = 0; i < 100; i++) {
      const r = rollGearDrop(createDiceRoller(`d-${i}`), 'boss');
      expect(valid.has(r as never)).toBe(true);
    }
  });

  it('drops more often from a boss than from a mob', () => {
    let mob = 0;
    let boss = 0;
    for (let i = 0; i < 400; i++) {
      if (rollGearDrop(createDiceRoller(`m-${i}`), 'combat')) mob++;
      if (rollGearDrop(createDiceRoller(`b-${i}`), 'boss')) boss++;
    }
    expect(boss).toBeGreaterThan(mob);
  });
});
