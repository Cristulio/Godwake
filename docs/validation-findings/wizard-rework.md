# Wizard rework — deep validation (PR #85 follow-up)

_Generated 2026-05-28 by `scripts/sim-validate-wizard-rework.ts`. Re-run with `npx tsx scripts/sim-validate-wizard-rework.ts`. Wall clock ~6s for 4,500 Shield attacks + 2,100 Sculpt casts + 300 paired uplift casts + 400 full delves._

## TL;DR

| Mechanic | Verdict | Notes |
|---|---|---|
| Shield as true reaction | **Working as designed** | Auto-fires on hits where +5 AC flips to a miss, never on crits, perfect 1:1 slot conservation, ~25% trigger rate, ~13 dmg/trigger prevented. No bug. |
| Sculpt-spells +1 die | **Working as designed** | 100% dice-count match across 2,100 casts (3/4 Burning Hands, 8/9 Fireball/Lightning). Paired-seed Burning Hands L1→L3 uplift +6.75 dmg/cast (+31.4%) — matches 1 extra d6. |
| L7 Director walls | **Regressed vs cited baseline, flag for next round** | Vacuum L7 wizard still dies 100% of the time at the Director (n=60 reached). Magistrate wall 62.4% (n=194). Cited 56% baseline was likely Grove+blessings kit, not vacuum. Suggest deeper fix below. |

No narrow implementation bug. No fix applied in this PR.

## Part 1 — Shield as true reaction

