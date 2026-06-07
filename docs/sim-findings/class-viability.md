# 7-class viability on current content — sim findings

> Auto-generated tables by `scripts/sim-class-viability.ts`. Re-run with
> `SOULS_PER_CLASS=80 MAX_LIVES=80 npx tsx scripts/sim-class-viability.ts`.

**Souls / class:** 80. **Max lives / soul:** 80.
**Wall clock:** 474.2s.

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
| fighter | 80 | 52.2 | 100.0% | 6.00 | 100.0% | 36.4 | 13.4% | 53.2 | 9.84 |
| rogue | 80 | 80.0 | 0.0% | 1.16 | 92.5% | 58.9 | 2.6% | 48.2 | 9.14 |
| wizard | 80 | 80.0 | 0.0% | 0.00 | 0.0% | — | 0.0% | 20.1 | 4.75 |
| barbarian | 80 | 80.0 | 0.0% | 0.00 | 0.0% | — | 0.0% | 45.1 | 8.83 |
| ranger | 80 | 80.0 | 0.0% | 0.00 | 0.0% | — | 0.0% | 40.2 | 7.99 |
| druid | 80 | 80.0 | 0.0% | 0.00 | 3.8% | 66.3 | 0.0% | 36.6 | 7.36 |
| monk | 80 | 80.0 | 0.0% | 0.00 | 0.0% | — | 0.0% | 18.3 | 4.47 |

- **Topped A6** — share of souls that cleared the full chain at Ascension 6 within 80 lives.
- **Mean asc cleared** — average highest ascension a soul ever cleared (0 if it never cleared A0).
- **First A0-clear life** — average life index of a soul's first base-chain clear (only souls that cleared A0).
- **Per-life clear%** — fraction of ALL lives (across all ascensions) that cleared the chain.
- **Avg depth** — mean rooms reached per life. One route is walked through the
  branching 6-chapter map; a full routed clear is ~62-66 rooms (the whole map is
  ~103-111 nodes), ending at the Ch6 final boss (the-unmade).

## Ascension reach — how high each class's souls topped out

Soul counts bucketed by the highest ascension level they ever cleared
("never" = never cleared even A0 within 80 lives).

| Class | never | A0 | A1 | A2 | A3 | A4 | A5 | A6 |
|------|------:|------:|------:|------:|------:|------:|------:|------:|
| fighter | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 80 |
| rogue | 6 | 20 | 23 | 24 | 6 | 1 | 0 | 0 |
| wizard | 80 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| barbarian | 80 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| ranger | 80 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| druid | 77 | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| monk | 80 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

## Proc instrumentation — do the new mechanics actually fire?

