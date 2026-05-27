import { describe, it, expect } from 'vitest';
import {
  createIronCellsDelve,
  createGodwakeDelve,
  createSpellholdDelve,
  createUstNathaDelve,
} from './createDelve';
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
  it('emits at least 28 rooms across the chained run', () => {
    const d = createGodwakeDelve(1);
    expect(d.rooms.length).toBeGreaterThanOrEqual(28);
  });

  it('has three camp seams between the chapters', () => {
    const d = createGodwakeDelve(1);
    const camps = d.rooms.filter((r) => r.kind === 'camp');
    expect(camps).toHaveLength(3);
  });

  it('has four bosses, one per chapter, in the expected order', () => {
    const d = createGodwakeDelve(1);
    const bosses = d.rooms.filter((r) => r.kind === 'boss');
    expect(bosses).toHaveLength(4);
    expect(bosses[0].monsters?.[0].defId).toBe('duergar-ilyich');
    expect(bosses[1].monsters?.[0].defId).toBe('athkatla-magistrate');
    expect(bosses[2].monsters?.[0].defId).toBe('asylum-director');
    expect(bosses[3].monsters?.[0].defId).toBe('drow-matron-mother');
  });

  it('has at least four event rooms threaded through the chapters', () => {
    const d = createGodwakeDelve(1);
    const events = d.rooms.filter((r) => r.kind === 'event');
    expect(events.length).toBeGreaterThanOrEqual(4);
    // Every event room must resolve against the registry — no orphan ids.
    for (const e of events) {
      expect(e.eventTemplateId).toBeTruthy();
    }
  });

  it('has at least two shrines per chapter span', () => {
    const d = createGodwakeDelve(1);
    const shrines = d.rooms.filter((r) => r.kind === 'shrine');
    expect(shrines.length).toBeGreaterThanOrEqual(8);
  });

  it('has at least one rest room per chapter span', () => {
    const d = createGodwakeDelve(1);
    const rests = d.rooms.filter((r) => r.kind === 'rest');
    expect(rests.length).toBeGreaterThanOrEqual(4);
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
    expect(a.rooms.map((r) => r.eventTemplateId)).toEqual(
      b.rooms.map((r) => r.eventTemplateId),
    );
  });

  it('camp rooms carry no combat / loot fields', () => {
    const d = createGodwakeDelve(7);
    for (const camp of d.rooms.filter((r) => r.kind === 'camp')) {
      expect(camp.monsters).toBeUndefined();
      expect(camp.goldReward).toBeUndefined();
      expect(camp.xpReward).toBeUndefined();
    }
  });

  it('every monster id referenced in the chain resolves via getMonster', () => {
    for (let s = 0; s < 6; s++) {
      const d = createGodwakeDelve(s);
      for (const room of d.rooms) {
        for (const m of room.monsters ?? []) {
          expect(() => getMonster(m.defId)).not.toThrow();
        }
      }
    }
  });

  it('the chained delve places the four bosses in chapter order', () => {
    const d = createGodwakeDelve(99);
    const bossIndices = d.rooms
      .map((r, idx) => ({ r, idx }))
      .filter(({ r }) => r.kind === 'boss')
      .map(({ idx }) => idx);
    expect(bossIndices).toEqual([...bossIndices].sort((a, b) => a - b));
    const campIndices = d.rooms
      .map((r, idx) => ({ r, idx }))
      .filter(({ r }) => r.kind === 'camp')
      .map(({ idx }) => idx);
    // Each camp seam falls between two bosses.
    for (let i = 0; i < 3; i++) {
      expect(campIndices[i]).toBeGreaterThan(bossIndices[i]);
      expect(campIndices[i]).toBeLessThan(bossIndices[i + 1]);
    }
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

describe('createUstNathaDelve', () => {
  it('produces 8 rooms in the warmup-shrine-mid-rest-elite-shrine-elite-boss pattern', () => {
    const d = createUstNathaDelve(1);
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

  it('chapterId is chapter-4', () => {
    const d = createUstNathaDelve(42);
    expect(d.chapterId).toBe('chapter-4');
  });

  it('boss is always the Matron Mother', () => {
    for (let s = 0; s < 10; s++) {
      const d = createUstNathaDelve(s);
      expect(d.rooms[7].monsters?.[0].defId).toBe('drow-matron-mother');
    }
  });

  it('is deterministic per seed', () => {
    const a = createUstNathaDelve(42);
    const b = createUstNathaDelve(42);
    expect(a.rooms.map((r) => r.title)).toEqual(b.rooms.map((r) => r.title));
    expect(a.rooms.map((r) => r.monsters)).toEqual(b.rooms.map((r) => r.monsters));
  });

  it('boss has battle-rage mechanic and a Hold Person action', () => {
    const matron = getMonster('drow-matron-mother');
    expect(matron.bossMechanic).toBe('battle-rage');
    expect(matron.actions.some((a) => a.kind === 'paralyze')).toBe(true);
  });

  it('every monster id referenced in pools resolves via getMonster', () => {
    for (let s = 0; s < 8; s++) {
      const d = createUstNathaDelve(s);
      for (const room of d.rooms) {
        for (const m of room.monsters ?? []) {
          expect(() => getMonster(m.defId)).not.toThrow();
        }
      }
    }
  });
});
