# Barbarian power read — under- or over-powered? (2026-06-01)

Diagnostic / measurement lane (`feat/sim-barb-power`). No engine, content, or
balance was changed. Source: `scripts/sim-class-viability.ts`, temporarily
instrumented to record per-fight threat metrics split bare-soul vs veteran, run
at `SOULS_PER_CLASS=80 MAX_LIVES=60 ARCHETYPE=balanced` (128.6s wall). The
instrumentation was reverted; this doc is the only artifact.

## Verdict

**Barbarian sits WITHIN the intended asymmetric band.** It is the strongest
*fresh* soul on every survival metric but is tied with the Ranger, not a lone
outlier, and it regresses to mid-pack once gear and renown accrue. No
trivialization signal: its blowout rate is below the Fighter's and roughly the
Ranger's. The historical "Barb over-strong (Rage)" flag (#165) reads as
**substantially corrected** by the no-healing-while-raging rework.

- **Bare-soul FLOOR call (the flagged concern):** Barb is the **strongest fresh
  soul** — highest win rate (76.6%), highest blowout rate (19.8%), faces the
  least threat (avg lowest-HP 43.5%), lowest death rate (23.4/100), goes deepest
  (6.6 rooms), reaches the highest level (1.91). **But the Ranger matches it
  within ~1 point on every one of those** (75.2% / 19.3% / 43.1% / 24.8 / 6.2 /
  1.81). So the old "Barb floor too strong" worry is **directionally confirmed
  but not Barb-specific**: it is a two-class brute/survivalist early-durability
  cluster sitting at the top of the band, not a single class outside it. The
  widest gap to the rest of the pack is blowout-vs-Fighter (19.8% vs 7.9%).
- **Veteran:** Barb is **3rd** on blowout (57.9%), survival, and depth, behind
  Fighter and Ranger. Clearly within band; gear scales the Fighter's and
  Ranger's kits harder than it scales Rage. No over-power signal here.
- **Trivialization:** none. Veteran Barb blowout 57.9% is *lower* than Fighter
  (67.1%) and Ranger (65.8%) — it faces more real threat than they do, not less.
- **Rage rework is visibly biting:** Barb is the only class whose average
  end-of-fight HP equals its in-fight low (bare 43.5%/43.5%, vet 74.0%/74.2%) —
  it never recovers HP mid-fight, the direct fingerprint of "no healing while
  raging." Every other class ends a won fight well above its low point.

**Proc check — PASSED, read is trustworthy.** Barb's signature mechanics fire
under the bot: Rage **1.83×/combat**, Reckless Attack **2.32×/combat** (across
80,251 combats). The bot is *not* under-playing Barb, so the strength signal is
real, not an AI artifact.

**Tuning direction (no numbers proposed):** none warranted on Barb in isolation.
The only watch-item is the shared bare-soul top-of-band durability of
Barb+Ranger; if the user wants to compress the early-game floor, that is a
two-class brute/survivalist question, not a Barb nerf. The user decides; a
separate lane would apply any change.

## Method note

Absolute clear% is meaningless here — the shared Auto-Battle bot is an AI floor,
and **only the Fighter ever clears** (the bot can pilot its plain attack loop to
the end; Barb/Ranger/Wizard/Rogue all read 0% clear regardless of real
strength). So the read is **relative** (Barb vs the pack under one policy) and on
**threat faced**, never on clear rate. "Bare-soul" = first life only (renown 0,
no Grove upgrades, no banked legendaries); "veteran" = all later lives in the
reincarnation chain (accrued renown/gear). Metrics:

- **Blowout%** — won fights whose HP never dipped below 80% (÷ wins). High =
  trivializes; low = faces real threat.
- **Avg low-HP%** — mean of each won fight's lowest HP fraction (threat faced).
- **Avg end-HP%** — mean HP fraction at win (vs low-HP shows in-fight recovery).
- **Deaths/100** — lost fights per 100 encounters. **Win%** — fights won.
- **Dmg/round** — initial enemy HP pool ÷ player rounds, over wins (approximate;
  ignores summons/regen — a relative proxy only).
