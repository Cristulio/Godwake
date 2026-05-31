# Re-sim synthesis — 2026-05-31 (post #211–#217)

**Base commit:** `6138982` (#217), main rebased in. This session shipped, in order:
#211 competent caster bot, #212 scaling Fire Bolt + boss/elite control-resistance,
#213 rage every combat (per-rest charge cap removed), #214 legendary slot-cap removed
(all owned relics equip at once), #215 Shield-slot UX/auto-fire, #216 Ch1–3
encounter-tension pass, #217 Fireball/Lightning differentiation.

**Build:** green. **Tests:** 870 pass / 5 skipped (RUN_SIM-gated) / 1 todo.

**Report-only.** No game mechanic, balance value, spell, class, monster, or gear
number changed in this lane. Recommendations are for the user to action.

## Sims run

| Sim | Params | Models | Role |
|-----|--------|--------|------|
| `sim-class-viability` | 40 souls × 120 lives | loot-BLIND floor | relative class kit, isolates #213 |
| `sim-endgame-gear` | 40 × 120 | full loot/economy loop | the Hades gate, ascension climb, isolates #214 |
| `sim-feel` | RUNS=40 (800 runs) | per-turn texture | blowout / dead-turn / agency |
| `encounterStress` matrix | 25 runs/cell, MATCHED level | single encounters, rogue/fighter/wizard | per-encounter tension + wizard tankiness |

> All absolute clear-rates remain an AI-floor read (the bot underplays a real
> player). Read the **relative shape**. `sim-economy` and `sim-difficulty-curve`
> are **stale by design** (they model the old fixed ~37-room 4-chapter run and
> print near-100% death everywhere) — not trusted, not used for any verdict here.

---

## Q1 — Barbarian after rage-uncap (#213): re-tipped too strong?

**Loot-blind floor** (no gear → isolates the rage change; #212/#214 don't touch barb):

| Class | depth before¹ | depth after | final lvl after | rage/combat |
|-------|--------:|--------:|--------:|--------:|
| fighter | 22.7 | 20.2 | 4.25 | · |
| rogue | 21.4 | 20.3 | 4.16 | · |
| wizard | 22.8 | 20.5 | 4.31 | · |
| **barbarian** | **24.0** | **33.4** | **5.89** | **1.55** |
| ranger | 37.5 | 34.8 | 5.97 | · |

¹ before = `wizard-scaling-boss-resist.md` loot-blind 40×120 (post-#212, pre-#213).

**Geared endgame** (40×120), runs-to-first-Ch6-clear + depth:

| Class | 1st-clear before² | 1st-clear after | depth after | topped A6 |
|-------|--------:|--------:|--------:|--------:|
| fighter | 25.9 | 11.3 | 41.4 | 100% |
| rogue | 48.8 | 23.4 | 33.8 | 100% |
| wizard | 111.6 | 45.8 | 51.8 | 32.5% |
| **barbarian** | **32.5** | **16.5** | **51.9** | 100% |
| ranger | 30.7 | 14.2 | 39.0 | 100% |

² before = on-disk `endgame-gear.md` frozen at #199 (also reflects the 2-cap, see Q3).

**Read.** The rage uncap moved Barbarian **up at the survival floor**: depth
**24.0 → 33.4 (+39%)** while fighter/rogue/wizard stayed ~20 (a touch down,
likely the harder #216 Ch1–3 fights). It went from "just above the
fighter/rogue/wizard pack" to **co-leader of the floor with Ranger** (33.4 vs
34.8). Rage now fires **1.55×/combat** (every combat, re-rage on lapse) vs the
old per-rest-capped ~1.16. In the **geared** game it goes **deepest** (51.9) but
does **not clear faster than Fighter** (16.5 vs 11.3) and tops A6 at the same
100% as every martial.

**Verdict: WATCH / optional tuning lane (not an emergency).** The "balanced
cluster" did shift — Barbarian + Ranger now lead the bare-soul floor; Fighter
dropped into the pack. But it is **not dominant on the ladder** (Fighter still
first-clears, all martials tie at A6). Rage-halves-physical every combat is the
single best bare-soul survival tool now. If the user wants Barbarian back in the
cluster, the lever is a mild rage cost/duration (it has no per-rest cap and
no-heal-while-raging is its only current tradeoff). Hold otherwise.

---

## Q2 — Wizard after #212 (+#215/#217): output adequate? too tanky/fragile?

**Meta-journey progression** (geared 40×120):

| Metric | pre-#212 | #212 (validated) | now (#215/#217) |
|--------|--------:|--------:|--------:|
| topped A6 | 0% | 37.5% | **32.5%** |
| first A0-clear life | 111.6 | 45.8 | **45.8** |
| mean ascension cleared | 0.97 | 5.15 | **5.10** |
| geared depth | 39.1 | 53.1 | 51.8 |

#215 (Shield UX) and #217 (Fireball/Lightning split) **did not materially move
the wizard** — it holds at its #212-tuned level. It is still the **weakest of
five** (lowest topA6, slowest first-clear by 2–4×).

**(a) Damage OUTPUT — now adequate.** It climbs the ladder (0% → 32.5% A6) and
100% ever-clears the base chain. The #212 scaling Fire Bolt did its job; the
wizard is the slowest closer but no longer a non-finisher.

**(b) Too tanky? — YES, confirmed at matched level.** The decisive instrument is
the matched-level encounter-stress matrix (rogue/fighter/wizard at the slot's
expected level, full resources). The wizard **ends fights at 85–100% HP** vs
Fighter 50–75% / Rogue 30–60%, and **wins encounters that wipe the martials**:

| Encounter (matched lvl) | Rogue | Fighter | Wizard |
|---|---|---|---|
| Taskmaster of the Block (L2 elite) | 4% / 47%HP | 8% / 13%HP | **80% / 50%HP** |
| The Magistrate's Hall — boss (L4) | 84% / 31%HP | 56% / 33%HP | **100% / 44%HP** |
| The Matron Mother — boss (L7) | 72% / 35%HP | 72% / 21%HP | **100% / 57%HP** |

The user's report — *"mage receiving too little damage"* — is **validated**: per
encounter it takes far less damage than the martials. Driver = Mage Armor +
Shield reaction + Blur/Mirror Image + ranged positioning stacking, none of which
the engine threatens enough.

**The paradox** (tankiest per-encounter, weakest in the meta) resolves cleanly:
the meta weakness is **sustained** — slot attrition over a ~62-room run,
chronic under-leveling (the bot's caster handicap), and bare-soul L1 deaths —
not a per-encounter power problem. The residual ladder lag (topA6 32.5% vs 100%)
is the **documented high-ascension back-half closing-power gap** (the standing
future-buff lever from `sim-caster-ai-lane`), unchanged by #215/#217.

**Verdict: HOLD on #212 (it works; wizard is viable).** If the user wants the
mage to *feel threatened* in play (their report), the lever is its **defensive
layering** (Shield/Blur/Mirror Image overlap → too little damage taken at matched
levels), **not** its output. The ascension-scaling closing-power gap is a
separate, still-open buff lever. Both are taste/tuning calls — user's.

---

## Q3 — Ch6 Hades gate after legendary-uncap (#214): too easy?

The sim has equipped **all** owned relics since #204 (no cap in
`chooseActiveLegendaries`); the on-disk before-doc was frozen at #199 (2-active-cap
era). So before/after cleanly isolates the uncap.

**Bare-soul gate (0 Grove, 0 legendary) — INTACT:**

| Class | reached Ch6 | cleared run |
|-------|--------:|--------:|
| fighter | 0.0% | 0.0% |
| rogue | 0.0% | 0.0% |
| wizard | 0.0% | 0.0% |
| barbarian | 0.0% | 0.0% |
| ranger | 2.9% | 1.4% |

**8+ legendaries owned → Ch6-CLEAR%** (the maxed-collection ceiling):

| Class | before (#199, 2-cap) | after (uncapped) |
|-------|--------:|--------:|
| fighter | 15.3% | **52.0%** |
| rogue | 8.4% | **36.8%** |
| wizard | 0.3% | **3.5%** |
| barbarian | 7.2% | **17.5%** |
| ranger | ~14% | **53.8%** |

Runs-to-first-Ch6-clear (martials): **26–49 before → 11–23 after.**

**Read.** The gate's **core HOLDS**: bare souls ~0%, 1–2 legendaries still
single-digit Ch6-clear, first clear still **many runs** (11–23). But the **maxed
ceiling got much more generous** — a soul with 8+ relics now clears Ch6 ~3× more
often (fighter 15→52%, ranger 7→54%), the direct and expected consequence of
equipping 8+ relics instead of 2. Time-to-first-clear roughly halved.

**Verdict: HOLD the gate (still gates — bare fails, grind-gated, many runs).**
But **FLAG**: #204→#214 uncap roughly tripled the veteran clear rate and halved
time-to-first-clear. If the user wants Ch6 to stay punishing for veterans too,
the uncap is the lever pushing the other way (a soft cap, or per-relic
diminishing returns) — a taste call, **not** a sim-mandated fix. The Hades shape
survives.

---

## Q4 — the ~55% blowout: still that high?

**sim-feel (RUNS=40, 800 runs):**

| Metric | before | after |
|--------|--------:|--------:|
| blowouts (won, HP never < 80%) | 55.7% | **54.8%** |
| dead turns | 22.5% | 22.3% |
| revealed autopilot | 32.0% | 31.6% |
| near-death-and-recover | 0.8% | 0.8% |

Per-chapter blowout (non-boss): Ch1 **76.3%**, Ch2 58.0%, Ch3 53.2%, Ch4 44.8%,
Ch5 40.1%. #216's own diagnostic measured Ch1 79.4 / Ch2 59.1 / Ch3 51.9 → barely
moved (Ch3 even up).

**Why #216 barely shows here:** sim-feel uses fixed start levels [1,3,5,7] and
walks each through the whole delve, so an L7 character stomps a 14-HP Ch1 goblin
exactly as easily as a 7-HP one — the **over-leveling artifact swamps the HP
boost**. The matched-level matrix confirms #216 made the goblin warmup last ~1
more round (wizard 1.1r → 1.9r) but the player still **ends at 75–95% HP** → still
a blowout. The HP boost helped at L1 only.

**Verdict: still ~55% in sim-feel; #216's warmup-HP approach barely moved
per-encounter tension.** Feedback for the ongoing encounter-tension lane: the
dominant blowout driver is low **warmup damage/threat** (and the over-level
artifact), not enemies dying too fast — boost warmup damage or add bodies rather
than HP. The matched-level matrix shows **mid/elite slots already have good
tension** (50–65% HP, 60–92% win); the problem is concentrated in warmups.
sim-feel's aggregate is a weak scoreboard for this fix — use the matched-level
matrix.

---

## Q5 — overall 5-class viability: anyone dominant or dead?

**No class dead; none runaway-dominant.**

- **Floor tiering** (loot-blind): Barbarian (33.4) ≈ Ranger (34.8) lead;
  fighter/rogue/wizard cluster ~20.
- **Geared ladder:** all four martials top A6 100%; first-clear order Fighter
  11.3 < Ranger 14.2 < Barbarian 16.5 < Rogue 23.4. Wizard topA6 32.5%,
  first-clear 45.8 — the laggard but viable.
- **High side:** Barbarian (best bare-soul survivor, deepest geared) — the watch
  candidate (Q1).
- **Low side:** Wizard (weakest ladder climber; per-encounter it is actually the
  *tankiest* — its meta lag is sustain/AI-floor + the high-ascension closing gap,
  Q2).

Healthy spread. Two flags, both user-decision tuning levers, neither breaking the
game: Barbarian up at the floor; Wizard's defensive over-tankiness + ascension
closing-power gap.

---

## Gate / assertion audit (the re-tighten line item)

Audited every sim gate against the current build:

- **All 870 tests pass; build green.** No sim gate or assertion is currently
  wrong for the build → **none re-tightened** (this audit is the deliverable).
- `encounterStress.takeTurn.test.ts` seed-pin (goblin 14 HP, dmg 11, survives one
  hit) is **correct** — #216 already re-baselined it (goblin 7→14).
- Always-on sim gates (`encounterStress`/`bossesDeep` rows>0; `sim-events` /
  `sim-event-flow` structural + CHA-monotonic deception check) are **loose and
  correct**.
- `sim-economy` / `sim-difficulty-curve` are **stale by design** (old fixed
  ~37-room 4-chapter model; print near-100% death). Their smoke assertions
  (`goldByRoom.length === 37`) pass against that stale internal model and were
  left untouched — fixing them means a full 6-chapter rewrite, out of this lane's
  scope. Noted as stale, not trusted, not used for any verdict above.

## One-line verdicts

- **Barbarian (#213):** re-strengthened at the bare-soul floor (now co-leads with
  Ranger, depth 24→33) but **not ladder-dominant** — WATCH / optional mild-tuning,
  not urgent.
- **Wizard (#212/#215/#217):** output now adequate (0%→32.5% A6); **too tanky**
  per matched-level data (ends fights at 85–100% HP, validates the user) — HOLD
  #212, defensive-layering is the lever if a buff/feel change is wanted.
- **Ch6 gate (#214):** core HOLDS (bare ~0%, first clear 11–23 runs) but the maxed
  ceiling tripled (8+ relics: ~15%→~52% clear) — HOLD, flag the uncap as a lever
  if veterans should still struggle.
