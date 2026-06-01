# Game-feel re-sim — post playtest-feedback batch (2026-05-31)

Measure-only pass. Ran `npx tsx scripts/sim-feel.ts` **once** at default sample
(5 classes × 4 start levels × 40 runs = **800 runs / 20,800 fights / 61,494
player turns**, ascension 0, trusted policy). No game code touched, no tuning,
no iteration. Raw tables: [`game-feel.raw.md`](./game-feel.raw.md).

Validates feel after the recently-shipped batch: spell reworks, depth-scaled
shop + dual-vendor legendaries, Legendary-Resistance → advantage-on-save, and
the chapter-gated unlock model.

> Read relatively. Reach/clear magnitudes are the AI-floor artifact; the shape
> and the deltas vs the prior baseline are the deliverable. Sample is 40
> runs/cell here vs 60/cell in the original baseline — shape is comparable, but
> treat single-percent moves as noise.

## Headline deltas vs the original baseline ([`game-feel.md`](./game-feel.md))

| Metric | Baseline | Now | Read |
|---|---:|---:|---|
| Path choices / run | 0.00 | **16.66** | ▲▲ branching map fully landed — the #1 agency lever is now real |
| Shop nodes / run | 0.00 | **2.37** | ▲ shop room kind exists and is reached |
| Shrine picks / run | ~5 | 3.98 | ~flat — real out-of-combat agency intact |
| Rest forks / run | 0.00 | 0.00 | flat — sim auto-heals; the 3-choice camp fork is **never exercised** (measurement gap, not a regression) |
| Dead-turn floor | 27.3% | **14.7%** | ▼ improved — fewer "no lever exists" turns |
| Revealed autopilot | 36.7% | **24.3%** | ▼ improved — fewer "just hit the lone enemy" turns |
| Avg rounds / fight | 3.91 | **2.96** | ▼ fights got noticeably shorter |
| **Blowouts (HP never <80%)** | 56.4% | **78.7%** | ▲▲ **REGRESSION** — tension fell off a cliff |
| Near-death-and-recover | 0.9% | 0.5% | ▼ swing nearly gone |
| Intent-bearing enemy turns | 41.4% | 63.0% | ▲ more telegraph-worthy surface to lean on |

## Verdict

**Agency is fixed; tension regressed.** The two broken halves the original lane
identified have moved in opposite directions. Run-shape agency went from a flat
58-room rail (0 path choices) to a genuine branching route with **16.66 forks,
2.37 shops, and ~4 shrine picks per run** — the branching-map + shop work landed
and is the clear win of this batch. In-combat texture also improved at the floor:
dead turns 27→15%, revealed autopilot 37→24%. But **fights are now markedly more
trivial** — average length dropped 3.91→2.96 rounds and zero-tension blowouts
jumped 56→**79%** of wins, with genuine swing (near-death-and-recover) halved to
0.5%. The early-mid game is where this concentrates: Ch2–Ch4 non-boss fights are
**90–95% blowouts**, and 75.7% of all fights never see the player below 80% HP.

The likely culprit is the shipped batch making the player-vs-enemy ratio softer
in the early band (spell reworks landing harder, Legendary-Resistance→advantage
giving the player more reliable saves/control, plus shorter fights from higher
throughput). Note the sim **skips buying**, so this is *not* gear inflation — the
trivialization is in base combat, before loot. That points at enemy threat /
spell tuning, not the shop. **Flagging, not fixing** per the brief.

Net: this batch bought a large agency improvement and a lighter-but-shorter
combat floor, at the cost of tension. The next tuning pass should pull early/mid
enemy threat back up (Ch2–4 are the softest) rather than touch agency.

## Notable per-dimension reads

- **Class texture unchanged in shape.** Dead-turn rate still splits hard by kit:
  wizard 1.0%, fighter 10.2%, rogue 11.7% vs barbarian 28.1%, ranger 25.6%. The
  martial-resource classes still autopilot most; casters least.
- **Button-spam persists.** 1.90 distinct action kinds/fight. Fighter 95.7% and
  wizard 97.5% single-button share — the "press one thing" feel the telegraph
  fix targets is intact and now sits next to a larger (63%) intent surface, so
  the telegraph lever is, if anything, more valuable than at baseline.
- **Build divergence stays high.** 97–147 distinct blessing sets across ~140
  runs/class, mean pairwise Jaccard 0.71–0.85 — runs still diverge.
- **Tension is back-loaded.** Blowout rate falls with depth (Ch1 82% → Ch6 34% →
  Ch7 34%); the trivial fights are concentrated in the first four chapters, the
  exact band the unlock model now gates new players through.

## Caveats

- Sample 40/cell vs 60/cell baseline; treat sub-2% moves as noise. The blowout
  (+22pt) and rounds (−0.95) moves are well outside that.
- Rest-fork and shop-buy agency are under-measured: the sim auto-heals at camps
  and skips purchases, so those rows are floors, not the played experience.
- Ch8/Ch9 rows have tiny n (13 / 1 wins) — ignore their blowout %.
