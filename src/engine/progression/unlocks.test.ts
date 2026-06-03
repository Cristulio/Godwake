import { describe, it, expect } from 'vitest';
import {
  FEATURE_IDS,
  UNLOCKS,
  STARTER_CLASSES,
  NON_STARTER_ORDER,
  isFeatureUnlocked,
  newlyUnlocked,
  newlyUnlockedByChapter,
  newlyUnlockedClasses,
  isClassUnlocked,
  classUnlockRenown,
  relativeClassOrder,
  SLOT_RENOWN_THRESHOLDS,
  unlockedFeatures,
  nextLockedFeature,
  type ProgressionMeta,
} from './unlocks';
import { getTutorial } from '../../content/tutorials';
import { migrateV1ToV2 } from '../../stores/persistMigration';

function mkMeta(overrides: Partial<ProgressionMeta> = {}): ProgressionMeta {
  return {
    delveCount: 0,
    chaptersCleared: 0,
    renownSpent: 0,
    druidGroveUnlocked: false,
    hasReincarnated: false,
    ...overrides,
  };
}

describe('UNLOCKS registry', () => {
  it('covers exactly the FEATURE_IDS', () => {
    expect(Object.keys(UNLOCKS).sort()).toEqual([...FEATURE_IDS].sort());
  });

  it('gates onboarding on delve count, power/gear on chapters, roster + deep Grove on renown spent', () => {
    // The Grove rides the first-reincarnation trigger, not a delve count.
    expect(UNLOCKS.grove.reincarnated).toBe(true);
    expect(UNLOCKS.grove.delveCount).toBeUndefined();
    // Onboarding: the lone delve-paced reveal.
    expect(UNLOCKS['elite-nodes'].delveCount).toBe(5);
    // Power + gear: earned by clearing deeper chapters; blue @3, purple @5, sets @14.
    expect(UNLOCKS['boss-intel'].chaptersCleared).toBe(1);
    expect(UNLOCKS['affixes-rare'].chaptersCleared).toBe(3);
    expect(UNLOCKS['affixes-epic'].chaptersCleared).toBe(5);
    expect(UNLOCKS.legendaries.chaptersCleared).toBe(5);
    expect(UNLOCKS.sets.chaptersCleared).toBe(14);
    // Gear tiers carry no delve gate now — depth is the only way in.
    expect(UNLOCKS['affixes-rare'].delveCount).toBeUndefined();
    expect(UNLOCKS['affixes-epic'].delveCount).toBeUndefined();
    expect(UNLOCKS.legendaries.delveCount).toBeUndefined();
    expect(UNLOCKS.sets.delveCount).toBeUndefined();
    // Renown spent: the roster reveal at the first offering, the deeper Grove at 700.
    expect(UNLOCKS['class-roster'].renownSpent).toBe(1);
    expect(UNLOCKS['class-roster'].chaptersCleared).toBeUndefined();
    expect(UNLOCKS['grove-deep'].renownSpent).toBe(700);
    expect(UNLOCKS['grove-deep'].chaptersCleared).toBeUndefined();
  });
});

