import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';
import { eliteIntroEligible, useEliteIntroCoach } from './EliteCoach';
import { useMetaStore } from '../../stores/metaStore';
import { ELITE_INTRO_TUTORIAL_ID } from '../../content/tutorials';

/**
 * Part B: the first-elite coach is strictly one-time per soul. The #417 lesson —
 * write the seen-flag on ACTIVATION, not only on explicit dismiss — is exercised
 * by the hook tests: a second map containing a selectable elite is ineligible
 * even though the first coach was never dismissed.
 */

beforeEach(() => {
  useMetaStore.setState({ hasReincarnated: false, seenTutorials: [] });
});

afterEach(() => cleanup());

describe('eliteIntroEligible — the first-elite gate', () => {
  const base = { hasReincarnated: false, seenTutorials: [] as string[], hasSelectableElite: true };

  it('fires for a brand-new soul with a selectable elite on the map', () => {
    expect(eliteIntroEligible(base)).toBe(true);
  });

  it('does not fire once the tutorial is in seenTutorials', () => {
    expect(eliteIntroEligible({ ...base, seenTutorials: [ELITE_INTRO_TUTORIAL_ID] })).toBe(false);
  });

  it('does not fire for a veteran soul (has reincarnated)', () => {
    expect(eliteIntroEligible({ ...base, hasReincarnated: true })).toBe(false);
  });

  it('does not fire when no selectable elite is on the map', () => {
    expect(eliteIntroEligible({ ...base, hasSelectableElite: false })).toBe(false);
  });
});

describe('useEliteIntroCoach — strictly one-time per soul', () => {
  it('writes the seen-flag on activation (no dismiss), so a later map is ineligible', () => {
    // First map with a selectable elite: the coach activates and marks seen.
    const first = renderHook(() => useEliteIntroCoach(true));
    expect(first.result.current.active).toBe(true);
    expect(useMetaStore.getState().seenTutorials).toContain(ELITE_INTRO_TUTORIAL_ID);

    // Leave WITHOUT dismissing — just unmount (as choosing a node would).
    cleanup();

    // A second, later map that also has a selectable elite is NOT eligible.
    const second = renderHook(() => useEliteIntroCoach(true));
    expect(second.result.current.active).toBe(false);
    expect(
      eliteIntroEligible({
        hasReincarnated: false,
        seenTutorials: useMetaStore.getState().seenTutorials,
        hasSelectableElite: true,
      }),
    ).toBe(false);
  });

  it('only fires once a selectable elite is on the map', () => {
    // Mount with no selectable elite: dormant, and the seen-flag stays unwritten.
    const { result, rerender } = renderHook(({ s }) => useEliteIntroCoach(s), {
      initialProps: { s: false },
    });
    expect(result.current.active).toBe(false);
    expect(useMetaStore.getState().seenTutorials).not.toContain(ELITE_INTRO_TUTORIAL_ID);

    // An elite becomes reachable: now it activates (and marks seen).
    rerender({ s: true });
    expect(result.current.active).toBe(true);
    expect(useMetaStore.getState().seenTutorials).toContain(ELITE_INTRO_TUTORIAL_ID);
  });

  it('never activates for a veteran soul, and never marks seen', () => {
    useMetaStore.setState({ hasReincarnated: true, seenTutorials: [] });
    const { result } = renderHook(() => useEliteIntroCoach(true));
    expect(result.current.active).toBe(false);
    expect(useMetaStore.getState().seenTutorials).not.toContain(ELITE_INTRO_TUTORIAL_ID);
  });
});
