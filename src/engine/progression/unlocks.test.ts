import { describe, it, expect } from 'vitest';
import {
  FEATURE_IDS,
  UNLOCKS,
  isFeatureUnlocked,
  newlyUnlocked,
  unlockedFeatures,
  nextLockedFeature,
  type ProgressionMeta,
} from './unlocks';
import { migrateV1ToV2 } from '../../stores/persistMigration';

function mkMeta(overrides: Partial<ProgressionMeta> = {}): ProgressionMeta {
  return { delveCount: 0, chaptersCleared: 0, druidGroveUnlocked: false, ...overrides };
}

describe('UNLOCKS registry', () => {
  it('covers exactly the FEATURE_IDS', () => {
    expect(Object.keys(UNLOCKS).sort()).toEqual([...FEATURE_IDS].sort());
  });

  it('keeps the two starred thresholds locked by design', () => {
    expect(UNLOCKS.legendaries.delveCount).toBe(10);
    expect(UNLOCKS.sets.delveCount).toBe(20);
  });
});

describe('isFeatureUnlocked', () => {
  it('a delve-7 soul has elite-nodes and boss-intel but not legendaries', () => {
    const meta = mkMeta({ delveCount: 7 });
    expect(isFeatureUnlocked('elite-nodes', meta)).toBe(true); // @5
    expect(isFeatureUnlocked('boss-intel', meta)).toBe(true); // @7 (boundary is inclusive)
    expect(isFeatureUnlocked('legendaries', meta)).toBe(false); // @10
  });

  it('a brand-new soul (delve 0) has none of the gated features', () => {
    const meta = mkMeta({ delveCount: 0 });
    for (const id of FEATURE_IDS) expect(isFeatureUnlocked(id, meta)).toBe(false);
  });

  it('grove opens at delve 2', () => {
    expect(isFeatureUnlocked('grove', mkMeta({ delveCount: 1 }))).toBe(false);
    expect(isFeatureUnlocked('grove', mkMeta({ delveCount: 2 }))).toBe(true);
  });

  it('grove honors the legacy druidGroveUnlocked flag below the delve threshold', () => {
    // Reconciliation: a soul that earned the Grove the old way (renown) stays
    // unlocked even before delve 2 — the helper never contradicts the old gate.
    const meta = mkMeta({ delveCount: 1, druidGroveUnlocked: true });
    expect(isFeatureUnlocked('grove', meta)).toBe(true);
  });

  it('grove-deep opens via the chaptersCleared milestone before its delve threshold', () => {
    const meta = mkMeta({ delveCount: 5, chaptersCleared: 4 });
    expect(isFeatureUnlocked('grove-deep', meta)).toBe(true); // @25 delves, or 4 chapters
    expect(isFeatureUnlocked('grove-deep', mkMeta({ delveCount: 5, chaptersCleared: 3 }))).toBe(
      false,
    );
  });
});

describe('newlyUnlocked', () => {
  it('returns the single feature whose threshold the descent crossed', () => {
    expect(newlyUnlocked(9, 10)).toEqual(['legendaries']);
    expect(newlyUnlocked(19, 20)).toEqual(['sets']);
  });

  it('returns every threshold crossed in a multi-step jump, in ladder order', () => {
    expect(newlyUnlocked(4, 7)).toEqual(['elite-nodes', 'boss-intel']);
  });

  it('returns nothing when no threshold sits in the interval', () => {
    expect(newlyUnlocked(10, 12)).toEqual([]);
    expect(newlyUnlocked(7, 7)).toEqual([]);
  });
});

describe('unlockedFeatures', () => {
  it('is empty for a fresh soul and lists everything for a deep one', () => {
    expect(unlockedFeatures(mkMeta({ delveCount: 0 }))).toEqual([]);
    expect(unlockedFeatures(mkMeta({ delveCount: 999 }))).toEqual([...FEATURE_IDS]);
  });
});

describe('nextLockedFeature', () => {
  it('points at the lowest-threshold locked feature, then null when all unlocked', () => {
    expect(nextLockedFeature(mkMeta({ delveCount: 0 }))).toEqual({ featureId: 'grove', delveCount: 2 });
    expect(nextLockedFeature(mkMeta({ delveCount: 2 }))).toEqual({
      featureId: 'affixes-rare',
      delveCount: 3,
    });
    expect(nextLockedFeature(mkMeta({ delveCount: 999 }))).toBeNull();
  });
});

describe('migration ↔ unlock ladder', () => {
  it('a migrated veteran save (delveCount 999) has everything unlocked', () => {
    const migrated = migrateV1ToV2({ unlockedUpgrades: {} });
    const meta = mkMeta({
      delveCount: migrated.delveCount,
      chaptersCleared: 0,
      druidGroveUnlocked: false,
    });
    expect(unlockedFeatures(meta)).toEqual([...FEATURE_IDS]);
  });

  it('a fresh soul (delveCount 0) is gated', () => {
    expect(unlockedFeatures(mkMeta({ delveCount: 0 }))).toEqual([]);
  });
});
