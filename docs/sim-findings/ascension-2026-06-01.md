# Ascension system — measurement pass (2026-06-01)

Diagnostic only. No engine/content/balance changed. Two existing sims were given
an `ASCENSION` knob + light instrumentation (scripts only):

- `scripts/sim-feel.ts` — added `ASCENSION` env (mirrors `ARCHETYPE`), threaded
  through `createGodwakeDelve` + `createCombat`, plus a normal/elite/boss
  fight-kind breakout. Swept Asc **0/2/3/5/6**, balanced archetype, `RUNS=20`
  (≈8k fights/level, character config held fixed = a clean difficulty read).
- `scripts/sim-endgame-gear.ts` — the #273 legendary-ceiling meta-journey, now
  faithfully granting the **ascendant** tier at Asc≥3 (the sim previously called
  `legendaryDropPool(classId)` / `rollLegendaryOffer` with no ascension arg, so it
  never banked an apex relic — a real modelling gap). Added an ascendant-relic
  bucket + a renown-by-ascension cut. `SOULS_PER_CLASS=40 MAX_LIVES=50`.

> Absolute clear-rates are the usual AI-floor artifact (the bot underplays). Over
> the full 14-chapter chain a bare-to-mid soul clears ~0% at **every** ascension,
> so clear%/deaths-per-100 don't separate the levels here — **depth reached** and
> **tension** (blowout %, min-HP, boss/elite round counts) carry the difficulty
> read. Read the SHAPE, not the magnitudes.

---

## Verdict

1. **Difficulty scales right.** Depth falls monotonically every step
   (44.4 → 36.2 → 34.2 → 32.8 → 30.9 rooms reached as Asc climbs 0→6) and tension
   tightens (overall blowout 68%→60%, mean min-HP 77%→72%). No step is *easier*.
   The only near-flat step is **A2→A3 on trash**, and that's correct-by-design:
   A3's new lever is boss-only (+25% boss HP + second-wind), so normal/elite
   fights barely move while **bosses** sharpen hard there (see Q3).
2. **Apex relics stay in band — no runaway.** Even at the apex relic count,
   high-ascension lives still **die ~26 per 100** and don't blow past the
   blowout/depth band; the clear gradient across relic buckets is the same
   selection/whole-package effect #273 already isolated (deep souls *accumulate*
   apex relics because they're strong, not the reverse). No apex-tier tuning
   indicated on this evidence.
3. **The new threats bite at their thresholds.** Ascendant elites land as a real
   spike at **A2** (elite fight length +41%, far beyond the flat ramp normals
   see); boss second-wind + boss-HP land as a real spike at **A3** (boss length
   +14%, min-HP −3.7pts at the threshold, then accelerating to A6). Neither is a
   no-op.
