# Boss gauntlet — per-chapter boss difficulty + mechanic-firing audit

Ascension **0**, archetype **balanced**, gear **bare floor**, **60** seeds × 7 classes per boss = **420** fights/boss, **5880** total. Hero = level schedule + a realistic per-chapter blessing loadout, BUT preset gear (no shop/legendary/meta power) — so MARTIAL win-rates on the deep bosses are a LOWER bound (a real L18 hero swings a +N legendary, not a starting weapon). Read SHAPE + relative ordering, not magnitudes. Wall: 3.2s.

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
| 1 | Ilyich the Duergar | 100 | 0 | 4.0 | 80 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| 2 | The Magistrate | 53 | 0 | 9.2 | 35 | 27 | 73 | 72 | 18 | 60 | 52 | 68 |
| 3 | The Asylum Director | 100 | 0 | 5.9 | 80 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| 4 | Matron Mother | 88 | 0 | 12.5 | 46 | 100 | 100 | 100 | 27 | 87 | 100 | 100 |
| 5 | Aurelach, the Hollow Dawn | 14 | 0 | 8.2 | 14 | 0 | 10 | 38 | 0 | 20 | 2 | 30 |
| 6 | The Unmade | 7 | 0 | 8.4 | 6 | 0 | 22 | 12 | 0 | 5 | 0 | 10 |
| 7 | The Drowned Custodian | 1 | 0 | 9.9 | 7 | 0 | 0 | 2 | 0 | 0 | 0 | 3 |
| 8 | Dravok, the Ashen Marshal | 90 | 1 | 14.4 | 82 | 100 | 100 | 100 | 28 | 100 | 100 | 100 |
| 9 | The Hollow Pretender | 0 | 0 | 7.5 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 10 | Nizidramanii'yt | 34 | 0 | 11.7 | 37 | 18 | 100 | 57 | 0 | 20 | 5 | 40 |
| 11 | Jon Irenicus | 1 | 0 | 7.3 | 15 | 0 | 5 | 2 | 0 | 0 | 0 | 0 |
| 12 | Yaga-Shura | 25 | 0 | 13.6 | 12 | 2 | 85 | 30 | 0 | 12 | 15 | 30 |
| 13 | Abazigal | 60 | 1 | 20.8 | 13 | 67 | 35 | 93 | 2 | 23 | 97 | 100 |
| 14 | Melissan | 0 | 0 | 8.5 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

## Mechanic-firing audit — did the declared mechanics actually FIRE?

Share of fights (all classes) in which each mechanic was observed on the boss instance. A HAS-but-0%-FIRED is a red flag (sim wiring or unreachable phase).

| Ch | Boss | telegraph% | canceled% | avg phases | maxApt | avg summons | gate-engaged% | ward-lifted% | rage% |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Ilyich the Duergar | 79% | 0% | 0.8 | — | — | — | — | — |
| 2 | The Magistrate | 77% | 1% | 0.9 | — | 0.9 | — | — | — |
| 3 | The Asylum Director | 51% | 0% | 1.0 | — | — | — | — | — |
| 4 | Matron Mother | — | — | 0.9 | — | 1.0 | 100% | 93% | — |
| 5 | Aurelach, the Hollow Dawn | — | — | 0.4 | — | 1.0 | — | — | — |
| 6 | The Unmade | 92% | 6% | 0.5 | — | 1.0 | 100% | 94% | — |
| 7 | The Drowned Custodian | 100% | 4% | — | — | 1.6 | — | — | 9% |
| 8 | Dravok, the Ashen Marshal | 100% | 5% | 0.9 | — | — | — | — | 16% |
| 9 | The Hollow Pretender | 100% | 9% | 0.1 | 2 | 1.1 | 100% | 42% | 8% |
| 10 | Nizidramanii'yt | 100% | 8% | 0.8 | 2 | — | — | — | — |
| 11 | Jon Irenicus | 91% | 8% | 0.1 | 3 | — | — | — | — |
| 12 | Yaga-Shura | 100% | 22% | 0.8 | 2 | 1.0 | 100% | 100% | 81% |
| 13 | Abazigal | 100% | 10% | 0.9 | 2 | — | — | — | 86% |
| 14 | Melissan | 100% | 15% | 0.1 | 3 | 2.2 | — | — | 11% |

## Class band — overall win% across all 14 bosses

| rank | class | overall win% |
|---|---|---|
| 1 | barbarian | 52 |
| 2 | ranger | 50 |
| 3 | druid | 49 |
| 4 | wizard | 41 |
| 5 | monk | 38 |
| 6 | fighter | 37 |
| 7 | rogue | 20 |

## Caster vs martial — win% per chapter (scaling sanity)

| Ch | martial win% | caster win% | wizard% | druid% |
|---|---|---|---|---|
| 1 | 100 | 100 | 100 | 100 |
| 2 | 50 | 60 | 52 | 68 |
| 3 | 100 | 100 | 100 | 100 |
| 4 | 83 | 100 | 100 | 100 |
| 5 | 14 | 16 | 2 | 30 |
| 6 | 8 | 5 | 0 | 10 |
| 7 | 0 | 2 | 0 | 3 |
| 8 | 86 | 100 | 100 | 100 |
| 9 | 0 | 0 | 0 | 0 |
| 10 | 39 | 23 | 5 | 40 |
| 11 | 1 | 0 | 0 | 0 |
| 12 | 26 | 23 | 15 | 30 |
| 13 | 44 | 98 | 97 | 100 |
| 14 | 0 | 0 | 0 | 0 |

## Caster damage scaling by level (expected values, real helpers)

Fire Bolt is the cantrip arm of the parametric model (1d10 base × levelFactor + weaponEnh, anchored at acquisition; #418 dropped the inert intFactor). The cantrip rides the steeper CANTRIP_LEVEL_K (0.12) so its L20 dice-core climbs back near the old 4d10 ≈ 22 cap, while leveled spells keep LEVEL_K (0.05). Magic Missile (darts) and Scorching Ray (rays) are deliberately left on COUNT scaling — a separate axis. Fireball is the L3 nuke on the parametric model (8d6 base, acq L5).

| Level | castMod | Fire Bolt mult | Fire Bolt dice-core | Fire Bolt full (avg) | Magic Missile (auto) | Scorching Ray (raw) | Fireball dice-core |
|---|---|---|---|---|---|---|---|
| 1 | +3 | 1.00× | 6 | 9.0 | 10.5 | 21 | 28 |
| 3 | +3 | 1.24× | 7 | 10.0 | 10.5 | 21 | 28 |
| 5 | +3 | 1.48× | 8 | 11.0 | 14.0 | 21 | 28 |
| 8 | +3 | 1.84× | 10 | 13.0 | 17.5 | 28 | 32 |
| 11 | +3 | 2.20× | 12 | 15.0 | 21.0 | 35 | 36 |
| 14 | +3 | 2.56× | 14 | 17.0 | 24.5 | 42 | 41 |
| 17 | +3 | 2.92× | 16 | 19.0 | 28.0 | 49 | 45 |
| 20 | +3 | 3.28× | 18 | 21.0 | 31.5 | 56 | 49 |

_Reference: OLD Fire Bolt cap = 4d10 ≈ 22 dice (no flat add, attack-vs-AC ~55% landed)._

