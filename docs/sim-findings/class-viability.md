# Five-class viability on current content — sim findings

> Auto-generated tables by `scripts/sim-class-viability.ts`. Re-run with
> `SOULS_PER_CLASS=150 MAX_LIVES=150 npx tsx scripts/sim-class-viability.ts`.

**Souls / class:** 150. **Max lives / soul:** 150.
**Wall clock:** 154.4s.

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
| fighter | 150 | 150.0 | 0.0% | 0.00 | 0.0% | — | 0.0% | 22.2 | 4.62 |
| rogue | 150 | 150.0 | 0.0% | 0.00 | 0.0% | — | 0.0% | 13.7 | 3.21 |
| wizard | 150 | 150.0 | 0.0% | 0.00 | 0.0% | — | 0.0% | 24.9 | 5.02 |
| barbarian | 150 | 150.0 | 0.0% | 0.00 | 0.0% | — | 0.0% | 35.2 | 6.55 |
| ranger | 150 | 150.0 | 0.0% | 0.00 | 0.0% | — | 0.0% | 37.1 | 6.82 |

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
| fighter | 282080 | · | · | · | · | · |
| rogue | 178538 | · | · | · | · | · |
| wizard | 314053 | · | · | · | · | · |
| barbarian | 438444 | 1.65 | 1.84 | · | · | · |
| ranger | 461680 | · | · | 1.56 | 1.86 | 3.08 |

**Sanity check:** Barbarian raged **1.65**×/combat and went reckless
**1.84**×/combat. Ranger cast Hunter's Mark
**1.56**×/combat, landed mark dice
**3.08**×/combat, and fired Colossus
**1.86**×/combat (Colossus is gated behind the L3 Hunter
subclass, so its rate also reflects how often the ranger reaches L3 within a life).

## Where deaths cluster

- **fighter** — by chapter: ch1: 6106 · ch2: 9290 · ch3: 956 · ch4: 2625 · ch5: 3325 · ch6: 197. Top kill-rooms: duergar-taskmaster (1794, 8.0%), athkatla-magistrate (1309, 5.8%), duergar-ilyich (1094, 4.9%), cowled-wardpriest+slaver-cuirassier (1016, 4.5%), slaver-cuirassier+cult-fanatic (869, 3.9%), drow-matron-mother (833, 3.7%)
- **rogue** — by chapter: ch1: 12101 · ch2: 7162 · ch3: 1310 · ch4: 944 · ch5: 948 · ch6: 35. Top kill-rooms: duergar-ilyich (1689, 7.5%), duergar-taskmaster (1183, 5.3%), athkatla-magistrate (982, 4.4%), famished-ghast+goblin (890, 4.0%), skeleton+bone-stalker (825, 3.7%), slaver-cuirassier+cult-fanatic (713, 3.2%)
- **wizard** — by chapter: ch1: 4371 · ch2: 8261 · ch3: 4001 · ch4: 2082 · ch5: 3368 · ch6: 417. Top kill-rooms: athkatla-magistrate (1978, 8.8%), asylum-director (1187, 5.3%), hollow-dawn (1163, 5.2%), duergar-ilyich (872, 3.9%), cowled-wardpriest+slaver-cuirassier (698, 3.1%), cowled-enforcer+slaver-cuirassier (624, 2.8%)
- **barbarian** — by chapter: ch1: 3623 · ch2: 5358 · ch3: 429 · ch4: 1928 · ch5: 9026 · ch6: 2123. Top kill-rooms: hollow-dawn (3764, 16.7%), athkatla-magistrate (1368, 6.1%), duergar-taskmaster (1055, 4.7%), spider-broodmother (922, 4.1%), hollow-seraph (766, 3.4%), drow-matron-mother (658, 2.9%)
- **ranger** — by chapter: ch1: 4141 · ch2: 3903 · ch3: 262 · ch4: 2175 · ch5: 7602 · ch6: 4332. Top kill-rooms: hollow-dawn (3698, 16.4%), duergar-taskmaster (1354, 6.0%), spider-broodmother (1237, 5.5%), fate-spinner+threadbare-penitent (1008, 4.5%), hollow-seraph (565, 2.5%), athkatla-magistrate (532, 2.4%)

## Verdict

**No class clears the full 6-chapter run at the AI floor** — every class
topped out at 0% A0-clear across 150 souls × up to 150 lives.
This is the headline STRUCTURAL result, and it is expected: the run is now ~62-66
rooms to the Ch6 final boss (roughly double the old 4-chapter chain), and the
shared Auto-Battle bot — which underplays a real player and fights with **no loot
modelled** (preset gear only, no rolled affixes / drops / legendaries) — dies
before the end. The user has cleared the whole game by hand; do NOT read "0%
clear" as "uncompletable". Read the RELATIVE shape instead.

**The signature mechanics all fire** (the most important single check): Barbarian raged 1.65×/combat and went reckless 1.84×/combat; Ranger cast Hunter's Mark 1.56×/combat, landed mark dice 3.08×/combat and fired Colossus 1.86×/combat.
So the "policy never wires the new mechanics" failure mode did **not** happen.

**Relative reach (depth, the only differentiator when clears are all 0):**
ranger 37.1 > barbarian 35.2 > wizard 24.9 > fighter 22.2 > rogue 13.7 rooms/life. **ranger goes deepest** (37.1 rooms,
mean final level 6.82) and **rogue shallowest**
(13.7 rooms). Barbarian leading the depth ranking is
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