describe('isFeatureUnlocked', () => {
  it('a delve-7 soul with no clears has the onboarding reveal but no power unlocks', () => {
    const meta = mkMeta({ delveCount: 7 });
    expect(isFeatureUnlocked('elite-nodes', meta)).toBe(true); // delve @5
    expect(isFeatureUnlocked('affixes-rare', meta)).toBe(false); // chapter @3, not delve
    expect(isFeatureUnlocked('boss-intel', meta)).toBe(false); // chapter @1
    expect(isFeatureUnlocked('legendaries', meta)).toBe(false); // chapter @5
  });

  it('power + gear features open on chapters cleared regardless of delve count', () => {
    const meta = mkMeta({ delveCount: 0, chaptersCleared: 5 });
    expect(isFeatureUnlocked('boss-intel', meta)).toBe(true); // @1
    expect(isFeatureUnlocked('affixes-rare', meta)).toBe(true); // @3 (blue)
    expect(isFeatureUnlocked('affixes-epic', meta)).toBe(true); // @5 (purple)
    expect(isFeatureUnlocked('legendaries', meta)).toBe(true); // @5
    expect(isFeatureUnlocked('sets', meta)).toBe(false); // @14 (completion)
    // The roster reveal is renown-paced now, not chapters — depth alone leaves it shut.
    expect(isFeatureUnlocked('class-roster', meta)).toBe(false);
  });

  it('gear tiers open on chapter depth: blue at 3, purple at 5, never on delve count', () => {
    expect(isFeatureUnlocked('affixes-rare', mkMeta({ chaptersCleared: 2 }))).toBe(false);
    expect(isFeatureUnlocked('affixes-rare', mkMeta({ chaptersCleared: 3 }))).toBe(true);
    expect(isFeatureUnlocked('affixes-epic', mkMeta({ chaptersCleared: 4 }))).toBe(false);
    expect(isFeatureUnlocked('affixes-epic', mkMeta({ chaptersCleared: 5 }))).toBe(true);
    expect(isFeatureUnlocked('affixes-rare', mkMeta({ delveCount: 999 }))).toBe(false);
    expect(isFeatureUnlocked('affixes-epic', mkMeta({ delveCount: 999 }))).toBe(false);
  });

  it('class-roster opens on the first renown spent (the first Grove offering), not chapters', () => {
    expect(isFeatureUnlocked('class-roster', mkMeta({ renownSpent: 0 }))).toBe(false);
    expect(isFeatureUnlocked('class-roster', mkMeta({ renownSpent: 1 }))).toBe(true);
    expect(isFeatureUnlocked('class-roster', mkMeta({ chaptersCleared: 14 }))).toBe(false);
  });

  it('a brand-new soul (delve 0, no clears) has none of the gated features', () => {
    const meta = mkMeta();
    for (const id of FEATURE_IDS) expect(isFeatureUnlocked(id, meta)).toBe(false);
  });

  it('grove opens on the first reincarnation, never on delve count', () => {
    // No number of delves opens it on their own — the wheel has to turn first.
    expect(isFeatureUnlocked('grove', mkMeta({ delveCount: 9 }))).toBe(false);
    expect(isFeatureUnlocked('grove', mkMeta({ hasReincarnated: true }))).toBe(true);
  });

  it('grove honors the legacy druidGroveUnlocked flag (veteran reconciliation)', () => {
    // A soul that earned the Grove the old way (renown) stays unlocked even
    // before it has reincarnated under the new rule — never re-lock a veteran.
    const meta = mkMeta({ hasReincarnated: false, druidGroveUnlocked: true });
    expect(isFeatureUnlocked('grove', meta)).toBe(true);
  });

  it('grove-deep opens at 700 renown spent, not at 699, and never on chapters', () => {
    expect(isFeatureUnlocked('grove-deep', mkMeta({ renownSpent: 700 }))).toBe(true);
    expect(isFeatureUnlocked('grove-deep', mkMeta({ renownSpent: 699 }))).toBe(false);
    // Depth doesn't open it — only tribute laid at the Grove does.
    expect(isFeatureUnlocked('grove-deep', mkMeta({ chaptersCleared: 14 }))).toBe(false);
  });
});

