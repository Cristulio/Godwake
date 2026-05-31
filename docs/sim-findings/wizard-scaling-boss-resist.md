# Wizard ascension scaling + boss control-resistance — sim-tuned

Two interacting balance changes, tuned together against the competent caster bot
now in main (see `caster-ai-diagnosis.md`):

- **A — Fire Bolt scaling cantrip.** Fire Bolt gains d10s with level, 5e-style
  but compressed onto this game's L8 cap: 1d10 → 2d10 (L5) → 3d10 (L7) → 4d10
  (L8). Gives the endgame wizard sustained at-will closing power once enemy HP
  outscales a flat 1d10.
- **B — Boss/elite legendary resistance.** The primary foe of a boss encounter
  auto-succeeds its first **3** player-applied control saves per fight (elite:
  **1**), so a lone boss can no longer be chain-paralyze-locked by Hold Person.
  This nerfs the wizard's old boss-lock, which A compensates for.

The spent slot is still gone on an auto-success — control against a legendary
foe is now a war of attrition the wizard usually loses.

## Headline — gear-modelled endgame sim (`sim-endgame-gear`, 40 souls × 120 lives, same seeds)

| Class | A0 ever-cleared | First A0-clear (life) | Topped A6 | **Mean ascension cleared** | Avg depth |
|------|---------------:|---------------------:|---------:|---------------------------:|----------:|
| **wizard — before** | 87.5% | 82.5 | **0.0%** | **0.97** | 51.0 |
| **wizard — after** | 100.0% | 45.8 | **37.5%** | **5.15** | 53.1 |
| fighter (before = after) | 100% | 11.1 | 100% | 6.00 | 42.6 |
| rogue (before = after) | 100% | 22.1 | 100% | 6.00 | 35.8 |
| barbarian (before = after) | 100% | 15.6 | 100% | 6.00 | 44.7 |
| ranger (before = after) | 100% | 13.4 | 100% | 6.00 | 41.6 |

"before" wizard row = `caster-ai-diagnosis.md` (the prior commit, same sim/seeds).
The four martials are **provably unaffected** — the changes touch only Fire Bolt
(wizard-only) and the Hold-Person-on-boss path (only the wizard casts it) — and
the sim reproduces their numbers to the decimal.

### Read

- **Wizard climbs the ladder now.** Mean ascension cleared **0.97 → 5.15** and
  it **tops A6 37.5%** of souls (was 0%). It reaches the upper-mid ladder where
  it used to stall at A1.
- **Still the weakest of the five — not dominant.** Lowest mean ascension
  (5.15 vs 6.00), lowest top-A6 rate (37.5% vs 100%), and the **slowest** to its
  first A0 clear (life 45.8 vs the martials' 11–22). It became viable, not
  oppressive.
- **Early game not trivialized.** 100% *ever-cleared* across 120 lives just means
  every soul eventually clears the base chain once; the wizard is still the last
  class to get there. The loot-blind floor (below) confirms it.

## No-regression / not-trivialized floor (`sim-class-viability`, loot-blind, 40 × 120)

| Class | Avg depth (rooms) | Avg final level | Clear% |
|------|-----------------:|----------------:|------:|
| fighter | 22.7 | 4.64 | 0.0% |
| rogue | 21.4 | 4.36 | 0.0% |
| **wizard** | **22.8** | 4.73 | 0.0% |
| barbarian | 24.0 | 4.80 | 0.0% |
| ranger | 37.5 | 6.31 | 0.1% |

Martial depths are **identical to the diagnosis** (fighter 22.7 / rogue 21.4 /
barb 24.0 / ranger 37.5). The wizard is mid-pack (22.8) — actually a touch
shallower than its pre-change 23.9, because the boss-lock nerf bites at low level
while Fire Bolt scaling only kicks in at L5+/L8. Exactly the intended shape: the
under-levelled early game is **not** buffed; the back-half (L8) wizard is.

## Boss un-lockability

Verified by unit test (`wizard.test.ts` → "Boss legendary resistance vs Hold
Person"): a boss auto-succeeds its first 3 control saves (no paralyze, resistance
decrements 3→0, logged) and is bound only once the pool is exhausted; an elite
absorbs exactly one; rank-and-file monsters are unaffected. With the wizard
holding at most 3 second-level slots, a boss is effectively never chain-locked
and takes its turn throughout the fight.

## Process

Two tuning cycles, 3 sim runs (under the lane's 5-run cap):
1. 3d10-at-L8 curve → mean asc 3.80, **topped A6 still 0%** (plateaued ~A3–A4).
2. Extended the ramp to 4d10-at-L8 → mean asc 5.15, **topped A6 37.5%**.
   Shipped this.
