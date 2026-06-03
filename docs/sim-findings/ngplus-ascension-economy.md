# New Game+ — ToB arc, ascension ladder & renown economy — sim findings

> **MEASURE-ONLY lane.** No balance / statblock / XP / renown / content was
> changed. Everything below is observation + **DIRECTIONS** for a later tuning
> lane to act on. Raw tables: [`ngplus-tob.raw.md`](./ngplus-tob.raw.md) (this
> lane's new harness) + the renown console dump reproduced in §3.

## What this validates

The campaign was split (#367): the **base game ends at Irenicus (Ch11)**; **New
Game+ runs the full fourteen-chapter chain** (`createGodwakeDelve({ fullChain: true })`)
through the Throne-of-Bhaal arc — **Ch12 Yaga-Shura · Ch13 Abazigal/Sendai ·
Ch14 Melissan**. This lane validates the NG+ experience on three axes:

1. **ToB reachability + survivability** — is the 14-ch chain well-formed, and is
   the ToB arc a fair fight at the power a player arrives with, a brick wall, or a
   pushover?
2. **Ascension ladder** (the core NG+ knob) — is difficulty monotone-harder 0→6?
3. **Renown economy across NG+** — does income track the Grove price ladder, or is
   NG+ standing too cheap / too expensive?

### Harnesses + how to reproduce

| Harness | Measures | Command |
|---|---|---|
| `scripts/sim-ngplus-tob.ts` (**new, this lane**) | structure + ToB survivability (gear-light **and** representative-geared), ascension sweep | `SEEDS=60 ASCENSIONS=0,1,2,3,4,5,6 npx tsx scripts/sim-ngplus-tob.ts` |
| `scripts/sim-feel.ts` (ASCENSION knob) | full-chain difficulty per ascension | `ASCENSION=0..6 RUNS=40 npx tsx scripts/sim-feel.ts` |
| `scripts/sim-renown-economy.ts` | Grove cost vs income, runs-to-afford | `npx tsx scripts/sim-renown-economy.ts` (reads `life-records.json` from sim-class-viability `fullChain`) |

### Read-this-relative caveats (carried from the balance memory)

- **AI-floor.** The shared Auto-Battle bot underplays a real player. It dies
  ~Ch8-9 even started at L20, so it never *walks* to the ToB arc — which is why §2
  measures ToB by dropping an **arriving player** straight into the late chapters
  rather than reading bot reach. Absolute clear-rates are a floor, not game truth.
- **Two power brackets in §2.** "Gear-light" = L20 archetype + 11 accrued shrine
  blessings, starter gear only (a conservative floor). "Geared" = the same build +
  a high-rarity item rolled into each slot at Throne depth + two attuned class
  legendaries (the loadout the loot loop hands a real NG+ player by the ToB arc).
  The truth sits between, nearer the geared bracket. Read the **shape**, not the
  magnitudes.

---

## 1. ToB reachability + structure — ✅ sound

Routed **400 `fullChain` seeds** through `sim-ngplus-tob.ts`:

| Check | Result |
|---|---|
| Chapter bosses per run | **14**, chapters `1,2,…,14` in order, every seed |
| Terminal room | `melissan` (Ch14 boss), zero outgoing edges, every seed |
| Camp seams | **13** (= chapters − 1), every seed |
| Orphan rooms (BFS from entry over `next`) | **0**, every seed |
| Mean rooms / run | ~217 in graph; **122.6 on a routed path** |

- Rooms per chapter are uniform (~15.5 in graph, ~8.8 routed) for Ch1-13; **Ch14
  is slightly leaner** (14.5 graph / 7.9 routed) — a tighter finale chapter.
- **Depth past Ch11 (the ToB arc):** 45.5 graph rooms, **25.5 on a routed path** —
  i.e. a NG+ run is ~+26% longer than a base (Ch1-11) run, and the routed ToB tail
  is a substantial ~21% of the journey.

**Verdict:** the camp-seam invariant holds at scale; every NG+ run is a complete
chain that reaches Melissan with no disconnected rooms. No structural DIRECTION.

---

## 2. ToB survivability — fair fights, with one cliff (Melissan)

Boss **wall check**: rested arriving player dropped onto each chapter boss at full
HP, 300 attempts/cell (5 classes × 60 seeds). Ch10/11 are the late-base-game
**calibration baseline**; Ch12-14 are the ToB arc.

### Boss win% — gear-light floor vs representative-geared (the truer read)

| Boss | Gear-light A0 | **Geared A0** | Geared A3 | **Geared A6** |
|---|---:|---:|---:|---:|
| Ch10 (base) | 92.7% | 98.3% | 96.3% | 84.0% |
| Ch11 Irenicus (base finale) | 36.7% | 86.7% | 71.0% | 49.3% |
| Ch12 Yaga-Shura ⟨ToB⟩ | 24.0% | 91.3% | 75.7% | 60.0% |
| Ch13 Abazigal ⟨ToB⟩ | 54.3% | 91.7% | 68.0% | 51.3% |
| **Ch14 Melissan ⟨ToB⟩** | **0.0%** | **24.3%** | **8.3%** | **2.7%** |

- **Ch11-13 are fair geared fights.** With realistic gear the arriving player wins
  the Irenicus, Yaga-Shura, and Abazigal fights ~87-92% at A0, decaying smoothly
  with ascension (A6 ~49-60%). Geared *win* min-HP for these sits at **50-68%** —
  real fights with teeth, not blowouts, not walls. The ToB trio is tuned right.
- **Gear closes the floor cleanly for Ch11-13.** Gear-light → geared at A0 lifts
  Ch11 37→87%, Ch12 24→91%, Ch13 54→92%. The gear-light floor build chips these
  bosses to ~25-37% HP before dying — exactly the "beatable once geared" signature.
- **Ch14 Melissan is a difficulty CLIFF.** Even fully geared, rested, full HP at
  the *base* NG+ ascension she is a **24%** fight (min-HP on a win **21%** — every
  geared win is clutch), and on a loss the geared player still leaves her at
  **>53% HP**. By A6 she is ~3%. She is 3-4× harder than any boss before her, the
  gear-light build removes only ~25% of her bar (75% HP-on-loss), and she kills
  fast (~6.6 rounds vs 10-18 for the others).

> **DIRECTION D1 (headline): Melissan is a cliff, not a ramp.** The Ch13→Ch14
> step is 91.7% → 24.3% geared at A0 — the single largest difficulty jump in the
> game, and it lands on the *first* NG+ finale a player meets. She is beatable
> (a learn-the-fight, multi-attempt final boss — defensible for a capstone), but
> the magnitude is extreme relative to the otherwise-tight Ch11-13 band. Decide
> whether the finale spike is intended at this size, especially at **A0** (the
> first NG+ clear). If softening is wanted, her statblock is the lever — her HP is
> barely dented even by a geared player (the wall is HP **and** burst, since she
> also kills in ~6.6 rounds). *No tuning applied here — flag only.*

> **DIRECTION D2 (minor / floor-only): gear-light Ch12>Ch13 inversion.** At the
> gear-light floor, Yaga-Shura (24%) reads *harder* than Abazigal (54%) — the
> first ToB boss tougher than the second. But under realistic gear the two are
> level (91.3% vs 91.7% at A0), so the inversion is a floor artifact, not a
> geared-player reality. Low priority; note only if floor-difficulty smoothness
> matters.

### Whole-chapter attrition (gear-light floor — read as a floor only)

Walking camp→boss with no free heals, the gear-light build is walled by ToB
**trash/elite rooms** (Ch12 has half-giant-siegebreakers; Ch14 fields two
marilith-warden elite rooms) and rarely reaches the boss (Ch11-14 chapter-clear%
≈ 0-17% at A0). This is the conservative floor — the §2 geared boss check shows the
encounters themselves are fair, so the attrition number reflects the *missing gear*,
not the content. Not a DIRECTION on its own; it does corroborate that the ToB arc
expects an endgame-geared, not bare, arriving player.

---

## 3. Ascension ladder — monotone harder 0→6, no dead/abusive step ✅

Two independent reads agree the ladder is monotone-harder.

### Read A — full chain (`sim-feel`, 800 runs/ascension, AI-floor, early-chapter dominated)

| Asc | Mean rooms reached | Mean min-HP (all) | Blowout % | Boss min-HP | Boss win% |
|----:|------------------:|------------------:|----------:|------------:|----------:|
| 0 | **39.5** | 79.3% | 72.9% | 74.6% | 95.2% |
| 1 | 37.1 | 78.6% | 71.9% | 74.1% | 95.3% |
| 2 | 34.4 | 78.2% | 72.1% | 73.7% | 94.9% |
| 3 | 32.5 | 78.4% | 70.1% | 70.1% | 92.1% |
| 4 | 30.8 | 76.2% | 67.8% | 67.9% | 92.4% |
| 5 | 30.0 | 75.7% | 67.1% | 67.1% | 92.0% |
| 6 | **29.5** | 75.7% | 66.7% | 65.6% | 90.6% |

- **Depth (rooms reached) is strictly monotone decreasing** 39.5→29.5 — the
  cleanest signal; every step is harder. Boss min-HP is monotone (74.6→65.6%).
  Mean min-HP and blowout% are monotone within noise (a negligible +0.2pt mean-HP
  blip A2→A3; blowout% is flat A0-A3 then steps down from A4).
- **No dead step** (every step reduces depth) and **no abusive step** (biggest
  single depth drop is A0→A1 = −2.4 rooms; biggest boss-tension step is A3 where
  `bossHpMult` 1.25 first applies). The ladder's bite is mild on trash through A0-A3
  and concentrates from **A4** (enemies +25% HP & −25% gold) and on **bosses from
  A3/A6** (boss HP +25%/+50%).

### Read B — ToB bosses isolated (`sim-ngplus-tob`, geared arriving player)

Every ToB boss is monotone-harder A0→A6 under realistic gear (win%):

| Boss | A0 | A1 | A2 | A3 | A4 | A5 | A6 |
|---|---:|---:|---:|---:|---:|---:|---:|
| Ch12 Yaga-Shura | 91.3 | 90.0 | 88.0 | 75.7 | 72.7 | 69.0 | 60.0 |
| Ch13 Abazigal | 91.7 | 89.3 | 87.3 | 68.0 | 61.3 | 63.0 | 51.3 |
| Ch14 Melissan | 24.3 | 21.0 | 21.7 | 8.3 | 6.3 | 6.0 | 2.7 |

All monotone down within noise (≤2pt up-blips at single steps). **A3 is the
sharpest step** for every boss (the boss-HP modifier), A6 a second notable boss step
— exactly as the modifier table intends.

### Twists (gated A4+) — gate correct, cursed-ground is the outlier

Twists fire only at Asc ≥ 4 (`sim-feel` shows `n=0` twisted rooms A0-A3, ~2000 at
A4-A6 — gate correct). On normal rooms at A6, blowout% by twist:

| Twist | Blowout % | vs clean normal (74.3%) |
|---|---:|---|
| cursed-ground | **25.9%** | by far the strongest tension lever |
| quickening | 58.2% | strong |
| sealed-wards | 66.3% | moderate |
| gloom | 75.4% | ~inert (near clean) |
| bloodscent | 68.9% | moderate |

> **DIRECTION D3 (minor): twist spread is wide.** `cursed-ground` (flat HP chip)
> drops blowout to ~26% while `gloom` barely moves it (~75%, ≈ a clean room). This
> reproduces the third+ corroboration in the memory (#286/#300/#308). If twist
> *parity* is a goal, gloom is the weak end and cursed-ground the strong end —
> but if twists are meant to be a varied bag of severities this is working as
> designed. *Flag only.*

> **DIRECTION D4 (minor): the A0-A3 band is soft on trash.** Through A3 the HP/dmg
> bumps mostly *lengthen* fights without raising trash tension (blowout% flat ~72%,
> depth deltas −2.4→−1.9). The ladder reads "real" from A4. This is consistent with
> prior passes and the over-levelled-early-chapter sweep artifact; not a defect
> (depth is still monotone). If more early-ascension bite is desired, A1-A2 are the
> soft steps — but raising them risks the early game, so weigh carefully. *Flag only.*

---

## 4. Renown economy across NG+ — well-matched, slight player tilt ✅

From `sim-renown-economy.ts` on the 14-ch `fullChain` run + the live formula
`(clear?50:3) + 2·mobs + 25·bosses + 1·rooms, ×soulMark×renownMult`.

### Income vs price scale together (the #334 target holds)

| Asc | renownMult (income) | upgradeCostMult (price) | income/price ratio |
|----:|---:|---:|---:|
| 0 | 1.00 | 1.00 | 1.000 |
| 1 | 1.25 | 1.20 | 1.042 (4% player-favorable) |
| 2 | 1.45 | 1.40 | 1.036 |
| 3 | 1.65 | 1.60 | 1.031 |
| 4 | 1.90 | 1.85 | 1.027 |
| 5 | 2.15 | 2.10 | 1.024 |
| 6 | 2.45 | 2.40 | **1.021** |

- Income **slightly out-scales** price at every step (ratio ≥ 1, 2-4% in the
  player's favour), decaying gently toward parity at A6. **NG+ is never "too
  expensive" — income tracks cost.**

### Runs-to-afford (representative fighter tree)

A competent **14-ch clear** earns **752** renown bare / **1053** at soulMark 1.4
(scaling to 2579 at A6 via renownMult). The fighter Grove tree (shared + class, 23
nodes) costs **20,084** at A0, rising to **48,204** at A6.

| Asc | Full-tree cost | Clear income/run | First node (25) | **Max whole tree** |
|----:|---:|---:|---:|---:|
| 0 | 20,084 | 1,053 | ~0.02 runs | **19.1 runs** |
| 3 | 32,132 | 1,737 | ~0.02 runs | 18.5 runs |
| 6 | 48,204 | 2,579 | ~0.02 runs | 18.7 runs |

- **Front-loaded + flat tail.** The first meaningful node is effectively free (one
  clear funds it ~40×). Maxing the *entire* tree is **~19 clears at any
  ascension** — because income and price rise together, runs-to-afford is
  essentially **flat across the ladder** (climbing doesn't make the Grove cheaper
  or dearer in run terms). Healthy: cheap to start tuning your soul, a long tail
  for completionists, no ascension paywall.
- The longer NG+ run is itself an income premium: 14 chapters yield **752** base
  renown/clear vs ~600 for an 11-ch base run (≈ +25%, before renownMult) — so NG+
  out-earns the base game on length alone, on top of the multiplier.

### NG+-exclusive content is mostly loot-gated, not renown-gated

Only **two** Grove nodes are ascension-gated: `wellspring-depths` (Asc ≥ 1, 1,526
renown) and `crown-of-the-returned` (Asc ≥ 3, 1,212) — both cheap relative to the
~20k tree. The NG+-exclusive **sets / legendaries** are gated by **loot drops &
shop gold**, not renown.

> **DIRECTION D5 (minor / design choice): renown barely gates NG+ standing.** The
> only renown-priced NG+-exclusive content is ~2.7k renown of Grove nodes (a rounding
> error against the tree). If NG+ standing is *meant* to gate meta-power behind
> renown (rather than behind loot), there's room to add ascension-gated Grove
> depth. If loot is the intended NG+ carrot, this is fine as-is. *Design call —
> flag only.*

### Bot-floor sanity (lower bound)

The never-clearing bot floor earns mean ~161-202 renown/run (median 50, deep runs
~378) across 9,746 sim lives — a strict lower bound (the user clears by hand). Even
this floor funds early Grove nodes quickly; the competent-clear model above is the
relevant one for a player who finishes runs.

---

## DIRECTIONS summary (no tuning applied — for a later balance lane)

| # | Severity | Finding | Direction |
|---|---|---|---|
| **D1** | **High** | Melissan (Ch14) is a difficulty cliff: 24% geared/rested/full-HP at A0 (vs 87-92% for Ch11-13), ~3% at A6; barely dented at the gear-light floor. | Decide if the finale spike is intended at this magnitude, esp. at A0. If softening, her HP+burst statblock is the lever. |
| D2 | Low | Gear-light Ch12>Ch13 boss inversion; washes out under gear (both ~91%). | Floor artifact — note only. |
| D3 | Low | Twist severities span wide (cursed-ground 26% blowout vs gloom 75%). | Parity pass if desired; else working as a varied bag. |
| D4 | Low | A0-A3 ladder band is soft on trash tension (bite starts A4). | Raise A1-A2 only if early-ascension bite is wanted — weigh early-game risk. |
| D5 | Low | Renown gates almost no NG+-exclusive content (~2.7k of a ~20k tree). | Design call: add ascension-gated Grove depth, or keep NG+ carrots loot-gated. |

**Net:** the NG+ chain is **structurally sound** (every run reaches Melissan), the
**ascension ladder is monotone-harder 0→6 with no dead or abusive step**, and the
**renown economy is well-matched** (income tracks cost; affordability flat across
the ladder). The one substantive flag is **Melissan as an outsized final-boss
cliff** — beatable, but 3-4× harder than the rest of the ToB arc even with endgame
gear.

---

_Lane: `feat/sim-ngplus-ascension-economy`. Measurement only — `git restore` was
run on the sim-rewritten `class-viability.md` / `game-feel.raw.md` /
`life-records.json` (regenerated transiently by the runs, not authored here)._
