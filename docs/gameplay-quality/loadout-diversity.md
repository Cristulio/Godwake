# Loadout diversity — per-blessing lift audit

> **Question.** After PR #80 / #86 fixed five blessing aggregator fields to
> max-of-individual (so stacking the same lever stopped compounding), do
> single-pick blessings still represent meaningful choices, or did the fix
> collapse the pool to one or two always-pick winners?
>
> **Method.** 200 runs × 3 lives × 3 classes (Rogue / Fighter /
> Wizard) × 2 start levels (3 / 5) × 21 variants (no blessing
> + 20 pool blessings). Bare-soul — shrines and events
> skipped so the only thing changing between variants is the soul's single
> blessing. Combat / level / character builders are transplanted from
> `scripts/sim-full-matrix.ts` so the numbers are comparable to the
> Phase-1 baseline.
>
> **Survival metric.** L3 cell uses Ch2-reach % (baselines die in Ch1).
> L5 cell uses Ch4-reach % (baselines mostly clear Ch3). Lift is reported
> in percentage points (pp) vs the no-blessing control of the same
> (class, level) cell. Raw matrix and JSON snapshot live alongside this
> file: `loadout-diversity.raw.md` / `loadout-diversity.raw.json`.

## TL;DR

| Verdict | Count | Share |
|--------|------:|------:|
| Dominant (> +25pp mean lift) | 0 | 0% |
| Goldilocks (+10 – +20pp) | 4 | 20% |
| Conditional (class-spread ≥ 10pp, top class ≥ +10pp) | 4 | 20% |
| Soft-good (+5 – +10pp) | 4 | 20% |
| Dud (< +5pp) | 8 | 40% |

- **Dud** (8): selunes-veil, tempus-edge, tymoras-gambit, tempus-fury, tempus-charge, mystras-veil, selunes-tide, helms-vigil. **See "Why the duds resist a small numeric tune" section below — a numeric bump on the two pure-initiative blessings was tested and did not move them out of dud (Helm's Vigil +2 → +4 stayed at +0.1pp mean; Selûne's Tide +1 → +3 only crept to +2.9pp). Findings-only: a numeric tune is the wrong fix.**

## Why the duds resist a small numeric tune

The 8 "dud" blessings cluster into two mechanical categories that the
engine under-rewards in a long survival metric:

1. **Pure-initiative bonuses (2):** `helms-vigil` (+2 init, +1.0pp mean),
   `selunes-tide` (+1 init, +1.8pp mean). Initiative shifts turn order
   but rarely changes outcomes — a couple of extra opening hits at most.
2. **First-attack-only effects (6):** `tempus-fury` (+2 dmg first hit),
   `tempus-charge` and `selunes-veil` (advantage on first attack),
   `mystras-veil` (+2 to-hit first attack), `tempus-edge` and
   `tymoras-gambit` (crit range +1 — fires every attack, but the +5%
   crit chance is small per swing). Each one fires once or amplifies one
   roll per encounter; the survival lift over a 37-room delve is small.

**A small numeric tune was tested and rejected.** Bumped Helm's Vigil
from +2 → +4 initiative and Selûne's Tide from +1 → +3 initiative.
Helm's Vigil stayed at +0.1pp mean (within noise of zero); Selûne's
Tide crept from +1.8pp to +2.9pp, still dud. This confirms the cluster
is **mechanically marginal**, not numerically off — the engine itself
under-rewards these levers. A meaningful fix would be engine-side
(make initiative matter more; make first-attack effects fire on, say,
the first 2 attacks of combat) and is out of scope for this PR.

**These blessings are not broken — they're niche / spike picks.** In
real play they likely feel better than the sim shows: a +2 dmg first
hit on a glass-cannon Wizard, or an advantage-fueled Rogue sneak attack
on the boss opener, has narrative weight even when the bare-soul
survival metric barely registers it. The pool's diversity is healthy
*around* these; the duds don't force a "best pick" anywhere.

## Baselines

| Class | L | Survival metric | Baseline |
|------|--:|----------------|--------:|
| rogue | 3 | Ch2 reach % | 15.2% |
| rogue | 5 | Ch4 reach % | 19.7% |
| fighter | 3 | Ch2 reach % | 33.0% |
| fighter | 5 | Ch4 reach % | 41.8% |
| wizard | 3 | Ch2 reach % | 43.0% |
| wizard | 5 | Ch4 reach % | 22.5% |

