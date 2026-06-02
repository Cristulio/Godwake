# Re-validation sim pass — after the variety/balance batch (2026-06-01)

**Measurement only.** Nothing was tuned. Instrumentation (a one-line widening of
`sim-feel`'s action-mix output) and all clobbered `docs/sim-findings/*` were
restored after capture; `npm run build` is green. AI-floor caveat applies as
always — the auto-battle bot underplays a real player, so read the **relative
ordering and the shape**, never the absolute magnitudes (endgame clearability is
a playtest-only question).

## What this re-checks

The batch merged together on top of the "massive sim" (PR #293) baseline:

- **#297 pacing** — combat rooms/chapter 7→4.5, total fights 8.5→6.0; XP_TABLE cap 126k→98k.
- **#299 martial depth** — Fighter Power Attack + Brace; Barbarian Cleave + Knockdown (these **buff** Fighter/Barb).
- **#300 base difficulty** — Ch1-5 trash + elite statblocks raised to cut the Asc0 blowout rate.
- **#298 blessings** (27→41, caster pool) + **#296 quirks** (25→40).

The previous "balance holds" verdict is now re-tested with all of these layered
together. **The combined effect is the point** — e.g. #300 cut blowout to ~60%
*measured on a branch without #299's maneuvers*; #299 buffs the same martials
whose burst drives blowouts.

Sweep matches the baseline exactly: `sim-class-viability` `SOULS_PER_CLASS=30
MAX_LIVES=35` × 3 archetypes; `sim-feel` Asc0 default (`RUNS=40`, LEVELS 1/3/5/7,
5 classes × 4 start levels); `sim-xp-curve` 4000 routed delves.

---

## VERDICT — the band did NOT hold its prior shape

Three of the five questions land clean; two surface real shifts to flag as
tuning **directions** (no numbers — user decides):

1. **Class band — REORDERED.** Barbarian **leapfrogged Fighter to deepest in all
   three archetypes** (the exact risk this lane was told to watch). Fighter's
   former runaway ≫ lead **compressed** into a tight Barb ≈ Fighter ≈ Ranger top
   cluster; under cautious play Fighter sinks to **4th** (below Wizard and
   Ranger). The gap did not "blow open" — it inverted and tightened. **FLAG.**
2. **Asc0 blowout — REBOUNDED to ~70%** (above even the pre-#300 67.7 baseline),
   vs the ~60% #300 landed. The #299 martial burst over-rode #300's Ch1-5
   tightening on the blowout metric. Win rates stayed **healthy** (normal 97.3%,
   elite 88.1%, boss 94.5%) — so this is **not over-tightening; the opposite** —
   the trash got easier again. **FLAG.**
3. **Leveling — IN BAND.** L20 lands Ch13 (random routing) / Ch12 (combat
   routing). The −36% fights and the lower XP_TABLE net out as intended. ✓
4. **Maneuvers fire at sane rates** — all four non-zero, none spammed; the
   "less attack-spam" goal is met. ✓
5. **Rogue — REGRESSED to lone last** (was mid-pack); Druid roughly held its
   lower-mid slot. The harder Ch1-5 base punishes Rogue's fragility hardest and
   it got no offsetting buff this batch. **FLAG.**

A coherent through-line: **variance widened.** Easy fights got easier (martial
burst → blowout up) while overall survival got shallower and lower-level (harder
base + fewer fights → the bot dies earlier, at a lower level, on the fights it
*doesn't* blow out).

---

## Q1 — Class band (depth = mean rooms reached per life)

| Class | cautious | balanced | aggressive | baseline (balanced, #293) |
|-------|---------:|---------:|-----------:|--------------------------:|
| **barbarian** | 10.6 | **11.3** | 10.0 | 17.7 |
| fighter | 6.7 | 8.7 | 9.1 | **29.6** |
| ranger | 9.3 | 8.0 | 7.9 | 20.0 |
| wizard | 7.1 | 7.2 | 7.1 | 11.9 |
| druid | 6.1 | 5.7 | 5.3 | 13.7 |
| rogue | 4.9 | 4.9 | 5.2 | 13.8 |

Final level at death (balanced): barb 2.86 · fighter 2.23 · ranger 2.18 · wizard
2.01 · druid 1.60 · rogue 1.48 (baseline: 5.26 / 3.98 / 4.14 / 3.03 / 3.29 / 3.12).

**Ordering now (balanced):** barbarian > fighter > ranger > wizard > druid > rogue.
**Baseline:** fighter ≫ ranger > barbarian > rogue ≈ druid > wizard.

Reads:

- **Barbarian is #1 in every archetype.** Its Cleave + Knockdown are rage-gated
  and crowd-gated — they fire **unconditionally** once raging, so the buff lands
  regardless of how cautiously the bot plays. Held depth best (0.64× baseline).
- **Fighter is archetype-dependent now.** Power Attack is hit-probability-gated
  (a strict d20-need per archetype), so it fires often in **aggressive** (Fighter
  9.1, edges Barb-adjacent) but rarely in **cautious** (Fighter 6.7, drops to
  4th). Fighter collapsed hardest in absolute terms (0.29× baseline) — its old
  over-levelled lead was the most exposed to the harder base.
- **Rogue → lone last** in all three archetypes despite Nimble Dodge (#282) being
  merged. Largest relative fall: mid-pack (13.8) to bottom (4.9).
- **Wizard rose** to mid (3rd–4th), having been last at baseline — relative, not
  absolute; the caster blessings (#298) may help, but mostly others fell more.
- **Druid** roughly held its lower-mid position (5th, was tied-4th).

> Note on absolutes: depth is measured **in rooms**, and #297 cut ~15% of nodes
> per chapter — so the ~3× population-wide depth drop overstates the true
> survival hit (fewer rooms to traverse per chapter). The **relative ordering**
> is the robust signal and does not depend on this.

---

## Q2 — Asc0 blowout (sim-feel, default L1/3/5/7 sweep — matches #300's method)

Overall blowout (won, HP never < 80%): **69.9%** of wins.
(#300 post-tightening: 59.9% · pre-#300 baseline: 67.7%.)

Per fight-kind:

| Kind | Fights | Win rate | Blowout % (of wins) |
|------|-------:|---------:|--------------------:|
| normal | 10128 | 97.3% | 74.8% |
| elite | 2942 | 88.1% | 61.4% |
| boss | 3213 | 94.5% | 61.1% |

Per chapter (non-boss) vs #300's post-tightening targets:

| Chapter | now | #300 post |
|--------:|----:|----------:|
| Ch1 | 78.4% | (sweep-floored ~82%) |
| Ch2 | 74.5% | 55.5% |
| Ch3 | 80.6% | 61.1% |
| Ch4 | 76.0% | 60.1% |
| Ch5 | 76.3% | 59.1% |

Ch2–5 — the band #300 deliberately moved — has snapped back above even the
pre-#300 numbers. This is the **#299 martial burst** ending trash fights before
the (now-tougher) enemy acts. Win rates are healthy throughout, so it is **not**
over-tightened — the trash is easier than #300 intended once martials are in.

(Ch1 remains the known sweep artifact: a start-L7 soul walking Ch1 bursts the
lone enemy regardless of statblock — floored at ~80%, not a content signal.)

---

## Q3 — Leveling (sim-xp-curve, 4000 routed delves, Asc0)

| Routing | L20 lands | Band |
|---------|-----------|------|
| random  | end of **Ch13** | Ch12–14 ✓ |
| combat  | end of **Ch12** | Ch12–14 ✓ |

The −36% fights (less routed XP) and the lower XP_TABLE (cap 98k) net out
correctly — L20 still lands in the intended Ch12–14 window. **No action.**

---

## Q4 — Do the new maneuvers fire? (action-mix, balanced, all start levels)

| Class | Maneuver shares (of all that class's actions) | Button share | Entropy |
|-------|-----------------------------------------------|-------------:|--------:|
| fighter | power-attack **18.3%**, brace **3.9%** (+ action-surge 2.4%, second-wind 0.8%); attack 74.2% | 74.2% | 1.17 |
| barbarian | cleave **10.2%**, knockdown **7.5%** (+ reckless 22.0%, rage 11.8%); attack 48.5% | 48.5% | 1.97 |

All four new maneuvers fire at **non-zero, non-spammed** rates. The intended
"less attack-spam" effect is visible: Barbarian's button share is down to 48.5%
(highest action entropy of any class, 1.97 bits) and Fighter's to 74.2%. Power
Attack is the most-used maneuver (18.3%) but attack still dominates — gating is
working, not runaway. ✓

> The same burst that makes Q4 a success (Power Attack / Cleave / Knockdown end
> fights in fewer rounds) is what drives the Q2 blowout rebound. These two
> findings are the same mechanism seen from two angles.

---

## Q5 — Druid + Rogue

- **Rogue — regressed.** Mid-pack (13.8) → lone last (4.9), last in all three
  archetypes, despite Nimble Dodge (#282) being live in the tree. The harder
  Ch1-5 base hits its fragility hardest and it received no offsetting buff this
  batch. The known Rogue-floor weakness is now more acute.
- **Druid — roughly held.** Stays in the lower-mid cluster (5th, was tied-4th),
  just above Rogue. No special regression; its kit was untouched. In band.

---

## Tuning directions (no numbers — user decides)

1. **Blowout vs martial burst.** #299's maneuvers negate #300's Ch1-5 tightening
   on the blowout metric. Two levers: re-tighten Ch1-5 trash *with martials in
   the picture*, or moderate maneuver magnitude/gating. (Win rates are fine, so
   this is purely a tension/blowout call, not a lethality one.)
2. **Fighter vs Barbarian.** Barbarian's rage-gated Cleave/Knockdown fire
   unconditionally → robust #1; Fighter's hit-probability-gated Power Attack only
   nets out in aggressive play → Fighter's depth is now archetype-dependent and
   drops to 4th when cautious. If Fighter should remain the steady floor-defining
   class, its maneuver gating may be too conservative relative to Barbarian's —
   or Barbarian's maneuvers are slightly hot.
3. **Rogue floor.** The harder base disproportionately punishes Rogue; it is the
   weakest class again. The deferred follow-ups to its floor (beyond Nimble
   Dodge) look more justified.

*All directions are AI-floor reads on the early-mid game (where the bot lives and
dies). Endgame remains a playtest-only question.*
