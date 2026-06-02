# Renown economy — prices vs rewards (cheap or expensive?)

> Measurement only. No game/balance code changed. Reproduce with
> `npx tsx scripts/sim-renown-economy.ts` (reads `docs/sim-findings/life-records.json`,
> emitted by `SOULS_PER_CLASS=12 MAX_LIVES=30 npx tsx scripts/sim-class-viability.ts`).

## TL;DR verdict

| | Base (Asc0) | NG+ (Asc1-6) |
|---|---|---|
| **Verdict** | About right, leaning slightly cheap | Too cheap *relative* to base — Grove fills faster the higher you ascend |
| First meaningful upgrade | **< 1 run** (no wall) | < 1 run |
| Full single-soul tree | **20,084 renown** | 22k (A1) → 40k (A6) |
| Runs to MAX the tree (full clears) | **~20–29 clears** | ~17 clears at A6 (fewer than base) |

**The headline:** there is **no grind wall anywhere** — neither a too-expensive
first upgrade nor a NG+ price spike. The one structural oddity is that NG+ makes
the Grove **relatively cheaper**, not harder, because income (`renownMult`) climbs
faster than price (`upgradeCostMult`). That's the only thing worth a tuning
decision.

---

## 1. Total Grove tree cost (sum every rank to max)

`costForRank` uses `rankCost(base, r) = round(base · r^1.3)`; tree cost is the sum
over every upgrade × every rank, × `ascensionUpgradeCostMult(asc)`.

| Scope | Nodes | Cost @ Asc0 |
|---|---:|---:|
| Shared nodes only | 22 | 19,321 |
| Fighter full tree (shared + class) | 23 | **20,084** |
| Rogue | 24 | 21,229 |
| Wizard | 25 | 24,510 |
| Barbarian | 24 | 21,013 |
| Ranger | 24 | 20,722 |
| Every node in the game | 32 | 30,274 |

A single soul only ever sees the shared tab + its own class tab, so the real
target a player chases is **~20–24.5k renown** (class-dependent; wizard is the
priciest because it has three multi-rank class nodes).

Two nodes are NG+-gated (cannot be bought at Asc0 at all):
`wellspring-depths` (1,526, needs A1) and `crown-of-the-returned` (1,212, needs A3).

### Per-class tree cost across ascension (price side)

`upgradeCostMult`: A0=1.0, A1=1.1, A2=1.2, A3=1.35, A4=1.5, A5=1.7, A6=2.0.

| Asc | Fighter tree cost | income mult |
|---:|---:|---:|
| 0 | 20,084 | ×1.00 |
| 1 | 22,095 | ×1.25 |
| 2 | 24,097 | ×1.45 |
| 3 | 27,117 | ×1.65 |
| 4 | 30,135 | ×1.90 |
| 5 | 34,144 | ×2.15 |
| 6 | 40,168 | ×2.45 |

---

## 2. Realized renown income per run

### Live formula (verified in `delveStore.computeDelveRenown`)

`base = (clear?50:3) + 2·mobs + 25·bosses + 1·rooms`, then `× soulMark × renownMult`.

> ⚠️ **Sim caveat found:** `scripts/sim-class-viability.ts` carried a STALE renown
> model (fail=15, boss=10, no per-mob, no per-room) that does **not** match the live
> formula. This analysis ignores the sim's renown field and re-applies the live
> formula to the sim's run *structure* (mobs/rooms/bosses), which I instrumented.

### Competent full-clear run (one routed path through the 14-chapter chain)

Mean routed clear path: **119 rooms, 93 mobs, 14 bosses**.

| | renown |
|---|---:|
| CLEAR, bare soul (soulMark 1.0), Asc0 | **704** |
| CLEAR, 2-bane soul (soulMark 1.4), Asc0 | **986** |
| CLEAR, soulMark 1.4, A3 | 1,627 |
| CLEAR, soulMark 1.4, A6 | 2,416 |

Of the 704 base: 350 from the 14 boss bonuses, 185 from mobs, 119 from depth, 50
clear floor. The **boss term dominates** — a full clear is lucrative because the
chain is long (119 rooms).

### Bot-floor income (strict lower bound)

The shared Auto-Battle bot **never clears** (known AI-floor artifact — it dies at
mean depth ~5 rooms, L~1.8). Applying the live formula to 2,160 bot lives, bare soul:

| | renown/life |
|---|---:|
| mean | 24.7 |
| median | 14 |
| deep lives (>8 rooms, n=654) | 54.7 |
| max | 505 |

