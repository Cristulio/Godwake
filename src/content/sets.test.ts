import { describe, it, expect } from 'vitest';
import { SETS, computeSetBonuses, setProgress } from './sets';
import { aggregateLegendaryBonuses, getLegendary } from './legendaries';

describe('legendary sets', () => {
  it('grants no set bonus below the 2-piece threshold', () => {
    expect(computeSetBonuses(['vigil-helm'])).toEqual({});
  });

  it('grants the 2-piece bonus at two attuned pieces', () => {
    // Aegis of the Vigil, 2-piece = +1 AC.
    expect(computeSetBonuses(['vigil-helm', 'vigil-mantle'])).toEqual({ ac: 1 });
  });

  it('stacks the 3-piece bonus ON TOP of the 2-piece (partial/scaling)', () => {
    // 2pc (+1 AC) + 3pc (+1 AC, +1 CON) = +2 AC, +1 CON.
    const b = computeSetBonuses(['vigil-helm', 'vigil-mantle', 'vigil-heart']);
    expect(b.ac).toBe(2);
    expect(b.abilityScores).toEqual({ con: 1 });
  });

  it('folds the set bonus into aggregateLegendaryBonuses on top of each piece', () => {
    // Two Vigil pieces: solo (helm +1 AC, mantle +1 AC) = +2 AC, plus the 2pc
    // set bonus (+1 AC) = +3 AC total.
    const agg = aggregateLegendaryBonuses(['vigil-helm', 'vigil-mantle']);
    expect(agg.ac).toBe(3);
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

  it('reports active set progress', () => {
    const vigil = SETS.find((s) => s.id === 'vigil')!;
    expect(setProgress(vigil, ['vigil-helm', 'vigil-heart'])).toBe(2);
    expect(setProgress(vigil, [])).toBe(0);
  });
});
