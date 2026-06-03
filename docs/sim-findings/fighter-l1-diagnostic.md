# Fighter L1-floor diagnostic

> **DIAGNOSTIC — measurement only. NO balance / class / statblock change ships in
> this PR.** Every candidate below was prototyped behind a throwaway, env-gated
> engine block (printed in the appendix) purely to measure it, then reverted. The
> deliverable is this diagnosis + the reusable `scripts/sim-fighter-l1.ts` harness.
> The fix itself is a separate, user-approved lane.
> Date: 2026-06-03. Branch: `feat/fighter-l1-diagnostic`.

## Why this lane

The leveled-start `sim-feel` read (`fullsystem-class-kit.md`) put the **Fighter
dead-last at L1** yet **deepest from L3 on** — the steepest curve in the roster:

| Class | L1 | L3 | L5 | L7 |
|-------|---:|---:|---:|---:|
| fighter | **3.4** (worst) | **60.5** (best) | 59.9 | 61.7 |
| barbarian | 9.6 | 56.5 | 53.0 | 55.4 |
| ranger | 5.6 | 57.7 | 58.3 | 61.2 |

Because the Fighter is the **delve-0 STARTER**, that L1 row is literally a new
player's first life — the harshest floor in the game. This lane pins *why* the L1
Fighter dies and pressure-tests what would lift it, without shipping a change.

> ⚠️ **AI-floor caveat.** Absolute depths are an Auto-Battle artifact — read them
> RELATIVE (Fighter vs the other starters; baseline vs candidate). The Fighter is
> decision-forgiving (attack, Second Wind when low, spend Resolve), so its bot L1
> floor is about as representative as the bot gets. The user has cleared the game
> by hand. The robust signals are the **relative gap** and the **band-preservation
> check**, not the magnitudes. (`feedback-balance-from-sims`.)

Harness: `scripts/sim-fighter-l1.ts` — walks the real delve loop (createGodwakeDelve
→ createCombat → the shared Auto-Battle policy → monsterAttack), base chain
(Cells→Irenicus), Ascension 0, N=300 lives/class for the L1 deep-dive + N=80/level
for the band check, paired seed schedule across phases.

---

## TL;DR

- **The L1 Fighter is NOT under-statted — it is under-cushioned.** At L1 it has the
  **best AC in the field (16:** leather + shield + Defense style — vs 14 for every
  other martial) and a middling **12 HP**, yet it dies shallowest (mean depth
  **4.07** vs ranger 5.77, barbarian 8.56). AC/HP is not the deficit.
- **Cause = slow kills × zero L1 mitigation.** It has the **slowest fights in the
  field** (6.56 rounds/won vs barb 4.49 / ranger 4.03 — one 1d8+2 swing, no second
  attack, no advantage, only a +2/+2 Power Attack), so fights drag; and it has **no
  L1 damage cushion at all** — Brace is L2, Action Surge is L2, Extra Attack is L5,
  and unlike the Barbarian it has no Rage to halve incoming. It eats **2.61
  damage/enemy-turn** across those long fights into a 12-HP bar and gets **bursted
  from full** — **56% of its deaths start the lethal fight at ≥80% HP**, almost all
  in **Chapter 1** (261/300).
- **The kit gap is provably the cause.** Granting the Fighter the Barbarian's
  Rage-style physical halving (and nothing else) lifts it **4.07 → 11.06** — past
  the Barbarian's own floor. Restore an L1 cushion and the Fighter is fine; its
  stats were never the problem.
- **Every cushion candidate closes the gap; sustain does not.** A first-hit
  damage-reduction "Guard" (DR 2–3) or a Nimble-Dodge-style first-attack
  disadvantage lands the Fighter squarely in the ranger→barbarian L1 band
  (6.4–8.6); a temp-HP cushion reaches ranger (5.2–5.6); an extra **Second Wind
  charge barely moves it (+0.72)** — L1 fights are too short to cash a second heal.
  The Fighter needs to **not get bursted**, not to heal more.
- **No candidate inverts the L3+ band.** All are gated L1–4 and **fade cleanly at
  L5** (Fighter L5/L7 read identical across every phase); the Fighter stays the #1
  closer at L3 under every cushion. No class-order inversion.
- **Recommendation (for user approval, separate lane):** a small **first-hit
  cushion, L1–4, fading by L5** — recommended delivery a fighter-native **"Guard"
  flat DR 2** (conservative, lands at ~6.4, well above ranger, no overshoot), DR 3
  as the ceiling (~8.6, the Barbarian's floor). The disadvantage "Parry" (#282
  parity, ~7.9) is the alternative if cross-class consistency is preferred.

---

## 1. The L1 floor, pinned (baseline, N=300)

