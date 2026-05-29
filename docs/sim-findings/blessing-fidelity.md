# Blessing-fidelity — sim findings

Full Godwake delve, single life, L1 start, leveling on room XP. **OFF** skips shrines (bare-soul baseline); **ON** picks the best offered blessing via the shared `chooseBlessing` policy. 500 runs/cell, same seeds across OFF/ON.

## Power curve: OFF vs ON

| Class | Bless | Clear% | Rooms | Chapter | Final lvl | Boss win% | Blessings held |
|------|------|------:|-----:|-------:|---------:|---------:|--------------:|
| fighter | OFF | 0.0 | 9.7 | 1.24 | 2.05 | 50.0 | 0.00 |
| fighter | ON | 0.0 | 11.4 | 1.37 | 2.26 | 60.0 | 2.12 |
| rogue | OFF | 0.0 | 7.6 | 1.07 | 1.63 | 35.7 | 0.00 |
| rogue | ON | 0.0 | 8.5 | 1.13 | 1.82 | 44.9 | 1.71 |
| wizard | OFF | 0.0 | 13.6 | 1.59 | 2.54 | 71.6 | 0.00 |
| wizard | ON | 0.0 | 16.1 | 1.78 | 2.76 | 84.8 | 2.60 |

## Lift (ON − OFF)

| Class | ΔClear% | ΔRooms | ΔChapter | ΔFinal lvl | ΔBoss win% |
|------|-------:|------:|--------:|----------:|----------:|
| fighter | +0.0 | +1.7 | +0.13 | +0.21 | +10.0 |
| rogue | +0.0 | +0.9 | +0.06 | +0.18 | +9.2 |
| wizard | +0.0 | +2.5 | +0.20 | +0.22 | +13.2 |

## What the policy takes (ON)

- **fighter:** Ilmater's Patience (29%), Tymora's Wink (20%), Helm's Vigil (19%), Ilmater's Forbearance (17%), Lathander's Dawn (16%)
- **rogue:** Tymora's Wink (18%), Ilmater's Patience (18%), Tempus's Charge (15%), Helm's Vigil (14%), Selûne's Veil (14%)
- **wizard:** Ilmater's Patience (50%), Tymora's Wink (49%), Helm's Vigil (35%), Ilmater's Forbearance (28%), Lathander's Dawn (27%)

## Where deaths cluster

- fighter OFF: room-10 (121), room-8 (103), room-6 (93), room-14 (76)
- fighter ON : room-10 (124), room-14 (90), room-6 (84), room-8 (77)
- rogue OFF: room-6 (165), room-8 (159), room-4 (78), room-10 (63)
- rogue ON : room-8 (161), room-6 (125), room-10 (80), room-4 (68)
- wizard OFF: room-14 (138), room-10 (114), room-18 (107), room-6 (41)
- wizard ON : room-18 (176), room-14 (105), room-20 (67), room-10 (66)