Setup: a fresh L3/L5/L7 wizard takes exactly one boss/elite attack (round-2, so paralyze gates don't preempt). Run 500 times per cell. For every Shield trigger, the seed is replayed with `shield` stripped from `knownSpells` to measure damage prevented and near-death saves.

| Cell | Attacks | Hits landed | Crits | Shield triggers | Trigger % | Slot 1 consumed | False fires (crit) | Avg dmg prevented | Near-death saves |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| L3 vs Hollow Sage | 500 | 181 | 33 | 131 | 26.2% | 131 | 0 | 9.2 | 40 |
| L3 vs Magistrate | 500 | 223 | 26 | 113 | 22.6% | 113 | 0 | 14.4 | 108 |
| L3 vs Director | 500 | 242 | 19 | 130 | 26.0% | 130 | 0 | 13.3 | 108 |
| L5 vs Hollow Sage | 500 | 177 | 29 | 136 | 27.2% | 136 | 0 | 8.9 | 0 |
| L5 vs Magistrate | 500 | 217 | 30 | 130 | 26.0% | 130 | 0 | 14.6 | 19 |
| L5 vs Director | 500 | 266 | 36 | 130 | 26.0% | 130 | 0 | 13.1 | 16 |
| L7 vs Hollow Sage | 500 | 182 | 30 | 125 | 25.0% | 125 | 0 | 9.4 | 0 |
| L7 vs Magistrate | 500 | 219 | 21 | 124 | 24.8% | 124 | 0 | 14.4 | 0 |
| L7 vs Director | 500 | 255 | 24 | 113 | 22.6% | 113 | 0 | 12.9 | 0 |

**Observations**

- **Trigger rate** is steady at 22–27% across all 9 cells. Mechanism is the "+5 AC would flip hit→miss" check, so the rate is bounded by the slice of d20 outcomes that fall in `[AC, AC+4]` for the attacker's bonus. Sane.
- **Slot conservation**: every cell shows N triggers ⇒ N slots consumed. No double-decrement, no fire-without-spend.
- **False fires (crit + shield)**: 0 across 4,500 attacks. Crit branch correctly bypasses Shield per RAW.
- **Damage prevented**: ~13–14 per trigger vs bosses (3d6+4 / 2d8+4 average), ~9 per trigger vs generic Hollow Sage (3d6+1). Multiplied across ~25% of incoming attacks, that's significant mitigation.
- **Near-death saves**: drops off at higher level because the wizard has more HP and a single hit rarely crosses the half-max threshold. The "half max" cutoff is conservative — actual lethal-hit prevention is captured better in Part 3's delve numbers.

**Pre/post Director death-rate question**

PR #85 description references "L7 Wizard Director death rate before: 56% → expected drop". That 56% appears to have been measured from the earlier `immortal-hypothesis-matrix` sim with full Grove + blessings loadout, not a vacuum wizard. My delve runs (Part 3) use vacuum wizards and show no improvement at Director (still 100% of those who reach it). Shield helps survivability per-attack but does not change the structural Magistrate/Director Hold-Person wall — see Part 3 verdict.

## Part 2 — Sculpt-spells +1 die

Setup: fresh wizard at the target level casts the spell at a 3-goblin room, 300 times per cell. Roll-line dice count is extracted from the log and compared to the expected count.

| Cell | Casts | Expected dice | Observed dice | Match rate | Avg dmg/cast | Goblins killed / cast | Room cleared |
|---|---:|---:|---:|---:|---:|---:|---:|
| L1 Burning Hands (no sculpt) | 300 | 3d6 | {3} | 100% | 20.66 | 2.81 | 93.7% |
| L3 Burning Hands (sculpt) | 300 | 4d6 | {4} | 100% | 20.98 | 2.98 | 99.3% |
| L5 Burning Hands (sculpt) | 300 | 4d6 | {4} | 100% | 20.98 | 2.98 | 99.3% |
| L5 Fireball (sculpt) | 300 | 9d6 | {9} | 100% | 21.00 | 3.00 | 100.0% |
| L5 Lightning Bolt (sculpt) | 300 | 9d6 | {9} | 100% | 21.00 | 3.00 | 100.0% |
| L7 Fireball (sculpt) | 300 | 9d6 | {9} | 100% | 21.00 | 3.00 | 100.0% |
| L7 Lightning Bolt (sculpt) | 300 | 9d6 | {9} | 100% | 21.00 | 3.00 | 100.0% |

Goblins cap at 7 HP each, so total applied damage saturates near 3×7=21 — the Fireball/Lightning columns all read ~21 because the dice already overkill. The dice-count check is unaffected by saturation.

### Damage uplift (paired seeds)

| Spell | Pre level | Post level | Paired seeds | Pre avg | Post avg | Δ |
|---|---:|---:|---:|---:|---:|---|
| Burning Hands | L1 (3d6) | L3 (4d6) | 300 | 21.45 | 28.20 | **+6.75 dmg/cast (+31.4%)** |

Expected uplift of one extra d6 is 3.5/cast average. Across two beefy targets (2× Ilyich at 88 HP each, no saturation) we measure +6.75/cast — exactly the expected `1 extra die × 2 targets × ~3.5 avg per die`. Sculpt fires through the AoE handler correctly.

Fireball/Lightning don't have a no-sculpt counterfactual at L5+ (Evocation is auto-picked at L2; the class only has one subclass), so an isolation comparison isn't possible. The 100% dice-count match in the table above is the operative verification.

## Part 3 — End-to-end Wizard delves

Setup: a fresh wizard at level 5 or 7 walks the full Iron Cells → Athkatla → Spellhold → Ust Natha chain. 200 runs per level. Encounters drawn from each chapter's pools; rests heal 70% of max; camp = long rest.

| Cell | Runs | Chapters cleared (mean) | Death rate | Shield triggers / run | Slot 1 on Shield / run | Boss death rate (reached) |
|---|---:|---:|---:|---:|---:|---|
| L5 | 200 | 1.09 | 100.0% | 4.71 | 4.71 | Ilyich 9.5% (200) · Magistrate 77.8% (171) · Director 100% (19) |
| L7 | 200 | 1.33 | 100.0% | 5.35 | 5.35 | Ilyich 3.0% (200) · Magistrate 62.4% (194) · Director 100% (60) |

Per-boss HP at start (avg):

- L5 → Ilyich 29.6 / Magistrate 21.5 / Director 21.9
- L7 → Ilyich 43.4 / Magistrate 33.9 / Director 32.2

Top death causes:

- L5: Magistrate (133), Ilyich (19), Director (19), Warden's Apprentice (10), Slaver Cuirassier (10)
- L7: Magistrate (121), Director (60), Warden's Apprentice (6), Ilyich (6), Hollow Sage (6)

**Observations**

- Shield is firing ~5×/run. At ~13 dmg/trigger that's ~65 HP saved across a full delve — meaningful, but not enough to overcome the structural Hold-Person walls.
- Ilyich is no longer a wall (3% at L7, 9.5% at L5). The boss-wall tuning pass (#89) plus Shield clears him cleanly.
- The Magistrate (DC 11, 3-round paralyze + advantage Mind Spike) and the Director (DC 13, 3-round paralyze + advantage glaive + battle-rage at half HP) remain hard walls even with Shield. Vacuum L7 wizards (no Grove, no blessings) die 100% of the time once they reach Director.

## Verdicts

- **Shield reaction — working as designed.** No bug, no fix needed. PR #85 is doing exactly what the description claims and 4,500 attacks of telemetry agree.
- **Sculpt-spells +1 die — working as designed.** 100% dice-match across 2,100 casts. Paired uplift matches the +1d6 prediction.
- **L7 Director wall — still regressed vs cited 56% baseline.** Flag for next round.

## Recommendation for next round (Director wall)

The Shield wireup is correctly closing the "any non-crit hit dings the wizard" leak, but the Director's lockdown chain is the actual killer:

1. Round 1: Hold Person DC 13. WIS-save mod +5 (L7 wiz WIS 14 / +2, proficient / +3 prof) ⇒ 60% success per turn, but the per-turn re-save means an unlucky 2-round paralysis is enough to let an advantage glaive crit + battle-rage spike. Average HP at Director start (32.2) is below the lethal threshold of two unsaved-turn advantage crits.
2. The wizard has no answer to Hold Person besides Shield (which doesn't help paralyze) — Misty Step costs the bonus action but doesn't break the condition; Hold Person on the Director costs a slot but requires action on a round the wizard is already paralyzed.

Two candidate deeper fixes for the next round (ordered by least-invasive first):

- **Drop Director Hold Person DC 13 → 12.** A single point shifts the +5 WIS-save success from 60% to 65% per-turn re-save — over 3 rounds, this materially reduces expected paralyzed-turn count (from ~1.4 to ~1.1) without softening the Magistrate (whose DC is already 11). Smallest intervention, mirrors the earlier Director tuning that took DC 15 → 13.
- **Wizard inherent WIS-save bump at L5+ (e.g. "Studied Defense": +1 to WIS saves).** Class-wide tool, helps the wizard against both Magistrate and Director without retuning encounter DCs. Lands at the level where second-level slots arrive and the Magistrate becomes a real threat. Costs a feature slot on the class sheet.

Both fixes belong on a follow-up worktree, not here. This PR is verification only.

## Re-run

```
npx tsx scripts/sim-validate-wizard-rework.ts
```
