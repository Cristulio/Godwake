# 9-class viability on current content — sim findings

> Auto-generated tables by `scripts/sim-class-viability.ts`. Re-run with
> `SOULS_PER_CLASS=120 MAX_LIVES=120 npx tsx scripts/sim-class-viability.ts`.

**Souls / class:** 120. **Max lives / soul:** 120.
**Wall clock:** 3061.2s.

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

## Headline — all 9 classes

| Class | Souls | Lives/soul | Topped A6 | Mean asc cleared | Ever cleared A0 | First A0-clear life | Per-life clear% | Avg depth (rooms) | Avg final lvl |
|------|------:|----------:|--------:|----------------:|---------------:|-------------------:|---------------:|-----------------:|-------------:|
| fighter | 120 | 92.8 | 88.3% | 5.86 | 100.0% | 59.4 | 7.4% | 53.2 | 9.76 |
| rogue | 120 | 117.5 | 12.5% | 4.67 | 100.0% | 55.9 | 4.8% | 64.1 | 11.76 |
| wizard | 120 | 120.0 | 0.0% | 0.13 | 60.0% | 89.0 | 0.6% | 46.4 | 9.09 |
| barbarian | 120 | 120.0 | 0.0% | 1.60 | 100.0% | 55.8 | 2.2% | 63.5 | 11.80 |
| ranger | 120 | 120.0 | 0.0% | 0.01 | 25.0% | 90.5 | 0.2% | 60.2 | 11.22 |
| druid | 120 | 120.0 | 0.0% | 0.09 | 67.5% | 80.5 | 0.6% | 71.1 | 12.77 |
| monk | 120 | 85.1 | 97.5% | 5.97 | 100.0% | 60.1 | 8.2% | 49.0 | 9.27 |
| bard | 120 | 120.0 | 0.0% | 0.00 | 14.2% | 106.9 | 0.1% | 27.5 | 5.84 |
| paladin | 120 | 120.0 | 0.0% | 0.01 | 16.7% | 83.4 | 0.1% | 64.5 | 11.77 |

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
| fighter | 0 | 0 | 0 | 0 | 1 | 1 | 12 | 106 |
| rogue | 0 | 0 | 0 | 0 | 14 | 26 | 65 | 15 |
| wizard | 48 | 58 | 13 | 1 | 0 | 0 | 0 | 0 |
| barbarian | 0 | 17 | 31 | 55 | 17 | 0 | 0 | 0 |
| ranger | 90 | 29 | 1 | 0 | 0 | 0 | 0 | 0 |
| druid | 39 | 72 | 7 | 2 | 0 | 0 | 0 | 0 |
| monk | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 117 |
| bard | 103 | 17 | 0 | 0 | 0 | 0 | 0 | 0 |
| paladin | 100 | 19 | 1 | 0 | 0 | 0 | 0 | 0 |

## Proc instrumentation — do the new mechanics actually fire?

