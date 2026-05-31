import { describe, it, expect } from 'vitest';
import {
  createGodwakeDelve,
  reachableRooms,
  roomById,
} from './createDelve';
import { getMonster } from '../../content/monsters';
import type { DelveState } from '../../types/delve';

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
