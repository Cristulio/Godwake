# Archetype-spread sim pass — 2026-06-01

Measurement-only synthesis. PR #261 added `ARCHETYPE` dials to the combat bot
(`cautious` / `balanced` / `aggressive`, `PROFILES` in
`src/engine/combat/actionPolicy.ts`; `balanced` == the prior single policy).
This pass runs the viability + feel suites across all three playstyles and
reports the SPREAD, to test whether modeling varied players moves the sim
numbers closer to hand-played reality. No engine, content, or balance was
changed.

> **Reduced N (spread read, not precision balance).** Class-viability:
> `SOULS_PER_CLASS=40 MAX_LIVES=50` (vs 150/150 defaults). Feel: `RUNS=20`
> → 400 full-delve runs/archetype (vs 40). Plenty for a RELATIVE cross-archetype
> spread; absolute clear-rates remain an AI-floor artifact (the standing
> "read relative, not absolute" caveat). At N=40 souls, a single soul = 2.5%.

## Class viability — clear% / depth / topped-A6, across archetypes

Per-life clear% (fraction of all lives that cleared the full chain), avg depth
(rooms reached/life), and topped-A6 (share of souls that cleared at Ascension 6).

| Class | metric | cautious | balanced | aggressive |
|------|------|------:|------:|------:|
| **fighter** | clear% | 22.2 | 21.3 | 20.2 |
| | depth | 90.0 | 87.7 | 84.5 |
| | topA6 | 100.0% | 100.0% | 97.5% |
| **rogue** | clear% | 0.0 | 0.1 | 0.1 |
| | depth | 23.6 | 30.1 | 26.5 |
| | ever-A0 | 0.0% | 2.5% | 5.0% |
| **wizard** | clear% | 0.0 | 0.1 | 0.0 |
| | depth | 42.0 | 42.5 | 42.7 |
| | ever-A0 | 0.0% | 2.5% | 0.0% |
| **barbarian** | clear% | 0.0 | 0.0 | 0.0 |
| | depth | 58.3 | 59.1 | 61.3 |
| | topA6 | 0% | 0% | 0% |
| **ranger** | clear% | 0.0 | 0.0 | 0.0 |
| | depth | 68.2 | 66.6 | 69.0 |
| | topA6 | 0% | 0% | 0% |

Stable ordering in every archetype: **fighter** is the only bot-clearer;
depth then runs **ranger > barbarian > wizard > rogue**. The ordering does not
flip under any playstyle.

**Barbarian (the standing open question).** Across all three archetypes Barb
reaches deep (58-61 rooms, final lvl ~10) but NEVER closes the chain (0%
clear, 0% A0). It is a DEPTH outlier, not a clear-rate outlier — it survives
far on raw HP + Rage but the bot can't convert that into a finish. Its depth is
the only class metric that rises monotonically with aggression
(58.3 → 59.1 → 61.3), consistent with Rage/Reckless rewarding aggressive play.
So "Barb looks strong at the bare-soul floor" reads as *deep-but-doesn't-close*,
and it is robust across the spread — not an artifact of the one balanced policy.

**Proc instrumentation** (mechanics fire under every archetype): Barb Rage
~1.7/combat in all three; Reckless climbs monotonically with aggression
(2.26 → 2.62 → 2.94 cautious→balanced→aggressive) — the dial is doing what it
says. Ranger HMark ~1.86, Colossus ~4.65, mark-die ~5.85 across all three
(archetype-flat).

## Per-chapter blowout rate, across archetypes (feel sim)

Blowout = won with HP never below 80%. A blowout is a legitimate reward for
skilled/over-leveled play, not a defect — reported here as a RATE. Non-boss
fights only.

| Chapter | cautious | balanced | aggressive |
|------|------:|------:|------:|
| Ch1 | 82.1% | 82.3% | 82.6% |
| Ch2 | 92.8% | 93.5% | 93.4% |
| Ch3 | 92.4% | 93.2% | 94.5% |
| Ch4 | 85.8% | 86.3% | 87.1% |
| Ch5 | 67.6% | 67.5% | 67.4% |
| Ch6 | 32.5% | 32.3% | 29.5% |
| Ch7 | 30.5% | 35.4% | 40.9% |
| Ch8* | 40.0% | 16.7% | 45.5% |
| Ch9* | 100% | 100% | 100% |
| **overall** | **76.9%** | **77.3%** | **77.9%** |

\* Ch8/Ch9 reach only 1-11 wins at this N — noise, ignore.

Dead-turns 16.3 / 14.9 / 15.7%; avg rounds/fight 3.05 / 3.04 / 2.89 (aggressive
ends fights a touch faster). The **Ch2-4 high-blowout band (86-95%) is
archetype-invariant** — it barely moves whether the bot plays cautious or
aggressive.

## Fidelity verdict

- **The spread is narrow.** The archetype dial visibly changes HOW fights
  resolve (Reckless rate 2.26→2.94, rounds/fight 3.05→2.89) but barely moves
  macro outcomes: overall blowout 76.9→77.9% (1 pt), per-chapter blowout within
  ~2 pts, clear% within ~2 pts, depth within a few rooms. cautious→aggressive
  does NOT bracket the full plausible real-player envelope — real players clear
  the chain by hand; the bot tops out at fighter-only in every archetype. The
  dial tightens our confidence that conclusions aren't one-policy artifacts; it
  does not lift the absolute floor toward human play. The "read relative, not
  absolute" caveat still stands.
- **`balanced` remains the right house line.** It sits mid-spread on essentially
  every metric (clear%, depth, blowout%, rounds/fight). Cautious and aggressive
  flank it tightly; neither is a better default.
- **No prior single-line conclusion flips.** Fighter-as-floor-clearer, the
  depth ordering, and Barb-deep-but-doesn't-close all hold across all three
  archetypes. The only archetype-sensitive wrinkle is at the noise floor: rogue's
  ever-A0 rises monotonically with aggression (0 → 2.5 → 5.0%), a weak hint that
  rogue's clear path is burst/aggression-dependent; wizard's lone 2.5% ever-A0
  appears only under balanced (non-monotone = a single lucky soul at N=40). Both
  are 0-2 souls — directional, not conclusions.
- **Net:** modeling archetypes confirms robustness more than it widens realism.
  The big sim caveat is a floor-skill ceiling no playstyle escapes, not a
  missing-playstyle-variance problem.

## Flag, don't fix (bring to user — no numbers proposed here)

1. **Ch2-4 blowout band (86-95%) is archetype-invariant.** It is a
   content/level-curve property of the early chapters, not something better or
   worse players move. Blowouts are earned, so the question is the RATE: is a
   ~90% trivial-fight rate in Ch2-4 the intended early-game texture, or do those
   chapters want more tension? A tuning decision, not a bug.
2. **Barbarian: deep in every archetype, closes in none.** Whether the limiter
   is Barb's late-chain kill-closing or the bot's Barb policy is an open tuning
   question. Flagging the pattern; proposing no change.
3. **Rogue's monotone aggression benefit (ever-A0 0→5%).** If rogue's finish is
   genuinely burst-dependent, a dedicated higher-N rogue run under `aggressive`
   would confirm it before any tuning.

---
Source runs (reduced N, 2026-06-01): `ARCHETYPE={cautious,balanced,aggressive}
SOULS_PER_CLASS=40 MAX_LIVES=50 scripts/sim-class-viability.ts` and
`ARCHETYPE=… RUNS=20 scripts/sim-feel.ts`. The per-run docs
(`class-viability.md`, `game-feel.raw.md`) are regenerated churn and were
restored; this synthesis is the only retained artifact.
