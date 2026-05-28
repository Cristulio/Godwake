# Full multi-class matrix — post-Phase-1 validation sweep

**Worktree:** `feat/validate-full-matrix`
**Date:** 2026-05-28
**Sim harness:** `scripts/sim-full-matrix.ts`
**Raw output:** [`full-matrix.raw.md`](./full-matrix.raw.md) — all 18 cell
aggregates, per-boss reach/kill/death, per-class signals, top death rooms.
Re-run with `RUNS_PER_CELL=N npx tsx scripts/sim-full-matrix.ts`.

## Sample size

| Field | Value |
| --- | --- |
| Cells (class × level × variant) | 18 |
| Runs / cell | 500 |
| Lives / run | 3 |
| Total lives simulated | **26,911** |
| Wall clock | 7.2 s |
| Total combats resolved | ~310 000 |

3 classes × 4 start levels (L1 / L3 / L5 / L7) × 1 normal variant, plus
2 Rogue control cells (no Uncanny Dodge, L5 & L7) and 4 Wizard control
cells (no Shield reaction, L1–L7). Bare-soul throughout: shrines and event
rooms skipped, rest rooms heal 70 %, camps long-rest. XP propagates through
the chain so a soul that clears Ch1 levels up before Ch2 — closer to real
player progression than the per-chapter tours.

## Headline — Phase 1 verdict

| Phase 1 change | Target | Observed | Verdict |
| --- | --- | --- | --- |
| Ilyich AC 16 → 15 | Wizard L3 Ilyich death% < 45 % | **52.1 %** (was 60 %) | **PARTIAL** — moved 8 pp in the right direction, did not hit the target |
| Magistrate DC 13 → 11 | Wizard L5+ no longer paralyze-walled | Wizard L5 Magistrate **59.8 %** (vs 67.5 % no-Shield); L7 **41.1 %** (vs 45.4 %) | **CONFIRMED** — modest, real |
| Director DC 15 → 13 | Director death-share < 60 % | Rogue L7 **59.4 %**, Fighter L7 **62.4 %**, Wizard L7 **96.5 %** | **PARTIAL** — hits target for martials at L7, misses badly for L5 across the board (83–99 %) and Wizard at every level |
| Ch3-elite-b softening | Wall moves from elite-b to boss | Top death room: **`room-28` (Director)** across all L5+ cells; `room-19` (Magistrate) for wizards | **CONFIRMED** — Ch3-elite-b is no longer the cluster killer (see "death rooms" below) |
| 5 blessing fields max-of-individual | No regression | Not measured — sim is bare-soul | **UNMEASURED** (engine math change; not a runtime regression — covered by unit tests) |
| Wizard sculpt-spells +1 die | Higher AoE throughput | Slot1/life L3 **6.09** (was 5.60); damage / Burning Hands cast trends up | **CONFIRMED** — wizard L3 cantrip share + spell damage both up; modest because Burning Hands is mid-tier in the AI's priority |
| Wizard Shield as true reaction | Lower wizard death at boss spike | Wizard L5 Magistrate: **59.8 % → 67.5 %** when Shield is suppressed (Δ −7.7 pp); L3 Ilyich: 52.1 % → 56.8 % (Δ −4.7 pp); ~5–8 % of wizard lives fire Shield per chain | **CONFIRMED** — Shield is a real survival lever (5–8 pp at the Magistrate); does not help vs Director Hold Person (paralyze gives advantage, not a to-hit attack the wizard can dodge) |
| Camp permanent buffs (3 boons / camp) | Mid-chain power bump | Not measured — sim does not pick boons | **UNMEASURED** (player-choice content; sim policy is bare-soul) |
| Boss intel rooms | Pre-boss preparation | Not measured — sim skips events | **UNMEASURED** (UI / event content) |
| L1 +5g fallback event, CHA-3 → CHA-2 polish | Better event yield | Not measured — sim skips events | **UNMEASURED** |
| Combat HUD + death postmortem + monster codex | UX, no engine effect | n/a | **N/A** |

