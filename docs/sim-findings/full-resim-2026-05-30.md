# Full re-sim of the 6-chapter + gear whole — curated findings (2026-05-30)

Branch `feat/full-resim`. After the big 2026-05-30 push (6-chapter run wired, the
whole Diablo gear economy, the XP re-tune, Mirror Image nerf, the Rage tradeoff),
this re-validates balance against the new whole. **Report only — no gameplay code
was changed.** The deliverable is this reading plus a re-tightening of the loose
sim gates.

Sims run on `feat/full-resim` @ main `3289270` (the Ranger non-spatial payoff,
PR #196, is on a separate branch and is **not** in this build).

## TL;DR

- **The full 6-chapter run is completable by a real player (the user has done it
  by hand), but NOT by the sim bots** — 0% clear across every class, every start
  level, every sim. This is the expected consequence of two things stacking: the
  run roughly **doubled in length** (~62-66 rooms on a route to the Ch6 final
  boss, up from the old ~37/4-chapter chain), and the bots play the **AI floor
  with no loot modelled**. Read everything below RELATIVE/structural, never as
  absolute game truth (the standing balance caveat).
- **Both new classes are healthy and fire their kits.** Barbarian is the
  strongest at the floor (deepest reach; Rage fires ~1.16×/combat even after the
  no-heal-while-raging tradeoff). Ranger's kit fires fine; its only weakness is
  the **bare-soul L1 early game**, not its abilities.
- **The XP re-tune holds for Ch1–Ch3** (bots level smoothly to ~L4–5 mid-run, no
  new cliff). **Ch4–Ch6 leveling is unmeasured** — the bots die before they get
  there.
- **Death clusters in Ch1–Ch2.** The single biggest spike is the **Ch2 boss
  (Athkatla Magistrate)**, then the Ch1 boss/elite. **Ch5 IS sampled** by the
  Grove-fed reincarnation chain (all classes reach it; the **Ch5 boss Hollow Dawn
  is a real melee spike**), but **Ch6 (the-unmade) is barely reached — a thin tail
  of deep souls — and is never cleared (0%)**, so its boss tuning is effectively
  unvalidated. The fixed-level feel/crossFeature sims don't reach Ch5/Ch6 at all.
- **Gear caveat (important): no sim models drops/affixes/legendaries.** All reads
  are a **no-loot floor**; real runs are stronger.

## Sims run

| Sim | Scope | How |
|-----|-------|-----|
| `scripts/sim-class-viability.ts` | 5 classes × 150 souls × ≤150 lives, reincarnation up the A0→A6 ladder, one route per run | `SOULS_PER_CLASS=150 MAX_LIVES=150 npx tsx scripts/sim-class-viability.ts` |
| `scripts/sim-feel.ts` | 5 classes × {L1,L3,L5,L7} × 40 = 800 full-delve runs at A0, instrumented for texture | `RUNS=40 npx tsx scripts/sim-feel.ts` |
| `src/sim/rogueSim.test.ts` | Rogue {L1,3,5,7} × {vanilla,loaded} × 50 | gate (re-tightened) |
| `src/sim/immortalHypothesisSim.test.ts` | 3 classes × 3 levels × 7 loadouts × 30 = 1890 delves | gate (re-tightened) |
| `src/sim/crossFeatureStressSim.test.ts` | 4 stacked-build scenarios × 500, L7 | gate (re-tightened to 6 chapters) |

Both path-aware sims route ONE path through the procedural branching map (one
fork per layer to the final boss), which is how a player experiences a run.

> ⚠️ **AI-floor caveat (applies to every number here).** The shared Auto-Battle
> policy underplays a competent human; absolute clear-rates / reach are an
> artifact, not game truth ([[feedback-balance-from-sims]], and the
> `character-order` / `rogue-meta-journey-sim2` caveats). The robust signal is
> RELATIVE (class vs class, chapter vs chapter) and STRUCTURAL (where the run
> shape changed), never the magnitudes.

## The gear caveat — sims model NO loot

None of the sims roll gear drops, affixes, rarity, or legendaries. They build
characters from class **presets** (white starting gear) plus Grove upgrades /
pre-stamped blessings, and clear combats without ever resolving a drop
(`resolveRoomVictory` / `rollGearDrop` / `rollItem` are not on any sim path).

Consequence: **every survivability and throughput number is a floor.** The whole
Wave 1+2 Diablo economy — low-chance drops that climb by source (mob 12% → elite
35% → boss 70%), rolled affixes, purple/legendary scaling, banked legendaries
carrying across runs — only makes real runs *stronger*. So a "0% clear" floor is
fully consistent with a real, loot-fed, competently-played run clearing.

**On a "drops on" toggle:** it's feasible (`rollGearDrop` → `rollItem` →
`equipItem` are clean functions) but a *trustworthy* one needs a real
effective-power comparator before equipping — `equipItem` does no quality check,
so a naive "equip every drop" would happily downgrade a longsword to a green
dagger and *understate* loot, misleading the read in the wrong direction. Rather
than ship a half-correct model that biases the floor, this lane **flags** it:
the loot upside is real and unmeasured, and a proper drops-aware viability pass is
a worthwhile follow-up (roll → greedy-equip-if-strictly-better → the existing
`createCombat` affix application already feeds it into combat).

