# 7-class viability on current content — sim findings

> Auto-generated tables by `scripts/sim-class-viability.ts`. Re-run with
> `SOULS_PER_CLASS=20 MAX_LIVES=40 npx tsx scripts/sim-class-viability.ts`.

**Souls / class:** 20. **Max lives / soul:** 40.
**Wall clock:** 3.8s.

## What this measures

A meta-journey: each soul reincarnates life after life, climbing the Spire
ascension ladder (A0→A6) over the full chained Godwake delve (the enriched
bestiary + the slightly longer chapters). Clearing the chain at ascension N
unlocks N+1; renown carries across lives and is spent greedily on a class-tuned
Grove priority list between deaths. Every class runs the SAME harness, the SAME
seed schedule, and the SAME shared action policy that drives the in-game
Auto-Battle (so Barbarian Rage and Ranger Hunter's Mark fire automatically iff
the policy wires them — which the proc table below verifies).

This run models the **full loot/camp loop** (no longer loot-blind, per
`feedback-sims-model-full-player-experience`): combat/elite/boss clears roll
gold + a low-chance rolled affix item (greedily equipped if it improves the
loadout) + a rare legendary banked to the persistent collection; shop rooms
spend gold on rolled gear, the reliquary offer, and potions; banked legendaries
accumulate across lives and are attuned (with set bonuses) before each descent;
and camps run the real 3-choice rest fork (Rest / Attune a boon / Tempt the
Dark) heuristically instead of a free auto-heal.

> ⚠️ **Read this RELATIVE, not absolute.** The bot underplays a real player, so
> absolute clear-rates and life-counts are an AI-floor artifact, not game truth
> (same caveat as the `character-order` and `rogue-meta-journey-sim2` memory
> runs). A
> low absolute clear-rate does NOT mean a class is broken. The robust signal is
> each new class (Barbarian, Ranger) lined up against the trusted three
> (Fighter, Rogue, Wizard) on identical content. No balance numbers were tuned
> in this lane — this reports, it does not adjust.

## Headline — all 7 classes

| Class | Souls | Lives/soul | Topped A6 | Mean asc cleared | Ever cleared A0 | First A0-clear life | Per-life clear% | Avg depth (rooms) | Avg final lvl |
|------|------:|----------:|--------:|----------------:|---------------:|-------------------:|---------------:|-----------------:|-------------:|
| fighter | 20 | 40.0 | 0.0% | 0.00 | 10.0% | 35.5 | 0.3% | 7.6 | 2.04 |
| rogue | 20 | 40.0 | 0.0% | 0.00 | 0.0% | — | 0.0% | 5.4 | 1.67 |
| wizard | 20 | 40.0 | 0.0% | 0.00 | 0.0% | — | 0.0% | 7.0 | 2.00 |
| barbarian | 20 | 40.0 | 0.0% | 0.00 | 0.0% | — | 0.0% | 9.1 | 2.50 |
| ranger | 20 | 40.0 | 0.0% | 0.00 | 0.0% | — | 0.0% | 8.7 | 2.35 |
| druid | 20 | 40.0 | 0.0% | 0.00 | 0.0% | — | 0.0% | 5.6 | 1.64 |
| monk | 20 | 40.0 | 0.0% | 0.00 | 5.0% | 34.0 | 0.1% | 7.1 | 1.96 |

- **Topped A6** — share of souls that cleared the full chain at Ascension 6 within 40 lives.
- **Mean asc cleared** — average highest ascension a soul ever cleared (0 if it never cleared A0).
- **First A0-clear life** — average life index of a soul's first base-chain clear (only souls that cleared A0).
- **Per-life clear%** — fraction of ALL lives (across all ascensions) that cleared the chain.
- **Avg depth** — mean rooms reached per life. One route is walked through the
  branching 6-chapter map; a full routed clear is ~62-66 rooms (the whole map is
  ~103-111 nodes), ending at the Ch6 final boss (the-unmade).

## Ascension reach — how high each class's souls topped out

Soul counts bucketed by the highest ascension level they ever cleared
("never" = never cleared even A0 within 40 lives).

| Class | never | A0 | A1 | A2 | A3 | A4 | A5 | A6 |
|------|------:|------:|------:|------:|------:|------:|------:|------:|
| fighter | 18 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| rogue | 20 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| wizard | 20 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| barbarian | 20 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| ranger | 20 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| druid | 20 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| monk | 19 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |

## Proc instrumentation — do the new mechanics actually fire?

