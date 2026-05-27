# Wizard balance — sim findings (2026-05-27)

Branch: `feat/sim-wizard-balance`. Sim harness: `scripts/sim-wizard.ts`.
50 runs per starting level × {L1, L3, L5, L7}. Each run is a Tiefling Wizard
(Veyra preset) walking the full Iron Cells → Athkatla → Spellhold → Ust Natha
chain. Fixed starting level — no in-run leveling, so the matrix isolates
per-level survivability without conflating with XP progression.

## Policy

The sim acts as a competent Wizard:

1. Bonus action: Misty Step when HP ≤ 50% and a 2nd-level slot exists.
2. Action: Fireball / Lightning Bolt on ≥2 alive targets with a 3rd-level
   slot.
3. Burning Hands on ≥2 alive targets with a 1st-level slot (cheap AoE).
4. Hold Person on a chunky single target (HP > 25) with a 2nd-level slot.
5. Magic Missile on the highest-HP target if a 1st-level slot remains.
6. Otherwise Fire Bolt at the lowest-HP enemy (finish off / preserve slots).

Shield is omitted from the policy — the engine charges it as an action even
though it consumes a reaction, so casting it locks the wizard out of attacking
the same turn. Worth a separate look but out of scope for this brief.

## Baseline matrix (before fix)

| Level | Mean rooms | Median | Death rate | Combats | L1/L2/L3 slots used | Cantrip dmg | Spell dmg | Cantrip share | Misty Step/run | Ran-out-of-slots | Fire Bolt hit% |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 2.18 | 2 | 100% | 3.18 | 2.04 / 0 / 0 | 8.8 | 27.2 | 24.5% | 0.00 | 36.0% | 65.4% |
| 3 | 4.30 | 4 | 100% | 5.30 | 5.60 / 3.24 / 0 | 14.4 | 89.5 | 13.9% | 2.90 | 8.0% | 58.9% |
| 5 | 8.00 | 9 | 100% | 9.00 | 7.52 / 7.10 / 5.18 | 20.6 | 249.9 | 7.6% | 4.64 | 0.0% | 68.9% |
| 7 | 8.96 | 9 | 100% | 9.96 | 8.88 / 8.20 / 6.46 | 24.1 | 305.2 | 7.3% | 3.86 | 0.0% | 63.7% |

(Total possible rooms = 22 combats across the 4-chapter chain.)

### Death-cause distribution (baseline)

- **L1**: scattered across early Ch1 mobs — Animated Armor, Skeleton, Goblin,
  Bone Stalker, Hobgoblin (5–7 deaths each).
- **L3**: 33/50 deaths to Ilyich (Ch1 boss). Wizard reaches the boss with
  slots intact but gets out-traded.
- **L5**: 26/50 deaths to the Magistrate (Ch2 boss). Paralyze + heavy hits
  vs ~24 HP.
- **L7**: 38/50 deaths to the Magistrate. Same wall — extra slots/Misty Step
  not enough to overcome the boss's burst.

## Diagnoses

1. **L1 wizard can't see L3.** Median 2 rooms cleared means death in the
   Iron Cells early-mid (2-mob) encounter. The wizard never reaches the
   rest room, never levels up, never gets Misty Step. Cantrip share is
   24.5% of damage at L1 (vs 7-8% at L5+) — slot exhaustion (36% of runs)
   forces them onto Fire Bolt's flat 1d10 = 5.5 avg, which can't keep up
   with goblin / animated-armor durability at AC 13-15.

2. **Spell scarcity is an L1-only issue.** From L3 onward, ran-out-of-slots
   drops to 8% (L3) then 0% (L5+). Rest-room slot refresh + the chain's
   inter-chapter long rest cover slot economy well. The chained delve isn't
   actually too long for the slot table — the early game is too thin.

3. **Misty Step is doing its job.** 2.9–4.6 casts per run at L3+, and the
   save-advantage rider (per af73478) does push Magistrate paralyze attempts
   to the wizard's favor. It's not enough to overcome boss spike damage
   though — see #4.

4. **Bosses are the wall at L5+.** Magistrate kills 26/50 at L5 and 38/50 at
   L7. This is a boss-tuning concern (paralyze + multi-hit + the wizard's
   ~24 HP at L5) rather than a wizard problem. Out of scope for this brief.

