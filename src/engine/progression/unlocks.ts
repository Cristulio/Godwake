import type { ClassId } from '../../schemas/ids';

/**
 * The progressive-unlock ladder — ONE source of truth for which features are
 * curtained off from a brand-new soul and when they open up.
 *
 * A soul accumulates progress on several account-level axes that survive
 * reincarnation — delves started, chapters cleared, renown spent. Features unlock
 * as those cross authored thresholds (see {@link UNLOCKS}), gradually revealing
 * the game's systems instead of dumping all of them on a first-time player. This
 * module is the shared CONTRACT only: the counters live in metaStore, and the
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
   * they've cleared anything. A feature gates on delveCount OR chaptersCleared OR
   * renownSpent (whichever it declares) — meeting ANY declared threshold opens it.
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
   * Spend gate: opens once the soul has SPENT this much Renown at the Grove
   * (the {@link ProgressionMeta.renownSpent} account-level total). The tribute
   * axis — earned by laying Renown down between lives, not by depth or delve
   * count. Paces the alternate-soul unlock bars (see {@link classUnlockRenown})
   * and the deeper Grove.
   */
  renownSpent?: number;
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
 * The ladder. FOUR triggers by design:
 *  - DELVE COUNT (onboarding): the early reveals a fresh soul needs to stand a
 *    chance, before they've cleared a single chapter.
 *  - CHAPTERS CLEARED (progression/mastery): the power unlocks. The game is hard;
 *    reaching a new depth is what opens the next advantage, culminating in relic
 *    sets at game completion (the full fourteen-chapter chain).
 *  - FIRST REINCARNATION (the Grove alone): the renown shop sits BETWEEN lives,
 *    so it opens the first time the soul dies and the wheel hauls it back.
 *  - RENOWN SPENT (tribute): the deeper Grove opens on Renown laid down; the
 *    alternate-soul unlock bars ride the same axis (see classUnlockRenown). Earned
 *    by laying Renown down, not depth.
 * All editable data — tune freely, keep the shape.
 */
export const UNLOCKS: Record<FeatureId, UnlockCondition> = {
  // The Grove opens at the FIRST reincarnation — it trades Renown for permanence
  // between lives, useless until the soul has died once and come back. The legacy
  // flag keeps any veteran who earned it the old way (renown) unlocked.
  grove: { reincarnated: true, legacyFlag: 'druidGroveUnlocked' },
  // Elites are intentionally ALWAYS available — players choose the risk from
  // delve 1. `delveCount: 0` keeps the feature permanently unlocked and fires NO
  // "Elites unlocked" reveal (a 0 threshold can never be freshly crossed in
  // newlyUnlocked, where the test is `threshold > prevDelveCount`). Re-enable the
  // original onboarding gate by restoring the commented line:
  //   'elite-nodes': { delveCount: 5 },
  'elite-nodes': { delveCount: 0 },
  // Power unlocks — earned by clearing deeper chapters. Blue gear opens once the
  // soul's deepest run has cleared 3 chapters, purple at 5.
  'boss-intel': { chaptersCleared: 1 },
  'affixes-rare': { chaptersCleared: 3 },
  'affixes-epic': { chaptersCleared: 5 },
  legendaries: { chaptersCleared: 5 },
  sets: { chaptersCleared: 14 }, // the whole chain felled (Melissan) — game completion
  // Deeper Grove tiers — a mastery reward, gated on Renown laid down at the Grove.
  'grove-deep': { renownSpent: 700 },
};

/**
 * The three archetypes a brand-new walker may forge at the wheel — the soul's
 * possible ORIGINS. A fresh soul picks exactly ONE of these; it becomes the
 * soul's permanent anchor for the renown-spent class ladder below. Order here is
 * stable and feeds the per-origin orders. Editable data.
 */
export const STARTER_CLASSES: readonly ClassId[] = ['fighter', 'wizard', 'ranger'];

/**
 * The four non-starter souls, in the order they stagger in AFTER all three
 * starters — barbarian first, monk last. They fill the tail of every per-origin
 * order, so every starter opens before any of these for every origin. Editable.
 */
export const NON_STARTER_ORDER: readonly ClassId[] = ['barbarian', 'rogue', 'druid', 'monk'];

