# Camp boons — validation findings

**Date:** 2026-05-28
**PR under test:** [#90](https://github.com/Cristulio/Claudio/pull/90) — camp permanent buffs (9 boons, 3 per camp, delve-scoped)
**Method:** 150-run sim per (class × camp × boon) cell, 3 classes × 3 camps × 4 boon options (incl. no-boon control) = **36 cells, 5 400 runs total**.

Raw numbers and the per-cell matrix live in
[`camp-boons-matrix.md`](./camp-boons-matrix.md). This file is the curated
diagnosis and tuning record.

---

## 1. Setup

For each cell we drop a freshly long-rested `rogue` / `fighter` / `wizard`
at the camp under test at the live-realistic level — L2 / L4 / L6 (matches
post-boss XP for Ilyich / Magistrate / Director). We apply the test boon
(or no boon for the control), then walk the chapter that follows the camp
all the way through to the next chapter boss. We record:

- death rate after the camp (≡ "the chapter after did not clear")
- post-camp damage taken, HP healed, potions used, stabilise charges spent
- boss-clear% for the chapter-after-camp boss (Magistrate / Director / Matron)

Shrines / events / extra blessings are skipped (deterministic bare-soul
floor — same convention as `sim-class-tour-early`). Boon comparisons are
still valid because the control uses the same skip policy.

### Flag bar (per brief)

| Flag | Lift band | Meaning |
|---|---|---|
| **dominant** | > +25 pp | "always pick" → too good → nerf candidate |
| **goldilocks** | +10 to +20 pp | real choice → ship as-is |
| **mid** | +5 to +10 pp | acceptable but watch |
| **dud** | < +5 pp | never worth taking → buff candidate |

Sim noise floor at N = 150 with ~50 % control death rate: SE of the
difference ≈ ±5.8 pp. Single-cell lifts inside that band are not
distinguishable from zero; the **mean lift across classes** is the load-
bearing number.

---

## 2. Per-boon verdict

Mean lift averaged across the classes that see each boon (Surge of the Storm
is wizard-only at Camp 2; everything else is all three classes).

| # | Boon | Camp | Cells | Mean lift | Range | Verdict |
|---|---|---:|---:|---:|---|---|
| 1 | Vigor of the Road | 1 | 3 | **+5.6 pp** | +4 … +6.7 | mid (ship) |
| 2 | Eye of the Hawk | 1 | 3 | **+8.2 pp** | +5.3 … +11.4 | mid (ship) |
| 3 | Stillness of the Mind | 1 | 3 | **+6.7 pp** | +4 … +8 | mid (ship) |
| 4 | Steel of the Brave | 2 | 3 | **+4.9 pp** | –8.7 … +12.7 | mid — high variance, watch |
| 5 | Might of the Mountain | 2 | 2 | **+3.7 pp** | +0.7 … +6.7 | borderline dud, watch |
| 6 | Surge of the Storm (wiz) | 2 | 1 | **–4 pp** | — | inconclusive (1 cell, in-noise) |
| 7 | Patience of Ilmater | 2 | 3 | **+10.7 pp** | +6 … +18 | **goldilocks (ship)** ✓ |
| 8 | Mantle of the Slain | 3 | 3 | **+6.7 pp** | +6 … +7.3 | mid (ship) |
| 9 | Blade of the Vow | 3 | 3 | **+2.7 pp pre-tune** | +1.3 … +4 | **dud → tuned (see §3)** |
| 10 | Eyes of the Lich | 3 | 3 | **–0.7 pp** | –5.3 … +2.7 | informational only — see §4 |

### Headlines

- **No boon is dominant.** Strongest single result is rogue + Patience of
  Ilmater at Camp 2 (+18 pp), well below the +25 pp nerf threshold.
- **Patience of Ilmater is the standout pick** — clearly goldilocks (+10.7 pp
  mean, peaking at +18 pp for rogue). The extra stabilise charge gets
  consumed in ~0.4–1.0 extra falls per delve across all three classes (see
  auxiliary table in matrix doc), which is the load-bearing mechanism.
- **Blade of the Vow is the only true dud** with sim-detectable signal.
  Tuned in this PR — see §3.
- **Eyes of the Lich is informational** — its effect changes player decisions
  ("prep spells for this boss"), not sim AI behaviour. Measured lift is zero
  by construction. See §4 for the carve-out.
- **Steel of the Brave** has a fighter-cell inversion (+1 AC supposedly hurts
  the fighter). That's almost certainly sim seed noise on top of the
  shield-already-AC-stacked fighter being at the diminishing-returns edge of
  AC — the mean across the three classes is +4.9 pp, still positive. Not a
  tuning candidate this round.

---

## 3. Tuning applied — Blade of the Vow

### Before

- **Effect:** Once per combat, re-roll your lowest weapon damage die. Keep
  the better roll.
- **Reroll budget:** 1 per combat.
- **Mean lift:** **+2.7 pp** (rogue +4, fighter +2.7, wizard +1.3). Dud.

### After (this PR)

- **Effect:** Re-roll your lowest weapon damage die **up to three times**
  per combat. Keep the better roll each time.
- **Reroll budget:** **3** per combat (was 1).
- **Mean lift:** **+1.6 pp** (rogue +2.7, fighter +0.7, wizard +1.3) at the
  same 150-run seeds. **Still dud-band.**

### Why the numeric tune barely moved the lift

EV of re-rolling one die with "keep better" on a d8 is ≈ +1.3 damage per
proc. Across the ~5–8 weapon hits a class lands in the post-Camp-3 chapter,
even 3 procs add ≈ +4 expected damage per combat. Against a Matron Mother
with ~210 HP that shaves <1 round off the boss, well inside the death-rate
noise band. The reroll mechanic is fundamentally too small to register on a
survival metric.

### Recommendation for next round

Number-tweaking the reroll budget further is unproductive — we already saw
1 → 3 produce no measurable lift change. Two non-numeric options for the
next pass (out of scope for this PR per the surgical-only brief):

1. **Promote one reroll to a guaranteed max-damage hit per combat.** Same
   "feels like a vow" flavour, much larger swing per proc — converts ~5
   damage roll into ~12 max on a longsword crit.
2. **Replace the reroll with a flat damage bump** (e.g., +1 to all weapon
   damage for the rest of the delve), and rename / refluff. Risks
   duplicating Camp 2's Might of the Mountain, so probably option 1.

### Other tunes considered and skipped

- **Eyes of the Lich:** the sim's –0.7 pp lift is by construction (no AI
  reads the reveal). Buffing the *number* (e.g., revealing two bosses
  ahead) would still be invisible to the sim. Needs a human-playtest
  evaluation pass before any tuning is justified.