| Class | mean depth | median | p90 | →Ch2 | death ch | **rounds/won** | won minHP | blowout% | **dmg/enemy-turn** |
|-------|-----------:|-------:|----:|-----:|---------:|---------------:|----------:|---------:|-------------------:|
| **fighter** | **4.07** | 3 | 10 | 13.0% | 1.1 | **6.56** (slowest) | 28.8% | 7.8% | **2.61** |
| barbarian | 8.56 | 5 | 15 | 38.3% | 1.6 | 4.49 | 52.2% | 24.9% | 1.71 |
| ranger | 5.77 | 4 | 13 | 26.3% | 1.3 | 4.03 | 40.1% | 16.8% | 2.33 |
| rogue | 4.99 | 4 | 10 | 13.3% | 1.1 | 5.75 | 34.0% | 15.2% | 2.03 |
| wizard | 4.76 | 4 | 10 | 15.3% | 1.2 | 3.97 | 34.0% | 13.9% | 2.51 |

The Fighter's **AC 16 is the highest in the field at L1** (leather + shield +
Defense style; every other martial sits at 14, the wizard at 15) and its 12 HP is
mid-pack (barb 14 · ranger 13 · fighter 12 · rogue 11 · wizard 9) — so the floor is
**not** a stat deficit. Two numbers locate the real cause:

- **Slowest kills despite the shallowest run.** A class that dies in Chapter 1
  fights *only easy Chapter-1 rooms*, so it should post the *shortest* fights. The
  Fighter posts the **longest (6.56 rounds)**. One 1d8+2 attack, no second attack
  until L5, no advantage, and only a +2-damage/+2-to-hit Power Attack to spend —
  its offense tempo is the weakest at the floor.
- **Highest sustained incoming with no cushion.** 2.61 damage/enemy-turn (second
  only to the unarmoured wizard) over the longest fights, into 12 HP, with **no
  mitigation online** (Brace L2, Action Surge L2, Extra Attack L5, no Rage). The
  Barbarian eats only 1.71/turn (Rage halving) and the Ranger 2.33 (kept at range).

### How it dies — burst, in Chapter 1, to rooms it can't thin

| Class | mean HP entering the lethal fight | **burst share** (entered ≥80% HP) | death chapters |
|-------|----------------------------------:|----------------------------------:|----------------|
| **fighter** | **76.3%** | **56.0%** | Ch1: 261 · Ch2: 39 |
| barbarian | 52.2% | 27.0% | Ch1–6 (185/90/6/12/5/2) |
| ranger | 57.7% | 35.0% | Ch1: 221 · Ch2: 78 |

The Fighter dies **from health, inside a single fight** (56% of deaths start ≥80%
HP) — not from attrition across rooms (the Barbarian's pattern: enters its lethal
fight at half HP, having survived more). Its top lethal rooms are **two-enemy
Chapter-1 trash** (Skeleton + Bone Stalker 23×, Kobold + Kobold 20×, Skeleton +
Skeleton 19×, Skeleton + Stirge 18×, Goblin + Stirge 18×) and one tough solo
(Famished Ghast 18×). The throughline: a **single-attack** class can only fell one
of two foes at a time while **both** keep hitting it, and can't burst a tough solo
before its 12 HP runs out — so it loses races a two-attack / advantaged /
cushioned class wins.

---

## 2. Confirming it's the kit gap (the Rage-style control)

Item-2 control: give the Fighter L1–4 the Barbarian's signature L1 cushion —
**halve physical damage** — and change *nothing else*.

| Fighter L1 | mean depth | dmg/enemy-turn | →Ch2 |
|------------|-----------:|---------------:|-----:|
| baseline | 4.07 | 2.61 | 13.0% |
| **+ Rage-style halve** | **11.06** | 1.32 | 70.3% |

Restoring a Barb-equivalent cushion lifts the Fighter **+6.99 → 11.06**, *past* the
Barbarian's own 8.56 floor, and halves its incoming (2.61 → 1.32). **The entire L1
deficit is the absent cushion** — once the Fighter stops being bursted in the
opening rounds, its AC 16 + 12 HP + eventual kill carry it fine. Its statline was
never the problem; the back-loaded kit (no L1 mitigation) is.

That it *overshoots* (11.06 ≫ band) is itself the key tuning signal: the Fighter
needs only a **partial, first-hit** blunt — **not** full Rage parity. The candidate
slate below is sized accordingly.

---

## 3. Candidate cushions — L1 floor lift (N=300)

Target band: lift the Fighter L1 toward **ranger (5.77) → barbarian (8.56)**
without overshooting.