- **Depth** — mean rooms reached per life. **Lvl** — mean final level.

## Bare-soul (first life, pre-renown)

| Class | Fights | Win% | Blowout% | Avg low-HP% | Avg end-HP% | Deaths/100 | Dmg/round | Depth | Lvl |
|------|------:|-----:|--------:|----------:|----------:|---------:|--------:|-----:|----:|
| **barbarian** | 342 | **76.6%** | **19.8%** | **43.5%** | 43.5% | **23.39** | 5.8 | **6.6** | **1.91** |
| ranger | 323 | 75.2% | 19.3% | 43.1% | 51.0% | 24.77 | 6.8 | 6.2 | 1.81 |
| fighter | 294 | 72.8% | 7.9% | 28.7% | 58.8% | 27.21 | 4.2 | 5.8 | 1.70 |
| wizard | 268 | 70.1% | 17.6% | 36.3% | 56.3% | 29.85 | 7.3 | 5.0 | 1.49 |
| rogue | 163 | 50.9% | 9.6% | 26.1% | 42.7% | 49.08 | 4.7 | 2.8 | 1.09 |

Barb leads every survival/threat column at the floor — but Ranger is within ~1pt
on win%, blowout%, avg low-HP, deaths/100, and depth. Note Barb's end-HP (43.5%)
== its low-HP (43.5%): no in-fight recovery (Rage no-heal). Bare-soul fight
counts are modest (first-life only), so treat these as a clear *ordering* with
noisier magnitudes than the veteran rows.

## Veteran (all later lives, post-renown)

| Class | Fights | Win% | Blowout% | Avg low-HP% | Avg end-HP% | Deaths/100 | Dmg/round | Depth | Lvl |
|------|------:|-----:|--------:|----------:|----------:|---------:|--------:|-----:|----:|
| fighter | 118,651 | 97.1% | 67.1% | 81.1% | 90.1% | 2.89 | 29.7 | 55.0 | 8.46 |
| ranger | 105,327 | 95.5% | 65.8% | 79.8% | 88.7% | 4.48 | 21.0 | 40.5 | 6.93 |
| **barbarian** | 79,909 | 94.1% | 57.9% | 74.0% | 74.2% | 5.91 | 17.8 | 30.4 | 5.79 |
| wizard | 46,694 | 89.9% | 49.8% | 65.7% | 68.2% | 10.11 | 10.3 | 17.3 | 3.92 |
| rogue | 37,918 | 87.6% | 50.4% | 66.8% | 76.2% | 12.45 | 14.3 | 13.9 | 3.03 |

The bare-soul ordering inverts: with gear, Barb falls to 3rd. Fighter (the only
clearer) and Ranger pull ahead on blowout, survival, depth, and damage. Barb's
end-HP (74.2%) still tracks its low-HP (74.0%) — the no-heal fingerprint persists
at veteran. Damage/round confirms Barb is a **durability** class, not a burst
outlier: it is mid-pack on damage at both tiers (Wizard tops bare dmg/round,
Fighter tops veteran).

## Proc instrumentation (per combat)

| Class | Combats | Rage | Reckless | Hunter's Mark | Colossus |
|------|------:|----:|--------:|-------------:|--------:|
| barbarian | 80,251 | 1.83 | 2.32 | — | — |
| ranger | 105,650 | — | — | 1.82 | 4.17 |
| fighter | 118,945 | — | — | — | — |
| wizard | 46,962 | — | — | — | — |
| rogue | 38,081 | — | — | — | — |

Barb's kit fires at a healthy cadence (Rage activates ~1.8× and Reckless ~2.3×
per combat), so the strength read above is **not** a bot under-play artifact.

## Bottom line

Barbarian is **within band**. The bare-soul floor is on the high side but is a
shared Barb+Ranger early-durability cluster, not a unique Barb outlier, and the
gap to the pack is moderate (largest single gap: blowout 19.8% vs Fighter 7.9%).
At veteran it is comfortably mid-upper. The Rage no-heal rework demonstrably
holds its in-fight sustain to zero recovery. No Barb-specific tuning is indicated
by this data; any early-floor compression would be a two-class question for the
user to decide.
