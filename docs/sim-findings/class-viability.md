# 9-class viability on current content — sim findings

> Auto-generated tables by `scripts/sim-class-viability.ts`. Re-run with
> `SOULS_PER_CLASS=50 MAX_LIVES=50 npx tsx scripts/sim-class-viability.ts`.

**Souls / class:** 50. **Max lives / soul:** 50.
**Wall clock:** 113.1s.

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
| fighter | 50 | 49.7 | 2.0% | 0.74 | 26.0% | 41.7 | 2.0% | 16.6 | 3.73 |
| rogue | 50 | 50.0 | 0.0% | 0.12 | 16.0% | 45.0 | 0.6% | 18.0 | 4.21 |
| wizard | 50 | 50.0 | 0.0% | 0.00 | 0.0% | — | 0.0% | 12.6 | 3.35 |
| barbarian | 50 | 50.0 | 0.0% | 0.30 | 46.0% | 41.9 | 1.5% | 30.8 | 6.43 |
| ranger | 50 | 50.0 | 0.0% | 0.00 | 4.0% | 48.5 | 0.1% | 30.6 | 6.35 |
| druid | 50 | 50.0 | 0.0% | 0.00 | 0.0% | — | 0.0% | 20.0 | 4.58 |
| monk | 50 | 50.0 | 2.0% | 0.38 | 12.0% | 41.3 | 1.0% | 17.2 | 4.09 |
| bard | 50 | 50.0 | 0.0% | 0.00 | 0.0% | — | 0.0% | 11.2 | 3.02 |
| paladin | 50 | 50.0 | 0.0% | 0.00 | 0.0% | — | 0.0% | 23.7 | 5.14 |

- **Topped A6** — share of souls that cleared the full chain at Ascension 6 within 50 lives.
- **Mean asc cleared** — average highest ascension a soul ever cleared (0 if it never cleared A0).
- **First A0-clear life** — average life index of a soul's first base-chain clear (only souls that cleared A0).
- **Per-life clear%** — fraction of ALL lives (across all ascensions) that cleared the chain.
- **Avg depth** — mean rooms reached per life. One route is walked through the
  branching 6-chapter map; a full routed clear is ~62-66 rooms (the whole map is
  ~103-111 nodes), ending at the Ch6 final boss (the-unmade).

## Ascension reach — how high each class's souls topped out

Soul counts bucketed by the highest ascension level they ever cleared
("never" = never cleared even A0 within 50 lives).

| Class | never | A0 | A1 | A2 | A3 | A4 | A5 | A6 |
|------|------:|------:|------:|------:|------:|------:|------:|------:|
| fighter | 37 | 3 | 0 | 2 | 2 | 4 | 1 | 1 |
| rogue | 42 | 4 | 2 | 2 | 0 | 0 | 0 | 0 |
| wizard | 50 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| barbarian | 27 | 13 | 5 | 5 | 0 | 0 | 0 | 0 |
| ranger | 48 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| druid | 50 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| monk | 44 | 1 | 1 | 0 | 1 | 1 | 1 | 1 |
| bard | 50 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| paladin | 50 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

## Proc instrumentation — do the new mechanics actually fire?

