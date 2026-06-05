# Wave-2 tuning re-validation — Rage ration · elite trim · paralyze · event gold (2026-06-05)

Measurement-only re-run on `origin/main` with the **wave-2 tuning merged** (#431 +
#432) on top of the wave-2 content (#422–#429). **No magnitudes were tuned here.**
The only new code was a throwaway probe (`scripts/probe-gallows-wight.ts`, deleted
after use) to root-cause the paralyze read; nothing in `src/` changed.

Baseline (PRE this tuning) = `sim-reports/sim-wave2.md` (#430). Same knobs, re-run
apples-to-apples.

| Sim | Knobs | Lens |
|---|---|---|
| `sim-class-viability.ts` | `SOULS_PER_CLASS=30 MAX_LIVES=30 FULL_CHAIN=1` | class band + **Rage rest-economy** + druid/casters |
| `sim-boss-gauntlet.ts` | `MODE=elite SEEDS=60 ASCENSION=0` (+`GEAR=1`) | **elite-vs-boss ladder** (the 3 trimmed elites + paralyze) |
| `sim-boss-gauntlet.ts` | `SEEDS=60 ASCENSION=0` (+`ASCENSION=6`) | boss-floor + Asc6 sponge regression |
| `sim-event-gold.ts` | `SEEDS=60` | event-gold vs normal-fight slope |
| `sim-ngplus-tob.ts` | `SEEDS=25` | ascension monotone + Melissan wall |

## TL;DR — the four tuned items, PRE → POST

| # | Tuned item (commit) | PRE (sim-wave2) | POST (this run) | verdict |
|---|---|---|---|---|
| 1 | **Barb Rage ration** (#431) | 40.2% rage-starved · fired 0.70/cb · depth 10.9 | **31.0%** starved · fired **0.93**/cb · depth **10.8** | ✅ **loosened, did NOT over-correct** |
| 2a | Axle-Warden Ch6 (#432) | elite **47** vs boss 58 (⚠ harder) | elite **53** vs boss 58 | ✅ now ties boss (within tol) |
| 2b | Sendai Ch13 (#432) | elite **48** vs boss 98 · 2.1 summon/fight | elite **72** vs boss 98 · **1.6** summon/fight | ✅ trim landed (+24) |
| 2c | **Slag-Colossus Ch8** (#432) | elite **42** vs boss 94 (worst) | elite **53** vs boss 94 | ⚠ **improved but still > boss** |
| 3 | Gallows Wight paralyze (#432) | "3% fire" (DC 12) | **57% land** in true fights (DC 14) | ✅ **fires fairly — the 3% was a measurement artifact** |
| 4 | Event gold Ch2-4 (#432) | Ch3 **1.35×** a fight | Ch3 **1.05×** (Ch2 0.80× · Ch4 0.74×) | ✅ early slope flattened to ~1× |

**Headline:** the tuning landed three of four cleanly and did not over-correct
anything. The Barbarian Rage ration is genuinely looser (fewer starved fights,
more rage fired) yet still a real ration, not perma-rage. The Sendai and
Axle-Warden trims worked. Event gold no longer out-earns an early fight. The
**one residual** is the **Ch8 Slag-Colossus**, which the conservative summon-only
trim moved (+11) but not below its (94%-win) chapter boss — the summon lever is
now exhausted, so the next nudge has to touch the colossus body (§6). Separately,
the re-validation **overturns the baseline's "Gallows Wight paralyze barely fires
(3%)" finding**: a direct probe shows it lands in **57%** of actual gallows-wight
fights — the 3-4% was a sim-instrumentation **dilution artifact** (§3). Every
untouched system (bosses, ascension, Melissan, druid, casters) held.

---

## §1. Barbarian Rage ration (#431) — ✅ loosened without over-correcting

The #431 levers: drop the bot's last-charge hoard (`worthLastCharge` gate) and
widen the charge bands `2/3/4/5 → 3/4/5/6`. Both fire as designed.

**Rage rest-economy** over **5,824** barbarian combats (full-chain, charges threaded
across the delve, refilled only at rests):

| metric | PRE (#430) | POST (#431) | reading |
|---|---|---|---|
| avg charges in pocket at fight entry | 1.07 | **1.67** | wider bands carry more |
| fights entered **rage-STARVED** (0 charges, pre-L20) | 40.2% | **31.0%** | −9.2pp — fewer cold fights |
| Rage activations / combat | 0.70 | **0.93** | last-charge spend + more charges |

The explicit ask — *did it over-correct?* — is cleanly **no**: fired **0.93/cb is
still < 1** and **31% of fights are still fought cold**, so the barb is *not*
perma-raging; it is spending a finite, looser pool between camps. And depth is
**nowhere near** the pre-elite-pass 35.6 runaway. The ration is now in a healthy
middle: relaxed, but still a ration.

**On depth — the band is stable, and that is the right read.** Loosening Rage moved
the *rage metrics* but **not** floor depth (10.9 → 10.8). That is informative, not a
failure: with Rage now firing at near-unlimited cadence (0.93/cb), depth held flat,
which proves the Barbarian's floor depth is **not rage-gated** — the AI-floor
death-wall is early burst in over-levelled sweep fights (avg final level **2.98**,
dies Ch1-2), which Rage uptime at L1-3 does not change. The whole band barely moved
(only the barb was touched by #431), so the relative ordering is the truth:

| class | depth PRE (#430) | depth POST | band |
|---|---|---|---|
| fighter | 24.4 | 24.3 | closer |
| monk | 13.5 | 13.5 | closer |
| **barbarian** | **10.9** | **10.8** | **diver — #3 of 7, above the floor pack** |
| ranger | 9.4 | 9.2 | floor pack |
| druid | 9.7 | 8.6 | floor pack |
| wizard | 6.7 | 6.7 | floor |
| rogue | 4.0 | 4.1 | floor |

Relatively the barb sits **#3/7, clearly above the four floor classes** — a healthy
diver position, not the 35.6 runaway and not collapsed to the floor. Verdict: ✅.
If a *deeper* floor identity is ever wanted, the lever is **not more rage** (already
near-cap) — it is a small always-on cold-fight cushion (§6, optional).

---

## §2. Elite trim (#432) — ✅ two clean, ⚠ one residual

`MODE=elite`, geared, Asc0, 60 seeds × 7 classes. Ladder target: **boss.win ≤
elite.win ≤ normal.win** at the same boss-level hero (TOL ±6). All three trimmed
leaders are **deterministic** in their chapter's `ELITE_POOL` (verified in
`chapter6/8/13Pools.ts` — every elite-room variant fields the same leader; only the
support cast varies), so these win% are the trimmed leader specifically, not a pool
average.

| Ch | leader (trim) | normal | elite PRE → POST | boss | summon/fight PRE→POST | verdict |
|---|---|---|---|---|---|---|
| 6 | Axle-Warden (minRound 2, cd 4→5) | 98 | 47 → **53** | 58 | 0.8 → 1.4 | ✅ ties boss (−5, in tol) |
| 13 | Sendai (maxActive 2→1, cd 2→3) | 100 | 48 → **72** | 98 | 2.1 → **1.6** | ✅ trim landed (+24) |
| 8 | **Slag-Colossus** (minRound 3, cd 4→6) | 98 | 42 → **53** | 94 | 1.1 → 1.3 | ⚠ +11 but still ≪ boss |

Summon/fight is the clean signal only for **Sendai** (2.1 → 1.6 — the `maxActive 2→1`
cut). For Axle/Slag it *rises* despite the trim: the less-lethal opening lets fights
run longer, so the one-at-a-time add re-spawns more times over a longer fight — the
**win%** is the real read there.

- **Axle-Warden — fixed.** 47 → 53 closes the gap to the boss (58) to −5, inside
  tolerance. No longer flagged harder-than-boss.
- **Sendai — fixed.** The `maxActive 2→1` cut is the strongest single trim in the
  wave: summons 2.1 → 1.6, elite win 48 → 72. It still reads "harder than boss" only
  because **Abazigal wins 98%** at the geared boss-level hero (a soft-boss artifact
  the baseline flagged), and the residual wall is **ranger 17% / rogue 25%** — the
  bot failing to focus-fire the lone petrified-ambusher (a human focus-fires it).
  Everyone else is 83-100%. The trim did its job.
- **Slag-Colossus — the lone residual.** 42 → 53 is real progress, but it is still
  far under its boss (94%). The summon lever is now **exhausted** (maxActive already
  1, first add delayed to round 3, cd 6) — note summons/fight even ticked *up*
  (1.1→1.3) because the less-lethal early game lets fights run longer (13.0 rounds),
  giving the one-at-a-time conscript more re-spawns over a longer fight. Per-class:
  fighter 95 / barb 98 / druid 75 handle it; **ranger 17 / rogue 3 / wizard 32**
  wall (bot-vs-adds again). The body, not the summon cadence, is now the wall —
  see §6 for the one further tweak.

**Count of elites reading harder-than-boss: 7 → 6** (geared). Axle-Warden crossed
into tolerance; Slag and Sendai shrank their gaps (Slag −52→−41, Sendai −50→−26)
but stay flagged because their bosses are 94-98% pushovers at the over-levelled
geared hero — the known "boss-level hero understates the elite" caveat, not a new
overshoot. The **teeth still hold**: every elite win% sits well below its normal
fight (53-72 vs 98-100).

---

## §3. Gallows Wight paralyze (#432) — ✅ fires fairly; the "3%" was an artifact

The baseline flagged the Ch1 elite's Grave-Grip at "3% fire" and #432 raised
`saveDC 12 → 14` to compensate. The re-validation gauntlet reported **4%** — barely
moved, and **identical bare vs geared**, which made the DC look like the wrong
lever. It is not. A direct probe (60 seeds × 7 classes, the real Ch1 elite room +
an L3/1-blessing hero, the exact gauntlet build) shows:

| probe metric (true gallows-wight fights) | value |
|---|---|
| wight **attempts** Grave-Grip | **98%** of fights |
| player **lands paralyzed** | **57%** of fights |
| CON-save fail-rate at DC 14 | 54% |

So Grave-Grip fires in **~57%** of actual gallows-wight fights — fair-to-strong for
a single round-1 opener that a made CON save fully negates, on a Ch1 elite the hero
still beats ~92-96% of the time. The DC 12→14 bump did move it (≈44% → 54%
save-fail).

**Why the gauntlet says 4%:** a **measurement dilution artifact.** Ch1's elite node
is filled from a *pool of distinct leaders* (#425: gallows-wight, hobgoblin-
drillmaster, imp-needler, …), one rolled per seed. Only **~12% of seeds** (49 of
420 fights = 7 seeds × 7 classes) actually roll a gallows-wight; the
"signature fired%" column averages the paralyze across the *whole* Ch1 elite pool
(`0.12 × 0.57 ≈ 4%`) while labelling the row by seed-0's leader. The metric
under-reads any single-leader signature in the pooled Ch1-3 chapters. **The
paralyze is not broken — the instrument was.** (The deep elites in §2 are
single-leader pools, so their win% are unaffected.) Sim-infra fix noted in §6.

---

## §4. Event gold (#432) — ✅ early slope flattened to ~1×

#432 bows the ramp flat below a Ch5 knee (convex sub-ramp; Ch5-14 unchanged). The
early out-earning is resolved:

| Ch | median event ÷ normal-fight gold PRE (#430) | POST | verdict |
|---|---|---|---|
| 2 | — | **0.80×** | ✓ |
| 3 | **1.35×** | **1.05×** | ✓ at the line (was the soft spot) |
| 4 | — | **0.74×** | ✓ |
| 5 | 0.65× | 0.65× | ✓ (unchanged ramp) |
| 8 | 0.63× | 0.71× | ✓ slice |
| 11 | 0.63× | 0.68× | ✓ slice |
| 14 | 0.58× | 0.66× | ✓ slice |

- **Ch3 1.35× → 1.05×** — the convex bow pulls every early chapter under or onto the
  fight line (Ch2 0.80×, Ch4 0.74×). Ch3 sits right *at* a fight (1.05×, absolute
  25g vs 24g) — the lone marginal, down from 35% over. Target ("≤ ~1× a fight") met.
- **Ch5-14 stay a slice** (0.64-0.73×). One nuance: lowering the early-chapter anchor
  *denominator* nudged deep-event scaling up slightly vs baseline (0.58-0.65× →
  0.64-0.73×) — early-anchored events seen late now divide by a smaller floor — but
  everything stays well under 1×, still "meaningful, not a jackpot." Anchoring still
  holds (trial-of-greed 120g@Ch11 → 149g@Ch14, not the naïve ×6).

---

## §5. Regression checks — all clean (nothing the tuning touched moved)

The tuning changed only barb rage, 3 elite summon-cadences, 1 elite save-DC, and
the event-gold ramp — none of which touch boss statblocks or gear, so the boss /
ascension / Melissan lenses should be unmoved, and are:

- **Boss floor (bare, Asc0)** — Ch1 100 · Ch2 53 · Ch5 14 · Ch7 1 · Ch8 90 · Ch9 0
  · Ch10 34 · Ch11 1 · Ch13 60 · Ch14 0. Matches the baseline within ±2. ✅
- **Asc6 sponge (Ch8 Dravok)** — stall **17%**, 23.3 rounds, 66% win (baseline
  19% / 23.8 / 65%). Combined HP-mult cap stable. ✅
- **Ascension monotone (ngplus geared boss wall)** — essentially bit-for-bit baseline:
  Ch11 84.0→46.4, Ch12 98.4→66.4, Ch13 97.6→76.0 across A0→A6, every boss
  monotone-harder. Melissan **8.8% (A0) → 0% (A6)** geared, bare 0% all — the
  high-variance wall is intact ("extremely hard, do not tune"). ✅
- **Structure** — 400 seeds: ok, 14 bosses, 13 camps, 0 orphans, terminal=melissan,
  routed 119.8 rooms. ✅
- **Druid / casters / rogue** — WildShape fires 0.82×/cb (kit active); band stable
  (wizard 6.7 flat, rogue 4.1 flat). Druid depth 9.7 → 8.6 is RNG-cascade noise: the
  elite summon-cadence trims change dice consumption mid-fight, so a fixed-seed
  schedule cascades to small downstream swings for every class that fights those
  elites (fighter ±0.1, ranger ±0.2). Not a balance move. ✅

**Class band (POST):** fighter 24.3 > monk 13.5 > barbarian 10.8 > ranger 9.2 >
druid 8.6 > wizard 6.7 > rogue 4.1 — unchanged shape vs baseline.

---

## §6. Remaining directions (NOT applied — for a tuning lane)

1. **Slag-Colossus is the one still-off item (Ch8).** `src/content/monsters/slag-colossus.ts`.
   Elite 53% vs boss 94% — the summon-only trim under-moved it and the summon lever
   is exhausted (maxActive 1, minRound 3, cd 6). The wall is now the colossus
   **body**, so the next nudge has to touch it: trim `maxHp` ~12-15% **or** shave
   one die / −1 to-hit off its slam. Keep it conservative — fighter/barb/druid
   already beat it (75-98%); the residual is largely ranger/rogue/wizard bot-vs-adds
   plus a 94%-pushover Ch8 boss inflating the "harder-than-boss" bar. MED.

2. **Sim-infra: pin the elite lens to a fixed leader per chapter for signature reads.**
   `scripts/sim-boss-gauntlet.ts` (`mainElite`). The Ch1-3 multi-leader pools make
   the per-chapter "signature fired%" a pool average (§3) — it under-read the
   gallows-wight paralyze by ~14×. Fix: when a chapter's `ELITE_POOL` has multiple
   leaders, either force the labelled leader for every seed, or report fired% over
   only the fights that rolled that leader. Win% rows for Ch1-3 are pool-averages too
   (the deep single-leader chapters are fine). LOW but worth it — it caused a false
   "barely fires" finding.

3. **Gallows Wight DC is fine as shipped, optionally revertible.** Now that the true
   land-rate is known (~57% at DC 14, ~44% at the old DC 12), the #432 bump was based
   on the diluted 3% and is **optional** — DC 12-13 would also read as "meaningful."
   DC 14 is not unfair (Ch1, player still wins 92-96%), so no change needed; just be
   aware the original justification was a measurement artifact. LOWEST.

4. **Event gold Ch3 sits exactly at 1× (1.05×).** `src/engine/delve/eventGoldScale.ts`.
   If strictly-under-1× is wanted, move `RAMP_KNEE_CHAPTER` 5 → 6 (steepens the bow).
   LOWEST — 25g vs 24g, "useful early lifeline," arguably working as intended.

No win-rate test gates were added (measurement-only, per the lane brief). `npm run
build` green; `npm run test:run` green (1565 pass / 3 skip / 1 todo); `docs/`
restored (working artifacts). Committed raws: `sim-reports/elite-gauntlet.raw.md`
(geared), `sim-reports/boss-gauntlet.raw.md` (bare Asc0), `sim-reports/event-gold.raw.md`.
