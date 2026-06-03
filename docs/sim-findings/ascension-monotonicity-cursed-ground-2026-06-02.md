# sim2 — Ascension monotonicity + cursed-ground validation (2026-06-02)

main @ 793de02 · `scripts/sim-feel.ts` · RUNS=20 × 20 seeds = 400 runs/level · ASCENSION ∈ {0,2,4,6}

Gated sim pass. Measurement only — no game/balance code touched. Validates #336
(cursed-ground front-load + decay) and re-checks the ascension difficulty ladder.

## Per-ascension headline

| Asc | meanRooms (depth) | meanMinHP | blowout% | normal win | elite win / rds | boss win / rds | twist-norm |
|-----|------|------|------|------|------|------|------|
| 0 | 40.6 | 79.7% | 75.2% | 97.2% | 85.0% / 5.24 | 95.4% / 3.36 | — (gated ≥4) |
| 2 | 34.6 | 78.5% | 73.2% | 96.1% | 84.3% / 6.50 | 95.3% / 3.39 | — (gated ≥4) |
| 4 | 30.7 | 76.6% | 71.2% | 96.2% | 84.4% / 6.54 | 91.5% / 4.01 | 93.9% win / 64.2% blow |
| 6 | 28.0 | 75.6% | 70.7% | 96.0% | 84.1% / 6.43 | 89.8% / 4.45 | 94.6% win / 62.1% blow |

clear% is AI-floored at 0% (bare-soul bot, no loot) every level — depth/minHP/blowout carry the read, as in prior passes.

## 1. Monotonicity — HOLDS, strict on all three axes

- **Depth (meanRooms):** 40.6 → 34.6 → 30.7 → 28.0. Strictly decreasing 0→6. Player reaches less far each step. (Slightly deeper than last pass's 38.4/30.8/27.7/25.7 across the board — consistent with the #337/#338 martial-pool buff lifting reach a touch; the *shape* is unchanged and still monotone.)
- **Mean min-HP:** 79.7% → 78.5% → 76.6% → 75.6%. Strictly decreasing. Fights bite harder each step.
- **Blowout%:** 75.2% → 73.2% → 71.2% → 70.7%. Strictly decreasing. Fewer zero-tension wins each step.

No non-monotonic step on any headline axis. Ladder is healthy.

## 2. Cursed ground (#336) — OVER-BITE GONE ✅

Cursed-ground was, across 4 prior passes, the **lone twist that dropped the player WIN rate** (twisted rooms ~42-44% blowout came with a depressed win%). After #336 reshaped it from 5%/turn-every-turn → front-loaded spike (~10% turn-0, decaying to 0 over 4 turns, ~25% total cap regardless of fight length), the win-rate over-bite is removed:

**Per-twist (normal rooms only) — win rate is the validation metric:**

| Twist | Asc4 win | Asc4 blow | Asc4 minHP | Asc6 win | Asc6 blow | Asc6 minHP |
|-------|------|------|------|------|------|------|
| bloodscent    | 96.4% | 62.1% | 76.6% | 95.0% | 65.7% | 76.9% |
| **cursed-ground** | **92.2%** | **37.4%** | **64.2%** | **95.2%** | **31.0%** | **62.5%** |
| gloom         | 96.6% | 70.2% | 78.2% | 95.4% | 72.6% | 78.8% |
| quickening    | 93.4% | 71.7% | 78.3% | 94.5% | 60.3% | 69.1% |
| sealed-wards  | 90.5% | 75.8% | 77.3% | 92.9% | 73.8% | 77.5% |

**Verdict: the over-bite is gone.** Cursed-ground's win rate is now squarely in the twist pack — Asc4 92.2% (sealed-wards is actually lower at 90.5%), Asc6 95.2% (mid-pack, not lowest). It is no longer the lone win-rate dropper that flagged for four passes.

**It is still the tension leader, by design and correctly so.** Cursed-ground keeps the lowest blowout% (37.4% / 31.0% vs 60-76% for the others) and lowest min-HP (~63-64% vs 69-79%). That's the intended shape: it reliably puts teeth on a fight (you *will* dip) without converting that into deaths. Per the "blowouts are earned — target the rate, not zero" pillar, a twist that guarantees tension yet stays winnable is the healthy outcome, not a remaining outlier. Round counts (~4.0-4.4) match the other twists, confirming the decay bounds total chip so it no longer compounds with fight length.

## 3. Per-gate bite — all three landing

- **Ascendant elites (@≥2):** elite avg rounds 5.24 (A0) → 6.50 (A2) → 6.54 (A4) → 6.43 (A6). The +24% step lands exactly at Asc2 and holds; elite min-HP ~68% vs ~80%+ normal. Gate bites.
- **Boss second-wind (@≥3):** boss rounds 3.36 / 3.39 / 4.01 / 4.45 — flat through A2, then steps up from A4 onward (first sweep point past the gate). Boss win 95.4→95.3→91.5→89.8 and boss blowout 70.8→68.8→63.4→61.3 both fall off after the gate. Gate bites.
- **Twists (@≥4):** twist-norm n=0 at Asc0/2, appears only at Asc4/6. Gated exactly at 4. Confirmed.

## Directions (no tuning performed)

- **Cursed-ground: leave it.** #336 did the job. It converted from a win-rate dropper into the deliberate tension twist. No further softening — softening more would erase its only distinguishing teeth.
- **Ladder monotone and healthy** on depth/minHP/blowout 0→6. No action.
- Watch item only: cursed-ground's blowout gap (~30% vs ~65% pack) is large but is now a *tension* signature, not a lethality one. If future passes show its **win rate** dipping below the pack again, revisit — but as of this pass it does not.
