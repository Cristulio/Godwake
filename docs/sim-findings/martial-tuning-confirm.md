# Sim confirm — martial-tuning #343 (autopilot + Monk)

Measurement-only lane. No game/balance code touched. Run on `main` @ `afc557a`
(carries #343: mid-fight martial-pool regen + OFFENSE buff + Monk Flurry trim).

Commands:
- `RUNS=30 ASCENSION=0 npx tsx scripts/sim-feel.ts` (autopilot; 600 runs/14258 fights)
- `SOULS_PER_CLASS=20 MAX_LIVES=40 npx tsx scripts/sim-class-viability.ts` (Monk band + pool-spend)

---

## 1. Autopilot

### OFFENSE is now actually spent — buff WORKED

Pool-spend per combat (viability sim, balanced policy):

| Class | OFF/combat | DEF/combat | DIS/combat | Pool total/combat |
|-------|-----------:|-----------:|-----------:|------------------:|
| fighter | **0.72** | 1.57 | 3.55 | 5.83 |
| barbarian | **0.43** | 1.07 | 2.47 | 3.97 |
| ranger | **0.38** | 2.03 | 2.50 | 4.91 |

Prior OFFENSE spend was **0.14–0.21/combat**. It is now **0.38–0.72** —
fighter ~3.5×, barb/ranger ~2–3×. The "commit OFFENSE when pool is full" rule
fires. Fighter pool total **5.83/combat exceeds the 3-pt base pool**, which is
only reachable if the every-round regen refills are being consumed — so the
mid-fight regen is real and the bot drains it.

### Dead-turn % — DID NOT drop, but the metric is blind to the pool

| Class | New (#343) | post-#338 | original (pre-#338) |
|-------|-----------:|----------:|--------------------:|
| ranger | 42.6% | 40.2% | 36.6% |
| barbarian | 32.6% | 30.5% | 28.1% |
| fighter | 21.9% | 18.8% | 11.3% |
| rogue | 14.6% | — | — |
| wizard | 1.0% | — | — |

Dead-turns ticked **up**, not down. **Caveat that dominates the read:**
`sim-feel`'s `decisionProfile()` dead-turn classifier **never reads the martial
pool** — for fighter it only counts second-wind/action-surge, barb only rage,
ranger only Hunter's Mark. The new Resolve/Fury/Focus pool is invisible to this
metric. So this table cannot measure whether regen fixed pool autopilot, and its
movement is outcome-texture (deeper survival → more lone-enemy cleanup turns at
higher level), not a pool regression. The pool-spend table above is the valid
autopilot signal, and it improved.

Action-mix entropy (variety): barbarian 2.04 bits, ranger 1.64, fighter 1.07,
rogue 1.02, wizard 0.19 — martials remain the high-variety kits.

---

## 2. Monk — back in the pack, trim WORKED

Viability band (`topA6` = % of souls that reached/cleared Ascension 6;
`meanAsc` = mean ascension cleared):

| Class | topA6 | meanAsc | clr% | depth | lvl |
|-------|------:|--------:|-----:|------:|----:|
| fighter | 55.0% | 3.55 | 11.9% | 27.0 | 5.14 |
| **monk** | **0.0%** | **1.70** | 6.0% | 26.2 | 5.14 |
| barbarian | 0.0% | 1.10 | 5.0% | 48.6 | 8.85 |
| ranger | 0.0% | 0.05 | 0.8% | 34.4 | 6.59 |
| wizard | 0.0% | 0.00 | 0.0% | 7.6 | 2.13 |
| druid | 0.0% | 0.00 | 0.0% | 5.2 | 1.56 |
| rogue | 0.0% | 0.00 | 0.0% | 4.7 | 1.47 |

Monk was the **lone class topping Ascension 6** (per-hit-edge stacking). After
halving the per-hit Grove edge on Flurry extras, Monk's `topA6` is **0.0%** and
it no longer leads the ladder. Monk sits **mid-pack** (meanAsc 1.70, 2nd to
fighter), still clearly **viable**: clr% 6.0%, depth 26.2, lvl 5.14, and the kit
fires — **Flurry 2.69/combat, Stunning Strike 0.20/combat, Patient Defense
present**. Trim achieved its goal without gutting the class.

---

## Verdict

- **OFFENSE buff: WORKED.** Spend up 2–3.5× (fighter 0.72 vs 0.14–0.21 prior);
  fighter's 5.83 total/combat confirms mid-fight regen is consumed.
- **Monk trim: WORKED.** No longer the lone A6 climber (topA6 0%), back mid-pack,
  still viable with kit firing.
- **Autopilot dead-turn %: inconclusive by this metric** (structurally blind to
  the pool). It did not drop, but the valid pool-spend signal improved.

## Residual directions (no tuning here)

1. **Fighter is now the lone ladder-climber** (topA6 55%, meanAsc 3.55, far above
   monk 1.70 / barb 1.10). The role of "lone A6 outlier" moved Monk → Fighter.
   Likely the every-round-regen + deeper-pool + OFFENSE buff stacking on the
   class that gets it most aggressively. Candidate for a follow-up look.
2. **`sim-feel` dead-turn classifier should be taught the martial pool** before
   dead-turn % is trusted as the martial autopilot signal again — add
   Resolve/Fury/Focus availability to `decisionProfile()`'s `resourceKinds`.
   Until then, use the viability pool-spend instrumentation.
