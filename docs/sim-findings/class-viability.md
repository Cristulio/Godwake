# 7-class viability on current content — sim findings

> Auto-generated tables by `scripts/sim-class-viability.ts`. Re-run with
> `SOULS_PER_CLASS=20 MAX_LIVES=40 npx tsx scripts/sim-class-viability.ts`.

**Souls / class:** 20. **Max lives / soul:** 40.
**Wall clock:** 22.3s.

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
| fighter | 20 | 35.6 | 55.0% | 3.55 | 70.0% | 25.0 | 11.9% | 27.0 | 5.14 |
| rogue | 20 | 40.0 | 0.0% | 0.00 | 0.0% | — | 0.0% | 4.7 | 1.47 |
| wizard | 20 | 40.0 | 0.0% | 0.00 | 0.0% | — | 0.0% | 7.6 | 2.13 |
| barbarian | 20 | 40.0 | 0.0% | 1.10 | 90.0% | 28.7 | 5.0% | 48.6 | 8.85 |
| ranger | 20 | 40.0 | 0.0% | 0.05 | 25.0% | 32.4 | 0.8% | 34.4 | 6.59 |
| druid | 20 | 40.0 | 0.0% | 0.00 | 0.0% | — | 0.0% | 5.2 | 1.56 |
| monk | 20 | 40.0 | 0.0% | 1.70 | 70.0% | 32.8 | 6.0% | 26.2 | 5.14 |

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
| fighter | 6 | 1 | 1 | 0 | 0 | 1 | 0 | 11 |
| rogue | 20 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| wizard | 20 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| barbarian | 2 | 8 | 2 | 5 | 2 | 1 | 0 | 0 |
| ranger | 15 | 4 | 1 | 0 | 0 | 0 | 0 | 0 |
| druid | 20 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| monk | 6 | 3 | 2 | 3 | 1 | 2 | 3 | 0 |

## Proc instrumentation — do the new mechanics actually fire?

