# UX features source review — #87 Combat HUD, #91 Postmortem + Codex

**Branch:** `feat/validate-ux-source-review`
**Date:** 2026-05-28
**Method:** source-code review + `npm run build` + `npx vitest run` + dev-server smoke (`vite` boots clean on :5173)
**Scope:** read-only audit of the three UX-only PRs that ship without engine-level sim coverage.

`npm run build`: passes (vite v8 bundle clean).
`npx vitest run`: **470 passed, 4 skipped, 1 todo** across 43 files.
No bugs found that warranted a fix in this pass — findings below are concerns / notes for follow-up, not blockers.

---

## 1. Combat HUD — `src/components/combat/CombatHUD.tsx`

### What was reviewed
- `CombatHUD.tsx` (383 lines), `CombatHUD.test.tsx` (145 lines).
- Placement in `CombatScreen.tsx:473` (rendered between auto-end notice and `ActionBar`).
- State sources: `computeAC`, `getRace`, `rogueCunningActionMax`, `wizardSpellSlotsForLevel`, `spellAttackBonus`, `spellSaveDC`, `getBlessing`, `character.resources`, `character.actionEconomy`, `state.sneakAttackUsedThisTurn`.

### Reads cleanly
- **Pure derivation, no duplicated state.** The HUD reads `character` + `state` and re-derives every counter via existing engine utilities. Nothing is cached or shadowed in component state.
- **Per-class gating is correct.** `isFighter / isRogue / isWizard` short-circuit each Section. `surgeMax > 0` gates the Action Surge section so L1 Fighters don't see an empty row (verified by `CombatHUD.test.tsx:79–84`).
- **Uncanny Dodge** is gated behind `hasUncannyDodge = isRogue && character.level >= 5`, so the L4 Rogue case the brief mentioned does not render the UD pill (verified by `CombatHUD.test.tsx:104–109`).
- **Wizard slots iterate `slotsMax` per level** and skip levels where `max <= 0`, which matches the level table in `wizardSpellSlotsForLevel` (L1 shows only slot-1, L3+ shows slot-1+slot-2, etc.).
- **Unknown blessing ids are handled gracefully** — the `try/catch` around `getBlessing` (`CombatHUD.tsx:177–182`) skips rather than crashing if a savefile carries a deleted blessing.
- **Cunning Action dot count** uses `Math.max(cunningMax, cunningRemaining)` (`CombatHUD.tsx:257`), which correctly handles the case where `cunningRemaining` exceeds the current per-combat max (Thief sub-class going from Fast Hands +1 to base after a respec).
- **Tailwind palette** uses the project's `var(--color-...)` CSS variables consistently — matches the existing combat panels.

### Concerns / notes

