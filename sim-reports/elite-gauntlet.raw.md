# Elite gauntlet — per-chapter encounter ladder (normal · elite · boss)

Ascension **0**, archetype **balanced**, gear **representative (depth-scaled)**, **60** seeds × 7 classes × 3 lanes per chapter. The SAME per-chapter hero (level schedule + blessing loadout, identical to the boss lens) is dropped into a normal fight, the chapter's ONE elite node (#423), and the boss. Target ladder: **normal win% > elite win% > boss win%**, the elite a clear notch under the boss. Read SHAPE, not magnitudes. Wall: 12.0s.

## Encounter ladder — win% (all classes) per lane

Difficulty rises as win% falls. Target band: **boss.win ≤ elite.win ≤ normal.win** (elite a notch harder than a normal fight, a notch easier than the boss), all at the SAME boss-level hero — note this UNDERSTATES the elite, which in real play is met by a lower-level hero, so an elite that still walls a boss-level hero is a genuine overshoot. TOL=±6 pts absorbs seed noise.

| Ch | elite leader | normal win% | **elite win%** | boss win% | ladder verdict |
|---|---|---|---|---|---|
| 1 | Gallows Wight | 100 | **96** | 100 | ~ ties the boss |
| 2 | Cowled Wardpriest | 100 | **75** | 93 | ⚠ HARDER than boss (overshoot) |
| 3 | The Hollow Gaze | 100 | **96** | 100 | ~ ties the boss |
| 4 | Mind Flayer Fragment | 100 | **85** | 97 | ⚠ HARDER than boss (overshoot) |
| 5 | Fallen Archon | 86 | **72** | 60 | ✓ in band |
| 6 | Axle-Warden | 98 | **53** | 58 | ~ ties the boss |
| 7 | Tidebound Codex | 98 | **52** | 52 | ~ ties the boss |
| 8 | Slag-Colossus | 98 | **53** | 94 | ⚠ HARDER than boss (overshoot) |
| 9 | The Mask-Chamberlain | 100 | **50** | 21 | ✓ in band |
| 10 | Rakshasa | 99 | **70** | 77 | ⚠ HARDER than boss (overshoot) |
| 11 | Devourer of Selfishness | 100 | **75** | 25 | ✓ in band |
| 12 | Fire-Giant Warlord | 98 | **57** | 76 | ⚠ HARDER than boss (overshoot) |
| 13 | Sendai | 100 | **72** | 98 | ⚠ HARDER than boss (overshoot) |
| 14 | Warden of the Pools | 86 | **32** | 5 | ✓ in band |

## Elite detail — rounds, min-HP%, stall%, and leader mechanic firing

Signature-mechanic column: telegraph/phase/summon come from the boss-framework instrumentation; debuff/paralyze leaders (#425 Ch1-3) report the share of fights the PLAYER suffered the leader's signature condition.

| Ch | elite leader | elite win% | avg rounds | win min-HP% | stall% | signature | fired% |
|---|---|---|---|---|---|---|---|
| 1 | Gallows Wight | 96 | 5.5 | 92 | 1 | debuff:paralyzed | 4% |
| 2 | Cowled Wardpriest | 75 | 9.6 | 55 | 1 | attack-only | — |
| 3 | The Hollow Gaze | 96 | 7.3 | 76 | 2 | summon | 0.7/fight |
| 4 | Mind Flayer Fragment | 85 | 7.1 | 73 | 0 | attack-only | — |
| 5 | Fallen Archon | 72 | 7.6 | 51 | 0 | attack-only | — |
| 6 | Axle-Warden | 53 | 13.4 | 24 | 3 | summon | 1.4/fight |
| 7 | Tidebound Codex | 52 | 11.6 | 45 | 0 | summon | 1.4/fight |
| 8 | Slag-Colossus | 53 | 13.0 | 52 | 1 | summon | 1.3/fight |
| 9 | The Mask-Chamberlain | 50 | 15.4 | 65 | 10 | summon | 2.8/fight |
| 10 | Rakshasa | 70 | 11.1 | 60 | 1 | attack-only | — |
| 11 | Devourer of Selfishness | 75 | 16.7 | 74 | 10 | attack-only | — |
| 12 | Fire-Giant Warlord | 57 | 12.9 | 54 | 5 | attack-only | — |
| 13 | Sendai | 72 | 12.3 | 68 | 0 | summon | 1.6/fight |
| 14 | Warden of the Pools | 32 | 9.6 | 47 | 0 | attack-only | — |

## Per-class elite win% (which classes wall on elites)

| Ch | elite leader | fighter% | barbarian% | ranger% | rogue% | monk% | wizard% | druid% |
|---|---|---|---|---|---|---|---|---|
| 1 | Gallows Wight | 98 | 100 | 97 | 82 | 100 | 100 | 98 |
| 2 | Cowled Wardpriest | 67 | 50 | 75 | 80 | 77 | 100 | 78 |
| 3 | The Hollow Gaze | 100 | 100 | 90 | 85 | 100 | 98 | 98 |
| 4 | Mind Flayer Fragment | 85 | 97 | 97 | 28 | 93 | 100 | 97 |
| 5 | Fallen Archon | 100 | 97 | 0 | 53 | 87 | 68 | 100 |
| 6 | Axle-Warden | 22 | 70 | 82 | 0 | 62 | 45 | 88 |
| 7 | Tidebound Codex | 98 | 60 | 10 | 12 | 62 | 37 | 85 |
| 8 | Slag-Colossus | 95 | 98 | 17 | 3 | 50 | 32 | 75 |
| 9 | The Mask-Chamberlain | 28 | 23 | 27 | 25 | 55 | 97 | 95 |
| 10 | Rakshasa | 90 | 87 | 52 | 40 | 78 | 43 | 100 |
| 11 | Devourer of Selfishness | 100 | 75 | 72 | 45 | 73 | 82 | 77 |
| 12 | Fire-Giant Warlord | 87 | 77 | 32 | 12 | 50 | 83 | 57 |
| 13 | Sendai | 100 | 90 | 17 | 25 | 83 | 90 | 100 |
| 14 | Warden of the Pools | 100 | 0 | 17 | 35 | 25 | 28 | 17 |

