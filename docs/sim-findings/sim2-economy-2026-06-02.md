# sim2 economy re-check — NG+ ratio + XP pacing + renown/gear (2026-06-02)

main @ 793de02. Gated sim pass, measurement only — no balance code changed.
Sims: `sim-renown-economy.ts`, `sim-xp-curve.ts`, `sim-endgame-gear.ts`.

## 1. NG+ COST RATIO — #334 fix VALIDATED ✅

Pre-#334 NG+ was ~27% cheaper at Asc4 (income `renownMult` 1.9 ran ahead of
cost `upgradeCostMult` 1.5). `upgradeCostMult` was raised to track income.
Income/price ratio is now effectively flat ~1.0 — and the small residual
*shrinks* with ascension instead of ballooning.

| asc | renownMult (income) | upgradeCostMult (price) | income/price vs A0 |
|-----|---------------------|-------------------------|--------------------|
| A0  | 1.00 | 1.00 | 1.000 (0% cheaper) |
| A1  | 1.25 | 1.20 | 1.042 (4% cheaper) |
| A2  | 1.45 | 1.40 | 1.036 (4% cheaper) |
| A3  | 1.65 | 1.60 | 1.031 (3% cheaper) |
| A4  | 1.90 | 1.85 | 1.027 (3% cheaper) |
| A5  | 2.15 | 2.10 | 1.024 (2% cheaper) |
| A6  | 2.45 | 2.40 | 1.021 (2% cheaper) |

The old ~27%-cheaper-at-A4 cliff is gone. Worst case is +4% at A1 and the
curve trends back toward 1.0 by A6. NG+ no longer buys cheaper progression.

## 2. Renown prices/rewards — in band, held ✅

- Full single-soul tree (fighter, shared+class, 23 nodes): **20,084 renown** @ Asc0.
- Competent full 14-ch clear pays **986 renown/run** (soulMark 1.4); 119 rooms / 92.6 mobs / 14 bosses.
- **Runs-to-first-upgrade:** ~0.03 (one clear's 986 trivially covers a 25-renown rank).
- **Runs-to-max:** **20.4 @ Asc0** — sits at the low end of the "~20-29 clears" band, holds.
- Runs-to-max is ~flat across ascension (A3 19.7, A6 20.0) because income now scales with cost (the #334 fix again).
- Bot-floor income = 0 (Auto-Battle never clears — strict lower bound; the human player clears by hand).

## 3. XP pacing — L20 lands Ch12–14, held ✅

| policy | L20 lands | Ch14 end |
|--------|-----------|----------|
| combat | end of **Ch12** (cumXP 99,880) | L20, CR17 |
| random | end of **Ch14** (cumXP 106,234) | L20, CR17 |

Matches last pass exactly: combat → Ch12, random → right on the Ch14 ceiling.
The map alt-route rework did **not** push L20 out. No early-cap, no overshoot.
Random hits L20 only at the final chapter (Ch13 ends L19), so the ceiling is
snug but not breached.

## 4. Gear lever — known Ch6+ gate, AI-floor caveat ✅

`SOULS_PER_CLASS=15 MAX_LIVES=20`, gear modelling on:

| class | A0 clear% | depth | leg/soul |
|-------|-----------|-------|----------|
| fighter | 6.7% | 7.8 | 2.4 |
| barbarian | 0.0% | 9.1 | 2.8 |
| ranger | 0.0% | 7.3 | 2.0 |
| wizard | 0.0% | 5.6 | 0.7 |
| druid | 0.0% | 4.9 | 0.7 |
| rogue | 0.0% | 4.1 | 0.5 |

Same Ch6+ gate signal as prior passes — the bot stalls in the Ch4–9 band,
gear is the lever, martials run deepest (barb 9.1 / fighter 7.8). A0 clear is
AI-floored (only fighter scratches 6.7%); the human clears by hand, so treat
clear% as a lower bound, depth as the real read. Apex-relic buckets empty
(n0) — at this life budget runs barely reach A1 (n3 lives), so asc≥3 apex
sampling is out of scope here, not a regression.

## Verdict

All four checks pass. The #334 cost-mult raise lands: NG+ income/price ratio
is flat ~1.0 (no longer 27% cheaper at A4). XP pacing, renown runs-to-afford,
and the gear gate are all unchanged from the prior baseline.

## Directions (not applied)

- None warranted. Economy is in band. If anything, the residual <4% NG+
  discount at A1–A2 is a rounding artifact, not worth chasing.