/** A soul's possible origin — always one of the three forged starters. */
type StarterClass = 'fighter' | 'wizard' | 'ranger';

/**
 * The order the OTHER six souls open in, PER ORIGIN — index 0 is the first unlock
 * (slot 2), index 5 the last (slot 7). The two non-origin starters lead (Fighter
 * is the early one for a Mage or Hunter origin), then the four non-starters fill
 * the tail in {@link NON_STARTER_ORDER}. All three starters precede every
 * non-starter for every origin. The one source of truth for the unlock order —
 * editable data.
 */
const UNLOCK_ORDER_BY_ORIGIN: Record<StarterClass, readonly ClassId[]> = {
  fighter: ['ranger', 'wizard', ...NON_STARTER_ORDER],
  wizard: ['fighter', 'ranger', ...NON_STARTER_ORDER],
  ranger: ['fighter', 'wizard', ...NON_STARTER_ORDER],
};

/**
 * Cumulative RENOWN-SPENT bars for unlock slots 2..7 (the origin holds slot 1 and
 * is always worn — bar 0). Slot 2 opens on ANY spend, the first Grove offering,
 * modelled as `>= 1` since renown is only ever spent in positive whole numbers.
 * Editable data.
 */
export const SLOT_RENOWN_THRESHOLDS: readonly number[] = [1, 100, 200, 300, 450, 600];

/**
 * The soul's full unlock ORDER given the starter it forged: the origin first
 * (always its own body), then the other six in {@link UNLOCK_ORDER_BY_ORIGIN}.
 * Position drives the renown-spent bar — the origin at slot 1, the rest at 2..7.
 * A non-starter origin can't be forged; we still return a sane order (origin, the
 * starters, then the non-starters) rather than throw on a malformed save.
 */
export function relativeClassOrder(originClass: ClassId): ClassId[] {
  const tail = UNLOCK_ORDER_BY_ORIGIN[originClass as StarterClass];
  if (tail) return [originClass, ...tail];
  const others = [...STARTER_CLASSES, ...NON_STARTER_ORDER].filter((c) => c !== originClass);
  return [originClass, ...others];
}

/** Every class the renown ladder paces (cleric is unplayable, never on the ladder). */
const LADDER_CLASSES: readonly ClassId[] = [...STARTER_CLASSES, ...NON_STARTER_ORDER];

/**
 * The cumulative RENOWN SPENT on the Grove (metaStore.renownSpent — account-level,
 * survives reincarnation) at which `classId` opens for a soul whose origin starter
 * is `originClass`: the bar it must reach before it can CHANGE INTO that body at
 * the hub. RELATIVE to the origin — the worn origin is always free (0); the other
 * two starters and the four non-starters open as renown spent crosses the slot
 * bars (slot 2 = first offering, then 100 / 200 / 300 / 450 / 600). The unplayable
 * cleric never opens (Infinity). Spend-paced so the roster opens on tribute laid
 * down, not on a depth wall a green soul may never reach.
 */
export function classUnlockRenown(classId: ClassId, originClass: ClassId): number {
  if (classId === 'cleric') return Infinity;
  const idx = relativeClassOrder(originClass).indexOf(classId);
  if (idx < 0) return Infinity;
  if (idx === 0) return 0; // the origin — always worn
  return SLOT_RENOWN_THRESHOLDS[idx - 1] ?? Infinity;
}

/** Is `classId` available to select given the soul's renown spent and origin starter? */
export function isClassUnlocked(
  classId: ClassId,
  renownSpent: number,
  originClass: ClassId,
): boolean {
  return renownSpent >= classUnlockRenown(classId, originClass);
}

/**
 * Classes whose RELATIVE renown-spent bar was crossed strictly between
 * `prevRenownSpent` (exclusive) and `nextRenownSpent` (inclusive) — the souls a
 * Grove purchase just earned, in ladder (ascending-bar) order. Drives the
 * per-class "a new soul surfaced" reveal fired from the Grove-purchase action.
 * Callers filter to classes that actually have a reveal card, and drop the soul's
 * own class (already worn, not "newly" found).
 */
