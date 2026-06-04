# Boss gauntlet — per-chapter boss difficulty + mechanic-firing audit

Ascension **0**, archetype **balanced**, **60** seeds × 7 classes per boss = **420** fights/boss, **5880** total. Hero = level schedule + a realistic per-chapter blessing loadout, BUT preset gear (no shop/legendary/meta power) — so MARTIAL win-rates on the deep bosses are a LOWER bound (a real L18 hero swings a +N legendary, not a starting weapon). Read SHAPE + relative ordering, not magnitudes. Wall: 3.1s.

> Level schedule (ch→L, #blessings): 1→L3/1b, 2→L4/1b, 3→L5/2b, 4→L6/2b, 5→L8/3b, 6→L9/4b, 7→L11/4b, 8→L12/5b, 9→L13/6b, 10→L15/6b, 11→L16/7b, 12→L18/7b, 13→L19/8b, 14→L20/8b

## Boss roster + declared mechanics

| Ch | Boss | telegraph | phases | multi-act | gate | summon | sustain | rage |
|---|---|---|---|---|---|---|---|---|
| 1 | Ilyich the Duergar | ✓ | ✓ | · | · | · | · | · |
| 2 | The Magistrate | ✓ | ✓ | · | · | ✓ | · | · |
| 3 | The Asylum Director | ✓ | ✓ | · | · | · | · | · |
| 4 | Matron Mother | · | ✓ | · | ✓ | ✓ | · | · |
| 5 | Aurelach, the Hollow Dawn | · | ✓ | · | · | ✓ | · | · |
| 6 | The Unmade | ✓ | ✓ | · | ✓ | ✓ | · | · |
| 7 | The Drowned Custodian | ✓ | · | · | · | ✓ | ✓ | ✓ |
| 8 | Dravok, the Ashen Marshal | ✓ | ✓ | · | · | · | · | ✓ |
| 9 | The Hollow Pretender | ✓ | ✓ | ✓(2) | ✓ | ✓ | · | ✓ |
| 10 | Nizidramanii'yt | ✓ | ✓ | ✓(2) | · | · | · | · |
| 11 | Jon Irenicus | ✓ | ✓ | ✓(3) | · | · | · | · |
| 12 | Yaga-Shura | ✓ | ✓ | ✓(2) | ✓ | ✓ | · | ✓ |
| 13 | Abazigal | ✓ | ✓ | ✓(2) | · | · | · | ✓ |
| 14 | Melissan | ✓ | ✓ | ✓(3) | · | ✓ | ✓ | ✓ |

## Difficulty per chapter — win% (overall), rounds, min-HP%

| Ch | Boss | overall win% | stall% | avg rounds | win min-HP% | fighter% | barbarian% | ranger% | rogue% | monk% | wizard% | druid% |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Ilyich the Duergar | 100 | 0 | 4.1 | 77 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| 2 | The Magistrate | 46 | 0 | 8.3 | 49 | 25 | 85 | 70 | 18 | 60 | 50 | 12 |
| 3 | The Asylum Director | 100 | 0 | 6.0 | 79 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| 4 | Matron Mother | 86 | 0 | 12.9 | 45 | 100 | 98 | 100 | 27 | 87 | 100 | 90 |
| 5 | Aurelach, the Hollow Dawn | 11 | 0 | 7.5 | 26 | 0 | 28 | 32 | 0 | 12 | 0 | 5 |
| 6 | The Unmade | 6 | 0 | 8.2 | 28 | 0 | 28 | 12 | 0 | 5 | 0 | 0 |
| 7 | The Drowned Custodian | 1 | 0 | 8.3 | 36 | 0 | 7 | 0 | 0 | 0 | 0 | 0 |
| 8 | Dravok, the Ashen Marshal | 90 | 1 | 15.0 | 82 | 100 | 100 | 100 | 28 | 100 | 100 | 100 |
| 9 | The Hollow Pretender | 0 | 0 | 5.8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 10 | Nizidramanii'yt | 31 | 0 | 11.6 | 39 | 18 | 100 | 57 | 0 | 20 | 0 | 22 |
| 11 | Jon Irenicus | 2 | 0 | 7.4 | 32 | 0 | 13 | 2 | 0 | 0 | 0 | 0 |
| 12 | Yaga-Shura | 18 | 0 | 13.5 | 19 | 2 | 80 | 30 | 0 | 12 | 0 | 0 |
| 13 | Abazigal | 55 | 1 | 21.7 | 9 | 67 | 47 | 93 | 2 | 23 | 67 | 83 |
| 14 | Melissan | 0 | 0 | 8.2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

## Mechanic-firing audit — did the declared mechanics actually FIRE?

Share of fights (all classes) in which each mechanic was observed on the boss instance. A HAS-but-0%-FIRED is a red flag (sim wiring or unreachable phase).

| Ch | Boss | telegraph% | canceled% | avg phases | maxApt | avg summons | gate-engaged% | ward-lifted% | rage% |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Ilyich the Duergar | 74% | 0% | 0.7 | — | — | — | — | — |
| 2 | The Magistrate | 67% | 0% | 0.8 | — | 0.8 | — | — | — |
| 3 | The Asylum Director | 52% | 0% | 0.9 | — | — | — | — | — |
| 4 | Matron Mother | — | — | 0.9 | — | 1.0 | 96% | 89% | — |
| 5 | Aurelach, the Hollow Dawn | — | — | 0.4 | — | 1.0 | — | — | — |
| 6 | The Unmade | 92% | 6% | 0.5 | — | 1.0 | 100% | 88% | — |
| 7 | The Drowned Custodian | 100% | 2% | — | — | 2.4 | — | — | 3% |
| 8 | Dravok, the Ashen Marshal | 100% | 5% | 0.9 | — | — | — | — | 15% |
| 9 | The Hollow Pretender | 100% | 1% | 0.0 | 2 | 2.0 | 100% | 9% | 2% |
| 10 | Nizidramanii'yt | 100% | 8% | 0.8 | 2 | — | — | — | — |
| 11 | Jon Irenicus | 91% | 8% | 0.2 | 3 | — | — | — | — |
| 12 | Yaga-Shura | 100% | 17% | 0.8 | 2 | 1.0 | 100% | 100% | 80% |
| 13 | Abazigal | 100% | 10% | 0.9 | 2 | — | — | — | 87% |
| 14 | Melissan | 100% | 7% | 0.1 | 3 | 2.2 | — | — | 11% |

## Class band — overall win% across all 14 bosses

| rank | class | overall win% |
|---|---|---|
| 1 | barbarian | 56 |
| 2 | ranger | 50 |
| 3 | fighter | 37 |
| 4 | monk | 37 |
| 5 | wizard | 37 |
| 6 | druid | 37 |
| 7 | rogue | 20 |

## Caster vs martial — win% per chapter (scaling sanity)

| Ch | martial win% | caster win% | wizard% | druid% |
|---|---|---|---|---|
| 1 | 100 | 100 | 100 | 100 |
| 2 | 52 | 31 | 50 | 12 |
| 3 | 100 | 100 | 100 | 100 |
| 4 | 82 | 95 | 100 | 90 |
| 5 | 14 | 3 | 0 | 5 |
| 6 | 9 | 0 | 0 | 0 |
| 7 | 1 | 0 | 0 | 0 |
| 8 | 86 | 100 | 100 | 100 |
| 9 | 0 | 0 | 0 | 0 |
| 10 | 39 | 11 | 0 | 22 |
| 11 | 3 | 0 | 0 | 0 |
| 12 | 25 | 0 | 0 | 0 |
| 13 | 46 | 75 | 67 | 83 |
| 14 | 0 | 0 | 0 | 0 |

## Caster damage scaling by level (expected values, real helpers)

Fire Bolt is the cantrip arm of the parametric model (1d10 base × levelFactor × intFactor + weaponEnh, anchored at L1). Magic Missile (darts) and Scorching Ray (rays) are deliberately left on COUNT scaling — a separate axis. Fireball is the L3 nuke on the parametric model (8d6 base, acq L5). The OLD Fire Bolt capped at 4d10 ≈ 22 dice at L8+; the new cantrip replaces that step with a smooth climb.

| Level | castMod | Fire Bolt mult | Fire Bolt dice-core | Fire Bolt full (avg) | Magic Missile (auto) | Scorching Ray (raw) | Fireball dice-core |
|---|---|---|---|---|---|---|---|
| 1 | +3 | 1.00× | 6 | 9.0 | 10.5 | 21 | 28 |
| 3 | +3 | 1.10× | 6 | 9.0 | 10.5 | 21 | 28 |
| 5 | +3 | 1.20× | 7 | 10.0 | 14.0 | 21 | 28 |
| 8 | +3 | 1.35× | 7 | 10.0 | 17.5 | 28 | 32 |
| 11 | +3 | 1.50× | 8 | 11.0 | 21.0 | 35 | 36 |
| 14 | +3 | 1.65× | 9 | 12.0 | 24.5 | 42 | 41 |
| 17 | +3 | 1.80× | 10 | 13.0 | 28.0 | 49 | 45 |
| 20 | +3 | 1.95× | 11 | 14.0 | 31.5 | 56 | 49 |

_Reference: OLD Fire Bolt cap = 4d10 ≈ 22 dice (no flat add, attack-vs-AC ~55% landed)._

