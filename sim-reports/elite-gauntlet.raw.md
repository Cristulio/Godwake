# Elite gauntlet — per-chapter encounter ladder (normal · elite · boss)

Ascension **0**, archetype **balanced**, gear **bare floor**, **60** seeds × 7 classes × 3 lanes per chapter. The SAME per-chapter hero (level schedule + blessing loadout, identical to the boss lens) is dropped into a normal fight, the chapter's ONE elite node (#423), and the boss. Target ladder: **normal win% > elite win% > boss win%**, the elite a clear notch under the boss. Read SHAPE, not magnitudes. Wall: 8.2s.

## Encounter ladder — win% (all classes) per lane

Difficulty rises as win% falls. Target band: **boss.win ≤ elite.win ≤ normal.win** (elite a notch harder than a normal fight, a notch easier than the boss), all at the SAME boss-level hero — note this UNDERSTATES the elite, which in real play is met by a lower-level hero, so an elite that still walls a boss-level hero is a genuine overshoot. TOL=±6 pts absorbs seed noise.

| Ch | elite leader | normal win% | **elite win%** | boss win% | ladder verdict |
|---|---|---|---|---|---|
| 1 | Gallows Wight | 99 | **92** | 100 | ⚠ HARDER than boss (overshoot) |
| 2 | Cowled Wardpriest | 95 | **43** | 52 | ⚠ HARDER than boss (overshoot) |
| 3 | The Hollow Gaze | 97 | **66** | 100 | ⚠ HARDER than boss (overshoot) |
| 4 | Mind Flayer Fragment | 95 | **55** | 88 | ⚠ HARDER than boss (overshoot) |
| 5 | Fallen Archon | 96 | **38** | 14 | ✓ in band |
| 6 | Axle-Warden | 70 | **4** | 7 | ~ ties the boss |
| 7 | Tidebound Codex | 72 | **11** | 1 | ✓ in band |
| 8 | Slag-Colossus | 79 | **6** | 90 | ⚠ HARDER than boss (overshoot) |
| 9 | The Mask-Chamberlain | 91 | **28** | 0 | ✓ in band |
| 10 | Rakshasa | 88 | **35** | 34 | ✓ in band |
| 11 | Devourer of Selfishness | 78 | **31** | 0 | ✓ in band |
| 12 | Fire-Giant Warlord | 92 | **13** | 21 | ⚠ HARDER than boss (overshoot) |
| 13 | Sendai | 96 | **34** | 58 | ⚠ HARDER than boss (overshoot) |
| 14 | Warden of the Pools | 82 | **8** | 0 | ✓ in band |

## Elite detail — rounds, min-HP%, stall%, and leader mechanic firing

Signature-mechanic column: telegraph/phase/summon come from the boss-framework instrumentation; debuff/paralyze leaders (#425 Ch1-3) report the share of fights the PLAYER suffered the leader's signature condition.

| Ch | elite leader | elite win% | avg rounds | win min-HP% | stall% | signature | fired% |
|---|---|---|---|---|---|---|---|
| 1 | Gallows Wight | 92 | 6.7 | 63 | 0 | debuff:paralyzed | 3% |
| 2 | Cowled Wardpriest | 43 | 8.6 | 26 | 0 | attack-only | — |
| 3 | The Hollow Gaze | 66 | 8.9 | 41 | 0 | summon | 0.7/fight |
| 4 | Mind Flayer Fragment | 55 | 7.5 | 36 | 0 | attack-only | — |
| 5 | Fallen Archon | 38 | 7.2 | 23 | 0 | attack-only | — |
| 6 | Axle-Warden | 4 | 6.6 | 11 | 0 | summon | 0.8/fight |
| 7 | Tidebound Codex | 11 | 8.1 | 18 | 0 | summon | 0.9/fight |
| 8 | Slag-Colossus | 6 | 8.0 | 26 | 0 | summon | 1.1/fight |
| 9 | The Mask-Chamberlain | 28 | 10.6 | 25 | 0 | summon | 1.7/fight |
| 10 | Rakshasa | 35 | 11.1 | 44 | 0 | attack-only | — |
| 11 | Devourer of Selfishness | 31 | 16.2 | 47 | 12 | attack-only | — |
| 12 | Fire-Giant Warlord | 13 | 7.5 | 31 | 0 | attack-only | — |
| 13 | Sendai | 34 | 10.9 | 50 | 0 | summon | 2.1/fight |
| 14 | Warden of the Pools | 8 | 7.9 | 27 | 0 | attack-only | — |

## Per-class elite win% (which classes wall on elites)

| Ch | elite leader | fighter% | barbarian% | ranger% | rogue% | monk% | wizard% | druid% |
|---|---|---|---|---|---|---|---|---|
| 1 | Gallows Wight | 90 | 97 | 95 | 75 | 92 | 98 | 95 |
| 2 | Cowled Wardpriest | 27 | 47 | 50 | 8 | 30 | 77 | 62 |
| 3 | The Hollow Gaze | 50 | 93 | 93 | 20 | 65 | 50 | 88 |
| 4 | Mind Flayer Fragment | 35 | 78 | 78 | 2 | 58 | 58 | 77 |
| 5 | Fallen Archon | 15 | 57 | 72 | 0 | 43 | 22 | 60 |
| 6 | Axle-Warden | 0 | 2 | 3 | 0 | 2 | 0 | 22 |
| 7 | Tidebound Codex | 2 | 3 | 8 | 0 | 7 | 15 | 43 |
| 8 | Slag-Colossus | 3 | 2 | 3 | 0 | 0 | 25 | 8 |
| 9 | The Mask-Chamberlain | 18 | 8 | 20 | 2 | 20 | 52 | 75 |
| 10 | Rakshasa | 17 | 58 | 38 | 3 | 23 | 30 | 75 |
| 11 | Devourer of Selfishness | 22 | 35 | 48 | 3 | 27 | 28 | 53 |
| 12 | Fire-Giant Warlord | 3 | 2 | 10 | 5 | 2 | 60 | 8 |
| 13 | Sendai | 12 | 12 | 17 | 0 | 13 | 98 | 87 |
| 14 | Warden of the Pools | 5 | 18 | 8 | 0 | 0 | 8 | 13 |

