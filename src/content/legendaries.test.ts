import { describe, it, expect } from 'vitest';
import {
  LEGENDARIES,
  LEGENDARY_ORDER,
  MAX_ACTIVE_LEGENDARIES,
  getLegendary,
  aggregateLegendaryBonuses,
} from './legendaries';

describe('legendary content', () => {
  it('has a stable unlock order matching the set', () => {
    expect(LEGENDARY_ORDER).toHaveLength(LEGENDARIES.length);
    expect(LEGENDARY_ORDER).toEqual(LEGENDARIES.map((l) => l.id));
    // No duplicate ids.
    expect(new Set(LEGENDARY_ORDER).size).toBe(LEGENDARY_ORDER.length);
  });

  it('keeps the attunement cap below the full set (a real choice)', () => {
    expect(MAX_ACTIVE_LEGENDARIES).toBeGreaterThan(0);
    expect(MAX_ACTIVE_LEGENDARIES).toBeLessThan(LEGENDARIES.length);
  });

  it('every relic carries a real, engine-readable bonus (nothing flavor-only)', () => {
    for (const relic of LEGENDARIES) {
      const b = relic.bonuses;
      const hasBonus =
        (b.ac ?? 0) !== 0 ||
        (b.critRange ?? 0) !== 0 ||
        Object.keys(b.abilityScores ?? {}).length > 0;
      expect(hasBonus, `${relic.id} has no mechanical bonus`).toBe(true);
      expect(relic.effect.length).toBeGreaterThan(0);
    }
  });

  it('aggregates ability scores additively across active relics', () => {
    const agg = aggregateLegendaryBonuses(['gauntlets-of-the-titan', 'heartwood-talisman']);
    expect(agg.abilityScores).toEqual({ str: 2, con: 2 });
  });

  it('aggregates flat AC and crit-range bonuses', () => {
    const agg = aggregateLegendaryBonuses(['bulwark-sigil', 'hunters-eye']);
    expect(agg.ac).toBe(1);
    expect(agg.critRange).toBe(1);
  });

  it('ignores unknown ids and returns an empty aggregate for none', () => {
    expect(aggregateLegendaryBonuses([])).toEqual({});
    expect(aggregateLegendaryBonuses(['nonexistent'])).toEqual({});
  });

  it('looks relics up by id', () => {
    expect(getLegendary('bulwark-sigil')?.name).toBe('Bulwark Sigil');
    expect(getLegendary('nope')).toBeUndefined();
  });
});
