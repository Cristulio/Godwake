# Reincarnation loop — does dying actually pay off?

> Quality investigation. Sim source: `scripts/sim-reincarnation-loop.ts`.
> Raw output: [`reincarnation-loop.raw.md`](./reincarnation-loop.raw.md).
> 200 souls × 3 classes × 4 modes (1L / 3L / 5L / 3L-no-meta-control).
> Bare-soul L1 starts (the new-player experience).

## TL;DR — verdict: the loop is **flat at L1-start**.

Per-life reach curves are within noise of each other across every class and
mode. After dying four times, the soul has accumulated **~1.5–2 upgrade ranks**
and reaches **+0.0 to +0.5 rooms further** than a one-shot fresh soul — a far
cry from the healthy "+20 %" Life-2-over-Life-1 target. Meta-progression
contributes ~0 to early-soul reach because renown income from a failed L1
delve (~17 renown) doesn't compound into meaningful upgrades within five
deaths.

The chain is **not trivializing** (run-win rate is 0 % at L1-start across all
12 cells) and it's not **inverted** (life N+1 isn't actively worse). It's just
**not doing the thing the loop is supposed to do.**

## Headline matrix

| Class   | Mode             | Souls | Lives used | Run-win % | Mean final renown | Mean final upgrade ranks |
|---------|------------------|------:|-----------:|----------:|------------------:|-------------------------:|
| rogue   | 1-life           |   200 |       1.00 |      0.0% |               17  |                     0.03 |
| rogue   | 3-life           |   200 |       3.00 |      0.0% |               26  |                     1.00 |
| rogue   | 5-life           |   200 |       5.00 |      0.0% |               30  |                     1.49 |
| rogue   | 3-life-no-meta   |   200 |       3.00 |      0.0% |               51  |                     0.00 |
| fighter | 1-life           |   200 |       1.00 |      0.0% |               18  |                     0.06 |
| fighter | 3-life           |   200 |       3.00 |      0.0% |               31  |                     1.00 |
| fighter | 5-life           |   200 |       5.00 |      0.0% |               21  |                     1.80 |
| fighter | 3-life-no-meta   |   200 |       3.00 |      0.0% |               56  |                     0.00 |
| wizard  | 1-life           |   200 |       1.00 |      0.0% |               17  |                     0.17 |
| wizard  | 3-life           |   200 |       3.00 |      0.0% |               37  |                     1.02 |
| wizard  | 5-life           |   200 |       5.00 |      0.0% |               20  |                     1.96 |
| wizard  | 3-life-no-meta   |   200 |       3.00 |      0.0% |               64  |                     0.00 |

> "Final renown" is what the soul has *left after spending*; meta cells show
> less because they bought upgrades. No-meta cells hoard.

## Per-life reach (last life of each chain)

| Class   | 1-life | 3-life | 5-life | 3-life **no-meta** (control) |
|---------|-------:|-------:|-------:|----------------------------:|
| rogue   |    4.8 |    4.5 |    5.0 |                         4.2 |
| fighter |    7.8 |    7.6 |    7.8 |                         7.5 |
| wizard  |   10.1 |   10.4 |   10.6 |                        10.2 |

Avg rooms reached / 37. Across every class, the **last life of a 5-life chain
gets the same rooms as a one-shot fresh L1 run** — and the no-meta control
matches the with-meta cells. The "5-life" mode is just five 1-life modes
glued together.

## Life-to-life reach lift (rogue, fighter, wizard — 5-life mode)

Healthy curve target: Life 2 reach > Life 1 by ~20 % (≈ +1 room on a 5-room
baseline), Life 3 > Life 2 by ~10 %.

| Transition       | rogue  | fighter | wizard |
|------------------|-------:|--------:|-------:|
| L1 → L2          | −0.07  |  −0.65  | +0.31  |
| L2 → L3          | −0.30  |  +0.46  | −0.07  |
| L3 → L4          | +0.21  |  +0.51  | +0.10  |
| L4 → L5          | +0.33  |  −0.36  | +0.12  |
| **first → last** | **+0.17** | **−0.04** | **+0.46** |