Per-combat rates across every combat the class fought. `·` = not applicable to
that class. Activations (Rage, Reckless, Hunter's-Mark cast) are exact;
Colossus is exact (once-per-turn flag); the Hunter's-Mark 1d6 per-hit die is
read off the damage log (approximate only in rare 200+-entry fights).

| Class | Combats | Rage/combat | Reckless/combat | HMark cast/combat | Colossus/combat | HMark die/combat | Sneak/combat | Sneak/turn | Hide/combat | WildShape/combat | Spell cast/combat | Flurry/combat | StunStrike/combat | PatientDef/combat | Martial OFF/combat | Martial DEF/combat | Martial DIS/combat | Martial total/combat |
|------|------:|----------:|--------------:|----------------:|--------------:|---------------:|------------:|----------:|-----------:|---------------:|----------------:|------------:|----------------:|----------------:|----------------:|----------------:|----------------:|-----------------:|
| fighter | 9448 | · | · | · | · | · | · | · | · | · | · | · | · | · | 0.72 | 1.57 | 3.55 | 5.83 |
| rogue | 2213 | · | · | · | · | · | 2.20 | 0.38 | 1.41 | · | · | · | · | · | · | · | · | · |
| wizard | 3329 | · | · | · | · | · | · | · | · | · | 4.11 | · | · | · | · | · | · | · |
| barbarian | 18936 | 2.24 | 3.99 | · | · | · | · | · | · | · | · | · | · | · | 0.43 | 1.07 | 2.47 | 3.97 |
| ranger | 13556 | · | · | 1.84 | 5.25 | 6.38 | · | · | · | · | · | · | · | · | 0.38 | 2.03 | 2.50 | 4.91 |
| druid | 2456 | · | · | · | · | · | · | · | · | 0.44 | 3.88 | · | · | · | · | · | · | · |
| monk | 10401 | · | · | · | · | · | · | · | · | · | · | 2.55 | 2.69 | 0.20 | · | · | · | · |

**Sanity check:** Barbarian raged **2.24**×/combat and went reckless
**3.99**×/combat. Ranger cast Hunter's Mark
**1.84**×/combat, landed mark dice
**6.38**×/combat, and fired Colossus
**5.25**×/combat (Colossus is gated behind the L3 Hunter
subclass, so its rate also reflects how often the ranger reaches L3 within a life).

**Martial pool (#338) firing check** — the headline guard for THIS lane. The new
per-fight pool (Fighter Resolve / Barbarian Fury / Ranger Focus; 3 pts, ≤1 spend
per turn) spends per combat: **fighter** 5.83/combat (OFF 0.72 · DEF 1.57 · DIS 3.55); **barbarian** 3.97/combat (OFF 0.43 · DEF 1.07 · DIS 2.47); **ranger** 4.91/combat (OFF 0.38 · DEF 2.03 · DIS 2.50). If any of these were ~0 the
new kit would be inert in the sim and the band read meaningless; they are not.

## Where deaths cluster

- **fighter** — by chapter: ch1: 376 · ch2: 192 · ch3: 3 · ch4: 3 · ch5: 0 · ch6: 2. Top kill-rooms: skeleton+stirge (32, 5.1%), stirge (26, 4.1%), cult-fanatic (24, 3.8%), duergar-taskmaster (24, 3.8%), famished-ghast (21, 3.3%), skeleton+bone-stalker (21, 3.3%)
- **rogue** — by chapter: ch1: 660 · ch2: 135 · ch3: 3 · ch4: 0 · ch5: 1 · ch6: 1. Top kill-rooms: skeleton+bone-stalker (50, 6.3%), duergar-ilyich (49, 6.1%), duergar-taskmaster (41, 5.1%), stirge (38, 4.8%), skeleton+stirge (38, 4.8%), goblin+kobold (34, 4.3%)
- **wizard** — by chapter: ch1: 439 · ch2: 335 · ch3: 21 · ch4: 1 · ch5: 3 · ch6: 1. Top kill-rooms: skeleton+bone-stalker (40, 5.0%), duergar-ilyich (40, 5.0%), famished-ghast (36, 4.5%), duergar-taskmaster (34, 4.3%), slaver-cuirassier+cult-fanatic (33, 4.1%), skeleton+stirge (31, 3.9%)
- **barbarian** — by chapter: ch1: 192 · ch2: 208 · ch3: 14 · ch4: 13 · ch5: 11 · ch6: 26. Top kill-rooms: melissan (35, 4.6%), fire-giant-shaman+saradush-marauder (27, 3.6%), slaver-cuirassier+cult-fanatic (20, 2.6%), duergar-taskmaster (19, 2.5%), sendai+half-dragon-reaver (19, 2.5%), cult-fanatic (19, 2.5%)
- **ranger** — by chapter: ch1: 271 · ch2: 238 · ch3: 12 · ch4: 14 · ch5: 6 · ch6: 12. Top kill-rooms: duergar-taskmaster (32, 4.0%), mask-chamberlain+mirror-double (26, 3.3%), goblin-warden+hobgoblin (25, 3.1%), hobgoblin+slaver-cuirassier (24, 3.0%), duergar-ilyich (24, 3.0%), skeleton+bone-stalker (21, 2.6%)
- **druid** — by chapter: ch1: 626 · ch2: 166 · ch3: 7 · ch4: 0 · ch5: 1 · ch6: 0. Top kill-rooms: skeleton+bone-stalker (64, 8.0%), skeleton+stirge (53, 6.6%), famished-ghast (48, 6.0%), stirge (44, 5.5%), duergar-taskmaster (37, 4.6%), goblin-warden+hobgoblin (35, 4.4%)
- **monk** — by chapter: ch1: 362 · ch2: 267 · ch3: 11 · ch4: 5 · ch5: 3 · ch6: 6. Top kill-rooms: duergar-ilyich (46, 6.1%), duergar-taskmaster (35, 4.7%), goblin-warden+hobgoblin (27, 3.6%), slaver-cuirassier+cult-fanatic (27, 3.6%), cult-fanatic (26, 3.5%), skeleton+bone-stalker (25, 3.3%)

## Verdict

Signature mechanics fire under the shared policy (Barbarian raged 2.24×/combat and went reckless 3.99×/combat; Ranger cast Hunter's Mark 1.84×/combat, landed mark dice 6.38×/combat and fired Colossus 5.25×/combat). On
ascension reach, **fighter leads** (mean asc cleared 3.55,
topped A6 55.0%, first A0 clear ~life 25); the depth ranking is
barbarian 48.6 > ranger 34.4 > fighter 27.0 > monk 26.2 > wizard 7.6 > druid 5.2 > rogue 4.7 rooms/life. Absolute clear-rates remain an AI-floor artifact (the
bot underplays even with the full loot/camp loop modelled) — the ranking, not the
magnitudes, is the deliverable.
