# Five-class viability on current content — sim findings

> Auto-generated tables by `scripts/sim-class-viability.ts`. Re-run with
> `SOULS_PER_CLASS=50 MAX_LIVES=100 npx tsx scripts/sim-class-viability.ts`.

**Souls / class:** 50. **Max lives / soul:** 100.
**Wall clock:** 12.6s.

## What this measures

A meta-journey: each soul reincarnates life after life, climbing the Spire
ascension ladder (A0→A6) over the full chained Godwake delve (the enriched
bestiary + the slightly longer chapters). Clearing the chain at ascension N
unlocks N+1; renown carries across lives and is spent greedily on a class-tuned
Grove priority list between deaths. Every class runs the SAME harness, the SAME
seed schedule, and the SAME shared action policy that drives the in-game
Auto-Battle (so Barbarian Rage and Ranger Hunter's Mark fire automatically iff
the policy wires them — which the proc table below verifies).

> ⚠️ **Read this RELATIVE, not absolute.** The bot underplays a real player, so
> absolute clear-rates and life-counts are an AI-floor artifact, not game truth
> (same caveat as the `character-order` and `rogue-meta-journey-sim2` memory
> runs). A
> low absolute clear-rate does NOT mean a class is broken. The robust signal is
> each new class (Barbarian, Ranger) lined up against the trusted three
> (Fighter, Rogue, Wizard) on identical content. No balance numbers were tuned
> in this lane — this reports, it does not adjust.

## Headline — all five classes

| Class | Souls | Lives/soul | Topped A6 | Mean asc cleared | Ever cleared A0 | First A0-clear life | Per-life clear% | Avg depth (rooms) | Avg final lvl |
|------|------:|----------:|--------:|----------------:|---------------:|-------------------:|---------------:|-----------------:|-------------:|
| fighter | 50 | 100.0 | 0.0% | 0.24 | 84.0% | 73.6 | 1.1% | 13.3 | 3.46 |
| rogue | 50 | 100.0 | 0.0% | 1.02 | 94.0% | 74.2 | 2.0% | 11.6 | 3.05 |
| wizard | 50 | 100.0 | 0.0% | 0.00 | 4.0% | 86.5 | 0.0% | 15.2 | 3.77 |
| barbarian | 50 | 99.4 | 8.0% | 4.36 | 100.0% | 33.7 | 5.4% | 17.9 | 4.29 |
| ranger | 50 | 100.0 | 0.0% | 0.16 | 56.0% | 79.2 | 0.7% | 10.1 | 2.77 |

- **Topped A6** — share of souls that cleared the full chain at Ascension 6 within 100 lives.
- **Mean asc cleared** — average highest ascension a soul ever cleared (0 if it never cleared A0).
- **First A0-clear life** — average life index of a soul's first base-chain clear (only souls that cleared A0).
- **Per-life clear%** — fraction of ALL lives (across all ascensions) that cleared the chain.
- **Avg depth** — mean rooms reached per life (the full chain is 54 rooms).

## Ascension reach — how high each class's souls topped out

Soul counts bucketed by the highest ascension level they ever cleared
("never" = never cleared even A0 within 100 lives).

| Class | never | A0 | A1 | A2 | A3 | A4 | A5 | A6 |
|------|------:|------:|------:|------:|------:|------:|------:|------:|
| fighter | 8 | 30 | 12 | 0 | 0 | 0 | 0 | 0 |
| rogue | 3 | 15 | 16 | 13 | 3 | 0 | 0 | 0 |
| wizard | 48 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| barbarian | 0 | 0 | 0 | 1 | 6 | 21 | 18 | 4 |
| ranger | 22 | 22 | 4 | 2 | 0 | 0 | 0 | 0 |

## Proc instrumentation — do the new mechanics actually fire?

