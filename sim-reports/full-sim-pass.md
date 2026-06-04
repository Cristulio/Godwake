# Full integrated-game sim pass — post boss-framework wave (2026-06-04)

Measurement-only pass over `origin/main @ ad3995f` after the cycle's feature wave
(parametric spell scaling + caster `+N`, druid signatures + manual casting, monk
Ki changes, and the **data-driven boss framework** for all 14 chapter bosses).
No magnitudes were tuned. The one engine change is a **bot-policy fix** (gate
awareness — see §1) so the sim isn't inert against the new condition gates.

## Method / matrix

| Sim | What it measures | Knobs run |
|---|---|---|
| **`sim-boss-gauntlet.ts`** (NEW) | each of the 14 bosses in ISOLATION, all 7 classes, level- + blessing-realistic hero; mechanic-firing audit | SEEDS=60 @ Asc0; SEEDS=40 @ Asc6 |
| `sim-class-viability.ts` | geared full-14-chapter reincarnation band + kit-fire rates + ascension ladder | SOULS=30, LIVES=30, FULL_CHAIN |
| `sim-ngplus-tob.ts` | structural integrity + **geared** ToB boss-wall-check across Asc0→6 | SEEDS=25 |
| `sim-feel.ts` | full-delve texture + twist bucket | RUNS=15 @ Asc0; RUNS=12 @ Asc5 |

Why a new gauntlet: the full-delve sims only ever FIGHT a chapter-N boss on runs
that SURVIVED to chapter N — at the AI floor that is a heavy survival-selection
bias, so the deep ToB bosses are essentially never sampled. Dropping a calibrated
hero straight into each boss room removes the bias and exposes every boss's teeth.
It drives the real engine path (`createCombat{isBoss}` → `monsterAttack`/`endTurn`
under the trusted `actionPolicy` bot), so the boss framework fires exactly as in
play. **Caveat:** the gauntlet hero carries level + a realistic blessing loadout
but **preset gear** (no shop/legendary/meta power), so its absolute win-rates are a
LOWER bound — read the SHAPE and the relative ordering. The geared truth for the
ToB bosses comes from `sim-ngplus-tob` (§4).

---

## TL;DR

1. **Every boss-framework mechanic FIRES in the sim** — telegraphed wind-ups
   (charged 46–100%, hard-control-cancelled up to 17%), HP phases, summons,
   sustains, condition gates, battle-rage, and **multi-action turns from Ch9+**
   (observed `actionsPerTurn` 2/2/3/2/2/3 for Ch9–14). No HAS-but-never-FIRED
   red flags. Druid and monk kits fire (§3).
2. **The gate bosses needed a bot fix.** The bot was inert against condition
   gates (it never prioritized the warding add), so the Unmade/Pretender/Yaga
   read as ~0% walls. Added minimal gate-awareness to `actionPolicy`; the bot now
   drops the ward (ward-lifted 88–100% for Matron/Unmade/Yaga). The Hollow
   Pretender (Ch9) stays a wall — see §2.
3. **Boss difficulty is non-monotone.** A brutal mid-game cluster (Ch5 Hollow
   Dawn, Ch6 Unmade, Ch7 Drowned Custodian, Ch9 Hollow Pretender) sits between
   trivial bosses (Ch1/Ch3/Ch8 ≈ 90–100%). The apex (Ch11/Ch14) is hardest, by
   design.
4. **The gear gap is the whole ballgame for ToB.** Same boss, bare vs geared:
   Yaga-Shura 18%→**94%**, Abazigal 55%→**94%**, Nizidramanii'yt 31%→**99%**
   (gauntlet bare-gear vs ngplus geared, Asc0). Melissan stays a wall even geared
   (20% Asc0 → 0% Asc3+) — confirms "extremely hard by design, do not tune."
5. **Caster cantrip endgame IS below the old cap, as flagged.** Fire Bolt's
   dice-core at L20 is **11** vs the old 4d10 ≈ **22**. Casters lean entirely on
   slots at endgame (Magic Missile 31.5 auto-hit, Scorching Ray 56 raw). And
   because the game has **no ASIs**, the `INT_K` lever in `scaling.ts` is inert
   across levels (§5).
