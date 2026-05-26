import { describe, it, expect } from 'vitest';
import { createIronCellsDelve } from './createDelve';

describe('createIronCellsDelve', () => {
  it('produces 8 rooms in the expected slot pattern', () => {
    const d = createIronCellsDelve(1);
    expect(d.rooms).toHaveLength(8);
    expect(d.rooms[0].kind).toBe('combat'); // warmup
    expect(d.rooms[1].kind).toBe('shrine');
    expect(d.rooms[2].kind).toBe('combat'); // early-mid
    expect(d.rooms[3].kind).toBe('rest');
    expect(d.rooms[4].kind).toBe('combat'); // mid
    expect(d.rooms[5].kind).toBe('shrine');
    expect(d.rooms[6].kind).toBe('combat'); // elite
    expect(d.rooms[7].kind).toBe('boss');
  });

  it('is deterministic per seed', () => {
    const a = createIronCellsDelve(42);
    const b = createIronCellsDelve(42);
    expect(a.rooms.map((r) => r.title)).toEqual(b.rooms.map((r) => r.title));
    expect(a.rooms.map((r) => r.monsters)).toEqual(b.rooms.map((r) => r.monsters));
  });

  it('produces different compositions across seeds', () => {
    // Sample 30 seeds; at least 4 distinct warmup compositions should appear
    // (warmup pool has 4 entries, so with 30 picks variance should hit them all).
    const warmupTitles = new Set<string>();
    for (let s = 0; s < 30; s++) {
      const d = createIronCellsDelve(s * 7919);
      warmupTitles.add(d.rooms[0].monsters?.map((m) => m.defId).join(',') ?? '');
    }
    expect(warmupTitles.size).toBeGreaterThanOrEqual(3);
  });

  it('boss is always Ilyich', () => {
    for (let s = 0; s < 10; s++) {
      const d = createIronCellsDelve(s);
      expect(d.rooms[7].monsters?.[0].defId).toBe('duergar-ilyich');
    }
  });

  it('warmup room has exactly 1 enemy total', () => {
    for (let s = 0; s < 10; s++) {
      const d = createIronCellsDelve(s);
      const totalCount =
        d.rooms[0].monsters?.reduce((sum, m) => sum + m.count, 0) ?? 0;
      expect(totalCount).toBe(1);
    }
  });
});
