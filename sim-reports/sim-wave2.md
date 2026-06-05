# Wave-2 validation sim — Rage ration · elite identity · druid · event gold (2026-06-05)

Measurement-only re-run on `origin/main` with the **second balance/content wave merged**
(#422–#429): the Barbarian Rage rework (#424) + heavy-armour rule (#427), the elite
pass (one-per-chapter #423 + mechanic-bearing leaders #425), the Druid Wild-Shape /
caster-slot work (#428/#429), and chapter-scaled event gold (#426). **No magnitudes
were tuned here.** The only code touched is sim-wiring (see §7).

Baseline (PRE this wave) = `sim-reports/validation-sim.md` (the prior wave, post-#416/#418).
Same knobs re-run for apples-to-apples.

| Sim | Knobs | Lens |
|---|---|---|
| `sim-class-viability.ts` | `SOULS_PER_CLASS=30 MAX_LIVES=30 FULL_CHAIN` | full-14 band + **Rage rest-economy** + Druid |
| `sim-boss-gauntlet.ts` | `SEEDS=60 ASC=0` (+`GEAR=1`, +`ASC=6`) | boss floor — regression check |
| `sim-boss-gauntlet.ts` | **`MODE=elite`** `SEEDS=60 ASC=0` (+`GEAR=1`) | **NEW** elite encounter ladder (§7) |
| `sim-ngplus-tob.ts` | `SEEDS=25` | geared ToB wall, Asc0→6 |
| `sim-event-gold.ts` | `SEEDS=60` | **NEW** event-gold vs normal-fight gold (§7) |
| `sim-feel.ts` | default | texture |

## TL;DR verdict

| Wave-2 target | verdict | headline number |
|---|---|---|
| **Barbarian Rage ration (#424)** | ✅ rations, ⚠️ **over-corrects** | 40.2% of fights rage-STARVED; depth **35.6 → 10.9** (deepest diver → mid-floor) |
| Heavy-armour ends Rage (#427) | ✅ inert in sim (correct) | barb never equips heavy armour → never breaks (real-play rule, not a sim lever) |
| **Elite identity (#423/#425)** | ✅ real teeth, ⚠️ **several overshoot** | elites ≫ normal everywhere; 7/14 read *harder than their chapter boss* geared (worst Ch8 42% vs 94%) |
| **Druid Wild Shape + slot (#428/#429)** | ✅ **lifted** | depth **4.7 → 9.7** (dead-last → above wizard/ranger); Wild Shape 0.85×/combat |
| Thornlash > Produce Flame (#428) | ✅ holds every level | L1 13.5 vs 9.0; L20 ~40 vs ~21, and Thornlash auto-hits |
| **Event gold scaling (#426)** | ✅ in band | Ch5-14 median event = **0.58–0.65×** a normal fight's gold; anchoring proven |
| Ascension still monotone | ✅ | ngplus geared monotone Asc0→6; Melissan wall intact |
| Boss floor unregressed | ✅ | bare Asc0 matches baseline ±2; Asc6 Dravok stall 19% (= 18% baseline) |

**Headline:** the wave does what it set out to — Rage is genuinely rationed, the
Ch1-3 elites that were plain mobs now bite, the Druid is off the floor, and event
gold tracks depth without becoming a jackpot. But **two things landed harder than
intended**: the Rage ration collapsed the Barbarian from the deepest diver to the
mid-floor (the d12 brute has no backup mitigation when its rage is spent), and the
conservative elite magnitudes still put ~half the elite leaders *above* their chapter
boss. Both are tuning directions (§6), not regressions — every untouched system held.

---

## §1. Barbarian Rage rework (#424) — ✅ rationed, ⚠️ over-corrected

**The ration fires exactly as designed.** Over **5,779** barbarian combats in the
full-chain sim (rage charges threaded across the delve, refilled only at rests — see
§7):

| metric | value | reading |
|---|---|---|
| avg Rage charges in pocket at fight entry | **1.07** | pool is usually near-empty mid-delve |
| fights entered **rage-STARVED** (0 charges, pre-L20) | **40.2%** | 2-in-5 fights the barb literally cannot rage |
| Rage activations / combat | **0.70** | was effectively ~1.0 when Rage was unlimited + re-poppable |

The barb is **no longer perma-raging** — 40% of fights are fought cold, and Rage
fires in well under every fight. That is the stated #424 goal, and it is met.

**But the cost to the floor is severe.** Rage halves incoming physical damage; it was
the d12 brute's *entire* mitigation kit. Rationing it removed the survivability the
Barbarian's depth was built on:

| class | depth PRE (baseline) | depth wave-2 | Δ | topA6 |
|---|---|---|---|---|
| **barbarian** | **35.6** | **10.9** | **−24.7** | 0 → 0 |
| fighter | 29.8 | 24.4 | −5.4 | 13.3 → 6.7 |
| ranger | 14.1 | 9.4 | −4.7 | 0 → 0 |
| monk | 14.0 | 13.5 | −0.5 | 0 → 0 |
| druid | 4.7 | **9.7** | **+5.0** | 0 → 0 |
| wizard | 6.5 | 6.7 | +0.2 | 0 → 0 |
| rogue | 4.2 | 4.0 | −0.2 | 0 → 0 |

The Barbarian went from **deepest diver (35.6) to mid-floor (10.9)** — a 3× collapse,
far beyond small-N noise. Decomposing it: Fighter/Ranger (untouched by #424) drop ~5
rooms, which isolates the **structural** cost of the *harder early elites* (§2) shared
by every class that reaches an elite. The Barbarian's **−24.7** is therefore ≈ −5
structural **+ ~−20 Rage-specific** — the rationing alone roughly halved-and-halved
its reach.

**Caveat — the bare-floor number overstates the nerf.** The bot's policy *hoards the
last charge* (`worthLastCharge` gate in `actionPolicy.ts`) and only spends it on a
"fight worth it," so its effective rage uptime is lower than a human's, who would
burn charges more freely. The collapse is real and directionally correct, but a human
Barbarian rations better than this floor read. Tuning direction in §6 (#1).

---

## §2. Elites — NEW lens (`MODE=elite`); ✅ teeth, ⚠️ several overshoot

The elite gauntlet drops the **same per-chapter hero** (identical level + blessings as
the boss lens) into three encounters — a normal fight, the chapter's one elite (#423),
and the boss — so the elite reads on a ladder. Target: **boss.win ≤ elite.win ≤
normal.win**. Note the hero is at **boss level** here, which *over-levels* it for the
elite (met earlier/lower in real play) — so an elite that still walls a boss-level
hero is a genuine overshoot, not an artifact.

**Geared encounter ladder (Asc0, 60 seeds, all classes):**

| Ch | elite leader | normal | **elite** | boss | verdict |
|---|---|---|---|---|---|
| 1 | Gallows Wight | 100 | **96** | 100 | ~ ties boss |
| 2 | Cowled Wardpriest | 100 | **76** | 94 | ⚠ harder than boss |
| 3 | The Hollow Gaze | 100 | **96** | 100 | ✓ |
| 4 | Mind Flayer Fragment | 100 | **85** | 97 | ⚠ harder than boss |
| 5 | Fallen Archon | 86 | **72** | 60 | ✓ in band |
| 6 | Axle-Warden | 98 | **47** | 58 | ⚠ harder than boss |
| 7 | Tidebound Codex | 98 | **50** | 53 | ~ ties boss |
| 8 | **Slag-Colossus** | 98 | **42** | 94 | ⚠ **HARDER than boss (−52)** |
| 9 | The Mask-Chamberlain | 100 | **50** | 19 | ✓ in band |
| 10 | Rakshasa | 99 | **70** | 77 | ⚠ harder than boss |
| 11 | Devourer of Selfishness | 100 | **75** | 23 | ✓ in band |
| 12 | Fire-Giant Warlord | 98 | **57** | 76 | ⚠ harder than boss |
| 13 | **Sendai** | 100 | **48** | 98 | ⚠ **HARDER than boss (−50)** |
| 14 | Warden of the Pools | 86 | **32** | 5 | ✓ in band |

**Two clean reads:**

1. **Teeth — confirmed.** Every elite win% sits well below its normal-fight win% at
   the same hero (✓ harder than a normal fight, everywhere). The #425 pass fixed the
   Ch1-3 gap — Gallows Wight, Cowled Wardpriest, Hollow Gaze, Mind Flayer Fragment all
   register as real encounters now, not "slightly bigger normal fights." Signature
   mechanics fire (summons 0.7–2.1/fight; debuffs land).

2. **Overshoot — ~half the roster.** Geared, **7 of 14 elites are *harder* than their
   chapter boss** at the same hero — worst **Ch8 Slag-Colossus (42% vs boss 94%)** and
   **Ch13 Sendai (48% vs 98%)**. The hardest elites are the **summon leaders** (Slag-
   Colossus 1.1 adds/fight, Sendai 2.1, Axle-Warden 0.8): adds multiply the bot's
   target-priority problem — the *same* weakness that makes the gate/summon bosses
   (Ch7/Ch9) the bot's worst matchups. So part of the overshoot is bot-vs-adds (a
   human focus-fires the adds), and part is genuine: an over-levelled hero shouldn't
   lose half its fights to a mid-chapter elite.

**Per-class texture:** the Rogue walls hardest on elites (0–8% almost everywhere — the
known Rogue floor), while casters often do *better* than martials on the
damage-race elites (Ch13 Sendai: wizard 98%, druid 87%, martials 12–17%). The elite
band mirrors the class band, not a new pathology.

The **bare floor** (no gear) reads the same shape one notch lower — Gallows Wight's
signature paralyze fires in only **3%** of fights (a "mechanic barely lands" flag, the
opposite of overshoot — §6 #3).

---

## §3. Druid (#428/#429) — ✅ lifted off the floor

**Wild Shape buff drives a real lift.** Druid depth **4.7 → 9.7 (+5.0)** — from
dead-last (below Rogue) to above Wizard/Ranger. The driver is the engine-level Wild
Shape buff (deeper temp-HP cushion + heavier claws), which fires automatically:
**WildShape 0.85×/combat**, spell-cast 3.85×/combat — the kit is active. Net of the
shared ~−5 structural elite cost (§1), Wild Shape is worth ~+10 rooms of reach to the
floor Druid.

**Caster-slot upgrade — wired, marginal at the floor.** The new `deep-roots` /
`wellspring-of-mysteries` (+1 L1 slot) and `primal-reservoir` (+Wild Shape use) Grove
nodes are now in the sim's buy list (§7) and seed at descent. At the AI-floor renown
the Druid earns (it dies ~Ch1-2), they are rarely afforded and add little — the lift
is Wild Shape, not the slot. The slot's payoff would show at a deeper-surviving hero,
which the floor bot doesn't reach (same caveat as the #418 cantrip fix).

**Thornlash > Produce Flame — holds at every level (#428).** Thornlash is the Druid's
Magic-Missile slot (now `1d6+1` auto-hit darts vs the wizard's `1d4+1`); Produce Flame
is the Fire-Bolt cantrip (`1d10`, rolls vs AC ~55% landed):

| L | Thornlash (slot, auto-hit) | Produce Flame (cantrip, ~55% landed) |
|---|---|---|
| 1 | 3 × (1d6+1) = **13.5** | ~9.0 |
| 8 | 5 × (1d6+1) = **22.5** | ~13.0 |
| 20 | 9 × (1d6+1) = **40.5** | ~21.0 |

The slot beats the cantrip at every level and the gap widens with depth (dart-count
scaling outpaces the cantrip ramp) — *before* accounting for Thornlash's guaranteed
auto-hit vs Produce Flame's attack roll. The "slot worth spending" ordering is robust.

---

## §4. Event gold scaling (#426) — ✅ meaningful, not a jackpot

The ramp is ×1 @Ch1 → ×6 @Ch14, anchored at each event's `minChapter`. Compared
against **normal-fight gold** (mean `goldReward` over live-delve combat rooms):

| Ch | median event reward | ÷ normal-fight gold | normal-fight gold | verdict |
|---|---|---|---|---|
| 3 | 32g | **1.35×** | 24g | ⚠ ≥ a fight (early soft spot) |
| 5 | 46g | 0.65× | 70g | ✓ a slice |
| 8 | 70g | 0.63× | 110g | ✓ a slice |
| 11 | 97g | 0.63× | 154g | ✓ a slice |
| 14 | 108g | 0.58× | 186g | ✓ a slice |

- **Ch5-14: the typical event is 0.58–0.65× a same-chapter normal fight's gold** —
  exactly "meaningful but not dominant." The combat curve climbs steeper than the
  event ramp, so the event *share* of a fight falls with depth even as the absolute
  payout grows (a Ch1 +25 boon → ~150g by Ch14). ✅
- **Anchoring works (no jackpot).** A deep-authored windfall scales from *its own*
  floor, not Ch1: `trial-of-greed` (120g @Ch11) reaches 149g by Ch14 — not the naïve
  ×6 = 720g the unanchored ramp would have produced.
- **Lone soft spot: Ch2-4.** Early normal-fight gold is near-zero by design (the early
  game is gold-starved), so a modestly-scaled event reads as ≥ a fight by *ratio*
  (Ch3 median 1.35×) — though the absolute amounts are tiny (32g). Arguably fine (a
  useful early lifeline); flagged as the lowest-priority lever in §6.

---

## §5. Regression checks — clean

**Boss floor (bare, Asc0) unregressed** — wave-2 didn't touch boss statblocks, and
the gauntlet confirms it (matches the prior wave's POST numbers within ±2 noise):
Ch1 100, Ch2 52, Ch5 14, Ch7 1, Ch8 90, Ch9 0, Ch10 34, Ch11 0, Ch13 58, Ch14 0.

**Asc6 sponge cap holds** — Ch8 Dravok the Ashen Marshal: stall **19%**, 23.8 rounds,
65% win — bit-for-bit the prior wave (18% / 23.4 / 65%). The combined HP-mult cap is
stable.

**Ascension still monotone (ngplus geared boss-only, §2b):**

| Boss | A0 | A3 | A6 |
|---|---|---|---|
| Ch10 Nizidramanii'yt | 99.2 | 96.0 | 86.4 |
| Ch11 Irenicus | 84.0 | 65.6 | 46.4 |
| Ch12 Yaga-Shura | 98.4 | 79.2 | 66.4 |
| Ch13 Abazigal | 96.8 | 85.6 | 75.2 |
| Ch14 Melissan | **8.8** | 0 | 0 |

Every boss is monotone-harder Asc0→A6 (tiny mid-ladder blips are 25-seed noise);
Melissan stays a geared wall (A0 8.8%, high-variance by design — "extremely hard, do
not tune" holds). Numbers track the baseline within small-N.

**Texture (sim-feel, Asc0):** overall blowout rate **75.5%** of wins (zero-tension) —
in the band the blowout philosophy targets (the rate, not zero); slightly up vs the
~70% prior, consistent with over-levelled sweep starts and the new early-elite teeth
making cleared fights read as blowouts. Not a regression signal on its own.

---

## §6. Prioritized tuning directions (NOT applied — for a tuning lane)

Ordered by confidence / impact. All measurement; nothing changed here.

1. **Barbarian Rage ration is over-tight** — `src/engine/character/actions.ts`
   (`rageChargesMax`). Depth 35.6 → 10.9 with 40% of fights rage-starved. The d12
   brute has no backup mitigation, so a cold fight is a near-death fight. Levers, in
   order of least-invasive: widen the early bands (L1-4 `2→3`, L5-10 `3→4`); or refill
   a partial charge at a non-rest beat; or grant a small always-on DR so a starved
   fight isn't naked. **First, loosen the bot's last-charge `worthLastCharge` gate in
   `actionPolicy.ts` and re-measure** — the floor number is depressed by the bot
   hoarding the last charge, so quantify the human-uptime headroom before buffing the
   pool. HIGH — biggest band move of the wave.

2. **Elite overshoot cluster (summon leaders)** — the per-chapter elite-leader monster
   files, esp. `slag-colossus.ts` (Ch8), `sendai.ts` (Ch13), `axle-warden.ts` (Ch6).
   Geared, these elites beat their chapter boss at the same
   hero; the adds drive it. Lever: trim the leader's summon output (max-active /
   cadence), not its HP/damage. MED — partly bot-vs-adds (human focus-fires), so trim
   conservatively; my hero over-levels the elite, so the overshoot is real but bounded.

3. **Gallows Wight paralyze barely fires (3%)** — `src/content/monsters/gallows-wight.ts`.
   The Ch1 elite's signature lands in 3% of fights (opener-only + an easy save). If the
   paralyze is meant to *read* as the leader's identity, raise the save DC or widen the
   window. LOW (Ch1; a low-fire debuff is safe, just invisible).

4. **Event gold early slope (Ch2-4)** — `src/engine/delve/eventGoldScale.ts`
   (`EVENT_GOLD_CH14_MULTIPLE` / the ramp's early floor). Ch3 median event = 1.35× a
   normal fight (the only chapter > 1×; absolute 32g). If early events shouldn't
   out-earn a fight, start the ramp climbing later. LOWEST — early gold-starve makes
   events a useful lifeline; this is arguably working as intended.

No win-rate test gates were added (measurement-only, per the lane brief).

---

## §7. Sim-infrastructure changes (the only code touched)

1. **`sim-boss-gauntlet.ts` — `MODE=elite` lens.** Generalised `runBossFight →
   runEncounterFight` (takes a generic `{leaderDefId, room, isBoss, isElite}`; boss
   mode passes `isBoss:true, isElite:false`, behaviourally identical — verified
   byte-for-byte against the pre-change script at SEEDS=60). Added `extractRoomsByKind`
   (one normal + one elite room per chapter from the live delve) and per-fight
   **player-condition** capture (the debuff/paralyze leaders aren't covered by the
   boss-mechanic flags). `MODE=elite` runs the normal/elite/boss ladder at one hero and
   writes `sim-reports/elite-gauntlet.raw.md`. **Default `MODE=boss` is unchanged.**

2. **`sim-class-viability.ts` — Grove wiring + Rage instrumentation.**
   (a) Added the wave-2 bespoke Grove nodes to the buy list so they actually fire —
   Druid `primal-reservoir`/`deep-roots`/`verdant-wrath`, Wizard `wellspring-of-mysteries`,
   Monk `brimming-well`/`pressure-points` (the lists were stale: those classes had no
   bespoke node before #429). Both permanent and `delveStart` kinds apply at descent.
   (b) Added Rage rest-economy instrumentation: charges-at-fight-entry + rage-starved
   count (barb only), read at `runCombatRoom` entry — `createCombat` leaves charges
   untouched, so this reads the rationed pool carried across the delve.

3. **`sim-event-gold.ts` — NEW analytic.** Computes `eventGoldScale × authored amounts`
   (deep-walked from the real event templates via `listEvents()`) against live-delve
   normal-fight gold, per chapter. Writes `sim-reports/event-gold.raw.md`. No combat —
   reads the real `eventGoldScale` helpers, so it's exactly what the player sees.

Raw outputs committed alongside this report: `sim-reports/elite-gauntlet.raw.md`,
`sim-reports/event-gold.raw.md`. `npm run build` green; `npm run test:run` green;
`docs/sim-findings/*` restored (working artifacts, not deliverables).
