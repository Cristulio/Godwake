# Legendary-slot ceiling — diagnostic findings (2026-06-01)

Measurement-only lane. No engine / content / balance change. Quantifies the
parked "Ch6 veteran ceiling" flag: with **legendary equip slots uncapped**, does
a veteran stacking many legendaries onto one vessel scale **sanely** (soft cap /
diminishing returns) or **run away** (more legendaries → near-zero threat → the
back half trivialised)?

## Verdict

**No runaway. The uncapped legendary slot does not create a power ceiling.**

Holding level, Grove, affix gear and ascension fixed and varying **only** the
number of equipped legendaries (Probe B), each legendary adds a **modest,
roughly linear, mildly diminishing** amount of survival — and even at **8**
equipped legendaries all three classes tested remain heavily threatened against
back-half content (deaths/100 still 40-53, blowout still 21-33%, mean min-HP
22-34%). There is no acceleration and no saturation toward trivial fights.

The "runaway-looking" signal in the raw reincarnation loop (Probe A: the 5+
legendary bucket blows out 68% of wins and dies 3.5/100) is **almost entirely a
confound**: in the natural loop, owning 5+ legendaries co-occurs with being
~level 7.8 (vs 1.6 at zero), ~12 Grove ranks (vs 2.7) and deeper chapters. When
Probe B strips those away, the legendary lever alone is weak. **The veteran's
late-game strength lives in the full meta package — level and Grove ranks above
all — not in the legendary slot count.**

**Tuning direction: none on the legendary slot.** Do not add a slot cap /
diminishing-returns curve to legendaries on this evidence — the slot is already a
sane lever. If the late-game veteran ceiling is to be revisited at all, the lever
is the **joint level+Grove power curve**, which is out of this lane's scope and a
separate user decision. See [[dd-roguelite-2026-06-01-barb-power-lane]]
(veterans strong — corroborated here) and
[[dd-roguelite-class-balance-philosophy]].

## Method

Two probes, both reusing the live engine helpers (same combat / affix / legendary
channels the game reads). Reduced N. Blowout = a won fight whose HP **never
dipped below 80%** (matches `scripts/sim-feel.ts`). Deaths/100 = lost fights per
100 fights.

- **Probe A — observational.** The full reincarnation/Grove/loot loop ported
  from `scripts/sim-class-viability.ts` (drops + shop + banked legendaries + camp
  fork, balanced archetype, ascension climbs A0→A6 as designed). 5 classes × 50
  souls × up to 50 lives = **12,336 lives / 184,504 fights**. Every fight is
  tagged with the life's active legendary count and bucketed {0, 1-2, 3-4, 5+}.
  Reports threat per bucket **plus confound columns** (mean ascension / level /
  Grove ranks / chapter), because in this loop legendary count co-varies with all
  four — so the raw climb **cannot** be attributed to legendaries.

- **Probe B — controlled / causal.** Hold class, level (**L12**, the level
  back-half veterans actually reach — see Probe A ch≥6 rows, ~lvl 12.9-13.7),
  Grove (**none**), affix gear (**none**) and ascension (**A0**) FIXED; vary
  **only** the equipped legendary count 0→8 against a fixed battery of chapter
  7/8/9/10 combat/elite/boss rooms, 600 fights per config, fresh full-HP vessel
  each fight. The marginal curve shape **is** the answer.

> Absolute clear-rates are an AI-floor artifact (the bot underplays a real
> player). Read the **shape** — relative, and on threat faced — not the
> magnitudes.

## Probe B — the causal read (legendary count isolated)

Fixed L12 vessel, no Grove, no affix gear, A0; battery = chapters 7/8/9/10
combats. Only the equipped legendary count varies.

**fighter**

