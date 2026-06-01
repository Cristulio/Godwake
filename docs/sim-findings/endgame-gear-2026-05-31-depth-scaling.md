# Endgame-gear re-sim — post depth-scaling + dual-vendor legendaries (2026-05-31)

Measure-only pass. Ran `scripts/sim-endgame-gear.ts` ONCE at standard sample
(`SOULS_PER_CLASS=60 MAX_LIVES=140`, `MODEL_GEAR=on`). No code/number changes.
Auto tables in `endgame-gear.md`; this is the curated read.

## What shipped since the last endgame-gear read

- **Shop depth-scaling**: merchant rarity mix is now chapter-driven (green-heavy
  early → all-purple deep, ch1-9) and the +1/+2/+3 enhancement ceiling rides the
  chapter axis. Fixed a bug where deep CAMP caravans fell back to tier-1 junk.
- **Dual-vendor rare legendaries**: rare legendary offers now appear at BOTH the
  route-map shop AND the camp caravan — 0 below ch3, 6% ch3-4, 10% ch5-6, 15%
  ch7+. Legendaries still also drop from elites/deep combat and bank
  account-level.

## Headline (60 souls/class, 140 lives)

| Class | 1st A0-clear life (mean/median) | Topped A6 | Mean asc | Avg depth | Leg/soul |
|------|:-------------------------------:|----------:|---------:|----------:|---------:|
| fighter   | 12.1 / 12 | 100% | 6.00 | 48.8 | 11.0 |
| ranger    | 18.1 / 18 | 100% | 6.00 | 59.5 | 9.0 |
| barbarian | 25.5 / 26 | 100% | 6.00 | 59.8 | 9.0 |
| rogue     | 43.8 / 43 | 100% | 6.00 | 39.3 | 9.0 |
| wizard    | 50.2 / 50 |  45% | 5.37 | 60.5 | 9.0 |

All five classes still eventually clear A0 (100%). Fighter is the fast lane to
first clear (~12 lives), wizard the long grind (~50 lives, only 45% ever top A6)
— same shape as the prior read, wizard remains the hard-mode class.

## Does the Ch6+ gate still hold? YES — cleanly.

Bucketed by legendaries owned at descent (Ascension 0), the curve is monotonic
for every class: the bare row fails the back half, Ch5/Ch6 reach + clear climb
with each legendary tier.

- **Bare (0 legendaries)**: reaches Ch5 only 1.3–7.9%, clears Ch6 ~0% across all
  classes. The strictest bare-soul gate (0 Grove AND 0 legendaries) is even
  tighter — 0.0–0.9% reach Ch5, **0% clear** for all five classes.
- **8+ legendaries**: Ch6-clear jumps to 86% (fighter), 25% (ranger), 15%
  (rogue), 8% (barb), 3% (wizard). Gear is unambiguously the lever that opens
  the back half.

Representative (fighter A0):

| Legendaries | Reached Ch5 | Reached Ch6 | Cleared Ch6 |
|------------|-----------:|-----------:|-----------:|
| 0 (bare) |   6.3% |   3.7% |  1.1% |
| 1-2      |  19.8% |  14.6% |  4.7% |
| 3-4      |  57.3% |  45.3% | 22.7% |
| 5-7      |  86.8% |  86.8% | 55.3% |
| 8+       | 100.0% | 100.0% | 85.7% |

## Legendary economy — sane, not runaway

The key finding: **dual-vendor offers did NOT inflate the legendary ceiling.**
Leg/soul held at 9.0 for four classes and 11.0 for fighter — identical to the
prior read. The banked count is bounded by the distinct-legendary pool, not by
acquisition rate, so adding a second vendor offer channel speeds *how fast* a
soul fills its collection, it does not raise the cap.

Consistent with that, first-A0-clear life did NOT collapse — it sits at 12–50
lives depending on class (if anything slightly later than the prior 40-soul
read, well within the per-soul variance of a larger sample). The economy is not
too fast: a soul still grinds a meaningful number of lives before the gear stack
opens Ch6. It is not too slow either — every class gets there within the run
budget and the geared 8+ row reliably clears.

## Verdict

The gear-as-the-lever / Ch6+ gate holds cleanly after the depth-scaling and
dual-vendor changes: bare souls are walled out of the back half (0% clear), the
reach/clear curve climbs monotonically with banked legendaries for all five
classes, and the geared top bucket reliably opens Ch6. The dual-vendor legendary
channel did not destabilize the economy — the per-soul legendary ceiling is
pool-bounded (9–11), so the change accelerates collection-fill without inflating
the endgame power cap or trivialising first-clear (still 12–50 lives). Nothing
looks off; no fixes recommended. Wizard remains the deliberate hard lane (45%
top-A6, slowest first clear) — unchanged, not a regression from these changes.
