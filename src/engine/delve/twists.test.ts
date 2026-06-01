import { describe, it, expect } from 'vitest';
import { createGodwakeDelve } from './createDelve';
import { DUNGEON_TWISTS, getTwist, twistCombatEffect } from './twists';
import type { RoomSpec } from '../../types/delve';

function twistedRooms(rooms: RoomSpec[]): RoomSpec[] {
  return rooms.filter((r) => r.twistId);
}
function combatRooms(rooms: RoomSpec[]): RoomSpec[] {
  return rooms.filter((r) => r.kind === 'combat');
}

describe('dungeon twist registry', () => {
  it('every twist resolves and carries a non-empty effect + telegraph copy', () => {
    for (const t of DUNGEON_TWISTS) {
      expect(getTwist(t.id)).toBe(t);
      expect(t.name.length).toBeGreaterThan(0);
      expect(t.telegraph.length).toBeGreaterThan(0);
      expect(t.flavorText.length).toBeGreaterThan(0);
      expect(Object.keys(t.effect).length).toBeGreaterThan(0);
    }
  });

  it('twistCombatEffect is neutral for an unknown/absent id', () => {
    expect(twistCombatEffect(undefined)).toEqual({});
    expect(twistCombatEffect('not-a-twist')).toEqual({});
  });
});

describe('dungeon twist assignment (gated on Ascension >= 4)', () => {
  const SEEDS = [1, 2, 3, 7, 11, 42, 99, 123, 777, 2024];

  it('never assigns a twist below Ascension 4', () => {
    for (const ascension of [0, 1, 2, 3]) {
      for (const seed of SEEDS) {
        const delve = createGodwakeDelve({ seed, ascension });
        expect(twistedRooms(delve.rooms)).toHaveLength(0);
      }
    }
  });

  it('assigns twists to some — but not all — combat rooms at Ascension >= 4', () => {
    for (const seed of SEEDS) {
      const delve = createGodwakeDelve({ seed, ascension: 4 });
      const combat = combatRooms(delve.rooms);
      const twisted = twistedRooms(delve.rooms);
      expect(twisted.length).toBeGreaterThan(0);
      expect(twisted.length).toBeLessThan(combat.length);
    }
  });

  it('only plain combat rooms are twisted — never warmup-entry, elite or boss', () => {
    for (const seed of SEEDS) {
      const delve = createGodwakeDelve({ seed, ascension: 6 });
      for (const room of twistedRooms(delve.rooms)) {
        expect(room.kind).toBe('combat');
        // The chapter entry (layer 0 warmup) stays clean as a gentle opener.
        expect(room.layer).not.toBe(0);
        expect(getTwist(room.twistId)).toBeDefined();
      }
    }
  });

  it('the same seed lays out the same twists (deterministic)', () => {
    const a = createGodwakeDelve({ seed: 555, ascension: 5 });
    const b = createGodwakeDelve({ seed: 555, ascension: 5 });
    const ta = twistedRooms(a.rooms).map((r) => `${r.id}:${r.twistId}`);
    const tb = twistedRooms(b.rooms).map((r) => `${r.id}:${r.twistId}`);
    expect(ta).toEqual(tb);
    expect(ta.length).toBeGreaterThan(0);
  });
});
