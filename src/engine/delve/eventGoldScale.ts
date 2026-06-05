/**
 * Chapter scaling for EVENT gold — rewards AND the costs that buy them.
 *
 * Event outcomes author flat gold amounts (`{ kind: 'gold_delta', amount: 30 }`),
 * but the rest of the economy climbs hard with depth: mob drops scale by CR,
 * shop racks by chapter, boss-intel fees quadratically. A flat +30 that funded a
 * shop visit in the Iron Cells is pocket lint by the Throne of Bhaal. These
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
 * Multiple a Ch1-authored gold amount reaches at the deepest chapter. Linear
 * ramp between, so each chapter adds a fixed step. Deliberately modest — a
 * normal fight's gold climbs far steeper, so events never out-earn the fights
 * around them. This is the lever a future economy sim tunes.
 */
export const EVENT_GOLD_CH14_MULTIPLE = 6;

/**
 * Linear gold multiplier for a chapter: ×1 at Ch1 climbing to
 * ×EVENT_GOLD_CH14_MULTIPLE at Ch14. Clamped for out-of-range chapters.
 */
export function chapterGoldRamp(chapter: number): number {
  const c = Math.max(MIN_CHAPTER, Math.min(MAX_CHAPTER, chapter));
  return 1 + (c - 1) * ((EVENT_GOLD_CH14_MULTIPLE - 1) / (MAX_CHAPTER - MIN_CHAPTER));
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

/** Apply a gold scale to an authored amount, rounded to whole gold. Sign-preserving. */
export function scaleGold(amount: number, goldScale: number): number {
  return Math.round(amount * goldScale);
}
