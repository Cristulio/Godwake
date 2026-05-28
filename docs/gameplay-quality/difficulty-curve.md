# Difficulty-curve health — post-Phase-1 sweep

**Question.** Phase 1 landed 13+ PRs of balance + feature work, and the
validation round (PRs #92-100) confirmed each individual lever works.
The meta question this doc answers: **did the *curve itself* become
healthier, or did the cliffs just move?**

**Method.** `scripts/sim-difficulty-curve.ts` — Rogue / Fighter / Wizard
× start L1 / L3 / L5 / L7, 300 runs × 3 reincarnation lives per cell
(900 lives / cell, 10 800 lives total). Bare-soul: no shrines, no event
rewards, no items, no shop. Rest rooms heal 70%, camps long-rest.
Tracks per room: lives reached, lives died, top death cause. Raw output:
[`difficulty-curve.raw.md`](./difficulty-curve.raw.md).

Bare-soul is deliberately harder than a real player. The point is to
isolate the **shape** of the curve from item RNG. Absolute death-rates
are not "what a player would feel" — the **per-room deltas** and the
**ratio between neighbouring rooms** are.

## Per-room death-rate heatmap (L5 starts, the canonical comparison)

`Death% = deaths in room / lives that reached the room.` `—` means no
life in that cell reached the room (filtered by an earlier death).

| Room | Kind | Rogue | Fighter | Wizard | Verdict |
|------|------|------:|--------:|-------:|---------|
| r1   | combat | 0.0% | 0.0% | 0.0% | trivial (intended at L5) |
| r2   | shrine | — | — | — | (skipped in bare-soul) |
| r3   | event  | — | — | — | (skipped) |
| r4   | combat | 0.0% | 0.0% | 0.0% | trivial |
| r5   | rest   | 0% | 0% | 0% | **healthy** |
| r6   | combat | 0.1% | 0.0% | 0.0% | trivial |
| r7   | shrine | — | — | — | (skipped) |
| r8   | combat | 0.7% | 0.2% | 0.0% | warmup |
| r9   | event  | — | — | — | (skipped) |
| intel-ch1 | event | — | — | — | (skipped) |
| **r10 (Ilyich)** | boss | **4.0%** | **1.0%** | **9.0%** | trivialised — under-tuned for L5 |
| r11 (Camp 1) | camp | 0% | 0% | 0% | **healthy** |
| r12  | combat | 0.1% | 0.0% | 0.0% | trivial |
| r13  | shrine | — | — | — | (skipped) |
| r14  | event  | — | — | — | (skipped) |
| r15  | combat | 6.1% | 2.0% | 1.8% | attrition |
| r16  | rest   | 0% | 0% | 0% | **healthy** |
| r17  | combat | 8.3% | 2.0% | 0.2% | attrition |
| r18  | shrine | — | — | — | (skipped) |
| intel-ch2 | event | — | — | — | (skipped) |
| **r19 (Magistrate)** | boss | **43.0%** | **31.6%** | **58.0%** | **healthy wall** |
| r20 (Camp 2) | camp | 0% | 0% | 0% | **healthy** |
| r21  | combat | 0.5% | 0.2% | 4.2% | warmup |
| r22  | shrine | — | — | — | (skipped) |
| r23  | event  | — | — | — | (skipped) |
| r24  | combat | 25.8% | 17.3% | 25.7% | **mid-Ch3 lethality spike** |
| r25  | rest   | 0% | 0% | 0% | **healthy** |
| r26  | combat | 39.0% | 21.2% | 4.2% | class-asymmetric (Wizard trivialises Hollow Sage) |
| r27  | shrine | — | — | — | (skipped) |
| intel-ch3 | event | — | — | — | (skipped) |
| **r28 (Director)** | boss | **92.1%** | **81.1%** | **99.1%** | **UNHEALTHY wall — Tier-1 backlog** |
| r29 (Camp 3) | camp | 0% | 0% | 0% | **healthy** |
| r30  | combat | 0.0% | 0.0% | 0.0% | only 8% of lives still alive — sample size tiny |
| r31  | shrine | — | — | — | (skipped) |
| r32  | event  | — | — | — | (skipped) |
| r33  | combat | 80.0% | 48.6% | 50.0% | Drow Warriors over-tuned vs L5 |
| r34  | rest   | 0% | 0% | 0% | **healthy** |
| r35  | combat | 33.3% | 29.7% | 100.0%* | class-asymmetric (sample n≤6 for Wizard) |
| r36  | shrine | — | — | — | (skipped) |
| intel-ch4 | event | — | — | — | (skipped) |
| **r37 (Matron)** | boss | **100%** | **96.2%** | — | **UNHEALTHY wall — Tier-1 backlog** |

L1, L3, L7 heatmaps are in [`difficulty-curve.raw.md`](./difficulty-curve.raw.md).

## What's healthy in the curve

1. **All four camps are flat 0% deaths** across all 12 cells. The
   long-rest pacing seams sit exactly where they should — the player
   knows that crossing a camp means breathing room. Same for all four
   short-rests (r5, r16, r25, r34).
2. **r10 Ilyich at L1 starts (37–66% death)** delivers the intended
   "first big wall." Across L1 / L3 he sits in the 37–67% band: hard
   enough to feel like a chapter-end fight, soft enough to be beatable.
3. **r19 Magistrate at L5 (32–58%)** is the textbook healthy mid-game
   wall. Hard for under-levelled Wizards, easier for Fighter, all three
   classes can plausibly clear.
4. **Within-chapter ramp before bosses.** L1 Ch1 reads as
   r1 3% → r4 17–40% → r6 12–45% → r8 9–79% → **r10 boss**. The slope
   is monotonic, not flat-then-cliff. Same shape in Ch2 (r12 → r15 →
   r17 → r19) and Ch3 (r21 → r24 → r26 → r28).
5. **Ch3 hound-pack (r24)** was a "100% death" Tier-1 cliff
   in the pre-Phase-1 `encounter-stress.md` sweep. Post-Phase-1 it is
   **17–26% at L5**. That's a real Phase-1 win.

## What's still broken

### 1. r28 Director — the central post-Phase-1 cliff
- L5: Rogue 92% / Fighter 81% / **Wizard 99%**
- L7 (+2 over recommended): Rogue 63% / Fighter 63% / **Wizard 95%**

Even at L7, with two whole levels of head-room, a Wizard who actually
reaches the Director dies 19/20 times. That is not a wall, it is a
brick ceiling. Confirms the Tier-1 backlog item from
[the 2026-05-28 validation synthesis](../sim-findings/) — Director's
Hold-Person + Wizard hard-counter remains the largest single unhealthy
mark on the curve.

### 2. r37 Matron — the other Tier-1 wall
- L5: Rogue 100% / Fighter 96% (Wizard sample too small — only 1 reaches)
- L7: Rogue 79% / Fighter 93% / **Wizard 100%**

Matron is recommended-level (L7) but the recommended-level death-rate
is 79–100% across classes. The Ch4 wall is the steepest in the game and
needs the same focused tuning pass the Director already has in flight.

### 3. r33 (Drow Warriors) over-tuned at L5
L5 Rogue 80% death, Fighter 49%, Wizard 50%. Ch4 entry is supposed to
be friction, not a soft TPK, and r33 is the third combat room into the
chapter. By L7 it drops to a manageable 33/35/5% — so this is an
under-levelling issue, not a permanent tuning bug. Borderline; flag,
do not fix yet.

### 4. r26 Hollow Sage — class-asymmetric
L5: Rogue 39%, Fighter 21%, **Wizard 4%**. A 35-pp spread between
Rogue and Wizard in the *same* room means the room is balanced for the
caster and a cliff for the dagger. Hollow Sage is a ranged psionic —
Rogue can't close, Wizard burns one Fireball and ends it. The shape is
intentional ("classes are not flat-balanced" — class-balance-philosophy
memory), but Rogue at 39% is on the high end.

### 5. L1 Rogue Ch1 ramp is too steep
- r4 40% → r6 45% → r8 79% → r10 65%.

Compare to L1 Wizard same rooms: 17% → 12% → 9% → 37%. Same chapter,
same rooms, ~30 pp gap. L1 Rogue is the most fragile cell in the
matrix and the slope between r6 and r8 (bugbear room) is the single
biggest in-chapter cliff at L1 (+34 pp). Either: (a) bugbear room
swap-in for L1 Rogue, or (b) accept this as the "Rogue is hard mode at
L1" intent. Per class-balance memory, the latter is the stated design
position — flag only.

## Top 5 unhealthy cliffs (combat rooms ≥40% death at recommended level)

| Rank | Room | Cell | Death% | Top cause | Diagnosis |
|-----:|------|------|------:|----------|-----------|
| 1 | r28 (boss) | Wizard L5 | 99.1% | asylum-director | Hold-Person hard-counter, Tier-1 |
| 2 | r37 (boss) | Wizard L7 | 100% | drow-matron-mother | Matron tuning, Tier-1 |
| 3 | r37 (boss) | Fighter L7 | 93.1% | drow-matron-mother | Matron tuning, Tier-1 |
| 4 | r28 (boss) | Rogue L5 | 92.1% | asylum-director | Director damage too high, Tier-1 |
| 5 | r33 (combat) | Rogue L5 | 80.0% | drow-warrior | Ch4 entry vs under-levelled Rogue |

## Boring valleys

Detected runs of 3+ consecutive combat rooms all <5% death:
- **L5+/L7 Ch1 (r1, r4, r6) and Ch2 (r8, r12, r15)** — every cell.
  This is over-levelled players walking back through their old chapters,
  which is *intended* (Hades-style chapter clearing). Healthy.
- **L7 Wizard Ch4 (r26, r30, r33)** all <5%. Wizard Fireball clears
  Drow packs trivially while Rogue/Fighter eat the same packs at
  33/35%. Class-asymmetric but design-intent.

No genuinely flat stretch at-level (i.e. trivial combat rooms in the
chapter the player is *supposed* to be in). The early-chapter trivia
shows up only when over-levelled.

## Pre/post-Phase-1 — is the curve healthier?

Apples-to-apples is hard because pre-Phase-1 used 30 runs/cell. But
three concrete moves are visible:

| Room | Pre-Phase-1 max death% | Post-Phase-1 (this run) | Move |
|------|----------------------:|------------------------:|------|
| r24 (Ch3 mid, hound-pack) | 100% (encounter-stress) | 17–26% L5 | **healthier** |
| r17 / r15 (Ch2 elite/mid, cuirassier) | 100% | 2–8% L5 | **healthier** |
| r28 (Director) | not in pre-stress baseline | 81–99% L5 | unchanged (Tier-1 open) |
| r37 (Matron) | not in pre-stress baseline | 96–100% L5–7 | unchanged (Tier-1 open) |

Phase 1 measurably **flattened the Ch2 + Ch3 mid-game cliffs**. The
two boss walls flagged as Tier-1 in the synthesis are still standing.
That is consistent with what the synthesis said — Phase 1 fixed the
attrition rooms; bosses are the next pass.

## Verdict

The curve is **measurably healthier than pre-Phase-1 in Ch2 and Ch3
mid-game**, but **two bosses (Director, Matron) remain over-tuned** —
the same Tier-1 items already on the post-synthesis backlog. The pacing
seams (camps, rests, within-chapter ramps) are exactly where they should
be; the chapter-end walls do exist as walls; the only cells where the
shape of the curve is *unhealthy* are r28 and r37 themselves.

**No fix shipped here.** The two clear cliffs (Director, Matron) are not
"narrow tuning" — they are systemic boss-fight items already in flight
on sibling worktrees and need focused validation runs, not a drive-by
nudge from a curve-shape pass.

## Re-running

```
RUNS_PER_CELL=300 npx tsx scripts/sim-difficulty-curve.ts
```

Writes `docs/gameplay-quality/difficulty-curve.raw.md`. Wall time ~3 s.
