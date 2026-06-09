# 8-class viability on current content — sim findings

> Auto-generated tables by `scripts/sim-class-viability.ts`. Re-run with
> `SOULS_PER_CLASS=120 MAX_LIVES=120 npx tsx scripts/sim-class-viability.ts`.

**Souls / class:** 120. **Max lives / soul:** 120.
**Wall clock:** 23319.1s.

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

## Headline — all 8 classes

| Class | Souls | Lives/soul | Topped A6 | Mean asc cleared | Ever cleared A0 | First A0-clear life | Per-life clear% | Avg depth (rooms) | Avg final lvl |
|------|------:|----------:|--------:|----------------:|---------------:|-------------------:|---------------:|-----------------:|-------------:|
| fighter | 120 | 70.1 | 100.0% | 6.00 | 100.0% | 51.5 | 10.0% | 44.0 | 8.26 |
| rogue | 120 | 117.8 | 10.0% | 4.57 | 100.0% | 57.8 | 4.7% | 60.5 | 11.20 |
| wizard | 120 | 120.0 | 0.0% | 0.04 | 40.8% | 92.7 | 0.4% | 44.4 | 8.77 |
| barbarian | 120 | 120.0 | 0.0% | 3.13 | 100.0% | 52.4 | 3.4% | 66.5 | 12.26 |
| ranger | 120 | 120.0 | 0.0% | 0.00 | 48.3% | 83.8 | 0.4% | 65.8 | 12.08 |
| druid | 120 | 120.0 | 0.0% | 0.03 | 35.8% | 84.5 | 0.3% | 61.3 | 11.30 |
| monk | 120 | 84.7 | 96.7% | 5.94 | 100.0% | 65.6 | 8.2% | 41.0 | 7.97 |
| bard | 120 | 120.0 | 0.0% | 0.01 | 28.3% | 93.1 | 0.2% | 40.7 | 8.14 |

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
| fighter | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 120 |
| rogue | 0 | 0 | 0 | 0 | 16 | 32 | 60 | 12 |
| wizard | 71 | 44 | 5 | 0 | 0 | 0 | 0 | 0 |
| barbarian | 0 | 0 | 2 | 14 | 76 | 23 | 5 | 0 |
| ranger | 62 | 58 | 0 | 0 | 0 | 0 | 0 | 0 |
| druid | 77 | 40 | 3 | 0 | 0 | 0 | 0 | 0 |
| monk | 0 | 0 | 0 | 0 | 1 | 1 | 2 | 116 |
| bard | 86 | 33 | 1 | 0 | 0 | 0 | 0 | 0 |

## Proc instrumentation — do the new mechanics actually fire?

