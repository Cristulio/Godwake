import { describe, it, expect } from 'vitest';
import {
  FEATURE_IDS,
  UNLOCKS,
  STARTER_CLASSES,
  isFeatureUnlocked,
  newlyUnlocked,
  newlyUnlockedByChapter,
  newlyUnlockedClasses,
  isClassUnlocked,
  unlockedFeatures,
  nextLockedFeature,
  type ProgressionMeta,
} from './unlocks';
import { getTutorial } from '../../content/tutorials';
import { migrateV1ToV2 } from '../../stores/persistMigration';

function mkMeta(overrides: Partial<ProgressionMeta> = {}): ProgressionMeta {
  return { delveCount: 0, chaptersCleared: 0, druidGroveUnlocked: false, ...overrides };
}

describe('UNLOCKS registry', () => {
  it('covers exactly the FEATURE_IDS', () => {
    expect(Object.keys(UNLOCKS).sort()).toEqual([...FEATURE_IDS].sort());
  });

  it('gates the onboarding reveals on delve count and the power unlocks on chapters', () => {
    // Onboarding: paced by raw delve count.
    expect(UNLOCKS.grove.delveCount).toBe(2);
    expect(UNLOCKS['affixes-rare'].delveCount).toBe(3);
    expect(UNLOCKS['elite-nodes'].delveCount).toBe(5);
    // Power: earned by clearing deeper chapters; sets land at completion (ch 14).
    expect(UNLOCKS['boss-intel'].chaptersCleared).toBe(1);
    expect(UNLOCKS.legendaries.chaptersCleared).toBe(5);
    expect(UNLOCKS.sets.chaptersCleared).toBe(14);
    // Power features carry no delve gate — depth is the only way in.
    expect(UNLOCKS.legendaries.delveCount).toBeUndefined();
    expect(UNLOCKS.sets.delveCount).toBeUndefined();
  });
});