| Equipped legendaries | Fights | Blowout% (of wins) | Mean min-HP% | Mean end-HP% (wins) | Deaths/100 |
|--------------------:|------:|------------------:|------------:|-------------------:|----------:|
| 0 | 600 | 3.2% | 10.8% | 39.8% | 69.2 |
| 1 | 600 | 5.0% | 11.8% | 40.1% | 66.3 |
| 2 | 600 | 8.6% | 12.5% | 46.5% | 69.2 |
| 3 | 600 | 11.0% | 17.9% | 44.3% | 54.7 |
| 4 | 600 | 12.1% | 17.8% | 45.2% | 56.0 |
| 6 | 600 | 13.3% | 20.4% | 49.2% | 51.0 |
| 8 | 600 | 21.5% | 24.3% | 55.9% | 50.3 |

**barbarian**

| Equipped legendaries | Fights | Blowout% (of wins) | Mean min-HP% | Mean end-HP% (wins) | Deaths/100 |
|--------------------:|------:|------------------:|------------:|-------------------:|----------:|
| 0 | 600 | 20.0% | 19.4% | 52.8% | 63.3 |
| 1 | 600 | 24.7% | 20.0% | 53.9% | 62.8 |
| 2 | 600 | 30.4% | 21.7% | 54.8% | 60.5 |
| 3 | 600 | 26.1% | 26.1% | 53.1% | 50.8 |
| 4 | 600 | 26.5% | 27.4% | 51.9% | 47.2 |
| 6 | 600 | 27.9% | 30.5% | 55.4% | 45.0 |
| 8 | 600 | 32.8% | 34.0% | 56.6% | 40.0 |

**wizard**

| Equipped legendaries | Fights | Blowout% (of wins) | Mean min-HP% | Mean end-HP% (wins) | Deaths/100 |
|--------------------:|------:|------------------:|------------:|-------------------:|----------:|
| 0 | 600 | 11.3% | 12.5% | 36.7% | 64.7 |
| 1 | 600 | 14.0% | 13.2% | 38.1% | 64.2 |
| 2 | 600 | 18.8% | 15.0% | 42.3% | 63.7 |
| 3 | 600 | 21.8% | 14.9% | 43.4% | 64.8 |
| 4 | 600 | 19.0% | 14.6% | 40.3% | 63.2 |
| 6 | 600 | 20.4% | 17.7% | 44.4% | 59.2 |
| 8 | 600 | 28.2% | 21.6% | 47.3% | 53.3 |

**Read:** every class climbs gently and monotonically and **never saturates**.
Across 0→8 legendaries the marginal value per relic is small and shows no
acceleration (if anything it tapers): fighter deaths/100 69→50, blowout 3→22%;
barbarian 63→40, 20→33%; wizard 65→53, 11→28%. At the top of the range — 8
legendaries, more than most veterans ever bank — all three are **still dying
40-53 times per 100 fights** and blowing out only a fifth-to-a-third of wins.
That is a class power band being lifted, not a threat floor being deleted. A
genuine runaway would show deaths/100 collapsing toward 0 and blowout toward
~100% as relics pile up. It does not.

## Probe A — observational (with the confound exposed)

The raw reincarnation loop. **Read the confound columns:** legendary count
co-accumulates with level, Grove ranks, chapter and ascension, so this table
does **not** isolate the legendary lever — it shows the whole veteran package.

**All classes pooled — fights by equipped legendary count**

| Legendaries | Fights | Blowout% (of wins) | Mean min-HP% | Mean end-HP% (wins) | Deaths/100 | ~Ascension | ~Level | ~Grove ranks | ~Chapter |
|------------|------:|------------------:|------------:|-------------------:|----------:|----------:|------:|------------:|--------:|
| 0 | 12445 | 13.5% | 28.9% | 45.8% | 24.3 | 0.00 | 1.6 | 2.7 | 1.1 |
| 1-2 | 15574 | 23.1% | 40.2% | 54.0% | 16.3 | 0.00 | 2.2 | 4.8 | 1.3 |
| 3-4 | 13507 | 38.6% | 54.5% | 67.6% | 11.1 | 0.00 | 3.3 | 6.4 | 1.9 |
| 5+ | 142978 | 67.7% | 78.4% | 87.6% | 3.5 | 1.01 | 7.8 | 12.3 | 4.8 |

