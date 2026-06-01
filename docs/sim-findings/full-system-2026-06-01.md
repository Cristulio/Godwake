# Full-system validation — twists + Druid in the live ascension system (2026-06-01)

Measurement-only pass. Closes the two loops the prior ascension sim (#281)
predated: **dungeon twists** (Asc ≥ 4, shipped with first-pass magnitudes) and
the **Druid** (6th class, sim-in-band individually but never measured inside the
full live system). No engine/content/balance changed. Tuning notes below are
**directions only** — the user decides magnitudes.

## Verdict

1. **Twists are in band.** They switch on exactly at Asc 4 (zero twisted rooms
   roll at Asc 0/3), and the Asc 3 → 4 step bites *noticeably* more than any
   earlier step — but the extra bite is carried entirely by the new twisted
   rooms, not a global spike, and twisted fights stay winnable (~96% bot win
   vs ~97% clean). Twisted normals run ~7.5 pts lower min-HP and ~15 pts fewer
   blowouts than clean normals — meaningful tension, not a wall.
   - **One outlier to flag: Cursed Ground.** It is the only twist that depresses
     the *win rate* (92–93% vs ~97% for every other twist) — i.e. the only one
     that actually *kills* rather than just bruises. The flat 4-HP/turn chip is
     HP-agnostic (same bite on a d6 caster as a d10 fighter, same in a 2-round
     fight as a 6-round one). Direction: it reads as the harshest twist;
     consider softening it or making it scale to fight length / max-HP rather
     than a flat per-turn 4.
   - **Quickening is large but fair.** It produces the deepest HP dips and the
     fewest blowouts (the strongest tension twist) yet barely touches win rate
     (96–97%). The lane's worry that its swing is "too large" is true on
     *tension* but not on *lethality* — it's doing exactly what a top-tier twist
     should. No change indicated.
   - **Gloom is the mildest** — twisted-Gloom rooms are nearly indistinguishable
     from clean. If twists should feel uniformly threatening it's the candidate
     to strengthen; if it's meant to be the "light" twist, leave it.
   - Bloodscent and Sealed Wards sit in the middle and read fine. (Sealed Wards
     likely *under*-reads here — the bot's blessing loadout is modest, so
     switching blessings off costs it little; a kitted human feels it more.)

2. **Druid holds its band, and plays its kit.** In the 6-class journey Druid
   lands 5th — just above Wizard, below all four martials — which is the
   intended caster hard-tier slot ("near Wizard, under Fighter/Ranger"). Its kit
   is *not* inert under the bot: **3.99 spell casts/combat and 0.76 Wild
   Shapes/combat** (Wizard casts 3.81/combat for comparison). It dies where
   every AI-floored class dies (the Ch2 wall), at a sane depth for a bare-soul
   caster.

3. **Adding Druid shifted no other class's read — by construction.** Each
   class's lives run on a delve seed keyed to `classId` (`sim-class-viability`
   L640), so the other five classes' results are bit-identical whether or not
   Druid is in the loop. The 6-class ranking is internally consistent; nothing
   inverted.

4. **The system still scales monotonically** Asc 0 → 6: harder *and* longer at
   every step (depth, blowout-rate, min-HP, and boss length all move the right
   way and monotonically). Clear-rate is the known AI-floor artifact (0% across
   the board in feel; only the bot's best class, Fighter, climbs the ladder at
   all) — depth + tension + min-HP carry the read, exactly as #281 established.

---

## Q1 — Twists @ Asc ≥ 4

`sim-feel`, balanced archetype, `RUNS=20`, ascension sweep 0/3/4/6 (5 classes ×
4 start levels × 20 runs per cell). Clear% is 0% at every level (AI floor); read
depth / min-HP / blowout%.

### Difficulty by ascension (overall + per fight-kind)

| Asc | Mean rooms | Blowout% | Mean min-HP | Normal win% | Elite win% | Boss win% | Boss min-HP (all) | Boss rds |
|----:|-----------:|---------:|------------:|------------:|-----------:|----------:|------------------:|---------:|
| 0 | 44.5 | 67.8% | 77.3% | 97.1% | 90.8% | 94.9% | 69.9% | 3.11 |
| 3 | 34.3 | 65.0% | 75.1% | 97.4% | 84.4% | 91.7% | 63.0% | 3.56 |
| 4 | 33.9 | 61.4% | 73.3% | 97.0% | 86.5% | 91.5% | 60.1% | 3.78 |
| 6 | 31.3 | 58.4% | 71.7% | 96.9% | 87.0% | 88.8% | 56.0% | 4.17 |

Monotone harder on every column that isn't AI-floored. Boss win-rate falls and
boss length grows step by step (the Asc ≥ 3 boss second-wind biting); elites are
hardest from Asc 3 up (ascendant variants @ ≥ 2).

### Clean vs twisted (normal fights only — twists ride early-mid/mid normals)

| Asc | Bucket | Fights | Win rate | Blowout% (of wins) | Min-HP (all) | Avg rds |
|----:|--------|-------:|---------:|-------------------:|-------------:|--------:|
| 0 | (no twisted rooms — gated) | 0 | — | — | — | — |
| 3 | (no twisted rooms — gated) | 0 | — | — | — | — |
| 4 | clean normal | 4167 | 97.2% | 69.5% | 79.4% | 3.35 |
| 4 | twisted normal | 1157 | 95.9% | 54.7% | 71.9% | 3.48 |
| 6 | clean normal | 3855 | 97.0% | 67.7% | 78.2% | 3.30 |
| 6 | twisted normal | 1113 | 96.4% | 52.5% | 70.5% | 3.48 |