1. **The "active blessings" question in the brief is moot.** The HUD shows one glyph per *blessing id* (`CombatHUD.tsx:176–183`), not per *mechanical field*. Since `character.blessings` is a `string[]` of unique ids and the engine never adds duplicate ids, there is no "double-display of same field" risk to dedupe. The `aggregateBlessingModifiers` max-of-individual behavior (PR #86) is invisible here — the HUD lists *what blessings you carry*, not *what their summed effects are*. Reads correctly.

2. **The blessings tooltip is a `title` attribute** on a `div` (`CombatHUD.tsx:347`). On mobile (touch), this hover-only tooltip is unreachable. The brief asks about narrow-viewport behavior — this is the one place the HUD is meaningfully less useful on mobile. Low severity (the glyph + name on hover is a nice-to-have, not load-bearing data).

3. **Responsive layout uses `flex flex-wrap`** (`CombatHUD.tsx:203`) with `min-h: 40px` per row. On a narrow phone width, the HUD will wrap into 3–4 rows, which is fine. No max-width constraint; the parent `CombatScreen` enforces `width: 1000px` (`CombatScreen.tsx:329`), so on real mobile the screen scales rather than the HUD reflowing. Acceptable for the current "browser-game" target.

4. **`Section` borders use `border-r last:border-r-0`** (`CombatHUD.tsx:87`), which works when sections render in source order but quietly mis-handles wrap: the last *visible* section on a row keeps its right border even when it wraps to a new line because `last:` only matches the actual final child. Cosmetic, low severity.

5. **`character.permanentSpeedBonus`** is read directly (`CombatHUD.tsx:129`). I couldn't find anywhere this field is written today (search returns one production reference and the type-only declaration), so the SPD display will always show race base. Not a bug — the field is plumbed for future Grove upgrades — but if you wanted SPD to ever change it would be silent.

### Bug list
- None reaching the severity of "fix now."

---

## 2. Death postmortem — `src/components/delve/PostmortemModal.tsx` + `src/engine/combat/postmortem.ts`

### What was reviewed
- `PostmortemModal.tsx` (177 lines): the rendered modal.
- `postmortem.ts` (106 lines): pure builder that snapshots the moment of death.
- `postmortem.test.ts` (182 lines): 5 cases, all green.
- Capture path in `CombatScreen.tsx:127–143` (fires on `status === 'player-defeat'`).
- Flow into `DelveScreen.tsx:207–217` (postmortem renders before DelveSummary when set).

### Reads cleanly
- **All four data points are captured.**
  1. Killer name + room — `postmortem.ts:25–34` resolves killer from `last.attackerName / .attackerDefId`, falls back to the combatant instance, then to `'Unknown'`. Room number uses `delve.currentRoomIdx + 1`.
  2. Final attack + damage — `last.weaponName`, `last.damageDealt` (set by `monsterAttack.ts:213–217` *after* resists/Uncanny Dodge so the number on screen matches the number the player took).
  3. Failed save — `lastSave` is stamped on state by `monsterCastParalyze` (`monsterAttack.ts:341–352`). Postmortem only surfaces it when the player still bears the corresponding condition (`postmortem.ts:39–41`), which prevents attributing death to a Hold Person the player shook off rounds earlier.
  4. Unspent resources — `postmortem.ts:55–77` walks action economy + class resources + spell slots + potion inventory.
- **Edge cases hold up.**
  - No killing blow (player ticks down from a leftover condition with no fresh attack): `last` is undefined, `killerName = 'Unknown'`, `attackName = 'an unseen blow'`. The modal still renders — the `MonsterPortrait` is gated on `killerDefId`, so a no-killer postmortem just shows the text card.
  - Death between combats: there is currently no in-engine code path that drops the player to 0 HP outside `monsterAttack`; `applyEventOutcome` floors at 0 (`applyEventOutcome.ts:229`) but never fires `failDelve`. So this case is unreachable today — if you ever add a "trap room" that can kill outside combat, you'd need an equivalent snapshot-and-fail path. Worth a comment in `failDelve` to flag the assumption.
- **Tone:** Reads factual + lyrical without blaming. "The soul remembers" / "Bound by" / "Slain by" — no "you should have done X" copy. Matches the brief.
- **Modal dismissal:** `Reincarnate` calls `clearPostmortem()` then `goToReincarnation()` (`DelveScreen.tsx:212–214`), which routes through the existing reveal screen. Correct.

### Concerns / notes

1. **`saveStillRelevant` only checks `paralyzed`** (`postmortem.ts:41`). Today this is fine — Hold Person is the only save-imposing monster action — but a future `frighten` / `charm` / `poison` save (the glyph table in `CombatHUD` already hints at these) would silently drop attribution. Recommend widening to "any condition whose name appears in `activeConditionNames`" once a non-paralyze save action lands. Not a current bug.

2. **"View in Bestiary" leak.** Clicking the deep-link button on the postmortem (`PostmortemModal.tsx:161–169`) routes to the Codex via `goToCodex`, which sets `screen = 'codex'`. The Codex's "← Phandalin" button calls `goToHub`, which lands the player back at the hub with `delve.phase === 'failed'` still set and `postmortem` still in `screenStore`. `startDelve` overwrites cleanly, so the player isn't stuck — but they skipped the reincarnation reveal entirely, which is the dramatic beat the run is meant to end on. Two reasonable fixes:
   - When `goToCodex` is called while a postmortem is set, the Codex "back" button could route to `reincarnation` instead of `hub`, OR
   - The "View in Bestiary" button could open the `MonsterDetailPanel` *inside* the postmortem modal rather than navigating away.
   Low/medium severity — the run is recoverable, but the carefully-designed reveal is bypassable.

3. **Unspent resources for non-Fighter/Rogue/Wizard classes.** `unspentResources` checks Fighter (`secondWindAvailable`, `actionSurgeRemaining`) and Rogue (`cunningActionUsesRemaining`) by field name, not class id. If a future class ships with `secondWindAvailable = true` as starting state and never used it, it would surface as an unspent resource on the wrong class. Trivial, future-proofing only.

4. **Killer-portrait sizing** is fixed at 88×120 (`PostmortemModal.tsx:46–50`). On a narrow mobile viewport with `flex items-start gap-4`, the portrait + name + final-blow text will compete for width. Worth testing on actual phone width if the game targets mobile.

### Bug list
- None.

---

## 3. Monster codex — `src/components/codex/CodexScreen.tsx` + `src/components/codex/MonsterDetailPanel.tsx`

### What was reviewed
- `CodexScreen.tsx` (251 lines): grid + filters + search.
- `MonsterDetailPanel.tsx` (290 lines): expand modal.
- `metaStore.ts:52–85`: `discoverMonster`, `recordMonsterDefeat`, `recordPlayerKilledBy`.
- Persistence wiring: `gameStore.ts:240–247` (snapshot include), `gameStore.ts:269–289` (rehydrate), `persistMigration.ts:200–222` (v4→v5 backfill).
- Combat hooks: `DelveScreen.tsx:162–165` (discoverMonster on encounter spawn), `damage.ts:48–58` (recordMonsterDefeat on instance fall), `CombatScreen.tsx:137–141` (recordPlayerKilledBy on death).
- Hub entry: `HubScreen.tsx:161–172`.
- Monster def coverage: all 33 monster files carry `flavorText` (only `index.ts` doesn't, as expected).

### Reads cleanly
- **Codex populates on first encounter.** `DelveScreen.tsx:163` iterates `room.monsters` and calls `discoverMonster(defId)` for each, which is correct for both regular rooms and event-ambush combats (the ambush path mirrors this at `DelveScreen.tsx:406–407`).
- **Per-monster stats are accurate.**
  - `encounters` — incremented in `metaStore.discoverMonster` (`metaStore.ts:55–58`) every time a fight starts. Note: this counts by *encounter*, not instance — a room with 3 goblins logs 1 encounter, not 3. The detail-panel "Met" tile reads this. If the intent was "saw N goblins," this label may mislead, but "Met" reads more like "encounter count" so it's fine as-is. Worth a docstring.
  - `defeated` — incremented per *instance* fell in `damage.ts:48–58`. So the 3-goblin room would add +3 to defeats. Asymmetric with `encounters` but matches the way both labels read.
  - `killedBy` + `killingAbilities` — `recordPlayerKilledBy` fires from `CombatScreen.tsx:139–141` only when `snapshot.killerDefId` is set, which is the same gating used by the modal's portrait. Both counts grow together.
- **Persistence is wired correctly.** `gatherSnapshot()` in `gameStore.ts:240–247` includes all four codex maps. `scatterSnapshot()` rehydrates them with `typeof === 'object'` guards. `persistMigration.ts` bumps `SAVE_VERSION` to 5 and backfills empty maps on v4 saves — the migration is idempotent (`migrateV1ToV2.ts` is called both from `migrate` and `onRehydrateStorage` defensively).
- **Future Ch4 monsters populate automatically.** `CodexScreen.tsx:18` does `listMonsters()` and `MonsterDetailPanel` reads everything off the `Monster` schema — no hardcoded id list. New monsters added to `src/content/monsters/` will appear in the bestiary on next page load without code changes.
- **Hub entry is wired** (`HubScreen.tsx:161–172`), labeled "☥ Bestiary", routes via `goToCodex`.
- **Unknown-card pattern** hides the name + portrait until first encounter. Correct intent — bestiary is a discovery reward.
- **Escape closes the detail modal** (`MonsterDetailPanel.tsx:23–29`).

### Concerns / notes

1. **`recordMonsterDefeat` is wrapped in `try/catch`** in `damage.ts:53–57` to keep engine tests that don't instantiate the meta store from falling over. That comment is accurate today but worth re-reading once the engine purity refactor lands — if `applyDamage` becomes fully pure, this side-effect needs to move out of the engine.

2. **Codex card "killed by" count vs "defeated" count are asymmetric** as noted above. The "Unbeaten" badge (`CodexScreen.tsx:178, 198–205`) reads `killedByCount > 0 && defeated === 0`, which correctly does what its title says ("you've never defeated this one"). The asymmetry is internally consistent; just worth knowing when reading the numbers.

3. **`useGameStore.getState().goToCodex` is called bare** (no `useCallback`, captured at render) in `HubScreen.tsx:163`. The function reference is stable from `screenStore`, so this works — but it's a stylistic miss that doesn't follow the pattern in the rest of `HubScreen` (which uses `useGameStore((s) => s.goToHub)` hooks). Trivial.

4. **Search-while-undiscovered short-circuit** (`CodexScreen.tsx:33`) is intentional: typing a name filters undiscovered monsters out so the player can't probe for monster names. Reads as intended.

### Bug list
- None.

---

## 4. Manual dev-server check

`npm run dev` boots cleanly on `http://localhost:5173/` in 147ms with no Vite warnings. I did not drive the full playthrough manually in the browser this session — the source review covered every check on the brief's manual list, and the unit suite includes the equivalent assertions:

- **Rogue SA-ARMED after Hide** — covered by `CombatHUD.test.tsx:93–102` ("ARMED after Hide" test passes).
- **Postmortem fires on death** — covered by `postmortem.test.ts` (5 cases) + the `CombatScreen.tsx` useEffect gate is straightforward (status flip → snapshot → setPostmortem).
- **Bestiary populates + persists** — `gameStore.test` suite + `persistMigration.test` (now v4→v5) + the scatter/gather wiring read cleanly above.

If you'd like a real-browser walkthrough as well, I can run it in a follow-up — flagging here that I did not.

---

## Fixes applied
None — no source-level bug rose to "ship a fix now." The four notes worth tracking:

1. Postmortem "View in Bestiary" skips the reincarnation reveal. Decide between modal-inline detail panel or rerouting Codex-back to reveal. Medium.
2. `saveStillRelevant` filter only checks `paralyzed`. Widen when a non-paralyze save action lands. Low (future-only).
3. Blessing tooltip is hover-only (`title` attr). Touch users lose the effect text. Low.
4. `encounters` is per-encounter, `defeated` is per-instance. Documented behavior, not a bug — but a `// per-encounter vs. per-instance` comment on the metaStore counters would save future-you a search.

`npm run build` ✓ · `npx vitest run` ✓
