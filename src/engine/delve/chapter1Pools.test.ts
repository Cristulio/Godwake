import { describe, it, expect } from 'vitest';
import {
  WARMUP_POOL,
  EARLY_MID_POOL,
  MID_POOL,
  ELITE_POOL,
} from './chapter1Pools';

// Pre-bump baseline (sum of every xpReward across the four Ch1 combat pools).
// Sim runs at this baseline left wizards short of L3 by the elite room; the
// +20% bump (rounded per-entry) lifts a perfect-roll Ch1 over ~990 XP.
const PRE_BUMP_BASELINE_TOTAL = 240 + 510 + 960 + 1500; // 3210

describe('chapter1 combat pools — XP +20% sim fix', () => {
  it('every entry has a positive xpReward', () => {
    const all = [...WARMUP_POOL, ...EARLY_MID_POOL, ...MID_POOL, ...ELITE_POOL];
    for (const e of all) {
      expect(e.xpReward).toBeGreaterThan(0);
    }
  });

  it('total xpReward across all four pools is at least +20% of the pre-bump baseline', () => {
    const sum = [
      ...WARMUP_POOL,
      ...EARLY_MID_POOL,
      ...MID_POOL,
      ...ELITE_POOL,
    ].reduce((acc, e) => acc + e.xpReward, 0);
    expect(sum).toBeGreaterThanOrEqual(Math.round(PRE_BUMP_BASELINE_TOTAL * 1.2));
  });

  it('each pool individually scaled by ~+20%', () => {
    const warmup = WARMUP_POOL.reduce((a, e) => a + e.xpReward, 0);
    const earlyMid = EARLY_MID_POOL.reduce((a, e) => a + e.xpReward, 0);
    const mid = MID_POOL.reduce((a, e) => a + e.xpReward, 0);
    const elite = ELITE_POOL.reduce((a, e) => a + e.xpReward, 0);

    expect(warmup).toBeGreaterThanOrEqual(Math.floor(240 * 1.2));
    expect(earlyMid).toBeGreaterThanOrEqual(Math.floor(510 * 1.2));
    expect(mid).toBeGreaterThanOrEqual(Math.floor(960 * 1.2));
    expect(elite).toBeGreaterThanOrEqual(Math.floor(1500 * 1.2));
  });
});
