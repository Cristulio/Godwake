import { describe, it, expect } from 'vitest';
import { SETS, computeSetBonuses, setProgress } from './sets';
import { getLegendary } from './legendaries';

describe('legendary sets', () => {
  it('grants no set bonus below the 2-piece threshold', () => {
    expect(computeSetBonuses(['vigil-helm'])).toEqual([]);
  });

  it('grants the 2-piece bonus at two equipped pieces', () => {
    const out = computeSetBonuses(['vigil-helm', 'vigil-mantle']);
    expect(out).toHaveLength(1);
    expect(out[0].tempHpPerCombat).toBe(4);
  });

  it('stacks the 3-piece bonus ON TOP of the 2-piece (partial/scaling)', () => {
    const out = computeSetBonuses(['vigil-helm', 'vigil-mantle', 'vigil-heart']);
    // 2-piece (temp HP) + 3-piece (lifesteal) = two stacked entries.
    expect(out).toHaveLength(2);
    expect(out.some((m) => (m.tempHpPerCombat ?? 0) > 0)).toBe(true);
    expect(out.some((m) => (m.lifestealPct ?? 0) > 0)).toBe(true);
  });

  it('every set piece is a real legendary tagged with its setId', () => {
    for (const set of SETS) {
      expect(set.pieceIds.length).toBeGreaterThanOrEqual(2);
      for (const pid of set.pieceIds) {
        const leg = getLegendary(pid);
        expect(leg, `${pid} is not a real legendary`).toBeDefined();
        expect(leg!.setId).toBe(set.id);
      }
    }
  });

  it('reports equipped set progress', () => {
    const vigil = SETS.find((s) => s.id === 'vigil')!;
    expect(setProgress(vigil, ['vigil-helm', 'vigil-heart'])).toBe(2);
    expect(setProgress(vigil, [])).toBe(0);
  });
});
