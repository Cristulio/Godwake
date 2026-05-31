# Flavor-Only Audit — 2026-05-31

**Scope:** Every player-facing choice, pickup, or displayed stat.  
**Method:** For each effect, locate the engine reader. No reader = FLAVOR-ONLY.  
**Basis:** Prior skills audit (#179) and spell-differentiation (#217) already cleaned some cases — those are NOT re-reported here.

**Counts:** FLAVOR-ONLY 15 · NON-CHOICE-duplicate 5 · NEGLIGIBLE 6 · DEAD CONTENT 2

---

## 1 — Item Stats: Shown in Tooltip, No Engine Reader

| # | What | Where shown | Stated effect | Engine reader | Verdict | Recommendation |
|---|------|-------------|---------------|---------------|---------|----------------|
| 1 | `stealthDisadvantage: true` on chain-mail, padded, half-plate, scale-mail, ring-mail, splint, plate | `ItemTooltip.tsx:125` "Stealth: disadvantage" | Disadvantage on stealth checks while worn | NONE — no stealth-check system; `stealthDisadvantage` not read in `engine/` | FLAVOR-ONLY | Cut tooltip row; the field is spec-cargo from 5e, meaningless here |
| 2 | `strRequirement` on chain-mail (13), splint-armor (15), plate-armor (15) | `ItemTooltip.tsx:126` "Str req: N" | Cannot equip without meeting STR | NONE — `equip.ts:equipItem` never reads `strRequirement`; a Wizard can don plate | FLAVOR-ONLY | Cut tooltip row, or enforce in `equipItem` / `equipDenialReason` |
| 3 | `weight` on every item | `ItemTooltip.tsx:131` "X lb" | Encumbrance / carry weight | NONE — no carry-weight or inventory-slot-weight system anywhere | FLAVOR-ONLY | Cut tooltip row entirely |
| 4 | `attunement` field (all current items = `false`) | `ItemTooltip.tsx:133` "Soul-bound: required" (conditional on field) | Must attune before equipping | NONE — `equipItem` never checks; branch never even fires today since every item has `attunement: false` | FLAVOR-ONLY (dead branch + dead field) | Remove field from base-item schemas; legendaries have their own hub-equip gate |
| 5 | Base D&D `rarity` (all = `'common'` on base items) | `ItemTooltip.tsx:47` "Common ·" | Loot quality tier | NONE — base rarity is not read by any combat or drop logic; `GearRarity` (white/green/blue/purple) is the functional tier | NEGLIGIBLE | Replace the static "Common" with the rolled `GearRarity` label for affix gear; omit for plain bases |

---

## 2 — Weapon Properties: In Schema, Shown in Tooltip, Not Read by Combat Engine

| # | What | Weapons | Stated effect | Engine reader | Verdict | Recommendation |
|---|------|---------|---------------|---------------|---------|----------------|
| 6 | `thrown` property | dagger (`content/items/weapons.ts:28`), javelin (`:194`) | Weapon can be hurled as a ranged attack | NONE — `isRangedWeapon()` (`equip.ts:66`) checks `ammunition`, not `thrown`; these always attack as melee | FLAVOR-ONLY | Remove `thrown` from displayed properties, or implement a thrown-attack mode gated on the property |
| 7 | `loading` property | hand-crossbow (`:250`) | Only one attack per Action, even with Extra Attack | NONE — `maxAttacksPerAction` (`playerAttack.ts:610`) grants Extra Attack for all weapons; `loading` is never checked | FLAVOR-ONLY | Remove from displayed properties, or enforce: gate second swing on `!weapon.properties.includes('loading')` |
| 8 | `light` property | dagger (`:28`), shortsword (`:234`), hand-crossbow (`:250`) | Suitable for off-hand / dual wielding | NONE in combat — only read by `audio/index.ts:17` for SFX selection; no dual-wield system | NEGLIGIBLE | Remove from displayed properties (or label "(cosmetic)" if shown at all) |
| 9 | `range` field on thrown/melee weapons | dagger `[20,60]` shown as "Range: 20/60 ft" (`ItemTooltip.tsx:113`), javelin `[30,120]` | Can attack at listed range | NONE — engine never reads player weapon range for targeting or modifiers; bows are ranged via `ammunition`, not `range` values | FLAVOR-ONLY | Remove `range` from dagger and javelin; keep on ammunition weapons (shortbow/longbow/hand-crossbow) where the field correctly distinguishes near vs. long range for future use |

---

## 3 — Spell Metadata: Shown in Level-Up Picker, Not Read by Engine

The `LevelUpScreen.tsx:348-349` displays `sp.range` and `sp.target`; `sp.school` is shown at `:343`. None are read by `engine/combat/spells/`.

| # | What | Where shown | Stated effect | Engine reader | Verdict | Recommendation |
|---|------|-------------|---------------|---------------|---------|----------------|
| 10 | `spell.range` ("120 ft", "Self", "100 ft line", "Self (15-ft cone)") | `LevelUpScreen.tsx:348` | Targeting distance | NONE — non-positional engine; all area spells hit every living enemy, all single spells pick a target by index, range has no gate | FLAVOR-ONLY | Replace the raw field with plain-English copy ("hits all enemies" / "hits one enemy" / "self only") |
| 11 | `spell.target` ("single", "area", "self") | `LevelUpScreen.tsx:348-349` | Targeting shape | NONE — `dispatch.ts` routes by `effectKey`, not `target`; target type is baked into each spell implementation | NEGLIGIBLE | Keep as informational description, but pair it with the plain-English text above |
| 12 | `spell.school` ("Evocation", "Abjuration", "Illusion", etc.) | `LevelUpScreen.tsx:343` | Spell category | NONE — sculpt-spells bonus uses `mechanicKey: 'sculpt-spells'` on the class feature, not the spell's `school` field | NEGLIGIBLE | Keep as flavor label; just non-mechanical |

---

## 4 — Race Fields: Not Read by Engine

| # | What | Races | Where shown | Stated/implied effect | Engine reader | Verdict | Recommendation |
|---|------|-------|-------------|----------------------|---------------|---------|----------------|
| 13 | `size` (all = `'medium'`) | all 5 playable races | Nowhere in current UI; in `schemas/race.ts` | Creature size category | NONE — grep of `engine/` returns zero hits for `race.size` or `\.size\b` (character code) | FLAVOR-ONLY (dead field) | Remove from `RaceSchema` or move to a Codex-only display field |
| 14 | `speed` (all = 30) | all 5 playable races | Not shown in current creation screen; v1 showed "SPD 30" | Movement in feet per round | NONE for player mechanic — `turn.ts:39` sets `movementRemaining` from race speed, but `movementRemaining` has no gating consumer in the non-positional engine (paralysis checks `character.conditions`, not movement) | FLAVOR-ONLY | Stop using it to seed `movementRemaining`; keep as Codex label only |
| 15 | Race `features` array (e.g. Tiefling "Infernal Constitution") | all races | Not shown in current preset-selection screen | Race abilities description | NONE — mechanics are in `abilityScoreBonuses`/`bonusHpPerLevel`/`damageResistances`; `features[]` is text only | NEGLIGIBLE | Keep as documentation; add to a future in-game Codex |

---

## 5 — Dead Content: Races Never Reachable

The `CharacterCreationScreen.tsx` only surfaces class presets. Two races are defined but not referenced by any preset `recommendedRaceId`:

| # | Race | Defined in | Mechanical bonuses | Verdict | Recommendation |
|---|------|-----------|-------------------|---------|----------------|
| 16 | `half-elf` | `content/races/half-elf.ts` | CHA +2; `features[0].description` also claims "+1 primary, +1 secondary" — **but `abilityScoreBonuses` only provides `cha: 2`**, so the description is wrong | DEAD CONTENT (unreachable) + FLAVOR-ONLY (description/data mismatch) | Wire into one class preset (e.g. a CHA-flavored build), or remove; fix description to match data |
| 17 | `hill-dwarf` | `content/races/hill-dwarf.ts` | CON +2, WIS +1, `bonusHpPerLevel: 1`, speed 25 | DEAD CONTENT (unreachable) | Wire into one class preset or remove |

---

## 6 — Event Effects: Engine Reads Them But Near-Zero Impact for All Playable Builds

| # | Effect kind | Events affected | Issue | Verdict | Recommendation |
|---|------------|----------------|-------|---------|----------------|
| 18 | `cha_scaled_gold` (`perPoint: 2–6`) | wine-merchant haggle, oghma-scribe sell-truth, cowled-recruiter deception, pilgrim-road-smith haggle, mad-prisoner talk-down (`events/index.ts:608,727,541,783,834`) | `applyEventOutcome.ts:317` reads `Math.max(0, chaMod)`. All 5 class presets have CHA 8 (mod −1) → floored to 0; no class invests in CHA. Effective bonus = 0g for every playable build. | NEGLIGIBLE | Route through a stat each class invests in (e.g. scale with INT for wizard, with STR mod for martials), or replace with a flat gold variant; alternatively, wire a CHA-primary half-elf rogue as the intended user |

---

## 7 — Blessing Pool: Mechanically Identical Pairs (NON-CHOICE-duplicate)

The shrine roller deduplicates by effect signature (`blessings.ts:rollBlessingOptions`), so a player is never offered two identical blessings simultaneously. But the pool contains pairs where both blessings carry exactly the same modifier — owning one silently locks out the other forever.

| # | Blessing A | Blessing B (or C) | Shared modifier | Verdict | Recommendation |
|---|-----------|------------------|----------------|---------|----------------|
| 19 | `selunes-veil` (firstAttackAdvantage) | `tempus-charge` (firstAttackAdvantage) | `firstAttackAdvantage: true` | NON-CHOICE-duplicate | Drop Tempus's Charge; keep Selûne's Veil (ties to the Eilistraee shrine event) |
| 20 | `helms-bulwark` (+1 radiant on hits) | `lathanders-ember` (+1 radiant on hits) | `holyDamageBonus: 1` | NON-CHOICE-duplicate | Drop one; or conditionalize Lathander's Ember (e.g. "+1 radiant only while at full HP") |
| 21 | `tempus-edge` (crit +1) | `tymoras-gambit` (crit +1) | `critRangeBonus: 1` | NON-CHOICE-duplicate | Drop Tymora's Gambit; or give it a boon+bane shape (crit +1 but -1 AC — Tymora-style gamble) |
| 22 | `mystras-whisper` (+1 damage) | `silvanus-thorn` (+1 damage) | `damageBonus: 1` | NON-CHOICE-duplicate | Drop one; or conditionalize (e.g. Silvanus: +1 only vs non-construct) |
| 23 | `helms-aegis` (+1 AC) | `silvanus-root` (+1 AC) + `mystras-ward` (+1 AC) | `acBonus: 1` | NON-CHOICE-duplicate (3-way) | Keep Helm's Aegis as the flat version; differentiate Silvanus Root (e.g. conditional, or regen + AC) and Mystra's Ward (the new Weave-flavored conditional +1 already exists as `acBonusWhileFull`) |

---

## Previously Addressed (not re-reported)

- **Fireball vs Lightning Bolt non-choice** — FIXED in PR #217 (distinct damage dice, distinct on-hit effects: ignite vs arc pierce).
- **Stealth skill dead pick** — FIXED in PR #179.
- **Wizard L3/L5 skill dead-end** — FIXED in PR #179.
- **Weapon-keyed blessings offered to Wizard** — FIXED via `classRelevance` filter in blessings pool.
- **Camp boons wizard swap** (Eye of the Hawk → Eye of the Mind, etc.) — FIXED (wizard gets spell-side equivalents).

---

## Verdict Summary

| Verdict | Count | Items |
|---------|-------|-------|
| FLAVOR-ONLY | 15 | #1 stealthDisadvantage, #2 strRequirement, #3 weight, #4 attunement, #6 thrown property, #7 loading property, #9 range on thrown weapons, #10 spell.range, #13 race size, #14 race speed, #16 half-elf (unreachable + description mismatch), #17 hill-dwarf (unreachable), and the dead-content tag on both races |
| NON-CHOICE-duplicate | 5 | #19 firstAttackAdvantage pair, #20 holyDamageBonus pair, #21 critRangeBonus pair, #22 damageBonus pair, #23 acBonus triple |
| NEGLIGIBLE | 6 | #5 base rarity, #8 light property, #11 spell.target, #12 spell.school, #15 race features text, #18 cha_scaled_gold |
| DEAD CONTENT | 2 | #16 half-elf race (unreachable), #17 hill-dwarf race (unreachable) |

**Top priority cuts (high confusion risk, zero engine value):**

1. **`thrown` / `loading` properties** (#6, #7) — players reading these expect ranged / reload mechanics that don't exist.
2. **`strRequirement` / `stealthDisadvantage`** (#1, #2) — players reading these expect gates that aren't enforced.
3. **`weight`** (#3) — pure noise; no carry system.
4. **`spell.range` in picker** (#10) — "100 ft line" for Lightning Bolt or "Self (15-ft cone)" for Burning Hands adds nothing in a non-positional engine.
5. **Blessing duplicates** (#19–23) — pool bloat that shrinks the effective choice space.
