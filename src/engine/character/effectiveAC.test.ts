import { describe, it, expect } from 'vitest';
import { effectiveAC, AC_SOFTCAP } from './effectiveAC';

describe('effectiveAC — diminishing returns past the softcap', () => {
  it('passes AC at or below the softcap through untouched', () => {
    for (const ac of [1, 5, 10, 14, 18, 19, 20]) {
      expect(effectiveAC(ac)).toBe(ac);
    }
  });

  it('matches the documented curve: eff = 20 + round(10 × (1 − 0.9^(AC−20)))', () => {
    // Spot table from the spec. Note 38: the formula gives 20 + round(8.499…)
    // = 28 (the spec brief's table said 29 — an arithmetic slip; 29 is first
    // reached at AC 40, where the gain is 8.78 → 9).
    const table: Array<[raw: number, eff: number]> = [
      [21, 21],
      [22, 22],
      [23, 23],
      [24, 23],
      [25, 24],
      [26, 25],
      [28, 26],
      [30, 27],
      [34, 28],
      [38, 28],
      [40, 29],
    ];
    for (const [raw, eff] of table) {
      expect(effectiveAC(raw), `eff(${raw})`).toBe(eff);
    }
  });

  it('is monotone nondecreasing and climbs at most 1 per raw point', () => {
    for (let ac = 1; ac <= 80; ac++) {
      const step = effectiveAC(ac + 1) - effectiveAC(ac);
      expect(step, `step at ${ac}`).toBeGreaterThanOrEqual(0);
      expect(step, `step at ${ac}`).toBeLessThanOrEqual(1);
    }
  });

  it('never exceeds the +10 asymptote over the softcap', () => {
    for (let ac = AC_SOFTCAP; ac <= 200; ac++) {
      expect(effectiveAC(ac)).toBeLessThanOrEqual(AC_SOFTCAP + 10);
    }
  });

  it('clamps beyond the lookup edge instead of falling off it', () => {
    expect(effectiveAC(200)).toBe(effectiveAC(60));
  });
});