describe('isFeatureUnlocked', () => {
  it('a delve-7 soul with no clears has the onboarding reveals but no power unlocks', () => {
    const meta = mkMeta({ delveCount: 7 });
    expect(isFeatureUnlocked('elite-nodes', meta)).toBe(true); // delve @5
    expect(isFeatureUnlocked('boss-intel', meta)).toBe(false); // chapter @1
    expect(isFeatureUnlocked('legendaries', meta)).toBe(false); // chapter @5
  });

  it('power features open on chapters cleared regardless of delve count', () => {
    const meta = mkMeta({ delveCount: 0, chaptersCleared: 5 });
    expect(isFeatureUnlocked('boss-intel', meta)).toBe(true); // @1
    expect(isFeatureUnlocked('class-roster', meta)).toBe(true); // @2
    expect(isFeatureUnlocked('affixes-epic', meta)).toBe(true); // @3
    expect(isFeatureUnlocked('legendaries', meta)).toBe(true); // @5
    expect(isFeatureUnlocked('sets', meta)).toBe(false); // @14 (completion)
  });

  it('a brand-new soul (delve 0, no clears) has none of the gated features', () => {
    const meta = mkMeta();
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

  it('grove-deep opens on the chaptersCleared milestone', () => {
    expect(isFeatureUnlocked('grove-deep', mkMeta({ chaptersCleared: 4 }))).toBe(true);
    expect(isFeatureUnlocked('grove-deep', mkMeta({ chaptersCleared: 3 }))).toBe(false);
  });
});

describe('newlyUnlocked (delve axis)', () => {
  it('returns the single onboarding feature whose threshold the descent crossed', () => {
    expect(newlyUnlocked(1, 2)).toEqual(['grove']);
    expect(newlyUnlocked(4, 5)).toEqual(['elite-nodes']);
  });

  it('returns every onboarding threshold crossed in a multi-step jump, in ladder order', () => {
    expect(newlyUnlocked(2, 5)).toEqual(['affixes-rare', 'elite-nodes']);
  });

  it('never fires the chapter-gated power features', () => {
    // No delve threshold above elite-nodes @5, so a deep delve jump opens nothing.
    expect(newlyUnlocked(5, 30)).toEqual([]);
    expect(newlyUnlocked(7, 7)).toEqual([]);
  });
});

describe('newlyUnlockedByChapter (progression axis)', () => {
  it('returns the power feature whose chapter threshold the clear crossed', () => {
    expect(newlyUnlockedByChapter(0, 1)).toEqual(['boss-intel']);
    expect(newlyUnlockedByChapter(4, 5)).toEqual(['legendaries']);
    expect(newlyUnlockedByChapter(13, 14)).toEqual(['sets']);
  });

  it('returns every chapter threshold crossed in a multi-chapter jump, in ladder order', () => {
    expect(newlyUnlockedByChapter(0, 3)).toEqual(['boss-intel', 'affixes-epic', 'class-roster']);
  });

  it('never fires the delve-gated onboarding reveals', () => {
    expect(newlyUnlockedByChapter(5, 5)).toEqual([]);
  });
});

describe('class unlocks (delve-count axis)', () => {
  it('lets a fresh soul forge exactly the three easy starters', () => {
    expect([...STARTER_CLASSES].sort()).toEqual(['barbarian', 'fighter', 'ranger']);
  });

  it('opens nothing before the first delve, then Fighter from delve 1', () => {
    // At delveCount 0 the table opens nothing; a fresh soul reaches the three
    // starters via STARTER_CLASSES, not this gate. Fighter opens at delve 1.
    for (const id of STARTER_CLASSES) expect(isClassUnlocked(id, 0)).toBe(false);
    expect(isClassUnlocked('fighter', 1)).toBe(true);
    expect(isClassUnlocked('barbarian', 0)).toBe(false);
  });

  it('staggers the souls across delve counts (3 / 6 / 9 / 12 / 18, with 15 reserved)', () => {
    expect(isClassUnlocked('barbarian', 2)).toBe(false);
    expect(isClassUnlocked('barbarian', 3)).toBe(true);
    expect(isClassUnlocked('ranger', 5)).toBe(false);
    expect(isClassUnlocked('ranger', 6)).toBe(true);
    expect(isClassUnlocked('wizard', 8)).toBe(false);
    expect(isClassUnlocked('wizard', 9)).toBe(true);
    expect(isClassUnlocked('druid', 11)).toBe(false);
    expect(isClassUnlocked('druid', 12)).toBe(true);
    expect(isClassUnlocked('rogue', 17)).toBe(false);
    expect(isClassUnlocked('rogue', 18)).toBe(true);
  });

  it('leaves delve 15 open — reserved for the Monk, no existing class sits there', () => {
    expect(newlyUnlockedClasses(14, 15)).toEqual([]);
  });

  it('reports the alternate(s) whose delve threshold a descent just crossed', () => {
    expect(newlyUnlockedClasses(0, 1)).toEqual(['fighter']);
    expect(newlyUnlockedClasses(2, 3)).toEqual(['barbarian']);
    expect(newlyUnlockedClasses(5, 6)).toEqual(['ranger']);
    expect(newlyUnlockedClasses(8, 9)).toEqual(['wizard']);
    expect(newlyUnlockedClasses(11, 12)).toEqual(['druid']);
    expect(newlyUnlockedClasses(17, 18)).toEqual(['rogue']);
  });

  it('every roster soul has a reveal card; the unplayable cleric does not', () => {
    for (const id of ['fighter', 'barbarian', 'ranger', 'wizard', 'rogue'] as const) {
      expect(getTutorial(id)).toBeDefined();
    }
    expect(getTutorial('cleric')).toBeUndefined();
  });
});

describe('unlockedFeatures', () => {
  it('is empty for a fresh soul and lists everything for one that cleared the chain', () => {
    expect(unlockedFeatures(mkMeta())).toEqual([]);
    expect(unlockedFeatures(mkMeta({ delveCount: 999, chaptersCleared: 14 }))).toEqual([
      ...FEATURE_IDS,
    ]);
  });
});

describe('nextLockedFeature', () => {
  it('points at the lowest-threshold locked onboarding reveal, then null when all unlocked', () => {
    expect(nextLockedFeature(mkMeta())).toEqual({
      featureId: 'grove',
      axis: 'delve',
      threshold: 2,
    });
    expect(nextLockedFeature(mkMeta({ delveCount: 2 }))).toEqual({
      featureId: 'affixes-rare',
      axis: 'delve',
      threshold: 3,
    });
    expect(nextLockedFeature(mkMeta({ delveCount: 999, chaptersCleared: 14 }))).toBeNull();
  });
});

describe('migration ↔ unlock ladder', () => {
  it('a migrated veteran (delveCount 999) keeps the onboarding reveals; power gates on depth', () => {
    const migrated = migrateV1ToV2({ unlockedUpgrades: {} });
    const meta = mkMeta({ delveCount: migrated.delveCount, chaptersCleared: 0 });
    // The 999 floor opens the delve-gated onboarding reveals...
    expect(isFeatureUnlocked('grove', meta)).toBe(true);
    expect(isFeatureUnlocked('elite-nodes', meta)).toBe(true);
    // ...but power features are earned by reaching new depths, not by delve count.
    expect(isFeatureUnlocked('legendaries', meta)).toBe(false);
    expect(isFeatureUnlocked('sets', meta)).toBe(false);
  });

  it('a veteran who has cleared the full chain has everything', () => {
    expect(unlockedFeatures(mkMeta({ delveCount: 999, chaptersCleared: 14 }))).toEqual([
      ...FEATURE_IDS,
    ]);
  });

  it('a fresh soul (delveCount 0, no clears) is gated', () => {
    expect(unlockedFeatures(mkMeta())).toEqual([]);
  });
});
