# Five-class viability on current content — sim findings

> Auto-generated tables by `scripts/sim-class-viability.ts`. Re-run with
> `SOULS_PER_CLASS=150 MAX_LIVES=150 npx tsx scripts/sim-class-viability.ts`.

**Souls / class:** 150. **Max lives / soul:** 150.
**Wall clock:** 62.6s.

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
| fighter | 150 | 150.0 | 0.0% | 0.99 | 97.3% | 100.5 | 1.3% | 17.8 | 3.15 |
| rogue | 150 | 149.6 | 9.3% | 4.01 | 100.0% | 89.6 | 3.4% | 17.9 | 3.10 |
| wizard | 150 | 150.0 | 0.0% | 0.01 | 15.3% | 138.1 | 0.1% | 24.6 | 3.74 |
| barbarian | 150 | 124.5 | 99.3% | 5.99 | 100.0% | 45.0 | 5.6% | 24.1 | 3.81 |
| ranger | 150 | 150.0 | 0.0% | 0.55 | 87.3% | 111.9 | 1.0% | 14.0 | 2.72 |

- **Topped A6** — share of souls that cleared the full chain at Ascension 6 within 150 lives.
- **Mean asc cleared** — average highest ascension a soul ever cleared (0 if it never cleared A0).
- **First A0-clear life** — average life index of a soul's first base-chain clear (only souls that cleared A0).
- **Per-life clear%** — fraction of ALL lives (across all ascensions) that cleared the chain.
- **Avg depth** — mean rooms reached per life (the full chain is 54 rooms).

## Ascension reach — how high each class's souls topped out

Soul counts bucketed by the highest ascension level they ever cleared
("never" = never cleared even A0 within 150 lives).

| Class | never | A0 | A1 | A2 | A3 | A4 | A5 | A6 |
|------|------:|------:|------:|------:|------:|------:|------:|------:|
| fighter | 4 | 38 | 75 | 26 | 6 | 1 | 0 | 0 |
| rogue | 0 | 0 | 2 | 11 | 34 | 53 | 36 | 14 |
| wizard | 127 | 22 | 1 | 0 | 0 | 0 | 0 | 0 |
| barbarian | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 149 |
| ranger | 19 | 57 | 66 | 7 | 1 | 0 | 0 | 0 |

## Proc instrumentation — do the new mechanics actually fire?