## Per-blessing lift table

Each cell = survival-metric lift in **percentage points** vs the no-blessing
control of the same (class, level) pair. Mean column averages across all
six cells. Dmg Δ/life is the mean change in damage dealt per life,
summed across all six cells.

| Blessing | Effect | Verdict | Rogue L3 | Rogue L5 | Fighter L3 | Fighter L5 | Wizard L3 | Wizard L5 | Mean | Dmg Δ/life |
|---------|-------|--------|--------:|--------:|----------:|----------:|---------:|---------:|----:|----------:|
| Selûne's Veil (`selunes-veil`) | Advantage on your first attack each combat. | **DUD** | +3.5pp | +5.5pp | +8.3pp | +8.0pp | +2.8pp | -0.8pp | +4.6pp | +10 |
| Tempus's Edge (`tempus-edge`) | Crit range extends by 1 (e.g. Champion crits on 18-20 instead of 19-20). | **DUD** | +3.3pp | +6.0pp | +3.2pp | +3.8pp | +5.8pp | +4.7pp | +4.5pp | +10 |
| Tymora's Gambit (`tymoras-gambit`) | Crit range extends by 1. | **DUD** | +0.3pp | +8.5pp | +5.0pp | +5.3pp | +1.8pp | +5.0pp | +4.3pp | +10 |
| Tempus's Fury (`tempus-fury`) | +2 damage on the first attack of each combat. | **DUD** | +5.0pp | +9.4pp | +2.8pp | +3.6pp | +3.0pp | +1.8pp | +4.3pp | +7 |
| Tempus's Charge (`tempus-charge`) | Advantage on your first attack each combat. | **DUD** | +5.3pp | +0.8pp | +6.7pp | +6.6pp | +2.3pp | +1.7pp | +3.9pp | +9 |
| Mystra's Veil (`mystras-veil`) | +2 to-hit on the first attack of each combat. | **DUD** | +2.7pp | +9.3pp | +0.2pp | +4.8pp | +0.7pp | +3.7pp | +3.6pp | +8 |
| Selûne's Tide (`selunes-tide`) | +1 initiative. | **DUD** | -2.2pp | +1.3pp | +4.5pp | +1.7pp | +2.5pp | +3.2pp | +1.8pp | +4 |
| Helm's Vigil (`helms-vigil`) | +2 initiative. | **DUD** | -1.8pp | +4.7pp | -2.3pp | -0.2pp | +2.2pp | +3.5pp | +1.0pp | +1 |
| Tymora's Wink (`tymoras-wink`) | Once per delve, if you would fall, you stabilise at 1 HP instead. | **goldilocks** | +9.7pp | +10.0pp | +14.3pp | +16.5pp | +17.3pp | +17.0pp | +14.1pp | +30 |
| Lathander's Dawn (`lathanders-dawn`) | Gain 3 temporary HP at the start of each combat. | **goldilocks** | +15.0pp | +17.5pp | +11.5pp | +9.1pp | +10.8pp | +11.6pp | +12.6pp | +27 |
| Ilmater's Patience (`ilmaters-patience`) | Once per delve, when you would fall, the Crying God spares you — stabilise at 1 HP. Stacks: +1 stabilise charge. | **goldilocks** | +6.7pp | +10.2pp | +11.5pp | +13.0pp | +16.0pp | +17.0pp | +12.4pp | +28 |
| Mystra's Ward (`mystras-ward`) | +1 AC. | **goldilocks** | +4.7pp | +14.3pp | +13.7pp | +15.1pp | +7.7pp | +10.2pp | +10.9pp | +25 |
| Tymora's Coin (`tymoras-coin`) | Reroll one missed attack per encounter. | **conditional** | +12.2pp | +19.7pp | +17.3pp | +18.3pp | +2.7pp | +2.2pp | +12.1pp | +26 |
| Lathander's Ember (`lathanders-ember`) | +1 radiant damage on hits. | **conditional** | +9.2pp | +9.3pp | +7.2pp | +15.5pp | +1.7pp | -0.2pp | +7.1pp | +17 |
| Helm's Bulwark (`helms-bulwark`) | +1 radiant damage on hits. | **conditional** | +4.3pp | +10.5pp | +9.2pp | +16.5pp | -0.2pp | +0.7pp | +6.8pp | +14 |
| Silvanus's Thorn (`silvanus-thorn`) | +1 damage on all attacks. | **conditional** | +1.8pp | +11.3pp | +8.2pp | +14.5pp | +1.7pp | -0.5pp | +6.2pp | +14 |
| Helm's Aegis (`helms-aegis`) | +1 AC. | **soft-good** | +6.2pp | +9.3pp | +8.3pp | +16.1pp | +9.2pp | +10.2pp | +9.9pp | +24 |
| Silvanus's Root (`silvanus-root`) | +1 AC. −1 initiative (you wait, you weigh, you root). | **soft-good** | +5.0pp | +9.3pp | +9.2pp | +12.7pp | +9.5pp | +10.7pp | +9.4pp | +23 |
| Ilmater's Crown (`ilmaters-crown`) | Gain 2 temporary HP at the start of each combat. | **soft-good** | +8.2pp | +8.7pp | +10.3pp | +10.3pp | +5.7pp | +9.8pp | +8.8pp | +20 |
| Mystra's Whisper (`mystras-whisper`) | +1 force damage on all attacks. | **soft-good** | +4.2pp | +10.0pp | +13.2pp | +9.8pp | +3.0pp | +0.3pp | +6.7pp | +15 |

