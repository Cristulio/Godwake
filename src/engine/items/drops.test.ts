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
  const RARITY_RANK: Record<string, number> = { white: 0, green: 1, blue: 2, purple: 3 };

  /** Mean rarity rank (white 0 … purple 3) over the items that actually dropped. */
  function meanRarity(roomKind: string, chapter: number, n = 800): number {
    let sum = 0;
    let count = 0;
    for (let i = 0; i < n; i++) {
      const r = rollGearDrop(createDiceRoller(`${roomKind}-${chapter}-${i}`), roomKind, chapter);
      if (r) {
        sum += RARITY_RANK[r];
        count += 1;
      }
    }
    return count ? sum / count : 0;
  }

  it('never drops from a non-combat room', () => {
    for (let i = 0; i < 20; i++) {
      expect(rollGearDrop(createDiceRoller(`r-${i}`), 'rest', 6)).toBeNull();
    }
  });

  it('only ever yields valid rarities (white→purple) — white is droppable now', () => {
    const valid = new Set([null, 'white', 'green', 'blue', 'purple']);
    for (const chapter of [1, 6, 12]) {
      for (let i = 0; i < 100; i++) {
        const r = rollGearDrop(createDiceRoller(`d-${chapter}-${i}`), 'boss', chapter);
        expect(valid.has(r as never)).toBe(true);
      }
    }
  });

  it('drops more often from a boss than from a mob', () => {
    let mob = 0;
    let boss = 0;
    for (let i = 0; i < 400; i++) {
      if (rollGearDrop(createDiceRoller(`m-${i}`), 'combat', 6)) mob++;
      if (rollGearDrop(createDiceRoller(`b-${i}`), 'boss', 6)) boss++;
    }
    expect(boss).toBeGreaterThan(mob);
  });

  it('scales drop rarity with chapter — a deep mob drop is no longer chapter-blind (rule 4)', () => {
    // The old flat green-heavy mix dropped the same spread at Ch1 and Ch14; now a
    // Ch1 mob skews white/green (rank < 1) and a Ch12 mob skews blue/purple (> 1.5).
    expect(meanRarity('combat', 1)).toBeLessThan(1.0);
    expect(meanRarity('combat', 12)).toBeGreaterThan(1.5);
    expect(meanRarity('combat', 12)).toBeGreaterThan(meanRarity('combat', 1));
  });

  it('a richer source skews richer at the same chapter (combat < elite < boss)', () => {
    // Ch3: bands don't clamp together, so the chain is strict.
    expect(meanRarity('elite', 3)).toBeGreaterThan(meanRarity('combat', 3));
    expect(meanRarity('boss', 3)).toBeGreaterThan(meanRarity('elite', 3));
  });
});
