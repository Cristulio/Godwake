import { describe, it, expect } from 'vitest';
import { chapterRamp } from './chapterRamp';

describe('chapterRamp', () => {
  it('is exactly neutral (1.0/1.0) through chapter 4 — the early grind never moves', () => {
    for (const ch of [1, 2, 3, 4]) {
      const r = chapterRamp(ch);
      expect(r.hpMult).toBe(1);
      expect(r.damageMult).toBe(1);
    }
  });

  it('treats non-positive / non-finite chapters as neutral', () => {
    for (const ch of [0, -1, NaN, Infinity, -Infinity]) {
      const r = chapterRamp(ch);
      expect(r.hpMult).toBe(1);
      expect(r.damageMult).toBe(1);
    }
  });

  it('grows past chapter 4 — Ch5 already carries a ramp on both axes', () => {
    const r = chapterRamp(5);
    expect(r.hpMult).toBeGreaterThan(1);
    expect(r.damageMult).toBeGreaterThan(1);
  });

  it('is monotonic non-decreasing across the whole chain (Ch1→14)', () => {
    for (let ch = 1; ch < 14; ch++) {
      const cur = chapterRamp(ch);
      const next = chapterRamp(ch + 1);
      expect(next.hpMult).toBeGreaterThanOrEqual(cur.hpMult);
      expect(next.damageMult).toBeGreaterThanOrEqual(cur.damageMult);
    }
  });

  it('the Throne of the Slain God kicker (Ch13-14) is strictly steeper than the geometric trend would predict', () => {
    // The per-chapter step from Ch11→12 is pure geometric growth; the step into
    // the ToB act (Ch12→13) must add the kicker on top, so it is a larger jump.
    const geometricStep = chapterRamp(12).hpMult / chapterRamp(11).hpMult;
    const tobStep = chapterRamp(13).hpMult / chapterRamp(12).hpMult;
    expect(tobStep).toBeGreaterThan(geometricStep);
  });

  it('clamps to a sane band so a stray chapter index can never produce a degenerate fight', () => {
    const r = chapterRamp(9999);
    expect(r.hpMult).toBeLessThanOrEqual(3);
    expect(r.damageMult).toBeLessThanOrEqual(2.5);
    expect(r.hpMult).toBeGreaterThanOrEqual(1);
    expect(r.damageMult).toBeGreaterThanOrEqual(1);
  });

  it('the deepest real chapter (Ch14) stays inside the clamp band at the provisional constants', () => {
    const r = chapterRamp(14);
    expect(r.hpMult).toBeGreaterThan(chapterRamp(13).hpMult);
    expect(r.hpMult).toBeLessThan(3);
    expect(r.damageMult).toBeLessThan(2.5);
  });
});
