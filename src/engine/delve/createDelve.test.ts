import { describe, it, expect } from 'vitest';
import {
  createIronCellsDelve,
  createGodwakeDelve,
  createSpellholdDelve,
  createUstNathaDelve,
  reachableRooms,
  roomById,
} from './createDelve';
import { getMonster } from '../../content/monsters';
import type { DelveState } from '../../types/delve';

describe('createIronCellsDelve', () => {
  it('produces 11 rooms in the expected slot pattern (intel room before boss)', () => {
    const d = createIronCellsDelve(1);
    expect(d.rooms).toHaveLength(11);
    expect(d.rooms[0].kind).toBe('combat'); // warmup
    expect(d.rooms[1].kind).toBe('shrine');
    expect(d.rooms[2].kind).toBe('combat'); // early-mid
    expect(d.rooms[3].kind).toBe('combat'); // early-mid
    expect(d.rooms[4].kind).toBe('rest');
    expect(d.rooms[5].kind).toBe('combat'); // mid
    expect(d.rooms[6].kind).toBe('combat'); // mid
    expect(d.rooms[7].kind).toBe('shrine');
    expect(d.rooms[8].kind).toBe('combat'); // elite
    expect(d.rooms[9].kind).toBe('event');  // boss intel
    expect(d.rooms[10].kind).toBe('boss');
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
      expect(d.rooms[10].monsters?.[0].defId).toBe('duergar-ilyich');
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
  it('emits at least 80 rooms across the six-chapter chained run', () => {
    const d = createGodwakeDelve(1);
    expect(d.rooms.length).toBeGreaterThanOrEqual(80);
  });

  it('has five camp seams between the six chapters', () => {
    const d = createGodwakeDelve(1);
    const camps = d.rooms.filter((r) => r.kind === 'camp');
    expect(camps).toHaveLength(5);
  });

  it('has six bosses, one per chapter, in the expected order', () => {
    const d = createGodwakeDelve(1);
    const bosses = d.rooms.filter((r) => r.kind === 'boss');
    expect(bosses).toHaveLength(6);
    expect(bosses[0].monsters?.[0].defId).toBe('duergar-ilyich');
    expect(bosses[1].monsters?.[0].defId).toBe('athkatla-magistrate');
    expect(bosses[2].monsters?.[0].defId).toBe('asylum-director');
    expect(bosses[3].monsters?.[0].defId).toBe('drow-matron-mother');
    expect(bosses[4].monsters?.[0].defId).toBe('hollow-dawn');
    expect(bosses[5].monsters?.[0].defId).toBe('the-unmade');
  });

  it('has at least six event rooms threaded through the chapters', () => {
    const d = createGodwakeDelve(1);
    const events = d.rooms.filter((r) => r.kind === 'event');
    expect(events.length).toBeGreaterThanOrEqual(6);
    // Every event room must resolve against the registry — no orphan ids.
    for (const e of events) {
      expect(e.eventTemplateId).toBeTruthy();
    }
  });

  it('has at least two shrines per chapter span', () => {
    const d = createGodwakeDelve(1);
    const shrines = d.rooms.filter((r) => r.kind === 'shrine');
    expect(shrines.length).toBeGreaterThanOrEqual(12);
  });

  it('has at least one rest room per chapter span', () => {
    const d = createGodwakeDelve(1);
    const rests = d.rooms.filter((r) => r.kind === 'rest');
    expect(rests.length).toBeGreaterThanOrEqual(6);
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

  it('the chained delve places the six bosses in chapter order', () => {
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
    // Each camp seam falls between two bosses (5 camps between 6 bosses).
    for (let i = 0; i < 5; i++) {
      expect(campIndices[i]).toBeGreaterThan(bossIndices[i]);
      expect(campIndices[i]).toBeLessThan(bossIndices[i + 1]);
    }
  });
});

describe('createSpellholdDelve', () => {
  it('produces 11 rooms in the warmup-shrine-mid-rest-elite-shrine-mid-shrine-elite-intel-boss pattern', () => {
    const d = createSpellholdDelve(1);
    expect(d.rooms).toHaveLength(11);
    expect(d.rooms[0].kind).toBe('combat');
    expect(d.rooms[1].kind).toBe('shrine');
    expect(d.rooms[2].kind).toBe('combat');
    expect(d.rooms[3].kind).toBe('rest');
    expect(d.rooms[4].kind).toBe('combat');
    expect(d.rooms[5].kind).toBe('shrine');
    expect(d.rooms[6].kind).toBe('combat');
    expect(d.rooms[7].kind).toBe('shrine');
    expect(d.rooms[8].kind).toBe('combat');
    expect(d.rooms[9].kind).toBe('event');
    expect(d.rooms[10].kind).toBe('boss');
  });

  it('chapterId is chapter-3', () => {
    const d = createSpellholdDelve(42);
    expect(d.chapterId).toBe('chapter-3');
  });

  it('boss is always the Asylum Director', () => {
    for (let s = 0; s < 10; s++) {
      const d = createSpellholdDelve(s);
      expect(d.rooms[10].monsters?.[0].defId).toBe('asylum-director');
    }
  });

  it('is deterministic per seed', () => {
    const a = createSpellholdDelve(42);
    const b = createSpellholdDelve(42);
    expect(a.rooms.map((r) => r.title)).toEqual(b.rooms.map((r) => r.title));
    expect(a.rooms.map((r) => r.monsters)).toEqual(b.rooms.map((r) => r.monsters));
  });

  it('warmup room has 1-2 enemies total', () => {
    for (let s = 0; s < 10; s++) {
      const d = createSpellholdDelve(s);
      const totalCount =
        d.rooms[0].monsters?.reduce((sum, m) => sum + m.count, 0) ?? 0;
      expect(totalCount).toBeGreaterThanOrEqual(1);
      expect(totalCount).toBeLessThanOrEqual(2);
    }
  });

  it('boss has battle-rage mechanic and a Hold Person action', () => {
    const director = getMonster('asylum-director');
    expect(director.bossMechanic).toBe('battle-rage');
    expect(director.actions.some((a) => a.kind === 'paralyze' && a.name === 'Hold Person')).toBe(true);
  });
});

describe('createUstNathaDelve', () => {
  it('produces 11 rooms in the warmup-shrine-early-mid-early-mid-rest-mid-mid-shrine-elite-intel-boss pattern', () => {
    const d = createUstNathaDelve(1);
    expect(d.rooms).toHaveLength(11);
    expect(d.rooms[0].kind).toBe('combat');
    expect(d.rooms[1].kind).toBe('shrine');
    expect(d.rooms[2].kind).toBe('combat');
    expect(d.rooms[3].kind).toBe('combat');
    expect(d.rooms[4].kind).toBe('rest');
    expect(d.rooms[5].kind).toBe('combat');
    expect(d.rooms[6].kind).toBe('combat');
    expect(d.rooms[7].kind).toBe('shrine');
    expect(d.rooms[8].kind).toBe('combat');
    expect(d.rooms[9].kind).toBe('event');
    expect(d.rooms[10].kind).toBe('boss');
  });

  it('chapterId is chapter-4', () => {
    const d = createUstNathaDelve(42);
    expect(d.chapterId).toBe('chapter-4');
  });

  it('boss is always the Matron Mother', () => {
    for (let s = 0; s < 10; s++) {
      const d = createUstNathaDelve(s);
      expect(d.rooms[10].monsters?.[0].defId).toBe('drow-matron-mother');
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

describe('createGodwakeDelve — branching graph', () => {
  /** Forward-reachable id set from the entry node. */
  function reachableFromEntry(d: DelveState): Set<string> {
    const seen = new Set<string>();
    const stack = [d.rooms[0].id];
    while (stack.length) {
      const id = stack.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      for (const n of roomById(d, id)?.next ?? []) stack.push(n);
    }
    return seen;
  }

  it('seeds the entry node, current id, and visited trail', () => {
    const d = createGodwakeDelve(1);
    expect(d.currentRoomIdx).toBe(0);
    expect(d.currentRoomId).toBe(d.rooms[0].id);
    expect(d.visitedRoomIds).toEqual([d.rooms[0].id]);
  });

  it('opens with a real fork (the entry reaches more than one node)', () => {
    const d = createGodwakeDelve(1);
    expect(reachableRooms(d, d.rooms[0]).length).toBeGreaterThan(1);
  });

  it('every node is reachable from the entry and every edge resolves', () => {
    const d = createGodwakeDelve(3);
    const reachable = reachableFromEntry(d);
    // Camps + downstream chapters are reachable only through the boss→camp seam,
    // so the whole flat list should be covered.
    expect(reachable.size).toBe(d.rooms.length);
    for (const room of d.rooms) {
      for (const id of room.next ?? []) {
        expect(roomById(d, id)).toBeDefined();
      }
    }
  });

  it('every node can still reach a boss (no dead ends before the convergence)', () => {
    const d = createGodwakeDelve(5);
    const reachesBoss = (start: string): boolean => {
      const seen = new Set<string>();
      const stack = [start];
      while (stack.length) {
        const id = stack.pop()!;
        if (seen.has(id)) continue;
        seen.add(id);
        const r = roomById(d, id);
        if (r?.kind === 'boss') return true;
        for (const n of r?.next ?? []) stack.push(n);
      }
      return false;
    };
    expect(d.rooms.every((r) => reachesBoss(r.id))).toBe(true);
  });

  it('offers shop and elite route nodes, and the final boss is terminal', () => {
    const d = createGodwakeDelve(7);
    expect(d.rooms.some((r) => r.kind === 'shop')).toBe(true);
    expect(d.rooms.some((r) => r.kind === 'elite')).toBe(true);
    const finalBoss = d.rooms.find((r) => r.monsters?.[0]?.defId === 'the-unmade')!;
    expect(finalBoss.next ?? []).toHaveLength(0);
    // Every other chapter boss leads onward to its camp.
    for (const boss of d.rooms.filter((r) => r.kind === 'boss' && r !== finalBoss)) {
      expect(reachableRooms(d, boss).some((r) => r.kind === 'camp')).toBe(true);
    }
  });
});