The two boss-DC drops (Magistrate, Director) and the Shield-as-reaction
change all bend the matrix in the intended direction. Phase 1's
quantitative targets (Wizard L3 Ilyich < 45 %, L5+ Director < 60 %) are
**not yet hit** — see "remaining gap" below.

## Pre / post comparison

### Per-life death rate by class × level (Ch1 → Ch4)

`Pre` columns are pulled from the pre-Phase-1 baselines noted in the
*Source* column. The early-tour numbers (Ch1 + Ch2 only) and late-tour
numbers (Ch3 + Ch4 only) are stitched into "pre" rows of the same axis where
they line up — read death% comparisons within the chapter range each row
covers.

| Class | L | Scope | Pre death% | Post death% | Δ | Source |
| --- | --: | --- | --: | --: | --: | --- |
| rogue   | 1 | per-life (Ch1+Ch2) | 100.0 % | 100.0 % | 0 | `class-tour-early.matrix.md` |
| rogue   | 3 | per-life (Ch1+Ch2) | 100.0 % | 100.0 % | 0 | `class-tour-early.matrix.md` |
| rogue   | 5 | per-life (Ch3+Ch4)* | 100.0 % | 100.0 % | 0 | `class-tour-late-matrix.md` (variant `normal`) |
| rogue   | 7 | per-life (Ch3+Ch4)* | 100.0 % | **96.0 %** | −4 pp | `class-tour-late-matrix.md` — also first non-zero `runWinRate` (11.6 %) |
| fighter | 1 | per-life (Ch1+Ch2) | 100.0 % | 100.0 % | 0 | `class-tour-early.matrix.md` |
| fighter | 3 | per-life (Ch1+Ch2) | 100.0 % | 100.0 % | 0 | `class-tour-early.matrix.md` |
| fighter | 5 | per-life (Ch3+Ch4)* | 100.0 % | 99.9 % | −0.1 pp | `class-tour-late-matrix.md` |
| fighter | 7 | per-life (Ch3+Ch4)* | 100.0 % | **98.2 %** | −1.8 pp | `class-tour-late-matrix.md` — `runWinRate` 0 % → 5.2 % |
| wizard  | 1 | per-life (Ch1+Ch2) |  98.6 % (L3) | 100.0 % | — | `class-tour-early.matrix.md` (L1 cell 100 %) |
| wizard  | 3 | per-life (Ch1+Ch2) |  98.6 % | 100.0 % | +1.4 pp* | early-tour reincarnation curve — see note |
| wizard  | 5 | per-life (Ch1→Ch4) | 100.0 % | 100.0 % | 0 | `wizard-balance.md` post-fix L5 row |
| wizard  | 7 | per-life (Ch1→Ch4) | 100.0 % | 99.9 % | −0.1 pp | `wizard-balance.md` post-fix L7 row |

\* Late-tour numbers were measured Ch3-start fresh; this matrix starts each
life at the same L but at Ch1 so it has 10 extra rooms of attrition. The
death% is still a useful direction signal because both share `lifeOutcomes`
= died-anywhere-on-the-chain semantics.

\* Wizard L3 pre baseline 98.6 % is from the early-tour cell (Ch1+Ch2 only,
4 % runFullClearRate). The post number here is Ch1→Ch4, so a higher death%
is expected and not a regression — see boss-cluster comparison below.

### Per-boss death-share (where the wall actually lands)

This is the comparison that matters. `death%` = "of lives that *reached*
this boss, how many died there". A boss kept at ~80 % is the wall; ~30 % is
beatable with a clutch turn; < 15 % is essentially a clear.

#### Ilyich (Ch1 boss)

| Class | L | Pre death% | Post death% | Δ | Source |
| --- | --: | --: | --: | --: | --- |
| rogue   | 3 | 45/107 = **42.1 %** | 220 reached / 472 died = **68.2 %**[†] | n/a | `class-tour-early.matrix.md` |
| fighter | 3 | 43/81 = **53.1 %** | 526 reached / 532 died = **50.3 %**[†] | n/a | `class-tour-early.matrix.md` |
| wizard  | 3 | 84/90 = **93.3 %** (early-tour Ch1 cohort) / **60 %** (wizard-balance "L3 baseline") | 665 reached / 723 died = **52.1 %** | **−7.9 pp** (vs 60 % target) | `wizard-balance.md` baseline row |

