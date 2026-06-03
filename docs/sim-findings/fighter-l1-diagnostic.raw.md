# Fighter L1-floor diagnostic — raw sim output

Chain: BASE (Cells→Irenicus) · Ascension 0 · Archetype balanced · L1 cohort N=300 · band cohort N=80
Seed base 0xf16b · paired seed schedule across phases.

> Engine experimental block: **ACTIVE** (probe dmg/enemy-turn base 2.52 vs halve 1.32). 

## 1. L1 floor — field head-to-head (baseline)

| Class | n | mean | median | p90 | max | →Ch2 | →Ch3 | death% | mean death ch | mean rounds/won | won minHP | blowout% | dmg/enemy-turn |
|-------|--:|-----:|-------:|----:|----:|-----:|-----:|-------:|--------------:|----------------:|----------:|---------:|---------------:|
| fighter | 300 | 4.07 | 3 | 10 | 16 | 13.0% | 0.0% | 100.0% | 1.1 | 6.56 | 28.8% | 7.8% | 2.61 |
| barbarian | 300 | 8.56 | 5 | 15 | 44 | 38.3% | 8.3% | 100.0% | 1.6 | 4.49 | 52.2% | 24.9% | 1.71 |
| ranger | 300 | 5.77 | 4 | 13 | 31 | 26.3% | 0.3% | 100.0% | 1.3 | 4.03 | 40.1% | 16.8% | 2.33 |
| rogue | 300 | 4.99 | 4 | 10 | 21 | 13.3% | 0.3% | 100.0% | 1.1 | 5.75 | 34.0% | 15.2% | 2.03 |
| wizard | 300 | 4.76 | 4 | 10 | 15 | 15.3% | 0.0% | 100.0% | 1.2 | 3.97 | 34.0% | 13.9% | 2.51 |

## 2. What kills the L1 Fighter (baseline) — vs the other starters

### fighter
deaths 300/300 (100.0%) · mean HP entering the lethal fight 76.3% · burst share (entered ≥80% HP) 56.0%
death-chapter histogram: Ch1:261  Ch2:39
top lethal compositions:
  - 23× Skeleton + Bone Stalker
  - 20× Kobold + Kobold
  - 19× Skeleton + Skeleton
  - 18× Skeleton + Stirge
  - 18× Goblin + Stirge
  - 18× Famished Ghast

### barbarian
deaths 300/300 (100.0%) · mean HP entering the lethal fight 52.2% · burst share (entered ≥80% HP) 27.0%
death-chapter histogram: Ch1:185  Ch2:90  Ch3:6  Ch4:12  Ch5:5  Ch6:2
top lethal compositions:
  - 16× Famished Ghast + Goblin
  - 15× Skeleton + Bone Stalker
  - 15× Stirge + Stirge
  - 14× Skeleton + Stirge
  - 13× Cell Wight + Famished Ghast
  - 12× Goblin + Kobold

### ranger
deaths 300/300 (100.0%) · mean HP entering the lethal fight 57.7% · burst share (entered ≥80% HP) 35.0%
death-chapter histogram: Ch1:221  Ch2:78  Ch4:1
top lethal compositions:
  - 22× Skeleton + Bone Stalker
  - 18× Stirge + Stirge
  - 15× Famished Ghast
  - 13× Skeleton + Stirge
  - 13× Slaver Cuirassier + Cult Fanatic
  - 11× Ilyich the Duergar

## 3. Candidate cushions — Fighter L1 floor lift

Target band: lift Fighter L1 toward ranger (5.77) / barbarian (8.56) WITHOUT overshooting.

| Phase | mean | median | p90 | →Ch2 | →Ch3 | death% | won minHP | dmg/enemy-turn | Δmean vs base |
|-------|-----:|-------:|----:|-----:|-----:|-------:|----------:|---------------:|-------------:|
| base | 4.07 | 3 | 10 | 13.0% | 0.0% | 100.0% | 28.8% | 2.61 | +0.00 |
| halve | 11.06 | 12 | 19 | 70.3% | 12.0% | 100.0% | 48.9% | 1.32 | +6.99 |
| dodge | 7.90 | 6 | 14 | 46.0% | 4.7% | 100.0% | 43.5% | 1.65 | +3.83 |
| dr2 | 6.41 | 5 | 13 | 34.7% | 1.3% | 100.0% | 37.3% | 1.91 | +2.35 |
| dr3 | 8.60 | 10 | 14 | 56.3% | 3.7% | 100.0% | 42.8% | 1.68 | +4.54 |
| temphp3 | 5.21 | 4 | 12 | 25.3% | 1.3% | 100.0% | 38.3% | 2.67 | +1.15 |
| temphp5 | 5.62 | 4 | 12 | 28.3% | 1.7% | 100.0% | 41.6% | 2.74 | +1.55 |
| sw | 4.79 | 3 | 12 | 19.0% | 1.0% | 100.0% | 30.8% | 2.76 | +0.72 |

_Phase legend:_
  - `base` — baseline (no cushion)
  - `halve` — CONTROL: Rage-style halve physical (L1–4)
  - `dodge` — A1: first incoming attack/round at disadvantage (L1–4)
  - `dr2` — A2: flat damage reduction 2 per hit (L1–4)
  - `dr3` — A2: flat damage reduction 3 per hit (L1–4)
  - `temphp3` — A3: temp HP (3 + level) at combat start (L1–4)
  - `temphp5` — A3: temp HP (5 + level) at combat start (L1–4)
  - `sw` — B: +1 Second Wind charge (L1–4)

## 4. Band-preservation — does a Fighter cushion invert the L3+ order?

Fighter at each level under each phase, vs the fixed baseline field. A cushion
gated to L1–4 must (a) fade by L5 [Fighter L5/7 == base] and (b) not vault
Fighter past the field at L3.

Baseline field (mean rooms reached):

| Class | L1 | L3 | L5 | L7 |
|-------|---:|---:|---:|---:|
| fighter | 3.51 | 60.56 | 62.71 | 65.24 |
| barbarian | 8.18 | 55.96 | 56.27 | 58.06 |
| ranger | 5.24 | 54.49 | 57.06 | 54.60 |
| rogue | 4.72 | 45.80 | 47.60 | 46.61 |
| wizard | 4.71 | 31.77 | 32.85 | 31.11 |

Fighter band under each cushion (other classes hold their baseline above):

| Phase | L1 | L3 | L5 | L7 | inverts field@L3? |
|-------|---:|---:|---:|---:|:------------------|
| base | 3.51 | 60.56 | 62.71 | 65.24 | no |
| halve | 10.68 | 63.17 | 62.71 | 65.24 | no |
| dodge | 8.26 | 60.41 | 62.71 | 65.24 | no |
| dr2 | 6.05 | 63.76 | 62.71 | 65.24 | no |
| dr3 | 8.50 | 63.74 | 62.71 | 65.24 | no |
| temphp3 | 5.16 | 60.79 | 62.71 | 65.24 | no |
| temphp5 | 5.09 | 61.06 | 62.71 | 65.24 | no |
| sw | 4.53 | 63.09 | 62.71 | 65.24 | no |

> Fighter L5/L7 should read identical across phases (buff faded). Any drift there
> is RNG-noise at this cohort size, not a leak past L4.
