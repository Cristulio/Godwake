# Full-system re-validation (½ of 2) — difficulty curve, ascension, twists & economy

> **MEASURE-ONLY lane.** No balance / statblock / XP / renown / content was
> changed. Everything below is observation + **DIRECTIONS** for a later tuning
> lane. Companion to the half-1 NG+/ToB pass
> ([`ngplus-ascension-economy.md`](./ngplus-ascension-economy.md), #369), which
> is the **baseline** this lane re-validates against.

## What this checks

Hunt for **regressions** in the difficulty/ascension/twist/economy/XP systems
introduced by the recent merge wave now all on `main`:

- **#338** unify Fighter/Barb/Ranger maneuvers into a spendable per-fight pool
  (+ **#343** mid-fight pool regen / OFFENSE buff, **#360** missed-DISRUPT loses charge)
- **#357** re-weight Ranger Focus (Aimed Shot 1pt/half-dmg, Crippling Shot 2pt)
- **#359** introduce the Druid Grove at first death (not delve 2)
- **#365** fire chapter-unlock reveals mid-run
- **#367** split campaign — base ends at Irenicus (Ch11), ToB arc → New Game+

Measured on the **full fourteen-chapter chain** (`createGodwakeDelve({ fullChain: true })`)
unless a check is explicitly base-game.

### Merge-order context (why this is a clean regression check)

The whole wave landed **before** #369 (`#338 → #343 → #357 → #360 → #365 → #359
→ #367 → #368 → #369`), so #369 was itself the first measurement after the wave,
and `origin/main` is unchanged since. This lane re-runs the same deterministic
harnesses on the current `main`: a **bit-for-bit reproduction** of #369 is the
expected "no regression" result, and confirms the #369 read is stable, not a
single-seed fluke. The kits the wave added are verified **live in the sim** (not
inert) — see §1 note.

### Harnesses + reproduce

| Harness | Measures | Command |
|---|---|---|
| `scripts/sim-feel.ts` (ASCENSION + FULL_CHAIN knobs) | full-chain difficulty + twist breakout per ascension | `ASCENSION=0..6 RUNS=40 npx tsx scripts/sim-feel.ts` (800 runs/asc) |
| `scripts/sim-renown-economy.ts` | Grove cost vs income, runs-to-afford, ascension-gated nodes | `npx tsx scripts/sim-renown-economy.ts` |
| `scripts/sim-xp-curve.ts` (FULL_CHAIN knob) | where L20 lands, base vs full chain | `npx tsx scripts/sim-xp-curve.ts` and `FULL_CHAIN=0 npx tsx scripts/sim-xp-curve.ts` |

### Read-this-relative caveat (carried from the balance memory)

**AI-floor.** The shared Auto-Battle bot underplays a real player and never
clears (0% clear at every ascension — it dies ~Ch8-9). Absolute reach / clear /
win numbers are a **floor**, not game truth; this lane reads the **shape** (the
*relative* movement across the ascension ladder and the twist/clean delta), which
the floor preserves. Boss win% here is the bot dropped onto bosses it *did* reach,
not a geared-player figure (that read lives in #369 §2).

---

## 1. Difficulty + ascension ladder — monotone-harder 0→6, no regression ✅

`sim-feel`, **800 runs/ascension** (5 classes × 4 start levels × 40), full chain,
balanced archetype. Headline ladder read:

| Asc | Mean rooms reached | Mean min-HP (all) | Blowout % | Boss min-HP | Boss win% |
|----:|------------------:|------------------:|----------:|------------:|----------:|
| 0 | **39.5** | 79.3% | 72.9% | 74.6% | 95.2% |
| 1 | 37.1 | 78.6% | 71.9% | 74.1% | 95.3% |
| 2 | 34.4 | 78.2% | 72.1% | 73.7% | 94.9% |
| 3 | 32.5 | 78.4% | 72.9% | 70.1% | 92.1% |
| 4 | 30.8 | 76.2% | 67.8% | 67.9% | 92.4% |
| 5 | 30.0 | 75.7% | 67.0% | 67.1% | 92.0% |
| 6 | **29.5** | 75.7% | 66.7% | 65.6% | 90.6% |

- **Depth (rooms reached) is strictly monotone-decreasing** 39.5 → 29.5. Per-step
  deltas: −2.4, −2.7, −1.9, −1.7, −0.8, −0.5. **No dead step** (every step reduces
  depth), **no abusive step** (largest is A1→A2 = −2.7 rooms, ~7% of the run). The
  bite is front-loaded on depth and tapers toward A6.
- **Boss min-HP monotone** 74.6 → 65.6% with the two expected steps: **A3**
  (`bossHpMult` 1.25 first applies — boss min-HP 73.7→70.1, boss rounds 3.48→3.93)
  and **A6** (`bossHpMult` 1.5 — boss rounds 3.99→4.61). Boss win% monotone within
  noise (95.2 → 90.6, ≤0.3pt up-blips at single steps).
- **Mean min-HP & blowout% are flat A0-A3 then step down from A4** (blowout
  72.9→67.8 at A4; mean min-HP 78.4→76.2 at A4). Bite concentrates from **A4**
  (enemies +25% HP & −25% gold), exactly as the modifier table intends.
- **Ascendant-elite step @≥2 is visible:** elite avg-rounds jump 4.97 (A0) →
  6.12 (A2) and hold ~6.2 through A6 (`ELITE_VARIANTS_FROM = 2`), while normal
  rounds stay flat ~3.8 — the elite-specific bite isolates cleanly from the flat ramp.

**Verdict:** the ladder reproduces the #369 baseline **to the decimal** across all
7 rows (deterministic seeds). The merge wave introduced **no difficulty
regression**. Monotonicity, no-dead-step, no-abusive-step, and the A4 bite-onset
all hold.

> **Note — kits are live in the sim, not inert.** The action-mix confirms the new
> systems fire under the bot policy: Fighter `martial-disrupt 14% / martial-defense
> 3% / action-surge 2%`, Barbarian `reckless-attack 22% / martial-disrupt 16% /
> rage 11%`, Ranger `hunters-mark 15% / martial-defense 13% / martial-disrupt 8%`.
> The pool's OFFENSE branch also fires (minority pick, not top-4). So "no
> regression" reflects the kits actually being exercised, not silently skipped.

> **Doc-correction (not a regression):** #369 §3 Read-A lists the A3 **blowout%**
> as 70.1% — which equals that row's own boss-min-HP (70.1%), i.e. a transcription
> slip (column duplicated). Every other cell reproduces exactly; the true A3
> blowout is **72.9%**, which makes the "flat A0-A3 ~72-73% then step from A4"
> narrative cleaner, not weaker.

---

## 2. Twists (A4+ gate) — gate intact, spread unchanged ✅

`sim-feel` twist breakout (twists ride routed early-mid/mid **normal** rooms only,
isolated against clean normals so the flat HP/damage ramp is common to both).

- **Gate correct:** twisted rooms = **n=0 at A0-A3** (every run), ~1,970-2,080 at
  each of A4/A5/A6, all five twist ids present (`DUNGEON_TWISTS_FROM = 4`). The
  gate did **not** break in the wave.
- **Per-twist blowout % (of wins)** — consistent A4→A6; A6 shown vs clean-normal
  **74.3%**:

| Twist | A4 | A5 | **A6** | vs clean (74.3%) |
|---|---:|---:|---:|---|
| cursed-ground | 26.7% | 27.0% | **25.9%** | by far the strongest tension lever |
| quickening | 59.9% | 56.7% | **58.2%** | strong |
| sealed-wards | 65.5% | 63.4% | **66.3%** | moderate |
| bloodscent | 70.2% | 69.9% | **68.9%** | moderate |
| gloom | 67.1% | 67.8% | **75.4%** | ~inert (≈ clean) |

- The spread reproduces #369 **exactly** at A6 (cursed-ground 25.9, quickening
  58.2, sealed-wards 66.3, bloodscent 68.9, gloom 75.4). **No drift.** `cursed-ground`
  (flat HP chip, HP-agnostic) remains the lone strong tension lever; `gloom`
  (first-attack disadvantage) is near-inert on a winning fight.

> **DIRECTION D-twist (Low, carried from #286/#300/#308/#369):** the twist
> severity spread is wide — `cursed-ground` ~26% blowout vs `gloom` ~75% (≈ a clean
> room). If twist *parity* is a goal, `gloom` is the weak end and `cursed-ground`
> the strong end. If twists are meant as a varied bag of severities, this is working
> as designed. *Flag only — fourth corroboration, unchanged by the wave.*

---

## 3. Renown economy — income tracks price, affordability flat ✅

`sim-renown-economy.ts` on the 14-ch `fullChain` run + the live formula
`(clear?50:3) + 2·mobs + 25·bosses + 1·rooms, ×soulMark×renownMult`. These figures
are **deterministic** (read from the live ascension table + upgrade list), so an
exact match to #369 means the wave touched **none** of the economy levers — in
particular **#359 (Grove-at-first-death) moved *when* the Grove appears, not its
prices or structure** (32 nodes, same costs).

### Income vs price scale together (#334 target holds)

| Asc | renownMult (income) | upgradeCostMult (price) | income/price ratio |
|----:|---:|---:|---:|
| 0 | 1.00 | 1.00 | 1.000 |
| 1 | 1.25 | 1.20 | 1.042 (4% player-favourable) |
| 2 | 1.45 | 1.40 | 1.036 |
| 3 | 1.65 | 1.60 | 1.031 |
| 4 | 1.90 | 1.85 | 1.027 |
| 5 | 2.15 | 2.10 | 1.024 |
| 6 | 2.45 | 2.40 | **1.021** |

Income **slightly out-scales** price at every step (ratio ≥ 1, 2-4% player-favourable),
decaying gently toward parity at A6. **No ascension paywall.**

### Runs-to-afford (representative fighter tree, shared + class = 23 nodes)

A competent **14-ch clear** earns **752** renown bare / **1,053** at soulMark 1.4
(→ 2,579 at A6 via renownMult). Tree cost rises with the price mult **in lockstep**:

| Asc | Full-tree cost | Clear income/run | First node (25) | **Max whole tree** |
|----:|---:|---:|---:|---:|
| 0 | 20,084 | 1,053 | ~0.02 runs | **19.1 runs** |
| 3 | 32,132 | 1,737 | ~0.02 runs | 18.5 runs |
| 6 | 48,204 | 2,579 | ~0.02 runs | 18.7 runs |

- **Front-loaded + flat tail.** First meaningful node ~free (one clear funds it
  ~40×); maxing the *entire* tree is **~19 clears at any ascension** — runs-to-afford
  is essentially **flat across the ladder**. Matches #369 exactly.
- **NG+ standing barely renown-gated:** only **2** of 32 Grove nodes are
  ascension-gated — `wellspring-depths` (Asc≥1, 1,526 renown) and
  `crown-of-the-returned` (Asc≥3, 1,212) — ~2.7k of a ~20k tree. NG+ carrots are
  loot-gated, not renown-gated.

### Bot-floor realized income (strict lower bound)

The never-clearing Auto-Battle bot (full-chain `life-records.json`, 6,254
lives) earns mean **~90** renown/run (median 14, deep runs ~249) — a strict lower
bound, since the user clears by hand. Even this floor
funds early Grove nodes quickly; the competent-clear model above is the relevant one
for a player who finishes runs. This figure tracks the *lives sample* (the bot dies
~Ch8-9, so deep lives are rare), **not** an economy change — the live renown formula
is byte-identical to #369. _Repro note: `sim-class-viability` at its default
`SOULS_PER_CLASS=150` OOMs the ~4 GB V8 heap on this machine (~16 min in); the floor
here was regenerated full-chain at a bounded `SOULS_PER_CLASS=30 MAX_LIVES=30` under
`--max-old-space-size=8192`. Not a code fault — pure record-accumulation scale._

> **DIRECTION D-renown (Low / design choice, carried from #369):** renown gates
> almost no NG+-exclusive content (~2.7k of a ~20k tree). If NG+ standing is *meant*
> to gate meta-power behind renown rather than loot, there's room to add
> ascension-gated Grove depth; if loot is the intended NG+ carrot, fine as-is.
> *Design call — flag only.*

---

## 4. XP curve — base caps at Irenicus, ToB tail runs at L20 ✅

`sim-xp-curve.ts`, median of 4,000 routed runs, two routing policies bounding the
band (`random` = casual, `combat` = XP-hungry). `XP_TABLE` L20 cap = 98,000.

### Base game (FULL_CHAIN=0, 11 chapters → Irenicus)

| | Ch11 cumXP | Level at Ch11 |
|---|---:|---:|
| combat (XP-hungry) | 99,206 | **L20** |
| random (casual) | 76,456 | **L18** |

L20 lands **exactly at the Ch11 Irenicus finale** on the combat route, L18 casual —
**matches the #368 expectation to the level.** No XP regression in the base game.

### Full chain (FULL_CHAIN=1, 14 chapters → Melissan)

| Ch | combat cumXP / lvl | random cumXP / lvl |
|---:|---:|---:|
| 11 (Irenicus) | 99,261 / **20** | 76,526 / 18 |
| 12 (Yaga-Shura) | 117,351 / 20 | 90,319 / 19 |
| 13 (Abazigal) | 137,189 / 20 | 105,758 / **20** |
| 14 (Melissan) | 160,182 / 20 | 123,612 / 20 |

- **Ch1-11 XP is identical to the base game** (combat 99,261 vs 99,206; random
  76,526 vs 76,456 — sub-0.1% seed variance), confirming the split shares the base
  chapters byte-for-byte.
- The **ToB tail (Ch12-14) runs at the L20 cap** on the combat route (already L20
  by Ch11) and reaches L20 by Ch13 on the casual route — i.e. ToB is endgame-cap
  content layered past the base L20 finale, as designed. No regression.

---

## DIRECTIONS summary (no tuning applied)

| # | Severity | Finding | Direction |
|---|---|---|---|
| — | — | **Difficulty/ascension ladder** reproduces #369 to the decimal; monotone-harder 0→6, no dead/abusive step, A4 bite-onset. | **No regression.** No action. |
| — | — | **Twist gate** intact (n=0 A0-3); spread reproduces #369 exactly. | **No regression.** No action. |
| — | — | **Renown economy** deterministic-match; ratio ≥1 every step, ~19 clears flat. #359 moved *when* the Grove appears, not prices. | **No regression.** No action. |
| — | — | **XP curve**: base caps L20-combat/L18-casual at Ch11 Irenicus; ToB tail at L20 cap. | **No regression.** Matches #368. |
| D-twist | Low | Twist severities span wide (cursed-ground ~26% blowout vs gloom ~75%). | Parity pass if desired; else a varied bag. *Carried, unchanged.* |
| D-renown | Low | Renown gates ~2.7k of a ~20k tree of NG+ content. | Design call: more ascension-gated Grove depth, or keep NG+ loot-gated. *Carried.* |
| (doc) | — | #369 §3 Read-A A3 blowout cell (70.1%) duplicates its boss-min-HP; true value 72.9%. | Transcription slip in the prior doc — corrected here. |

**Net:** the difficulty curve, ascension ladder, twist system, renown economy, and
XP landing are all **unregressed** by the #338/#343/#357/#360/#365/#359/#367 merge
wave. Every deterministic figure reproduces the #369 baseline exactly, and the
stochastic difficulty ladder reproduces it bit-for-bit on the shared seeds — with
the wave's new kits verified firing in the sim. The only standing flags are the two
**Low / carried** design-choice directions above (twist parity, renown gating) and
the half-1 **Melissan-cliff** direction (#369 D1), which is out of this lane's scope
(ToB boss-wall, measured by `sim-ngplus-tob`) and unchanged here.

---

_Lane: `feat/sim-fullsystem-difficulty-economy`. Measurement only — `git restore`
was run on the sim-rewritten `game-feel.raw.md` / `class-viability.md` /
`life-records.json` (regenerated transiently by the runs, not authored here)._