Per-combat rates across every combat the class fought. `·` = not applicable to
that class. Activations (Rage, Reckless, Hunter's-Mark cast) are exact;
Colossus is exact (once-per-turn flag); the Hunter's-Mark 1d6 per-hit die is
read off the damage log (approximate only in rare 200+-entry fights).

| Class | Combats | Rage/combat | Reckless/combat | HMark cast/combat | Colossus/combat | HMark die/combat |
|------|------:|----------:|--------------:|----------------:|--------------:|---------------:|
| fighter | 40879 | · | · | · | · | · |
| rogue | 35860 | · | · | · | · | · |
| wizard | 46298 | · | · | · | · | · |
| barbarian | 54214 | 1.20 | 1.28 | · | · | · |
| ranger | 31521 | · | · | 1.46 | 0.56 | 2.39 |

**Sanity check:** Barbarian raged **1.20**×/combat and went reckless
**1.28**×/combat. Ranger cast Hunter's Mark
**1.46**×/combat, landed mark dice
**2.39**×/combat, and fired Colossus
**0.56**×/combat (Colossus is gated behind the L3 Hunter
subclass, so its rate also reflects how often the ranger reaches L3 within a life).

## Where deaths cluster

- **fighter** — by chapter: ch1: 1668 · ch2: 2963 · ch3: 186 · ch4: 129. Top kill-rooms: duergar-ilyich (538, 10.9%), cowled-wardpriest+slaver-cuirassier (399, 8.1%), slaver-cuirassier+cult-fanatic (343, 6.9%), cowled-enforcer+slaver-cuirassier (304, 6.1%), duergar-taskmaster (256, 5.2%), shadow+slaver-cuirassier (209, 4.2%)
- **rogue** — by chapter: ch1: 2719 · ch2: 1879 · ch3: 184 · ch4: 120. Top kill-rooms: duergar-ilyich (508, 10.4%), famished-ghast+goblin (441, 9.0%), ghoul+skeleton (255, 5.2%), goblin-warden+goblin (222, 4.5%), duergar-taskmaster (219, 4.5%), cowled-enforcer+slaver-cuirassier (218, 4.4%)
- **wizard** — by chapter: ch1: 1082 · ch2: 3145 · ch3: 745 · ch4: 26. Top kill-rooms: cowled-wardpriest+slaver-cuirassier (503, 10.1%), athkatla-magistrate (496, 9.9%), cowled-enforcer+slaver-cuirassier (358, 7.2%), slaver-cuirassier+cult-fanatic (339, 6.8%), duergar-ilyich (310, 6.2%), shadow+slaver-cuirassier (228, 4.6%)
- **barbarian** — by chapter: ch1: 886 · ch2: 3124 · ch3: 364 · ch4: 328. Top kill-rooms: cowled-wardpriest+slaver-cuirassier (540, 11.5%), athkatla-magistrate (508, 10.8%), cowled-enforcer+slaver-cuirassier (391, 8.3%), duergar-ilyich (295, 6.3%), shadow+slaver-cuirassier (289, 6.1%), slaver-cuirassier+cult-fanatic (263, 5.6%)
- **ranger** — by chapter: ch1: 3009 · ch2: 1835 · ch3: 65 · ch4: 55. Top kill-rooms: duergar-ilyich (610, 12.3%), famished-ghast+goblin (448, 9.0%), ghoul+skeleton (262, 5.3%), goblin-warden+goblin (244, 4.9%), goblin-warden+stirge (238, 4.8%), slaver-cuirassier+cult-fanatic (219, 4.4%)

## Verdict

Both new classes are **VIABLE** — their signature mechanics fire under the
shared policy (Barbarian raged 1.20×/combat and went reckless
1.28×/combat; Ranger cast Hunter's Mark 1.46×/combat,
landed mark dice 2.39×/combat and fired Colossus 0.56×/combat), so the
"policy never wires the new mechanics" failure mode did **not** happen — that is
the most important single result here. But the two land at opposite ends of the
viability band. **Barbarian is the strongest class in the sim by a wide margin**:
8.0% of its souls topped Ascension 6 (mean asc cleared 4.36, first A0 clear ~life 34),
versus the next-best Rogue at 0.0% (mean 1.02) and Fighter / Ranger / Wizard all at
≈0% topped. Rage's always-on halving of physical damage — renewable every combat
in this engine — is a uniquely powerful, ungated survivability lever, and the
blunt trade-blows AI floor maximally rewards exactly that, so the gap is real but
inflated: a competent player extracts more from the finesse classes, narrowing it.
Either way, Barbarian reads as **out of line on the high side** and is the prime
candidate for the balance lane to look at (chiefly Rage uptime / resistance).
**Ranger sits at the low end** — viable (clears A0 ~life 79, 6 souls cleared A1 or higher) but with
the shallowest average depth (10.1 rooms) and lowest average level (2.77), and
22/50 souls never cleared even A0 (vs Fighter's 8). The structural reason is
not its kit (which fires fine) but the **non-positional engine**: the Ranger's
ranged identity grants zero defensive benefit — it eats hits exactly like a melee
class but with d10 HP, leather AC, and no damage resistance, so it plays as a
squishier weapon class. It is roughly Fighter-adjacent on first-clear timing yet
below it on the depth floor. Net: relative to the trusted three, **Barbarian is
too strong and Ranger is in the lower-middle (≈ Fighter-or-below, clearly above
only the AI-floor-handicapped Wizard)** — neither is broken, but the Barbarian's
Rage advantage is the one number worth a second look. Absolute clear-rates remain
an AI-floor artifact; the ranking, not the magnitudes, is the deliverable.