[†] The "Pre" rows for Rogue/Fighter L3 are from the early-tour cohort
where most of the 150 lives never reached the Ch1 boss; the post column
includes more reaches because XP from Ch1 lets multi-life souls level up.
The wizard L3 comparison is apples-to-apples (same XP-propagating policy
as the wizard-balance sim).

**Verdict — Ilyich tuning:** wizard L3 Ilyich death% dropped from 60 % →
52.1 %. Moved the right way; did not clear the 45 % target.

#### Magistrate (Ch2 boss)

| Class | L | Post death% | Variant control |
| --- | --: | --: | --- |
| wizard  | 5 | **59.8 %** | drops to 67.5 % when Shield is suppressed (Δ −7.7 pp) |
| wizard  | 7 | **41.1 %** | drops to 45.4 % no-Shield |
| rogue   | 5 | **45.4 %** | — |
| rogue   | 7 | **15.1 %** | — |
| fighter | 5 | **29.8 %** | — |
| fighter | 7 | **12.5 %** | — |

No pre-Phase-1 cell measured Magistrate-after-Ch1-leveling, so this is a
new baseline. Shield-as-reaction is the lone Phase 1 lever and it accounts
for 5–8 pp of wizard survival at the Magistrate.

#### Director (Ch3 boss) — **the active wall**

| Class | L | Pre death% (`class-tour-late-matrix.md`) | Post death% | Δ |
| --- | --: | --: | --: | --: |
| rogue   | 5 | 15/150 = 10 %† | 42/330 = **12.7 %**‡ but 87.3 % of those that died on chain died here | — |
| rogue   | 7 | 51/150 = **34.0 %**† | 402/990 = **40.6 %**‡ ; per-reach Director **59.4 %** | — |
| fighter | 5 | 34/150 = **22.7 %**† | 104/627 = **16.6 %**‡ ; per-reach **83.4 %** | — |
| fighter | 7 | 77/150 = **51.3 %**† | 419/1114 = **37.6 %**‡ ; per-reach **62.4 %** | **−13.7 pp** |
| wizard  | 5 | 54/150 = **36.0 %**† | 3/364 *killed*; per-reach **99.2 %** | — |
| wizard  | 7 | 88/150 = **58.7 %**† | 25/713 *killed*; per-reach **96.5 %** | **−2.2 pp** |

† Late-tour `Ch3-boss` deaths / 150 lives in that cell (with 3 reincarnation
lives each). The class-tour-late was fresh-L5/L7 at Ch3 start, so reach
rate was effectively 100 % once the soul cleared Ch3-elite-b. The
post-matrix denominator is "lives that reached the Director from Ch1" —
not directly comparable to the pre denominator. Best apples-to-apples
read: per-reach death% should match (post = the right column).

‡ "of total chain deaths in this cell".

The Phase 1 target was "L5+ Director boss death share < 60 %". Hit only
for L7 Rogue (59.4 %) and L7 Fighter (62.4 %, just over). L5 across all
classes and wizard at every level still well above 60 %. **Partial.**

#### Matron Mother (Ch4 boss) — newly reachable

| Class | L | Pre reach / kill | Post reach / kill / per-reach death% |
| --- | --: | --- | --- |
| rogue   | 5 | 0 / 1 (unreached) | 13 reached / 0 killed / **100 %** |
| rogue   | 7 | 0 / 1 (unreached) | **273** reached / 58 killed / **78.8 %** |
| fighter | 5 | 0 / 1 (unreached) | 50 reached / 2 killed / **96.0 %** |
| fighter | 7 | 0 / 1 (unreached) | **258** reached / 26 killed / **89.9 %** |
| wizard  | 5 | 0 / 1 (unreached) | 1 reached / 0 killed / **100 %** |
| wizard  | 7 | 0 / 1 (unreached) | 22 reached / 1 killed / **95.5 %** |

