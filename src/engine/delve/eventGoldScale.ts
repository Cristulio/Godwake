/**
 * Chapter scaling for EVENT gold — rewards AND the costs that buy them.
 *
 * Event outcomes author flat gold amounts (`{ kind: 'gold_delta', amount: 30 }`),
 * but the rest of the economy climbs hard with depth: mob drops scale by CR,
 * shop racks by chapter, boss-intel fees quadratically. A flat +30 that funded a
 * shop visit in the Iron Cells is pocket lint by the Throne of the Slain God. These
 * helpers ramp an event's gold with the chapter it fires in so the payout — and
 * the matching cost — stays proportional to where the player actually is.
 *
 * CONSERVATIVE by design: the ramp tops out at ~×6 by Ch14, well under the
 * combat/intel curves, so a scaled event stays a worthwhile-but-not-dominant
 * slice of a same-chapter fight, never a jackpot. The Ch14 multiple is the
 * sim-calibration knob.
 */

/** Lowest / highest chapter of the full Cells→Throne chain. */
const MIN_CHAPTER = 1;
const MAX_CHAPTER = 14;

/**
 * Multiple a Ch1-authored gold amount reaches at the deepest chapter. The ramp
 * climbs linearly from the knee (Ch5) to Ch14 and is bowed flat below it (see
 * {@link chapterGoldRamp}). Deliberately modest — a normal fight's gold climbs
 * far steeper, so events never out-earn the fights around them. This is the
 * lever a future economy sim tunes.
 */
export const EVENT_GOLD_CH14_MULTIPLE = 6;

/**
 * Multiple a Ch1-authored HP / temp-HP amount reaches at the deepest chapter.
 * Tuned hotter than gold's ×6 because HP POOLS climb harder than the gold
 * economy across the chain (~×8–10 from L1 to L20), so a flat +5 heal that was
 * a quarter of a Ch1 pool is a rounding error by the Throne unless it grows with
 * it. Set a touch UNDER the pool curve so a scaled heal stays a worthwhile slice,
 * never a full top-up. This is the lever the shrine/omen sim tunes (see
 * `scripts/sim-shrine-omen.ts`).
 */
export const EVENT_HP_CH14_MULTIPLE = 8;

/**
 * Chapter the linear ramp anchors at. From here to Ch14 the multiplier climbs
 * the plain linear ramp (the sim found this band in-band at ~0.6× a fight);
 * below it the sub-ramp is bowed flat so early events don't out-earn a
 * same-chapter fight (see {@link chapterGoldRamp}).
 */
const RAMP_KNEE_CHAPTER = 5;

/** The plain linear multiplier: ×1 at Ch1 → ×ch14Multiple at Ch14. */
function linearRamp(chapter: number, ch14Multiple: number): number {
  return 1 + (chapter - 1) * ((ch14Multiple - 1) / (MAX_CHAPTER - MIN_CHAPTER));
}

/**
 * Generic chapter multiplier for an authored event magnitude, clamped to
 * Ch1..Ch14.
 *
 * Ch5..Ch14 follow the plain linear ramp. Ch1..Ch5 are bowed DOWN below that
 * line: early-game fights pay almost nothing by design, so a linearly-scaled
 * event read as >1× a fight (Ch3 ~1.35×). A convex (quadratic) sub-ramp keeps
 * the Ch1 and Ch5 endpoints exact while pulling Ch2-4 under the line, so an
 * early event stays a slice of a fight, not a jackpot. `ch14Multiple` is the
 * only lever — gold and HP climb the same SHAPE at different heights.
 */
function chapterRamp(chapter: number, ch14Multiple: number): number {
  const c = Math.max(MIN_CHAPTER, Math.min(MAX_CHAPTER, chapter));
  if (c >= RAMP_KNEE_CHAPTER) return linearRamp(c, ch14Multiple);
  const kneeValue = linearRamp(RAMP_KNEE_CHAPTER, ch14Multiple);
  const t = (c - MIN_CHAPTER) / (RAMP_KNEE_CHAPTER - MIN_CHAPTER);
  return 1 + (kneeValue - 1) * t * t;
}

/** Gold multiplier for a chapter (the conservative ×6-by-Ch14 ramp). */
export function chapterGoldRamp(chapter: number): number {
  return chapterRamp(chapter, EVENT_GOLD_CH14_MULTIPLE);
}

/** HP / temp-HP multiplier for a chapter (the hotter ×8-by-Ch14 ramp). */
export function chapterHpRamp(chapter: number): number {
  return chapterRamp(chapter, EVENT_HP_CH14_MULTIPLE);
}

/**
 * Multiplier applied to an event's authored gold when it fires at `chapter`,
 * anchored at the event's own `baseChapter` (its `minChapter`).
 *
 * The anchor is what keeps this conservative. Deep events are ALREADY authored
 * rich — a Ch11 beat hands out +120 by hand — so scaling them from a flat Ch1
 * baseline would double-count into a 700g jackpot. Normalising by the event's
 * floor means an event scales only by how much DEEPER than its authoring chapter
 * it appears: a Ch1 roadside beat grows the full ramp by the endgame, while a
 * Ch11 beat sits at ×1 when it first appears and only creeps up by Ch14.
 *
 * Always >= 1 for a valid placement (events never appear below their minChapter).
 */
export function eventGoldScale(chapter: number, baseChapter: number = MIN_CHAPTER): number {
  return chapterGoldRamp(chapter) / chapterGoldRamp(baseChapter);
}

/**
 * HP / temp-HP multiplier for an event's authored amount, anchored at the
 * event's own `baseChapter` (its `minChapter`) exactly like {@link eventGoldScale}
 * — a flat heal/cost grows only by how much DEEPER than its authoring chapter it
 * appears, so deep-authored events (already balanced for their pool) don't
 * double-count. Always >= 1 for a valid placement.
 */
export function eventHpScale(chapter: number, baseChapter: number = MIN_CHAPTER): number {
  return chapterHpRamp(chapter) / chapterHpRamp(baseChapter);
}

/** Apply a scale to an authored amount, rounded to whole units. Sign-preserving.
 *  Used for gold AND HP — both are flat authored magnitudes scaled by depth. */
export function scaleGold(amount: number, scale: number): number {
  return Math.round(amount * scale);
}