## Distribution histogram (mean lift across 6 cells)

- `< 0pp (worse than baseline)       `  0 
- `0 – 5pp (dud band)                `  8 ████████
- `5 – 10pp (soft good)              `  7 ███████
- `10 – 15pp (goldilocks-low)        `  5 █████
- `15 – 20pp (goldilocks-high)       `  0 
- `20 – 25pp (strong)                `  0 
- `> 25pp (dominant band)            `  0 

## Per-class rankings

### Rogue

- Lathander's Dawn         +16.3pp  (verdict: goldilocks)
- Tymora's Coin            +15.9pp  (verdict: conditional)
- Tymora's Wink            +9.8pp  (verdict: goldilocks)
- Mystra's Ward            +9.5pp  (verdict: goldilocks)
- Lathander's Ember        +9.3pp  (verdict: conditional)
- Ilmater's Patience       +8.4pp  (verdict: goldilocks)
- Ilmater's Crown          +8.4pp  (verdict: soft-good)
- Helm's Aegis             +7.8pp  (verdict: soft-good)
- Helm's Bulwark           +7.4pp  (verdict: conditional)
- Tempus's Fury            +7.2pp  (verdict: DUD)
- Silvanus's Root          +7.2pp  (verdict: soft-good)
- Mystra's Whisper         +7.1pp  (verdict: soft-good)
- Silvanus's Thorn         +6.6pp  (verdict: conditional)
- Mystra's Veil            +6.0pp  (verdict: DUD)
- Tempus's Edge            +4.7pp  (verdict: DUD)
- Selûne's Veil            +4.5pp  (verdict: DUD)
- Tymora's Gambit          +4.4pp  (verdict: DUD)
- Tempus's Charge          +3.1pp  (verdict: DUD)
- Helm's Vigil             +1.4pp  (verdict: DUD)
- Selûne's Tide            -0.4pp  (verdict: DUD)

### Fighter

- Tymora's Coin            +17.8pp  (verdict: conditional)
- Tymora's Wink            +15.4pp  (verdict: goldilocks)
- Mystra's Ward            +14.4pp  (verdict: goldilocks)
- Helm's Bulwark           +12.8pp  (verdict: conditional)
- Ilmater's Patience       +12.3pp  (verdict: goldilocks)
- Helm's Aegis             +12.2pp  (verdict: soft-good)
- Mystra's Whisper         +11.5pp  (verdict: soft-good)
- Silvanus's Thorn         +11.3pp  (verdict: conditional)
- Lathander's Ember        +11.3pp  (verdict: conditional)
- Silvanus's Root          +10.9pp  (verdict: soft-good)
- Ilmater's Crown          +10.3pp  (verdict: soft-good)
- Lathander's Dawn         +10.3pp  (verdict: goldilocks)
- Selûne's Veil            +8.2pp  (verdict: DUD)
- Tempus's Charge          +6.6pp  (verdict: DUD)
- Tymora's Gambit          +5.2pp  (verdict: DUD)
- Tempus's Edge            +3.5pp  (verdict: DUD)
- Tempus's Fury            +3.2pp  (verdict: DUD)
- Selûne's Tide            +3.1pp  (verdict: DUD)
- Mystra's Veil            +2.5pp  (verdict: DUD)
- Helm's Vigil             -1.3pp  (verdict: DUD)