export function newlyUnlockedClasses(
  prevRenownSpent: number,
  nextRenownSpent: number,
  originClass: ClassId,
): ClassId[] {
  return LADDER_CLASSES.map((id) => ({ id, threshold: classUnlockRenown(id, originClass) }))
    .filter(({ threshold }) => threshold > prevRenownSpent && threshold <= nextRenownSpent)
    .sort((a, b) => a.threshold - b.threshold)
    .map(({ id }) => id);
}

// ─── Relic loadout slots (renown-spent paced) ────────────────────────────────
// The nine TYPED relic slots (content/legendaries.RELIC_SLOTS) open
// PROGRESSIVELY. The first three are free from the start; the remaining six
// unlock as cumulative Renown spent at the Grove crosses the bars below — the
// same tribute axis the class ladder rides, paced conservatively so all nine land
// only over the deep meta. Derived live from renownSpent (the single source of
// truth), exactly as the class unlocks are — no redundant stored count.

/** Relic slots open from the very start, before any Renown is laid down. */
export const STARTING_RELIC_SLOTS = 3;

/**
 * Cumulative RENOWN-SPENT bars that open relic slots 4..9 (slots 1-3 are free).
 * Paced conservatively so the ninth slot only opens deep into the meta. Editable.
 */
export const RELIC_SLOT_RENOWN_THRESHOLDS: readonly number[] = [100, 250, 450, 700, 1050, 1500];

/** How many of the nine typed relic slots are open at this cumulative renown spent (3..9). */
export function unlockedRelicSlots(renownSpent: number): number {
  let n = STARTING_RELIC_SLOTS;
  for (const bar of RELIC_SLOT_RENOWN_THRESHOLDS) {
    if (renownSpent >= bar) n += 1;
  }
  return n;
}

/**
 * The cumulative renown-spent bar at which the relic slot at this 0-based index
 * opens — 0 for the three free starters, then the {@link RELIC_SLOT_RENOWN_THRESHOLDS}
 * bars, Infinity past the ninth slot. Drives the "opens at…" hint on a locked slot.
 */
export function relicSlotUnlockRenown(slotIndex: number): number {
  if (slotIndex < STARTING_RELIC_SLOTS) return 0;
  return RELIC_SLOT_RENOWN_THRESHOLDS[slotIndex - STARTING_RELIC_SLOTS] ?? Infinity;
}

/** Is the relic slot at this 0-based index open at the given cumulative renown spent? */
export function isRelicSlotUnlocked(slotIndex: number, renownSpent: number): boolean {
  return slotIndex < unlockedRelicSlots(renownSpent);
}

/**
 * The slice of meta the unlock helpers read. metaStore's state is a structural
 * superset, so the store can be passed directly.
 */
export interface ProgressionMeta {
  delveCount: number;
  chaptersCleared: number;
  /**
   * Cumulative Renown SPENT at the Grove (account-level, survives reincarnation).
   * The tribute axis — gates the roster reveal and the deeper Grove (see
   * {@link UNLOCKS}). Lives on metaStore.renownSpent; every caller threads it.
   */
  renownSpent: number;
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
  if (cond.renownSpent !== undefined && meta.renownSpent >= cond.renownSpent) return true;
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
  axis: 'delve' | 'chapter' | 'renown';
  threshold: number;
}

/** Reveal-order rank across the (incomparable-unit) numeric axes. */
const AXIS_RANK: Record<LockedFeatureHint['axis'], number> = { delve: 0, chapter: 1, renown: 2 };

/**
 * The next still-locked feature, the axis it opens on, and its threshold (lowest
 * threshold first within each axis; axes ranked onboarding-delve → chapter →
 * renown), or null when everything is unlocked. Drives an optional "next unlock
 * at…" UI hint. Event-gated features (the Grove's first-reincarnation trigger)
 * carry no numeric threshold, so they are omitted from the hint.
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
      if (cond.renownSpent !== undefined) {
        return [{ featureId: id, axis: 'renown', threshold: cond.renownSpent }];
      }
      return [];
    },
  );
  if (locked.length === 0) return null;
  // Lower-ranked axis wins across axes (units aren't comparable); within an axis,
  // the lowest threshold.
  return locked.reduce((lo, f) => {
    if (f.axis !== lo.axis) return AXIS_RANK[f.axis] < AXIS_RANK[lo.axis] ? f : lo;
    return f.threshold < lo.threshold ? f : lo;
  });
}
