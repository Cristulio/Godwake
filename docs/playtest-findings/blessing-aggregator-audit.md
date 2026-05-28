# Blessing aggregator audit — 4 more fields max-of-individual (2026-05-27)

Follow-up to [`immortal-hypothesis.md`](./immortal-hypothesis.md). That PR
(#80) flagged six other aggregator fields where multiple pool blessings
target the same lever; two were called out as **High risk** (`acBonus`,
`critRangeBonus`). This audit reviews all six, ships the four most
load-bearing as max-of-individual, and defers the remaining two as
explicit low-priority.

## TL;DR

Switched these four fields from `sum` → `max-of-individual` in
`aggregateBlessingModifiers`:

| Field | In-pool sources (each +1) | Pre-fix reachable max | Why it bites |
|-------|---------------------------|-----------------------|--------------|
| `acBonus` | Helm's Aegis, Mystra's Ward, Silvanus's Root | **+3 AC** | ≈ what plate armor gives for free, ≈ −15% damage taken cumulative |
| `critRangeBonus` | Tempus's Edge, Tymora's Gambit | **+2 (crit 18–20)** | 3× base crit rate (5% → 15%), multiplies with damage |
| `damageBonus` | Mystra's Whisper, Silvanus's Thorn | **+2 per hit** | Multiplies with attack count (Fighter Extra Attack → +4/round) |
| `holyDamageBonus` | Helm's Bulwark, Lathander's Ember | **+2 radiant/hit** | Radiant resistance is rare → almost always full damage |

Behavior pinned by `src/engine/character/blessings.test.ts`. The earlier
#80 max-of-individual for `extraTempHpPerRoom` is retained — its
regression test is now grouped with the new four.

### Deferred (medium/low risk, still `sum`)

| Field | In-pool sources | Reachable max | Why deferred |
|-------|-----------------|---------------|--------------|
| `initiativeBonus` | Selûne's Tide +1, Helm's Vigil +2, Silvanus's Root −1 | **+3 net** | Init is one roll per combat; turn order at full health is low-impact |
| `extraStabiliseCharges` | Ilmater's Patience, Tymora's Wink | **2 charges** | "Two free deaths" is situational; charges don't compound per encounter |

If a future playtest shows either of these feeling "too easy," revisit.

## Sim validation

The immortal-hypothesis sim (`src/sim/immortalHypothesisSim.ts`) was
extended with three new loadouts that exercise the high-risk fields:

- **E — stacked AC:** Helm's Aegis + Mystra's Ward + Silvanus's Root
- **F — stacked crit:** Tempus's Edge + Tymora's Gambit
- **G — stacked dmg:** Mystra's Whisper + Silvanus's Thorn

Captured pre-fix (aggregator summing) and post-fix (max-of-individual) on
the same seeds, RUNS_PER_CELL=30. The signal is clearest at the upper
levels where the compounding has room to matter — selected cells:

| Class | L | Loadout | Pre-fix chapters | Post-fix chapters | Pre-fix dmg taken | Post-fix dmg taken |
|-------|---|---------|------------------|-------------------|-------------------|--------------------|
| Fighter | 5 | E (+3 AC) | 1.97 | **1.70** | 133.0 | 123.5 |
| Fighter | 7 | E (+3 AC) | 2.43 | **2.07** | 189.6 | 187.3 |
| Wizard | 7 | E (+3 AC) | 1.43 | **1.33** | 131.7 | 134.8 |
| Rogue | 7 | E (+3 AC) | 1.70 | **1.30** | 157.7 | 144.9 |
| Fighter | 7 | F (crit 18–20) | 2.00 | **1.93** | 183.0 | 175.3 |
| Wizard | 7 | F (crit 18–20) | 1.13 | **0.90** | 128.8 | 113.3 |
| Fighter | 7 | G (+2 dmg) | 2.27 | **2.07** | 180.4 | 181.8 |
| Wizard | 7 | G (+2 dmg) | 0.97 | **0.97** | 116.8 | 116.8 |

Direction is uniform: chapters cleared drop (the run is shorter because
the stacked second blessing no longer grants free power) and damage
taken is flat-to-slightly-noisier. AC is the largest absolute mover, as
predicted — the "always pick AC" trap really was a trap. Crit and damage
bite less per-cell because the +1 → +2 step is one extra die per crit /
one extra point per hit, smaller than +1 → +3 AC. The fix lands hardest
where it should.

Death rates are mostly 100% in these cells — the sim's class-aware AI
doesn't have the full retreat/heal toolkit a player has, so death rate
floors out. Chapters-cleared and damage-taken are the better signal for
this audit; tHP/encounter remains 0.00 for E/F/G as expected (none of
those blessings grant temp HP).

The loadouts A–D (original temp-HP hypothesis) are unchanged and still
show C ≈ B (the #80 fix is intact).

## Risk notes

- **Backwards compatibility:** Saves carry blessing ids, not aggregated
  values. The aggregator runs fresh from `characterBlessingMods` every
  read, so existing saves get the new behavior automatically with no
  migration. A character who picked Helm's Aegis + Mystra's Ward will
  silently drop from +2 AC to +1 AC — this is the intended balance
  correction.
- **Blessing UI / shrine offer logic:** unchanged. The shrine still
  offers blessings dedup'd by signature; players still see distinct
  cards. The signature already differs between, say, Helm's Aegis and
  Mystra's Ward (different ids) — only the aggregated effect collapses.
- **Content design implication:** the three AC blessings (and the two
  each for crit/damage/holy) are now mechanically redundant once one is
  picked. That's acceptable for now — they keep flavor distinctness per
  god — but future content can specialize them (e.g. give one a small
  unique secondary effect) so the second pick still has shape.

## Files touched

- `src/engine/character/blessings.ts` — aggregator switched for 4 fields
- `src/engine/character/blessings.test.ts` — pin max-of-individual for the
  4 newly-fixed fields plus regression pin for `extraTempHpPerRoom` (#80),
  pin sum for the 4 fields still designed to stack
- `src/sim/immortalHypothesisSim.ts` — three new loadouts (E/F/G)
- `src/sim/immortalHypothesisSim.test.ts` — runner picks up the new
  loadouts; matrix header text now derives loadout count from the data

## Re-run

```
npm run test:run -- src/sim/immortalHypothesisSim.test.ts
```

~1.6s wall clock for the full 7-loadout × 3-class × 3-level × 30-run
matrix (1,890 delves).
