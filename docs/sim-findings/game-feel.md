# Game feel — what Godwake is like to play, and which tier-3 fix moves it most

**Lane:** `feat/sim-feel`. Companion to the balance sims, asking a different question. The
balance sims measure *can you win* (clear %, ascension). This one measures *what is it like
moment-to-moment* — pacing, agency, variety, tension — and maps the findings to the three
candidate "big fixes" so the next build decision is grounded in data, not vibes.

Harness: `scripts/sim-feel.ts` (full raw tables in [`game-feel.raw.md`](./game-feel.raw.md)).
It walks the whole 58-room Godwake delve with the **trusted policy** (`chooseCombatAction` /
`runAutoTurn` — the AI a watching player sees) across **5 classes × 4 start levels × 60 runs
= 1,200 full runs / 23,911 fights / 93,485 player turns**, at ascension 0.

> **Read relatively.** Clear-rates and reach are the AI-floor artifact flagged across the
> balance memory ([[feedback-balance-from-sims]], the character-order caveats). The bot under-
> levels and plays some kits crudely, so absolute magnitudes are a floor. What's robust is the
> **shape** of the experience and the **relative** size of each fix's lever — that's the
> deliverable.

---

## Verdict (the question this lane was spun up to answer)

**Is fix #3, the branching map, "a massive changer"? For AGENCY — yes, and the data backs the
intuition. But it does not touch the bigger felt problem, which lives inside combat.**

The experience splits cleanly into two broken halves:

- **Run-shape agency is at zero.** Path choices per run: **0.00**. Shop choices: **0.00**.
  Rest forks: **0.00** (across 6.55 rest/camp sites). The only out-of-combat decision a player
  actually makes is ~5 shrine blessing picks. The run is a 58-room rail.
- **Combat texture is autopilot.** **36.7%** of player turns are "press attack on the lone
  enemy and nothing else"; **56.4%** of won fights are zero-tension blowouts (HP never drops
  below 80%); genuine near-death-and-recover swing happens in **0.9%** of wins.

The **branching map is the single largest AGENCY lever** — it's the only fix that creates a
*new decision layer* (routing) where there are currently **zero** decisions, and it's the
delivery vehicle for shops, elites, and rest-forks (all currently absent). So it is correctly
ranked #1 and the user's instinct holds.

But it is structural — it changes the shape of *the run*, not the shape of *a fight*. After you
build it, **>half of fights are still won on autopilot without HP threat**. The fix that
addresses *that* is the enemy-intent telegraph (cheap, partial) and, deeper, more reactive
combat. Build the map first for agency; do not expect it to fix the "I just hold attack" feel.

---

## What the numbers say, by dimension

### 1. Pacing — snappy fights, autopilot turns

- **Fights are short and well-shaped.** 3.91 rounds avg (boss 4.57). 80% of fights resolve in
  2–5 rounds; only 5.8% run 9+ rounds. Pacing is **not** the problem — Godwake is not a slog at
  the fight level.
- **The turns inside those fights are hollow.** Two readings bracket it:
  - **27.3%** of player turns have *no lever at all available* (1 enemy, no usable
    resource/ability) — a hard floor of "no choice exists."
  - **36.7%** are *revealed autopilot* — the player just attacked the single enemy, full stop,
    even where a button technically existed (a held Action Surge, a spare slot) but pressing
    attack was obviously right.
- **It's a weapon-class problem.** Dead-turn rate by class: wizard **2.8%** (every turn is a
  spell-selection read), fighter 16%, rogue 34%, ranger 38%, **barbarian 43%**. The martial kits
  set a stance (rage / mark / hide) in round one, then mash attack.

### 2. Agency — almost all of it is in combat or shrines; the run structure adds none

Decisions per run, by source (full table in raw §2):

| Source | Per run | Real choice? |
|---|---:|---|
| **Path / routing** | **0.00** | the headline gap — fixed linear delve |
| **Shop** | **0.00** | no shop room kind exists |
| **Rest forks** | **0.00** | 6.55 heal-only rest/camp sites |
| Shrine blessing picks | 5.31 | **yes** — the only real out-of-combat agency |
| Event "choices" | 7.47 sites | sim auto-skips; several are free-upside (no real fork) |
| Level-ups | 2.65 | no — fixed class progression |
| Combat real-decision turns | 56.7 of 77.9 | yes, but see §1 (much is trivial) |

There are **~14 non-combat decision *sites* per run** (rest + event) that deliver **≈0 real
forks**. The scaffolding for agency is physically there; it just doesn't ask the player anything.

### 3. Variety — content is varied; expression is not

- Enemy variety is healthy: **20.9 distinct enemy types per run**, 34% within-run repeat.
- **Builds diverge wildly but play identically.** Weapon classes produce 212–237 distinct final
  blessing sets out of 240 runs (Jaccard ≈0.85) — every life's *build* is different. Yet
  in-fight action variety is **2.08 distinct action kinds per fight**, and the single most-used
  action's share is 92% (fighter) / 97% (wizard) / 77% (ranger). **Divergent builds, convergent
  play:** the blessings change the numbers, not what you press. (Wizard is the exception in
  reverse — only 13 distinct builds because its offense-blessings are inert, but its *play* is
  the most decision-rich.)

### 4. Tension — most fights never threaten you