6. **Ascension ladder is monotone harder** and never breaks; at Asc6 some bosses
   become time-outs (Ch8 Ashen Marshal 45% stalls — second-wind + ascendant HP
   balloon the fight past 30 rounds).
7. **Class band, two lenses:** isolated-boss favours burst (Barbarian 56% >
   Ranger 50% > {Fighter/Monk/Wizard/Druid} 37% > Rogue 20%); the full 14-chapter
   chain favours sustain (Fighter is the lone ladder-climber, clr 6.1% / topA6
   3.3%; Barb+Ranger go deepest but rarely close). Rogue is the floor in both.

---

## §1. Mechanic-firing audit (boss framework wiring)

Boss gauntlet, Asc0, 60 seeds × 7 classes/boss. "FIRED" = observed live on the
boss instance during the fight; `—` = the boss doesn't declare that mechanic.

| Ch | Boss | telegraph% | cancel% | avg phases | maxApt | summons | gate-engaged% | ward-lifted% | rage% |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Ilyich | 74 | 0 | 0.7 | — | — | — | — | — |
| 2 | Magistrate | 67 | 0 | 0.8 | — | 0.8 | — | — | — |
| 3 | Asylum Director | 52 | 0 | 0.9 | — | — | — | — | — |
| 4 | Matron Mother | — | — | 0.9 | — | 1.0 | 96 | 89 | — |
| 5 | Hollow Dawn | — | — | 0.4 | — | 1.0 | — | — | — |
| 6 | The Unmade | 92 | 6 | 0.5 | — | 1.0 | 100 | 88 | — |
| 7 | Drowned Custodian | 100 | 2 | — | — | 2.4 | — | — | 3 |
| 8 | Ashen Marshal | 100 | 5 | 0.9 | — | — | — | — | 15 |
| 9 | Hollow Pretender | 100 | 1 | 0.0 | **2** | 2.0 | 100 | 9 | 2 |
| 10 | Nizidramanii'yt | 100 | 8 | 0.8 | **2** | — | — | — | — |
| 11 | Irenicus | 91 | 8 | 0.2 | **3** | — | — | — | — |
| 12 | Yaga-Shura | 100 | 17 | 0.8 | **2** | 1.0 | 100 | 100 | 80 |
| 13 | Abazigal | 100 | 10 | 0.9 | **2** | — | — | — | 87 |
| 14 | Melissan | 100 | 7 | 0.1 | **3** | 2.2 | — | — | 11 |

Reads:
- **Telegraphs work end-to-end.** Bosses charge wind-ups and the bot reads them —
  it hard-controls to *cancel* a charge up to 17% of the time (Yaga-Shura), the
  intended "shut it down in its reactive window" payoff. Lower charge% early
  (Director 52%) is just the boss dying before it always winds up.