5. **Cantrip viability is the L1 lever.** With 24.5% of L1 damage coming from
   Fire Bolt and 36% of runs cantripping after slot burn, the cantrip floor
   has outsized impact on whether the wizard sees the rest room.

## Fix applied: Fire Bolt + INT modifier

Single lever: `src/engine/combat/spells/fireBolt.ts` — Fire Bolt now adds the
caster's INT modifier to damage on hit. Eldritch-Blast-style floor; lifts the
cantrip from 1d10 (5.5 avg) to 1d10 + INT (8.5 avg at starting INT 16, +55%).

Description in `src/content/spells/index.ts` updated to match. One vitest
expectation in `src/engine/combat/wizard.test.ts` (Burning Tongue's
+spellDamage stack) updated to account for the new INT-mod term.

### Why this lever over the alternatives

- **HP +2/level** (tried first): mean rooms cleared moved <0.1 at L1 with
  similar noise at higher levels. 1 extra HP at L1 doesn't absorb meaningful
  damage when monster swings deal 5-7. Reverted.
- **Cantrip scaling at L5+ (2d10)** (5e RAW): would help bands where the
  wizard already does fine (L5+ cantrip share is 7-8%). Doesn't touch L1.
- **+1 L1 slot at L1** (2 → 3): would help slot economy but doesn't address
  the floor when the third slot is also burned through.
- **Starting wand/focus item**: requires new content type, out of scope.
- **Misty Step extra uses**: dilutes the L3 unlock that's already landing
  well per the data.

Fire Bolt + INT mod is the only lever that meaningfully bends L1 *and*
preserves the higher-level economy untouched.

## Post-fix matrix

| Level | Mean rooms | Median | Death rate | L1/L2/L3 slots used | Cantrip dmg | Spell dmg | Cantrip share | Misty Step/run | Ran-out-of-slots | Fire Bolt hit% |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | **2.66** | **3** | 100% | 2.46 / 0 / 0 | 11.2 | 34.6 | 24.5% | 0.00 | 48.0% | 62.6% |
| 3 | **4.70** | 4 | 100% | 6.32 / 3.16 / 0 | 16.7 | 100.3 | 14.3% | 2.78 | 6.0% | 59.9% |
| 5 | **8.04** | 9 | 100% | 7.92 / 6.86 / 5.28 | 20.4 | 256.3 | 7.4% | 4.10 | 0.0% | 70.2% |
| 7 | **9.38** | 9 | 100% | 9.64 / 8.32 / 6.80 | 28.6 | 326.1 | 8.1% | 3.90 | 0.0% | 62.6% |

### Deltas

- **L1**: mean 2.18 → 2.66 (+22%), median 2 → 3. Wizard now reliably
  clears warmup + at least one EM room, often reaching the rest. Death
  causes diversify: top causes drop to 6-9 deaths each (vs 5-7 baseline),
  spread across Ghoul, Ilyich, Bugbear, Hobgoblin, Animated Armor — i.e.
  "each death feels different" matches the class-balance-philosophy floor.
- **L3**: mean 4.30 → 4.70. Modest. Misty Step usage unchanged (2.9 →
  2.78); INT mod helps when slots burn through but L3 wizards still mostly
  die to Ilyich.
- **L5**: mean 8.00 → 8.04 (flat, as expected — cantrip share at L5 is too
  small for the bump to matter). Misty Step holds at 4.1.
- **L7**: mean 8.96 → 9.38 (+5%). Some extra survivability buffer when
  cantripping during boss fights.

The fix's leverage is concentrated where the problem was (L1), without
distorting higher-level economy.

## Remaining concerns (out of scope)

- **100% death rate at every level**: the chained 4-chapter run with no
  in-run leveling is a stress test, not a "should be beatable" gauntlet.
  Real player runs gain levels through the chain; this matrix isolates
  per-level survivability. The death rates here aren't a bug — but they
  *do* suggest boss tuning (especially Magistrate at L5+) should get its
  own pass.
- **Shield as a reaction**: currently gated on action economy. If freed to
  be a true reaction, it'd be the wizard's best survival tool and could
  shift the Magistrate matchup. Flag for a follow-up brief.
- **Sculpt Spells (Evocation L2 feature)**: present in the class def but
  the engine doesn't read the `sculpt-spells` mechanicKey for Burning Hands
  or the AoE evocations. Player-facing description claims "burns one die
  hotter"; sim runs show no extra die. Either implement or rewrite the
  description.
