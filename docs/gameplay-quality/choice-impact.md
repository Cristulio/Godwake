# Choice-impact analysis — do player decisions actually change outcomes?

**Date:** 2026-05-28
**Worktree:** `feat/quality-choice-impact`
**Method:** new race × class and shrine-blessing-forced sims
([`scripts/sim-choice-impact.ts`](../../scripts/sim-choice-impact.ts) →
[`choice-impact.raw.md`](./choice-impact.raw.md)) plus synthesis of the
five prior validation PRs that touched specific choice axes.

## TL;DR — verdict in one screen

The game has 6 major decision points. Of those:

- **3 are healthy** (race, shrine blessing, camp boon) — measurable
  outcome variance, class-conditional optimal pick.
- **1 is forced** (class itself) — outcomes diverge by 2-3× per chapter,
  but that's "class identity," not a fake or hidden lever.
- **1 is unmeasurable from sim** (boss intel) — designed around human
  adaptation the AI doesn't model; mechanical levers are internally
  consistent.
- **1 is mostly fake within the choice grid** (event Charisma-gated
  choices for class-typical builds) — flagged in PR #94; the gates
  work as designed only if the player invests in CHA.

**The one real fake-choice signal** this audit surfaces is **within the
shrine blessing pool, not across it**: three of the seven sampled
blessings produce *byte-identical* outcomes for Wizard
(`mystras-whisper`, `selunes-veil`, `tymoras-coin`). They modify weapon
attacks the Wizard rarely makes. The pool isn't filtered by class
relevance, so a Wizard at a shrine can pick a 0-impact card without the
game telling them. Recommendation in §6.

## 1. Per-decision-point variance summary