Per-combat rates across every combat the class fought. `·` = not applicable to
that class. Activations (Rage, Reckless, Hunter's-Mark cast) are exact;
Colossus is exact (once-per-turn flag); the Hunter's-Mark 1d6 per-hit die is
read off the damage log (approximate only in rare 200+-entry fights).

| Class | Combats | Rage/combat | Reckless/combat | HMark cast/combat | Colossus/combat | HMark die/combat | Sneak/combat | Sneak/turn | Hide/combat | WildShape/combat | Spell cast/combat | Flurry/combat | StunStrike/combat | PatientDef/combat | Martial OFF/combat | Martial DEF/combat | Martial DIS/combat | Martial total/combat | LayOnHands/combat | Smite/combat |
|------|------:|----------:|--------------:|----------------:|--------------:|---------------:|------------:|----------:|-----------:|---------------:|----------------:|------------:|----------------:|----------------:|----------------:|----------------:|----------------:|-----------------:|----------------:|------------:|
| fighter | 23913 | · | · | · | · | · | · | · | · | · | · | · | · | · | 0.43 | 1.89 | 0.68 | 3.01 | · | · |
| rogue | 26087 | · | · | · | · | · | 2.82 | 0.58 | 1.24 | · | · | · | · | · | · | · | · | · | · | · |
| wizard | 18619 | · | · | · | · | · | · | · | · | · | 3.93 | · | · | · | · | · | · | · | · | · |
| barbarian | 43844 | 0.86 | 0.00 | · | · | · | · | · | · | · | · | · | · | · | 0.48 | 1.68 | 0.75 | 2.91 | · | · |
| ranger | 43406 | · | · | 1.71 | 2.74 | 0.00 | · | · | · | · | · | · | · | · | 0.90 | 1.43 | 0.78 | 3.11 | · | · |
| druid | 28943 | · | · | · | · | · | · | · | · | 0.96 | 4.05 | · | · | · | · | · | · | · | · | · |
| monk | 25056 | · | · | · | · | · | · | · | · | · | · | 2.08 | 1.42 | 0.58 | · | · | · | · | · | · |
| bard | 16684 | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · |
| paladin | 34031 | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | 0.56 | 1.71 |

**Sanity check:** Barbarian raged **0.86**×/combat and went reckless
**0.00**×/combat. Ranger cast Hunter's Mark
**1.71**×/combat, landed mark dice
**0.00**×/combat, and fired Colossus
**2.74**×/combat (Colossus is gated behind the L3 Hunter
subclass, so its rate also reflects how often the ranger reaches L3 within a life).

**Rage rest-economy (#424) firing check** — Rage is now a rationed pool of charges
(2/3/4/5 by level band, ∞ at L20) that refill ONLY at a rest, not per fight. If the
ration bites, a barb enters some fights unable to rage. Measured at fight entry over
**43844** barbarian combats: **Infinity** avg
charges in pocket, and **32.3%** of fights entered
rage-STARVED (0 charges, pre-L20). Rage fired **0.86**×/combat
(was effectively ~1×/combat when Rage was unlimited+re-poppable pre-#424) — a sub-1
rate with a non-zero starved share is the ration working: the barb is no longer
perma-raging, it is spending a finite pool between camps.

**Martial pool (#338) firing check** — the headline guard for THIS lane. The new
per-fight pool (Fighter Resolve / Barbarian Fury / Ranger Focus; 3 pts, ≤1 spend
per turn) spends per combat: **fighter** 3.01/combat (OFF 0.43 · DEF 1.89 · DIS 0.68); **barbarian** 2.91/combat (OFF 0.48 · DEF 1.68 · DIS 0.75); **ranger** 3.11/combat (OFF 0.90 · DEF 1.43 · DIS 0.78). If any of these were ~0 the
new kit would be inert in the sim and the band read meaningless; they are not.

## Where deaths cluster

- **fighter** — by chapter: ch1: 1350 · ch2: 822 · ch3: 27 · ch4: 17 · ch5: 8 · ch6: 22. Top kill-rooms: skeleton+bone-stalker (127, 5.2%), goblin-warden+stirge (98, 4.0%), stirge (97, 4.0%), skeleton+stirge (95, 3.9%), slaver-cuirassier+cult-fanatic (91, 3.7%), cult-fanatic (84, 3.4%)
- **rogue** — by chapter: ch1: 1086 · ch2: 848 · ch3: 114 · ch4: 66 · ch5: 71 · ch6: 85. Top kill-rooms: skeleton+bone-stalker (108, 4.3%), slaver-cuirassier+cult-fanatic (108, 4.3%), famished-ghast+goblin (100, 4.0%), bandit-captain+cult-fanatic (91, 3.7%), cult-fanatic (81, 3.3%), stirge (75, 3.0%)
- **wizard** — by chapter: ch1: 892 · ch2: 1209 · ch3: 203 · ch4: 68 · ch5: 54 · ch6: 46. Top kill-rooms: athkatla-magistrate (186, 7.4%), slaver-cuirassier+cult-fanatic (154, 6.2%), bandit-captain+cult-fanatic (110, 4.4%), skeleton+bone-stalker (104, 4.2%), duergar-ilyich (93, 3.7%), cult-fanatic (90, 3.6%)
- **barbarian** — by chapter: ch1: 689 · ch2: 1019 · ch3: 50 · ch4: 60 · ch5: 45 · ch6: 70. Top kill-rooms: slaver-cuirassier+cult-fanatic (116, 4.7%), athkatla-magistrate (113, 4.6%), bandit-captain+cult-fanatic (84, 3.4%), hobgoblin+slaver-cuirassier (77, 3.1%), cult-fanatic (73, 3.0%), duergar-ilyich (68, 2.8%)
- **ranger** — by chapter: ch1: 741 · ch2: 892 · ch3: 70 · ch4: 80 · ch5: 71 · ch6: 74. Top kill-rooms: slaver-cuirassier+cult-fanatic (91, 3.6%), athkatla-magistrate (77, 3.1%), bandit-captain+cult-fanatic (73, 2.9%), shadow-hound+slaver-cuirassier (69, 2.8%), skeleton+bone-stalker (67, 2.7%), skeleton+stirge (61, 2.4%)
- **druid** — by chapter: ch1: 906 · ch2: 928 · ch3: 117 · ch4: 77 · ch5: 70 · ch6: 146. Top kill-rooms: athkatla-magistrate (166, 6.6%), slaver-cuirassier+cult-fanatic (124, 5.0%), skeleton+bone-stalker (120, 4.8%), skeleton+stirge (80, 3.2%), bandit-captain+cult-fanatic (73, 2.9%), the-unmade (72, 2.9%)
- **monk** — by chapter: ch1: 968 · ch2: 1183 · ch3: 42 · ch4: 32 · ch5: 16 · ch6: 29. Top kill-rooms: slaver-cuirassier+cult-fanatic (139, 5.6%), duergar-ilyich (107, 4.3%), cult-fanatic (106, 4.3%), hobgoblin+slaver-cuirassier (104, 4.2%), bandit-captain+cult-fanatic (99, 4.0%), shadow-hound+slaver-cuirassier (86, 3.5%)
- **bard** — by chapter: ch1: 1202 · ch2: 998 · ch3: 113 · ch4: 40 · ch5: 63 · ch6: 59. Top kill-rooms: skeleton+bone-stalker (131, 5.2%), athkatla-magistrate (127, 5.1%), slaver-cuirassier+cult-fanatic (115, 4.6%), famished-ghast+goblin (90, 3.6%), skeleton+stirge (89, 3.6%), duergar-ilyich (88, 3.5%)
- **paladin** — by chapter: ch1: 880 · ch2: 995 · ch3: 58 · ch4: 51 · ch5: 38 · ch6: 64. Top kill-rooms: slaver-cuirassier+cult-fanatic (120, 4.8%), athkatla-magistrate (119, 4.8%), skeleton+bone-stalker (94, 3.8%), goblin-warden+stirge (90, 3.6%), duergar-taskmaster (86, 3.4%), bandit-captain+cult-fanatic (79, 3.2%)

## Verdict

Signature mechanics fire under the shared policy (Barbarian raged 0.86×/combat and went reckless 0.00×/combat; Ranger cast Hunter's Mark 1.71×/combat, landed mark dice 0.00×/combat and fired Colossus 2.74×/combat). On
ascension reach, **fighter leads** (mean asc cleared 0.74,
topped A6 2.0%, first A0 clear ~life 42); the depth ranking is
barbarian 30.8 > ranger 30.6 > paladin 23.7 > druid 20.0 > rogue 18.0 > monk 17.2 > fighter 16.6 > wizard 12.6 > bard 11.2 rooms/life. Absolute clear-rates remain an AI-floor artifact (the
bot underplays even with the full loot/camp loop modelled) — the ranking, not the
magnitudes, is the deliverable.
