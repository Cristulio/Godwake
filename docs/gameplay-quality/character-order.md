# Character-order sim — verdict

> Does the character you play, and the ORDER you swap them in at the Phandalin
> hub, matter for the meta-progression loop? Is there a dominant swap strategy?
>
> Tests the hub character-swap feature (PR #141, main @ acb1003): swap class
> between runs WITHOUT losing renown (renown + Grove + quirks are soul-level;
> the new soul starts a fresh L1 run). Raw matrix:
> [`character-order.raw.md`](./character-order.raw.md). Re-run with
> `SOULS=500 LIVES=20 SWAP_AT=8 npx tsx scripts/sim-character-order.ts`.

## Setup

8 strategies × 500 souls × 20 lives. Each life is a fresh-L1 descent of the full
50-room Godwake chain, built from the class's FIXED preset (Sir Brick / Maelis
Vell / Veyra Ash). Renown is depth-scaled (per-room + per-boss + clear/fail
base, ×soul-mark). **Fairness:** life L of soul S faces the same dungeon seed and
the same quirk roll in every strategy — the only variables are which class plays
each life and the endogenous carried meta.

## Headline (mean per soul over 20 lives)

| Strategy | Cumulative renown | Grove ranks | Max depth /50 | Stranded % of spend |
|---|--:|--:|--:|--:|
| **pure-wizard** | **907** | 8.0 | 24.9 | 0% |
| tank-first→caster (8F→12W) | 817 | 7.6 | 23.1 | 6.3% |
| bank-first (W×10→F×10) | 800 | 7.7 | 20.9 | 7.7% |
| enjoy-first (F×10→W×10) | 789 | 7.6 | 22.4 | 10.5% |
| glass-first→tank (8W→12F) | 785 | 7.5 | 20.8 | 3.0% |
| pure-fighter | 705 | 6.9 | 19.6 | 0% |
| rotate-FRW | 678 | 7.0 | 20.2 | 15.5% |
| **pure-rogue** | **502** | 5.3 | 12.9 | 0% |

## Verdict

**Order matters — but mostly through one lever: how many lives you spend as your
best-banking class.** In the current build that is the **Wizard** (deepest reach
→ most depth-renown), and the **Rogue** is the floor (shallow reach, ~45% less
renown than Wizard).

1. **No swap strategy beats staying as the best single class.** Pure-wizard (907)
   tops every mixed order. Swapping never wins on raw meta accrual; the best
   swap (tank-first→caster, 817) trails pure-wizard by ~10%, exactly the cost of
   the 8 fighter lives it spent instead of wizard. There is **no dominant swap
   strategy** and no exploit that beats "play your strongest banker."

2. **Sequence barely compounds (the matched-mix test).** bank-first (W→F) and
   enjoy-first (F→W) play the SAME 10W+10F mix in opposite order and land within
   1.4% on cumulative renown (800 vs 789). Front-loading the best banker buys a
   tiny compounding edge; it is not a real strategy fork. The **class MIX**
   dominates the **sequence**.

3. **Placing a class LATE makes it peak harder.** The same Wizard reaches 15.2
   rooms at life 10 in bank-first (early, thin Grove) but **18.3 rooms at life 20
   in enjoy-first** (late, fat Grove). So if a first CLEAR were the goal, you'd
   back-load your highest-ceiling class onto a maxed Grove — order's one genuine
   payoff, even though total renown is flat.

4. **The swap penalty is real but mild.** Class-gated Grove buys (Wizard:
   burning-tongue/arcane-focus/sigil; Fighter: wellspring-vigil; Rogue:
   shadowstep/knife; plus weapon-edge buys, dead on a Wizard) are stranded when
   you change body. Rotating every life strands 15.5% of spend; directional
   swaps 3–10%; pure 0%. It's mild because the **universal** tree (HP/AC/potions/
   gold) is cheap, bought first, and never wasted — so swapping is forgiving, not
   punished. A "bank with Wizard, buy only universal, then swap to the body you
   enjoy" line loses almost nothing.

5. **The bigger meta finding: 0 clears in 80,000 lives.** A fresh-L1 soul never
   clears the 50-room chain — even after 20 lives of Grove-building the deepest
   runs top out near room 25 (mid Ch2 / early Ch3); Ch3–4 and the Matron are
   never touched. So **Ascension never advances**, and the designed meta SPINE
   (reincarnate-on-clear → Ascension ladder → clear-gated Grove tiers) is
   unreachable through this loop. The renown→Grove tree is the *only* meta axis
   that actually turns.

**Bottom line:** the swap feature is healthy — forgiving (low stranding), with a
mild, legible class-mix lever and a small late-placement-peaks-harder nuance. It
is NOT a balance risk and there is no degenerate dominant order. The actionable
concerns are elsewhere: (a) **Rogue is a weak banker** at L1-start (floor check —
each death still pays, but ~45% slower meta than Wizard); (b) **clears are
unreachable at L1**, so the Ascension ladder — the intended replay spine — is
dead weight until something makes a first clear achievable (deeper Grove ceiling,
a level/HP carry, or a shorter first chain). Tune those, not the swap.