describe('newlyUnlocked (delve axis)', () => {
  it('returns the single onboarding feature whose threshold the descent crossed', () => {
    expect(newlyUnlocked(4, 5)).toEqual(['elite-nodes']);
    // Blue gear moved off the delve axis onto chapter depth (@3) — a delve step
    // across the old threshold fires nothing here now.
    expect(newlyUnlocked(2, 3)).toEqual([]);
  });

  it('never fires the Grove on a delve transition — it is reincarnation-gated now', () => {
    // The old delve-2 step must no longer enqueue the Grove card.
    expect(newlyUnlocked(1, 2)).toEqual([]);
    expect(newlyUnlocked(0, 9)).not.toContain('grove');
  });

  it('returns every onboarding threshold crossed in a multi-step jump, in ladder order', () => {
    // elite-nodes (@5) is the lone delve-gated reveal now.
    expect(newlyUnlocked(2, 5)).toEqual(['elite-nodes']);
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
    expect(newlyUnlockedByChapter(2, 3)).toEqual(['affixes-rare']); // blue @3
    // ch 5 crosses legendaries AND purple gear — both @5, in FEATURE_IDS order.
    expect(newlyUnlockedByChapter(4, 5)).toEqual(['legendaries', 'affixes-epic']);
    expect(newlyUnlockedByChapter(13, 14)).toEqual(['sets']);
  });

  it('returns every chapter threshold crossed in a multi-chapter jump, in ladder order', () => {
    // 0 -> 5 crosses affixes-rare(3), boss-intel(1), legendaries(5), affixes-epic(5).
    expect(newlyUnlockedByChapter(0, 5)).toEqual([
      'affixes-rare',
      'boss-intel',
      'legendaries',
      'affixes-epic',
    ]);
  });

  it('never fires the delve- or renown-gated reveals on a chapter clear', () => {
    expect(newlyUnlockedByChapter(5, 5)).toEqual([]);
    // The old soul-swapping step: crossing chapter 2 now fires nothing — the
    // roster reveal moved onto the renown axis (the first Grove offering).
    expect(newlyUnlockedByChapter(1, 2)).toEqual([]);
    // elite-nodes is delve-paced; class-roster + grove-deep are renown-paced.
    expect(newlyUnlockedByChapter(0, 14)).not.toContain('elite-nodes');
    expect(newlyUnlockedByChapter(0, 14)).not.toContain('class-roster');
    expect(newlyUnlockedByChapter(0, 14)).not.toContain('grove-deep');
  });
});