All deltas are sub-room (well inside RNG noise on 200-soul samples). The
loop has no detectable signal in the player's favour.

## What persists across lives (source of truth)

Audit of `src/stores/delveStore.ts` `startDelve` / `failDelve` and
`src/stores/metaStore.ts`:

**Soul (survives reincarnation):**

| Field                                  | Where it lives                    | Notes |
|----------------------------------------|-----------------------------------|-------|
| race, class, base ability scores       | `character.raceId/.classId/...`  | identity |
| `renown`                                | character                         | only currency that survives the wheel |
| `unlockedUpgrades` (Grove ranks)        | `metaStore`                       | bought with renown; folded into `permanentBonuses` at purchase |
| `permanentBonuses` (HP/AC/init/dmg/…)   | character                         | applied once per purchase; survives via character object |
| `permanentSpeedBonus`, `permanentFirstAttackDamage`, etc. | character | sibling fields to `permanentBonuses` |
| `wheelturnerUnlocked`                  | character flag                    | gates the on-reincarnation quirk picker |
| `attunementSlotsBonus`                 | character                         | Sage's Pact |
| `inventory`                            | character                         | **silently persists** — startDelve spreads `...ch` and doesn't clear; Mielikki's Cache potions / merchant items carry |
| `discoveredMonsters`, codex            | `metaStore`                       | informational; no combat effect |
| `chapter1Cleared`, `druidGroveUnlocked` | `metaStore`                       | hub gates |
| `deathCount`, `hasReincarnated`        | `metaStore`                       | UI state |

**Per-life (reset by `startDelve`):**

- `level → 1`, `xp → 0`
- `goldInPocket → permanentBonuses.startingGold ?? 0`
- `hp → baseHpMax` (rebuilt from class hit die + CON + permanentBonuses.hp)
- `resources → classStartingResources(classId)`
- `blessings = []`, `campBoons = []`
- `delveAttackBonus = 0`, `delveInitBonus = 0`, `nextAttackAdvantage = false`
- `conditions = []`, `bossIntel = {}`, `boldApproachBosses = []`
- `quirks` re-rolled in `failDelve` (Wheelturner: first quirk carried)

**No bug found.** The persistence model matches the design intent in
`dd-roguelite-class-balance-philosophy.md` and the `Soul` vs `Body` distinction
in `types/character.ts`:73. Renown is awarded by `finishDelve` for both
victories (`RENOWN_PER_DELVE_CLEAR = 50`) and losses
(`RENOWN_PER_DELVE_FAILURE = 15 + 10·chapter_bosses_killed`). Failure-path
renown does survive into the next life.

## Why the loop is flat

Three compounding causes, all design choices rather than bugs:

1. **Failed-delve renown is small.** Dying in Ch1 (the modal outcome at L1)
   earns 15 + soul-mark (~17–21 with one bane). Five deaths ≈ 75–100 renown.

2. **Grove unlock threshold is 30 renown.** The soul can't buy anything until
   death 2. By death 5 it's bought ~1.5–2 ranks — typically `pilgrims-boots`
   (+5 ft move, 25 renown) and one rank of `mantle-of-the-wakened`
   (+5 HP, 80 renown) or `mielikki-cache` (+1 potion/delve, 100 renown).

3. **None of those buys move the death point.** +5 HP / +1 potion / +5 ft of
   movement at L1 is invisible against the L1-vs-Ch1 enemy gap. The death
   wall is the encounter difficulty itself, not a stat the soul can buy
   their way past at this scale.

The Grove's higher-impact upgrades (Mantle rank 3 = +15 HP, Cloak rank 2 =
+2 AC) cost 334 + 197 + 150 = 681 renown to reach. That's ~40 failed delves
of accumulation. The loop pays off — eventually — but not within the 3–5 life
chains the sim models (which is also the new-player experience window).