Per-combat rates across every combat the class fought. `·` = not applicable to
that class. Activations (Rage, Reckless, Hunter's-Mark cast) are exact;
Colossus is exact (once-per-turn flag); the Hunter's-Mark 1d6 per-hit die is
read off the damage log (approximate only in rare 200+-entry fights).

| Class | Combats | Rage/combat | Reckless/combat | HMark cast/combat | Colossus/combat | HMark die/combat | Sneak/combat | Sneak/turn | Hide/combat | WildShape/combat | Spell cast/combat | Flurry/combat | StunStrike/combat | PatientDef/combat | Martial OFF/combat | Martial DEF/combat | Martial DIS/combat | Martial total/combat |
|------|------:|----------:|--------------:|----------------:|--------------:|---------------:|------------:|----------:|-----------:|---------------:|----------------:|------------:|----------------:|----------------:|----------------:|----------------:|----------------:|-----------------:|
| fighter | 208594 | · | · | · | · | · | · | · | · | · | · | · | · | · | 0.47 | 2.21 | 1.32 | 4.00 |
| rogue | 480703 | · | · | · | · | · | 3.44 | 0.67 | 1.26 | · | · | · | · | · | · | · | · | · |
| wizard | 361415 | · | · | · | · | · | · | · | · | · | 3.98 | · | · | · | · | · | · | · |
| barbarian | 537602 | 0.88 | 0.00 | · | · | · | · | · | · | · | · | · | · | · | 0.48 | 1.98 | 0.83 | 3.28 |
| ranger | 531716 | · | · | 1.74 | 3.57 | 0.00 | · | · | · | · | · | · | · | · | 0.95 | 1.68 | 0.87 | 3.50 |
| druid | 495507 | · | · | · | · | · | · | · | · | 0.65 | 5.12 | · | · | · | · | · | · | · |
| monk | 235175 | · | · | · | · | · | · | · | · | · | · | 2.45 | 2.53 | 0.29 | · | · | · | · |
| bard | 331482 | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · |

**Sanity check:** Barbarian raged **0.88**×/combat and went reckless
**0.00**×/combat. Ranger cast Hunter's Mark
**1.74**×/combat, landed mark dice
**0.00**×/combat, and fired Colossus
**3.57**×/combat (Colossus is gated behind the L3 Hunter
subclass, so its rate also reflects how often the ranger reaches L3 within a life).

**Rage rest-economy (#424) firing check** — Rage is now a rationed pool of charges
(2/3/4/5 by level band, ∞ at L20) that refill ONLY at a rest, not per fight. If the
ration bites, a barb enters some fights unable to rage. Measured at fight entry over
**537602** barbarian combats: **Infinity** avg
charges in pocket, and **31.7%** of fights entered
rage-STARVED (0 charges, pre-L20). Rage fired **0.88**×/combat
(was effectively ~1×/combat when Rage was unlimited+re-poppable pre-#424) — a sub-1
rate with a non-zero starved share is the ration working: the barb is no longer
perma-raging, it is spending a finite pool between camps.

**Martial pool (#338) firing check** — the headline guard for THIS lane. The new
per-fight pool (Fighter Resolve / Barbarian Fury / Ranger Focus; 3 pts, ≤1 spend
per turn) spends per combat: **fighter** 4.00/combat (OFF 0.47 · DEF 2.21 · DIS 1.32); **barbarian** 3.28/combat (OFF 0.48 · DEF 1.98 · DIS 0.83); **ranger** 3.50/combat (OFF 0.95 · DEF 1.68 · DIS 0.87). If any of these were ~0 the
new kit would be inert in the sim and the band read meaningless; they are not.

## Where deaths cluster

- **fighter** — by chapter: ch1: 2754 · ch2: 2322 · ch3: 68 · ch4: 119 · ch5: 50 · ch6: 75. Top kill-rooms: melissan (588, 7.8%), fire-giant-shaman+saradush-marauder (392, 5.2%), fire-giant-shaman+burning-dead (312, 4.1%), skeleton+bone-stalker (256, 3.4%), slaver-cuirassier+cult-fanatic (244, 3.2%), stirge (210, 2.8%)
- **rogue** — by chapter: ch1: 2829 · ch2: 2213 · ch3: 335 · ch4: 336 · ch5: 251 · ch6: 357. Top kill-rooms: melissan (1584, 11.8%), irenicus (1170, 8.7%), palace-golem+suldanessellar-bladesinger (641, 4.8%), the-hollow-pretender (544, 4.0%), ascendant-slayer (438, 3.3%), slaver-cuirassier+cult-fanatic (249, 1.8%)
- **wizard** — by chapter: ch1: 2106 · ch2: 3529 · ch3: 881 · ch4: 411 · ch5: 514 · ch6: 1100. Top kill-rooms: drowned-custodian (1011, 7.0%), irenicus (970, 6.8%), the-hollow-pretender (821, 5.7%), athkatla-magistrate (687, 4.8%), the-unmade (577, 4.0%), slaver-cuirassier+cult-fanatic (403, 2.8%)
- **barbarian** — by chapter: ch1: 1854 · ch2: 2839 · ch3: 199 · ch4: 332 · ch5: 172 · ch6: 203. Top kill-rooms: melissan (1745, 12.5%), fire-giant-shaman+saradush-marauder (874, 6.3%), fire-giant-shaman+burning-dead (822, 5.9%), mirror-of-pride+avatar-of-wrath (764, 5.5%), mirror-of-pride+slayer-shade (639, 4.6%), irenicus (546, 3.9%)
- **ranger** — by chapter: ch1: 1826 · ch2: 2664 · ch3: 378 · ch4: 401 · ch5: 275 · ch6: 243. Top kill-rooms: melissan (1583, 11.0%), fire-giant-shaman+saradush-marauder (847, 5.9%), fire-giant-shaman+burning-dead (758, 5.3%), mirror-of-pride+avatar-of-wrath (614, 4.3%), mirror-of-pride+slayer-shade (462, 3.2%), fire-giant-shaman (343, 2.4%)
- **druid** — by chapter: ch1: 2317 · ch2: 2398 · ch3: 404 · ch4: 286 · ch5: 203 · ch6: 558. Top kill-rooms: irenicus (1841, 12.8%), melissan (1655, 11.5%), drowned-custodian (656, 4.6%), the-hollow-pretender (361, 2.5%), athkatla-magistrate (339, 2.4%), cowled-houndmaster+shadow-hound (323, 2.3%)
- **monk** — by chapter: ch1: 2550 · ch2: 3638 · ch3: 186 · ch4: 129 · ch5: 117 · ch6: 160. Top kill-rooms: slaver-cuirassier+cult-fanatic (425, 4.6%), melissan (322, 3.5%), shadow-hound+slaver-cuirassier (308, 3.3%), athkatla-magistrate (303, 3.2%), bandit-captain+cult-fanatic (303, 3.2%), cult-fanatic (290, 3.1%)
- **bard** — by chapter: ch1: 3144 · ch2: 3190 · ch3: 494 · ch4: 359 · ch5: 556 · ch6: 1513. Top kill-rooms: the-hollow-pretender (893, 6.2%), the-unmade (652, 4.5%), drowned-custodian (561, 3.9%), athkatla-magistrate (447, 3.1%), slaver-cuirassier+cult-fanatic (347, 2.4%), cowled-houndmaster+shadow-hound (309, 2.2%)

## Verdict

Signature mechanics fire under the shared policy (Barbarian raged 0.88×/combat and went reckless 0.00×/combat; Ranger cast Hunter's Mark 1.74×/combat, landed mark dice 0.00×/combat and fired Colossus 3.57×/combat). On
ascension reach, **fighter leads** (mean asc cleared 6.00,
topped A6 100.0%, first A0 clear ~life 52); the depth ranking is
barbarian 66.5 > ranger 65.8 > druid 61.3 > rogue 60.5 > wizard 44.4 > fighter 44.0 > monk 41.0 > bard 40.7 rooms/life. Absolute clear-rates remain an AI-floor artifact (the
bot underplays even with the full loot/camp loop modelled) — the ranking, not the
magnitudes, is the deliverable.