| # | Decision | Choices | Outcome metric | Variance (max - min) | Class-conditional best? | Classification |
|---|----------|---------|----------------|----------------------|------------------------|----------------|
| 1 | **Race** (char creation) | 5 races × 3 classes | chapters/run @ L3 | 0.25 - 0.46 ch (≈ 30-55% relative) | Yes — race must boost the class's primary stat | **Healthy** (with predictable optimum) |
| 2 | **Class** | 3 classes | chapters/run @ L1-L7 | 0 → 11.6 pp run-clear at L7 | n/a (class IS the identity) | **Forced** (by design) |
| 3 | **Shrine blessing** | 20 blessings, 3 offered/shrine | chapters/run @ L3 | 0.27 - 0.63 ch (≈ 25-45% relative) | Yes — Rogue/Fighter want re-roll, Wizard wants stabilise charge | **Healthy** with **3 fake picks for Wizard** |
| 4 | **Camp boon** (PR #100) | 9 boons, 3 offered/camp | survival lift vs no-boon control | -4 to +18 pp; mean +5 to +11 per boon | Yes — Patience of Ilmater goldilocks across all 3 classes | **Healthy** (1 dud tuned, none dominant) |
| 5 | **Boss intel path** (PR #99) | omens / scout / walk-past | per-reach boss death% | 0% (intel is informational; engine doesn't read it) | Unmeasurable from sim | **Sim blind spot** — mechanical levers internally consistent (fee = 33-38% of boss gold across all 4 chapters) |
| 6 | **Event choice** (PR #94) | 3-4 per event | success/failure outcome | RNG ±1pp of declared; gate accessibility works | Yes — but [CHA] gates are inaccessible to default Fighter/Rogue | **Healthy** for stat-gated paths; **fake-for-default-builds** for [CHA] paths |

### Healthy / forced / fake count

- 3 healthy choices (race, shrine, camp boon)
- 1 forced choice (class — by design)
- 1 unmeasurable-from-sim (boss intel — playtest signal needed)
- 1 partially fake (events, CHA gates closed to default builds)

## 2. Detail — race × class (new this PR)

Same per-class baseline stats, race swapped. 120 runs/cell, 3 lives/run,
start L3. All races die at 100% within the 3-life chain at L3 — the
relevant outcome signal is **chapters cleared per run**, not death rate.

| Class | Best race | Worst race | Range (ch/run) | Why |
|------|-----------|-----------|---------------:|-----|
| Rogue | wood-elf (0.44) | human / half-elf (0.19) | **+0.25** | Wood-elf is the only race that boosts DEX past +2 mod (15 → 16) |
| Fighter | human / half-elf (0.83) | hill-dwarf (0.38) | **+0.46** | Human's +1 STR and half-elf's primary-stat +1 both push STR mod 15→16. Hill-dwarf's +2 CON gives durability but no offense |
| Wizard | human / half-elf / tiefling (1.37-1.39) | wood-elf / hill-dwarf (1.05) | **+0.34** | Races that boost INT (+1 each for the three winners) hit Spell DC 14 vs 13 — meaningful at the Magistrate |

### Classification

- **Healthy** — race meaningfully changes outcomes (~30-55% relative
  chapter throughput at the same class baseline).
- **Predictable optimum** — the right race for each class is "whichever
  one boosts your primary stat." A first-time player has no in-game
  signal that this is the rule. The decision rewards 5e literacy.
- **No flat-bad race** — hill-dwarf is bottom for Fighter / Wizard but
  has +2 CON which the sim's bare-soul AI undervalues (no defensive
  upside reaches outcome because the run dies before the +1 HP/level
  saves it). Likely better in playtest where players can heal/rest.

### Pre-existing player support

The character-creation flow (PR-shipped) already includes the Sir Brick
"Recommended" preset = Human Fighter, which is one of the joint-best race
× class combos. So the most surface-able option is also the best for
that class. Good. No race-side fix needed for this PR.

## 3. Detail — shrine blessing forced-pick (new this PR)

Hand a single blessing to the character at L3 before delve start (no
shrine room visits), measure chapters/run vs the no-blessing control.

| Class | Control | Best pick | Worst pick | Δ best vs control | # of 0-impact picks |
|------|--------:|-----------|-----------|------------------:|--------------------:|
| Rogue | 0.44 | `tymoras-coin` (0.92) | `tempus-edge` (0.50) | **+0.47** | 0 |
| Fighter | 0.83 | `tymoras-coin` (1.33) | `tempus-edge` (1.07) | **+0.50** | 0 |
| Wizard | 1.37 | `ilmaters-patience` (1.99) | `mystras-whisper` / `selunes-veil` / `tymoras-coin` (1.37) | **+0.62** | **3** |

### Healthy — class-conditional best pick

Rogue and Fighter want `tymoras-coin` (reroll one missed attack/encounter),
Wizard wants `ilmaters-patience` (+1 stabilise charge). Different
optimum per class is a **healthy** decision-system signal:
the right pick *depends on what you're playing*.

### Fake-for-wizard within the pool — the one real finding

| Blessing | Effect | Wizard Δ ch/run | Why zero |
|----------|--------|----------------:|----------|
| `mystras-whisper` | +1 damage per weapon hit | **+0.00** | Wizard rarely makes weapon attacks (cantrips ≠ weapon hit) |
| `selunes-veil` | Advantage on first attack of combat | **+0.00** | Wizard's opener is a spell, not a weapon attack |
| `tymoras-coin` | Reroll one missed attack/encounter | **+0.00** | Same — wizard cantrips don't consume this charge |

These are *byte-identical* trajectories at the same seed — the modifiers
genuinely never trigger for a Wizard. The Wizard player at any shrine
that rolls one of these in their 3-offer can pick a card that does
literally nothing, and the game does not tell them.

The shrine pool is 20 blessings; 6 are weapon-attack-conditional. The
probability that at least one of 3 offers is a fake-pick for a Wizard is
roughly 1 - C(14,3)/C(20,3) ≈ **62%**. So this hits most Wizard shrine
visits.

### Classification

- **Healthy** at the macro: real variance (+0.47 to +0.62 ch/run between
  best and worst), class-conditional optimum.
- **Fake-pick risk** at the micro: ~3 of 20 blessings produce zero
  effect for Wizard. Same risk pattern likely exists in reverse for
  intelligence/spell-only blessings on a Fighter (this audit's sampled
  blessings don't include INT-mod blessings to confirm).

## 4. Detail — synthesis of prior PRs

### Class as a choice (PR #95 — full-matrix, 26 911 lives)

Class isn't a tactical choice; it's the run's identity. The chapters/
life curve diverges hard:

| Class | L7 run-clear% | Bare-soul ceiling |
|-------|--------------:|-------------------|
| Rogue   | 11.6% | Reaches the Matron Mother (18% of L7 lives) |
| Fighter | 5.2% | Reaches the Matron Mother (17% of L7 lives) |
| Wizard  | 0%    | Director walls every level (96-100% per-reach death) |

Wizard underperforms in pure-floor sim because Director's Hold Person
DC isn't a to-hit dodge the wizard's Shield reaction can block. PR #95
flagged this as the next tuning target. From a *choice-impact* lens,
class IS a forced/identity choice — the variance is large by design.

### Camp boon (PR #100 — camp-boons.md, 5 400 runs)

Per-boon survivability lift vs no-boon control:

| Boon | Mean lift across classes |
|------|-------------------------:|
| Patience of Ilmater | **+10.7 pp** (goldilocks) |
| Eye of the Hawk | +8.2 pp |
| Mantle of the Slain | +6.7 pp |
| Stillness of the Mind | +6.7 pp |
| Vigor of the Road | +5.6 pp |
| Steel of the Brave | +4.9 pp (variance high) |
| Might of the Mountain | +3.7 pp |
| Blade of the Vow | +2.7 pp (tuned this PR, still dud) |
| Eyes of the Lich | -0.7 pp (informational, sim blind spot) |

No boon dominant (>+25 pp), one dud tuned, one informational. The
**range across boons is ~14 pp** — healthy lever differentiation with a
clear best pick that doesn't trivialise the chain.

### Boss intel (PR #99 — boss-intel-roi.md, 5 400 chapter-runs)

The intel choices (omens / scout / walk-past) produce **byte-identical**
combat trajectories at the same seed because the combat engine doesn't
read `bossIntel`. The intended value is human-side adaptation (load
correct potions, pre-buff for the boss kit) that the sim AI doesn't
perform.

**Mechanical-lever check passes**: scout fee is 33-38% of expected boss
gold across all four chapters; walk-past +5% bonus is consistently
~14-15% of the scout fee. Internally consistent.

**Choice-impact verdict**: cannot be measured from sim. PR #99 suggested
three cheap telemetry hooks (pick frequency, scout-paid-vs-walk-past
death-rate, per-chapter scout pick-rate). Without those, treat as
**verdict-pending** — the choice is real *if* players adapt, otherwise
it's a gold sink.

### Event choices (PR #81 + #94 — event-mechanic-audit.md, event-flow.md)

- **Success/failure choices**: RNG correctness validated (±1pp of
  declared over 4 000 trials). `failureOutcome` wiring correct.
- **`street-orphan.cuff-him`** under-rewarded vs peer events → tuned in
  #81 (+2g → +5g).
- **`bluff-the-cowl` CHA gate** was set at CHA-2 (modifier 2 = score ≥
  14), which a default CHA-12 tiefling Wizard couldn't reach → fixed in
  #94 (CHA-2 → CHA-1).
- **Class-asymmetric [CHA] paths**: Fighter (STR build) and Rogue (DEX
  build) cannot open any of the 4 Ch1+Ch2 [CHA] choices with the
  default standard-array preset. Default Wizard (tiefling +2 CHA) opens
  3/4. A CHA-built tiefling-charlatan Rogue opens all 4.

**Choice-impact verdict**: the *mechanic* is healthy (RNG correct,
gates work, failure branches land their declared effects). The *content*
problem is that [CHA] gates are decorative for class-typical builds —
the choice exists in the UI but is locked for ~⅔ of class-typical
players. PR #94 left this flagged as out-of-scope for the audit; it's
out-of-scope here too.

## 5. Compound effect — do early choices constrain later choices?

The brief asks whether choices compound — whether picking X early shapes
the viable set of later picks. Quick read across the axes:

| Early choice | Later choice it shapes | Mechanism |
|--------------|------------------------|-----------|
| Race | Class (via primary-stat synergy) | The race effectively constrains which class makes sense; e.g. Wood-Elf naturally pairs with Rogue (DEX), Half-Elf with Wizard/Fighter (primary-stat bump). Picking a "wrong" race for your class costs ~0.25-0.46 ch/run = ~30-55% of chain throughput. |
| Class | Shrine blessing optimum | The optimal blessing pick depends on class — Rogue/Fighter want `tymoras-coin`, Wizard wants `ilmaters-patience`. Same shrine offer reads differently per class. |
| Class | Camp boon optimum | Per-boon lifts differ by class (PR #100 matrix). E.g. `Patience of Ilmater` lifts Rogue +18 pp vs Fighter +8 pp. |
| Class | Event [CHA] gate accessibility | Default class builds dump CHA → [CHA] gates inaccessible to Fighter/Rogue. Picking a CHA-leaning build at char creation unlocks ~4 extra Ch1+Ch2 event paths. |
| Shrine blessing | Camp boon synergy | Not separately measured here. Likely small — both are mostly additive flat-stat bumps, not multiplicative. |

**Verdict**: compound effects are present and meaningful at the
race → class and class → blessing/boon axes. They produce the
"build identity matters" feel a good roguelite wants. They are *not*
sufficiently surfaced to a new player — the cross-axis interactions are
all discoverable only by sim or 5e knowledge.

## 6. Recommendations

### Findings only (this PR)

None of the variance numbers here cross the "ship a balance change"
threshold by themselves (no individual choice is so dominant or so dud
that the floor-up sim demands a numeric tune). Findings only.

### Recommendations for the next round (priority order)

1. **Shrine pool: filter or downweight class-irrelevant blessings.**
   The Wizard fake-pick rate of ~62% per shrine is the strongest
   actionable finding in this audit. Two cheap options:
   - **Surgical**: filter the 6 weapon-attack-conditional blessings
     out of the Wizard's offer pool. The sample blessings tested were
     `mystras-whisper`, `selunes-veil`, `tymoras-coin`; the same is
     likely true for `tempus-fury` (+2 dmg first attack), `mystras-veil`
     (+2 to-hit first attack), `silvanus-thorn` (+1 dmg all attacks).
     Estimated implementation: shrine offer dedup already exists, add
     a class-relevance score that excludes weapon-only blessings when
     `classId === 'wizard'`.
   - **Lighter touch**: tag each blessing with the classes it benefits
     and add a small "(useful for Fighter)" hint in the offer card so
     the player sees the signal. Costs a UI string per card; doesn't
     change game-state semantics.
   - Same audit should be run for `cleric` / `barbarian` (not in
     `validClasses` yet) and the mirror question for INT-only
     blessings in Fighter/Rogue offers.

2. **Boss-intel playtest hooks** (carried forward from PR #99).
   The sim cannot resolve "is the scout fee fair?" — only playtest can.
   Add the three telemetry counters PR #99 recommended (intel pick
   frequency, per-path boss death rate, per-chapter scout pick-rate)
   before any tuning round on intel rooms.

3. **Event [CHA] gates** (carried from PR #94). Either lower the
   gates one more tier so a CHA-12 build opens them (currently CHA-12
   wizard opens 3/4 but Fighter/Rogue with CHA-10 open 0), or pair
   each [CHA] choice with a parallel [STR] / [DEX] / [INT] choice so
   class-typical builds have *some* gated path to take. Out of scope
   for this audit.

4. **Per-class race recommendation in char creation**. The right race
   for each class is a 5e-literacy fact a new player doesn't have.
   The Sir Brick preset already shows the answer for Fighter; consider
   a "Recommended for this class" tag on the race step when the player
   has already picked a class. Same lift, much smaller UI footprint
   than rewriting race bonuses.

### Reasonable next worktrees

- `feat/shrine-pool-class-filter` (priority 1 above — most measurable
  win, narrow scope).
- `feat/event-stat-gate-parity` (priority 3 — adds matching STR/DEX/INT
  paths to the [CHA] events that have them).

## 7. Reproducing

```bash
# Race × class + blessing forced-pick (39 cells × 120 runs × 3 lives)
RUNS_PER_CELL=120 npx tsx scripts/sim-choice-impact.ts

# Tighter sample
RUNS_PER_CELL=300 npx tsx scripts/sim-choice-impact.ts
```

Writes the matrix table to
[`choice-impact.raw.md`](./choice-impact.raw.md). Curated diagnosis is
this file.

## 8. Files in this PR

- `scripts/sim-choice-impact.ts` — new sim driver (race × class + shrine
  blessing forced-pick).
- `docs/gameplay-quality/choice-impact.raw.md` — sim's raw output.
- `docs/gameplay-quality/choice-impact.md` — this report.
- **No engine / content changes.** Findings-only.
