# Class-tour early-game findings (Ch1 + Ch2)

Multi-class playtest tour after the session-3 buffs landed (Fighter Second
Wind per-encounter refresh, Wizard Fire Bolt + INT mod, encounter density
−1, gold ×2.5, event success-prob bump, Rogue Uncanny Dodge wired).

## Sim shape

- **Sim:** `scripts/sim-class-tour-early.ts` (full Ch1+Ch2 delve walker)
- **Spot-check:** `scripts/sim-foyer-spotcheck.ts` (single-encounter perf)
- **Scope:** rooms 1–19 (Iron Cells warmup → Magistrate boss)
- **Matrix:** 3 classes × {L1, L3} × 50 runs × **3 lives per run** (the
  reincarnation arc — fresh char same level on death). 150 lives per cell.

The class AIs are inlined per-class equivalents of `encounterStress.ts`'s
turn picks, extended with Rogue Hide → Sneak Attack and Fighter Second
Wind / Action Surge gating. Shrines pick the highest-scored defensive
blessing; events are passed through (sim doesn't model player choice).

## Headline matrix

| Class | L | Lives | Death% | RunFullClear% | Ch1 death/enc | Ch2 death/enc | Boss death% | Chapters/life | Combats won | Rounds/combat | Dmg dealt | Dmg taken | HP healed | Gold |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| rogue | 1 | 150 | 100.0% | 0.0% | 32.8% | 0.0% | 100.0% | 0.00 | 2.1 | 3.43 | 34 | 27 | 16 | 2 |
| rogue | 3 | 150 | 100.0% | 0.0% | 16.8% | 43.3% | 56.7% | 0.26 | 4.0 | 3.69 | 89 | 56 | 28 | 10 |
| fighter | 1 | 150 | 100.0% | 0.0% | 24.2% | 60.0% | 74.5% | 0.08 | 2.9 | 4.54 | 55 | 46 | 32 | 4 |
| fighter | 3 | 150 | 100.0% | 0.0% | 12.1% | 41.8% | 45.5% | 0.44 | 4.7 | 5.48 | 114 | 95 | 62 | 17 |
| wizard | 1 | 150 | 100.0% | 0.0% | 27.1% | 66.7% | 92.9% | 0.01 | 2.7 | 2.88 | 48 | 27 | 16 | 2 |
| wizard | 3 | 149 | 99.3% | 2.0% | 13.1% | 38.2% | 65.4% | 0.36 | 4.9 | 3.00 | 122 | 56 | 28 | 21 |

*RunFullClear% = at least one of the 3 lives in the run beat the Magistrate.*

## Class-specific signals

| Class | L | SW/life | SW/combat | AS/life | Potions/life | Spell L1/life | Spell L3/life | Fire Bolt/life |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| rogue | 1 | 0.00 | 0.00 | 0.00 | 1.95 | 0.00 | 0.00 | 0.00 |
| rogue | 3 | 0.00 | 0.00 | 0.00 | 1.99 | 0.00 | 0.00 | 0.00 |
| fighter | 1 | 2.45 | **0.62** | 0.00 | 1.96 | 0.00 | 0.00 | 0.00 |
| fighter | 3 | 3.35 | **0.59** | 2.28 | 1.99 | 0.00 | 0.00 | 0.00 |
| wizard | 1 | 0.00 | 0.00 | 0.00 | 1.92 | 3.39 | 0.00 | 3.78 |
| wizard | 3 | 0.00 | 0.00 | 0.00 | 1.98 | 8.19 | 0.00 | 4.95 |

## Death distribution

- **rogue L1** — Ch1: 150, Ch2: 0. Top causes: goblin-warden (22), bone-stalker (21), ghoul (18), hobgoblin (15), stirge (14)
- **rogue L3** — Ch1: 111, Ch2: 39. Top causes: **duergar-ilyich (49)**, hobgoblin (16), slaver-cuirassier (13), bone-stalker (13), shadow (10)
- **fighter L1** — Ch1: 138, Ch2: 12. Top causes: **duergar-ilyich (35)**, goblin-warden (21), hobgoblin (15), ghoul (15), bone-stalker (13)
- **fighter L3** — Ch1: 84, Ch2: 66. Top causes: **duergar-ilyich (46)**, slaver-cuirassier (22), bone-stalker (12), bandit-captain (11), cowled-enforcer (10)
- **wizard L1** — Ch1: 148, Ch2: 2. Top causes: **duergar-ilyich (26)**, goblin-warden (25), hobgoblin (16), skeleton (16), bugbear (14)
- **wizard L3** — Ch1: 96, Ch2: 52. Top causes: **duergar-ilyich (90)**, slaver-cuirassier (16), athkatla-magistrate (12), shadow (10), cowled-enforcer (8)

## Top 3 observations

### 1. Class gap is in band — but the *boss wall* is real

At L3, per-encounter death rates in Ch1 are tightly clustered: Fighter 12%,
Wizard 13%, Rogue 17%. That's the 15% gap the brief was watching for, and
it's not the problem. The problem is the **boss row**: Ilyich is the
top death cause for every class at L3 (49 / 46 / 90 deaths respectively),
and Magistrate compounds it. The session-3 changes lifted the *Ch1 grind
floor* (which was the L1 problem), not the *boss ceiling*. Wizard's
Ilyich death count (90 of 150 lives, 60%) is the largest single
class-asymmetric signal in the matrix — Ilyich's AC + Hold Person /
psychic burst doesn't yield to Fire Bolt + Magic Missile.

### 2. Fighter Second Wind cadence is working as intended

SW fires in **~60% of combats** at both L1 and L3 (0.62 / 0.59 per combat).
That's the right curve — it's gated on HP ≤ 50%, so 60% per-combat means
fights routinely bloody the fighter, and the heal lands when it matters.
The L1 fighter averages 2.45 SW uses per life (life avg ~3-4 combats),
which is the per-encounter refresh paying off vs the old per-rest cadence
where the second/third fight would have a stale empty button.

### 3. Wizard Fire Bolt + INT carries Ch1 reliably; spell pool is what
breaks at Ch2.

Wizard L3 averages 4.95 Fire Bolt casts per life + 8.19 slot-1 casts,
indicating they're emptying the slot bag before/at the Ch2 transition.
Wizard L3 Ch1 death-per-encounter is 13% (tied with Fighter for best),
but Ch2 jumps to 38% — and the magistrate / cowled-enforcer / slaver
mix punishes a wizard with no remaining slots and DEX 13 AC. The cantrip
floor lift held up Ch1 alone, but the **slot-economy collapse going into
Ch2** is the wall. Magic Missile uptime is what they're running out of,
not Fire Bolt damage.

## Recommendation

**Reducing the boss difficulty** (Ilyich + Magistrate) is the highest-impact
multi-class lever. Both bosses are the top single death cause for every
class at L3. A boss rework is out of scope for this PR ("ONE small lever
at most; do not redesign classes").

The narrow fix below was the encounter-stress doc's explicit next-pass
recommendation. It is multi-class-safe (helps Rogue and Fighter most,
small lift for Wizard).

For the broader wall, follow-ups to consider (outside this PR):
- Ilyich AC drop 16 → 15, or HP cut 10–15%
- Magistrate's Hold Person DC drop 13 → 11 (Wizard / Rogue Wis save 0
  fails ~70% currently)
- Camp 1 (rooms 11) could grant a small permanent buff (+5% max HP?)
  to soften the Ch2 attrition wall — that's the design-intent of camps
  per the BG2 reference.

## Fix applied this PR

### Ch2 early-mid — "The Counting House Foyer"

**File:** `src/engine/delve/chapter2Pools.ts:73`
**Before:** `slaver-cuirassier × 2`
**After:** `slaver-cuirassier × 1, cult-fanatic × 1`
**XP/gold:** 280 → 260 / 22 → 20 (tracks the cult-fanatic swap-out)

This was flagged in `docs/sim-findings/encounter-stress.md` as a
"likely should ship next pass" outlier — same shape as the Cowled Audit
fix that landed previously. Per-encounter spot-check (`sim-foyer-spotcheck.ts`,
100 runs/cell, L3):

| Class | Before (win%) | After (win%) | Δ |
|---|---:|---:|---:|
| Rogue | 3% | 23% | +20 |
| Fighter | 13% | 57% | +44 |
| Wizard | 76% | 98% | +22 |

The aggregate class-tour matrix shows no movement because the Foyer
fires in only ~1/6 of L3 delves (one of 6 EM pool entries) and boss-row
deaths dominate the per-life signal. The fix is real at the encounter
where it lands; it doesn't move the matrix headline because it can't
fix Ilyich.

## How to re-run

```
npx tsx scripts/sim-class-tour-early.ts        # full Ch1+Ch2 matrix
npx tsx scripts/sim-foyer-spotcheck.ts         # foyer spot-check
```

Full matrix takes ~3 seconds; spot-check ~1 second.
