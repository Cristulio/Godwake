# Caster-first swap-order — findings

Sim: `scripts/sim-order-casterfirst.ts`. Raw numbers: [`order-casterfirst.raw.md`](./order-casterfirst.raw.md).
Run: `JOURNEYS=400 LIVES=60 npx tsx scripts/sim-order-casterfirst.ts` (400 souls × 60-life journeys × 4 policies).

## What was tested

The hub character-swap feature (`selectCharacter` / `carrySoulProgress`): between
lives a soul can change class **without losing renown** — renown + the Grove
ledger persist (metaStore is untouched by a swap); the new vessel starts a fresh
L1 run. Strategy under test — **Caster-first**: open on the glass-cannon Wizard,
then swap to the durable Fighter to close the harder ascension tiers (inverse of
tank-first).

Two swap-timing variants, against two never-swap baselines, on shared per-journey
seeds (paired):

- `caster-first-half` — Wizard lives 1–30, Fighter lives 31–60.
- `caster-first-onclear` — Wizard until the first full-chain clear, Fighter after.
- `wizard-only` / `fighter-only` — never swap.

Full meta journey is modelled: keep reincarnating across the life budget,
accumulate renown past clears, buy Grove greedily, and **climb the ascension
ladder** (clear the chain at your highest-unlocked rung → unlock the next).
Combat uses the shared competent auto-battle policy (#147). Renown matches
`delveStore.finishDelve` exactly: `(clear?50:15) + 10·bosses + 1·rooms`, × soul-mark
× ascension multipliers.

## Headline

| Policy | Ever cleared | Mean clears | Asc unlocked | Mean highest Asc cleared | Cumul. renown | Grove ranks |
|------|-----------:|----------:|-----------:|----------------------:|------------:|----------:|
| **caster-first-half** | 57.0% | 0.81 | 0.81 | 0.42 | 3274 | 20.6 |
| caster-first-onclear | 9.5% | 0.11 | 0.11 | 0.13 | 3478 | 18.3 |
| wizard-only | 9.5% | 0.10 | 0.10 | 0.03 | 3486 | 18.2 |
| **fighter-only** | 67.5% | 1.05 | 1.05 | 0.56 | 3091 | 18.4 |

No policy reaches Ascension 6; even the fighter tops out around Ascension 1–2
within 60 lives. (The full 50-room chain is a steep gauntlet for the bot — see
caveat. Treat absolute clear/ascension rates as the AI floor; the **relative**
order comparison is the deliverable.)

## VERDICT — caster-first does NOT beat staying one class

Caster-first-half is **dominated on both axes that matter:**

- **Climbing ascension (the binding constraint):** `fighter-only` clears the chain
  far more (67.5% of journeys ever clear, 1.05 clears each) than `caster-first-half`
  (57.0% / 0.81). Spending the first 30 lives as a Wizard simply gives the durable
  closer fewer reps. The earlier you'd abandon the Wizard, the closer you get to
  pure fighter — i.e. the *optimal* caster-first is to not be caster-first.
- **Farming renown:** `wizard-only` banks the most (3486) — the glass cannon's burst
  pushes deeper on average, and renown is paid per room reached. `caster-first-half`
  banks **more** renown than `fighter-only` (3274 vs 3091) yet **clears less**. The
  extra renown is wasted: renown is not the binding constraint (every policy banks
  3000+, plenty for the relevant Grove tiers), and the durable class getting reps is.

So the swap order buys nothing: the Fighter clears more if you never leave it, and
the Wizard farms more renown if you never leave it. Caster-first-half is a
jack-of-both that beats neither at its specialty.

### Why the two classes split this way

- **Wizard = depth, no ceiling.** By late lives it reaches ~30/50 rooms (chapter 3)
  — deeper on average than the fighter — but it almost never *clears* (~1–2%/life
  even at life 60). It dies to boss burst around the chapter-3 boss. Great renown
  farm, hard survivability ceiling.
- **Fighter = clears, lower average depth.** Reaches only ~24/50 rooms on average,
  but its durability occasionally carries it through every boss. Clearing the chain
  needs the *ceiling* (surviving four bosses), not the *average*, so only the fighter
  unlocks ascension.

## Degenerate patterns found

1. **The swap craters depth ~6 rooms and wastes ~3 Grove ranks.** At the life-30
   handoff, average reach drops from **22.9 → 16.7 rooms** in a single life and takes
   ~20 lives to recover. The freshly-swapped Fighter inherits a Grove ledger built on
   Wizard priorities (`burning-tongue`, `arcane-focus`, `sigil-of-the-wakened-mind`)
   — **2.98 ranks of dead-weight, off-class renown** — and must re-buy its own scaling
   (`heirloom-blade`, `whetstone-resolve`, …) from scratch. carrySoulProgress carries
   the renown *spent*, not the renown *value*, so cross-class Grove spend is sunk.

2. **`caster-first-onclear` is dead on arrival.** It only swaps after the Wizard lands
   a full-chain clear — which the Wizard almost never does (~9.5% of journeys, late).
   The trigger fires in only a handful of journeys, so the policy is statistically
   identical to `wizard-only` (9.5% ever-clear, 3478 vs 3486 renown). An on-clear swap
   gated behind a milestone the early class can't reach never swaps.

## Takeaways for the meta loop (observations, not balance changes)

- **The healthy part:** clearing raises your ascension, which raises difficulty
  (+10% enemy HP at Asc 1…), which throttles further clears — `fighter-only`'s depth
  and clear-rate plateau even as its Grove keeps growing. The ladder self-regulates;
  the swap feature doesn't break that.
- **If anything, the swap feature's value is the *opposite* of caster-first:** a soul
  should commit renown to *one* class's Grove (or shared-only) and not strand spend in
  a class it abandons. The dead-weight finding (#1) is the cost the UI/economy should
  make legible if class-swap-mid-Grove is ever encouraged.
- **The chain's chapter-2/3 wall** (everyone stalls ~room 22–31, level ~3–4) is the
  real ceiling on ascension progress here, independent of class order.

## Caveat

The bot still under-clears the full four-chapter chain relative to a human (memory
`dd-roguelite-2026-05-29-rogue-meta-journey-sim`: a real Hide→Sneak rogue clears 6/6
ascension by hand). Even with the #147 auto-battle policy, the bot walls at chapter
2–3 on the *full* chain, so absolute ascension reach is the AI floor, not game truth.
The verdict here is a **relative** one — caster-first vs the same-AI baselines on
identical seeds — and that comparison is robust: the depth crater and the
dead-weight Grove spend are mechanical, not AI-dependent.