## 1. Is the full 6-chapter run completable?

**At the AI floor + no loot: no class clears it, anywhere.**

- **Viability (reincarnation chain):** 0% A0-clear and 0% topped-A6 for all five
  classes across 150 souls each. Mean depth tops out at the Barbarian's **28.7
  rooms** of a ~65-room route — roughly halfway.
- **Feel (fixed start levels):** 0% clear in **every** class × level cell,
  including start **L7**. Even a Fighter starting at L7 reaches only ~31–36 rooms.
- **rogueSim / immortal / crossFeature:** 100% death in every cell. The
  best-equipped L7 stacked builds (crossFeature) kill the **Ch4** Matron (Fighter
  13.8%, Rogue 18.2%) and then die in Ch5; **none reach the Ch6 final boss.**
- **The viability reincarnation chain reaches deeper** because souls accumulate
  Grove upgrades over many lives: a meaningful fraction of lives reach **Ch5**
  (Barbarian dies there 6513×, Rogue 3170×) and a thin tail reaches **Ch6**
  (Barbarian 310 lives, Rogue 185) — but **the-unmade wins 100% of those fights.**
  So Ch6 is reached, never beaten, and only by a small-n tail.

This is a STRUCTURAL shift, not a class problem. Wiring Ch5+Ch6 (#194) ~doubled
the run; the prior economy-xp sim (pre-#194, 4-chapter chain) still squeaked out
single-digit clears (Barbarian topped A6 ~8%). The longer run pushed the finish
past the bot's reach. The practical upshot: **the sim can no longer measure a
full clear or confidently judge the Ch6 endgame boss** — that now needs a
competent-play probe (or a higher floor: model loot, or start the probe deeper).

## 2. Per-class balance (relative)

### Viability — depth & level are the only differentiators (all clears are 0)

| Class | Avg depth (rooms) | Avg final lvl | Rage/combat | Reckless/combat | HMark cast | Colossus | Mark die |
|-------|------------------:|--------------:|------------:|----------------:|-----------:|---------:|---------:|
| barbarian | **28.7** | **5.37** | 1.16 | 1.66 | · | · | · |
| rogue | 20.3 | 4.17 | · | · | · | · | · |
| wizard | 19.9 | 4.33 | · | · | · | · | · |
| fighter | 18.8 | 4.08 | · | · | · | · | · |
| ranger | **15.0** | **3.41** | · | · | 1.52 | 0.96 | 2.82 |

### Feel — mean rooms reached by start level (A0)

| Class | L1 | L3 | L5 | L7 |
|-------|---:|---:|---:|---:|
| barbarian | 13.7 | 41.6 | 44.0 | **45.1** |
| ranger | 8.4 | 42.5 | 41.8 | 38.5 |
| fighter | 10.2 | 35.7 | 34.4 | 30.9 |
| rogue | 9.4 | 34.1 | 34.4 | 35.0 |
| wizard | 13.9 | 20.0 | 19.2 | 22.6 |

**Barbarian — strongest at the floor, post-Rage-tradeoff.** Deepest reach in both
sims, highest level. Rage fires ~1.16×/combat and Reckless ~1.66×/combat — the
no-healing-while-raging tradeoff did **not** gut it, because the blunt
trade-blows AI floor wins most fights without needing to heal mid-rage, so the
lost healing rarely bites the bot. Rage halving physical damage every combat
remains a uniquely strong, renewable survivability lever → **Barbarian is the
"watch the high side" candidate** for a tuning pass (Rage uptime / resistance),
though a competent player narrows the gap by extracting more from the finesse
classes. NB: this is the bot's view; the tradeoff likely matters MORE in real
play (where heal-denial during a hard fight is felt).

**Ranger — kit fires fine; the weakness is the L1 bare soul, not the abilities.**
Hunter's Mark casts 1.52×/combat, lands 2.82 mark dice/combat, Colossus fires
0.96×/combat. The viability sim ranks it shallowest (15.0), but that's an artifact
of the reincarnation chain restarting every life at **L1**, where the Ranger
(d10 HP, leather, no defensive value for range) dies fast and repeatedly. The feel
sim, which starts at fixed levels, shows the opposite once past L1: the Ranger
reaches **among the deepest** rooms at L3–L7 (38–42), second only to Barbarian.
So the Ranger reads as a strong-once-leveled, brittle-early class. The
non-positional engine still gives its ranged identity zero defensive benefit — the
separately-shipped Ranger payoff (PR #196) is the intended fix and is **not** in
this build, so re-sim it once merged.

**Trusted three:** Fighter and Rogue sit mid-pack (deep once leveled, L1-fragile).
Wizard reaches the fewest rooms — the known **AI-floor caster handicap** (the bot
spends slots sub-optimally and has no defensive value), not a balance signal. Its
dead-turn rate is the lowest of all (3.0%) because it always has a spell to cast.

## 3. Does the XP re-tune hold across 6 chapters?

**For Ch1–Ch3: yes.** Bots level smoothly to ~L4–5 by the time they die mid-run
(viability mean final level 3.4–5.4), and there is **no new under-leveling cliff**
— the flattened L3→L4 band and the loosened upper bands ([[dd-roguelite-2026-05-30-economy-xp-lane]])
carry routed play without the old ghast-wrecks-Ch1 collapse. Deaths are NOT
concentrated at level-up walls; they're at boss/elite spikes (below).

**For Ch4–Ch6: unmeasured.** The bots die in Ch1–Ch3 the large majority of the
time, so there is no sample of late-game leveling to judge over/under-leveling at
the back half. The XP curve's late bands are **unvalidated by sim** — flag for a
competent-play or higher-start-level probe.

## 4. Chapter / enemy spikes

Deaths cluster in **Ch1–Ch2** across all classes. Top kill-rooms (viability,
share of that class's deaths):

- **Ch2 boss — Athkatla Magistrate** is the single biggest wall: **Wizard 12.7%**,
  Barbarian 9.2%, Fighter 6.9%, Rogue 5.0%, Ranger 4.6%. Highest-leverage spike
  to look at if any.
- **Ch1 boss — Duergar Ilyich**: Ranger 9.7%, Rogue 7.5%, Fighter 6.8%. A Ch1
  wall for the squishier weapon classes.
- **Ch1 elite — Duergar Taskmaster**: Fighter 7.0%, Ranger 6.1%.
- **Ch3 boss — Asylum Director**: Wizard 6.5% (the Hold Person WIS-save wall;
  consistent with the long-standing caster-vs-Director note).
- **Ch5 boss — Hollow Dawn**: Barbarian 7.4% (its #2 kill-room). Ch5 as a whole
  is reached by every class in the Grove-fed chain (Ch5 deaths: Barbarian 6513,
  Rogue 3170, Fighter 1445, Ranger 1162, Wizard 148), so **Ch5 IS sampled** and
  reads as a genuine melee-class spike around Hollow Dawn.

**Ch6 is the real gap.** the-unmade (Ch6) is reached only by a thin tail of deep,
Grove-fed souls (Ch6 deaths: Barbarian 310, Rogue 185, Ranger 43, Fighter 8,
Wizard 0) and **wins 100% of those fights** — too few attempts, all losses, to
judge whether it's correctly tuned or simply unreachable-then-lethal. The
fixed-level feel/crossFeature sims never reach Ch5/Ch6. So: **Ch5/Hollow Dawn is
testable and looks spiky for melee; Ch6/the-unmade is effectively UNVALIDATED**
(small-n, never beaten). The two freshest, untuned chapters are the least-covered.

## 5. Game-feel texture (A0, 800 runs)

Structural feel is healthy and matches the prior reading:

- **Pacing:** avg **3.79** rounds/fight (non-boss 3.68, boss 4.40); ~80% of fights
  finish in ≤5 rounds. No slog.
- **Agency:** **10.28** path choices/run (the branching map is doing its job),
  2.54 shrine blessing picks/run, 1.45 shop nodes/run.
- **Dead turns:** 24.7% of player turns have no real lever; 35.9% are "revealed
  autopilot" (just attacked the lone enemy). By class the texture differs sharply
  — Wizard 3.0% (always a spell), Fighter 19.3%, Barbarian 28.9%, Rogue 30.6%,
  **Ranger 36.7%** (highest; the payoff lane should help here too).
- **Tension:** 50.6% of wins are zero-tension blowouts (HP never < 80%); only 0.9%
  are near-death-and-recover. Combat skews comfortable at the floor — expected,
  since loot/competent play (which would let the player push harder content) isn't
  modelled.
- **Variety:** Barbarian has the richest action mix (entropy 1.33: attack/reckless/
  rage); Wizard the narrowest (0.25, cast-spam). 17.6 distinct enemy types/run.

## 6. Sim gates — re-tightened to current reality

The three `src/sim` balance "tests" carried intentionally LOOSE guard-rails
pending balance settling ([[dd-roguelite-sim-test-gates]]). Re-tightened to the
6-chapter reality (snug bands with reasonable slack; all pass on current main):

- **`rogueSim.test.ts`** — `avgRoomsCleared ≤ 58 → ≤ 70` (a routed clear is ~66
  rooms now); `avgChaptersCleared ≤ 4 → ≤ 6`; anti-immortal floor `minDeathRate >
  0.3 → > 0.6` (every cell is at 100% death today). Also fixed the harness:
  full-clear `chaptersCleared` 4 → 6, and the "/4" report label → "/6".
- **`immortalHypothesisSim.test.ts`** — tightened the aggregator-cap invariant
  `tHP_C ≤ tHP_B + 1.5 → + 1.0` (the gap is ~0.05 today; additive stacking would
  push it to ~+2.5), and added snug per-loadout bounds: `tHP_A < 0.5` (vacuum
  grants none) and `tHP_B > 1.0` (a single blessing grants a real chunk). Verdict
  stays REFUTED.
- **`crossFeatureStressSim.test.ts`** — made it a correct 6-chapter gate. The sim
  now tracks boss kills + deaths for **Ch1–Ch6** (was Ch1–Ch4), adds a
  `killedFinalBoss` (the-unmade, Ch6) flag, and repoints `reachedFinalBoss` to the
  real final boss. The anti-dominance gate now keys off the **Ch6 final-boss kill**
  (was the now-mid-game Ch4 Matron); `avgChaptersCleared ≤ 4 → ≤ 6`; the
  accessibility floor `pauper Ch1 > 0 → > 0.3`. Stale Phase-1/Matron-as-endgame
  prose and a divide-by-zero in the recommendation were corrected.

The other `scripts/*.test.ts` were left as-is: `sim-event-flow` already has real
PR-#84 regression assertions; `sim-events` is a report-writer with no gate;
`sim-fighter` / `sim-economy` heavy matrices are `RUN_SIM`-gated (smoke only in
CI). See the flag on `sim-economy` below.

## 7. Flags for a follow-up tuning pass (NOT fixed here)

1. **Ch6 (the-unmade) is effectively untested; Ch5/Hollow Dawn looks spiky.**
   The viability chain reaches Ch5 in volume (Hollow Dawn reads as a melee spike)
   but reaches Ch6 only as a small, never-winning tail. Validate the Ch6 endgame
   via competent-play or a deep-start probe before trusting its balance.
2. **`scripts/sim-economy.ts` is stale.** It predates the procedural map and the
   6-chapter run: it hardcodes `ROOM_COUNT = 37`, fixed room IDs (`room-37` as the
   "final boss"), camp IDs `room-11/20/29`, and **walks `delve.rooms` linearly**
   instead of routing the branching map. Its CI smoke (`goldByRoom.length === 37`)
   passes only because the L1 fighter dies before room index 37. It needs a
   path-aware, 6-chapter rewrite (own lane) before its gold matrix is meaningful.
   Left untouched (out of scope for gate re-tightening; overlaps the economy lane).
3. **The 6-chapter run length is a design call.** It out-runs the sim's clear
   signal entirely. Whether that's fine depends on how much loot + real-player
   skill close the gap — which the sims can't see. Worth a deliberate decision:
   is the back half meant to need gear, or is it too long?
4. **Barbarian high-side watch.** Strongest at the floor; Rage's renewable
   physical-damage halving is the lever to keep an eye on if a tune is wanted.
5. **Ranger L1 fragility** is the real weak spot (not the kit). Re-sim after the
   payoff lane (PR #196) merges.

## Files

- Curated: this file.
- Auto-generated raw: [`class-viability.md`](./class-viability.md),
  [`game-feel.raw.md`](./game-feel.raw.md), [`rogue-balance.md`](./rogue-balance.md),
  [`immortal-hypothesis-matrix.md`](./immortal-hypothesis-matrix.md),
  [`../validation-findings/cross-feature-stress.md`](../validation-findings/cross-feature-stress.md).
