import { describe, it, expect } from 'vitest';
import { TUTORIALS, getTutorial } from './tutorials';
import { FEATURE_IDS } from '../engine/progression/unlocks';

describe('tutorial registry', () => {
  it('authors exactly one card per gated feature', () => {
    expect(Object.keys(TUTORIALS).sort()).toEqual([...FEATURE_IDS].sort());
  });

  it('every card has a title, a non-empty body, and a key mechanic', () => {
    for (const id of FEATURE_IDS) {
      const t = TUTORIALS[id];
      expect(t.title.length).toBeGreaterThan(0);
      expect(t.body.length).toBeGreaterThan(0);
      expect(t.body.every((p) => p.trim().length > 0)).toBe(true);
      expect(t.key.length).toBeGreaterThan(0);
    }
  });

  it('getTutorial resolves a known id and returns undefined for an unknown one', () => {
    expect(getTutorial('legendaries')).toBe(TUTORIALS.legendaries);
    expect(getTutorial('not-a-feature')).toBeUndefined();
  });
});
