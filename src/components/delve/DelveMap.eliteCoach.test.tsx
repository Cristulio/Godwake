import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { DelveMap } from './DelveMap';
import { createCharacter, STANDARD_ARRAY } from '../../engine/character/initialize';
import { createGodwakeDelve } from '../../engine/delve';
import { useMetaStore } from '../../stores/metaStore';
import { ELITE_INTRO_TUTORIAL_ID } from '../../content/tutorials';
import type { DelveState, RoomSpec } from '../../types/delve';

/**
 * Part B wiring: DelveMap marks the reachable elite with data-tutorial="elite"
 * and, for a brand-new soul, fires the one-time coach (marking it seen on
 * activation) ONLY when a selectable elite is actually on the route.
 *
 * jsdom lacks matchMedia and we pin a non-firing rAF so the EliteCoach overlay's
 * rect loop doesn't churn — the seen-flag is written by the activation effect
 * regardless of whether the spotlight ever paints.
 */

beforeAll(() => {
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
});

afterAll(() => vi.unstubAllGlobals());

beforeEach(() => {
  useMetaStore.setState({ hasReincarnated: false, seenTutorials: [] });
});

afterEach(() => cleanup());

function character() {
  return createCharacter({
    id: 'elite-coach-fighter',
    name: 'Brick',
    raceId: 'human',
    classId: 'fighter',
    baseAbilityScores: {
      str: STANDARD_ARRAY[0],
      dex: STANDARD_ARRAY[2],
      con: STANDARD_ARRAY[1],
      int: STANDARD_ARRAY[5],
      wis: STANDARD_ARRAY[4],
      cha: STANDARD_ARRAY[3],
    },
    skillProficiencies: ['athletics', 'intimidation'],
  });
}

/** A between-rooms delve whose current node's only exit is `targetId`. */
function delveReachingOnly(targetId: string): DelveState {
  const base = createGodwakeDelve({ seed: 1 });
  const curIdx = base.currentRoomIdx;
  return {
    ...base,
    phase: 'between-rooms',
    rooms: base.rooms.map((r, i) => (i === curIdx ? { ...r, next: [targetId] } : r)),
  };
}

function firstOf(rooms: RoomSpec[], chapter: number | undefined, pred: (r: RoomSpec) => boolean) {
  return rooms.find((r) => r.chapter === chapter && pred(r));
}

describe('DelveMap — first-elite coach wiring', () => {
  it('marks the reachable elite and fires the one-time coach for a new soul', () => {
    const seed = createGodwakeDelve({ seed: 1 });
    const cur = seed.rooms[seed.currentRoomIdx];
    const elite = firstOf(seed.rooms, cur.chapter, (r) => r.kind === 'elite' && !r.locked);
    expect(elite, 'an unlocked elite in the current chapter').toBeDefined();

    const delve = delveReachingOnly(elite!.id);
    const { container } = render(<DelveMap delve={delve} character={character()} />);

    // The reachable elite carries the spotlight hook…
    const marked = container.querySelector('[data-tutorial="elite"]');
    expect(marked).not.toBeNull();
    // …and the coach activated, writing the seen-flag on activation (#417).
    expect(useMetaStore.getState().seenTutorials).toContain(ELITE_INTRO_TUTORIAL_ID);
  });

  it('does nothing when no selectable elite is on the map', () => {
    const seed = createGodwakeDelve({ seed: 1 });
    const cur = seed.rooms[seed.currentRoomIdx];
    const combat = firstOf(seed.rooms, cur.chapter, (r) => r.kind === 'combat' && r.id !== cur.id);
    expect(combat, 'a non-elite exit in the current chapter').toBeDefined();

    const delve = delveReachingOnly(combat!.id);
    const { container } = render(<DelveMap delve={delve} character={character()} />);

    expect(container.querySelector('[data-tutorial="elite"]')).toBeNull();
    expect(useMetaStore.getState().seenTutorials).not.toContain(ELITE_INTRO_TUTORIAL_ID);
  });
});
