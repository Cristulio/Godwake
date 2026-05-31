/**
 * The progressive-unlock ladder — ONE source of truth for which features are
 * curtained off from a brand-new soul and when they open up.
 *
 * A soul accumulates DELVES (account-level, survives reincarnation). Features
 * unlock as that count crosses authored thresholds, gradually revealing the
 * game's systems instead of dumping all of them on a first-time player. This
 * module is the shared CONTRACT only: the counter lives in metaStore, and the
 * Phase-2 lanes (feature-gating / tutorials / lore) consume these helpers to
 * gate components, fire tutorials, and advance lore beats — none of that is
 * wired here.
 *
 * Everything NOT in {@link UNLOCKS} is available from delve 1 (core combat, the
 * route map, the shop, camps, green-rarity gear, shrines).
 */

/**
 * Ordered list of gated features. The order is the natural reveal order and is
 * the single place {@link FeatureId} is defined — the registry below must cover
 * exactly these ids (enforced by the `Record<FeatureId, …>` type).
 */
export const FEATURE_IDS = [
  'grove',
  'affixes-rare',
  'elite-nodes',
  'boss-intel',
  'legendaries',
  'affixes-epic',
  'class-roster',
  'sets',
  'grove-deep',
] as const;

export type FeatureId = (typeof FEATURE_IDS)[number];

/** Legacy meta boolean a gate may also honor (reconciliation, see UNLOCKS.grove). */
type LegacyUnlockFlag = 'druidGroveUnlocked';

export interface UnlockCondition {
  /**
   * Primary onboarding gate: the feature opens once the soul has STARTED this
   * many delves. The whole ladder is editable data — tune these freely.
   */
  delveCount: number;
  /**
   * Optional milestone alternative: also open once the soul has cleared at least
   * this many chapters, even below the delveCount threshold. Use where reaching
   * the content is itself proof of readiness (reads better than a raw counter).
   */
  chaptersCleared?: number;
  /**
   * Optional legacy boolean on the meta that ALSO satisfies this gate. Reconciles
   * a pre-existing unlock flag so the helper never contradicts an unlock the
   * player already earned by the old path (see the `grove` / `druidGroveUnlocked`
   * pairing — the delve ladder is primary, this just prevents a regression).
   */
  legacyFlag?: LegacyUnlockFlag;
}

/**
 * The ladder. Starred entries (`legendaries` @ 10, `sets` @ 20) are LOCKED by
 * design; the rest are pacing — edit the numbers, keep the shape.
 */
export const UNLOCKS: Record<FeatureId, UnlockCondition> = {
  grove: { delveCount: 2, legacyFlag: 'druidGroveUnlocked' },
  'affixes-rare': { delveCount: 3 },
  'elite-nodes': { delveCount: 5 },
  'boss-intel': { delveCount: 7 },
  legendaries: { delveCount: 10 },
  'affixes-epic': { delveCount: 13 },
  'class-roster': { delveCount: 16 },
  sets: { delveCount: 20 },
  // Deeper Grove tiers are a mastery reward — clearing a good chunk of the chain
  // opens them even before the delve count would.
  'grove-deep': { delveCount: 25, chaptersCleared: 4 },
};

/**
 * The slice of meta the unlock helpers read. metaStore's state is a structural
 * superset, so the store can be passed directly.
 */
export interface ProgressionMeta {
  delveCount: number;
  chaptersCleared: number;
  druidGroveUnlocked: boolean;
}

/** Is `featureId` available given the soul's current meta? Ungated ids are always true. */
export function isFeatureUnlocked(featureId: FeatureId, meta: ProgressionMeta): boolean {
  const cond = UNLOCKS[featureId];
  if (!cond) return true;
  if (meta.delveCount >= cond.delveCount) return true;
  if (cond.chaptersCleared !== undefined && meta.chaptersCleared >= cond.chaptersCleared) {
    return true;
  }
  if (cond.legacyFlag && meta[cond.legacyFlag]) return true;
  return false;
}

/**
 * Features whose delve threshold was crossed strictly between `prevDelveCount`
 * (exclusive) and `nextDelveCount` (inclusive) — i.e. the ones that just opened
 * on this descent. Phase-2 tutorials and lore beats fire on these. Keyed purely
 * off the delve counter (the milestone/legacy alternatives are not "crossed" by
 * a delve increment).
 */
export function newlyUnlocked(prevDelveCount: number, nextDelveCount: number): FeatureId[] {
  return FEATURE_IDS.filter((id) => {
    const threshold = UNLOCKS[id].delveCount;
    return threshold > prevDelveCount && threshold <= nextDelveCount;
  });
}

/** Every feature currently unlocked for this soul, in ladder order. */
export function unlockedFeatures(meta: ProgressionMeta): FeatureId[] {
  return FEATURE_IDS.filter((id) => isFeatureUnlocked(id, meta));
}

/**
 * The next still-locked feature and the delve it opens at (lowest threshold
 * first), or null when everything is unlocked. Drives an optional "next unlock
 * at delve N" UI hint.
 */
export function nextLockedFeature(
  meta: ProgressionMeta,
): { featureId: FeatureId; delveCount: number } | null {
  const locked = FEATURE_IDS.filter((id) => !isFeatureUnlocked(id, meta)).map((id) => ({
    featureId: id,
    delveCount: UNLOCKS[id].delveCount,
  }));
  if (locked.length === 0) return null;
  return locked.reduce((lo, f) => (f.delveCount < lo.delveCount ? f : lo));
}
