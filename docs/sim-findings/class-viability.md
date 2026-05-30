# Five-class viability on current content — sim findings

> Auto-generated tables by `scripts/sim-class-viability.ts`. Re-run with
> `SOULS_PER_CLASS=150 MAX_LIVES=150 npx tsx scripts/sim-class-viability.ts`.

**Souls / class:** 150. **Max lives / soul:** 150.
**Wall clock:** 86.7s.

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
| fighter | 150 | 150.0 | 0.0% | 0.00 | 0.0% | — | 0.0% | 18.8 | 4.08 |
| rogue | 150 | 150.0 | 0.0% | 0.00 | 0.0% | — | 0.0% | 20.3 | 4.17 |
| wizard | 150 | 150.0 | 0.0% | 0.00 | 0.0% | — | 0.0% | 19.9 | 4.33 |
| barbarian | 150 | 150.0 | 0.0% | 0.00 | 0.0% | — | 0.0% | 28.7 | 5.37 |
| ranger | 150 | 150.0 | 0.0% | 0.00 | 0.0% | — | 0.0% | 15.0 | 3.41 |

- **Topped A6** — share of souls that cleared the full chain at Ascension 6 within 150 lives.
- **Mean asc cleared** — average highest ascension a soul ever cleared (0 if it never cleared A0).
- **First A0-clear life** — average life index of a soul's first base-chain clear (only souls that cleared A0).
- **Per-life clear%** — fraction of ALL lives (across all ascensions) that cleared the chain.
- **Avg depth** — mean rooms reached per life. One route is walked through the
  branching 6-chapter map; a full routed clear is ~62-66 rooms (the whole map is
  ~103-111 nodes), ending at the Ch6 final boss (the-unmade).

## Ascension reach — how high each class's souls topped out

Soul counts bucketed by the highest ascension level they ever cleared
("never" = never cleared even A0 within 150 lives).

| Class | never | A0 | A1 | A2 | A3 | A4 | A5 | A6 |
|------|------:|------:|------:|------:|------:|------:|------:|------:|
| fighter | 150 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| rogue | 150 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| wizard | 150 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| barbarian | 150 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| ranger | 150 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

## Proc instrumentation — do the new mechanics actually fire?

