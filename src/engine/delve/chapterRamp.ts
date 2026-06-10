/**
 * Per-chapter difficulty ramp for the BASE game (Ascension 0). Returns the
 * multipliers on enemy max HP and per-attack damage for a given chapter, folded
 * into the SAME createCombat seam ascension uses (enemyHpMult / enemyDamageMult)
 * so it stacks MULTIPLICATIVELY with ascension and applies even at Ascension 0.
 *
 * WHY this exists: the per-chapter monster stat blocks were the whole Ascension-0
 * curve, and they under-paced compounding player power (levels, affix gear,
 * blessings, spell tiers, extra attacks) from the mid-game on — so the back half
 * of a run was EASIER than the front. This inverts the arc: enemies grow harder
 * faster than the player from Ch5 on, steepest into the Throne of the Slain God (Ch13-14),
 * which becomes the hardest content in the game.
 *
 * Shape:
 *  - Ch1-4: EXACTLY 1.0 / 1.0. The early grind is a design pillar and must not move.
 *  - Ch5-12: geometric growth per chapter past the Ch4 anchor.
 *  - Ch13-14 (Throne of the Slain God): a steeper kicker compounded on top of the
 *    geometric growth, so reaching Maevra demands a Grove-carried soul.
 *  - Clamped to a sane band so a stray chapter index can never produce a
 *    degenerate fight (mirrors {@link ascendantChapterScale}, #539).
 *
 * SIM-TUNED (2026-06-09, `scripts/sim-difficulty-arc.ts` @ SOULS=40 LIVES=80,
 * fighter+monk, 3 Grove tiers × ramp on/off; findings in
 * docs/sim-findings/difficulty-arc.md). The provisional 1.06/1.06/1.12 seam
 * overshot the MID-SECTION: the full-Grove tail died in a pile at Ch9-11
 * (420/301/417 of 3200 lives) and only 12 lives ever entered ToB — the slog,
 * not the Throne, was the wall. Retuned to flatten the climb and steepen the
 * cliff (growth 1.045, ToB kicker 1.18 → Ch12 ≈ 1.42×, Ch14 ≈ 1.98×): the
 * full-Grove tail now rides to Ch12-13 and dies AT the Throne, which is the
 * owner-approved shape — ToB is the hardest content, carried by the kicker.
 * Band: bare soul walls early/mid with ToB ≈ 0 (never impossible — owner
 * ruling "brutally unlikely"); mid-Grove walls ~Ch9-12; full-Grove reaches ToB
 * and dies there, not before. Do NOT hand-tune the numbers here — change them
 * only on the back of a sim run ([[feedback-balance-from-sims]]).
 */

export interface ChapterRamp {
  /** Multiplier on every enemy's max HP for this chapter (1 = neutral). */
  hpMult: number;
  /** Multiplier on every landed enemy attack's damage for this chapter (1 = neutral). */
  damageMult: number;
}

/** Last chapter the ramp leaves untouched — Ch1-4 are exactly 1.0/1.0 (early-grind pillar). */
const RAMP_ANCHOR_CHAPTER = 4;
/** Per-chapter geometric growth past the anchor, applied Ch5→12. SIM-TUNED (see header). */
const HP_GROWTH_PER_CHAPTER = 1.045;
const DAMAGE_GROWTH_PER_CHAPTER = 1.045;
/** First Throne-of-the Slain God chapter — Ch13-14 carry the steeper kicker. */
const TOB_FIRST_CHAPTER = 13;
/**
 * Extra per-chapter multiplier compounded across the ToB act, ON TOP of the
 * geometric growth (Ch13 ×kicker¹, Ch14 ×kicker²). SIM-TUNED (see header) —
 * deliberately the steepest step in the game: the Throne is the cliff.
 */
const TOB_KICKER_PER_CHAPTER = 1.18;
/**
 * Safety clamp so a stray/legacy chapter index can't produce a degenerate fight.
 * At the provisional constants the deepest chapter (Ch14) lands well inside this
 * band (≈2.25× both), so the cap is a guard rail, not an active lever — but the
 * tuning pass should watch boss-fight TIMEOUTS at deep chapters (the HP lever
 * lengthens fights; see the MAX_BOSS_HP_MULT lesson in ascension.ts).
 */
const MAX_HP_MULT = 3;
const MAX_DAMAGE_MULT = 2.5;

/**
 * The HP + damage multipliers an Ascension-0 fight in `chapter` carries from the
 * difficulty ramp. Pure, data-driven, monotonic non-decreasing in `chapter`, and
 * exactly neutral (1.0/1.0) through {@link RAMP_ANCHOR_CHAPTER}.
 */
export function chapterRamp(chapter: number): ChapterRamp {
  if (!Number.isFinite(chapter) || chapter <= RAMP_ANCHOR_CHAPTER) {
    return { hpMult: 1, damageMult: 1 };
  }
  const steps = chapter - RAMP_ANCHOR_CHAPTER;
  let hp = HP_GROWTH_PER_CHAPTER ** steps;
  let dmg = DAMAGE_GROWTH_PER_CHAPTER ** steps;
  if (chapter >= TOB_FIRST_CHAPTER) {
    const tobSteps = chapter - (TOB_FIRST_CHAPTER - 1); // Ch13 → 1, Ch14 → 2
    const kicker = TOB_KICKER_PER_CHAPTER ** tobSteps;
    hp *= kicker;
    dmg *= kicker;
  }
  return {
    hpMult: Math.min(MAX_HP_MULT, Math.max(1, hp)),
    damageMult: Math.min(MAX_DAMAGE_MULT, Math.max(1, dmg)),
  };
}