4. **Reward tracks effort — generously.** Mean renown/run climbs every band and
   compounds well past the bare ladder multiplier (A0→A6 ≈ **13×** realized vs
   the 2.45× ladder mult), because depth × `renownMult` × soul-mark all grow
   together and multiply (confirmed in `finishDelve`'s formula).

Bottom line: the ascension ladder is healthy. One thing for the user to eyeball
(direction only, no number): see the **flag** at the end.

---

## Q1 — Difficulty by ascension level (balanced, fixed character power)

`sim-feel`, ASCENSION swept, everything else held constant. Difficulty = depth +
tension (clear% is AI-floored at ~0% at all levels, so it's omitted as a
non-discriminating column).

| Asc | Mean rooms reached (depth) | Mean min-HP / fight | Overall blowout % |
|----:|---------------------------:|--------------------:|------------------:|
| 0   | 44.4 | 77.4% | 68.0% |
| 2   | 36.2 | 74.4% | 63.4% |
| 3   | 34.2 | 75.0% | 64.7% |
| 5   | 32.8 | 72.7% | 60.3% |
| 6   | 30.9 | 72.2% | 59.8% |

- **Depth** is the cleanest signal and is strictly monotone harder every step.
- **Tension** (blowout↓, min-HP↓) trends harder with one plateau at A2→A3 —
  fully explained by the per-kind breakout below (A3 is a boss-only step).

## Q3 — Do the new threats bite at their thresholds?

Same sweep, split by fight kind. The point of the split is to separate the
**ascension-gated content** (ascendant elites @≥2, boss second-wind @≥3) from the
**flat stat ramp** (every enemy +HP/+dmg), which `normal` fights isolate.

| Asc | normal blow% / rounds | elite blow% / min-HP / rounds | boss blow% / min-HP / rounds |
|----:|----------------------:|------------------------------:|-----------------------------:|
| 0   | 71.7% / 3.23 | 61.3% / 70.0% / **4.00** | 56.3% / 70.1% / 3.09 |
| 2   | 67.3% / 3.34 | 55.2% / 63.8% / **5.63** | 51.2% / 66.7% / 3.12 |
| 3   | 69.6% / 3.21 | 56.4% / 64.4% / 5.58 | 47.5% / 63.0% / **3.55** |
| 5   | 65.6% / 3.31 | 49.1% / 63.6% / 5.87 | 43.2% / 59.2% / 3.73 |
| 6   | 64.9% / 3.31 | 51.3% / 63.8% / 6.00 | 40.5% / 56.3% / **4.17** |

**Ascendant elites @ Asc≥2 — BITES.** Across the A0→A2 threshold, *elite* fights
harden far beyond the flat ramp:

- elite rounds **4.00 → 5.63 (+41%)**, while normal rounds 3.23→3.34 (+3%).
- elite min-HP 70.0% → 63.8% (−6.2pts), vs normal 80.4% → 78.1% (−2.3pts).
- elite win-rate 90.7% → 85.2%.

A single CR13–15 ascendant standing the elite room alone reads exactly as
intended — a longer, leaner slug that the flat HP bump alone can't produce. The
elevation persists (elite rounds stay ~5.6–6.0 through A6).

**Boss second-wind @ Asc≥3 — BITES.** Bosses are flat across A0→A2 (rounds
3.09→3.12 — A2 doesn't touch them), then jump at the A3 threshold:

- boss rounds **3.12 → 3.55 (+14%)**, min-HP 66.7% → 63.0% (−3.7pts), blowout
  51.2% → 47.5%. Then accelerates to A6 (rounds 4.17, min-HP 56.3%, blowout 40.5%).

Caveat: A3 stacks the +25% boss-HP modifier on the same step, so the lengthening
is HP **and** second-wind combined — this sim can't cleanly split the two. But
the boss-specific jump at exactly the gated threshold confirms the mechanic is
not a no-op.

## Q2 — Do the apex (ascendant) legendaries overshoot?

`sim-endgame-gear` (now granting the apex tier at Asc≥3). High-ascension lives
(Asc≥3, where ascendant relics exist) bucketed by equippable ascendant-relic
count at descent. A runaway would be clear%→~100 / deaths→0 / blowout→~100 as
relics pile up.

| Ascendant relics | Lives | Clear % | Deaths/100 | Blowout % (won fights) | Mean min-HP/fight | Mean depth |
|------------------|------:|--------:|-----------:|-----------------------:|------------------:|-----------:|
| 0   | 49  | 44.9% | 55.1 | 78.3% | 87.7% | 102.8 |
| 1   | 11  | 18.2% | 81.8 | 79.7% | 86.7% | 54.0 |
| 2   | 11  | 36.4% | 63.6 | 84.9% | 90.7% | 94.5 |
| 3+  | 126 | 73.8% | 26.2 | 87.3% | 93.2% | 125.6 |

**No runaway.** At the apex relic count (3+, the bulk at n126) souls still **fail
~26% of runs** and blowout sits at 87% — high, but these are over-levelled
veterans deep in the chain who steamroll *trash* yet still get killed at
bosses/ascendant-elites. The 1- and 2-relic rows are tiny (n11) and noisy; the
0→3+ clear gradient (45%→74%) is dominated by the **same confound #273 named**:
the deepest-progressed souls (highest level, deepest Grove, most *total*
legendaries) are the ones that both reach Asc≥3 and pick up apex relics — they're
not strong *because* of the apex tier, they collect it *because* they're strong.
Apex relics ride on top of that package without flattening lethality to zero,
which is exactly the #273 conclusion holding through the new tier. No apex-tier
slot/effect tuning warranted on this evidence.

## Q4 — Reward tracks effort?

Mean renown earned per life by ascension. Renown = `base(depth + bosses)` ×
`renownMult` (the ladder) × `soulMarkMultiplier` — all three multiply, and all
three grow with ascension, so realized renown climbs faster than the bare ladder.

| Ascension | Lives | Mean renown/life | Ratio vs A0 | Ladder renownMult |
|----------:|------:|-----------------:|------------:|------------------:|
| A0 | 9314 | 63.4  | 1.00× | 1.00 |
| A1 | 161  | 319.4 | 5.04× | 1.25 |
| A2 | 161  | 284.6 | 4.49× | 1.45 |
| A3 | 75   | 427.6 | 6.75× | 1.65 |
| A4 | 53   | 516.2 | 8.15× | 1.90 |
| A5 | 35   | 790.1 | 12.47× | 2.15 |
| A6 | 34   | 824.5 | 13.01× | 2.45 |

- Reward climbs strongly with ascension (≈13× A0→A6) and the `renownMult` ladder
  is applied multiplicatively as designed.
- The only non-monotone step is A1→A2 (319→285), a small-sample dip — A2 adds the
  +1 enemy-damage modifier which thins depth before the soul out-levels it, so
  those lives bank slightly less base renown. It recovers monotonically A2→A6.
- The realized curve is *generous* (climbing pays a lot, because effort compounds
  three ways). That's reward-tracks-effort working — see the flag below if the
  user wants it flatter.

---

## Flags (direction only — change nothing without a balance sim)

- **Renown curve is steep/generous.** Realized renown/run grows ~13× across the
  ladder (vs the 2.45× bare mult) because depth × ladder × soul-mark compound. If
  the intent is for high-ascension grinding to feel *rewarding but not a renown
  fountain*, the lever to eyeball is whether the ladder `renownMult` should ramp
  more gently given the base-renown and soul-mark growth already riding under it.
  Not a bug — flagging the magnitude for a taste call.
- Everything else is in band: difficulty monotone harder, apex relics no runaway,
  both gated threats bite. No tuning indicated.
