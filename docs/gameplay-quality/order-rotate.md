# Rotate strategy — does swapping class between lives beat committing?

> Quality investigation. Sim source: `scripts/sim-order-rotate.ts`.
> Raw output: [`order-rotate.raw.md`](./order-rotate.raw.md).
> 150 souls × 100 lives × 4 strategies. Full meta loop + ascension ladder.
> Re-run: `SOULS=150 LIVES=100 npx tsx scripts/sim-order-rotate.ts`.

Tests the hub `selectCharacter` / `carrySoulProgress` feature: change character
between lives WITHOUT losing renown. The **rotate** soul cycles
Fighter → Rogue → Wizard → repeat, one class per life, carrying renown + Grove +
unlocked ascension across the swap. Three `*-only` baselines stay one class
under the identical loop. Every soul pushes its highest unlocked ascension; a
clear opens the next rung (Spire-style, capped A6).

## TL;DR — verdict: **rotating LOSES. It is strictly dominated by every single-class baseline.**

| Strategy | Clears/soul | Mean final ascension | A6 reached | Final renown | Grove ranks |
|------|---:|---:|---:|---:|---:|
| **rotate** | **4.60** | **4.51** | **22.0%** | **196** | 33.1 |
| fighter-only | 6.03 | 5.63 | 72.0% | 259 | 28.8 |
| wizard-only | 6.33 | 5.71 | 77.3% | 423 | 29.6 |
| rogue-only | 27.39 | 6.00 | 100.0% | 1187 | 35.6 |

Over 100 lives, rotate climbs the ascension ladder **slower than even the
weakest single class** (4.51 vs fighter's 5.63), clears **6× less than
committing to rogue** (4.60 vs 27.39), and banks the **least renown of any
strategy**. Swapping does not average the three classes — it drags the soul
*below* the floor of all of them.

## Why rotating loses — three compounding losses

**1. Grove dilution.** Renown is spent on whichever class descends next, so
class-specific upgrades thrash across three kits. Rotate ends with 18.6
class-specific ranks spread over rogue + fighter + wizard — ~6 per kit — vs
rogue-only's 15.6 ranks all in one kit. Any given rotate life runs a
two-thirds-empty class kit.

**2. Weak-link climbing.** The ladder only advances on a *clear* at the current
rung. The "Rotate internals" table is the smoking gun:

| Class (within rotate) | Lives | Clears | Clear% |
|------|---:|---:|---:|
| rogue | 4950 | 573 | 11.6% |
| fighter | 5100 | 114 | 2.2% |
| wizard | 4950 | 3 | **0.1%** |

Rogue lives carry **83% of all rotate clears**. Once rogue clears and bumps the
rung, the next fighter and wizard lives are thrown at an ascension level they
can't beat on a diluted, mis-targeted Grove — the wizard, whose damage upgrades
the rotate Grove never funded, clears **3 times in 4,950 lives**. Two-thirds of
every rotate life is a low-yield attempt at a rung the strong class unlocked.

**3. Renown starvation feedback loop.** Because it clears 6× less, rotate earns
6× less renown (7,113 vs rogue-only's 13,830), so its Grove builds slower, so it
climbs slower — which means fewer clears. The loss compounds on itself.

## The climb curve (mean ascension being played, per 20-life block)

| Lives | rotate | fighter | rogue | wizard |
|------|---:|---:|---:|---:|
| 1–20 | 0.00 | 0.00 | 0.00 | 0.00 |
| 21–40 | 0.01 | 0.06 | 0.21 | 0.03 |
| 41–60 | 0.45 | 0.61 | 1.78 | 0.29 |
| 61–80 | 1.64 | 1.72 | 4.93 | 1.71 |
| 81–100 | 3.39 | 4.29 | **6.00** | 4.26 |

Nobody clears in the first ~20 lives — Grove (HP / AC / potions) has to compound
first; this matches the [reincarnation-loop](./reincarnation-loop.md) finding
that a bare L1 soul can't clear. Rogue's curve goes vertical around life 60 and
hits the A6 ceiling, then farms (86% clear rate, reach 47/50 in lives 81–100).
Rotate tracks the *bottom* of the pack the whole way.

## Degenerate pattern

Not a hard wall — rogue comes around every third life, so the chain always
*eventually* advances; rotate never gets permanently stuck. The pathology is a
**persistent 2–6× slowdown plus renown starvation**: the strong class can't
compound (only 1/3 of lives), the weak lives burn attempts at rungs they can't
clear, and the Grove never specializes. A player who *enjoys* variety pays a
steep, invisible meta-progression tax for it.

## Caveats / fidelity

- **Shops/gold-spend and merchant restock are NOT modelled**, and the blessing
  picker is a survival-first heuristic (flat AC → temp-HP-per-room → regen).
  Both are survival levers a real player uses, so **absolute clear rates are a
  floor** — the first clears only appear after ~40 lives of Grove build. The
  rotate-vs-stay *comparison* is apples-to-apples (every strategy runs the same
  model), and that ordering is the deliverable.
- **Rogue is far stronger than fighter/wizard in this engine** (auto-policy
  Hide → Sneak Attack + sneak-dice Grove scaling) — it reaches A6 in 100% of
  souls while the others top out ~72–77%. This independently reproduces the
  `dd-roguelite-2026-05-29-rogue-meta-journey-sim` result (rogue clears 6/6).
  That class gap is a separate balance observation for the sims to weigh, not a
  fix to make here — per `feedback-balance-from-sims`. It also *amplifies*
  rotate's loss: the bigger the spread between the carry class and the rest, the
  more a forced cycle bleeds.

## Design implication

The `selectCharacter` feature is healthy as a **between-soul choice** (pick the
character you want and commit), but cycling class **every life** is a trap: it
is the single worst meta strategy measured here. If the design wants rotation to
be viable, the lever is **shared/cross-class Grove power** (HP, AC, potions,
stabilise) deep enough that a diluted class kit still clears — today the
class-specific upgrades carry too much of the climb, so concentration wins
decisively.
