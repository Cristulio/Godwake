# Base game post-split — structural + viability validation

> Measurement only. **No balance / statblock / XP / content was changed.** Every
> remediation below is a DIRECTION for a future lane, not an applied edit.
> Date: 2026-06-03. Branch: `feat/sim-base-game-postsplit`.

## Context

The campaign split (#367) made `createGodwakeDelve` build the **base game** by
default — the Cells→Irenicus arc, **11 chapters + 10 camp seams**, ending when
Irenicus falls in his own hell — and the full **New Game+** chain (14 chapters →
Melissan) only under `fullChain: true`. `finishDelve` fires the win against the
delve's own `chapterCount`, so a base run wins at Ch11. This lane validates that
the base game is **whole, beatable, and balanced** after the split.

The split is, mechanically, a **pure truncation + win-move**: base chapters are
`GODWAKE_CHAPTERS.slice(0, 11)` of the same array the full chain slices to 14,
with the same statblocks, the same pools, and the same `XP_TABLE`. So **base
Ch1–11 is byte-identical to the full chain's first 11 chapters** — a fact the
measurements below corroborate (identical per-chapter XP) and which makes the
"no class regressed" question answerable by construction: nothing in Ch1–11
changed, and the split only *removes* the harder Ch12–14 from a base run.

### How this was measured

A `FULL_CHAIN` env toggle was added **to the sim scripts only** (default `true`,
preserving the canonical NG+ measurement; `FULL_CHAIN=0` measures the base
game). A new `scripts/sim-structural-integrity.ts` routes many seeds and asserts
the graph invariants. Re-run:

```
BASE_SEEDS=2000 FULL_SEEDS=300 npx tsx scripts/sim-structural-integrity.ts
FULL_CHAIN=0 npx tsx scripts/sim-xp-curve.ts
FULL_CHAIN=0 SOULS_PER_CLASS=100 MAX_LIVES=100 npx tsx scripts/sim-class-viability.ts
FULL_CHAIN=0 RUNS=40 npx tsx scripts/sim-feel.ts
```

> **Read the absolute clear-rates RELATIVE, not literally.** The shared
> Auto-Battle bot underplays a real player (it restarts every life at L1 and
> manages spells poorly), so absolute clear%/depth are an AI-floor artifact. The
> robust signal is the *relative* class ordering and the *structural* result —
> and the user has cleared the whole game by hand.

---

## 1. Structural integrity — PASS

Routed **2000 base seeds** (and 300 full-chain seeds) through a fresh delve and
checked, per seed: chapter count, boss chain order, camp-seam count, finale
identity + terminality, full forward-reachability from the entry (orphans),
every edge resolving, and every node still able to reach a boss.

| Build | Seeds | Clean | Chapters | Camps | Rooms/delve (min·med·max) | Finale |
|-------|------:|------:|---------:|------:|:--------------------------|:-------|
| **BASE** (Cells→Irenicus) | 2000 | **2000 (100%)** | 11 | **exactly 10** every seed | 158 · 170 · 179 | Ch11 `irenicus`, terminal |
| FULL / NG+ (Cells→Throne) | 300 | 300 (100%) | 14 | exactly 13 every seed | 208 · 216 · 227 | Ch14 `melissan`, terminal |

- **No disconnection. No orphans. No dead ends.** Every node is forward-reachable
  from the entry, every node can reach a boss, every `next` edge resolves.
- The **camp-seam invariant holds**: base ships exactly `chapters − 1 = 10`
  camps every seed (the silent failure mode that "keeps the build green and only
  the reachability walk catches it" did not occur). NG+ ships exactly 13.
- Every base run reaches the **Ch11 Irenicus finale**, which is terminal (no
  onward seam). The NG+ spot-check reaches **Ch14 Melissan**.

This reproduces the unit-test invariant (`createDelve.test.ts`) at sim scale
(2000 seeds vs the test's handful) and extends it to the route-reachability
metrics. **The base game graph is whole.**

---

## 2. Class viability band — holds; nothing unwinnable

`sim-class-viability` over the base chain: 100 souls/class × ≤100 lives each, the
full reincarnation + Grove + loot/legendary loop, all 7 classes, balanced
archetype. A "clear" = routed to Ch11 and felled Irenicus.

| Class | Topped A6 | Ever cleared A0 | Mean asc cleared | 1st A0-clear (life) | Per-life clr% | Avg depth | Avg final lvl |
|-------|----------:|----------------:|-----------------:|--------------------:|--------------:|----------:|--------------:|
| **fighter** | **100%** | 100% | 6.00 | 27 | 18.7% | 25.9 | 5.43 |
| **barbarian** | **100%** | 100% | 6.00 | **23** | 18.3% | **41.4** | 8.38 |
| **ranger** | **100%** | 100% | 6.00 | 40 | 11.4% | 36.4 | 7.42 |
| **monk** | **100%** | 100% | 6.00 | 36 | 15.2% | 24.7 | 5.32 |
| rogue | 90% | 99% | 5.72 | 67 | 8.0% | 23.5 | 5.08 |
| druid | 0% | 88% | 1.53 | 78 | 2.4% | 16.8 | 4.05 |
| wizard | 0% | 58% | 0.15 | 88 | 0.7% | 22.5 | 5.18 |

**Reading:**

- **The base game is beatable at the AI floor.** Five of seven classes — every
  martial / striker (fighter, barbarian, ranger, monk) plus rogue at 90% — *top
  the entire A6 ascension ladder* within 100 lives. The shorter 11-chapter base
  is short enough that the bot, with accumulated meta-power, clears it outright
  (the full 14-chain floors far harder). **No class is unwinnable:** even the
  weakest, wizard, clears the base at least once in **58%** of souls; druid 88%.
- **Fighter strong-side: confirmed.** Fighter tops A6 100%, clears early (life
  27), every soul ever clears A0. Barbarian remains the deep high-side (depth
  41.4, earliest first clear, life 23) — its standing "watch the high side"
  profile, unchanged by the split.
- **The two casters are the floor — a KNOWN AI-floor handicap, not a split
  regression.** Wizard (topA6 0%, meanAsc 0.15) and druid (topA6 0%, meanAsc
  1.53) underperform because the bot underplays spell management (documented in
  `caster-ai-diagnosis`, the wizard de-tank lane, and the full-system Druid
  read). Druid edging above wizard (Wild Shape survivability) matches the prior
  "Druid holds the caster hard-tier, just above Wizard."
- **All 7 kits fire** (the headline guard — `policy never wires the mechanic`
  did *not* happen): martial pool fighter 5.36 / barbarian 3.54 / ranger 4.11
  spends per combat; rogue Sneak 3.46 + Hide 2.34; wizard 4.58 casts; barbarian
  Rage 1.98 + Reckless 3.46; ranger Hunter's-Mark 1.70 + Colossus 4.52; druid
  Wild Shape 0.79 + 4.73 casts; monk Flurry 2.45 + Stunning Strike 2.48.

**Corroboration — leveled-start depth band** (`sim-feel`, single lives at L1/3/5/7,
5 classes): `fighter ≈ ranger > barbarian > rogue > wizard`, and fighter is the
only class with a non-zero single-life AI clear (2.5% at L3). Same ordering as
the reincarnation band and as the pre-split `massive` / `revalidate` lanes — the
split did not reshuffle the classes.

**Net: the band holds and nothing is broken.** Because base Ch1–11 is identical
to the full chain's first 11 chapters, no class can be *regressed* by the split —
it strictly removes the hardest content from a base run.

---

## 3. Level arc — L20 lands right at Irenicus

`sim-xp-curve`, median of 4000 routed runs (Asc 0, elites on). Cumulative XP and
the level it implies at the end of each base chapter:

| End of chapter | Boss | cumXP (random route) | Lvl | cumXP (combat route) | Lvl |
|----------------|------|---------------------:|----:|---------------------:|----:|
| Ch5 (The Godwake) | hollow-dawn | 15 189 | 10 | 19 824 | 11 |
| Ch8 (Ashfall) | ashen-marshal | 39 211 | 14 | 51 211 | 15 |
| Ch10 (Suldanessellar) | nizidramaniiyt | 62 311 | 16 | 81 201 | 18 |
| **Ch11 (Trials of the Pit)** | **irenicus** | **76 621** | **18** | **99 403** | **20** |

- **L20 lands exactly at the Ch11 Irenicus finale** for a combat-forward router
  (cumXP 99 403 ≥ the 98 000 L20 cap); a neutral router arrives at **L18**.
  Irenicus (a CR-14 finale) is fought at **L18–20** — a complete 1→20 arc, not
  badly under- or over-levelled.
- The Ch1–11 landing is **identical** to the full chain's (same chapters): in the
  14-chain, the combat router already hit L20 at Ch11 and the random router hit
  L18 there, then Ch12–14 carried the random router on to L20. So the split
  relocates only **the last two levels of a casual route into NG+** — the base
  game still delivers essentially the whole level curve.

---

## 4. Where runs end + tension texture

**Death distribution** (46 710 base lives, AI floor; % of the 42 925 deaths):

```
Ch1 47.1% · Ch2 26.0%  (73% of deaths in the first two chapters)
Ch3 5.3% · Ch4 2.6% · Ch5 3.0% · Ch6 5.2% · Ch7 2.9% · Ch8 0.8% · Ch9 3.1% · Ch10 0.7% · Ch11 3.3%
```

The Ch1–2 front-load is the **bare-soul L1 reincarnation wall** — each life
restarts at L1 and the squishy early game kills most lives before they level
(the standing L1-floor texture, already tracked via the Rogue/Ranger L1 reads,
*not* introduced by the split). All **3 785 cleared lives end at Ch11** — the win
fires precisely at the Irenicus finale, nowhere early.

**Per-chapter blowout** (`sim-feel`, won non-boss fights, HP never < 80%):

```
Ch1 80% · Ch2 85% · Ch3 81% · Ch4 79% · Ch5 78%  |  Ch6 48% · Ch7 45% · Ch8 53% · Ch9 69% · Ch10 54% · Ch11 38%
```

Early chapters look soft, **but that is the over-levelled-start sweep artifact**,
not content softness: the feel sweep starts lives at L1/3/5/7, so an L7 start
walks Ch1–5 several levels too strong and floors their blowout rate (the exact
effect characterised in the base-difficulty lane #300). The back half (Ch6–11)
bites at 38–54% blowout — real tension where the player is on-level. Elites bite
hardest (88% win, 4.97 rounds vs boss 95.2%/3.34). Irenicus's chapter (Ch11) has
the lowest trash blowout (38%).

---

## 5. Anomalies → DIRECTIONS (measure-only; nothing changed)

1. **Casters (wizard, druid) are the viability floor** — topA6 0%, ever-cleared-A0
   wizard 58% / druid 88%. This is the **known Auto-Battle caster handicap**
   reproduced on the base chain, *not* a split regression (base Ch1–11 ==
   full Ch1–11). DIRECTION: nothing split-specific to do; a caster-AI lift (the
   standing `caster-ai` / wizard threads) would raise this floor if pursued — out
   of scope for a "validate the split" lane.

2. **A casual (random) route reaches Irenicus at L18, not L20** (the combat route
   hits L20). The split parked L19–20 of a non-greedy router in NG+. DIRECTION
   (genuine tradeoff, presented not taken): if the design wants a base run to cap
   at L20 at the finale regardless of routing, pull the top `XP_TABLE` thresholds
   (L19 = 86 000, L20 = 98 000) in slightly so the neutral route also lands L20 by
   Ch11; **but** leaving them as NG+ headroom is equally defensible (NG+ replays
   Ch1–11 then continues, and a casual player who wants the last two levels gets
   them there). No change made — this is a taste call for the user.

3. **Early-chapter blowout softness (Ch1–5, 77–85%)** is the over-levelled-start
   **sweep artifact**, not soft content (the on-level back half bites at 38–54%).
   DIRECTION: none — corroborates #300; reading the early band as "too easy"
   would be misreading the sweep.

4. **Back-half death walls** (Ch6 5.2%, Ch9 Court-of-Masks 3.1%, Ch11 Irenicus
   3.3% of all deaths) sit inside the expected ramp; an Irenicus finale wall is
   appropriate. DIRECTION: none — no spike that warrants softening.

---

## Bottom line

The base game is **validated post-split**:

- **Whole** — 2000/2000 seeds structurally clean: 11 chapters, exactly 10 camp
  seams, every node reachable, every run reaches a terminal Irenicus. NG+ still
  reaches Melissan.
- **Beatable** — 5/7 classes top the A6 ladder at the AI floor; every class clears
  the base at least once (≥58% of souls, even wizard); the user clears by hand.
- **Balanced** — the class band holds (martials/strikers strong, rogue mid,
  casters AI-floored), all 7 kits fire, and the split cannot regress any class
  because base Ch1–11 is identical to the full chain's first 11 chapters.
- **Full level arc** — L20 lands right at the Ch11 Irenicus finale (L18–20
  depending on route); the base delivers essentially the entire 1→20 curve.

No balance, statblock, XP, or content changes are recommended as *blockers* for
the split. The two DIRECTIONS worth a future glance (the casual-route L18 cap,
and the standing caster-AI floor) are both pre-existing taste/AI calls, not
breakage introduced by the campaign split.