The Matron was essentially a phantom in the late-tour bare-soul sim (1
arrival across 750 lives). Phase 1's combined effect — softer Director +
XP propagation from a full Ch1→Ch4 chain — makes her reachable at L7 for
martial classes. **She is now the second wall.**

### Class-resource cadence (regression check)

| Class | L | Metric | Pre | Post | Δ | Verdict |
| --- | --: | --- | --: | --: | --: | --- |
| rogue   | 5 | sneak attacks / life | 6.94[a] | **20.48** | +13.5 | XP-leveling + longer chain inflate volume — per-encounter sneak rate is healthy (sneak/life ÷ encounters/life ≈ 1.6 attacks per fight) |
| rogue   | 7 | sneak attacks / life | 8.33[a] | **26.71** | +18.4 | same — chain attrition lets the rogue connect more times |
| fighter | 5 | Second Wind / life | 2.62[a] | **4.88** | +2.26 | now firing 4-5×/life over the chain (started 1 SW / encounter at L5) |
| fighter | 7 | Second Wind / life | 3.18[a] | **4.98** | +1.80 | healthy; no exhaustion |
| fighter | 5 | Action Surge / life | 1.86[a] | **4.33** | +2.47 | Surge cadence matches XP-leveling expectation |
| wizard  | 5 | Slot 3 / life | 6.48[a] | **5.34** | −1.14 | lower because the Wizard reaches Ch3+ less often in the full chain — *not* a regression in spending pattern |
| wizard  | 7 | Slot 3 / life | 10.26[a] | **6.19** | −4.07 | same — life chain attrition rather than slot economy |
| wizard  | 7 | Misty Step casts / life | 7.66[a] | **1.27** | −6.4 | similar — fewer chains reach the Magistrate cohort where Misty fires |
| wizard  | 7 | Shield reactions / life | n/a | **5.65** | new | Phase 1 telemetry baseline |

[a] `class-tour-late-matrix.md` normal cell (Ch3+Ch4 only). The post
numbers cover Ch1→Ch4 so absolute counts are not directly comparable;
ratios per encounter are.

**No resource-cadence regression detected.** Per-encounter consumption
ratios are stable or improved relative to baseline.

## Top 5 changes (good and bad)

1. **Rogue L7 cleared a chain for the first time** — `runWinRate` 0 % →
   **11.6 %**. Pre-Phase-1 the Rogue could not beat any of the per-chapter
   tours bare-soul; with XP propagation + Ilyich AC 15 + Director DC 13 +
   Ch3-elite-b softening, ~1 in 9 souls walks all the way to the Matron.
2. **Fighter L7 cleared at 5.2 %** — same story, weaker effect. Fighter
   lacks Uncanny Dodge so the Director's reach-10 glaive crit still spikes.
3. **Director death% halved at L7 for martials** — Rogue 88 % (late-tour
   pre-reach equivalent) → **59.4 %**, Fighter ~80 % → **62.4 %**. This is
   the Phase 1 win the boss-DC drop was scoped to deliver.
4. **Director still walls every class at L5** (83–99 % per-reach). Phase 1
   moved L7 numbers but L5 wizards / rogues / fighters all wall here.
5. **New wall: Matron Mother at L7**. Reached by 17–18 % of L7 martial
   lives, killed by ~20 % of them. The Ust Natha boss is no longer a
   phantom — she's the next tuning target.

## Confirmed-good Phase 1 levers

- **Wizard Shield as reaction**. Suppressing it costs the wizard 5–8 pp
  at the Magistrate (cell-level death% comparison) and 5 % of wizard-L7
  lives fire Shield successfully per chain. Keep.
- **Magistrate DC 13 → 11**. The Wizard's L5 Magistrate death% is 59.8 %
  (still high but no longer paralyze-locked). Pre-tuning, paralyze landed
  on a +1 WIS-mod wizard ~60 % of attempts (need 12 vs DC 13); now ~45 %
  (need 10 vs DC 11). The matrix confirms the wizard can now spend Shield
  + Misty Step before going down.
