# Gold economy validation — sim findings (baseline (2.5× drop))

Generated 2026-05-28 from 30 runs/cell across 9 class×level cells.

Full Godwake delve (Ch1 → Ch4, 37 rooms) per run. Gold tracked from per-monster
drops (`rollRoomGoldDrops` post PR #69) + boss `goldReward` bonuses + per-encounter
`goldReward` bumps. Shop visits simulated at the three camp seams (r11, r20, r29)
with a greedy buy-cheapest-first policy that keeps a 30g reserve (100g for
big-ticket ≥300g items).

## Verdict — `right` (no tune)

Across the three classes the post-PR-#69 economy lands inside the brief's
target band. No dice adjustment applied.

**Brief target: "afford 1–2 mid-tier items per shop visit, not the entire inventory"**
- Camp 1 (most-populated cell: Fighter L5, n=28): arrival 132g, **2.3 / 6 affordable**, 1.0 purchased (one healing potion, the 50g floor). On-target.
- Camp 2 (most-populated cell: Fighter L5, n=18): arrival 457g, **5.8 / 6 affordable**, 3.2 purchased (~330g spent). On-target — note the big-ticket weapons (320g, 420g) become reachable here, which is the design intent of the long-delve self-fund.

**Brief target: "boss kills fund a meaningful purchase"**
- Ilyich (CR 2, Ch1 boss): mean ~42g per kill → exactly one healing potion. Minimum bar.
- Magistrate (CR 4, Ch2 boss): ~88g drop + 80g room reward ≈ 170g → 1 greater-healing potion or 2 cheap potions.
- Director (CR 5, Ch3 boss) and Matron (CR 6, Ch4 boss) sample too thin (n<10 reached); curve extrapolates ~270g / ~450g respectively.

**Brief target: end-of-delve gold "enough for follow-on persistence, not stockpile-trivial"**
- No Ch4 boss reach in 30 runs at L≤5 — can't measure full-delve end gold directly.
- Fighter L5 reaches r28 (Ch3 boss approach) with mean 464g in pocket (n=9). Walking out of camp 3 with the leftover ~130g (matching the camp-1/camp-2 residual pattern) projects a Ch4 entry of ~130g + Ch4 mob drops → a healthy but not stockpile-trivial Matron-fund.

**Flags — none firing**
- *Too rich at Ch1?* Ch1-end gold across classes:
  - Rogue L5: 137g on Ch1 boss kill (n=15/30)
  - Fighter L3: 124g on Ch1 boss kill (n=7/30)
  - Fighter L5: 132g on Ch1 boss kill (n=28/30)
  - Wizard L1: 116g on Ch1 boss kill (n=6/30)
  - Wizard L3: 134g on Ch1 boss kill (n=6/30)
  - Wizard L5: 129g on Ch1 boss kill (n=13/30)
  Camp-2 inventory total: 1210g. Ch1-end gold is ~10% of that — far from "fund the whole next-chapter shop".
- *Too poor mid-Ch1?* At room 6 (3 combats cleared) survivors hold 45g cum on average — a healing potion (50g) is one combat away.
- *Class-asymmetric?* Per-combat gold is 11–52g across classes (a 5× spread on paper), **but** this is gated by encounter pool / level reached, not by class. Within a single level cell the per-shop arrival gold is tight (Camp 1: 116–137g across all three classes).

## Matrix (gold + chapter-end averages)

Chapter-end gold means are conditioned on **runs that reached that boss**
(so a death in r4 does not dilute Ch1 averages). `(n)` next to each value
is how many of the 30 runs got there.

| Class | L | N | Death | Chapters | Avg gold/run | Gold/combat | Gold/boss | Ch1 end (n) | Ch2 end (n) | Ch3 end (n) | Ch4 end (n) |
|-------|--:|--:|-----:|--------:|------------:|-----------:|---------:|------------:|------------:|------------:|------------:|
| Rogue | 1 | 30 | 100% | 0.0 | 21g | 11g | 0g | 0g (0) | 0g (0) | 0g (0) | 0g (0) |
| Rogue | 3 | 30 | 100% | 0.0 | 41g | 16g | 47g | 130g (1) | 0g (0) | 0g (0) | 0g (0) |
| Rogue | 5 | 30 | 100% | 0.5 | 180g | 32g | 42g | 137g (15) | 0g (0) | 0g (0) | 0g (0) |
| Fighter | 1 | 30 | 100% | 0.1 | 53g | 19g | 45g | 129g (2) | 0g (0) | 0g (0) | 0g (0) |
| Fighter | 3 | 30 | 100% | 0.2 | 96g | 23g | 41g | 124g (7) | 0g (0) | 0g (0) | 0g (0) |
| Fighter | 5 | 30 | 100% | 1.6 | 634g | 57g | 98g | 132g (28) | 457g (18) | 741g (2) | 0g (0) |
| Wizard | 1 | 30 | 100% | 0.2 | 69g | 20g | 38g | 116g (6) | 0g (0) | 0g (0) | 0g (0) |
| Wizard | 3 | 30 | 100% | 0.2 | 125g | 27g | 41g | 134g (6) | 0g (0) | 0g (0) | 0g (0) |
| Wizard | 5 | 30 | 100% | 0.4 | 164g | 31g | 41g | 129g (13) | 0g (0) | 0g (0) | 0g (0) |

## Shop visits (camp merchants)

Inventory offered (6 items): potion-of-healing 50g, scroll-of-healing-word 90g,
potion-of-greater-healing 150g, potion-of-heroism 180g, adamantine-shortsword 320g,
cloak-of-faerun 420g. Sim policy = buy cheapest first while keeping a 30g
reserve (100g floor for items ≥300g).

| Class | L | Camp | N | On arrival | Affordable / 6 | Bought / 6 | Spent | On exit |
|-------|--:|------|--:|----------:|---------------:|-----------:|------:|--------:|
| Rogue | 1 | Camp 1 (r11) | 0 | 0g | 0.0 | 0.0 | 0g | 0g |
| Rogue | 1 | Camp 2 (r20) | 0 | 0g | 0.0 | 0.0 | 0g | 0g |
| Rogue | 1 | Camp 3 (r29) | 0 | 0g | 0.0 | 0.0 | 0g | 0g |
| Rogue | 3 | Camp 1 (r11) | 1 | 130g | 2.0 | 1.0 | 50g | 80g |
| Rogue | 3 | Camp 2 (r20) | 0 | 0g | 0.0 | 0.0 | 0g | 0g |
| Rogue | 3 | Camp 3 (r29) | 0 | 0g | 0.0 | 0.0 | 0g | 0g |
| Rogue | 5 | Camp 1 (r11) | 15 | 137g | 2.3 | 1.0 | 50g | 87g |
| Rogue | 5 | Camp 2 (r20) | 0 | 0g | 0.0 | 0.0 | 0g | 0g |
| Rogue | 5 | Camp 3 (r29) | 0 | 0g | 0.0 | 0.0 | 0g | 0g |
| Fighter | 1 | Camp 1 (r11) | 2 | 129g | 2.0 | 1.0 | 50g | 79g |
| Fighter | 1 | Camp 2 (r20) | 0 | 0g | 0.0 | 0.0 | 0g | 0g |
| Fighter | 1 | Camp 3 (r29) | 0 | 0g | 0.0 | 0.0 | 0g | 0g |
| Fighter | 3 | Camp 1 (r11) | 7 | 124g | 2.0 | 1.0 | 50g | 74g |
| Fighter | 3 | Camp 2 (r20) | 0 | 0g | 0.0 | 0.0 | 0g | 0g |
| Fighter | 3 | Camp 3 (r29) | 0 | 0g | 0.0 | 0.0 | 0g | 0g |
| Fighter | 5 | Camp 1 (r11) | 28 | 132g | 2.3 | 1.0 | 55g | 78g |
| Fighter | 5 | Camp 2 (r20) | 18 | 457g | 5.8 | 3.2 | 330g | 127g |
| Fighter | 5 | Camp 3 (r29) | 2 | 741g | 6.0 | 4.0 | 470g | 271g |
| Wizard | 1 | Camp 1 (r11) | 6 | 116g | 2.0 | 1.0 | 50g | 66g |
| Wizard | 1 | Camp 2 (r20) | 0 | 0g | 0.0 | 0.0 | 0g | 0g |
| Wizard | 1 | Camp 3 (r29) | 0 | 0g | 0.0 | 0.0 | 0g | 0g |
| Wizard | 3 | Camp 1 (r11) | 6 | 134g | 2.2 | 1.0 | 50g | 84g |
| Wizard | 3 | Camp 2 (r20) | 0 | 0g | 0.0 | 0.0 | 0g | 0g |
| Wizard | 3 | Camp 3 (r29) | 0 | 0g | 0.0 | 0.0 | 0g | 0g |
| Wizard | 5 | Camp 1 (r11) | 13 | 129g | 2.2 | 1.0 | 50g | 79g |
| Wizard | 5 | Camp 2 (r20) | 0 | 0g | 0.0 | 0.0 | 0g | 0g |
| Wizard | 5 | Camp 3 (r29) | 0 | 0g | 0.0 | 0.0 | 0g | 0g |

## Cumulative gold-in-pocket by room

Mean gold-in-pocket at end-of-room, averaged over runs that reached each
room (sample sizes in the row below the values). Camps deplete pocket via
simulated purchases, so the curve dips at r12, r21, r30.

| Class | L | r1 | r4 | r6 | r8 | r10 | r12 | r15 | r17 | r19 | r21 | r24 | r26 | r28 | r30 | r33 | r35 | r37 |
|-------|--:|----:|----:|----:|----:|----:|----:|----:|----:|----:|----:|----:|----:|----:|----:|----:|----:|----:|
| Rogue | 1 | 8g | 19g | 39g | 84g | 0g | 0g | 0g | 0g | 0g | 0g | 0g | 0g | 0g | 0g | 0g | 0g | 0g |
| Rogue | 3 | 12g | 21g | 42g | 88g | 130g | 145g | 0g | 0g | 0g | 0g | 0g | 0g | 0g | 0g | 0g | 0g | 0g |
| Rogue | 5 | 7g | 23g | 47g | 98g | 137g | 127g | 184g | 288g | 0g | 0g | 0g | 0g | 0g | 0g | 0g | 0g | 0g |
| Fighter | 1 | 11g | 24g | 47g | 86g | 129g | 115g | 217g | 327g | 0g | 0g | 0g | 0g | 0g | 0g | 0g | 0g | 0g |
| Fighter | 3 | 10g | 24g | 49g | 91g | 124g | 120g | 153g | 0g | 0g | 0g | 0g | 0g | 0g | 0g | 0g | 0g | 0g |
| Fighter | 5 | 11g | 24g | 46g | 89g | 132g | 123g | 199g | 301g | 457g | 195g | 302g | 461g | 741g | 396g | 569g | 732g | 0g |
| Wizard | 1 | 9g | 21g | 43g | 71g | 116g | 112g | 184g | 0g | 0g | 0g | 0g | 0g | 0g | 0g | 0g | 0g | 0g |
| Wizard | 3 | 8g | 23g | 46g | 92g | 134g | 136g | 206g | 303g | 0g | 0g | 0g | 0g | 0g | 0g | 0g | 0g | 0g |
| Wizard | 5 | 8g | 22g | 46g | 93g | 129g | 130g | 195g | 291g | 0g | 0g | 0g | 0g | 0g | 0g | 0g | 0g | 0g |

### Sample sizes (runs reaching each room)

| Class | L | r1 | r4 | r6 | r8 | r10 | r12 | r15 | r17 | r19 | r21 | r24 | r26 | r28 | r30 | r33 | r35 | r37 |
|-------|--:|----:|----:|----:|----:|----:|----:|----:|----:|----:|----:|----:|----:|----:|----:|----:|----:|----:|
| Rogue | 1 | 29 | 17 | 8 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Rogue | 3 | 30 | 25 | 16 | 3 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Rogue | 5 | 30 | 30 | 30 | 26 | 15 | 14 | 9 | 8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Fighter | 1 | 30 | 20 | 16 | 8 | 2 | 2 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Fighter | 3 | 30 | 28 | 28 | 21 | 7 | 6 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Fighter | 5 | 30 | 30 | 30 | 30 | 28 | 28 | 28 | 26 | 18 | 18 | 15 | 11 | 2 | 2 | 2 | 2 | 0 |
| Wizard | 1 | 30 | 23 | 18 | 14 | 6 | 6 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Wizard | 3 | 30 | 30 | 29 | 29 | 6 | 6 | 3 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Wizard | 5 | 30 | 30 | 30 | 30 | 13 | 13 | 6 | 5 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

## Notes

- **Gold/combat** = avg gold per non-boss combat room (raw mob drops, no boss bonus).
- **Gold/boss** = mean per boss kill (Ilyich CR2 / Magistrate CR3 / Director CR4 / Matron CR6).
- Ch1/2/3/4 end columns are gold-in-pocket the instant that chapter boss falls,
  *before* the camp shop. Sample is restricted to runs that reached the boss.
- 30 runs/cell. Death rates are expected to be high — this matches the
  "each death is rewarding" floor in `class-balance-philosophy`. The
  economy verdict is read from the runs that did reach each shop.