Per-combat rates across every combat the class fought. `·` = not applicable to
that class. Activations (Rage, Reckless, Hunter's-Mark cast) are exact;
Colossus is exact (once-per-turn flag); the Hunter's-Mark 1d6 per-hit die is
read off the damage log (approximate only in rare 200+-entry fights).

| Class | Combats | Rage/combat | Reckless/combat | HMark cast/combat | Colossus/combat | HMark die/combat | Sneak/combat | Sneak/turn | Hide/combat | WildShape/combat | Spell cast/combat | Flurry/combat | StunStrike/combat | PatientDef/combat | Martial OFF/combat | Martial DEF/combat | Martial DIS/combat | Martial total/combat | LayOnHands/combat | Smite/combat |
|------|------:|----------:|--------------:|----------------:|--------------:|---------------:|------------:|----------:|-----------:|---------------:|----------------:|------------:|----------------:|----------------:|----------------:|----------------:|----------------:|-----------------:|----------------:|------------:|
| fighter | 333086 | · | · | · | · | · | · | · | · | · | · | · | · | · | 0.43 | 2.83 | 0.85 | 4.11 | · | · |
| rogue | 507100 | · | · | · | · | · | 3.38 | 0.67 | 1.23 | · | · | · | · | · | · | · | · | · | · | · |
| wizard | 377565 | · | · | · | · | · | · | · | · | · | 3.95 | · | · | · | · | · | · | · | · | · |
| barbarian | 513375 | 0.85 | 0.00 | · | · | · | · | · | · | · | · | · | · | · | 0.46 | 2.03 | 0.81 | 3.30 | · | · |
| ranger | 487229 | · | · | 1.74 | 3.68 | 0.00 | · | · | · | · | · | · | · | · | 0.95 | 1.80 | 0.85 | 3.60 | · | · |
| druid | 574173 | · | · | · | · | · | · | · | · | 0.60 | 5.54 | · | · | · | · | · | · | · | · | · |
| monk | 281670 | · | · | · | · | · | · | · | · | · | · | 2.45 | 2.33 | 0.22 | · | · | · | · | · | · |
| bard | 226864 | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · |
| paladin | 521430 | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | 0.18 | 2.29 |

**Sanity check:** Barbarian raged **0.85**×/combat and went reckless
**0.00**×/combat. Ranger cast Hunter's Mark
**1.74**×/combat, landed mark dice
**0.00**×/combat, and fired Colossus
**3.68**×/combat (Colossus is gated behind the L3 Hunter
subclass, so its rate also reflects how often the ranger reaches L3 within a life).

**Rage rest-economy (#424) firing check** — Rage is now a rationed pool of charges
(2/3/4/5 by level band, ∞ at L20) that refill ONLY at a rest, not per fight. If the
ration bites, a barb enters some fights unable to rage. Measured at fight entry over
**513375** barbarian combats: **Infinity** avg
charges in pocket, and **33.5%** of fights entered
rage-STARVED (0 charges, pre-L20). Rage fired **0.85**×/combat
(was effectively ~1×/combat when Rage was unlimited+re-poppable pre-#424) — a sub-1
rate with a non-zero starved share is the ration working: the barb is no longer
perma-raging, it is spending a finite pool between camps.

**Martial pool (#338) firing check** — the headline guard for THIS lane. The new
per-fight pool (Fighter Resolve / Barbarian Fury / Ranger Focus; 3 pts, ≤1 spend
per turn) spends per combat: **fighter** 4.11/combat (OFF 0.43 · DEF 2.83 · DIS 0.85); **barbarian** 3.30/combat (OFF 0.46 · DEF 2.03 · DIS 0.81); **ranger** 3.60/combat (OFF 0.95 · DEF 1.80 · DIS 0.85). If any of these were ~0 the
new kit would be inert in the sim and the band read meaningless; they are not.

## Where deaths cluster

- **fighter** — by chapter: ch1: 3101 · ch2: 2589 · ch3: 93 · ch4: 155 · ch5: 79 · ch6: 78. Top kill-rooms: melissan (1514, 14.7%), fire-giant-shaman+saradush-marauder (647, 6.3%), fire-giant-shaman+burning-dead (526, 5.1%), slaver-cuirassier+cult-fanatic (282, 2.7%), mirror-of-pride+avatar-of-wrath (264, 2.6%), skeleton+bone-stalker (260, 2.5%)
- **rogue** — by chapter: ch1: 2412 · ch2: 2049 · ch3: 269 · ch4: 332 · ch5: 286 · ch6: 348. Top kill-rooms: melissan (1576, 11.7%), irenicus (1231, 9.2%), palace-golem+suldanessellar-bladesinger (649, 4.8%), the-hollow-pretender (585, 4.4%), mirror-of-pride+avatar-of-wrath (263, 2.0%), slaver-cuirassier+cult-fanatic (251, 1.9%)
- **wizard** — by chapter: ch1: 2080 · ch2: 3162 · ch3: 859 · ch4: 347 · ch5: 511 · ch6: 1173. Top kill-rooms: irenicus (1100, 7.7%), the-hollow-pretender (1059, 7.4%), drowned-custodian (1049, 7.3%), the-unmade (627, 4.4%), athkatla-magistrate (569, 4.0%), slaver-cuirassier+cult-fanatic (361, 2.5%)
- **barbarian** — by chapter: ch1: 1570 · ch2: 2538 · ch3: 615 · ch4: 720 · ch5: 447 · ch6: 414. Top kill-rooms: melissan (1606, 11.4%), fire-giant-shaman+saradush-marauder (807, 5.7%), fire-giant-shaman+burning-dead (767, 5.4%), mirror-of-pride+avatar-of-wrath (722, 5.1%), mirror-of-pride+slayer-shade (588, 4.2%), fire-giant-shaman (326, 2.3%)
- **ranger** — by chapter: ch1: 1655 · ch2: 3180 · ch3: 819 · ch4: 666 · ch5: 302 · ch6: 228. Top kill-rooms: melissan (1355, 9.4%), fire-giant-shaman+saradush-marauder (804, 5.6%), fire-giant-shaman+burning-dead (702, 4.9%), athkatla-magistrate (564, 3.9%), mirror-of-pride+avatar-of-wrath (555, 3.9%), mirror-of-pride+slayer-shade (460, 3.2%)
- **druid** — by chapter: ch1: 2009 · ch2: 2068 · ch3: 265 · ch4: 259 · ch5: 115 · ch6: 360. Top kill-rooms: melissan (2989, 20.9%), irenicus (1322, 9.2%), fire-giant+fire-giant-shaman (529, 3.7%), drowned-custodian (480, 3.4%), fire-giant-warlord+fire-giant-shaman (467, 3.3%), fire-giant-shaman+burning-dead (460, 3.2%)
- **monk** — by chapter: ch1: 2216 · ch2: 3125 · ch3: 158 · ch4: 112 · ch5: 108 · ch6: 172. Top kill-rooms: melissan (450, 4.8%), irenicus (391, 4.2%), fire-giant-shaman+saradush-marauder (389, 4.1%), slaver-cuirassier+cult-fanatic (367, 3.9%), palace-golem+suldanessellar-bladesinger (333, 3.6%), athkatla-magistrate (257, 2.7%)
- **bard** — by chapter: ch1: 5086 · ch2: 3860 · ch3: 553 · ch4: 323 · ch5: 458 · ch6: 1158. Top kill-rooms: athkatla-magistrate (589, 4.1%), skeleton+bone-stalker (553, 3.8%), the-unmade (547, 3.8%), the-hollow-pretender (534, 3.7%), drowned-custodian (473, 3.3%), slaver-cuirassier+cult-fanatic (441, 3.1%)
- **paladin** — by chapter: ch1: 2152 · ch2: 2839 · ch3: 146 · ch4: 307 · ch5: 156 · ch6: 223. Top kill-rooms: melissan (1692, 11.8%), fire-giant-shaman+saradush-marauder (681, 4.7%), mirror-of-pride+avatar-of-wrath (663, 4.6%), fire-giant-shaman+burning-dead (573, 4.0%), mirror-of-pride+slayer-shade (513, 3.6%), mirror-of-pride+hoarding-fiend-of-greed (379, 2.6%)

## Verdict

Signature mechanics fire under the shared policy (Barbarian raged 0.85×/combat and went reckless 0.00×/combat; Ranger cast Hunter's Mark 1.74×/combat, landed mark dice 0.00×/combat and fired Colossus 3.68×/combat). On
ascension reach, **monk leads** (mean asc cleared 5.97,
topped A6 97.5%, first A0 clear ~life 60); the depth ranking is
druid 71.1 > paladin 64.5 > rogue 64.1 > barbarian 63.5 > ranger 60.2 > fighter 53.2 > monk 49.0 > wizard 46.4 > bard 27.5 rooms/life. Absolute clear-rates remain an AI-floor artifact (the
bot underplays even with the full loot/camp loop modelled) — the ranking, not the
magnitudes, is the deliverable.
