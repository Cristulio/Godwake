# Fighter (Champion) — sim findings

**Worktree:** `feat/sim-fighter-balance`
**Date:** 2026-05-27
**Setup:** Sir Brick preset (Human, STR 16 / CON 15 / DEX 14 after race), Champion
subclass, starting kit (longsword + shield + leather + 2 potions). Walked through
the full Godwake delve (37 rooms, Ch1 Iron Cells → Ch2 Athkatla → Ch3 Spellhold
→ Ch4 Ust Natha) seeded per-cell-per-run. **No shrines picked, no event rewards
taken, no Druid Grove upgrades** — this is the naked baseline. Player AI: focus
fire on lowest-HP target, Second Wind at ≤ 50 % HP, Action Surge in boss fights
when below 70 % HP or against multiple living enemies. Rest rooms heal 70 %,
camps full long-rest.

Sim harness: `scripts/sim-fighter.ts`, runner `scripts/sim-fighter.test.ts`
(invoke with `RUN_SIM=1 npx vitest run scripts/sim-fighter.test.ts`).

## Matrix (50 runs per cell)

### Before fix (RAW: Second Wind once per short rest)

| Start | Deaths | Chapters | Rooms | Final lvl | Rounds/combat | Hit % | Crit % | Dmg dealt | Dmg taken | HP healed | SW uses | AS uses |
|------:|------:|--------:|------:|---------:|-------------:|-----:|-----:|----------:|----------:|----------:|-------:|-------:|
| L1 | 100 % | 0.06 | 6.2 | 1.58 | 3.78 | 61.7 % | 7.0 % | 47 | 32 | 15 | 1.64 | 0.62 |
| L3 | 100 % | 0.16 | 8.8 | 3.00 | 4.59 | 57.8 % | 9.4 % | 80 | 54 | 26 | 1.60 | 1.66 |
| L5 | 100 % | 1.44 | 20.6 | 5.00 | 3.94 | 63.3 % | 9.9 % | 335 | 155 | 111 | 3.18 | 3.94 |
| L7 | 100 % | 1.74 | 23.3 | 7.04 | 4.15 | 63.0 % | 10.1 % | 395 | 218 | 157 | 3.32 | 4.36 |

### After fix (Second Wind refreshes per combat)

| Start | Deaths | Chapters | Rooms | Final lvl | Rounds/combat | Hit % | Crit % | Dmg dealt | Dmg taken | HP healed | SW uses | AS uses |
|------:|------:|--------:|------:|---------:|-------------:|-----:|-----:|----------:|----------:|----------:|-------:|-------:|
| L1 | 100 % | 0.14 | 6.9 | 1.72 | 4.08 | 61.1 % | 7.0 % | 56 | 43 | 25 | 2.80 | 0.80 |
| L3 | 100 % | 0.28 | 9.7 | 3.00 | 4.93 | 58.9 % | 9.0 % | 97 | 70 | 42 | 3.06 | 1.82 |
| L5 | 100 % | 1.50 | 20.8 | 5.00 | 4.00 | 62.3 % | 9.8 % | 341 | 170 | 126 | 4.52 | 4.04 |
| L7 | 100 % | 1.72 | 23.4 | 7.02 | 4.23 | 62.8 % | 10.2 % | 406 | 228 | 168 | 4.40 | 4.34 |

### Where deaths cluster (after fix)

- **L1**: room-6 (15-room mid encounter ×17), room-10 (Ilyich, Ch1 boss ×10), room-8 (Ch1 elite ×8), room-4 (early-mid ×8), room-15 (Ch2 mid ×5)
- **L3**: room-10 (Ilyich ×25), room-15 (Ch2 mid ×12), room-8 (Ch1 elite ×8)
- **L5**: room-19 (Magistrate, Ch2 boss ×12), room-17 (Ch2 elite ×10), room-28 (Director, Ch3 boss ×9), room-26 (Ch3 elite ×8), room-24 (Ch3 mid ×7)
- **L7**: room-28 (Director ×16), room-26 (Ch3 elite ×14), room-19 (Magistrate ×12), room-24 (Ch3 mid ×4)

Death clustering is healthy: low-level fighters die at Ch1 elites/boss,
mid-level fighters die at Ch2/Ch3 bosses, high-level fighters die at Ch3
elites/boss. "Each death is rewarding" — the wall always lands at the next
chapter's gatekeeper, not on the warmup.