This is the floor. A real player reaching Ch2–3 banks ~60–200/run from partials,
ramping to 700–986 once they can full-clear. Income therefore **grows steeply as
the soul strengthens** — partial runs fund the early tree, clears fund the rest.

---

## 3. Runs-to-afford

| Milestone | @ Asc0 | @ Asc3 | @ Asc6 |
|---|---:|---:|---:|
| First meaningful upgrade (Pilgrim's Boots, 25) | **0.03 runs** | 0.02 | 0.02 |
| MAX the whole tree (full clears, soulMark 1.4) | **20.4 clears** | 16.7 | 16.6 |
| MAX the whole tree (bare-soul clears) | ~28.5 clears | — | — |

The cheap economy/fortune nodes (Pilgrim's Boots 25, Wider Pantheon 40, Iron Will
60, Quartermaster 70) are bought from the income of a **single deep partial run**.
There is **no first-upgrade wall**. In practice "runs to max" is higher than 20
once you count all the partial, non-clearing runs a player makes before reliable
clears — call it ~40–80 *actual* runs of a developing player, which is a healthy
meta-journey for a long-chain roguelite.

There is no live 500-renown chapter gate: `RENOWN_FOR_CHAPTER_2` is **re-exported
but never consumed** (chapters now gate on delveCount/ascension). The only renown
threshold a player actually meets is `GROVE_UNLOCK_THRESHOLD = 30`, cleared in one
decent partial run.

---

## 4. NG+ income-vs-price ratio (hypothesis CONFIRMED)

> Hypothesis: because `renownMult` (income) grows faster than `upgradeCostMult`
> (price), the Grove gets RELATIVELY CHEAPER as ascension climbs.

| Asc | income mult | price mult | income/price ratio | vs Asc0 |
|---:|---:|---:|---:|---|
| 0 | 1.00 | 1.00 | 1.000 | — |
| 1 | 1.25 | 1.10 | 1.136 | 14% cheaper |
| 2 | 1.45 | 1.20 | 1.208 | 21% cheaper |
| 3 | 1.65 | 1.35 | 1.222 | 22% cheaper |
| 4 | 1.90 | 1.50 | 1.267 | **27% cheaper** |
| 5 | 2.15 | 1.70 | 1.265 | 26% cheaper |
| 6 | 2.45 | 2.00 | 1.225 | 23% cheaper |

**Confirmed.** Every NG+ tier buys Grove power ~14–27% cheaper than the first
chain. NG+ removes economic tension from meta-progression rather than adding it —
the Grove fills *faster* the higher you ascend (16.6 clears at A6 vs 20.4 at A0).

---

## Verdict + tuning direction (DIRECTIONS ONLY — no changes applied)

**BASE (Asc0): ABOUT RIGHT, leaning slightly cheap.**
No wall on either end. ~20–29 full clears (or ~40–80 real developing-player runs)
to max a 20k tree is a reasonable meta-journey. The per-clear payout (704–986) is
on the generous side — a skilled player who can reliably full-clear fills the tree
quickly — but that's gated behind the hard skill of clearing 14 chapters, so it's
self-limiting. **If anything needs doing here, it's minor:** if the user wants the
tree to feel like a longer chase, raise the expensive offense/soul `rankCost` bases
~1.3–1.5× (leave the cheap economy/fortune nodes alone — their instant
affordability is healthy onboarding). I would not touch the reward side.

**NG+: TOO CHEAP RELATIVE TO BASE — the one real imbalance.**
Income outpaces price by 14–27% every tier, so NG+ players fill the Grove faster
than first-chain players. Whether that's a problem is a design call: it's
*friendly* (no re-grind), but it means ascension adds zero economic pressure.
**Direction if the user wants NG+ to retain economic tension:** raise
`upgradeCostMult` so it tracks `renownMult` instead of lagging it — e.g.
A1→1.2, A2→1.4, A3→1.6, A4→1.85, A5→2.1, A6→2.4 (roughly `renownMult`), which
flattens the income/price ratio back toward ~1.0. **Direction if the current
"NG+ is friendlier" feel is intended:** leave it — it's not a bug, just confirm
it's deliberate. This lever is the single clearest call in the whole economy.

**Do NOT touch:** the cheap-node first-upgrade affordability (healthy), the
`RENOWN_FOR_CHAPTER_2` constant should be deleted as dead code (vestigial, never
read) but that's cleanup, not balance.
