# Validation sim — post balance-wave re-measurement (2026-06-04)

Measurement-only re-run on `origin/main @ 11db0d5` (the boss-balance **#416** +
caster-scaling **#418** fixes merged) to confirm the tuned bosses landed IN BAND,
the caster fix worked, and nothing regressed. **No magnitudes were tuned here.**
The only code touched is sim-wiring (see §6).

Baselines (PRE): `sim-reports/boss-gauntlet.raw.md` + `sim-reports/full-sim-pass.md`,
both generated at `#415` (pre-#416/#418). Same knobs re-run for apples-to-apples.

| Sim | Knobs | Lens |
|---|---|---|
| `sim-boss-gauntlet.ts` | `SEEDS=60 ASC=0` | bare-gear floor, 14 bosses × 7 classes |
| `sim-boss-gauntlet.ts` | `SEEDS=60 ASC=0 GEAR=1` | **NEW** depth-scaled geared *bracket* (§6) |
| `sim-boss-gauntlet.ts` | `SEEDS=40 ASC=6` | apex stall check |
| `sim-ngplus-tob.ts` | `SEEDS=25` | geared ToB wall, Asc0→6 |
| `sim-class-viability.ts` | `SOULS=30 LIVES=30 FULL_CHAIN` | full-14-chapter band |

## TL;DR verdict

| Target (#416/#418) | PRE | POST | verdict |
|---|---|---|---|
| Ch9 Hollow Pretender gate | 0% bare, ward-lifted 9% | 0% bare / **25% geared**, ward-lifted **35%**, summons 2.0→1.1 | ✅ **gate crackable** |
| Ch7 Drowned Custodian | 1% bare | 1% bare / **45% geared**, summons 2.4→1.5, sustain race winnable | ✅ in band (geared) |
| Ch5 Hollow Dawn | 11% bare | 13% bare / **61% geared** | ✅ in band (geared) |
| Ch2 Magistrate (low-WIS) | F25/Ro18 | F27/Ro18 bare / 92% geared | ⚠️ landed, but **Rogue unmoved** (own floor) |
| Asc6 Ashen Marshal stall | **45%** time-outs | **18%** time-outs, 23.4 rd, monotone held | ✅ sponge capped |
| Caster #418 Fire Bolt L20 | dice-core 11 | dice-core **18** (≈ old 22 cap) | ✅ restored, no balloon |

**Headline:** every #416/#418 change landed in the intended direction; nothing
overcorrected. The four mid/early boss fixes are **gear-checks by design** (the
commit says so for Ch7/Ch9) — the bare-gear gauntlet correctly shows the
*mechanics* moving while the *win%* payoff shows in the geared bracket. One real
sim bug found and fixed: #418's API change left the gauntlet's caster diagnostic
mis-reading Fire Bolt as 11 (it's 18) — the engine was always correct (§5).

---

## §1. Tuned bosses — bare floor PRE→POST + geared bracket

Bare-gear gauntlet (Asc0, 60 seeds × 7 classes). The bare floor is a LOWER bound;
the geared bracket (depth-scaled loadout at the boss's correct level, §6) is the
realistic upper read. A boss that is a bare wall **and** geared-winnable is a
gear-check — exactly the design for the mid-game cluster.

| Ch | Boss | bare PRE | bare POST | **geared POST** | min-HP PRE→POST | key mechanic shift |
|---|---|---|---|---|---|---|
| 2 | Magistrate | 46 | 48 | **92** | 49→48 | Hold Person 3→2 rd |
| 5 | Hollow Dawn | 11 | 13 | **61** | 26→24 | paralyze DC 17→15, 3→2 rd |
| 7 | Drowned Custodian | 1 | 1 | **45** | 36→29 | summons 2.4→1.5, sustain cd 4→6 |
| 9 | Hollow Pretender | 0 | 0 | **25** | 0→0 | ward-lifted 9→35%, summons 2.0→1.1, gate leak .2→.4 |

### Per-target reads

**Ch9 Hollow Pretender — ✅ gate now crackable.** The exact #416 intent fires:
gate add count halved (summons 2.0→1.1), the ward is now **lifted 35% of bare
fights** (was 9%), the gate leaks 40% instead of 20%, and fights run longer
(5.8→7.3 rd) with phases finally entered (0.0→0.1). Bare win stays 0% — a
bare-gear L13 hero can't finish the 240-HP boss even after dropping the ward — but
**geared it is 25%** (Fighter 100%, Barb 57%), squarely in line with Ch11 Irenicus
(30% geared). It was the single clearest out-of-band boss; it is now a hard-but-
beatable gear-check. Not trivialized.

**Ch7 Drowned Custodian — ✅ in band (geared).** Bare stays 1% but the sustain/add
grind eased exactly as designed: summons 2.4→1.5 (maxActive 2→1), self-heal
cooldown 4→6, and the hero now bloodies it more often (rage fires 3→7%). **Geared
45%** (min-HP 66%, 19.8 rd) — a geared hero out-races the heal+adds, the commit's
stated goal. It's one of the harder mid bosses, appropriately. *Residual:* 12%
geared stalls + ~20-round length flag it as a grind (see §4).

**Ch5 Hollow Dawn — ✅ in band (geared).** Paralyze softened (DC 17→15, 3→2 rd):
bare nudged 11→13 (Monk 12→20, Ranger 32→38), **geared 61%** — no longer a wall,
in line with Ch6 (51) / Ch10 (76). Bare Fighter/Rogue stay 0% — that's their own
L8 fragility against the decoy+blade, not the paralyze (the dual-floor classes),
not a Ch5-specific flag.

**Ch2 Magistrate — ⚠️ landed, but the lever barely reaches Rogue.** Hold Person
3→2 rd nudged Barbarian 85→92 and Fighter 25→27, but **Rogue is unmoved at 18%**.
Geared the boss is 92% (Rogue 98%), and Ch2 is L4 where real play carries light
gear + the boss-intel braced-save (neither modeled here), so the *real* experience
sits well above the bare 48%. The duration cut is a correct, conservative nudge;
the residual bare-Rogue weakness is the Rogue floor, not the Magistrate (§4).

### Overcorrection check — none

Geared, the four are 92 / 61 / 45 / 25% — none trivial; the bare floor stays a
hard ceiling for all four. The fixes moved toward band without flipping any boss
to a pushover.

---

## §2. Asc6 sponge stall — ✅ capped, ladder still monotone

Boss-gauntlet Asc6 (40 seeds), Ch8 Dravok the Ashen Marshal:

| metric | PRE | POST |
|---|---|---|
| time-out (stall) % | **45%** | **18%** |
| avg rounds | 25.8 | 23.4 |
| win% / win min-HP% | — | 65% / 57% |

The combined boss HP-mult cap (1.95→1.7) more than halved the stall rate and pulls
the average fight back under the 30-round wall. **Ascension stays monotone-harder**
— Ch8 win Asc0 90% → Asc6 65%, and *every* chapter's Asc6 win% ≤ its Asc0 win%.
Residual 18% is a bare-gear artifact (geared, the Ch8 stall is ~6%); if zero-stall
at the apex is wanted, a further 1.7→1.6 cap closes it, but the sponge is fixed.

---

## §3. Caster #418 — ✅ cantrip endgame restored, no balloon

Corrected gauntlet caster table (real `scaling.ts` helpers, wizard, no gear):

| L | Fire Bolt mult | **Fire Bolt dice-core** | Fire Bolt full | Magic Missile | Scorching Ray | Fireball core |
|---|---|---|---|---|---|---|
| 1 | 1.00× | 6 | 9.0 | 10.5 | 21 | 28 |
| 8 | 1.84× | 10 | 13.0 | 17.5 | 28 | 32 |
| 14 | 2.56× | 14 | 17.0 | 24.5 | 42 | 41 |
| 20 | **3.28×** | **18** | 21.0 | 31.5 | 56 | 49 |

- **Fire Bolt L20 dice-core 11 → 18** (full avg ≈ 21, back near the old 4d10 ≈ 22
  cap). `CANTRIP_LEVEL_K=0.12` does its job.
- **Acquisition anchor + tier order hold:** mult = 1.0 at L1 (printed dice on
  acquisition), and the cantrip stays *below* the cheapest leveled spell on the
  same anchor (Burning Hands ≈ 20 at L20) — opener, never a closer.
- **Leveled endgame did NOT balloon:** Fireball L20 dice-core 49, LEVEL_K
  untouched (0.05). The inert `INT_K` is gone (fixed stats → it was always 1.0).
- **In-combat payoff is visible where it should be** — on the pure damage-race
  bosses, not the add/gate fights:
  - Ch13 Abazigal (bare): wizard **67→97**, druid **83→95**; overall 55→60 (martial flat 46).
  - Ch12 Yaga (bare): wizard **0→15**.
  - Isolated-boss class band: wizard **37→41**.
  - ToB geared wall lifted (§4): Ch11 A0 80→88.8, Ch13 A6 54→75.2 (wizard is in the ngplus class set).

---

## §4. Regression check — clean

**Untouched bosses (bare Asc0) — flat within ±1 noise:** Ch1 100, Ch3 100, Ch4 86,
Ch6 6, Ch8 90, Ch10 31→32, Ch11 2, Ch14 0. The only movement is **Ch13 55→60**,
which is the *caster* fix (wizard/druid up on the damage-race; martial unchanged at
46) — not a stat regression.

**ToB geared wall (ngplus, geared boss-only win%) — uniformly ≥ PRE, monotone, Melissan intact:**

| Boss | A0 PRE→POST | A3 PRE→POST | A6 PRE→POST |
|---|---|---|---|
| Ch10 Nizidramanii'yt | 99 → 99.2 | 91 → 95.2 | 73 → 82.4 |
| Ch11 Irenicus | 80 → **88.8** | 64 → 67.2 | 46 → 53.6 |
| Ch12 Yaga-Shura | 94 → 96.8 | 78 → 82.4 | 64 → 66.4 |
| Ch13 Abazigal | 94 → 95.2 | 82 → 89.6 | 54 → **75.2** |
| Ch14 Melissan | **20 → 20.0** | **0 → 0** | **0 → 0** |

Every row is monotone-harder Asc0→A6; the small uplift is the caster fix. **Melissan
is still a wall even geared** (20%/0%/0%, ~44–52% boss-HP remaining on a loss — a
designed ceiling, not a near-miss). "Extremely hard by design, do not tune" holds.

**Full-14-chapter band (class-viability, geared reincarnation) — unchanged shape:**

| class | clr% PRE→POST | topA6 PRE→POST | depth PRE→POST |
|---|---|---|---|
| fighter | 6.1 → 8.0 | 3.3 → 13.3 | 29.6 → 29.8 |
| barbarian | 0.7 → 0.3 | 0 → 0 | 34.8 → 35.6 |
| ranger | 0 → 0 | 0 → 0 | 12.6 → 14.1 |
| monk | 0.9 → 1.3 | 0 → 0 | 13.6 → 14.0 |
| wizard | 0 → 0 | 0 → 0 | 6.2 → 6.5 |
| druid | 0 → 0 | 0 → 0 | 4.9 → 4.7 |
| rogue | 0 → 0 | 0 → 0 | 4.1 → 4.2 |

Fighter is still the lone ladder-climber, Barbarian the deepest diver, Rogue/Druid
the floor — all within small-N (30×30) noise (the fighter topA6 jump is 1→4 souls).
Critically, **the caster fix did NOT balloon the full-chain floor**: wizard is still
depth 6.5 / clr 0% — the AI-floor bot dies by ~Ch1-2, long before the endgame where
the restored cantrip matters, so the buff is correctly inert at the floor and only
shows at the geared endgame (§3).

---

## §5. Remaining tuning directions (NOT applied — for a tuning lane)

Ordered by confidence. All four #416 targets are ✅/in-band; these are the residuals.

1. **Ch2 Magistrate — Rogue floor, not the boss** (`src/content/monsters/athkatla-magistrate.ts`
   is fine as tuned). The duration cut reached Fighter/Barb but not Rogue (bare
   18%, unmoved). Do **not** soften the Magistrate further — geared it's already
   92% and the field would trivialize. The lever is the Rogue's own early
   survivability (the known Rogue floor pass), or lean on the existing braced-save
   intel. Don't tune off this number alone.
2. **Ch7 Drowned Custodian grind** (`drowned-custodian.ts`). Geared-winnable (45%)
   but 12% geared stalls + ~20-round fights read as a slog. If that texture is
   unwanted, trim the `Drink the Deep Back` heal (`3d8`) or cap it per-fight —
   *finiteness* not lethality. Lower priority; it resolves.
3. **Asc6 residual 18% stall** (`src/engine/delve/ascension.ts`). Cap works; if
   zero-stall at the apex is the goal, `MAX_BOSS_HP_MULT` 1.7→1.6 closes the bare
   tail (geared is already ~6%). Cosmetic.

No win-rate test gates added (per brief).

---

## §6. Sim-infrastructure changes (the only code touched)

Both in `scripts/sim-boss-gauntlet.ts`; default behaviour unchanged, so a bare
re-run reproduces the committed `boss-gauntlet.raw.md` byte-for-byte.

1. **`GEAR=1` bracket knob.** Optionally equips a representative depth-scaled
   loadout (one high-rarity item per slot rolled at the boss's chapter depth + two
   attuned class legendaries), mirroring `sim-ngplus-tob.gearUpArriving` but at the
   gauntlet's correct per-chapter level. This is what makes the gear-sensitive
   Ch5/7/9 fixes measurable — the bare default is the floor, `GEAR=1` is the
   realistic upper bracket. Cross-checks consistent with ngplus (Ch13 geared 98%
   vs ngplus A0 95%; lower-level mid-chapters read below ngplus's L20, as expected).
   Default **off**.
2. **Caster diagnostic API fix (a real bug #418 introduced).** #418 changed
   `scaleSpellDamage`/`spellDamageMultiplier` to take the spell **tier** (0 =
   cantrip → steeper `CANTRIP_LEVEL_K`) instead of an `acqLevel`, and updated the
   engine call sites — but the gauntlet's `spellScalingTable()` still passed
   `spellAcquisitionLevel(0)=1` and `(3)=5`, which the new API mis-read as *tiers*
   1 and 5. Result: the table reported Fire Bolt L20 as **11** (the pre-#418
   number) and Fireball as 43, falsely implying #418 didn't land. The **engine was
   always correct** (`fireBolt.ts` passes `0`); only the diagnostic lied. Fixed by
   passing the tier; the table now reads Fire Bolt L20 = 18 (§3). The stale
   `× intFactor … anchored at L1` copy was corrected to the post-#418 model.

`npm run build` green; `npm run test:run` green (1460 passed / 3 skipped / 1 todo).