describe('class unlocks (relative to the origin starter, paced by renown spent)', () => {
  /** The classes unlocked for `origin` after `spent` renown, in the origin's order. */
  function unlockedAt(origin: 'fighter' | 'wizard' | 'ranger', spent: number) {
    return relativeClassOrder(origin).filter((c) => isClassUnlocked(c, spent, origin));
  }

  it('lets a fresh soul forge exactly the three starters: fighter, wizard (Mage), ranger (Hunter)', () => {
    expect([...STARTER_CLASSES].sort()).toEqual(['fighter', 'ranger', 'wizard']);
    // Barbarian is no longer a starter — it is sealed at first creation now,
    // earned later as the first non-starter.
    expect(STARTER_CLASSES).not.toContain('barbarian');
    expect(NON_STARTER_ORDER).toEqual(['barbarian', 'rogue', 'druid', 'monk']);
  });

  it('exposes the slot bars: first offering (>0), then 100 / 200 / 300 / 450 / 600', () => {
    expect(SLOT_RENOWN_THRESHOLDS).toEqual([1, 100, 200, 300, 450, 600]);
  });

  it('keeps the origin always unlocked at 0 renown — the worn body is yours, whichever it is', () => {
    for (const origin of STARTER_CLASSES) {
      expect(classUnlockRenown(origin, origin)).toBe(0);
      expect(isClassUnlocked(origin, 0, origin)).toBe(true);
    }
  });

  it('per-origin ORDER: Fighter leads for a Mage/Hunter origin; ranger/wizard swap for a Fighter origin', () => {
    expect(relativeClassOrder('fighter')).toEqual(
      ['fighter', 'ranger', 'wizard', 'barbarian', 'rogue', 'druid', 'monk'],
    );
    expect(relativeClassOrder('wizard')).toEqual(
      ['wizard', 'fighter', 'ranger', 'barbarian', 'rogue', 'druid', 'monk'],
    );
    expect(relativeClassOrder('ranger')).toEqual(
      ['ranger', 'fighter', 'wizard', 'barbarian', 'rogue', 'druid', 'monk'],
    );
  });

  it('origin=fighter: ranger on first spend, wizard@100, then barbarian/rogue/druid/monk', () => {
    expect(classUnlockRenown('fighter', 'fighter')).toBe(0);
    expect(classUnlockRenown('ranger', 'fighter')).toBe(1);
    expect(classUnlockRenown('wizard', 'fighter')).toBe(100);
    expect(classUnlockRenown('barbarian', 'fighter')).toBe(200);
    expect(classUnlockRenown('rogue', 'fighter')).toBe(300);
    expect(classUnlockRenown('druid', 'fighter')).toBe(450);
    expect(classUnlockRenown('monk', 'fighter')).toBe(600);
    // renownSpent 0 unlocks only fighter; each bar adds exactly the next soul.
    expect(unlockedAt('fighter', 0)).toEqual(['fighter']);
    expect(unlockedAt('fighter', 1)).toEqual(['fighter', 'ranger']);
    expect(unlockedAt('fighter', 100)).toEqual(['fighter', 'ranger', 'wizard']);
    expect(unlockedAt('fighter', 200)).toEqual(['fighter', 'ranger', 'wizard', 'barbarian']);
    expect(unlockedAt('fighter', 300)).toEqual(
      ['fighter', 'ranger', 'wizard', 'barbarian', 'rogue'],
    );
    expect(unlockedAt('fighter', 450)).toEqual(
      ['fighter', 'ranger', 'wizard', 'barbarian', 'rogue', 'druid'],
    );
    expect(unlockedAt('fighter', 600)).toEqual(
      ['fighter', 'ranger', 'wizard', 'barbarian', 'rogue', 'druid', 'monk'],
    );
    // Boundary behaviour: a bar opens AT its value, not one short.
    expect(isClassUnlocked('ranger', 0, 'fighter')).toBe(false);
    expect(isClassUnlocked('ranger', 1, 'fighter')).toBe(true);
    expect(isClassUnlocked('wizard', 99, 'fighter')).toBe(false);
    expect(isClassUnlocked('wizard', 100, 'fighter')).toBe(true);
    expect(isClassUnlocked('monk', 599, 'fighter')).toBe(false);
    expect(isClassUnlocked('monk', 600, 'fighter')).toBe(true);
  });

  it('origin=wizard: fighter at the first purchase, ranger@100, then the non-starters', () => {
    expect(classUnlockRenown('fighter', 'wizard')).toBe(1);
    expect(classUnlockRenown('ranger', 'wizard')).toBe(100);
    expect(classUnlockRenown('barbarian', 'wizard')).toBe(200);
    expect(classUnlockRenown('rogue', 'wizard')).toBe(300);
    expect(classUnlockRenown('druid', 'wizard')).toBe(450);
    expect(classUnlockRenown('monk', 'wizard')).toBe(600);
    expect(unlockedAt('wizard', 0)).toEqual(['wizard']);
    expect(unlockedAt('wizard', 1)).toEqual(['wizard', 'fighter']);
    expect(unlockedAt('wizard', 100)).toEqual(['wizard', 'fighter', 'ranger']);
    expect(unlockedAt('wizard', 600)).toEqual(
      ['wizard', 'fighter', 'ranger', 'barbarian', 'rogue', 'druid', 'monk'],
    );
  });

  it('origin=ranger: fighter at the first purchase, wizard@100, then the non-starters', () => {
    expect(classUnlockRenown('fighter', 'ranger')).toBe(1);
    expect(classUnlockRenown('wizard', 'ranger')).toBe(100);
    expect(classUnlockRenown('barbarian', 'ranger')).toBe(200);
    expect(classUnlockRenown('rogue', 'ranger')).toBe(300);
    expect(classUnlockRenown('druid', 'ranger')).toBe(450);
    expect(classUnlockRenown('monk', 'ranger')).toBe(600);
    expect(unlockedAt('ranger', 1)).toEqual(['ranger', 'fighter']);
    expect(unlockedAt('ranger', 100)).toEqual(['ranger', 'fighter', 'wizard']);
  });

  it('the unplayable cleric never opens for any origin (Infinity bar)', () => {
    for (const origin of STARTER_CLASSES) {
      expect(classUnlockRenown('cleric', origin)).toBe(Infinity);
      expect(isClassUnlocked('cleric', 1_000_000, origin)).toBe(false);
    }
  });

  it('INVARIANT: every starter unlocks before every non-starter, for every origin', () => {
    for (const origin of STARTER_CLASSES) {
      const starterBars = STARTER_CLASSES.map((c) => classUnlockRenown(c, origin));
      const nonStarterBars = NON_STARTER_ORDER.map((c) => classUnlockRenown(c, origin));
      expect(Math.max(...starterBars)).toBeLessThan(Math.min(...nonStarterBars));
    }
  });

  it('reports the soul whose renown-spent bar a Grove purchase just crossed (origin=fighter)', () => {
    expect(newlyUnlockedClasses(0, 1, 'fighter')).toEqual(['ranger']);
    expect(newlyUnlockedClasses(1, 100, 'fighter')).toEqual(['wizard']);
    expect(newlyUnlockedClasses(100, 200, 'fighter')).toEqual(['barbarian']);
    expect(newlyUnlockedClasses(200, 300, 'fighter')).toEqual(['rogue']);
    expect(newlyUnlockedClasses(300, 450, 'fighter')).toEqual(['druid']);
    expect(newlyUnlockedClasses(450, 600, 'fighter')).toEqual(['monk']);
  });

  it('reorders the early reveals by origin — a wizard soul opens the Fighter on its first spend', () => {
    expect(newlyUnlockedClasses(0, 1, 'wizard')).toEqual(['fighter']);
    expect(newlyUnlockedClasses(1, 100, 'wizard')).toEqual(['ranger']);
  });

  it('returns every bar crossed in one big spend, in ladder order', () => {
    expect(newlyUnlockedClasses(0, 200, 'fighter')).toEqual(['ranger', 'wizard', 'barbarian']);
  });

  it('never reports the origin itself as newly unlocked (it is worn from 0 renown)', () => {
    expect(newlyUnlockedClasses(0, 600, 'wizard')).not.toContain('wizard');
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
    expect(
      unlockedFeatures(
        mkMeta({ delveCount: 999, chaptersCleared: 14, renownSpent: 700, hasReincarnated: true }),
      ),
    ).toEqual([...FEATURE_IDS]);
  });
});