Per-combat rates across every combat the class fought. `·` = not applicable to
that class. Activations (Rage, Reckless, Hunter's-Mark cast) are exact;
Colossus is exact (once-per-turn flag); the Hunter's-Mark 1d6 per-hit die is
read off the damage log (approximate only in rare 200+-entry fights).

| Class | Combats | Rage/combat | Reckless/combat | HMark cast/combat | Colossus/combat | HMark die/combat | Sneak/combat | Sneak/turn | Hide/combat | WildShape/combat | Spell cast/combat | Flurry/combat | StunStrike/combat | PatientDef/combat | PowerAtk/combat |
|------|------:|----------:|--------------:|----------------:|--------------:|---------------:|------------:|----------:|-----------:|---------------:|----------------:|------------:|----------------:|----------------:|--------------:|
| fighter | 3314 | · | · | · | · | · | · | · | · | · | · | · | · | · | 0.78 |
| rogue | 2514 | · | · | · | · | · | 2.31 | 0.40 | 1.49 | · | · | · | · | · | · |
| wizard | 3111 | · | · | · | · | · | · | · | · | · | 3.89 | · | · | · | · |
| barbarian | 3967 | 2.13 | 1.12 | · | · | · | · | · | · | · | · | · | · | · | · |
| ranger | 3809 | · | · | 1.64 | 1.29 | 3.41 | · | · | · | · | · | · | · | · | · |
| druid | 2558 | · | · | · | · | · | · | · | · | 0.49 | 3.86 | · | · | · | · |
| monk | 3132 | · | · | · | · | · | · | · | · | · | · | 1.35 | 0.38 | 0.33 | · |

**Sanity check:** Barbarian raged **2.13**×/combat and went reckless
**1.12**×/combat. Ranger cast Hunter's Mark
**1.64**×/combat, landed mark dice
**3.41**×/combat, and fired Colossus
**1.29**×/combat (Colossus is gated behind the L3 Hunter
subclass, so its rate also reflects how often the ranger reaches L3 within a life).

## Where deaths cluster

- **fighter** — by chapter: ch1: 523 · ch2: 260 · ch3: 4 · ch4: 2 · ch5: 0 · ch6: 0. Top kill-rooms: duergar-ilyich (52, 6.5%), skeleton+bone-stalker (41, 5.1%), duergar-taskmaster (36, 4.5%), skeleton+stirge (34, 4.3%), famished-ghast (31, 3.9%), cell-wight+famished-ghast (29, 3.6%)
- **rogue** — by chapter: ch1: 624 · ch2: 167 · ch3: 5 · ch4: 0 · ch5: 1 · ch6: 0. Top kill-rooms: duergar-ilyich (52, 6.5%), skeleton+bone-stalker (41, 5.1%), famished-ghast (39, 4.9%), cell-wight+famished-ghast (36, 4.5%), skeleton+stirge (35, 4.4%), goblin+kobold (33, 4.1%)
- **wizard** — by chapter: ch1: 495 · ch2: 290 · ch3: 10 · ch4: 3 · ch5: 1 · ch6: 0. Top kill-rooms: duergar-ilyich (57, 7.1%), skeleton+bone-stalker (47, 5.9%), famished-ghast (39, 4.9%), skeleton+stirge (36, 4.5%), stirge (32, 4.0%), shadow-hound+slaver-cuirassier (32, 4.0%)
- **barbarian** — by chapter: ch1: 382 · ch2: 382 · ch3: 16 · ch4: 4 · ch5: 5 · ch6: 3. Top kill-rooms: slaver-cuirassier+cult-fanatic (41, 5.1%), duergar-ilyich (33, 4.1%), shadow+cult-fanatic (33, 4.1%), bandit-captain+cult-fanatic (31, 3.9%), duergar-taskmaster (31, 3.9%), shadow-hound+slaver-cuirassier (31, 3.9%)
- **ranger** — by chapter: ch1: 463 · ch2: 303 · ch3: 8 · ch4: 4 · ch5: 1 · ch6: 1. Top kill-rooms: duergar-taskmaster (46, 5.8%), duergar-ilyich (41, 5.1%), slaver-cuirassier+cult-fanatic (39, 4.9%), skeleton+bone-stalker (38, 4.8%), hobgoblin+cult-fanatic (33, 4.1%), skeleton+stirge (26, 3.3%)
- **druid** — by chapter: ch1: 590 · ch2: 204 · ch3: 6 · ch4: 0 · ch5: 0 · ch6: 0. Top kill-rooms: skeleton+bone-stalker (74, 9.3%), famished-ghast (41, 5.1%), kobold (41, 5.1%), skeleton+stirge (38, 4.8%), duergar-taskmaster (34, 4.3%), duergar-ilyich (33, 4.1%)
- **monk** — by chapter: ch1: 559 · ch2: 218 · ch3: 9 · ch4: 4 · ch5: 1 · ch6: 1. Top kill-rooms: duergar-ilyich (58, 7.3%), famished-ghast (37, 4.6%), skeleton+bone-stalker (35, 4.4%), goblin-warden+hobgoblin (32, 4.0%), imp+hobgoblin (31, 3.9%), duergar-taskmaster (31, 3.9%)

## Verdict

Signature mechanics fire under the shared policy (Barbarian raged 2.13×/combat and went reckless 1.12×/combat; Ranger cast Hunter's Mark 1.64×/combat, landed mark dice 3.41×/combat and fired Colossus 1.29×/combat). On
ascension reach, **fighter leads** (mean asc cleared 0.00,
topped A6 0.0%, first A0 clear ~life 36); the depth ranking is
barbarian 9.1 > ranger 8.7 > fighter 7.6 > monk 7.1 > wizard 7.0 > druid 5.6 > rogue 5.4 rooms/life. Absolute clear-rates remain an AI-floor artifact (the
bot underplays even with the full loot/camp loop modelled) — the ranking, not the
magnitudes, is the deliverable.
