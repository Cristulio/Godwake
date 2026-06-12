/**
 * Diminishing returns on Armor Class — the compressed value a MONSTER's swing
 * actually rolls against. Raw AC at or below {@link AC_SOFTCAP} passes through
 * untouched; above it every further point buys geometrically less:
 *
 *   eff(AC) = 20 + round(10 × (1 − r^(AC − 20))),  r = {@link AC_DECAY_R}
 *
 * With r = 0.9 the curve climbs 21→21, 22→22, 24→23, 26→25, 28→26, 30→27,
 * 34→28 and flattens toward (never past) 30 — more armour is ALWAYS at least
 * as good, but a 34-AC wall and a 19-AC mage no longer live in different
 * games. r is THE tuning knob: closer to 1 = gentler compression. Provisional
 * until the post-merge to-hit probe sims it.
 *
 * Scope: applied ONLY where monsters roll against the player's AC — the
 * target-AC read in monsterAttack and the Shield reaction's would-it-miss
 * check. Player attacks against monster AC, and every character-sheet /
 * HUD display of the player's own AC, stay raw.
 */
export const AC_SOFTCAP = 20;
/** Geometric decay per point past the softcap — the tuning knob. */
export const AC_DECAY_R = 0.9;
/** Ceiling on compressed gain past the softcap (eff never exceeds 20 + this). */
const AC_GAIN_ASYMPTOTE = 10;

/** Highest raw AC the lookup covers; beyond it the curve is integer-flat, so
 *  higher inputs clamp to the table edge. */
const TABLE_MAX = 60;

// Generated once from the formula above — integer in, integer out, so dice
// comparisons stay whole-number honest. Index i holds eff(AC_SOFTCAP + 1 + i).
const EFFECTIVE: readonly number[] = Array.from(
  { length: TABLE_MAX - AC_SOFTCAP },
  (_, i) => AC_SOFTCAP + Math.round(AC_GAIN_ASYMPTOTE * (1 - Math.pow(AC_DECAY_R, i + 1))),
);

export function effectiveAC(rawAC: number): number {
  if (rawAC <= AC_SOFTCAP) return rawAC;
  return EFFECTIVE[Math.min(rawAC, TABLE_MAX) - AC_SOFTCAP - 1];
}