- **Multi-action escalation is live Ch9+** (maxApt 2–3) — exactly the design.
- **Phases under-fire on the hardest bosses** (Pretender 0.0, Irenicus 0.2,
  Melissan 0.1) because, bare-geared, the player dies in 6–8 rounds before
  bloodying them — the boss wins before its phase trigger. Geared, the fights run
  long enough to cross the threshold (the ngplus min-HP tables show the player
  reaching the boss's bloodied band). Not a wiring bug.
- **Battle-rage fires when the boss is actually bloodied** (Yaga 80%, Abazigal
  87%) and stays dark when the boss kills the player first (Custodian 3%,
  Pretender 2%) — internally consistent.

### Bot gate-awareness fix (the one engine change)

Before: `actionPolicy` focus-fired lowest-HP. Gate adds are *summoned* mid-fight
(not co-spawned), and the bot never prioritized them, so a gated boss read as a
near-invulnerable wall (the bot poured wasted damage into a warded boss). Added
`wardingAddTarget()` — when a boss is warded by a live add, the bot focuses that
add first to drop the ward, then bursts the boss. Result: ward-lifted rose to
88–100% for Matron/Unmade/Yaga. This is correct play (it also improves the
in-game Auto-Battle), changes no magnitudes, and the full suite stays green
(1452 tests). The Hollow Pretender gate survives even gate-aware play (§2).

---

## §2. Boss difficulty per chapter

Gauntlet, Asc0, bare-gear-at-level + realistic blessings. Win% is a LOWER bound
(no shop/legendary gear) — martial deep-boss numbers especially understate real
play (a real L18 hero swings a +N legendary, not a starting weapon).

| Ch | Boss (L/blessings) | win% | rounds | win min-HP% | read |
|---|---|---|---|---|---|
| 1 | Ilyich (L3) | 100 | 4.1 | 77 | pushover |
| 2 | Magistrate (L4) | 46 | 8.3 | 49 | **paralyze spike** |
| 3 | Asylum Director (L5) | 100 | 6.0 | 79 | pushover |
| 4 | Matron Mother (L6) | 86 | 12.9 | 45 | fair (gate clears) |
| 5 | Hollow Dawn (L8) | 11 | 7.5 | 26 | **mid-game wall** |
| 6 | The Unmade (L9) | 6 | 8.2 | 28 | **mid-game wall** |
| 7 | Drowned Custodian (L11) | 1 | 8.3 | 36 | **wall (sustain+adds)** |
| 8 | Ashen Marshal (L12) | 90 | 15.0 | 82 | pushover (long) |
| 9 | Hollow Pretender (L13) | 0 | 5.8 | 0 | **hard wall (gate)** |
| 10 | Nizidramanii'yt (L15) | 31 | 11.6 | 39 | hard (Barb-only 100%) |
| 11 | Irenicus (L16) | 2 | 7.4 | 32 | apex |
| 12 | Yaga-Shura (L18) | 18 | 13.5 | 19 | apex (gate) |
| 13 | Abazigal (L19) | 55 | 21.7 | 9 | grind (longest fight) |
| 14 | Melissan (L20) | 0 | 8.2 | 0 | apex wall (by design) |

- **Pushovers** Ch1/Ch3/Ch8 — even bare-gear, ~100% across all classes. Ch8
  Ashen Marshal is a 15-round slog but never threatening (min-HP 82%) — long,
  not hard.
- **Mid-game wall cluster Ch5–7 + Ch9** is the headline anomaly: these *precede*
  the trivial Ch8 and the moderate Ch10/Ch13, so difficulty is clearly
  non-monotone. Ch7 Drowned Custodian (1%) and Ch9 Hollow Pretender (0%) are the
  hardest non-apex bosses in the game at this power tier.
- **Ch9 Hollow Pretender is the one mid-game boss that's a wall regardless of
  class or bot competence.** Its gate add (`mirror-double`: **90 HP, AC 18,
  summoned ×2**) cannot be cleared inside the 5–6 round window before the boss
  (240 HP, multi-action at half) kills the bare-gear hero — ward-lifted only 9%.
  The gate-aware bot targets the adds; they're just too tanky.

---

## §3. Class band

### Isolated boss-fight band (gauntlet, Asc0, overall win% across 14 bosses)

`barbarian 56 > ranger 50 > fighter 37 = monk 37 = wizard 37 = druid 37 > rogue 20`

Single-fight bosses reward burst + mitigation: Barbarian (rage halves physical,
reckless burst) and Ranger (opening volley + Hunter's Mark focus) lead; a tight
mid-cluster; Rogue is fragile with no boss-scale burst → floor.

### Full-14-chapter chain band (class-viability, geared reincarnation)

| class | clear% | topA6 | mean depth | note |
|---|---|---|---|---|
| fighter | **6.1** | **3.3%** | 29.6 | the only ladder-climber (sustain over the marathon) |
| barbarian | 0.7 | 0.0% | **34.8** | deepest diver, dies at the Throne apex |
| monk | 0.9 | 0.0% | 13.6 | mid |
| ranger | 0.0 | 0.0% | 12.6 | boss-killer that doesn't sustain |
| wizard | 0.0 | 0.0% | 6.2 | floor |
| druid | 0.0 | 0.0% | 4.9 | floor |
| rogue | 0.0 | 0.0% | 4.1 | floor |

The two lenses agree on the extremes (Rogue floor) and explain the middle: the
**closer vs diver** split — Fighter wins the marathon (only class banking full
clears and climbing Asc), Barbarian/Ranger win individual fights but burn out over
14 chapters. Consistent with prior passes.

### Kit-fire rates (proof the new/changed kits exercise) — per combat

- **Monk:** Flurry 2.07, Stunning Strike 1.16, Patient Defense 0.33 ✓
- **Druid:** Wild Shape 0.47, spell casts 3.77 ✓ (manual casting fires)
- Barbarian rage 1.99 / reckless 3.22; Ranger Hunter's-Mark 1.68 / mark-dice 3.80
  / Colossus 2.14; Rogue Sneak 2.08; Wizard casts 3.73; martial pools 2.6–4.5.

All seven classes' signatures fire under the shared policy.

---

## §4. Gear gap + geared ToB (sim-ngplus-tob)

Structural integrity intact: 14 bosses, 13 camps, **0 orphan rooms**, terminal =
Melissan. Geared boss-only win% across the ascension ladder:

| Boss | Asc0 | Asc3 | Asc6 | bare (gauntlet Asc0) |
|---|---|---|---|---|
| Ch10 Nizidramanii'yt | 99% | 91% | 73% | 31% |
| Ch11 Irenicus | 80% | 64% | 46% | 2% |
| Ch12 Yaga-Shura | 94% | 78% | 64% | 18% |
| Ch13 Abazigal | 94% | 82% | 54% | 55% |
| Ch14 Melissan | **20%** | **0%** | **0%** | 0% |

Reads:
- **Gear closes almost everything** — Yaga 18→94, Irenicus 2→80, Nizi 31→99. The
  bare-gear walls in §2 are gear-checks, not stat-block walls (except Melissan).
- **Monotone harder Asc0→Asc6** on every ToB boss — ladder is healthy, no break.
- **Melissan is a true wall even geared** (20% Asc0, 0% from Asc3). Matches the
  "extremely hard by design, do not tune" decision. Boss HP-remaining-on-loss
  sits ~45–54% — it's a designed gear/skill ceiling, not a near-miss.
- Cross-check: `sim-feel` full-delve (geared by progression) boss win = **92.5%**
  overall — the realistic player experience, vs the gauntlet's bare floor.

---

## §5. Caster scaling sanity

Expected per-cast damage via the real `scaling.ts` helpers (wizard, no gear):

| L | castMod | Fire Bolt dice-core | Fire Bolt full | Magic Missile (auto) | Scorching Ray (raw) | Fireball core |
|---|---|---|---|---|---|---|
| 1 | +3 | 6 | 9.0 | 10.5 | 21 | 28 |
| 8 | +3 | 7 | 10.0 | 17.5 | 28 | 32 |
| 14 | +3 | 9 | 12.0 | 24.5 | 42 | 41 |
| 20 | +3 | **11** | 14.0 | 31.5 | 56 | 49 |

Reference: OLD Fire Bolt cap = 4d10 ≈ **22** dice.

- **Flagged risk CONFIRMED:** the L20 cantrip dice-core (11) is **half** the old
  4d10 cap (22). With its flat `+castMod` and DEX-save-for-half floor the cantrip
  is still a fine at-will *opener*, but it is no longer a closer — casters must
  lean on slots at endgame (Magic Missile 31.5 guaranteed/un-savable; Scorching
  Ray 56 raw). That hierarchy looks intentional and healthy.
- **`INT_K` is inert across levels.** The game applies **no ASIs** (`applyLevelUp`
  never touches ability scores — fixed per-class stats), so `spellcastingMod` is
  constant for a class all game. `intFactor = 1 + INT_K·(castMod − 3)` is a fixed
  constant per build and never moves with level — at the reference casters
  (castMod +3) it is exactly 1.0 forever. The entire caster level-curve rides on
  `LEVEL_K` alone. `INT_K` only differentiates *builds* with different starting
  casting mods, never *progression*.
- **Casters fall off on add/gate/sustain bosses, not on damage-races.** Per-chapter
  caster-vs-martial win% (gauntlet): casters trail hard on Ch5–12 (Ch10 caster 11%
  vs martial 39%, Ch12 0% vs 25%) but BEAT martials on the pure damage-race
  Ch13 Abazigal (caster 75% — druid 83% — vs martial 46%). The caster weakness is
  add-management + bare-staff (no `+N` exercised), not raw spell scaling.

---

## §6. Twists (sim-feel, Asc5) + difficulty texture

Twist bucket vs clean fights (asc5 normal fights): all five twists keep win% in
band (94–97%) and add tension by cutting the blowout (zero-threat win) rate from
the clean 80% down to:

| twist | win% | blowout% | min-HP% | bite |
|---|---|---|---|---|
| cursed-ground | 95.3 | **34.3** | 67.0 | tightest tension |
| quickening | 93.9 | 51.9 | 67.9 | lowest win (enemy-first) |
| sealed-wards | 95.3 | 64.7 | 76.0 | mild |
| gloom | 96.8 | 63.3 | 77.8 | mildest |
| bloodscent | 95.0 | 69.6 | 77.7 | mild |

Consistent with prior passes — twists are a tension lever, not a lethality lever.

Ascension on bosses (gauntlet Asc6): the ladder bites, and at the top some bosses
become **stalls** rather than losses — Ch8 Ashen Marshal **45% time-outs** at
Asc6 (avg 25.8 rounds), as the ascension boss second-wind + ascendant HP multiply
into an HP sponge the bare hero can't out-damage in 30 rounds.

---

## §7. Prioritized tuning directions (NOT applied here)

Ordered by confidence × impact. All are content/knob pointers for a tuning lane.

1. **Ch9 Hollow Pretender gate is uncrackable** (`src/content/monsters/the-hollow-pretender.ts`).
   `mirror-double` at 90 HP / AC 18 / summoned ×2 = 180 effective HP of warding
   adds the hero can't clear before dying; the boss is 0% across every class even
   with gate-aware play. Lever: drop `mirror-double.maxHp` (≈45–60) or `ac`
   (≈15), reduce the summon `count` 2→1, or raise the gate `damageTakenPct`
   (0.2→~0.4) so chip leaks through. This is the single clearest out-of-band boss.

2. **Ch7 Drowned Custodian sustain + add grind** (`drowned-custodian.ts`). 2.4
   summons/fight + self-`sustain` + battle-rage never lets the bare hero bloody it
   (rage fires 3%). Lever: add/raise the sustain `cooldownRounds` or make it
   `once`, and/or trim summon volume.

3. **Ch5 Hollow Dawn mid-game spike** (`hollow-dawn.ts`). 11% bare, min-HP 26%.
   Verify the decoy/summon + paralyze stack isn't compounding; soften the
   paralyze `saveDC` or summon `count`.

4. **Ch2 Magistrate paralyze reliability** (`athkatla-magistrate.ts`). 46% overall
   but Fighter 25% / Rogue 18% — low-WIS classes get chain-paralyzed at L4. Lever:
   lower paralyze `saveDC` for the Ch2 tier or shorten `durationRounds`. (Boss-
   intel braced-save already mitigates in real play — verify before touching.)

5. **Asc6 boss HP-sponge stalls** (`src/engine/delve/ascension.ts`). The boss
   second-wind/extra-phase + ascendant `enemyHpMult` compound into >30-round
   fights (Ch8 45% stalls at Asc6). Consider capping combined boss HP growth or
   gating the extra-phase below the top ascensions.

6. **Caster endgame cantrip + dead `INT_K`** (`src/engine/combat/spells/scaling.ts`).
   If Fire Bolt is meant to stay a relevant at-will at L20, nudge `LEVEL_K`
   (0.05) up — note the L20 dice-core is half the old cap. Separately: `INT_K`
   does nothing given fixed stats (no ASIs); either fold INT growth into level-up
   (ASIs) or drop `INT_K` to avoid implying a lever that never engages.

7. **Rogue is the dual floor** (boss 20%, full-chain clr 0% / depth 4.1).
   Post-#282 Nimble Dodge it's still last on both lenses. Flag for a future floor
   pass; do not tune off this measurement.

### Sim-infrastructure note

`sim-boss-gauntlet.ts` is new and committed. The bot gate-awareness in
`actionPolicy.ts` is the only engine change — it makes the AI play the new gate
mechanic instead of ignoring it (the analogue of the past "twists never wired into
`createCombat`" gap). Raw gauntlet output: `sim-reports/boss-gauntlet.raw.md`.