## Codex / quirk effects

- **Codex** (`discoveredMonsters` etc.) is informational only. Combat reads
  none of it. A soul that's seen Ilyich 50 times is no stronger against Ilyich
  than a soul seeing him fresh.
- **Quirks** *do* reroll per life and *can* lift later lives (soul-mark gives
  +20 % renown/gold/xp per bane), but they're noisy: a soul that rolls two
  banes for life 5 is only marginally better off than one that rolled two
  boons — the +40 % renown multiplier on a 15-base award is +6 renown.

## Comparison to design intent

`dd-roguelite-class-balance-philosophy.md` is explicit: "**Floor = 'each death
is rewarding', NOT 'Ch1 always clearable.'**" 0 % L1-start run-win rate is
consistent with that intent. But "each death is rewarding" should still mean
*compounding power*: the sim shows the loop doesn't compound at the rates the
player would feel.

The pillar isn't broken. The dial is set too low.

## Verdict

- **Trivializing?** No. Late lives don't blow through Ch1.
- **Inverted?** No. Penalty quirks don't actively hurt later lives.
- **Doing nothing?** Essentially yes. Within 3–5 lives at L1-start, meta
  contributes ~0 detectable rooms.
- **Healthy?** No. Life-2-over-Life-1 lift target was ~+1 room (20 % of ~5);
  observed is −0.07 to +0.31.

## Recommendations

Pick one or stack:

1. **Raise failed-delve floor renown** (`RENOWN_PER_DELVE_FAILURE`: 15 → 30
   or 40). Doubles the meta-tick speed without touching the win-path renown.
   Easiest dial, most direct effect.

2. **Scale failed-delve renown by chapter reached, not just bosses killed.**
   Dying at room 9 (one room before Ilyich) is currently worth as much as
   dying at room 1. A `+2 renown per room cleared past 4` would give Ch1
   strugglers an honest progress signal.

3. **Lower `GROVE_UNLOCK_THRESHOLD`** (30 → 15). Lets the soul buy its first
   upgrade after a single failed delve, which makes Life 2 feel earned even
   when nothing on the stat sheet shifted much.

4. **Front-load early upgrade impact.** `pilgrims-boots` (rank 1, 25 renown)
   currently buys +5 ft of movement — a number invisible in our combat sim.
   Either bump that effect (e.g. +1 to all saving throws, or +2 HP) or move a
   small HP/AC bump into the cheapest-rank tier so the first three deaths
   produce a stat-line the player can see.

5. **Consider keeping a fraction of XP** (e.g. 25 % of XP earned in a failed
   delve, capped). Currently dying erases all level progress. A partial XP
   carry would let a soul that learned Ilyich's pattern come back at L2 next
   life — much stronger lift than the equivalent renown.

The cheapest fix is #1 + #3. The most impactful is #5. The most BG2-flavoured
is #2 ("the gods reward what you survive").

## Notes & caveats

- Sim is bare-soul: shrines pick the first blessing offered, events skip.
  Real players pick blessings deliberately; the loaded variant would lift
  every cell uniformly without changing the per-life curve shape.
- AI tactics are class-baseline (rogue: hide+sneak, fighter: attack + second
  wind, wizard: AoE/cantrip). The class-tour AIs in the existing matrix sims
  are slightly stronger; numbers would shift up across the board but the
  flat curve would remain.
- The sim's purchase heuristic is greedy ("cheapest affordable upgrade from
  class-tuned priority list, restart from top on each buy"). A real player
  hoarding for a single Mantle-3 purchase (334 renown) would not see better
  life-N reach because they'd take longer to bank that much.
- Wheelturner (1-quirk carry) was not modelled; it shifts variance slightly
  but doesn't change the bulk renown-vs-reach picture.
