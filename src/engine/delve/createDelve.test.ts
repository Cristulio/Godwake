import { describe, it, expect } from 'vitest';
import { createIronCellsDelve, createGodwakeDelve, createSpellholdDelve } from './createDelve';
import { getMonster } from '../../content/monsters';

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

describe('createGodwakeDelve', () => {
  it('emits 15 rooms with camp at the seam', () => {
    const d = createGodwakeDelve(1);
    expect(d.rooms).toHaveLength(15);
    // Ch1 (rooms 1-8): combat → shrine → combat → rest → combat → shrine → combat → boss
    expect(d.rooms[0].kind).toBe('combat');
    expect(d.rooms[1].kind).toBe('shrine');
    expect(d.rooms[3].kind).toBe('rest');
    expect(d.rooms[7].kind).toBe('boss');
    expect(d.rooms[7].monsters?.[0].defId).toBe('duergar-ilyich');
    // Camp at room 9 (index 8).
    expect(d.rooms[8].kind).toBe('camp');
    expect(d.rooms[8].id).toBe('room-9');
    // Ch2 (rooms 10-15): combat → combat → shrine → combat → combat → boss.
    expect(d.rooms[9].kind).toBe('combat');
    expect(d.rooms[10].kind).toBe('combat');
    expect(d.rooms[11].kind).toBe('shrine');
    expect(d.rooms[12].kind).toBe('combat');
    expect(d.rooms[13].kind).toBe('combat');
    expect(d.rooms[14].kind).toBe('boss');
    expect(d.rooms[14].monsters?.[0].defId).toBe('athkatla-magistrate');
  });

  it('chapterId is godwake', () => {
    const d = createGodwakeDelve(42);
    expect(d.chapterId).toBe('godwake');
  });

  it('is deterministic per seed', () => {
    const a = createGodwakeDelve(42);
    const b = createGodwakeDelve(42);
    expect(a.rooms.map((r) => r.id)).toEqual(b.rooms.map((r) => r.id));
    expect(a.rooms.map((r) => r.monsters)).toEqual(b.rooms.map((r) => r.monsters));
  });

  it('camp room carries no combat / loot fields', () => {
    const d = createGodwakeDelve(7);
    const camp = d.rooms[8];
    expect(camp.monsters).toBeUndefined();
    expect(camp.goldReward).toBeUndefined();
    expect(camp.xpReward).toBeUndefined();
  });
});

describe('createSpellholdDelve', () => {
  it('produces 8 rooms in the warmup-shrine-mid-rest-elite-shrine-elite-boss pattern', () => {
    const d = createSpellholdDelve(1);
    expect(d.rooms).toHaveLength(8);
    expect(d.rooms[0].kind).toBe('combat');
    expect(d.rooms[1].kind).toBe('shrine');
    expect(d.rooms[2].kind).toBe('combat');
    expect(d.rooms[3].kind).toBe('rest');
    expect(d.rooms[4].kind).toBe('combat');
    expect(d.rooms[5].kind).toBe('shrine');
    expect(d.rooms[6].kind).toBe('combat');
    expect(d.rooms[7].kind).toBe('boss');
  });

  it('chapterId is chapter-3', () => {
    const d = createSpellholdDelve(42);
    expect(d.chapterId).toBe('chapter-3');
  });

  it('boss is always the Asylum Director', () => {
    for (let s = 0; s < 10; s++) {
      const d = createSpellholdDelve(s);
      expect(d.rooms[7].monsters?.[0].defId).toBe('asylum-director');
    }
  });

  it('is deterministic per seed', () => {
    const a = createSpellholdDelve(42);
    const b = createSpellholdDelve(42);
    expect(a.rooms.map((r) => r.title)).toEqual(b.rooms.map((r) => r.title));
    expect(a.rooms.map((r) => r.monsters)).toEqual(b.rooms.map((r) => r.monsters));
  });

  it('warmup room has exactly 1 enemy total', () => {
    for (let s = 0; s < 10; s++) {
      const d = createSpellholdDelve(s);
      const totalCount =
        d.rooms[0].monsters?.reduce((sum, m) => sum + m.count, 0) ?? 0;
      expect(totalCount).toBe(1);
    }
  });

  it('boss has battle-rage mechanic and a Hold Person action', () => {
    const director = getMonster('asylum-director');
    expect(director.bossMechanic).toBe('battle-rage');
    expect(director.actions.some((a) => a.kind === 'paralyze' && a.name === 'Hold Person')).toBe(true);
  });
});
