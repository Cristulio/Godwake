# Immortal Hypothesis — verdict (2026-05-27)

Hand-authored companion to the auto-generated matrix at
[`docs/sim-findings/immortal-hypothesis-matrix.md`](../sim-findings/immortal-hypothesis-matrix.md).
The sim writes the raw cells; this file interprets and ships the fix.

## TL;DR

**Hypothesis CONFIRMED.** Picking Lathander's Dawn (+3 tHP) and Ilmater's
Crown (+2 tHP) together granted **+5 temp HP every combat** because
`aggregateBlessingModifiers` summed `extraTempHpPerRoom` across blessings.
Sim measured **~4.1 tHP/encounter** in loadout C versus **~2.6 tHP/encounter**
in loadout B with only Lathander's Dawn — exactly the additive signature.

**Fix shipped.** `src/engine/character/blessings.ts:56` —
`extraTempHpPerRoom` aggregation changed from `sum` to `max-of-individual`,
matching 5e RAW for temp HP (sources do not stack — take the higher).
Post-fix sim shows C ≈ B at ~2.5 tHP/encounter, and the most dangerous cell
(Fighter L7 D, fully-invested Grove + stacked blessings) moves from 7%
deaths → 20% deaths. The fix bites where it should: the "immortal" soul.

## Method

A new sim, `src/sim/immortalHypothesisSim.ts`, drives the engine through
the full Godwake delve (37 rooms, 4 chapters) with class-aware AI reused
from `src/test/sim/encounterStress.ts`. Three classes × three levels ×
four loadouts × 30 runs = **1,080 delves per pass.**

| Loadout | Description |
|---------|-------------|
| **A** — vacuum | No blessings, no Grove upgrades (floor reference) |
| **B** — single | Lathander's Dawn only (+3 tHP / room) |
| **C** — stacked | Lathander's Dawn + Ilmater's Crown (the suspect combo) |
| **D** — Grove + stacked | C + Mantle 5, Iron Will 1, Cloak 3, Hardier Soul 3, Wellspring Vigil 3 |

Shrine and event rooms are no-op so the loadout is the only blessing
source — keeps the signal clean. Each cell tracks death rate, chapters
cleared, damage taken, effective HP (max + total tHP gained), and the
key diagnostic: **average temp HP granted per combat**.

## Result — pre-fix matrix (hypothesis test)

Temp HP per encounter, averaged across L3/L5/L7:

| Class | tHP A | tHP B | tHP C | C − B |
|-------|-------|-------|-------|-------|
| rogue | 0.00 | 2.65 | **4.30** | +1.65 |
| fighter | 0.00 | 2.49 | **4.08** | +1.59 |
| wizard | 0.00 | 2.32 | **3.95** | +1.63 |

All three classes show the additive signature: C is ~1.6 tHP/encounter
higher than B. With both blessings, every combat starts with 5 temp HP
instead of 3 — a ~67% boost over the single blessing.

Where it shows up in survivability (selected cells):

| Class | L | Loadout | Pre-fix death% | Avg dmg taken | Eff. HP |
|-------|---|---------|----------------|---------------|---------|
| Fighter | 5 | C | 100% | 205 | 90 |
| Fighter | 5 | D | **37%** | 361 | 140 |
| Fighter | 7 | C | 97% | 296 | 116 |
| Fighter | 7 | D | **7%** | 388 | 157 |
| Rogue | 7 | D | 80% | 401 | 150 |

Fighter L7 D — the "fully-invested returning soul" loadout — died only **7%**
of the time. That is the playtester's "feels immortal."

## Fix

```diff
- if (m.extraTempHpPerRoom !== undefined)
-   acc.extraTempHpPerRoom = (acc.extraTempHpPerRoom ?? 0) + m.extraTempHpPerRoom;
+ if (m.extraTempHpPerRoom !== undefined)
+   acc.extraTempHpPerRoom = Math.max(acc.extraTempHpPerRoom ?? 0, m.extraTempHpPerRoom);
```