- **Might of the Mountain:** mean +3.7 pp is borderline dud but inside the
  noise band on 2 cells. Re-test with N = 300 before tuning.
- **Steel of the Brave & Surge of the Storm:** the negative single-cell
  results are inside the noise band; the mean stays positive (Steel) or is
  one-cell-only (Surge). No tuning warranted yet.

---

## 4. Eyes of the Lich — informational boon carve-out

Sim lift: **–0.7 pp mean** (per-boss clear rates: rogue +0.7, fighter –5.3,
wizard +2.6 — all within noise). This is the expected outcome: the boon
sets a `lichEyesAvailable` flag the live game uses to show the player the
boss stat block, but the sim's combat AI doesn't read the flag and doesn't
change its policy.

**Evaluate via playtest, not via lift.** Two practical decision points the
sim can't see:

- Wizard / sorcerer: prep / leave open spell slots for the resistances the
  reveal shows (e.g., bring Fireball if not fire-immune; switch to
  Magic Missile if it is).
- Fighter: budget Action Surge for the boss's bloodied phase if the reveal
  shows a multi-phase pattern.

Don't tune this one yet. If playtest reports it feels weak, the cleanest
upgrade is adding a small mechanical sweetener on top of the reveal
(e.g., +1 attack on the boss for the next fight), so the sim can also
pick up signal next round.

---

## 5. Recommendations for next validation round

1. **Re-run with N = 300** to tighten the noise band, especially for
   single-cell boons (Surge of the Storm) and the high-variance Steel of
   the Brave / Might of the Mountain pair.
2. **Replace Blade of the Vow's mechanic** (per §3 recommendation) and
   re-run — purely-numeric tunes have been ruled out.
3. **Add a survivability sweetener to Eyes of the Lich** so the sim can
   register lift, or commit to keeping it purely informational and
   evaluate via playtest only.
4. **Investigate the Steel of the Brave / fighter anomaly** — likely AC
   diminishing returns, but worth one targeted sim with shield vs
   shieldless fighters at L4 to confirm.
5. **Re-test Patience of Ilmater at higher N** — its +18 pp rogue cell is
   strong enough that it could cross the +25 pp dominant threshold with
   more data. If it does, tune from "+1 stabilise charge" to "+1 charge
   but capped at total 3 per delve" or similar.

---

## Methodology notes

- Sim source: [`scripts/sim-camp-boons.ts`](../../scripts/sim-camp-boons.ts).
- Per-class start state: standard-array character with class-appropriate
  kit + 2/3/4 potions for L2/L4/L6 (matches live carry).
- Boon application mirrors `delveStore.pickCampBoon` exactly: the boon id
  is pushed into `character.campBoons`; pick-time side effects (Vigor's
  HP bump, Mantle's per-level bump, Patience's stabilise budget) are
  applied locally with the same numbers.
- Death rate is "did the chapter following the test camp fail to clear",
  including the boss room. Boss-clear% is the conditional rate over runs
  that reached the post-camp boss.

> **Out of scope:** events, shrines, additional blessings, player-skill
> picks (action-surge timing decisions, spell choice based on reveal).
> The sim is a bare-soul floor, not an optimal-play ceiling.