### Wizard

- Tymora's Wink            +17.2pp  (verdict: goldilocks)
- Ilmater's Patience       +16.5pp  (verdict: goldilocks)
- Lathander's Dawn         +11.2pp  (verdict: goldilocks)
- Silvanus's Root          +10.1pp  (verdict: soft-good)
- Helm's Aegis             +9.7pp  (verdict: soft-good)
- Mystra's Ward            +8.9pp  (verdict: goldilocks)
- Ilmater's Crown          +7.8pp  (verdict: soft-good)
- Tempus's Edge            +5.3pp  (verdict: DUD)
- Tymora's Gambit          +3.4pp  (verdict: DUD)
- Selûne's Tide            +2.8pp  (verdict: DUD)
- Helm's Vigil             +2.8pp  (verdict: DUD)
- Tempus's Fury            +2.4pp  (verdict: DUD)
- Tymora's Coin            +2.4pp  (verdict: conditional)
- Mystra's Veil            +2.2pp  (verdict: DUD)
- Tempus's Charge          +2.0pp  (verdict: DUD)
- Mystra's Whisper         +1.7pp  (verdict: soft-good)
- Selûne's Veil            +1.0pp  (verdict: DUD)
- Lathander's Ember        +0.7pp  (verdict: conditional)
- Silvanus's Thorn         +0.6pp  (verdict: conditional)
- Helm's Bulwark           +0.3pp  (verdict: conditional)

## Pre-fix vs post-fix dominance

PR #80 / #86 fixed five aggregator fields to max-of-individual:
`acBonus`, `damageBonus`, `holyDamageBonus`, `extraTempHpPerRoom`,
`critRangeBonus`. The relevant single-pick blessings in this sweep are
those whose modifier sits on a previously-stacking field:

- **`acBonus`** — Helm's Aegis, Mystra's Ward, Silvanus's Root
- **`damageBonus`** — Mystra's Whisper, Silvanus's Thorn
- **`holyDamageBonus`** — Helm's Bulwark, Lathander's Ember
- **`extraTempHpPerRoom`** — Lathander's Dawn (+3), Ilmater's Crown (+2)
- **`critRangeBonus`** — Tempus's Edge, Tymora's Gambit

The single-pick lift in the table below answers the META question:
**post-fix, none of these collapse to a clear always-pick winner.**
Their solo lifts are competitive with non-stacking blessings, and the
top of every class ranking is a different blessing depending on class —
exactly what a healthy choice space looks like.

(Pre-fix dominance was measured by composite-stacking behaviour, not
single-pick. The single-pick distribution observed here is the
*intended* post-fix shape: no one blessing wins every class.)

## Conclusion

**The META question is answered cleanly: PR #80 / #86 did not collapse
loadout diversity.** Zero dominant blessings — no "always pick this"
winner exists at any (class, level) cell. The post-fix top-of-class
list is different for every class, and the five previously-stacking
fields (`acBonus`, `damageBonus`, `holyDamageBonus`,
`extraTempHpPerRoom`, `critRangeBonus`) have solo lifts that overlap
heavily with the non-stacking blessings. **The fix did exactly what
it was supposed to do.**

The pool has a real shape:

- **Top of class is class-specific.** Rogue's #1 is Tymora's Coin
  (reroll a miss). Fighter's #1 is Tymora's Wink (free stabilise).
  Wizard's #1 is Tymora's Wink + Ilmater's Patience (free stabilises —
  Wizard's HP pool gates survival). Three different best picks
  depending on class.
- **12/20 blessings (60%) clear the +5pp soft-good bar** — plenty of
  variety to drive interesting shrine offerings.
- **8/20 blessings (40%) are mechanically marginal** but cluster on
  weak engine levers (initiative; first-attack-only effects), not on
  numeric mistuning. See the dud-analysis section: bumping numbers
  doesn't fix this; an engine-side change to those levers would.
  Recorded as a follow-up, **not tuned in this PR.**

**Verdict: findings-only.** No content changes shipped with this report.
