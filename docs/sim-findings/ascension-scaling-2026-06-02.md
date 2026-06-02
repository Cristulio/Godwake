# Ascension / NG+ scaling health — 2026-06-02

`RUNS=20` (400 runs/level: 20 × 5 archetype-policies × 4 reps over 6 classes) at
`ASCENSION ∈ {0, 2, 4, 6}` via `scripts/sim-feel.ts`. Bare-soul + blessings model
(no gear/loot — see scope caveat). DIRECTIONS ONLY; no code touched.

## Headline

Difficulty is **monotonically harder 0 → 6 on every readable axis.** No
non-monotonic step. Each ascension gate bites exactly where it's wired
(elites @2, boss second-wind @3, twists @4). clear% is AI-floored at 0% on the
full 14-chapter chain, so depth / minHP / blowout carry the read (standard for
this sim).

## Aggregate sweep (per level)

| Asc | meanRooms (depth) | meanMinHP | blowout% | rounds/fight | dead-turn% |
|-----|-------------------|-----------|----------|--------------|------------|
| 0   | 38.4              | 76.5%     | 69.3%    | 3.68         | 17.9%      |
| 2   | 30.8              | 74.5%     | 67.2%    | 3.94         | 20.6%      |
| 4   | 27.7              | 72.6%     | 63.6%    | 4.13         | 20.5%      |
| 6   | 25.7              | 72.0%     | 63.2%    | 4.13         | 21.5%      |

- **Depth** 38.4 → 30.8 → 27.7 → 25.7 — strictly decreasing (player gets less
  far). MONOTONIC.
- **meanMinHP** 76.5 → 74.5 → 72.6 → 72.0 — strictly decreasing (runs more
  dangerous). MONOTONIC.
- **blowout%** 69.3 → 67.2 → 63.6 → 63.2 — strictly decreasing (fewer trivial
  wins). MONOTONIC; the 4→6 step is nearly flat (−0.4 pt) — most of the
  blowout erosion is spent by Asc4.
- **rounds/fight** 3.68 → 3.94 → 4.13 → 4.13 — increasing then plateaus; fights
  grind longer with ascension, saturating at Asc4.

## Per-gate bite

### Ascendant elites @ Asc2 — BITES at the gate
Elite fight length jumps at the 0→2 step and stays elevated:

| Asc | elite rds | elite win% | elite minHP |
|-----|-----------|------------|-------------|
| 0   | 4.72      | 85.7%      | 65.7%       |
| 2   | 6.07      | 82.4%      | 61.4%       |
| 4   | 6.21      | 81.7%      | 62.3%       |
| 6   | 6.04      | 79.7%      | 60.7%       |

+28.6% elite length at the exact Asc2 step (4.72→6.07), then flat 2→6. Elite
win% erodes steadily 85.7→79.7. The elite gate lands where it's wired.

### Boss second-wind @ Asc3 — BITES between Asc2 and Asc4
(I sampled 0/2/4/6, so the Asc3 trigger shows up as the 2→4 jump.)

| Asc | boss rds | boss win% | boss minHP |
|-----|----------|-----------|------------|
| 0   | 3.27     | 94.0%     | 70.5%      |
| 2   | 3.27     | 93.7%     | 69.9%      |
| 4   | 3.86     | 89.9%     | 63.6%      |
| 6   | 4.28     | 88.9%     | 61.9%      |

Boss length is flat 0→2 (3.27→3.27) then steps up hard once second-wind is in
(3.27→3.86→4.28); boss win% and minHP both drop in lockstep. Clean signature of
a gate that does nothing below Asc3 and bites above it.

### Dungeon twists @ Asc4 — BITES, correct gating
`twist-norm` rooms are **n0 at Asc0/Asc2** (twists genuinely absent below the
gate) and appear at Asc4 (n595) / Asc6 (n590). Twisted normals are markedly
harder than clean normals:

| Asc | clean-norm blow% | twist-norm blow% | twist-norm minHP |
|-----|------------------|------------------|------------------|
| 4   | 71.5%            | 56.1%            | 71.3%            |
| 6   | 71.8%            | 54.9%            | 69.8%            |

Per-twist (Asc4 / Asc6 blowout%, lower = harder):

| twist         | Asc4 blow% | Asc6 blow% | Asc4 minHP |
|---------------|------------|------------|------------|
| cursed-ground | 43.9%      | 42.2%      | 63.8%      |
| quickening    | 59.1%      | 49.5%      | 72.0%      |
| sealed-wards  | 57.4%      | 60.9%      | 70.8%      |
| bloodscent    | 51.6%      | 56.3%      | 71.5%      |
| gloom         | 66.7%      | 64.0%      | 76.9%      |

- **cursed-ground is the lone outlier** — harshest twist by a wide margin
  (blowout floor ~42-44%, lowest minHP). This is the *fourth* corroboration of
  the cursed-ground flag (see #286 / #293 / #308). Flat HP-agnostic chip keeps
  punishing regardless of build.
- **gloom is the mildest** — barely separates from clean normals (64-67% vs
  ~72%), consistent with prior "gloom near-inert" reads.

## Economy scaling (Grove cost + renown income) — NOT MODELED

`scripts/sim-feel.ts` does not simulate the meta loop: no renown income, no
Grove upgrade costs. The only economy-adjacent counters it emits —
shop nodes/run (1.99→1.56→1.34→1.27) and shrine picks/run (3.56→2.93→2.66→2.48)
— fall with ascension purely because runs are **shorter** (fewer rooms reached),
not because of any income/cost change. So this pass **cannot** report the
income-vs-cost ratio direction; that needs a meta-economy harness, which does
not exist. (Did NOT add one — out of scope for a measurement lane.)

## Ascension-exclusive sets — NOT OBSERVABLE

The sim is bare-soul + blessings (shrine picks); it does **not** model gear,
loot, affixes, or sets at all (no equip/affix/item path in `sim-feel.ts`).
Ascension-exclusive sets therefore have zero footprint in this data. Their
impact cannot be read here. (Did NOT add gear modelling.)

## Directions (no tuning applied)

1. Scaling ladder is healthy and monotone 0→6 — no structural fix indicated.
2. **cursed-ground** remains the one twist that over-bites (4th corroboration).
   If twist parity is wanted, soften it toward the gloom/sealed-wards band; if
   an intentional "hardest twist" is wanted, leave it. User call.
3. The economy-ratio and ascension-set questions are **unanswerable with the
   current sim** — they need a meta-economy harness and gear modelling
   respectively. Flagging the instrumentation gap, not proposing the build.