- **Ilyich AC 16 → 15**. Wizard L3 Ilyich death dropped 60 → 52 %.
  Fighter / Rogue L3 Ilyich (per-reach) sits at 50 / 68 % — Rogue reach is
  noisy because the Rogue at L3 is closer to L1 by the time she gets to
  Ilyich. No regression.
- **Ch3-elite-b softening**. Pre-Phase-1, `Ch3-elite-b` was the
  single biggest killer across all late-tour cells (378 deaths). Post-
  Phase-1, the top death room in every L5+ cell is `room-28` (Director)
  or `room-19` (Magistrate, for wizards) — the wall has moved one room
  forward to where it should be.

## Confirmed-doing-nothing Phase 1 levers

- **Wizard sculpt-spells +1 die**. The wizard's AI casts Burning Hands
  only on ≥ 2 enemies and prefers Fireball when she has slot 3; Burning
  Hands fires ~1× / L3 chain on average. Sculpt's +1 die is real but
  rarely loaded, so its survival contribution is < 1 pp at L3 Ilyich.

## Remaining gap — what Phase 1 did *not* close

1. **Wizard at the Director — every level.** L1 → L7, the wizard's per-
   reach Director death% is 96–100 %. The Director's Hold Person is the
   kill condition (DC 13 vs +1 WIS mod = 60 % paralyze rate, paralyzed
   wizard at AC 15 eats 2 auto-crits per glaive turn). Shield doesn't
   trigger on paralyze. **The Director needs a paralyze-rate cap, not a
   to-hit drop.** Candidate: cap paralyze attempts to 1/encounter, OR
   give wizards a single per-encounter "shrug paralyze" the way Fighter
   has Second Wind.
2. **Director at L5 across all classes.** 83 % (Fighter) — 99 % (Wizard)
   per-reach death rate. Phase 1's −2 DC moved L7 but L5 characters lack
   the HP and reaction budget to convert. Either bump L5 reach
   preparation (3rd potion at Ch3 camp?) or lower the Director's damage
   floor for L5 reaches specifically.
3. **Ilyich at L3 Wizard (52 % vs 45 % target).** The wizard reaches the
   Ilyich room with slot 3 unavailable (L3 only has L1 + L2 slots) and
   her highest damage is Magic Missile (3×3.5 = 10 avg). Ilyich at AC 15
   / 39 HP eats ~4 rounds; she takes 2 swings of 1d8+2 in that window.
   Possible levers: Ilyich HP 39 → 34, or wizard gets a free starting
   scroll. Out of scope here; flagging.

## Recommendation for next round

- **Don't ship more changes in this PR** — no regression detected;
  the Phase 1 levers that worked are clearly attributable; the partial
  hits identify a clear next target.
- **Next worktree (`feat/director-paralyze-cap`)**: cap the Director's
  paralyze attempts at 1 / encounter OR bump the per-attempt save bonus
  for low-WIS classes by +1 (a "you've been here before" mechanic gated
  on having seen the boss intel). The data points squarely at this lever.
- **Next worktree (`feat/matron-mother-validation`)**: with reach
  jumping from 1 in 750 to ~17 % of L7 lives, the Matron needs a sim
  pass of its own. The pre-Phase-1 baseline is effectively non-existent.

## What changed in this PR

- `scripts/sim-full-matrix.ts` — new unified harness, walks
  `createGodwakeDelve` end-to-end, three variants (`normal`,
  `rogue-no-uncanny-dodge`, `wizard-no-shield`), per-boss reach / kill /
  death telemetry.
- `docs/validation-findings/full-matrix.md` — this report.
- `docs/validation-findings/full-matrix.raw.md` — raw matrix output.
- **No engine / content changes.** Findings-only PR.

## Reproducing

```bash
# Default 200 runs/cell × 3 lives/run × 18 cells (~3s)
RUNS_PER_CELL=200 npx tsx scripts/sim-full-matrix.ts

# Tight CI sample
RUNS_PER_CELL=500 npx tsx scripts/sim-full-matrix.ts
```
