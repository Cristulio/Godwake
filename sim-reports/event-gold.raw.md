# Event-gold scaling — meaningful-but-not-a-jackpot check (#426)

Ramp ×1 @Ch1 → ×**6** @Ch14 (knob `EVENT_GOLD_CH14_MULTIPLE` in `src/engine/delve/eventGoldScale.ts`), anchored at each event's `minChapter`. 29 of 41 events carry a positive gold reward. Normal-fight gold = mean `goldReward` over live-delve combat rooms (60 seeds). MEASUREMENT ONLY.

## A. The ramp, and a Ch1-anchored +25 boon across the delve

| Ch | ramp× | Ch1 +25 boon → | normal-fight gold | event % of a normal fight | boss-intel fee |
|---|---|---|---|---|---|
| 1 | 1.00× | 25g | 0g | — | 25g |
| 2 | 1.10× | 27g | 19g | 144% | 25g |
| 3 | 1.38× | 35g | 24g | 148% | 25g |
| 4 | 1.87× | 47g | 41g | 113% | 60g |
| 5 | 2.54× | 63g | 70g | 90% | 60g |
| 6 | 2.92× | 73g | 85g | 86% | 60g |
| 7 | 3.31× | 83g | 101g | 82% | 60g |
| 8 | 3.69× | 92g | 110g | 83% | 105g |
| 9 | 4.08× | 102g | 131g | 78% | 105g |
| 10 | 4.46× | 112g | 140g | 80% | 105g |
| 11 | 4.85× | 121g | 154g | 79% | 105g |
| 12 | 5.23× | 131g | 160g | 82% | 160g |
| 13 | 5.62× | 140g | 175g | 80% | 160g |
| 14 | 6.00× | 150g | 186g | 81% | 160g |

## B. Realized event reward (all eligible events) vs normal-fight gold

At chapter C the eligible pool is every event with `minChapter ≤ C`, each realized at `authored × eventGoldScale(C, minChapter)`. The jackpot test rides the **MEDIAN** (the typical event) ÷ normal-fight gold — `max` is the single richest reachable event (usually a high-stakes trade/gamble, not free money) and is informational. Verdict: ✓ <0.7×, ~ rich 0.7-1×, ⚠ ≥ a normal fight.

| Ch | eligible | median reward | median ÷ normal | mean | MAX (gamble) | normal-fight gold | verdict |
|---|---|---|---|---|---|---|---|
| 1 | 5 | 18g | — | 18g | 30g | 0g | · (no fight gold) |
| 2 | 11 | 15g | 0.80× | 18g | 33g | 19g | ~ rich |
| 3 | 15 | 25g | 1.05× | 29g | 90g | 24g | ⚠ ≥ a fight |
| 4 | 16 | 31g | 0.74× | 38g | 121g | 41g | ~ rich |
| 5 | 17 | 46g | 0.65× | 53g | 165g | 70g | ✓ a slice |
| 6 | 18 | 59g | 0.69× | 62g | 190g | 85g | ✓ a slice |
| 7 | 20 | 74g | 0.73× | 73g | 215g | 101g | ~ rich |
| 8 | 22 | 78g | 0.71× | 80g | 240g | 110g | ~ rich |
| 9 | 24 | 84g | 0.64× | 87g | 265g | 131g | ✓ a slice |
| 10 | 25 | 93g | 0.67× | 95g | 290g | 140g | ✓ a slice |
| 11 | 26 | 104g | 0.68× | 104g | 315g | 154g | ✓ a slice |
| 12 | 28 | 108g | 0.67× | 110g | 340g | 160g | ✓ a slice |
| 13 | 29 | 114g | 0.65× | 117g | 365g | 175g | ✓ a slice |
| 14 | 29 | 122g | 0.66× | 125g | 390g | 186g | ✓ a slice |

## C. Anchoring proof — deep-authored events scale from THEIR floor, not Ch1

A deep event authored rich sits at ×1 when it first appears (anchored at its own minChapter) and only creeps up by Ch14 — never the full ×6.

| event | minCh | authored | at minCh | at Ch14 | naïve ×6 (avoided) |
|---|---|---|---|---|---|
| trial-of-greed | 11 | 120g | 120g | 149g | 720g |
| burning-bough | 10 | 100g | 100g | 134g | 600g |
| dragons-hoard-toll | 13 | 95g | 95g | 102g | 570g |
| marauders-bargain | 12 | 90g | 90g | 103g | 540g |
| face-that-is-not-yours | 9 | 85g | 85g | 125g | 510g |
| altar-under-ash | 8 | 75g | 75g | 122g | 450g |