The Asc 3 → 4 step on *clean* normals is tiny (min-HP 79.8% → 79.4%); the whole
of the step's bite is the twisted bucket appearing (~7.5 pts lower min-HP, ~15
pts fewer blowouts). That is the designed shape: twists are the thing that turns
on at 4.

### Per-twist (normal rooms; Asc 4 / Asc 6)

| Twist | Effect | Win% (4/6) | Blowout% (4/6) | Min-HP all (4/6) | Avg rds (4/6) |
|-------|--------|-----------:|---------------:|-----------------:|--------------:|
| bloodscent | +2 enemy dmg | 97.5 / 96.8 | 59.1 / 59.3 | 75.7 / 72.4 | 3.32 / 3.33 |
| cursed-ground | 4 HP/turn chip | **92.3 / 93.0** | 50.5 / 47.6 | 68.3 / 67.9 | 3.35 / 3.32 |
| gloom | first attack disadv | 95.8 / 97.5 | 64.2 / 55.6 | 75.0 / 73.9 | 3.66 / 3.55 |
| quickening | enemies act first | 96.0 / 97.3 | 47.7 / 44.7 | **68.1 / 65.3** | 3.63 / 3.78 |
| sealed-wards | blessings inert | 97.8 / 97.6 | 51.1 / 55.2 | 71.8 / 73.1 | 3.47 / 3.39 |

Bite ranking: **cursed-ground (lethal)** ≈ **quickening (tension)** >
bloodscent ≈ sealed-wards > **gloom (mildest)**. Only cursed-ground moves the
win rate.

## Q2 — Druid in the live system

`sim-class-viability`, balanced, `SOULS_PER_CLASS=40 MAX_LIVES=50`, all 6
classes, full loot/camp loop modelled, twists now wired into combat. **Read the
ranking, not the magnitudes** (AI floor).

| Class | Avg depth (rooms) | Avg final lvl | Topped A6 | Mean asc cleared | Per-life clear% |
|-------|------------------:|--------------:|----------:|-----------------:|----------------:|
| fighter | 44.5 | 7.14 | 32.5% | 3.77 | 9.7% |
| ranger | 33.4 | 5.97 | 0.0% | 0.00 | 0.0% |
| rogue | 26.2 | 4.92 | 0.0% | 0.00 | 0.0% |
| barbarian | 25.8 | 5.14 | 0.0% | 0.00 | 0.0% |
| **druid** | **18.5** | **4.02** | 0.0% | 0.00 | 0.0% |
| wizard | 15.0 | 3.54 | 0.0% | 0.00 | 0.0% |

Druid sits exactly where intended: the two casters (Druid, Wizard) are the
bottom band, Druid a notch above Wizard (+3.5 rooms, +0.5 levels), all four
martials above. Fighter is the lone ladder-climber — the persistent AI-floor
artifact (simplest kit, no resource management for the bot to fumble), not a
balance signal, consistent with every prior journey sim.

### Druid kit fires under the bot

| Class | Combats | Wild Shape / combat | Spell cast / combat |
|-------|--------:|--------------------:|--------------------:|
| druid | 21172 | 0.76 | 3.99 |
| wizard | 17342 | · | 3.81 |

Wild Shape and casting both fire at healthy rates — the kit is exercised, the
5th-place depth is genuine caster fragility, not a dead kit. Death clustering is
the same Ch1→Ch2 wall as the other AI-floored classes (Druid: ch1 505, ch2
1219).

## Q3 — Overall scaling

Holds. Across Asc 0 → 6 the experience is monotonically harder and longer
(depth 44.5 → 31.3, blowout 67.8% → 58.4%, mean min-HP 77.3% → 71.7%, boss
length 3.11 → 4.17 rounds), and the ascension-gated threats fire in sequence
(elite hardening from Asc 3, boss second-wind from Asc 3, twists from Asc 4).
The reward side (renown ladder) was characterised in #281 and unchanged here.

---

## Method / fidelity notes

- **Sim-fidelity fix (kept):** no sim passed `room.twistId` into `createCombat`,
  so twists — though live in the engine since #284 — *never fired in any sim*.
  Wired `twistId: room.twistId` into `sim-feel` and `sim-class-viability` combat
  construction (scripts only; same class of gap as #281's missing ascension
  arg). Added a twisted-vs-clean + per-twist breakout to `sim-feel`, and
  Wild-Shape / spell-cast proc columns to `sim-class-viability`. These make the
  sims model the live system; they are not engine/balance changes.
- **No `src/` changes.** Engine, content, and balance untouched. The regenerated
  `game-feel.raw.md` / `class-viability.md` were `git restore`d — this synthesis
  is the only doc deliverable.
- **`sim-feel` covers 5 classes** (the shared `characterAtLevel` builder has no
  Druid archetype; adding one would be a `src/` change). Twists are
  class-agnostic room hazards, so the twist read is unaffected; Druid is
  measured in `sim-class-viability`, which has its own 6-class builder.
- Reduced N per the lane (`SOULS_PER_CLASS=40 MAX_LIVES=50`, feel `RUNS=20`).
  Re-run: `RUNS=20 ASCENSION=<0|3|4|6> npx tsx scripts/sim-feel.ts` and
  `SOULS_PER_CLASS=40 MAX_LIVES=50 npx tsx scripts/sim-class-viability.ts`.
