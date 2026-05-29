import { describe, it, expect } from 'vitest';
import { merchantStockForTier } from './CampRoom';
import { getItem } from '../../content/items';

/**
 * The caravan stock is the only sink that consumes a run's gold, so it must
 * (a) scale with camp depth and (b) never list an item the purchase path can't
 * resolve — anything stocked has to be obtainable, no orphaned ids.
 */
describe('merchantStockForTier', () => {
  it('every stocked id resolves through getItem at every tier (no orphans)', () => {
    for (const tier of [1, 2, 3, null] as const) {
      for (const id of merchantStockForTier(tier)) {
        expect(() => getItem(id)).not.toThrow();
      }
    }
  });

  it('stock grows with depth — deeper camps strictly add wares', () => {
    const t1 = merchantStockForTier(1);
    const t2 = merchantStockForTier(2);
    const t3 = merchantStockForTier(3);
    expect(t2.length).toBeGreaterThan(t1.length);
    expect(t3.length).toBeGreaterThan(t2.length);
    // Cumulative: the shallower stock is a subset of the deeper.
    expect(t1.every((id) => t2.includes(id))).toBe(true);
    expect(t2.every((id) => t3.includes(id))).toBe(true);
  });

  it('null tier (defensive) falls back to the tier-1 floor', () => {
    expect(merchantStockForTier(null)).toEqual(merchantStockForTier(1));
  });

  it('the new weapons are obtainable — each appears somewhere in the stock', () => {
    const t3 = merchantStockForTier(3);
    for (const id of ['mace', 'quarterstaff', 'battleaxe', 'flail', 'hand-crossbow']) {
      expect(t3).toContain(id);
    }
  });

  it('deeper camps carry the dearest gear — the gold sink', () => {
    const t1 = merchantStockForTier(1);
    const t3 = merchantStockForTier(3);
    const maxCost = (ids: string[]) => Math.max(...ids.map((id) => getItem(id).cost));
    expect(maxCost(t3)).toBeGreaterThan(maxCost(t1));
  });
});
