import { describe, it, expect } from 'vitest';
import {
  combatIntroEligible,
  spotlightGeometry,
  unionBox,
  type Box,
  type CombatIntroGate,
} from './CombatCoach';
import { COMBAT_INTRO_TUTORIAL_ID } from '../../content/tutorials';

const VW = 1280;
const VH = 800;

/** A stand-in DOM element whose getBoundingClientRect returns a fixed rect. */
function fakeEl(rect: Box): Element {
  const right = rect.left + rect.width;
  const bottom = rect.top + rect.height;
  return {
    getBoundingClientRect: () =>
      ({ ...rect, right, bottom, x: rect.left, y: rect.top, toJSON: () => ({}) }) as DOMRect,
  } as unknown as Element;
}

const FRESH_STARTER: CombatIntroGate = {
  hasReincarnated: false,
  seenTutorials: [],
  classId: 'fighter',
  scene: 'combat',
};

describe('combatIntroEligible — first-combat coach gate', () => {
  it('fires on a brand-new soul’s first combat, for every starter class', () => {
    expect(combatIntroEligible(FRESH_STARTER)).toBe(true);
    expect(combatIntroEligible({ ...FRESH_STARTER, classId: 'wizard' })).toBe(true);
    expect(combatIntroEligible({ ...FRESH_STARTER, classId: 'ranger' })).toBe(true);
  });

  it('is gated OFF once the seen-flag is set', () => {
    expect(
      combatIntroEligible({ ...FRESH_STARTER, seenTutorials: [COMBAT_INTRO_TUTORIAL_ID] }),
    ).toBe(false);
  });

  it('never fires on a non-first life (the soul has already reincarnated)', () => {
    expect(combatIntroEligible({ ...FRESH_STARTER, hasReincarnated: true })).toBe(false);
  });

  it('never fires for a non-starter class', () => {
    expect(combatIntroEligible({ ...FRESH_STARTER, classId: 'barbarian' })).toBe(false);
    expect(combatIntroEligible({ ...FRESH_STARTER, classId: 'rogue' })).toBe(false);
    expect(combatIntroEligible({ ...FRESH_STARTER, classId: 'druid' })).toBe(false);
  });

  it('does not teach basics on a boss as the first encounter', () => {
    expect(combatIntroEligible({ ...FRESH_STARTER, scene: 'boss' })).toBe(false);
  });
});

describe('unionBox — target rect resolution', () => {
  it('returns a single element’s rect unchanged', () => {
    const rect = { top: 700, left: 40, width: 200, height: 44 };
    expect(unionBox([fakeEl(rect)])).toEqual(rect);
  });

  it('encloses every matching element (e.g. several enemy sprites)', () => {
    const box = unionBox([
      fakeEl({ top: 100, left: 900, width: 96, height: 96 }),
      fakeEl({ top: 100, left: 1040, width: 96, height: 96 }),
    ]);
    // left edge of the first, right edge of the last.
    expect(box).toEqual({ top: 100, left: 900, width: 236, height: 96 });
  });

  it('skips zero-area nodes and returns null when nothing is measurable', () => {
    expect(unionBox([fakeEl({ top: 0, left: 0, width: 0, height: 0 })])).toBeNull();
    expect(unionBox([])).toBeNull();
  });
});

describe('spotlightGeometry — cutout + never-trap fail-safe', () => {
  it('renders no blocking overlay when the target rect is missing', () => {
    expect(spotlightGeometry(null, VW, VH)).toBeNull();
  });

  it('renders no blocking overlay for a degenerate (zero-area) rect', () => {
    expect(spotlightGeometry({ top: 700, left: 40, width: 0, height: 0 }, VW, VH)).toBeNull();
    expect(spotlightGeometry({ top: 700, left: 40, width: 200, height: 0 }, VW, VH)).toBeNull();
  });

  it('renders no blocking overlay for a wholly offscreen rect', () => {
    // Below the fold (target scrolled out of view) — masking would dim the whole
    // screen with the hole nowhere visible, trapping the player.
    expect(spotlightGeometry({ top: 1200, left: 40, width: 200, height: 44 }, VW, VH)).toBeNull();
    // Off to the right.
    expect(spotlightGeometry({ top: 700, left: 1400, width: 200, height: 44 }, VW, VH)).toBeNull();
  });

  it('puts the cutout exactly on the target (its rect, padded), control reachable', () => {
    const target = { top: 700, left: 40, width: 200, height: 44 }; // the Attack button
    const spot = spotlightGeometry(target, VW, VH)!;
    const PAD = 10;
    expect(spot).toEqual({
      x0: target.left - PAD,
      y0: target.top - PAD,
      x1: target.left + target.width + PAD,
      y1: target.top + target.height + PAD,
      w: target.width + PAD * 2,
      h: target.height + PAD * 2,
    });
    // The whole control sits inside the hole, so the dim panels never cover it.
    expect(spot.x0).toBeLessThanOrEqual(target.left);
    expect(spot.y0).toBeLessThanOrEqual(target.top);
    expect(spot.x1).toBeGreaterThanOrEqual(target.left + target.width);
    expect(spot.y1).toBeGreaterThanOrEqual(target.top + target.height);
  });

  it('clamps the cutout to the viewport for an edge-hugging target', () => {
    // A target flush to the left/bottom edges — padding must not push the hole
    // off-screen (negative origin) or the panels would mis-tile.
    const spot = spotlightGeometry({ top: 0, left: 0, width: 96, height: 96 }, VW, VH)!;
    expect(spot.x0).toBe(0);
    expect(spot.y0).toBe(0);
  });

  it('matches the live flow: union the targets, then resolve the cutout', () => {
    const attackBtn = { top: 720, left: 32, width: 180, height: 44 };
    const box = unionBox([fakeEl(attackBtn)]);
    const spot = spotlightGeometry(box, VW, VH)!;
    expect(spot.x0).toBe(attackBtn.left - 10);
    expect(spot.y1).toBe(attackBtn.top + attackBtn.height + 10);
  });
});
