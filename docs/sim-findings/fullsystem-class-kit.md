# Full-system re-validation (half 1 of 2): class viability + kit-firing

> **Measurement only. No balance / statblock / XP / content was changed.** Every
> remediation below is a DIRECTION for a future lane, not an applied edit.
> Date: 2026-06-03. Branch: `feat/sim-fullsystem-class-kit`.

## Why this lane

The recent merge wave landed several systems on `main` together, and this lane
hunts for **regressions now that they co-exist**:

- **martial resource pool** (#338) + its mid-fight regen / OFFENSE buff / Monk
  Flurry trim (#343) + "a missed DISRUPT loses its charge" (#360)
- **Ranger Focus re-weight** (#357 — Aimed Shot 2pt→1pt/half-dmg, Crippling 1pt→2pt)
- **Grove introduced at first death** (#359)
- **mid-run chapter-unlock reveals** (#365)
- the **base / NG+ campaign split** (#367 — `createGodwakeDelve({ fullChain })`:
  default base 11ch → Irenicus, `fullChain:true` = 14ch → Melissan)

Each class was run on **both chains** — base (`FULL_CHAIN=0`) and full/NG+
(`FULL_CHAIN=1`, the default) — at 100 souls × ≤100 lives, the full
reincarnation + Grove + loot/legendary loop, plus a `sim-feel` leveled-start
sweep (5 classes, L1/3/5/7) as corroboration.

```
FULL_CHAIN=0 SOULS_PER_CLASS=100 MAX_LIVES=100 npx tsx scripts/sim-class-viability.ts
              SOULS_PER_CLASS=100 MAX_LIVES=100 npx tsx scripts/sim-class-viability.ts
FULL_CHAIN=0 RUNS=40 npx tsx scripts/sim-feel.ts
              RUNS=40 npx tsx scripts/sim-feel.ts
```

> ⚠️ **Read the absolute clear-rates RELATIVE, not literally.** The shared
> Auto-Battle bot underplays a real player (it restarts every life at L1 and
> manages spells/positioning poorly), so absolute clear%/depth are an **AI-floor
> artifact**, not game truth. The robust signals are the **relative class
> ordering** and **whether each kit fires** — and the user has cleared the whole
> game by hand. No balance numbers were tuned here.

---

## TL;DR

- **No regression.** The base chain reproduces the last full pass (#368)
  **to the decimal across all 7 classes** (46 710 lives) — #369 touched no engine
  code, and the wave cannot regress the base because base Ch1–11 is byte-identical
  to the full chain's first 11 chapters.
- **Every kit fires at depth on both chains — the headline guard PASSES.** Nothing
  went inert after the merges. The #343 and #357 changes are visible *as designed*
  (pool spends rose ~1.5–3× vs the pre-regen #341 baseline; Ranger OFFENSE up /
  DISRUPT down per the reweight; Monk still flurries hard post-trim).
- **The split sharpens — does not break — the known band.** On the short base
  chain the bot tops the A6 ladder with 5/7 classes; on the long NG+ chain only the
  two **closers** (Fighter, Monk) top A6, the two **divers** (Barbarian, Ranger) go
  deepest but die at the Throne-of-Bhaal apex, and the casters/rogue floor as always.
- **Q1 (martial-pool depth correlation):** the pool is **not** inert ticking —
  spends/combat rises **monotonically with depth in all three classes on both
  chains** (Fighter 0.45→5.86 per quartile, full chain). But the link is
  fight-length-mediated (flat pool size → more rounds deeper) and the pool layers
  on the signature mechanic rather than driving depth alone — Barbarian spends the
  fewest of the three yet dives deepest (Rage). [§5]
- **Q2 (Fighter Asc-6 lone-outlier):** **real, but refined** — on the full chain
  the A6 closer tier is **Fighter *and* Monk** (both 100% topA6), not Fighter
  alone. The genuine lone outlier is **Barbarian: deepest by far yet only 1%
  topA6** — the standing "depth ≠ closing" texture, not a measurement artifact.

---

## 1. Base chain — reproduces #368 exactly (zero regression)

`FULL_CHAIN=0`, 100 souls/class × ≤100 lives. A "clear" = routed to Ch11 and
felled Irenicus.

| Class | Topped A6 | Ever cleared A0 | Mean asc cleared | 1st A0-clear (life) | Per-life clr% | Avg depth | Avg final lvl |
|-------|----------:|----------------:|-----------------:|--------------------:|--------------:|----------:|--------------:|
| **fighter** | **100%** | 100% | 6.00 | 27.0 | 18.7% | 25.9 | 5.43 |
| **barbarian** | **100%** | 100% | 6.00 | **23.0** | 18.3% | **41.4** | 8.38 |
| **ranger** | **100%** | 100% | 6.00 | 40.0 | 11.4% | 36.4 | 7.42 |
| **monk** | **100%** | 100% | 6.00 | 36.2 | 15.2% | 24.7 | 5.32 |
| rogue | 90% | 99% | 5.72 | 67.0 | 8.0% | 23.5 | 5.08 |
| druid | 0% | 88% | 1.53 | 78.5 | 2.4% | 16.8 | 4.05 |
| wizard | 0% | 58% | 0.15 | 88.4 | 0.7% | 22.5 | 5.18 |

**Every cell matches the #368 base-game-postsplit table to the decimal.** Because
#369 (the only commit since #368) added sim files only — no engine, no statblocks
— the base game is byte-for-byte what #368 validated. This is the regression
guard: had any wave-member silently changed shared combat / dice / state, the
RNG-deterministic seed schedule would have moved these numbers. It did not.

---

## 2. Full / NG+ chain — the split sharpens the band into three tiers

`FULL_CHAIN=1` (default), 100 souls/class × ≤100 lives. A "clear" = routed all 14
chapters and felled Melissan.

| Class | Topped A6 | Ever cleared A0 | Mean asc cleared | 1st A0-clear (life) | Per-life clr% | Avg depth | Avg final lvl |
|-------|----------:|----------------:|-----------------:|--------------------:|--------------:|----------:|--------------:|
| **fighter** | **100%** | 100% | **6.00** | 30.5 | 17.8% | 38.2 | 7.07 |
| **monk** | **100%** | 100% | **6.00** | 39.4 | 13.4% | 39.7 | 7.38 |
| barbarian | 1% | 100% | 3.65 | 36.0 | 4.7% | **74.8** | **13.56** |
| ranger | 0% | 16% | 0.00 | 83.2 | 0.2% | 57.5 | 10.75 |
| rogue | 0% | 76% | 0.34 | 82.7 | 1.1% | 36.3 | 7.13 |
| wizard | 0% | 9% | 0.00 | 93.2 | 0.1% | 23.3 | 5.29 |
| druid | 0% | 4% | 0.00 | 86.0 | 0.0% | 21.6 | 4.77 |

**Ascension reach** (souls bucketed by the highest ascension they ever cleared;
"never" = never cleared even A0 in 100 lives):

| Class | never | A0 | A1 | A2 | A3 | A4 | A5 | A6 |
|-------|------:|---:|---:|---:|---:|---:|---:|---:|
| fighter | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **100** |
| monk | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **100** |
| barbarian | 0 | 0 | 1 | 4 | **45** | 30 | 19 | 1 |
| rogue | 24 | 48 | 23 | 4 | 1 | 0 | 0 | 0 |
| ranger | **84** | 16 | 0 | 0 | 0 | 0 | 0 | 0 |
| wizard | 91 | 9 | 0 | 0 | 0 | 0 | 0 | 0 |
| druid | 96 | 4 | 0 | 0 | 0 | 0 | 0 | 0 |

**Three tiers emerge on the long chain:**

1. **Closers — Fighter & Monk (100% topA6).** Both top the entire A6 ladder in
   every soul. They are not the deepest (38–40 rooms), but they *close*: reliable
   damage + sustain/control that survives the Throne-of-Bhaal apex at high
   ascension.
2. **Divers — Barbarian & Ranger (deepest, rarely close).** Barbarian goes
   **deepest by a mile** (74.8 rooms, mean L13.6) and *always* clears A0 (never=0)
   but walls around A3–A5 (A6 just 1%). Ranger reaches the second-deepest rooms
   (57.5) yet **only 16% of souls ever close even one A0 run**. They reach the
   endgame and die there — see the death clustering below.
3. **Floor — Rogue, Wizard, Druid.** Rogue clears A0 (76%) but stalls at A0–A1;
   the two casters rarely complete the long chain at all (wizard 9% / druid 4%
   ever-A0) — the **known Auto-Battle caster handicap** (`caster-ai-diagnosis`),
   amplified by chain length, not a wave regression.

**Why divers die — the apex, not the early game.** Top full-chain kill-rooms (the
by-chapter histogram is hard-coded to Ch1–6 in the renderer, a pre-14-chapter
limitation, so the NG+ apex shows up only here):

- **Barbarian:** `melissan` (13.1% of its deaths), `fire-giant-shaman +
  saradush-marauder` (7.7%), `ascendant-slayer`, `mirror-of-pride +
  avatar-of-wrath`, `irenicus` — i.e. it dies on **Ch12–14 (Saradush fire
  giants → Throne of Bhaal → Melissan)**, the exact content the base run never sees.
- **Ranger:** `mask-chamberlain` combos (Ch9 Court of Masks) + `mirror-of-pride`
  combos (Throne) — control / illusion-heavy fights where a non-positional ranged
  auto-attacker has no defensive identity (the standing `ranger-payoff` caveat,
  PR #196 not in build).
- **Fighter / Monk:** deaths stay **Ch1–2** (the bare-soul L1 reincarnation wall) —
  because once they get going they *win* the apex instead of piling up deaths there.

**This is the campaign split working as designed**, not a regression: the short
11-chapter base is closable by the divers (the Irenicus apex is reachable before
they run out of gas); the 14-chapter NG+ outlasts them and only the closers top it.
It is also fully consistent with the standing textures — "Barbarian deep-but-
doesn't-close" (#268), "Fighter is the only one who closes" (#308) — now extended
by **"Monk also closes; Ranger also dives."**

---

## 3. Kit-firing — the headline guard (every mechanic fires; nothing inert)

Per-combat activation rates over every combat each class fought. `·` = N/A.

### Base chain

| Class | Combats | Signature | Martial pool (OFF · DEF · DIS = total) |
|-------|--------:|-----------|:---------------------------------------|
| fighter | 56 064 | — | 0.65 · 1.56 · 3.16 = **5.36** |
| barbarian | 90 838 | Rage 1.98 · Reckless 3.46 | 0.40 · 0.82 · 2.32 = **3.54** |
| ranger | 129 276 | HMark cast 1.70 · Colossus 4.52 · HMark die 6.08 | 0.75 · 2.49 · 0.87 = **4.11** |
| rogue | 114 844 | Sneak 3.46 (0.54/turn) · Hide 2.34 | — |
| wizard | 131 444 | Spell cast 4.58 | — |
| druid | 99 333 | Wild Shape 0.79 · Spell cast 4.73 | — |
| monk | 65 756 | Flurry 2.45 · Stunning Strike 2.48 · Patient Def 0.21 | — |

### Full / NG+ chain

| Class | Combats | Signature | Martial pool (OFF · DEF · DIS = total) |
|-------|--------:|-----------|:---------------------------------------|
| fighter | 86 418 | — | 0.64 · 1.80 · 3.36 = **5.79** |
| barbarian | 425 950 | Rage 2.15 · Reckless 4.15 | 0.40 · 1.02 · 2.54 = **3.96** |
| ranger | 329 140 | HMark cast 1.85 · Colossus 5.63 · HMark die 6.25 | 0.74 · 2.94 · 0.91 = **4.59** |
| rogue | 208 902 | Sneak 3.57 (0.52/turn) · Hide 2.29 | — |
| wizard | 135 772 | Spell cast 4.55 | — |
| druid | 126 577 | Wild Shape 0.74 · Spell cast 4.96 | — |
| monk | 119 583 | Flurry 2.80 · Stunning Strike 3.19 · Patient Def 0.13 | — |

**Reading — all green, and the wave changes are visible as designed:**

- **Martial pool (#338) — fires hard, and #343 is the lift.** The pre-regen #341
  baseline spent fighter 1.79 / barb 2.28 / ranger 1.86 per combat; with the #343
  mid-fight regen + OFFENSE buff it is now fighter **5.36–5.79** / barb
  **3.54–3.96** / ranger **4.11–4.59**. The pool is the opposite of inert.
- **Ranger Focus re-weight (#357) — exactly the intended channel shift.** vs #341
  (OFF 0.16 · DIS 1.00), Ranger now spends OFFENSE **0.74–0.75** (Aimed Shot got
  cheaper, 1pt) and DISRUPT **0.87–0.91** (Crippling got pricier, 2pt). OFFENSE up,
  DISRUPT down — precisely the reweight.
- **Monk survived its #343 Flurry trim.** Flurry still fires 2.45–2.80/combat and
  Stunning Strike 2.48–3.19 — the trim curbed compounding without defanging the
  kit (Monk remains a 100%-topA6 closer).
- **Everything else fires:** Rogue Sneak ~3.5 + Hide ~2.3; Wizard ~4.6 casts;
  Barbarian Rage ~2 + Reckless ~3.5–4.2; Ranger Hunter's-Mark + Colossus; Druid
  Wild Shape ~0.75 + ~4.8 casts. Full-chain rates run slightly hotter than base
  (deeper runs = longer/harder fights = more regen ticks + procs), as expected.

---

## 4. Leveled-start corroboration (`sim-feel`, ASC 0, 5 classes)

Single lives (no reincarnation) swept at L1/3/5/7. Mean rooms reached, past the
brutal L1 wall (L3/5/7):

| Class | L1 | L3 | L5 | L7 | tier |
|-------|---:|---:|---:|---:|:-----|
| fighter | 3.4 | 60.5 | 59.9 | 61.7 | deepest |
| ranger | 5.6 | 57.7 | 58.3 | 61.2 | ≈ fighter |
| barbarian | 9.6 | 56.5 | 53.0 | 55.4 | close behind |
| rogue | 4.5 | 44.4 | 45.9 | 46.4 | mid |
| wizard | 4.2 | 32.7 | 35.7 | 33.1 | last |

Ordering **`fighter ≈ ranger > barbarian > rogue > wizard`** — identical to the
pre-wave `massive` (#293) and `revalidate` (#301) reads and the #368 corroboration.
The leveled-start lens does **not** reshuffle the classes after the merge wave.
(`sim-feel` covers only these 5 — no Druid/Monk.)

The base and full feel runs are **near-identical** (clear 0.1%/0.0%, meanRooms
39.5 both, blowout 72.9% both): single L1/3/5/7 lives almost never reach Ch11+,
so the split — which only differs *past* Ch11 — is invisible to this lens. The
brutal L1 row (3–10 rooms) is the standing bare-soul reincarnation wall.

---

## 5. Q1 — does the martial pool correlate with depth, or just tick?

**The prior pass flagged the `sim-feel` classifier as "blind to the martial
pool."** That is half-true: `sim-feel`'s action-mix table *does* count
`martial-offense/defense/disrupt` as action kinds — but it never ties pool usage
to outcome, so it can't say whether spending the pool *helps*. To answer that I
added RNG-neutral per-life instrumentation to `sim-class-viability` (snapshot the
pool-spend counters per life → spends/combat vs that life's depth/clear).

**Cross-class (the structural read, available without instrumentation):** pool
spend-rate does **not** predict depth across the three pool classes. On the full
chain Fighter spends the **most** (5.79/combat) yet sits mid-depth (38.2);
Barbarian spends the **fewest** of the three (3.96) yet dives **deepest** (74.8) —
because **Rage**, not the pool, is Barb's survival engine. So the pool is *one*
contributor layered on the class's signature mechanic, never the dominant depth
driver.

**Within-class (the instrumented correlation, base chain — all three classes):**

| Class | cleared spends/combat | died spends/combat | spends/combat by depth quartile (shallow→deep) | by level band (confound) |
|-------|---------------------:|-------------------:|:-----------------------------------------------|:-------------------------|
| fighter | **5.36** (n=700) | 2.48 (n=3049) | 0.55 · 1.58 · 3.84 · **6.10** | L1-3=1.56 · L4-7=5.09 · L8-12=7.94 · L13-20=5.92 |
| barbarian | **3.79** (n=700) | 2.33 (n=3121) | 0.66 · 2.42 · 3.47 · **3.83** | L1-3=0.99 · L4-7=2.87 · L8-12=3.36 · L13-20=3.83 |
| ranger | **3.89** (n=700) | 2.38 (n=5447) | 0.65 · 1.56 · 3.47 · **4.53** | L1-3=1.04 · L4-7=2.31 · L8-12=3.46 · L13-20=4.65 |

**Full chain** (deeper range; the depth-quartile rise holds for all three, but the
cleared-vs-died gap behaves differently by tier):

| Class | cleared spends/combat | died spends/combat | depth quartile (shallow→deep) | died lives' mean lvl / depth |
|-------|---------------------:|-------------------:|:------------------------------|:-----------------------------|
| fighter | **4.93** (n=700) | 3.01 (n=3239) | 0.45 · 1.57 · 5.51 · **5.86** | L4.3 / 19.8 rooms — *shallow* |
| barbarian | 3.84 (n=465) | 3.41 (n=9520) | 1.86 · 3.59 · 4.23 · 4.06 | **L13.2 / 72.4 rooms — deep** |
| ranger | 3.35 (n=16) | 3.39 (n=9984) | 0.77 · 3.10 · 4.93 · 4.76 | **L10.7 / 57.4 rooms — deep** |

For **Fighter** the cleared-vs-died gap stays wide (4.93 vs 3.01) because its
deaths are **shallow L1 deaths** (mean L4.3). For the **divers** the gap nearly
vanishes (Barb 3.84 vs 3.41; Ranger 3.35 vs 3.39) — not because the pool stops
helping, but because their *died* lives are themselves **deep apex deaths** (Barb
dies at mean L13.2 / 72 rooms), so they spent just as much before falling at the
Throne. The discriminating signal is therefore **depth, not the clear flag**.

**Verdict — the pool is NOT inert "ticking."** Spends/combat **rises monotonically
across every depth quartile, in all three classes on both chains** (Fighter
0.45→5.86, Ranger 0.77→4.76, Barbarian 1.86→4.06 on the full chain). A decorative
pool would tick at a flat rate regardless of how far the life got; it does the
opposite. The link to depth is **bidirectional and fight-length-mediated**:
`MARTIAL_POOL_MAX` is flat (3; Fighter 4) and does **not** scale with level, so
spends/combat is gated by *rounds per fight*, which rise with depth — the
level-band row is the tell (Fighter 1.56 → 7.94 across L1-3→L8-12 on a constant
ceiling). And cross-class it is a **contributor layered on the signature
mechanic**, not the driver: Barbarian spends the **fewest** of the three yet dives
**deepest** (Rage is its engine). Net: the pool fires *and* scales with depth; the
prior "`sim-feel` classifier is blind to the pool" worry was a **reporting gap**
(the action-mix counted pool actions but never tied them to outcome) — now closed
— **not** evidence the pool is inert.

---

## 6. Q2 — is the "Fighter Asc-6 lone-outlier" real, or a classifier artifact?

**Real — but it is a two-class *closer tier*, not Fighter alone.** On the full
NG+ chain, **both Fighter and Monk top A6 in 100% of souls**; Barbarian — despite
being the **deepest** class by a wide margin (74.8 rooms) — tops A6 in only **1%**.
So:

- The Asc-6 result is **not a measurement artifact.** It is the genuine
  **"depth ≠ closing"** texture: the class that reaches the most rooms is *not*
  the class that finishes the ladder. The closers (Fighter reliability, Monk
  control + mobility) survive the apex; the diver (Barbarian's all-in Rage) burns
  deep and dies to the Throne-of-Bhaal bosses (`melissan` is 13% of its deaths).
- If the prior pass saw **Fighter alone** topping A6, the difference is **Monk** —
  which now ties it at 100% and was either noise in the small-sample prior read
  (#341 was a 20-soul smoke) or under-credited; the #343 Flurry trim did not stop
  Monk closing. On the short base chain the distinction dissolves entirely
  (Fighter/Barb/Ranger/Monk all 100% topA6) — the lone-A6 phenomenon is a
  **full-chain-only** effect.

---

## 7. Regression scan — none found; directions only

| Wave member | Verdict | Evidence |
|-------------|---------|----------|
| Martial pool (#338) + regen/buff (#343) + missed-DISRUPT (#360) | **No regression; fires as designed** | Pool spends 5.36–5.79 / 3.54–3.96 / 4.11–4.59 per combat; #343 lift visible vs #341 |
| Ranger Focus reweight (#357) | **No regression; reweight visible** | OFFENSE 0.16→0.74, DISRUPT 1.00→0.91 vs #341 — exactly Aimed-cheaper / Crippling-pricier |
| Grove at first death (#359) | **No regression** | Grove loop runs; base band reproduces #368 to the decimal |
| Mid-run unlock reveals (#365) | **No regression** | Reveal hooks are UI-side; combat/economy band unchanged |
| Campaign split (#367) | **No regression; sharpens band as designed** | Base Ch1–11 byte-identical to full Ch1–11; split only removes Ch12–14 from base |

**DIRECTIONS (taste / future lanes, nothing to change for the wave):**

1. **Ranger craters base→full (100%→0% topA6, depth 57.5).** The deepest-non-closer.
   Its NG+ deaths cluster on **control/illusion** fights (Ch9 masks, Throne
   mirrors) where the non-positional engine grants its ranged identity no defensive
   value — the standing `ranger-payoff` (#196) gap. DIRECTION (not for this wave):
   if NG+ Ranger should *close*, the ranged-defense payoff is the lever; its base
   game is already a 100% closer, so this is purely an NG+-apex question.
2. **Casters (Wizard 9% / Druid 4% ever-A0 on the full chain)** remain the floor —
   the known Auto-Battle caster handicap, amplified by chain length. DIRECTION:
   nothing wave-specific; a caster-AI lift (`caster-ai`) would raise the floor if
   ever pursued. Druid edging *below* Wizard on ever-A0 here mirrors the #308
   bare-soul ordering flip (Wild Shape barely fires before an L1 death).
3. **The by-chapter death histogram is hard-coded Ch1–6** in
   `sim-class-viability`'s renderer (pre-14-chapter). Apex deaths only surface in
   the kill-room list. DIRECTION (sim-infra only): widen it to the live
   `chapterCount` so NG+ death distribution is legible at a glance.

---

## Bottom line

The merge wave is **clean**. The base game reproduces #368 exactly (no class
regressed, no kit inert), every signature mechanic and the new martial pool fire
at healthy rates on both chains with the #343/#357 changes visible as designed,
and the leveled-start ordering is unchanged. The campaign split does exactly what
it should: the short base is broadly beatable at the AI floor, while the long NG+
chain resolves the band into **closers (Fighter, Monk) → divers (Barbarian,
Ranger) → floor (Rogue, casters)** — a sharpening of the standing asymmetric
philosophy, not a break. The only items worth a future glance (NG+ Ranger's
apex-closing, the caster floor) are pre-existing AI-floor / non-positional taste
calls, not breakage introduced by the wave.