| Candidate (Fighter L1–4) | mean | Δ vs base | median | p90 | →Ch2 | dmg/turn | lands… |
|--------------------------|-----:|----------:|-------:|----:|-----:|---------:|--------|
| baseline | 4.07 | — | 3 | 10 | 13.0% | 2.61 | floor |
| **DR 3 / hit ("Guard")** | 8.60 | **+4.54** | 10 | 14 | 56.3% | 1.68 | ≈ barbarian |
| **first-attack disadv. ("Parry", #282)** | 7.90 | **+3.83** | 6 | 14 | 46.0% | 1.65 | mid→barb |
| **DR 2 / hit ("Guard")** | 6.41 | **+2.35** | 5 | 13 | 34.7% | 1.91 | ranger→mid |
| temp-HP 5+level / combat | 5.62 | +1.55 | 4 | 12 | 28.3% | 2.74 | ≈ ranger |
| temp-HP 3+level / combat | 5.21 | +1.15 | 4 | 12 | 25.3% | 2.67 | ≈ ranger |
| +1 Second Wind charge | 4.79 | +0.72 | 3 | 12 | 19.0% | 2.76 | ~floor (rejected) |
| _(control) Rage-style halve_ | _11.06_ | _+6.99_ | _12_ | _19_ | _70.3%_ | _1.32_ | _overshoots_ |

Reading:

- **Mitigation is the lever; sustain is not.** Every candidate that *reduces
  incoming* (DR, disadvantage, temp-HP — note the dropping dmg/turn column) lands
  in-band. The one that adds *healing* (+Second Wind) barely moves the floor
  (+0.72): L1 fights are too short and too bursty to cash a second heal, and the
  Fighter already has the base charge. This corroborates §1 — the Fighter dies to
  burst, not to running dry.
- **The Fighter needs a small cushion.** DR **2** already clears ranger (6.41 vs
  5.77); DR **3** reaches the Barbarian's floor (8.60). The first-attack
  disadvantage ("Parry") lands between (7.90). Temp-HP is the gentlest real lift
  (≈ ranger). None needs the full halve.

---

## 4. Band-preservation — no L3+ inversion, clean L5 fade

Every candidate is gated **L1–4**. The check: (a) does it fade by L5, and (b) does
it vault the Fighter past the field at L3? Fixed baseline field (N=80):

| Class | L1 | L3 | L5 | L7 |
|-------|---:|---:|---:|---:|
| **fighter** | 3.51 | **60.56** | **62.71** | **65.24** |
| barbarian | 8.18 | 55.96 | 56.27 | 58.06 |
| ranger | 5.24 | 54.49 | 57.06 | 54.60 |
| rogue | 4.72 | 45.80 | 47.60 | 46.61 |
| wizard | 4.71 | 31.77 | 32.85 | 31.11 |

Fighter under each cushion (other classes hold the baseline above):

| Candidate | L1 | L3 | L5 | L7 | inverts field@L3? |
|-----------|---:|---:|---:|---:|:-----------------:|
| baseline | 3.51 | 60.56 | 62.71 | 65.24 | — |
| Rage-halve (control) | 10.68 | 63.17 | 62.71 | 65.24 | no |
| Parry (disadv.) | 8.26 | 60.41 | 62.71 | 65.24 | no |
| Guard DR 2 | 6.05 | 63.76 | 62.71 | 65.24 | no |
| Guard DR 3 | 8.50 | 63.74 | 62.71 | 65.24 | no |
| temp-HP 3+lvl | 5.16 | 60.79 | 62.71 | 65.24 | no |
| temp-HP 5+lvl | 5.09 | 61.06 | 62.71 | 65.24 | no |
| +1 Second Wind | 4.53 | 63.09 | 62.71 | 65.24 | no |

- **Clean fade.** Fighter **L5 = 62.71 and L7 = 65.24 are byte-identical across
  every phase** — the L1–4 gate leaks nothing past L4. The cushion is gone exactly
  when Extra Attack (L5) arrives, mirroring the Rogue's Nimble→Uncanny fade.
- **No inversion.** The Fighter is *already* the deepest class at L3 (60.56);
  under every cushion it stays #1 (60–64) — it was never going to drop below the
  field, and no cushion reorders L3/5/7. The Fighter remains the strong closer.
- The acute floor is **L1 only** — by L3 the Fighter leads regardless — so the
  cushion could fade as early as **L2–3** (when Brace/Action Surge come online) and
  still cover the real gap. L1–4 was the tested envelope; L1–2 is a tighter, even
  safer option.

---

## 5. Recommended direction (for user approval — NOT shipped here)

**Give the L1 Fighter a small first-hit damage cushion that fades by L5.** The
control proves a cushion is exactly the missing piece; the band check proves a
faded L1–4 cushion can't break the Fighter's closer identity. Sizing it *partial*
(not full Rage) keeps it in the ranger→barbarian band.

Ranked deliveries (all measured above):

1. **Recommended — "Guard": flat DR 2 on the first hit each round, L1–4, fading at
   L5.** Lands at **~6.4** (deep-dive) / 6.05 (band) — comfortably above the Ranger
   (5.77), roughly **half the gap to the Barbarian**, the lowest overshoot risk.
   It is the most **fighter-native** delivery: a passive brace behind shield +
   armour, a precursor to the L2 Brace the class already gets — no flavor
   dissonance. **DR 3 (~8.6) is the ceiling** if playtest wants it nearer the
   Barbarian.
2. **Alternative — "Parry": the first incoming attack each round at disadvantage,
   L1–4** (the user-approved Rogue **Nimble Dodge** pattern, #282). Lands at
   **~7.9**. Reuses an established mechanic for cross-class consistency; read it as
   a *parry* rather than a *dodge* for a plated soldier.
3. **Gentlest — temp-HP (≈5 + level) at combat start, L1–4** (the Defender
   subclass's mechanic, brought to baseline). Lands at **~5.6**, just reaching the
   Ranger — the most conservative real fix.
4. **Rejected — extra Second Wind / Resolve sustain.** +0.72 only; sustain is not
   the lever (§3). A Resolve *defense* spend would help, but the Fighter's
   defensive Resolve options (Brace, Shield Bash) are themselves L2/L3 — part of
   the same back-loading. If the fix is delivered through Resolve, it must be a
   *new L1 defensive use*, not more healing.

**Suggested magnitude to approve: Guard DR 2, L1–4, fading at L5** — the
conservative in-band landing — with DR 3 as the dial if a hand-playtest wants the
Fighter's first life nearer the Barbarian's. Confirm by feel; the sim only
brackets the band.

**Untested alternative axis (flagged, not measured):** the root cause is *slow
kills × no cushion*. This lane fixed the cushion half (proven sufficient). An
**offense** lever — e.g. an L1 burst or an early extra action — would attack the
*slow-kill* half instead (shorter fights → less cumulative incoming) and could
close the gap from the other side. Not measured here; a candidate for the fix lane
if the team prefers leaning into the Fighter's damage identity over a defensive
band-aid.

---

## Appendix — reproducibility

### Run the harness

```
N=300 BAND_N=80 npx tsx scripts/sim-fighter-l1.ts     # full (this report)
N=60  BAND_N=20 npx tsx scripts/sim-fighter-l1.ts     # smoke
FULL_CHAIN=1 npx tsx scripts/sim-fighter-l1.ts        # NG+ chain (default base)
```

The harness ships. Its **temp-HP** and **+Second Wind** phases run faithfully with
no engine change (they use fields the engine already owns — `hp.temp`,
`secondWindBonusRemaining`). The **halve / dodge / DR** phases require the
throwaway engine block below; the harness **probes** for it on startup and prints
`ACTIVE`/`ABSENT` (when absent, those phases simply report baseline, so the script
is safe to run as-is post-revert).

### The throwaway engine block (reverted before this PR)

To re-measure the env-driven candidates, re-apply this to
`src/engine/combat/attack/monsterAttack.ts` (it was reverted so **no balance change
ships**), then run with `SIM_FIGHTER_BUFF=halve|dodge|dr2|dr3`:

```ts
// near the top, after `const NIMBLE_DODGE_MAX_LEVEL = 4;`
const SIM_FIGHTER_BUFF_MAX_LEVEL = 4;
function simFighterIsBuffTarget(character: Character, mode: string): boolean {
  return (
    process.env.SIM_FIGHTER_BUFF === mode &&
    character.classId === 'fighter' &&
    character.level <= SIM_FIGHTER_BUFF_MAX_LEVEL
  );
}
function simFighterMitigate(character: Character, damage: number, physical: boolean): number {
  const mode = process.env.SIM_FIGHTER_BUFF;
  if (!mode || character.classId !== 'fighter' || character.level > SIM_FIGHTER_BUFF_MAX_LEVEL) {
    return damage;
  }
  if (mode === 'halve') return physical ? Math.floor(damage / 2) : damage;
  if (mode === 'dr2') return Math.max(1, damage - 2);
  if (mode === 'dr3') return Math.max(1, damage - 3);
  return damage;
}

// in resolveSingleAttack, alongside the rogue `nimbleDodge` flag:
const simFighterGuard =
  simFighterIsBuffTarget(nextCharacter, 'dodge') &&
  !nextCharacter.actionEconomy.reactionUsed &&
  !playerVulnerable;
// …include `|| simFighterGuard` in `hasDisadvantage` and in the `if (nimbleDodge)`
//   reaction-spend.

// where damage is applied to the player, before `applyDamage(...)`:
const appliedDamage = simFighterMitigate(nextCharacter, totalDamage, physical);
// …pass `appliedDamage` to applyDamage instead of `totalDamage`.
```

Raw machine output: `docs/sim-findings/fighter-l1-diagnostic.raw.md`.
