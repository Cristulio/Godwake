import type { ClassId } from '../../schemas/ids';

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
   * Onboarding gate: opens once the soul has STARTED this many delves. Used for
   * the early "here's how the game works" reveals a new walker needs before
   * they've cleared anything. A feature gates on delveCount OR chaptersCleared
   * (whichever it declares) — meeting any declared threshold opens it.
   */
  delveCount?: number;
  /**
   * Progression gate: opens once the soul's deepest run has cleared this many
   * chapters (the {@link ProgressionMeta.chaptersCleared} high-water mark). This
   * is the mastery axis — power unlocks are earned by reaching new depths, not by
   * grinding delves. `chaptersCleared: 14` is the full chain = game completion.
   */
  chaptersCleared?: number;
  /**
   * Reincarnation gate: opens the first time the soul dies and the wheel turns
   * ({@link ProgressionMeta.hasReincarnated}). Reserved for the Grove — it sells
   * permanence BETWEEN lives, so it stays curtained until the player has died
   * once and come back with Renown to spend (see {@link UNLOCKS}.grove).
   */
  reincarnated?: boolean;
  /**
   * Optional legacy boolean on the meta that ALSO satisfies this gate. Reconciles
   * a pre-existing unlock flag so the helper never contradicts an unlock the
   * player already earned by the old path (see the `grove` / `druidGroveUnlocked`
   * pairing — this just prevents a regression).
   */
  legacyFlag?: LegacyUnlockFlag;
}

/**
 * The ladder. THREE triggers by design:
 *  - DELVE COUNT (onboarding): the early reveals a fresh soul needs to stand a
 *    chance, before they've cleared a single chapter.
 *  - CHAPTERS CLEARED (progression/mastery): the power unlocks. The game is hard;
 *    reaching a new depth is what opens the next advantage, culminating in relic
 *    sets at game completion (the full fourteen-chapter chain).
 *  - FIRST REINCARNATION (the Grove alone): the renown shop sits BETWEEN lives,
 *    so it opens the first time the soul dies and the wheel hauls it back.
 * All editable data — tune freely, keep the shape.
 */
export const UNLOCKS: Record<FeatureId, UnlockCondition> = {
  // The Grove opens at the FIRST reincarnation — it trades Renown for permanence
  // between lives, useless until the soul has died once and come back. The legacy
  // flag keeps any veteran who earned it the old way (renown) unlocked.
  grove: { reincarnated: true, legacyFlag: 'druidGroveUnlocked' },
  // Onboarding reveals — delve-count paced.
  'affixes-rare': { delveCount: 3 },
  'elite-nodes': { delveCount: 5 },
  // Power unlocks — earned by clearing deeper chapters.
  'boss-intel': { chaptersCleared: 1 },
  // The roster "you can swap souls now" reveal fires when the first alternate
  // class opens (see CLASS_UNLOCK_DELVE). Classes stagger in individually after.
  'class-roster': { chaptersCleared: 2 },
  'affixes-epic': { chaptersCleared: 3 },
  legendaries: { chaptersCleared: 5 },
  sets: { chaptersCleared: 14 }, // the whole chain felled (Melissan) — game completion
  // Deeper Grove tiers — a mastery reward, also chapter-gated.
  'grove-deep': { chaptersCleared: 4 },
};

/**
 * The souls a brand-new walker may forge at the wheel — the three most forgiving
 * bodies (the sim's strongest bare-soul floors), so a first life can't be spent
 * on a fragile trap. A fresh soul picks exactly ONE of these; every other class,
 * INCLUDING the two of these it didn't pick, is then earned by logging delves
 * (see {@link CLASS_UNLOCK_DELVE}). Editable data.
 */
export const STARTER_CLASSES: readonly ClassId[] = ['fighter', 'barbarian', 'ranger'];

/**
 * Per-class unlock thresholds, in DELVE COUNT (the account-level tally of delves
 * STARTED, which survives reincarnation) — the bar a soul must reach before it
 * can CHANGE INTO that body at the hub. There is no always-available starter: a
 * fresh walker forges one of the three {@link STARTER_CLASSES} and is then locked
 * to it until it has logged enough delves to earn the others.
 *
 * Delve-paced so the roster opens on time served, not on a depth wall a green
 * soul may never reach. Ordered by how forgiving the class is to play, and
 * staggered so each new soul lands with room to breathe before the next:
 *  - two steady souls first (Fighter from the first delve, then Ranger), so a
 *    fresh walker banks a couple of even-keeled lives before the wild ones;
 *  - the harder bodies stagger deeper, so renown is banked to pad their
 *    fragility before one is worn — Wizard, then Barbarian, then Rogue, then
 *    Druid, then Monk last.
 * Editable data.
 */
export const CLASS_UNLOCK_DELVE: Record<ClassId, number> = {
  // Two steady souls first — Fighter from the first life, Ranger close behind.
  fighter: 0,
  ranger: 3,
  // The harder souls, staggered deeper.
  wizard: 6,
  barbarian: 9,
  rogue: 12,
  // The Druid: a Wisdom caster whose survivability rides on Wild Shape rather
  // than armour — squishy in the bare-soul early game, like the Wizard before it.
  druid: 15,
  // The Monk: a DEX/Ki flurry striker with no armour — high tempo and burst, but
  // a thin guard that punishes a careless turn.
  monk: 18,
  // Not yet a playable class (absent from the roster); threshold is a placeholder.
  cleric: 999,
};

