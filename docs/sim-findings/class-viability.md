# Five-class viability on current content — sim findings

> Auto-generated tables by `scripts/sim-class-viability.ts`. Re-run with
> `SOULS_PER_CLASS=40 MAX_LIVES=120 npx tsx scripts/sim-class-viability.ts`.

**Souls / class:** 40. **Max lives / soul:** 120.
**Wall clock:** 27.2s.

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
| fighter | 40 | 120.0 | 0.0% | 0.00 | 0.0% | — | 0.0% | 20.2 | 4.25 |
| rogue | 40 | 120.0 | 0.0% | 0.00 | 0.0% | — | 0.0% | 20.3 | 4.16 |
| wizard | 40 | 120.0 | 0.0% | 0.00 | 0.0% | — | 0.0% | 20.5 | 4.31 |
| barbarian | 40 | 120.0 | 0.0% | 0.00 | 0.0% | — | 0.0% | 33.4 | 5.89 |
| ranger | 40 | 120.0 | 0.0% | 0.00 | 5.0% | 113.5 | 0.0% | 34.8 | 5.97 |

- **Topped A6** — share of souls that cleared the full chain at Ascension 6 within 120 lives.
- **Mean asc cleared** — average highest ascension a soul ever cleared (0 if it never cleared A0).
- **First A0-clear life** — average life index of a soul's first base-chain clear (only souls that cleared A0).
- **Per-life clear%** — fraction of ALL lives (across all ascensions) that cleared the chain.
- **Avg depth** — mean rooms reached per life. One route is walked through the
  branching 6-chapter map; a full routed clear is ~62-66 rooms (the whole map is
  ~103-111 nodes), ending at the Ch6 final boss (the-unmade).

## Ascension reach — how high each class's souls topped out

Soul counts bucketed by the highest ascension level they ever cleared
("never" = never cleared even A0 within 120 lives).

| Class | never | A0 | A1 | A2 | A3 | A4 | A5 | A6 |
|------|------:|------:|------:|------:|------:|------:|------:|------:|
| fighter | 40 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| rogue | 40 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| wizard | 40 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| barbarian | 40 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| ranger | 38 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |

## Proc instrumentation — do the new mechanics actually fire?

Per-combat rates across every combat the class fought. `·` = not applicable to
that class. Activations (Rage, Reckless, Hunter's-Mark cast) are exact;
Colossus is exact (once-per-turn flag); the Hunter's-Mark 1d6 per-hit die is
read off the damage log (approximate only in rare 200+-entry fights).

| Class | Combats | Rage/combat | Reckless/combat | HMark cast/combat | Colossus/combat | HMark die/combat |
|------|------:|----------:|--------------:|----------------:|--------------:|---------------:|
| fighter | 54949 | · | · | · | · | · |
| rogue | 55209 | · | · | · | · | · |
| wizard | 55670 | · | · | · | · | · |
| barbarian | 88722 | 1.55 | 1.61 | · | · | · |
| ranger | 92407 | · | · | 1.51 | 1.75 | 2.93 |

**Sanity check:** Barbarian raged **1.55**×/combat and went reckless
**1.61**×/combat. Ranger cast Hunter's Mark
**1.51**×/combat, landed mark dice
**2.93**×/combat, and fired Colossus
**1.75**×/combat (Colossus is gated behind the L3 Hunter
subclass, so its rate also reflects how often the ranger reaches L3 within a life).

## Where deaths cluster

- **fighter** — by chapter: ch1: 1314 · ch2: 2247 · ch3: 227 · ch4: 497 · ch5: 511 · ch6: 4. Top kill-rooms: duergar-taskmaster (381, 7.9%), athkatla-magistrate (325, 6.8%), duergar-ilyich (272, 5.7%), cowled-wardpriest+slaver-cuirassier (252, 5.3%), slaver-cuirassier+cult-fanatic (200, 4.2%), cowled-enforcer+slaver-cuirassier (166, 3.5%)
- **rogue** — by chapter: ch1: 1848 · ch2: 1476 · ch3: 409 · ch4: 372 · ch5: 665 · ch6: 30. Top kill-rooms: duergar-ilyich (313, 6.5%), duergar-taskmaster (271, 5.6%), athkatla-magistrate (221, 4.6%), famished-ghast+goblin (153, 3.2%), slaver-cuirassier+cult-fanatic (144, 3.0%), cowled-enforcer+slaver-cuirassier (130, 2.7%)
- **wizard** — by chapter: ch1: 1136 · ch2: 2223 · ch3: 821 · ch4: 316 · ch5: 293 · ch6: 11. Top kill-rooms: athkatla-magistrate (754, 15.7%), duergar-ilyich (324, 6.8%), asylum-director (263, 5.5%), duergar-taskmaster (181, 3.8%), cowled-wardpriest+slaver-cuirassier (165, 3.4%), cowled-enforcer+slaver-cuirassier (150, 3.1%)
- **barbarian** — by chapter: ch1: 775 · ch2: 1266 · ch3: 148 · ch4: 462 · ch5: 1970 · ch6: 179. Top kill-rooms: hollow-dawn (657, 13.7%), athkatla-magistrate (292, 6.1%), duergar-taskmaster (213, 4.4%), spider-broodmother (180, 3.8%), drow-matron-mother (175, 3.6%), duergar-ilyich (165, 3.4%)
- **ranger** — by chapter: ch1: 831 · ch2: 1074 · ch3: 66 · ch4: 522 · ch5: 1815 · ch6: 490. Top kill-rooms: hollow-dawn (728, 15.2%), duergar-taskmaster (326, 6.8%), spider-broodmother (253, 5.3%), athkatla-magistrate (158, 3.3%), hollow-seraph (140, 2.9%), fate-spinner+threadbare-penitent (121, 2.5%)

## Verdict

Signature mechanics fire under the shared policy (Barbarian raged 1.55×/combat and went reckless 1.61×/combat; Ranger cast Hunter's Mark 1.51×/combat, landed mark dice 2.93×/combat and fired Colossus 1.75×/combat). On
ascension reach, **fighter leads** (mean asc cleared 0.00,
topped A6 0.0%, first A0 clear never); the depth ranking is
ranger 34.8 > barbarian 33.4 > wizard 20.5 > rogue 20.3 > fighter 20.2 rooms/life. Absolute clear-rates remain an AI-floor + no-loot
artifact (preset gear only, no drops modelled) — the ranking, not the magnitudes,
is the deliverable.