Per-combat rates across every combat the class fought. `·` = not applicable to
that class. Activations (Rage, Reckless, Hunter's-Mark cast) are exact;
Colossus is exact (once-per-turn flag); the Hunter's-Mark 1d6 per-hit die is
read off the damage log (approximate only in rare 200+-entry fights).

| Class | Combats | Rage/combat | Reckless/combat | HMark cast/combat | Colossus/combat | HMark die/combat |
|------|------:|----------:|--------------:|----------------:|--------------:|---------------:|
| fighter | 222708 | · | · | · | · | · |
| rogue | 222644 | · | · | · | · | · |
| wizard | 295946 | · | · | · | · | · |
| barbarian | 240221 | 1.26 | 1.40 | · | · | · |
| ranger | 181805 | · | · | 1.53 | 0.69 | 2.51 |

**Sanity check:** Barbarian raged **1.26**×/combat and went reckless
**1.40**×/combat. Ranger cast Hunter's Mark
**1.53**×/combat, landed mark dice
**2.51**×/combat, and fired Colossus
**0.69**×/combat (Colossus is gated behind the L3 Hunter
subclass, so its rate also reflects how often the ranger reaches L3 within a life).

## Where deaths cluster

- **fighter** — by chapter: ch1: 7582 · ch2: 13501 · ch3: 829 · ch4: 293. Top kill-rooms: cowled-wardpriest+slaver-cuirassier (3445, 15.5%), duergar-ilyich (2070, 9.3%), duergar-taskmaster (1693, 7.6%), cowled-enforcer+slaver-cuirassier (1653, 7.4%), slaver-cuirassier+cult-fanatic (1309, 5.9%), shadow+slaver-cuirassier (839, 3.8%)
- **rogue** — by chapter: ch1: 10201 · ch2: 9670 · ch3: 1224 · ch4: 598. Top kill-rooms: duergar-ilyich (2042, 9.4%), cowled-wardpriest+slaver-cuirassier (1440, 6.6%), famished-ghast+goblin (1399, 6.4%), cowled-enforcer+slaver-cuirassier (1393, 6.4%), duergar-taskmaster (999, 4.6%), slaver-cuirassier+cult-fanatic (938, 4.3%)
- **wizard** — by chapter: ch1: 2887 · ch2: 13204 · ch3: 5920 · ch4: 465. Top kill-rooms: cowled-wardpriest+slaver-cuirassier (1835, 8.2%), cowled-enforcer+slaver-cuirassier (1656, 7.4%), duergar-ilyich (1186, 5.3%), cowled-conjurer+slaver-cuirassier (1154, 5.1%), slayer-hound (937, 4.2%), hollow-sage (830, 3.7%)
- **barbarian** — by chapter: ch1: 2697 · ch2: 13136 · ch3: 1341 · ch4: 449. Top kill-rooms: cowled-wardpriest+slaver-cuirassier (2581, 14.6%), cowled-enforcer+slaver-cuirassier (1771, 10.0%), athkatla-magistrate (1380, 7.8%), duergar-taskmaster (892, 5.1%), duergar-ilyich (832, 4.7%), shadow+slaver-cuirassier (825, 4.7%)
- **ranger** — by chapter: ch1: 12627 · ch2: 9249 · ch3: 294 · ch4: 116. Top kill-rooms: duergar-ilyich (2616, 11.7%), famished-ghast+goblin (1579, 7.1%), cowled-wardpriest+slaver-cuirassier (1517, 6.8%), cowled-enforcer+slaver-cuirassier (1187, 5.3%), duergar-taskmaster (1168, 5.2%), slaver-cuirassier+cult-fanatic (1011, 4.5%)

## Verdict

Both new classes are **VIABLE** — their signature mechanics fire under the
shared policy (Barbarian raged 1.26×/combat and went reckless
1.40×/combat; Ranger cast Hunter's Mark 1.53×/combat,
landed mark dice 2.51×/combat and fired Colossus 0.69×/combat), so the
"policy never wires the new mechanics" failure mode did **not** happen — that is
the most important single result here. But the two land at opposite ends of the
viability band. **Barbarian is the strongest class in the sim by a wide margin**:
99.3% of its souls topped Ascension 6 (mean asc cleared 5.99, first A0 clear ~life 45),
versus the next-best Rogue at 9.3% (mean 4.01) and Fighter / Ranger / Wizard all at
≈0% topped. Rage's always-on halving of physical damage — renewable every combat
in this engine — is a uniquely powerful, ungated survivability lever, and the
blunt trade-blows AI floor maximally rewards exactly that, so the gap is real but
inflated: a competent player extracts more from the finesse classes, narrowing it.
Either way, Barbarian reads as **out of line on the high side** and is the prime
candidate for the balance lane to look at (chiefly Rage uptime / resistance).
**Ranger sits at the low end** — viable (clears A0 ~life 112, 74 souls cleared A1 or higher) but with
the shallowest average depth (14.0 rooms) and lowest average level (2.72), and
19/150 souls never cleared even A0 (vs Fighter's 4). The structural reason is
not its kit (which fires fine) but the **non-positional engine**: the Ranger's
ranged identity grants zero defensive benefit — it eats hits exactly like a melee
class but with d10 HP, leather AC, and no damage resistance, so it plays as a
squishier weapon class. It is roughly Fighter-adjacent on first-clear timing yet
below it on the depth floor. Net: relative to the trusted three, **Barbarian is
too strong and Ranger is in the lower-middle (≈ Fighter-or-below, clearly above
only the AI-floor-handicapped Wizard)** — neither is broken, but the Barbarian's
Rage advantage is the one number worth a second look. Absolute clear-rates remain
an AI-floor artifact; the ranking, not the magnitudes, is the deliverable.
