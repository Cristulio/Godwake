# sim2 — autopilot (#338) + trash-tier teeth (#337) validation @ Asc 0

main @ `793de02`. `RUNS=30 ASCENSION=0 npx tsx scripts/sim-feel.ts` (600 full-delve
runs, 11923 fights, 46967 player turns). Supplementary level-matched read with
`LEVELS=3` (150 runs) for #337. Read RELATIVE — reach/clear are AI-floored.

DIRECTIONS only. No game/balance code touched.

## 1. AUTOPILOT — did the #338 martial pool cut dead-turns? NO (slight regression)

Per-class dead-turn % (turns with no target choice AND no discretionary lever):

| Class | New (#338) | Baseline | Δ |
|-------|-----------:|---------:|----:|
| ranger | **40.2%** | 36.6% | +3.6 |
| barbarian | **30.5%** | 28.1% | +2.4 |
| rogue | 14.6% | 13.6% | +1.0 |
| fighter | **18.8%** | 11.3% | +7.5 |
| wizard | 1.0% | 0.9% | ~flat |
| overall (turn-weighted) | 21.6% | — | — |

Ranger and Barbarian dead-turns did **not** drop — they edged up. Fighter rose
most (+7.5).

**The pool IS firing in-sim** (so this is not an "unused in sim" miss). Action-mix
by class confirms the OFFENSE/DEFENSE/DISRUPT spends fire:
- ranger: attack 62%, hunters-mark 16%, **martial-disrupt 15%, martial-defense 6%**
- barbarian: attack 49%, reckless 22%, rage 12%, **martial-disrupt 11%**
- fighter: attack 84%, **martial-disrupt 9%, martial-defense 3%**, action-surge 2%

**Why the metric regressed — the pool is too shallow for fight length.** The pool
is `MARTIAL_POOL_MAX = 3`, one spend/turn, refreshing per fight
(`src/engine/combat/martialResource.ts:29,88`). A fight therefore gets at most ~3
lever-turns. But avg fight is **3.94 rounds** and a large tail runs longer (24.5%
are 4-5 rds, 14.4% are 6-8, 5.8% are 9+). Once the 3 points are spent — typically
by round 3 — every remaining round reverts to bare weapon attacks = a dead turn.
The narrated Fighter run shows it cleanly: martial-disrupt/defense fire rounds 1-3,
then R4+ are tagged `AUTOPILOT` (Spider Broodmother, Fate-Spinner R4-R7, Matron
Mother all autopilot tails).

The Fighter +7.5 jump is the tell: the **old** maneuvers (Power Attack/Brace, #299)
were per-turn spammable with no pool, so a Fighter almost never had a "no lever"
turn. Folding them into a shared 3-point pool **removed** that always-on lever, so
post-pool turns now count as dead. Ranger/Barb get the same shallow-pool tail; their
higher attack-count turns (multiattack / reckless) make the autopilot tail longer.

**Verdict on #338:** good for *kit clarity and design unification* (one pool, fires
reliably in sim), but as an *autopilot fix* it did not work — it slightly worsened
the dead-turn metric. The opening of a fight is now a save-vs-spend decision; the
**tail of every multi-round fight is still autopilot**, and martial classes spend
more rounds past an empty pool than the pool covers.

**Directions (pick one; needs a tuning lane + re-sim, do not hand-tune):**
- Let the pool **regenerate mid-fight** (e.g. +1 point every N rounds, or on crit/kill)
  so long fights keep a lever instead of emptying by round 3.
- **Deepen the pool** or scale `MARTIAL_POOL_MAX` with level so it covers realistic
  fight length (4-8 rounds), not just the opening 3.
- Give the bot a **fallback discretionary action** for post-pool turns so the tail
  is not pure auto-attack (won't change feel for a human, but stops the metric
  read from masking the real issue).

## 2. TRASH-TIER TEETH — did #337 make Ch1-5 normals bite? NOT in the sim

Normal-fight blowout (won, HP never < 80%):

| Fight kind | New | Baseline |
|------------|----:|---------:|
| normal | 77.9% | 73.9% |
| elite | 70.9% | 61.8% |
| boss | 70.9% | 59.4% |

Normal blowout did not fall — it rose ~4 pts. Ch1-5 normal blowout by chapter:

| Chapter | Default sweep (L1/3/5/7) | Level-matched (L3 only) | ~baseline |
|--------:|-------------------------:|------------------------:|----------:|
| Ch1 | 78.1% | 79.2% | ~74% |
| Ch2 | 83.2% | 83.2% | |
| Ch3 | 86.0% | 87.0% | |
| Ch4 | 83.3% | 85.4% | |
| Ch5 | 82.8% | 85.4% | |
| Ch6 | 55.7% | 54.1% | |
| Ch7+ | 39-56% | 39-56% | |

Ch1-5 normals are **78-87% blowout** with min-HP(all) 83.6% — fights still cost
almost no HP. The Ch1-5-trivial / Ch6+-teeth gradient is unchanged from baseline.

**Important caveat — the sim cannot fairly judge trash teeth.** I ran a
level-matched `LEVELS=3` pass specifically to strip the over-level artifact (memory:
sweeps start L1/3/5/7, so L7 parties burst Ch1 trash). It made **no difference** —
Ch1-5 still 79-87%. The reason is deeper: routed XP over-levels the party for
*whatever chapter it is currently in*, in every pass. By the time a run reaches Ch5
it has leveled well past Ch5 content regardless of start level. So early-chapter
normals are structurally fought over-leveled, and a reach-sweep sim systematically
flatters trash. A clean #337 validation needs a **level-locked-per-chapter** harness
(fight Ch-N content at Ch-N's intended level), which this sim does not do.

**Verdict on #337:** un-provable as a win in this instrument; the shared threat
palette does **not** show up as reduced early-chapter blowout, but the sim's
over-leveling confound is the likely reason, not necessarily that the statblocks are
too soft. **Direction:** add a level-locked trash-fight microbench (or trust
playtest-with-a-fresh-character for early chapters); do not retune Ch1-5 statblocks
off this sim alone — that risks over-correcting content that is fine at level.

## 3. General reads

- **Overall blowout 75.4%**, comfortable-win (never < 50%) 86.9%, near-death-recover
  0.7%. Tension is still concentrated late: min-HP < 30% in only 12.2% of fights.
- **Bare-soul L1 wall intact and steep.** Start-L1 reach: fighter 3.5 rooms, wizard
  4.6, rogue 4.3, ranger 5.7, barbarian 6.9 — vs L3+ starts reaching 35-65 rooms.
  Barb deepest at the floor, Fighter shallowest. Same shape as prior passes.
- **Endgame Ch5-14 (relative, AI-floored at 0% clear).** Reach tops out ~Ch11.
  Teeth exist late: non-boss blowout drops Ch6 55.7% → Ch7 51.1% → Ch11 42.1%, and
  elite min-HP(all) 68.3% / boss 77.6%. The deep chapters are where the game has
  genuine swing; the front half does not.
- **Wizard remains the lone near-zero-autopilot class** (1.0% dead, cast 97% of
  actions) — the martial pool closed none of that gap because it doesn't touch
  casters.
