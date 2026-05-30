# Hades-style endgame gate — gear-modelled meta sim (2026-05-30)

Branch `feat/hades-endgame`. The 2026-05-30 re-sim flagged a blind spot: **no sim
modelled loot** (drops / shop / affixes / legendaries / sets), so it ran a
no-loot floor and couldn't judge the Hades-style Ch5/Ch6 gate — the design that
the back half is **uncompletable by a bare soul** and only clears once a soul has
banked enough **Grove renown + legendary gear** over **many runs**.

This lane closes that gap. It adds a **gear-aware meta sim**
(`scripts/sim-endgame-gear.ts`) that models the COMPLETE player loop
([[feedback-sims-model-full-player-experience]]) and uses it to **verify the
gate**. **No gameplay magnitudes were changed** — the modelling revealed the
gate is already tuned to the Hades target (see the verdict).

## TL;DR

- **The gate holds, and gear is THE lever.** With loot modelling OFF the sim
  reproduces the documented no-loot floor (**0% clear, every class**); with it ON
  the same souls eventually clear. So the endgame is gated on the meta-gear loop,
  exactly as designed.
- **Bare souls fail the back half.** A soul with **zero Grove ranks AND zero
  legendaries** clears the run **0.0%** of the time in every class, and barely
  reaches Ch5 at all.
- **Meta-power eventually suffices.** Ch6-clear% climbs **monotonically** with
  the banked legendary collection: ~0% bare → single digits at 5–7 relics → **7–15%
  at 8+** for the martials (an AI-floor figure — a competent player clears far
  more reliably). Not trivial, not impossible: the Hades sweet spot.
- **First clear is a milestone, not life ~5.** Runs-to-first-Ch6-clear (mean):
  **fighter ~26, ranger ~31, barbarian ~33, rogue ~49**; wizard ~112 (AI-floor
  caster handicap — see caveat). Many runs of accumulation, as intended.
- **Verdict: HOLD magnitudes.** Every available lever would push the curve AWAY
  from the target (buffing meta → earlier clears; detuning bosses → discouraged;
  opening sets earlier → easier A0). Per [[feedback-balance-from-sims]] the right
  action is to tune FROM the data, and the data says the tuning is already on
  target. Levers + directions are listed below for the user's call.

> ⚠️ **AI-floor caveat (unchanged).** Absolute clear-rates are still a floor — the
> shared Auto-Battle bot underplays a real player. Modelling loot RAISES that
> floor toward real play (which is the whole point), but read the magnitudes
> RELATIVE/structural. The robust signal here is the **gating direction** (bare
> fails / geared eventually clears) and the **monotonic curve**, not the exact %.

## What the sim now models (the re-sim's blind spot)

`scripts/sim-endgame-gear.ts` runs the same reincarnation chain + shared
Auto-Battle policy + `chooseBlessing` scorer as the class-viability sim, plus the
full gear/economy loop:

- **Combat / elite / boss clears** roll **gold** (`rollRoomGoldDrops`), a
  low-chance **rolled affix item** (`rollGearDrop` → `rollItem`) that is
  **greedily equipped only if it improves the loadout** (a real effective-power
  comparator over weapon damage + AC + every affix channel, run through the live
  `equipItem` so class-gates / two-handed-shield swaps / ring routing / attunement
  all apply — fixing the "naive equip downgrades a longsword to a green dagger"
  trap the re-sim flagged), and a rare **legendary** (`rollLegendaryDrop`) **banked
  to the soul's persistent collection**.
- **Shop rooms** spend gold on the rolled arms rack (`rollGearStock`), the
  reliquary **legendary offer** (`rollLegendaryOffer`), and healing potions.
- **The persistent legendary collection accumulates ACROSS lives.** Before each
  descent the soul **attunes its best loadout within the ascension slot-cap**
  (`legendarySlotCap`), preferring **set completion**, and the aggregate
  (incl. **set bonuses**) is baked onto the character via
  `aggregateLegendaryBonuses`.
- **The Grove is bought greedily INCLUDING the ascension-gated endgame nodes**
  (`wellspring-depths` A1, `crown-of-the-returned` A3) — which the standing sim's
  priority lists never bought, so its souls never reached real endgame power.

Because the engine already reads affix mods (`createCombat` / `playerAttack` /
`monsterAttack`) and legendary bonuses (`derived.ts`), equipping rolled gear onto
the sim character feeds combat with no extra plumbing.

## Fidelity check — loot OFF reproduces the floor, loot ON opens the gate

Same 40 souls/class × ≤120 lives, the only difference is `MODEL_GEAR`:

| Class | A0-clear (no loot) | A0-clear (loot) | depth (no loot → loot) |
|------|------------------:|---------------:|:----------------------:|
| fighter | 0.0% | **100.0%** | 23.8 → 38.0 |
| rogue | 0.0% | **100.0%** | 24.7 → 32.0 |
| wizard | 0.0% | 25.0% | 22.1 → 39.1 |
| barbarian | 0.0% | **100.0%** | 33.9 → 44.9 |
| ranger | 5.0% | **100.0%** | 36.4 → 34.6 |

The no-loot column matches the 2026-05-30 re-sim (0% clear, barbarian deepest).
Loot is what carries souls from "halfway and dead" to a clear — the design's
central claim, now measured.