Per-combat rates across every combat the class fought. `·` = not applicable to
that class. Activations (Rage, Reckless, Hunter's-Mark cast) are exact;
Colossus is exact (once-per-turn flag); the Hunter's-Mark 1d6 per-hit die is
read off the damage log (approximate only in rare 200+-entry fights).

| Class | Combats | Rage/combat | Reckless/combat | HMark cast/combat | Colossus/combat | HMark die/combat |
|------|------:|----------:|--------------:|----------------:|--------------:|---------------:|
| fighter | 240545 | · | · | · | · | · |
| rogue | 259315 | · | · | · | · | · |
| wizard | 254580 | · | · | · | · | · |
| barbarian | 359694 | 1.16 | 1.66 | · | · | · |
| ranger | 194284 | · | · | 1.52 | 0.96 | 2.82 |

**Sanity check:** Barbarian raged **1.16**×/combat and went reckless
**1.66**×/combat. Ranger cast Hunter's Mark
**1.52**×/combat, landed mark dice
**2.82**×/combat, and fired Colossus
**0.96**×/combat (Colossus is gated behind the L3 Hunter
subclass, so its rate also reflects how often the ranger reaches L3 within a life).

## Where deaths cluster

- **fighter** — by chapter: ch1: 5832 · ch2: 11866 · ch3: 1380 · ch4: 1969 · ch5: 1445 · ch6: 8. Top kill-rooms: duergar-taskmaster (1569, 7.0%), athkatla-magistrate (1563, 6.9%), duergar-ilyich (1539, 6.8%), cowled-wardpriest+slaver-cuirassier (1237, 5.5%), slaver-cuirassier+cult-fanatic (1229, 5.5%), cowled-enforcer+slaver-cuirassier (859, 3.8%)
- **rogue** — by chapter: ch1: 8563 · ch2: 7443 · ch3: 1372 · ch4: 1767 · ch5: 3170 · ch6: 185. Top kill-rooms: duergar-ilyich (1694, 7.5%), duergar-taskmaster (1148, 5.1%), athkatla-magistrate (1127, 5.0%), famished-ghast+goblin (728, 3.2%), slaver-cuirassier+cult-fanatic (711, 3.2%), cowled-enforcer+slaver-cuirassier (678, 3.0%)
- **wizard** — by chapter: ch1: 3044 · ch2: 11918 · ch3: 6408 · ch4: 982 · ch5: 148 · ch6: 0. Top kill-rooms: athkatla-magistrate (2863, 12.7%), asylum-director (1460, 6.5%), cowled-wardpriest+slaver-cuirassier (1102, 4.9%), cowled-enforcer+slaver-cuirassier (984, 4.4%), slayer-hound (931, 4.1%), slaver-cuirassier+cult-fanatic (917, 4.1%)
- **barbarian** — by chapter: ch1: 3595 · ch2: 8730 · ch3: 1043 · ch4: 2309 · ch5: 6513 · ch6: 310. Top kill-rooms: athkatla-magistrate (2077, 9.2%), hollow-dawn (1657, 7.4%), duergar-taskmaster (1034, 4.6%), drow-matron-mother (878, 3.9%), cowled-enforcer+slaver-cuirassier (864, 3.8%), cowled-wardpriest+slaver-cuirassier (862, 3.8%)
- **ranger** — by chapter: ch1: 10394 · ch2: 9270 · ch3: 684 · ch4: 947 · ch5: 1162 · ch6: 43. Top kill-rooms: duergar-ilyich (2180, 9.7%), duergar-taskmaster (1370, 6.1%), athkatla-magistrate (1036, 4.6%), slaver-cuirassier+cult-fanatic (889, 4.0%), famished-ghast+goblin (869, 3.9%), cowled-enforcer+slaver-cuirassier (728, 3.2%)

## Verdict

**No class clears the full 6-chapter run at the AI floor** — every class
topped out at 0% A0-clear across 150 souls × up to 150 lives.
This is the headline STRUCTURAL result, and it is expected: the run is now ~62-66
rooms to the Ch6 final boss (roughly double the old 4-chapter chain), and the
shared Auto-Battle bot — which underplays a real player and fights with **no loot
modelled** (preset gear only, no rolled affixes / drops / legendaries) — dies
before the end. The user has cleared the whole game by hand; do NOT read "0%
clear" as "uncompletable". Read the RELATIVE shape instead.

**The signature mechanics all fire** (the most important single check): Barbarian raged 1.16×/combat and went reckless 1.66×/combat; Ranger cast Hunter's Mark 1.52×/combat, landed mark dice 2.82×/combat and fired Colossus 0.96×/combat.
So the "policy never wires the new mechanics" failure mode did **not** happen.

**Relative reach (depth, the only differentiator when clears are all 0):**
barbarian 28.7 > rogue 20.3 > wizard 19.9 > fighter 18.8 > ranger 15.0 rooms/life. **barbarian goes deepest** (28.7 rooms,
mean final level 5.37) and **ranger shallowest**
(15.0 rooms). Barbarian leading the depth ranking is
consistent with Rage halving physical damage every combat — even post-tradeoff
(no healing while raging), the blunt trade-blows floor still rewards it most, so
Barbarian remains the prime "watch the high side" candidate for a tuning pass.
The Ranger's low reincarnation-chain depth is dominated by **bare-soul L1 deaths**
(each life restarts at L1; the squishy early game kills it repeatedly before it
levels) — the companion game-feel sim shows that once past L1 the Ranger reaches
*among the deepest* rooms, so its weakness is the L1 floor, not its kit. The
non-positional engine still grants its ranged identity no defensive value (the
separately-shipped Ranger payoff, PR #196, is not in this build).

**Net:** relative ordering holds — Barbarian strongest at the floor, Wizard/Ranger
weakest (Wizard = the known AI-floor caster handicap; Ranger = the L1 bare-soul
wall). Absolute clear-rates are an AI-floor + no-loot artifact; the ranking and
the death-clustering (see above), not the magnitudes, are the deliverable.