**All classes pooled — lives by equipped legendary count**

| Legendaries | Lives | Clear% | Mean depth (rooms) | ~Ascension | ~Grove ranks |
|------------|------:|------:|------------------:|----------:|------------:|
| 0 | 3021 | 0.0% | 6.5 | 0.00 | 2.6 |
| 1-2 | 2540 | 0.0% | 10.3 | 0.00 | 4.8 |
| 3-4 | 1503 | 0.1% | 15.6 | 0.00 | 6.5 |
| 5+ | 5272 | 5.3% | 49.4 | 0.47 | 10.8 |

**Fighter only (the veteran-ceiling exemplar) — fights**

| Legendaries | Fights | Blowout% (of wins) | Mean min-HP% | Mean end-HP% (wins) | Deaths/100 | ~Ascension | ~Level | ~Grove ranks | ~Chapter |
|------------|------:|------------------:|------------:|-------------------:|----------:|----------:|------:|------------:|--------:|
| 0 | 2276 | 6.4% | 26.4% | 51.3% | 20.6 | 0.00 | 1.7 | 2.2 | 1.1 |
| 1-2 | 2894 | 13.7% | 36.0% | 55.2% | 14.8 | 0.00 | 2.5 | 4.4 | 1.5 |
| 3-4 | 2847 | 31.3% | 52.7% | 69.3% | 8.8 | 0.00 | 4.9 | 6.0 | 3.0 |
| 5+ | 57863 | 71.8% | 83.6% | 93.1% | 1.6 | 2.50 | 10.3 | 13.7 | 6.5 |

**Back-half only (chapter ≥ 6), all classes — fights**

| Legendaries | Fights | Blowout% (of wins) | Mean min-HP% | Mean end-HP% (wins) | Deaths/100 | ~Ascension | ~Level | ~Grove ranks | ~Chapter |
|------------|------:|------------------:|------------:|-------------------:|----------:|----------:|------:|------------:|--------:|
| 0 | 0 | — | — | — | — | — | — | — | — |
| 1-2 | 149 | 37.5% | 56.0% | 68.8% | 8.7 | 0.00 | 11.6 | 4.8 | 7.3 |
| 3-4 | 803 | 52.2% | 69.6% | 83.8% | 5.2 | 0.00 | 12.9 | 5.8 | 8.2 |
| 5+ | 51734 | 70.5% | 81.6% | 92.6% | 3.2 | 1.61 | 13.7 | 13.5 | 8.8 |

**The confound, quantified.** The 5+ bucket looks unstoppable (deaths 3.5/100,
blowout 68%), but it is simultaneously **~6 levels higher and ~10 Grove ranks
deeper** than the 0 bucket, and it is fighting **harder** content (chapter 1.1 →
4.8, ascension 0 → 1.0). Probe B holds exactly those fixed and shows the
legendary slice of that gap is small: a fighter at the back-half-realistic L12
with **zero** Grove still dies 50/100 even at 8 legendaries, versus 1.6/100 in
the Probe A 5+ fighter row that carries 13.7 Grove ranks and ~2 more levels.
**Grove ranks + level — not legendary count — are doing the heavy lifting.** This
also cross-validates the Barb lane's "veterans are strong" read (fighter veteran
blowout ~72% here vs 67% there): true, but the strength is the package, and the
legendary slot is not its runaway component.

## Bottom line

- Uncapped legendary slots: **healthy**. Marginal value per legendary is modest,
  roughly linear, mildly diminishing, and far from trivialising the back half
  even at 8 stacked relics.
- No tuning warranted on the legendary slot (no soft cap, no DR curve, no slot
  cap) on this evidence.
- The late-game veteran power that motivated the "Ch6 ceiling" flag is real but
  localises to **level + Grove ranks** (the whole meta package), not to legendary
  count. Whether that joint curve wants attention is a separate question and a
  user decision — out of scope here.
