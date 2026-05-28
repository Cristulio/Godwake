# Late-game class tour — Ch3 + Ch4

**Worktree:** `feat/playtest-class-tour-late`
**Date:** 2026-05-27
**Sim harness:** `scripts/sim-class-tour-late.ts`
**Raw matrix:** [`class-tour-late-matrix.md`](./class-tour-late-matrix.md) — all
tables (per-cell aggregates, resource exhaustion, per-boss / per-room death
clustering, per-class detail). Re-run with `RUNS_PER_CELL=N npx tsx
scripts/sim-class-tour-late.ts`.

## Setup

Three classes (Rogue / Fighter / Wizard) walked through the **Spellhold (Ch3) →
Ust Natha (Ch4)** chain starting at L5 and L7. Each "run" = one soul with
**3 lives** — on death the soul reincarnates back to the start level and tries
again, up to 3 attempts. 50 runs/cell. Shrines / events skipped (bare-soul
floor — no blessings, no event rewards, no item purchases). Rest rooms heal
70 %; the camp between chapters is a long rest. Player AI per class follows
the existing sim policies in `scripts/sim-fighter.ts`, `scripts/sim-wizard.ts`,
and `src/sim/rogueSim.ts`. Added: potion-quaff at ≤ 30–35 % HP for all classes
(Fighter & Wizard previously didn't drink theirs).

Late-game-specific instrumentation:
- Per-class resource exhaustion at the boss (Rogue: Cunning empty; Fighter:
  Second Wind spent; Wizard: out-of-slots in the chapter).
- Uncanny Dodge control flag (`variant: no-uncanny-dodge`) — pre-sets the
  rogue's reaction so the L5+ damage-halving reaction never fires. Lets us
  isolate UD's contribution.
- Per-boss death attribution (Asylum Director vs Matron Mother) — not just
  per-room.

## Headline

**Bare-soul run-win is 0 % for every class at both L5 and L7, even with 3
lives.** Per-encounter win rate is 69–79 %, so individual fights are
winnable — but the cumulative attrition across an 11-encounter Ch3 + Ch4 chain
spends a fresh-rolled L5 character's resource pool well before the boss
cluster.

## Per-boss death clustering

| Boss | Deaths (normal cells: 6 × 50 runs × ≤ 3 lives) |
|---|---|
| **Asylum Director (Ch3, CR 5)** | **240** |
| Matron Mother (Ch4, CR 6) | 1 |

Only **one** of ~750 lives ever reached and fell to the Matron Mother. The
Ust Natha chapter is effectively unreachable bare-soul. **The Director —
not the Matron Mother — is the late-game gate.**

Top death rooms across the matrix (from the raw report):

| Room | Cumulative deaths across all 6 normal cells |
|---|---|
| **`Ch3-elite-b`** | 378 — the consistent killer for every class |
| **`Ch3-boss`** (Director) | 240 |
| `Ch3-elite-a` | 115 |
| `Ch3-mid` | 149 |
| Ch4 anything | 14 |

The wall is at the **second Ch3 elite room** — players are arriving at
`Ch3-elite-b` already low on HP / clutch buttons because they spent them on
the warmup / mid / first elite, and the room finishes them.

## Diagnoses

### Q1 — Does the "Ch3 boss cluster wall" still hold?

**Confirmed, and universal across all three classes.**

The L5+ Fighter sim flagged this in session 3. The class-tour-late data shows
it is **not class-specific** — Rogue, Fighter, and Wizard all wall out at the
same Ch3 elite + boss cluster:

- Rogue L5 normal: ~143 deaths in Ch3 elites/boss out of 150 lives.
- Fighter L5 normal: ~126 deaths in Ch3 elites/boss out of 150 lives.
- Wizard L5 normal: ~99 deaths in Ch3 elites/boss out of 150 lives.

Per the project's class-balance philosophy ("bosses are meant to wall; don't
trivialize, but flag if the wall is at L5 instead of L6"), the wall arriving
at L5 is design-intended. The new finding is that the wall lands one room
*before* the boss (the second elite) for Rogue / Fighter, and lands at the
boss for the Wizard.

### Q2 — Uncanny Dodge L5 effectiveness (PR #70)

**Real and earning its keep. Keep.**

Comparing normal vs `no-uncanny-dodge` Rogue cells:

| Cell | Enc-win | Δ | Sneak attacks / life | Δ |
|---|---|---|---|---|
| Rogue L5 normal | 69 % | — | 6.94 | — |
| Rogue L5 no-UD | 61 % | **−8 pp** | 4.75 | **−32 %** |
| Rogue L7 normal | 75 % | — | 8.33 | — |
| Rogue L7 no-UD | 67 % | **−8 pp** | 5.85 | **−30 %** |

UD does not bridge the wall — both variants are 0 % run-win — but it buys the
rogue **+8 percentage points of fights survived** and roughly **+30 % more
sneak attacks per life** because she's alive for more turns. The raw
dmg-taken numbers look similar (177 vs 164) only because no-UD rogues die
faster and stop taking damage sooner.

Without UD, the Rogue's death pattern shifts dramatically: Ch3-elite-b stops
being the wall (no-UD rogue dies on `Ch3-mid` and `Ch3-elite-a` long before
reaching the second elite). With UD active, she survives `Ch3-mid` and
`Ch3-elite-a` consistently and only walls at `Ch3-elite-b` + Director.
That's exactly the "first hit per round halved" design intent firing.

### Q3 — Wizard spell exhaustion at L5 / L7

**Not a slot problem. A Director problem.**

| Metric | L5 | L7 |
|---|---|---|
| Ran out of slots in a chapter | **6 %** | **0 %** |
| Cantrip share of total damage | 8 % | 7 % |
| Fire Bolt hit-rate at Ch3+ ACs | 60 % | 64 % |
| Slot 3 used per run | 6.14 | 10.48 |
| Director deaths (out of 150 lives) | 28 | **84** |

Two surprises:

1. **The Wizard rarely runs out of slots.** `shortRestHeal` already
   refreshes wizard slots (see `src/engine/character/actions.ts:69`), so
   each rest room and the camp between chapters refill the well. Slot
   recovery is **already fine** — the playtest worry "wizard runs out of
   spells before chapter ends" is not what the data shows.
2. **L7 Wizard dies at the Director 56 % of the time** (84 of 150 lives).
   This is the largest single-cell concentration in the entire matrix —
   bigger than any other class/boss pairing. The Director's Hold Person
   opener (DC 15 WIS save vs a wizard with WIS 12 → +1) catches the
   wizard, and a paralyzed wizard at AC 15 (Mage Armor) eats two automatic
   crits from the 2d8+4 glaive at reach 10 before she gets a turn. Fire
   Bolt + INT mod is fine; Mage Armor + DEX is fine; **the WIS-save floor
   against the Director is the kill condition**.

### Q4 — Boss-specific death clustering

Surfaced above — the Director takes 240+ of 240+ boss deaths; the Matron
Mother takes 1. Ch4 is effectively a phantom in the bare-soul sim.

## Resource exhaustion at the boss

From the raw matrix (excerpt):

| Class | L | Variant | Lever empty at boss |
|---|---|---|---|
| Fighter | 5 | normal | Second Wind spent: **40 %** |
| Fighter | 7 | normal | Second Wind spent: **86 %** |
| Rogue | 5 | normal | Cunning Action empty: 6 % |
| Rogue | 7 | normal | Cunning Action empty: **54 %** |
| Wizard | 5 | normal | Out-of-slots in chapter: 6 % |
| Wizard | 7 | normal | Out-of-slots in chapter: 0 % |

L7 amplifies resource pressure for the martial classes — Fighter is at the
boss with Second Wind spent in 86 % of fights, Rogue with no Cunning Action
in 54 %. Wizard L7 is the opposite (more slots to spend) but pays for it at
the Director's Hold Person.

## Recommended levers (no fix applied in this PR)

The brief allowed for one small lever if "clear, narrow, multi-class-safe".
The data points at **three different candidate levers** with different
trade-offs — none of them are strictly dominant, so the call belongs to the
design owner, not the sim agent. Surfacing here:

1. **`Ch3-elite-b` is the single biggest killer for Rogue + Fighter** (64 /
   80 / 75 / 66 deaths across the 4 normal R/F cells = 285 of 600 lives).
   The `ELITE_POOL` second-pick composition is doing more work than the
   boss. A small XP/gold bump on the elite rooms or a tone-down of the
   most lethal elite compositions would push the wall toward the boss —
   where it belongs per philosophy.
2. **Asylum Director vs Matron Mother: 240 vs 1 deaths.** Director CR is
   5, Matron Mother CR is 6. The Director is over-walling and the Matron
   Mother is under-walling in the bare-soul case. Two possible reads:
   (a) the Director's Hold Person opener at DC 15 is unfair to low-WIS
   classes (especially L7 Wizard at 84/150), or (b) the Matron Mother is
   never reached so we don't know what she'd do — re-run with a `loaded`
   variant (defensive-blessing player) before any HP / DC change.
3. **Per-delve potion economy.** Fighter spends 5.96 potions / run (3 lives
   × 2 starting potions = 6) — using everything. Bumping starting potions
   to 3 for Fighter, or having potions persist across reincarnation, would
   test whether the wall is HP attrition or DPS curve.

### Don't touch

- **Wizard slot recovery.** Already per-rest-room, already plenty (0–6 %
  exhaustion rate). Slot economy is not the bottleneck.
- **Fighter Second Wind cadence.** PR #11 fixed this (now per-encounter).
  Fighter still walls at Ch3 but it's not because Second Wind is too
  slow — it's because the damage budget on Ch3 elites burns through it.
- **Uncanny Dodge.** PR #70 is doing its job (+8 pp enc-win, +30 % sneak
  attacks per life). Do not revert; do not buff.
- **Matron Mother / Ust Natha.** Essentially unreached at this sample —
  no signal to act on.

## What this PR does

Findings only. New sim harness at `scripts/sim-class-tour-late.ts` (output
written to `docs/playtest-findings/class-tour-late-matrix.md`), this curated
report, zero engine / content changes.

## Reproducing

```bash
# Default 50 runs/cell × 3 lives/run (8 cells = ~3 seconds)
npx tsx scripts/sim-class-tour-late.ts

# Larger sample
RUNS_PER_CELL=200 npx tsx scripts/sim-class-tour-late.ts
```