Affects all classes equally; closer to 5e RAW (temp HP doesn't stack).
Locked in by a unit test in `blessings.test.ts` that also asserts AC
keeps summing (we only carved out the temp-HP field).

## Result — post-fix matrix (same seed, same AI)

Temp HP per encounter, averaged across L3/L5/L7:

| Class | tHP A | tHP B | tHP C | C − B |
|-------|-------|-------|-------|-------|
| rogue | 0.00 | 2.65 | **2.66** | +0.01 |
| fighter | 0.00 | 2.49 | **2.47** | −0.02 |
| wizard | 0.00 | 2.32 | **2.38** | +0.06 |

C now matches B — picking the second tHP blessing grants **zero extra
survivability per combat.** (The 0.01–0.06 noise comes from the second
blessing changing other RNG-consumed values via roll order, not from any
remaining stacking.)

Where the fix lands hardest:

| Class | L | Loadout | Pre-fix death% | **Post-fix death%** | Δ |
|-------|---|---------|----------------|---------------------|---|
| Fighter | 7 | D | 7% | **20%** | +13pp |
| Rogue | 7 | D | 80% | **87%** | +7pp |
| Fighter | 5 | D | 37% | **33%** | −4pp¹ |

¹ Fighter L5 D moved slightly in the friendly direction — sample noise
at 30 runs / cell. The trend across the matrix is uniformly "stacked
loadouts get harder," which is the design intent of this PR.

## Other blessing fields that stack

Audited `aggregateBlessingModifiers` for other fields with multiple
sources in the current pool. **Not fixed in this PR — flagged for
future review.** Each row shows the maximum that could be reached by
collecting every stacking blessing of that type.

| Field | Stackable sources | Max reachable | Risk |
|-------|-------------------|---------------|------|
| `acBonus` | Helm's Aegis (+1), Mystra's Ward (+1), Silvanus's Root (+1) | **+3 AC** | High — −15% damage taken cumulative |
| `initiativeBonus` | Selûne's Tide (+1), Helm's Vigil (+2), Silvanus's Root (−1) | **+3 init net** | Low — initiative is once per combat |
| `damageBonus` | Mystra's Whisper (+1), Silvanus's Thorn (+1) | **+2 dmg / hit** | Medium — multiplies with attack count |
| `holyDamageBonus` | Helm's Bulwark (+1), Lathander's Ember (+1) | **+2 radiant / hit** | Medium — same as above |
| `extraStabiliseCharges` | Ilmater's Patience (+1), Tymora's Wink (+1) | **2 charges / delve** | Medium — two "free deaths" |
| `critRangeBonus` | Tempus's Edge (+1), Tymora's Gambit (+1) | **crit on 18–20** | High — 15% crit rate vs base 5% |

Recommended follow-up order if any feel "too easy" in playtests:
1. **`acBonus`** — three sources at +1 each makes "always pick AC" a no-brainer; +3 AC is what wearing plate already buys you for free.
2. **`critRangeBonus`** — a 3× crit rate is the biggest swing-per-hit multiplier in the game.
3. The rest probably play fine as-is.

Each one is its own diagnosis — needs a sim with the same A/B/C structure to confirm before changing.

## Files touched

- `src/engine/character/blessings.ts` — the one-line aggregator fix
- `src/engine/character/blessings.test.ts` — locks in max-for-tHP, sum-for-AC
- `src/sim/immortalHypothesisSim.ts` + `.test.ts` — the harness (kept for future blessing-field sweeps)
- `src/test/sim/encounterStress.ts` — exported `characterAtLevel` / `takeTurn` / `liveMonsters` so the new sim can reuse them
- `docs/sim-findings/immortal-hypothesis-matrix.md` — auto-generated post-fix matrix
- `docs/playtest-findings/immortal-hypothesis.md` — this file

## Re-run

```
npm run test:run -- src/sim/immortalHypothesisSim.test.ts
```

~1s wall clock for the full 1,080-delve matrix.