- **56.4% of wins are blowouts** (HP never below 80%). 79% never drop below 50%.
- **Swing is nearly absent:** near-death-and-recover (dip below 30%, end above 50%) happens in
  **0.9%** of wins. Fights either stay comfortable or collapse — there's almost no
  dip-and-comeback arc. The min-HP distribution is bimodal-ish: 54.5% of fights bottom out above
  80%, while 13.9% dip below 30% (usually multi-enemy attrition or an under-leveled life).
- The felt consequence: combat is rarely *exciting*. You are usually either never in danger or
  already losing.

### 5. Enemy-intent surface — a real, bounded lever

- **41.4% of enemy turns carry a telegraph-worthy special** (paralyze / debuff / summon /
  sustain / multiattack) — info the player cannot currently see coming. **42.4% of fights**
  contain at least one such enemy.
- **14.7% of all player turns are autopilot AND sit next to a telegraph-worthy enemy** (53.7% of
  all dead turns). These are precisely the turns a visible intent could convert into a real read:
  burst the summoner before it spawns, pre-heal before the multiattack, focus the healer, spend
  a defensive cooldown ahead of the save-or-suck.
- Bound: the other ~58% of fights are plain attackers, where "intent" is just damage the threat
  model already implies — telegraphing adds little there.

---

## The three fixes, ranked by lever size

### #1 — Branching path map → **AGENCY** · lever: **LARGE** (but expensive / roadmap-scale)
- **Closes:** the path-choice gap (literally `0.00 → ~12–18` routing decisions/run, STS-scale),
  and *unlocks* the shop (0.00) and rest-fork (0.00) gaps as node types on the map.
- **Why it's the biggest:** it's the only fix that adds a *new category* of decision. Everything
  else enriches decisions that already exist; this creates a layer (run-routing: risk/reward,
  elites-for-reward, when to shop, when to rest) where there are currently none. It is also the
  carrier for the gold-sink / elite / rest-as-choice items already in the backlog.
- **What it does NOT do:** nothing for the 36.7% in-combat autopilot or the 56.4% blowouts. A
  branching map full of autopilot fights still feels like autopilot — just with a map over it.

### #2 — Rest-as-a-choice → **AGENCY + (weak) PACING** · lever: **MEDIUM** · effort: **LOW**
- **Closes:** the rest-fork gap — **6.55 heal-only sites/run → ~6.5 real forks/run**
  (heal vs. upgrade-a-build-piece vs. …), a count comparable to the 5.31 shrine picks, added at
  sites that already exist. Cheap and purely additive.
- **Bound:** doesn't touch combat texture or the linear rail; "pacing" gain is only "spend the
  beat differently," not fewer/snappier rounds (pacing isn't broken anyway).
- **Note:** partially *subsumed* by #1 if the map has rest nodes — so either fold it into the
  map, or ship it standalone first because it's so cheap.

### #3 — Enemy-intent telegraph → **COMBAT DECISION TEXTURE** · lever: **MEDIUM** · effort: **LOW–MED**
- **Closes:** the deepest *felt* problem (autopilot + blowouts), partially. It can turn the
  **14.7% of turns** that are autopilot-next-to-a-special into reads, and adds tension to the
  42% of fights with an intent-bearing enemy by making incoming danger legible *before* it lands.
- **Bound:** caps at the combat layer, does nothing in the ~58% plain-attacker fights, and
  **doesn't move agency-per-run at all.** Also the AI-floor caveat bites hardest here — the bot
  can't act on intent it doesn't model, so this is a "how many turns *could* become decisions"
  estimate, not a measured lift. Best value-per-effort of the three.

### Effort-adjusted ordering differs from raw impact
- **Raw agency impact:** map (1) > rest-fork (2) > telegraph (3).
- **Value per effort:** telegraph & rest-fork are cheap; the map is roadmap-scale. A pragmatic
  sequence is **rest-as-choice + enemy-intent first (cheap, hit both broken halves a little),
  then the branching map** (the big structural lift, once it's worth the cost).

---

## Narrated texture (one Fighter L5 run; full diary in raw §7)

The diary makes the numbers concrete. Three representative beats:

- **The autopilot blowout** — *The Coffle-Road, vs a Lash-Captain.* Five rounds, every one
  `attack + attack`, HP pinned at 100% the whole time. A "telegraph-worthy" enemy whose intent
  never mattered because it never connected. This is the median fight: zero tension, one button.
- **The tension spike** — *The Wardpriest's Line.* Enters at 26% HP (carried wounds, no heal
  fork on the way), grinds 10 rounds, bottoms at **1% HP**, survives. Genuinely tense — and
  notice *why* it was tense: not a decision the player made, but accumulated chip damage with no
  mid-run recovery valve. The kind of fight rest-as-choice would let you prepare for.
- **The collapse** — *The Brood-Warren, Spider Broodmother + driderlings.* The summoner spawns
  adds (a telegraph-worthy special), the player keeps swinging at the nearest body, gets buried,
  dies at 0%. A textbook case where *seeing* "Broodmother will summon" would have flipped the
  target priority — exactly the 14.7% lever.

---

## One-line takeaways for the build decision

- The branching map **is** the massive changer the user expects — **for agency**. Rank it #1.
- It will **not** fix combat autopilot (36.7%) or zero-tension blowouts (56.4%). Pair it with
  the enemy-intent telegraph or the new map will house the same hollow fights.
- Rest-as-a-choice is the cheapest real-agency win (~6.5 forks/run) and folds naturally into the
  map.
- Pacing is **fine**; don't spend effort there. The problems are **agency (structural)** and
  **tension/texture (combat)** — two different fixes for two different halves of the loop.
