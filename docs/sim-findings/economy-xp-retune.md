# Economy re-tune — XP loosening for routed play (before/after)

> Hand-written findings for the `feat/economy-xp` lane. Pairs with the
> auto-generated `class-viability.md` (which now reflects the post-change table).
> Balance is data-driven — see the AI-floor caveat below before reading the
> absolute numbers.

## The problem

The branching node map walks roughly **one node per layer** (9 nodes/chapter,
about half combat), so a single route is far fewer fights than the old
all-rooms delve and feeds **~half the XP**. The XP-to-level table was tuned for
the old fight count, so a routed run reached every boss **2–3 levels light** and
the clear-rate collapsed (confirmed in the path-aware re-sim and in hand-play —
a bare level-1 getting wrecked by the already-detuned famished-ghast in Ch1).
The worst offender was the **L3→L4 cliff (600 → 2000 XP)**, which alone stranded
players at L3 through most of a run.

## The change

**XP-to-level table** (`src/engine/character/leveling.ts`) — pulled the upper
bands down ~half and flattened the cliff so a normal route reaches the level the
content expects:

| Level | Old | New | Δ |
|------:|----:|----:|--:|
| 2 | 300 | 250 | −50 |
| 3 | 600 | 550 | −50 |
| 4 | 2000 | **1100** | −900 (cliff killed) |
| 5 | 4500 | 2200 | −2300 |
| 6 | 9000 | 4000 | −5000 |
| 7 | 13000 | 6200 | −6800 |
| 8 | 18000 | 9000 | −9000 |

The per-level deltas now climb smoothly (250 / 300 / 550 / 1100 / 1800 / 2200 /
2800) — no cliff. Cumulative routed XP (~1k by Ch1 boss, ~2.8k by Ch2, ~5.8k by
Ch3, ~9.7k for a full clear) now maps to ≈L3–4 by the Ch1 boss, L5 by Ch2, L6 by
Ch3, and L7–8 in Ch4, with a clean full clear topping out at the cap right at the
Matron. L2/L3 stay an early grind on purpose.

**Boss-intel paid edge** (`src/content/bossIntel.ts`) — the "study the approach"
cost was a trivial flat 8 / 15 / 25 / 40 by chapter. Replaced with a
super-linear `bossIntelCoinCost(chapter) = 5·ch² + 20·ch` → **25 / 60 / 105 /
160**, so it tracks the rising purse a player carries deeper in (boss drops +
elite/combat gold both climb by chapter) and stays a real gold sink — a genuine
trade against a potion or a piece of gear instead of pocket change.

## Validation — path-aware class-viability sim

`scripts/sim-class-viability.ts`, **50 souls × 100 lives** per class, identical
seed schedule. BEFORE was run by temporarily reverting only the XP table (the
boss-intel cost doesn't touch this sim — it skips events/shops), so the two
columns are a true apples-to-apples on the same routes.

| Class | clear% | avg final lvl | avg depth (of 54) | mean asc cleared | topped A6 | first A0-clear life |
|------|-------:|-------------:|------------------:|-----------------:|---------:|--------------------:|
| fighter | 0.0% → **1.1%** | 2.67 → **3.46** | 12.1 → 13.3 | 0.00 → 0.24 | 0% → 0% | 62.0 → 73.6 |
| rogue | 0.1% → **2.0%** | 2.40 → **3.05** | 10.6 → 11.6 | 0.00 → **1.02** | 0% → 0% | 91.1 → 74.2 |
| wizard | 0.0% → 0.0% | 2.83 → **3.77** | 13.6 → 15.2 | 0.00 → 0.00 | 0% → 0% | — → 86.5 |
| barbarian | 0.9% → **5.4%** | 3.23 → **4.29** | 16.3 → 17.9 | 0.14 → **4.36** | 0% → **8.0%** | 80.9 → **33.7** |
| ranger | 0.0% → **0.7%** | 2.22 → **2.77** | 9.4 → 10.1 | 0.00 → 0.16 | 0% → 0% | — → 79.2 |

### Read

- **Recovery, not trivialization.** Average final level rose for every class
  (+0.55 to +1.06) — the routed bot now reaches a sane level instead of dying at
  L2–3. Per-life clear% climbed back from the collapse to **single digits**
  (fighter 0→1.1%, rogue 0.1→2.0%, barbarian 0.9→5.4%, ranger 0→0.7%), exactly
  the "clears sometimes, not 99%" target.
- **The meta ladder is reachable again.** Mean ascension cleared went from ~0 to
  rogue 1.02 and barbarian 4.36 (barbarian now **tops Ascension 6 in 8% of
  souls**, up from 0%), and barbarian's first A0 clear dropped from life ~81 to
  ~34. The reincarnation/ascension loop can actually progress.
- **Wizard and ranger stay near-zero clear%** — but their *levels still rose*
  (wizard 2.83→3.77, ranger 2.22→2.77). The residual is an **AI-floor / engine
  artifact**, not the XP lever: the bot plays wizard spells poorly, and the
  ranger's ranged identity gets no defensive payoff in the non-positional engine
  (the open [[dd-roguelite-2026-05-30-playtest-round2]] decision). Don't read
  these absolutes as class balance.

> ⚠️ **Read RELATIVE, not absolute.** The `takeTurn` bot underplays a real
> player, so absolute clear-rates/life-counts are an AI-floor artifact, not game
> truth (the user clears the whole game by hand). The deliverable is the
> direction: under-fed → appropriately-fed, collapse → recovery, ladder
> unreachable → reachable. The boss-intel cost change is not exercised by this
> sim (it skips events/shops); its purpose is the gold sink, measured by
> hand-play / the economy sims, not here.
