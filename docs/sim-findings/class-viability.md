# 7-class viability on current content — sim findings

> Auto-generated tables by `scripts/sim-class-viability.ts`. Re-run with
> `SOULS_PER_CLASS=20 MAX_LIVES=40 npx tsx scripts/sim-class-viability.ts`.

**Souls / class:** 20. **Max lives / soul:** 40.
**Wall clock:** 10.8s.

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
| fighter | 20 | 40.0 | 0.0% | 0.35 | 30.0% | 36.7 | 1.6% | 10.7 | 2.55 |
| rogue | 20 | 40.0 | 0.0% | 0.00 | 0.0% | — | 0.0% | 4.7 | 1.47 |
| wizard | 20 | 40.0 | 0.0% | 0.00 | 0.0% | — | 0.0% | 7.6 | 2.13 |
| barbarian | 20 | 40.0 | 0.0% | 0.00 | 40.0% | 35.3 | 1.0% | 29.1 | 5.83 |
| ranger | 20 | 40.0 | 0.0% | 0.00 | 5.0% | 31.0 | 0.1% | 15.1 | 3.42 |
| druid | 20 | 40.0 | 0.0% | 0.00 | 0.0% | — | 0.0% | 5.2 | 1.56 |
| monk | 20 | 39.8 | 15.0% | 2.10 | 65.0% | 31.5 | 6.9% | 25.9 | 5.09 |

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
| fighter | 14 | 3 | 1 | 1 | 0 | 1 | 0 | 0 |
| rogue | 20 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| wizard | 20 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| barbarian | 12 | 8 | 0 | 0 | 0 | 0 | 0 | 0 |
| ranger | 19 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| druid | 20 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| monk | 7 | 2 | 1 | 3 | 1 | 1 | 2 | 3 |

## Proc instrumentation — do the new mechanics actually fire?

