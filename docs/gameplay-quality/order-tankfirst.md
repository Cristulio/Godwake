# Tank-first swap-order — findings

> Curated verdict. Raw matrix: [`order-tankfirst.raw.md`](./order-tankfirst.raw.md).
> Sim: `scripts/sim-order-tankfirst.ts`. Canonical run: `SOULS=200 LIVES=60 SWAP_AT=6`.

## Question

A soul lives MANY lives (60), carrying renown + Grove + ascension across both
deaths and clears. Does opening with several **Fighter** lives to bank renown
safely, then **swapping** to a payoff class (Rogue / Wizard) once the Grove is
built, beat just staying one class the whole way?

## How the meta-loop actually plays out

Every strategy spends its **entire first half at Ascension 0** — the auto-battle
bot can't break the full 50-room chain until the Grove has stacked enough HP / AC
/ damage. First clears land around **life 40-50**; only then does the ascension
ladder start to climb. So the early game is purely a **renown-banking + Grove-build
race**, and the class you bank with matters:

| Early renown banked by | L5 | L10 | reaches (rooms, early life) |
|---|--:|--:|--:|
| Fighter | 168 | 350 | ~10 (dies at the Ch1 boss) |
| Rogue   | 138 | 292 | ~7  (dies before it) |
| Wizard  | 216 | 455 | ~14 (ranged, Mage Armor) |

Fighter out-banks Rogue early (deeper, safer deaths → more depth-credit renown),
but Wizard out-banks both.

## Verdict

**Tank-first → Rogue WINS — but only with disciplined "planned" buying.**

| Strategy (200 souls) | Mean clears | Asc reached | % reach A6 | 1st-clear life | Wasted renown |
|---|--:|--:|--:|--:|--:|
| Single-class fighter | 1.3 | 1.33 | 0.0% | 45.2 | 0 |
| Single-class rogue | 4.1 | 4.03 | 17.0% | 41.6 | 0 |
| Single-class wizard | 0.7 | 0.71 | 0.0% | 50.4 | 0 |
| **Tank-first → rogue (planned)** | **4.6** | **4.42** | **25.5%** | **39.7** | **0** |
| Tank-first → rogue (naive) | 4.3 | 4.11 | 22.5% | 41.0 | 22 |
| Tank-first → wizard (planned) | 0.8 | 0.78 | 0.0% | 52.5 | 0 |
| Tank-first → wizard (naive) | 0.7 | 0.68 | 0.0% | 52.6 | 18 |

- **Tank-first → Rogue (planned) is the best line of all seven.** It reaches
  Ascension **4.42** vs single-class rogue's **4.03**, lifts the **A6 rate from
  17% → 25.5%**, and breaks through **~2 lives earlier** (39.7 vs 41.6). The
  mechanism: the Fighter is a *safer, deeper early banker* than the Rogue, so the
  shared Grove (HP / AC / weapon) builds faster, and the Rogue — which inherits
  every account-level Grove rank on the swap — takes over as the payoff class with
  a head start.

- **"Planned" means: from life 1, only buy SHARED survivability + the destination
  (Rogue) Grove nodes.** Grove purchases are account-level and persist across a
  swap, so a Fighter can pre-kit the Rogue it will become. Zero wasted renown.

- **The swap doesn't strand value as long as you don't buy class-locked nodes for
  the class you're leaving.** This is the key distinction from the sibling
  caster-first / rotate sims (which found swapping *loses*): they spent renown on
  the class being abandoned. Here, planned buying commits renown to ONE Grove —
  the Rogue's — and just uses the Fighter as the early vessel.

## The degenerate pattern: naive buying + late swap

The "naive" buyer purchases for **whoever descends next**, so during the Fighter
phase it sinks renown into the Fighter-locked **Wellspring Vigil** (and, for a
Wizard target, the whole martial weapon tree) — all inert after the swap. The
longer the Fighter phase, the worse it gets:

| Tank-first → rogue, by swap point | Asc reached | Mean clears | Wasted renown |
|---|--:|--:|--:|
| naive, swap@3  | 4.18 | 4.3 | 1 |
| naive, swap@6  | 4.11 | 4.3 | 22 |
| naive, swap@12 | **3.79** | **3.9** | 100 |
| naive, swap@20 | **3.63** | **3.7** | 100 |
| planned, swap@3  | 4.21 | 4.3 | 0 |
| planned, swap@6  | 4.42 | 4.6 | 0 |
| planned, swap@12 | 4.38 | 4.5 | 0 |
| planned, swap@20 | 4.43 | 4.7 | 0 |

Naive + a **late** swap (12-20 Fighter lives) falls **below the single-class rogue
baseline** (3.63 vs 4.03) — you've poured a dozen-plus lives of renown into a Grove
tree you then throw away. **Planned buying is flat-to-rising across all swap points
(4.2-4.4) and beats baseline at every one.** The optimum is a broad plateau: swap
after ~6-20 Fighter lives, it barely matters — what matters is *what you buy*, not
*when you swap*.

## Tank-first → Wizard loses regardless

Wizard is a weak payoff class under the auto-battle policy (0.7 clears, never climbs
past ~A1). Feeding it banked Fighter renown is wasted effort: tank-first → wizard
(0.78) ties or trails single-class wizard (0.71). If the destination class can't
convert Grove into clears, no opening can save it.

## Takeaways for design

1. **The hub class-swap is a viable — even optimal — meta tool when used with
   discipline.** Tank-first → Rogue (planned) is the single best strategy measured.
   It does NOT contradict the sibling "commit renown to one Grove" lesson; it
   *embodies* it (commit to the Rogue Grove, bank early with the Fighter body).
2. **The risk surface is real and worth a UI nudge.** `carrySoulProgress` carries
   *spend*, not *value* — class-locked Grove nodes bought before a swap are stranded.
   A naive player who buys Wellspring Vigil then swaps to Rogue is strictly worse
   off than never swapping. The Grove screen could flag class-locked nodes ("Fighter
   only") so the swap doesn't quietly burn renown.
3. **Wizard needs help to be a swap target at all** — see the per-character /
   rogue-meta-journey sims; it under-converts Grove into reach under auto-battle.

## Caveats

- **Absolute reach is the auto-battle floor, not game truth.** As prior order sims
  note, the bot under-plays (no shop, no level-up stat picks, generic targeting),
  and `LIVES=60` truncates the climb before the ladder tops out. The
  [[dd-roguelite-2026-05-29-rogue-meta-journey-sim]] clears 6/6 with a tuned Rogue
  playstyle. **The relative ordering is the trustworthy result; the absolute
  ascension numbers are a lower bound.**
- Untested adjacent hypothesis worth a sibling sim: since **Wizard banks the most
  early renown**, a "**caster-first → Rogue**" order (not Fighter-first) might bank
  the Grove even faster before handing to the payoff class. The existing caster-first
  sim tested Wizard→Fighter (wrong payoff class); Wizard→Rogue is open.