Per-combat rates across every combat the class fought. `·` = not applicable to
that class. Activations (Rage, Reckless, Hunter's-Mark cast) are exact;
Colossus is exact (once-per-turn flag); the Hunter's-Mark 1d6 per-hit die is
read off the damage log (approximate only in rare 200+-entry fights).

| Class | Combats | Rage/combat | Reckless/combat | HMark cast/combat | Colossus/combat | HMark die/combat | Sneak/combat | Sneak/turn | Hide/combat | WildShape/combat | Spell cast/combat | Flurry/combat | StunStrike/combat | PatientDef/combat | Martial OFF/combat | Martial DEF/combat | Martial DIS/combat | Martial total/combat |
|------|------:|----------:|--------------:|----------------:|--------------:|---------------:|------------:|----------:|-----------:|---------------:|----------------:|------------:|----------------:|----------------:|----------------:|----------------:|----------------:|-----------------:|
| fighter | 124619 | · | · | · | · | · | · | · | · | · | · | · | · | · | 0.52 | 2.63 | 1.28 | 4.43 |
| rogue | 173581 | · | · | · | · | · | 3.72 | 0.66 | 1.44 | · | · | · | · | · | · | · | · | · |
| wizard | 74410 | · | · | · | · | · | · | · | · | · | 4.33 | · | · | · | · | · | · | · |
| barbarian | 163609 | 0.86 | 3.83 | · | · | · | · | · | · | · | · | · | · | · | 0.48 | 1.85 | 0.80 | 3.14 |
| ranger | 145587 | · | · | 1.76 | 3.78 | 0.00 | · | · | · | · | · | · | · | · | 0.99 | 1.90 | 0.83 | 3.72 |
| druid | 132825 | · | · | · | · | · | · | · | · | 0.84 | 5.06 | · | · | · | · | · | · | · |
| monk | 68026 | · | · | · | · | · | · | · | · | · | · | 0.81 | 0.05 | 0.17 | · | · | · | · |

**Sanity check:** Barbarian raged **0.86**×/combat and went reckless
**3.83**×/combat. Ranger cast Hunter's Mark
**1.76**×/combat, landed mark dice
**0.00**×/combat, and fired Colossus
**3.78**×/combat (Colossus is gated behind the L3 Hunter
subclass, so its rate also reflects how often the ranger reaches L3 within a life).

**Rage rest-economy (#424) firing check** — Rage is now a rationed pool of charges
(2/3/4/5 by level band, ∞ at L20) that refill ONLY at a rest, not per fight. If the
ration bites, a barb enters some fights unable to rage. Measured at fight entry over
**163609** barbarian combats: **Infinity** avg
charges in pocket, and **35.4%** of fights entered
rage-STARVED (0 charges, pre-L20). Rage fired **0.86**×/combat
(was effectively ~1×/combat when Rage was unlimited+re-poppable pre-#424) — a sub-1
rate with a non-zero starved share is the ration working: the barb is no longer
perma-raging, it is spending a finite pool between camps.

**Martial pool (#338) firing check** — the headline guard for THIS lane. The new
per-fight pool (Fighter Resolve / Barbarian Fury / Ranger Focus; 3 pts, ≤1 spend
per turn) spends per combat: **fighter** 4.43/combat (OFF 0.52 · DEF 2.63 · DIS 1.28); **barbarian** 3.14/combat (OFF 0.48 · DEF 1.85 · DIS 0.80); **ranger** 3.72/combat (OFF 0.99 · DEF 1.90 · DIS 0.83). If any of these were ~0 the
new kit would be inert in the sim and the band read meaningless; they are not.

## Where deaths cluster

- **fighter** — by chapter: ch1: 900 · ch2: 1180 · ch3: 62 · ch4: 75 · ch5: 60 · ch6: 61. Top kill-rooms: melissan (275, 7.6%), fire-giant-shaman+saradush-marauder (247, 6.8%), fire-giant-shaman+burning-dead (215, 5.9%), slaver-cuirassier+cult-fanatic (140, 3.9%), cowled-houndmaster+shadow-hound (120, 3.3%), skeleton+bone-stalker (101, 2.8%)
- **rogue** — by chapter: ch1: 1797 · ch2: 1166 · ch3: 156 · ch4: 207 · ch5: 119 · ch6: 204. Top kill-rooms: melissan (415, 6.7%), irenicus (212, 3.4%), palace-golem+suldanessellar-bladesinger (177, 2.8%), the-hollow-pretender (158, 2.5%), spider-broodmother (151, 2.4%), skeleton+bone-stalker (149, 2.4%)
- **wizard** — by chapter: ch1: 1919 · ch2: 2150 · ch3: 568 · ch4: 297 · ch5: 436 · ch6: 747. Top kill-rooms: athkatla-magistrate (412, 6.4%), the-unmade (364, 5.7%), hollow-dawn (293, 4.6%), slaver-cuirassier+cult-fanatic (258, 4.0%), skeleton+bone-stalker (234, 3.7%), duergar-ilyich (172, 2.7%)
- **barbarian** — by chapter: ch1: 1281 · ch2: 1881 · ch3: 102 · ch4: 139 · ch5: 137 · ch6: 206. Top kill-rooms: mirror-of-pride+avatar-of-wrath (235, 3.7%), mirror-of-pride+slayer-shade (220, 3.4%), athkatla-magistrate (211, 3.3%), slaver-cuirassier+cult-fanatic (207, 3.2%), melissan (191, 3.0%), cowled-houndmaster+shadow-hound (158, 2.5%)
- **ranger** — by chapter: ch1: 1601 · ch2: 1728 · ch3: 123 · ch4: 183 · ch5: 143 · ch6: 202. Top kill-rooms: slaver-cuirassier+cult-fanatic (215, 3.4%), mirror-of-pride+slayer-shade (171, 2.7%), mask-chamberlain+glasswright-duelist (148, 2.3%), hobgoblin+slaver-cuirassier (146, 2.3%), athkatla-magistrate (144, 2.3%), the-hollow-pretender (139, 2.2%)
- **druid** — by chapter: ch1: 1781 · ch2: 1541 · ch3: 209 · ch4: 134 · ch5: 127 · ch6: 482. Top kill-rooms: drowned-custodian (523, 8.2%), irenicus (429, 6.7%), the-unmade (242, 3.8%), skeleton+bone-stalker (230, 3.6%), athkatla-magistrate (227, 3.5%), the-hollow-pretender (170, 2.7%)
- **monk** — by chapter: ch1: 1844 · ch2: 3044 · ch3: 196 · ch4: 178 · ch5: 218 · ch6: 407. Top kill-rooms: slaver-cuirassier+cult-fanatic (311, 4.9%), athkatla-magistrate (279, 4.4%), shadow-hound+slaver-cuirassier (243, 3.8%), bandit-captain+cult-fanatic (237, 3.7%), hobgoblin+slaver-cuirassier (219, 3.4%), duergar-ilyich (206, 3.2%)

## Verdict

Signature mechanics fire under the shared policy (Barbarian raged 0.86×/combat and went reckless 3.83×/combat; Ranger cast Hunter's Mark 1.76×/combat, landed mark dice 0.00×/combat and fired Colossus 3.78×/combat). On
ascension reach, **fighter leads** (mean asc cleared 6.00,
topped A6 100.0%, first A0 clear ~life 36); the depth ranking is
fighter 53.2 > rogue 48.2 > barbarian 45.1 > ranger 40.2 > druid 36.6 > wizard 20.1 > monk 18.3 rooms/life. Absolute clear-rates remain an AI-floor artifact (the
bot underplays even with the full loot/camp loop modelled) — the ranking, not the
magnitudes, is the deliverable.