Per-combat rates across every combat the class fought. `·` = not applicable to
that class. Activations (Rage, Reckless, Hunter's-Mark cast) are exact;
Colossus is exact (once-per-turn flag); the Hunter's-Mark 1d6 per-hit die is
read off the damage log (approximate only in rare 200+-entry fights).

| Class | Combats | Rage/combat | Reckless/combat | HMark cast/combat | Colossus/combat | HMark die/combat | Sneak/combat | Sneak/turn | Hide/combat | WildShape/combat | Spell cast/combat | Flurry/combat | StunStrike/combat | PatientDef/combat | Martial OFF/combat | Martial DEF/combat | Martial DIS/combat | Martial total/combat |
|------|------:|----------:|--------------:|----------------:|--------------:|---------------:|------------:|----------:|-----------:|---------------:|----------------:|------------:|----------------:|----------------:|----------------:|----------------:|----------------:|-----------------:|
| fighter | 4515 | · | · | · | · | · | · | · | · | · | · | · | · | · | 0.21 | 0.69 | 0.90 | 1.79 |
| rogue | 2213 | · | · | · | · | · | 2.20 | 0.38 | 1.41 | · | · | · | · | · | · | · | · | · |
| wizard | 3329 | · | · | · | · | · | · | · | · | · | 4.11 | · | · | · | · | · | · | · |
| barbarian | 11593 | 2.12 | 3.18 | · | · | · | · | · | · | · | · | · | · | · | 0.14 | 0.81 | 1.33 | 2.28 |
| ranger | 6182 | · | · | 1.72 | 2.97 | 4.94 | · | · | · | · | · | · | · | · | 0.16 | 0.69 | 1.00 | 1.86 |
| druid | 2456 | · | · | · | · | · | · | · | · | 0.44 | 3.88 | · | · | · | · | · | · | · |
| monk | 10155 | · | · | · | · | · | · | · | · | · | · | 2.49 | 2.60 | 0.19 | · | · | · | · |

**Sanity check:** Barbarian raged **2.12**×/combat and went reckless
**3.18**×/combat. Ranger cast Hunter's Mark
**1.72**×/combat, landed mark dice
**4.94**×/combat, and fired Colossus
**2.97**×/combat (Colossus is gated behind the L3 Hunter
subclass, so its rate also reflects how often the ranger reaches L3 within a life).

**Martial pool (#338) firing check** — the headline guard for THIS lane. The new
per-fight pool (Fighter Resolve / Barbarian Fury / Ranger Focus; 3 pts, ≤1 spend
per turn) spends per combat: **fighter** 1.79/combat (OFF 0.21 · DEF 0.69 · DIS 0.90); **barbarian** 2.28/combat (OFF 0.14 · DEF 0.81 · DIS 1.33); **ranger** 1.86/combat (OFF 0.16 · DEF 0.69 · DIS 1.00). If any of these were ~0 the
new kit would be inert in the sim and the band read meaningless; they are not.

## Where deaths cluster

- **fighter** — by chapter: ch1: 510 · ch2: 244 · ch3: 7 · ch4: 2 · ch5: 0 · ch6: 3. Top kill-rooms: famished-ghast (37, 4.7%), skeleton+stirge (34, 4.3%), skeleton+bone-stalker (33, 4.2%), duergar-taskmaster (33, 4.2%), stirge (32, 4.1%), duergar-ilyich (29, 3.7%)
- **rogue** — by chapter: ch1: 660 · ch2: 135 · ch3: 3 · ch4: 0 · ch5: 1 · ch6: 1. Top kill-rooms: skeleton+bone-stalker (50, 6.3%), duergar-ilyich (49, 6.1%), duergar-taskmaster (41, 5.1%), stirge (38, 4.8%), skeleton+stirge (38, 4.8%), goblin+kobold (34, 4.3%)
- **wizard** — by chapter: ch1: 439 · ch2: 335 · ch3: 21 · ch4: 1 · ch5: 3 · ch6: 1. Top kill-rooms: skeleton+bone-stalker (40, 5.0%), duergar-ilyich (40, 5.0%), famished-ghast (36, 4.5%), duergar-taskmaster (34, 4.3%), slaver-cuirassier+cult-fanatic (33, 4.1%), skeleton+stirge (31, 3.9%)
- **barbarian** — by chapter: ch1: 251 · ch2: 299 · ch3: 20 · ch4: 10 · ch5: 10 · ch6: 38. Top kill-rooms: slaver-cuirassier+cult-fanatic (31, 3.9%), cowled-enforcer+slaver-cuirassier (26, 3.3%), duergar-taskmaster (23, 2.9%), duergar-ilyich (23, 2.9%), shadow+cult-fanatic (22, 2.8%), cult-fanatic (21, 2.7%)
- **ranger** — by chapter: ch1: 381 · ch2: 317 · ch3: 12 · ch4: 6 · ch5: 3 · ch6: 9. Top kill-rooms: duergar-taskmaster (50, 6.3%), duergar-ilyich (41, 5.1%), skeleton+bone-stalker (36, 4.5%), slaver-cuirassier+cult-fanatic (36, 4.5%), shadow-hound+slaver-cuirassier (31, 3.9%), hobgoblin+cult-fanatic (27, 3.4%)
- **druid** — by chapter: ch1: 626 · ch2: 166 · ch3: 7 · ch4: 0 · ch5: 1 · ch6: 0. Top kill-rooms: skeleton+bone-stalker (64, 8.0%), skeleton+stirge (53, 6.6%), famished-ghast (48, 6.0%), stirge (44, 5.5%), duergar-taskmaster (37, 4.6%), goblin-warden+hobgoblin (35, 4.4%)
- **monk** — by chapter: ch1: 348 · ch2: 284 · ch3: 13 · ch4: 5 · ch5: 5 · ch6: 6. Top kill-rooms: duergar-ilyich (34, 4.6%), duergar-taskmaster (32, 4.3%), goblin-warden+hobgoblin (31, 4.2%), melissan (31, 4.2%), bandit-captain+cult-fanatic (25, 3.4%), shadow-hound+slaver-cuirassier (25, 3.4%)

## Verdict

Signature mechanics fire under the shared policy (Barbarian raged 2.12×/combat and went reckless 3.18×/combat; Ranger cast Hunter's Mark 1.72×/combat, landed mark dice 4.94×/combat and fired Colossus 2.97×/combat). On
ascension reach, **monk leads** (mean asc cleared 2.10,
topped A6 15.0%, first A0 clear ~life 31); the depth ranking is
barbarian 29.1 > monk 25.9 > ranger 15.1 > fighter 10.7 > wizard 7.6 > druid 5.2 > rogue 4.7 rooms/life. Absolute clear-rates remain an AI-floor artifact (the
bot underplays even with the full loot/camp loop modelled) — the ranking, not the
magnitudes, is the deliverable.