describe('nextLockedFeature', () => {
  it('prefers delve, falls through to chapter then renown, and is null when all unlocked', () => {
    // The Grove is event-gated (first reincarnation) with no numeric threshold, so
    // the hint skips it. Fresh soul: the lone delve-paced reveal (elite-nodes @5) leads.
    expect(nextLockedFeature(mkMeta())).toEqual({
      featureId: 'elite-nodes',
      axis: 'delve',
      threshold: 5,
    });
    // Delve axis exhausted -> the lowest locked chapter gate (boss-intel @1).
    expect(nextLockedFeature(mkMeta({ delveCount: 999 }))).toEqual({
      featureId: 'boss-intel',
      axis: 'chapter',
      threshold: 1,
    });
    // Delve + chapter both done -> the renown axis (class-roster @1, the first offering).
    expect(nextLockedFeature(mkMeta({ delveCount: 999, chaptersCleared: 14 }))).toEqual({
      featureId: 'class-roster',
      axis: 'renown',
      threshold: 1,
    });
    expect(
      nextLockedFeature(
        mkMeta({ delveCount: 999, chaptersCleared: 14, renownSpent: 700, hasReincarnated: true }),
      ),
    ).toBeNull();
  });
});

describe('migration ↔ unlock ladder', () => {
  it('a migrated veteran (delveCount 999) keeps the delve-onboarding reveals; power gates on depth', () => {
    // A pre-v13 save with prior progression (a death logged) floors to 999.
    const migrated = migrateV1ToV2({ unlockedUpgrades: {}, deathCount: 1 });
    expect(migrated.delveCount).toBe(999);
    const meta = mkMeta({ delveCount: migrated.delveCount, chaptersCleared: 0 });
    // The 999 floor opens the delve-gated onboarding reveals. (The Grove no
    // longer rides delve count — it is reincarnation-gated, kept for veterans by
    // hasReincarnated or the legacy flag; see the grove tests above.)
    expect(isFeatureUnlocked('elite-nodes', meta)).toBe(true);
    // ...but power features are earned by reaching new depths, not by delve count.
    expect(isFeatureUnlocked('legendaries', meta)).toBe(false);
    expect(isFeatureUnlocked('sets', meta)).toBe(false);
  });

  it('a maxed veteran (deep, reincarnated, renown poured in) has everything', () => {
    expect(
      unlockedFeatures(
        mkMeta({ delveCount: 999, chaptersCleared: 14, renownSpent: 700, hasReincarnated: true }),
      ),
    ).toEqual([...FEATURE_IDS]);
  });

  it('a fresh soul (delveCount 0, no clears) is gated', () => {
    expect(unlockedFeatures(mkMeta())).toEqual([]);
  });
});