/** Is `classId` available to select given the soul's delve count? */
export function isClassUnlocked(classId: ClassId, delveCount: number): boolean {
  return delveCount >= CLASS_UNLOCK_DELVE[classId];
}

/**
 * Classes whose delve threshold was crossed strictly between `prevDelveCount`
 * (exclusive) and `nextDelveCount` (inclusive) — the souls just earned by logging
 * another delve. Drives the per-class "a new soul surfaced" reveal in startDelve.
 * Callers filter to classes that actually have a reveal card, and drop the soul's
 * own class (it crosses its own threshold but is already worn, not "newly" found).
 */
export function newlyUnlockedClasses(prevDelveCount: number, nextDelveCount: number): ClassId[] {
  return (Object.keys(CLASS_UNLOCK_DELVE) as ClassId[]).filter((id) => {
    const threshold = CLASS_UNLOCK_DELVE[id];
    return threshold > prevDelveCount && threshold <= nextDelveCount;
  });
}

/**
 * The slice of meta the unlock helpers read. metaStore's state is a structural
 * superset, so the store can be passed directly.
 */
export interface ProgressionMeta {
  delveCount: number;
  chaptersCleared: number;
  druidGroveUnlocked: boolean;
  /**
   * Has the soul died and turned the wheel at least once? Gates the Grove (see
   * {@link UNLOCKS}.grove). Optional so the many call sites that only probe
   * delve/chapter features need not thread it; metaStore (a structural superset)
   * supplies the real value, and the one UI that gates the Grove (HubScreen)
   * passes it through.
   */
  hasReincarnated?: boolean;
}

/** Is `featureId` available given the soul's current meta? Ungated ids are always true. */
export function isFeatureUnlocked(featureId: FeatureId, meta: ProgressionMeta): boolean {
  const cond = UNLOCKS[featureId];
  if (!cond) return true;
  if (cond.delveCount !== undefined && meta.delveCount >= cond.delveCount) return true;
  if (cond.chaptersCleared !== undefined && meta.chaptersCleared >= cond.chaptersCleared) {
    return true;
  }
  if (cond.reincarnated && meta.hasReincarnated) return true;
  if (cond.legacyFlag && meta[cond.legacyFlag]) return true;
  return false;
}

/**
 * Delve-gated features whose threshold was crossed strictly between
 * `prevDelveCount` (exclusive) and `nextDelveCount` (inclusive) — the onboarding
 * reveals that just opened on this descent. The reveal-tutorial trigger fires on
 * these in startDelve. Chapter-gated features are handled by
 * {@link newlyUnlockedByChapter} on a clear instead.
 */
export function newlyUnlocked(prevDelveCount: number, nextDelveCount: number): FeatureId[] {
  return FEATURE_IDS.filter((id) => {
    const threshold = UNLOCKS[id].delveCount;
    return threshold !== undefined && threshold > prevDelveCount && threshold <= nextDelveCount;
  });
}

/**
 * Chapter-gated features whose threshold was crossed strictly between
 * `prevChapters` (exclusive) and `nextChapters` (inclusive) — the power unlocks
 * just earned by reaching a new depth. The reveal-tutorial trigger fires on these
 * in finishDelve when the chaptersCleared high-water mark advances.
 */
export function newlyUnlockedByChapter(prevChapters: number, nextChapters: number): FeatureId[] {
  return FEATURE_IDS.filter((id) => {
    const threshold = UNLOCKS[id].chaptersCleared;
    return threshold !== undefined && threshold > prevChapters && threshold <= nextChapters;
  });
}

/** Every feature currently unlocked for this soul, in ladder order. */
export function unlockedFeatures(meta: ProgressionMeta): FeatureId[] {
  return FEATURE_IDS.filter((id) => isFeatureUnlocked(id, meta));
}

/** A locked feature surfaced as a "next unlock at…" hint (numeric-threshold axes only). */
export interface LockedFeatureHint {
  featureId: FeatureId;
  axis: 'delve' | 'chapter';
  threshold: number;
}

/**
 * The next still-locked feature, the axis it opens on, and its threshold (lowest
 * threshold first within each axis, delve-gated reveals preferred), or null when
 * everything is unlocked. Drives an optional "next unlock at…" UI hint. Event-
 * gated features (the Grove's first-reincarnation trigger) carry no numeric
 * threshold, so they are omitted from the hint.
 */
export function nextLockedFeature(
  meta: ProgressionMeta,
): LockedFeatureHint | null {
  const locked = FEATURE_IDS.filter((id) => !isFeatureUnlocked(id, meta)).flatMap(
    (id): LockedFeatureHint[] => {
      const cond = UNLOCKS[id];
      if (cond.delveCount !== undefined) {
        return [{ featureId: id, axis: 'delve', threshold: cond.delveCount }];
      }
      if (cond.chaptersCleared !== undefined) {
        return [{ featureId: id, axis: 'chapter', threshold: cond.chaptersCleared }];
      }
      return [];
    },
  );
  if (locked.length === 0) return null;
  // Onboarding reveals (delve axis) come first, then the lowest threshold.
  return locked.reduce((lo, f) => {
    if (f.axis !== lo.axis) return f.axis === 'delve' ? f : lo;
    return f.threshold < lo.threshold ? f : lo;
  });
}