## The gate curve — Ch6-clear% by legendaries owned (Ascension 0)

A0 lives (the base six-chapter run), bucketed by relics banked at descent. The
Hades shape: bare fails, clears emerge only once the collection is deep.

| Legendaries | fighter | rogue | barbarian | ranger | wizard |
|------------|--------:|------:|----------:|-------:|-------:|
| **0 (bare)** | 0.0% | 0.0% | 0.4% | 0.6% | 0.0% |
| 1–2 | 0.4% | 0.4% | 0.0% | 1.4% | 0.0% |
| 3–4 | 2.9% | 0.4% | 0.0% | 0.0% | 0.0% |
| 5–7 | 9.9% | 3.6% | 3.0% | 6.3% | 0.0% |
| **8+** | 15.3% | 8.4% | 7.2% | 14.0% | 0.3% |

(Reached-Ch5 / reached-Ch6 climb in lockstep — see the auto-generated
[`endgame-gear.md`](./endgame-gear.md) for the full tables.) The tiny non-zero
"0 (bare)" cells (barb 0.4%, ranger 0.6%) are deep-Grove / zero-legendary lives
within AI-floor noise; the strict bare gate below is clean.

## Bare-soul gate (zero Grove AND zero legendaries)

The strictest reading of "cannot complete without renown AND legendaries":

| Class | Bare lives | Reached Ch5 | Reached Ch6 | Cleared the run |
|------|----------:|-----------:|-----------:|---------------:|
| fighter | 71 | 4.2% | 2.8% | **0.0%** |
| rogue | 77 | 0.0% | 0.0% | **0.0%** |
| wizard | 63 | 0.0% | 0.0% | **0.0%** |
| barbarian | 60 | 5.0% | 0.0% | **0.0%** |
| ranger | 70 | 1.4% | 0.0% | **0.0%** |

A bare soul never clears, and rarely even reaches the back half. Gate confirmed.

## Per-class notes

- **Fighter / Barbarian / Ranger** are the cleanest fits: bare fail → ~26–33-run
  first clear → eventually top the ascension ladder. Barbarian goes deepest at the
  floor (Rage), consistent with the re-sim's "watch the high side" flag.
- **Rogue** clears later (~49 runs) — squishier early, leans on the collection.
- **Wizard never meaningfully clears (0.3% at 8+).** This is the **known AI-floor
  caster handicap** (the bot spends slots sub-optimally and has no defensive value)
  present in EVERY prior sim — NOT a gate or balance signal, and explicitly NOT a
  reason to detune the endgame. A competent caster clears by hand.

## Tuning verdict — HOLD (no magnitude change), and the levers if the user wants to move it

The brief preferred **meta-power scaling over gutting the bosses** and to **keep
the early grind**. The data shows the gate already lands in the Hades target zone,
and crucially **every lever moves it the WRONG way**:

| Lever (file) | Effect of buffing | Effect of nerfing |
|---|---|---|
| Legendary / set magnitudes (`content/legendaries.ts`, `sets.ts`) | first clear EARLIER (less "many runs") | back half becomes ungated/too hard |
| Slot-cap schedule (`content/legendaries.ts` `legendarySlotCap`) | sets fire at A0 → easier base game | sets unreachable; legendaries weaker |
| Grove endgame nodes (`content/upgrades`) | earlier clears | hurts the legitimate geared clears too |
| Ch5/Ch6 boss/enemy stats (monster files) | trivialises the endgame (discouraged) | gate too hard even for geared souls |

So **no code-side balance change is warranted by the data.** If the user wants to
deliberately shift WHERE first-clear lands (e.g. push the fighter's ~26 runs out
toward ~40 for a steeper Hades climb, or open legendary SETS earlier so the
set-chase matters during the base game rather than only on the ascension ladder),
the table above is the menu — but that is a taste call on the target, not a
correction the sim is asking for.

## Caveats / flags

- **AI-floor + relative read** still applies to all magnitudes (above).
- **Slot cap = 2 at A0** means legendary SETS (Vigil needs 3 pieces) don't fire
  during the base-game gate — by design they're an **ascension-ladder** power
  chase ([[dd-roguelite-gear-redesign]]). The base game clears on ~2 attuned
  relics + Grove + accumulated affix gear; sets are the long game.
- **The martials all top A6** within 120 lives once meta snowballs. That's the
  ascension-ladder (endless-replay) pacing, a separate knob from the Ch6 gate this
  lane targets — flagged, not tuned.
- **In-run affix gear is a greedy-equip model.** It only swaps within-slot when
  the loadout score strictly improves; it doesn't optimise 2H-vs-shield tradeoffs
  or replace the weaker of two rings perfectly. Close to real play, not identical.

## Files / how to run

- New sim: `scripts/sim-endgame-gear.ts` (added to `tsconfig.sim.json` so the
  build typechecks it).
- Auto-generated tables: [`endgame-gear.md`](./endgame-gear.md) — re-run with
  `SOULS_PER_CLASS=40 MAX_LIVES=120 npx tsx scripts/sim-endgame-gear.ts`
  (set `MODEL_GEAR=0` for the no-loot floor control).
- Curated reading: this file.