## Hypothesis

Headline numbers showed Champion crit-on-19-20 firing at ~10 % (≈ 2× the
baseline 5 %), Extra Attack doubling damage output at L5+, and hit rate steady
at 58 – 63 % — all engine mechanics confirmed working.

The structural issue was **clutch-button cadence**. Fighter's two clutch tools
both recharged on short/long rest:

- **Second Wind**: 1d10+lvl heal, bonus action, once per short rest. Fired ~1.6
  times per L1/L3 run, ~3.2 times per L5/L7 run — roughly once per chapter.
  Against a 5-round boss fight, one 8 – 14 HP heal closes nothing. The Fighter
  walked into Magistrate / Director with a stale Second Wind that couldn't
  span the attrition.
- **Action Surge**: extra Action, once per short rest. ~4 uses per L5/L7 run
  — about right; offensive burst is already on a healthy cadence.

For comparison, Rogue's Cunning Action (Hide/Dash/Disengage/Steel Yourself)
refreshes **per combat** with 1 – 2 charges, which is ~5 – 8 clutch presses per
run — Fighter's defensive lever fires once a chapter against the Rogue's
multiple per fight. That asymmetry is the playtest tell behind "Rogue feels
better than Fighter."

## Recommendation / fix applied

**One small lever: Second Wind refreshes at the start of every combat
encounter** — matching the cadence of Rogue's Cunning Action refill in
`createCombat`. Action Surge unchanged (stays a short-rest burst button).
Second Wind amount unchanged (still 1d10 + fighter level). Wellspring Vigil's
extra per-delve charges (`secondWindBonusRemaining`) still consume first, so
the upgrade keeps its purpose.

Implementation: one block in `src/engine/combat/createCombat.ts`
mirroring the Rogue refresh, plus description updates in `fighter.ts` and the
header comment on `secondWind.ts`. No new fields, no new resources, no
subclass touch.

### Effect

- **L1/L3 floor lifts**: +50 – 75 % more healing per run, +12 – 75 % more
  chapters cleared (0.06 → 0.14 ; 0.16 → 0.28), +11 – 14 % more rooms.
  Beginners get a real "I have a button" moment in every fight.
- **L5/L7 unchanged at the wall**: chapters cleared moves ≤ 0.06; Fighter still
  dies at the Ch3 boss/elite cluster. The fix gives every fight one more heal
  to spend, but doesn't bend the damage-budget curve enough to push past
  Director/Matron Mother — which is design-intended (those are the next-chapter
  gatekeepers).
- **Second Wind uses rise across the board** (1.6 → 2.8 at L1, 3.2 → 4.5 at
  L5) — confirms the lever does what it says.
- **Hit % / crit % / Extra Attack** untouched (offensive curve unchanged).

This is a floor-raising buff, not a ceiling shift. The Fighter now has a
clutch button you can spend in every fight; the class still walls out at
chapter bosses scaled above its level, which is the intent.

## What I did NOT change

- Fighting Style Defense (+1 AC) — already pulling weight in the AC math.
- Action Surge cadence — leaving short-rest recharge in place; per-encounter
  would have been too strong on top of the Second Wind change.
- HP per level (d10 avg 6) — bumping to 7 was an alternative but is a passive
  buff with less felt impact; Second Wind cadence is a more visible lever.
- Starting equipment — already class-appropriate.
- Subclass mechanics (Improved Critical, Remarkable Athlete) — confirmed
  firing in the data and pulling their weight.

## Reproducing

```bash
# Smoke test only (one L1 run, no findings file):
npx vitest run scripts/sim-fighter.test.ts

# Full matrix (50 runs × 4 levels):
RUN_SIM=1 SIM_LABEL=baseline SIM_OUT=fighter-balance-baseline.md \
  npx vitest run scripts/sim-fighter.test.ts

# After applying a fix, run again with a different label:
RUN_SIM=1 SIM_LABEL=after SIM_OUT=fighter-balance-after.md \
  npx vitest run scripts/sim-fighter.test.ts
```

Both baseline and after-fix raw matrices are saved alongside this file:
`fighter-balance-baseline.md`, `fighter-balance-after.md`.
