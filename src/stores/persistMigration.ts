import type { Character } from '../types/character';
import type { ClassId } from '../schemas/ids';
import type { UnlockedUpgrades } from '../engine/character/upgrades';
import { getAffix } from '../content/items';
import { getBlessing } from '../content/blessings';
import { getQuirk } from '../content/quirks';

/**
 * Current persisted save shape version.
 *  v1 → v2: unlockedUpgrades array → record, permanentHpBonus re-derived, etc.
 *  v2 → v3: top-level `permanentXxxBonus` fields folded into one
 *           `permanentBonuses: { ac, init, attack, ... }` nested object.
 *  v3 → v4: coin-in-pocket flipped from delveStart to permanent; backfill
 *           startingGold/chapterClearGold on existing saves. Pinchpurse
 *           Insurance was deleted; drop its rank entry (renown is not
 *           refunded — the upgrade was non-decisional and Coin in the
 *           Pocket now dominates that slot).
 *  v4 → v5: codex now tracks monsterDefeats / monsterKilledBy /
 *           monsterKillingAbilities for the postmortem + bestiary win-rate
 *           rows. Default to empty maps on older saves.
 *  v5 → v6: knownNpcs gates name reveals for the soul-bond NPCs (Irenicus,
 *           Imoen). Missing field on older saves → []  (everyone pre-reveal).
 *  v6 → v7: initiative removed entirely (player always acts first). Strip
 *           legacy `permanentInitBonus` / `delveInitBonus` / nested `init`
 *           bonus on load so the new turn engine never sees them.
 *  v7 → v8: Ascension ladder. `ascensionUnlocked` (highest unlocked, default 0)
 *           added to the meta snapshot. Old saves default to 0 — a returning
 *           player re-clears the chain to open Ascension 1.
 *  v8 → v9: Legendary relics. `ownedLegendaries` / `activeLegendaries` (both
 *           default []) added to the meta snapshot. Old saves own none.
 *  v9 → v10: Two changes shipped in one bump.
 *            (a) Per-soul seen-once dialogue beats. `seenDialogueBeats` (default
 *            []) prevents one-time beats (e.g. Imoen's camp whisper) from
 *            replaying on re-entry or in subsequent runs.
 *            (b) Legendaries became EFFECT-ONLY, hub-managed. The dead
 *            `character.legendaryBonuses` stat field is stripped here; the new
 *            `character.legendaryEffects` is re-baked from `activeLegendaries` on
 *            load (scatterSnapshot). Owned/active relic ids are unchanged.
 *  v10 → v11: Two changes shipped in one bump.
 *             (a) Rage is now available every combat (no per-rest charge cap).
 *             `character.resources.rageUsesRemaining` is stripped — the field no
 *             longer exists in ClassResources.
 *             (b) Attunement / soul-bind slot cap removed. The Sage's Pact Grove
 *             node (id `sages-pact`) is deleted; owners keep their renown spend
 *             (non-refunded). `attunementSlotsBonus` is stripped from the
 *             character. Legendary relics now have no slot cap — all owned relics
 *             can be equipped at the hub simultaneously.
 *  v11 → v12: Two changes shipped in one bump.
 *             (a) Prune dead affix/blessing/quirk ids from persisted character data
 *             so renamed or removed content ids don't silently drop effects on load.
 *             Equipped item rolled.affixes, character.blessings, and character.quirks
 *             are filtered to only known ids.
 *             (b) `movementRemaining` removed from ActionEconomy (engine is
 *             non-positional; the field was written but never read). Strip from
 *             `character.actionEconomy` on load so old saves rehydrate cleanly.
 *  v12 → v13: Progressive-unlock ladder (engine/progression/unlocks.ts).
 *             (a) `delveCount` (account-level descents started) gates the
 *             onboarding curtain. A present value (incl. a fresh New Game's 0) is
 *             preserved. A missing/garbage field is floored to 999 ONLY when the
 *             save carries prior progression (cleared chapters, bought upgrades,
 *             a finished game, a death, or a non-empty codex) — a real veteran,
 *             never re-gated. With no such marker it's a fresh / wiped / partial
 *             save → 0, so the curtain shows and elites lock until delve 5.
 *             (b) `seenTutorials` (default []) lets Phase-2 tutorials mark
 *             themselves shown once per soul.
 *  v13 → v14: Gear enhancement axis. Rolled items gained an optional `+N`
 *             `enhancement` (weapons: attack+damage; armour/shield: AC). Equipped
 *             rolled items are default-filled to `enhancement: 0` so old loot is a
 *             plain base on the new axis (the engine also reads it with `?? 0`).
 *  v14 → v15: Throne-of-Bhaal ending capstone. `gameCompleted` (default false)
 *             and `endingChosen` (default null) added to the meta snapshot. Old
 *             saves haven't seen the finale — a returning player still gets the
 *             one-time ending on their next full-chain clear.
 *  v15 → v16: Ending became flavor-only (no ascend/mortal choice) and the
 *             ascension picker moved into the title's New Game+ run-launcher.
 *             `endingChosen` is dropped (the soul's tale no longer records a
 *             branch); `gameCompleted` stays (now also unlocks New Game+).
 *             `selectedAscension` (the run's ascension level, default 0) is added.
 */
export const SAVE_VERSION = 16;

/**
 * Convert legacy `string[]` of owned upgrade ids → the rank-aware
 * `Record<id, rank>` shape.
 */
export function migrateUnlockedUpgrades(raw: unknown): UnlockedUpgrades {
  if (Array.isArray(raw)) {
    const out: UnlockedUpgrades = {};
    for (const id of raw) {
      if (typeof id === 'string') out[id] = 1;
    }
    return out;
  }
  if (raw && typeof raw === 'object') return raw as UnlockedUpgrades;
  return {};
}

/**
 * Normalize a possibly-legacy character object to the current schema.
 * Fields that were added across this session default to safe values; the
 * engine reads them with `??` so explicit `undefined` would also work, but
 * we default-fill so dev tooling and shape diffs are easier to reason about.
 */
export function migrateCharacter(
  character: Character | null,
  unlockedUpgrades: UnlockedUpgrades,
): Character | null {
  if (!character) return null;
  const c = { ...character } as Character & Record<string, unknown>;

  // Field was undefined in older saves before the quirks system existed.
  if (!Array.isArray(c.quirks)) c.quirks = [];
  // Engine started reading conditions explicitly later in the session.
  if (!Array.isArray(c.conditions)) c.conditions = [];

  // permanentBonuses (v3): pre-refactor, the 11 top-level permanentXxxBonus
  // fields lived directly on Character. Fold them into the nested object and
  // drop the old keys. Mantle/Iron Will re-derive logic that used to live
  // here (v1→v2) is preserved by writing the rederived value into hp.
  const legacyMap: Array<[keyof NonNullable<Character['permanentBonuses']>, string]> = [
    ['ac', 'permanentAcBonus'],
    ['attack', 'permanentAttackBonus'],
    ['damage', 'permanentDamageBonus'],
    ['critRange', 'permanentCritRangeBonus'],
    ['hp', 'permanentHpBonus'],
    ['spellAttack', 'permanentSpellAttackBonus'],
    ['spellDc', 'permanentSpellDcBonus'],
    ['spellDamage', 'permanentSpellDamageBonus'],
    ['cunningAction', 'permanentCunningActionBonus'],
    ['sneakAttackDice', 'permanentSneakAttackDiceBonus'],
  ];
  const folded: NonNullable<Character['permanentBonuses']> = { ...(c.permanentBonuses ?? {}) };
  let anyFolded = false;
  for (const [newKey, oldKey] of legacyMap) {
    const legacyVal = c[oldKey];
    if (typeof legacyVal === 'number') {
      // Nested wins on collision (already-migrated state shouldn't clobber).
      if (folded[newKey] === undefined) folded[newKey] = legacyVal;
      anyFolded = true;
    }
    delete c[oldKey];
  }
  // Initiative was removed entirely (player always acts first). Strip any
  // legacy `permanentInitBonus` / nested `init` field from saves so older
  // snapshots rehydrate cleanly without carrying a dead key.
  delete c.permanentInitBonus;
  delete (folded as Record<string, unknown>).init;
  delete c.delveInitBonus;
  // v9 → v10: legendaries became effect-only. Drop the dead stat-bonus field;
  // scatterSnapshot re-bakes character.legendaryEffects from activeLegendaries.
  delete c.legendaryBonuses;
  // v10 → v11: attunement cap removed; Sage's Pact bonus field is dead.
  delete c.attunementSlotsBonus;
  // v11 → v12: movementRemaining removed from ActionEconomy (non-positional engine).
  if (c.actionEconomy && typeof c.actionEconomy === 'object') {
    delete (c.actionEconomy as unknown as Record<string, unknown>).movementRemaining;
  }

  // Re-derive HP bonus for legacy chars that owned Mantle/Iron Will but
  // never had the field set (v0 → v1 migration). This must run AFTER the
  // legacy fold so a present permanentHpBonus is preserved.
  if (folded.hp === undefined) {
    const mantleRank = unlockedUpgrades['mantle-of-the-wakened'] ?? 0;
    const ironWillRank = unlockedUpgrades['iron-will'] ?? 0;
    const rederived = mantleRank * 5 + ironWillRank * 5;
    if (rederived > 0) {
      folded.hp = rederived;
      anyFolded = true;
    }
  }

  // v3 → v4: Coin in the Pocket switched from delveStart to permanent. Pre-v4
  // owners have the rank but no baked-in bonus, so applyPermanentUpgrade was
  // never called for them. Backfill from the rank so the upgrade keeps
  // working on load.
  if (folded.startingGold === undefined && folded.chapterClearGold === undefined) {
    const coinRank = unlockedUpgrades['coin-in-pocket'] ?? 0;
    if (coinRank > 0) {
      folded.startingGold = coinRank * 25;
      folded.chapterClearGold = coinRank * 5;
      anyFolded = true;
    }
  }

  if (anyFolded || c.permanentBonuses) {
    c.permanentBonuses = folded;
  }

  return c as Character;
}

function isKnownAffix(id: string): boolean {
  try { getAffix(id); return true; } catch { return false; }
}
function isKnownBlessing(id: string): boolean {
  try { getBlessing(id); return true; } catch { return false; }
}
function isKnownQuirk(id: string): boolean {
  try { getQuirk(id); return true; } catch { return false; }
}

function pruneItemAffixes<
  T extends { rolled?: { affixes?: string[]; enhancement?: number } } | null,
>(ref: T): T {
  if (!ref || !ref.rolled) return ref;
  const affixes = ref.rolled.affixes ?? [];
  const pruned = affixes.filter(isKnownAffix);
  // v13 → v14: default-fill the new enhancement axis on pre-v14 rolled loot.
  const needsEnhancement = ref.rolled.enhancement === undefined;
  if (pruned.length === affixes.length && !needsEnhancement) return ref;
  return {
    ...ref,
    rolled: { ...ref.rolled, affixes: pruned, enhancement: ref.rolled.enhancement ?? 0 },
  };
}

function pruneDeadContentIds(character: Character): Character {
  const eq = character.equipped;
  const nextEquipped = {
    ...eq,
    mainHand: pruneItemAffixes(eq.mainHand),
    offHand: pruneItemAffixes(eq.offHand),
    armor: pruneItemAffixes(eq.armor),
    helm: pruneItemAffixes(eq.helm ?? null),
    amulet: pruneItemAffixes(eq.amulet ?? null),
    ring1: pruneItemAffixes(eq.ring1 ?? null),
    ring2: pruneItemAffixes(eq.ring2 ?? null),
    belt: pruneItemAffixes(eq.belt ?? null),
    boots: pruneItemAffixes(eq.boots ?? null),
  };
  const nextBlessings = (character.blessings ?? []).filter(isKnownBlessing);
  const nextQuirks = (character.quirks ?? []).filter(isKnownQuirk);
  return { ...character, equipped: nextEquipped, blessings: nextBlessings, quirks: nextQuirks };
}

export interface MigratedSnapshot {
  unlockedUpgrades: UnlockedUpgrades;
  character: Character | null;
  monsterEncounters: Record<string, number>;
  monsterDefeats: Record<string, number>;
  monsterKilledBy: Record<string, number>;
  monsterKillingAbilities: Record<string, Record<string, number>>;
  discoveredMonsters: string[];
  chapter1Cleared: boolean;
  druidGroveUnlocked: boolean;
  ascensionUnlocked: number;
  deathCount: number;
  hasReincarnated: boolean;
  knownNpcs: string[];
  ownedLegendaries: string[];
  activeLegendaries: string[];
  seenDialogueBeats: string[];
  seenTutorials: string[];
  delveCount: number;
  originClass: ClassId | null;
  gameCompleted: boolean;
  selectedAscension: number;
  // Allow extra fields to ride through (screen, saveSeed, introSeen, etc.).
  [k: string]: unknown;
}

/**
 * Apply v1 → current migration to a persisted snapshot in-place. Despite the
 * historical name, this is the single migration entry point and handles
 * v1→v2→v3 in one pass (every step is idempotent on already-migrated state).
 *
 * Used by:
 *  - the zustand `persist` middleware's `migrate` hook on the facade store
 *  - `loadFromSlot` when reading an older slot's wrapper
 *  - the migration test (see `persistMigration.test.ts`)
 *
 * The function is intentionally tolerant: missing fields get safe defaults,
 * malformed shapes get replaced with their canonical defaults. The persisted
 * shape never throws on load — old saves should always rehydrate to a
 * playable state.
 */
export function migrateV1ToV2(input: Record<string, unknown>): MigratedSnapshot {
  const state = input as Record<string, unknown>;

  // 1. unlockedUpgrades: array → record
  const unlockedUpgrades = migrateUnlockedUpgrades(state.unlockedUpgrades);
  // v3 → v4: Pinchpurse Insurance was consolidated into Coin in the Pocket.
  // v10 → v11: Sage's Pact (attunement slot upgrade) removed with the cap.
  // Both: drop the obsolete rank entry; renown is not refunded.
  if ('pinchpurse-insurance' in unlockedUpgrades) {
    delete unlockedUpgrades['pinchpurse-insurance'];
  }
  if ('sages-pact' in unlockedUpgrades) {
    delete unlockedUpgrades['sages-pact'];
  }
  state.unlockedUpgrades = unlockedUpgrades;

  // 2. Character normalization (defaults new optional fields).
  const character =
    state.character != null
      ? migrateCharacter(state.character as Character, unlockedUpgrades)
      : null;
  state.character = character;

  // 3. monsterEncounters: seed from discoveredMonsters if absent so the
  //    codex doesn't show "x 0" on known entries.
  const me = state.monsterEncounters;
  if (!me || typeof me !== 'object' || Array.isArray(me)) {
    const seeded: Record<string, number> = {};
    const discovered = Array.isArray(state.discoveredMonsters)
      ? (state.discoveredMonsters as string[])
      : [];
    for (const id of discovered) seeded[id] = 1;
    state.monsterEncounters = seeded;
  }

  // 4. chapter1Cleared, druidGroveUnlocked, deathCount: typed defaults.
  if (typeof state.chapter1Cleared !== 'boolean') {
    state.chapter1Cleared = false;
  }
  if (typeof state.druidGroveUnlocked !== 'boolean') {
    // If the player already owns upgrades or has enough renown, retroactively
    // unlock — don't strip access from existing players.
    const renown = character?.renown ?? 0;
    state.druidGroveUnlocked =
      Object.keys(unlockedUpgrades).length > 0 || renown >= 30;
  }
  if (typeof state.deathCount !== 'number') {
    state.deathCount = state.hasReincarnated ? 1 : 0;
  }

  if (!Array.isArray(state.discoveredMonsters)) {
    state.discoveredMonsters = [];
  }

  // v4 → v5: backfill the postmortem/bestiary tracking maps.
  if (
    !state.monsterDefeats ||
    typeof state.monsterDefeats !== 'object' ||
    Array.isArray(state.monsterDefeats)
  ) {
    state.monsterDefeats = {};
  }
  if (
    !state.monsterKilledBy ||
    typeof state.monsterKilledBy !== 'object' ||
    Array.isArray(state.monsterKilledBy)
  ) {
    state.monsterKilledBy = {};
  }
  if (
    !state.monsterKillingAbilities ||
    typeof state.monsterKillingAbilities !== 'object' ||
    Array.isArray(state.monsterKillingAbilities)
  ) {
    state.monsterKillingAbilities = {};
  }

  // v5 → v6: knownNpcs gates the soul-bond name reveal. Missing = pre-reveal.
  if (!Array.isArray(state.knownNpcs)) {
    state.knownNpcs = [];
  }

  // v7 → v8: ascension ladder. Old saves start at 0 (must re-clear to unlock 1).
  if (typeof state.ascensionUnlocked !== 'number' || state.ascensionUnlocked < 0) {
    state.ascensionUnlocked = 0;
  }

  // v8 → v9: legendary relics. Old saves own none.
  if (!Array.isArray(state.ownedLegendaries)) {
    state.ownedLegendaries = [];
  }
  if (!Array.isArray(state.activeLegendaries)) {
    state.activeLegendaries = [];
  }

  // v9 → v10: per-soul seen-once dialogue beat tracking.
  if (!Array.isArray(state.seenDialogueBeats)) {
    state.seenDialogueBeats = [];
  }

  // v12 → v13: progressive-unlock ladder. A PRESENT delveCount (incl. a fresh
  // game's 0) is preserved verbatim. A MISSING/garbage one is ambiguous: it can
  // be a real pre-onboarding veteran OR a brand-new / wiped / partial save. Only
  // a veteran carries prior progression — a cleared chapter, a bought upgrade, a
  // finished game, a death, or a non-empty codex. With any such marker we floor
  // to 999 so onboarding never re-gates a veteran; with NONE it's a fresh soul →
  // 0, so the curtain shows and elites stay locked until delve 5. seenTutorials
  // defaults to []. (Before this, a missing field always floored to 999, so a
  // wiped save masqueraded as a 999-delve veteran and unlocked everything.)
  if (typeof state.delveCount !== 'number' || state.delveCount < 0) {
    const encounters = state.monsterEncounters;
    const hasPriorProgression =
      (typeof state.chaptersCleared === 'number' && state.chaptersCleared > 0) ||
      Object.keys(unlockedUpgrades).length > 0 ||
      state.gameCompleted === true ||
      (typeof state.deathCount === 'number' && state.deathCount > 0) ||
      (Array.isArray(state.discoveredMonsters) && state.discoveredMonsters.length > 0) ||
      (!!encounters &&
        typeof encounters === 'object' &&
        !Array.isArray(encounters) &&
        Object.keys(encounters as Record<string, unknown>).length > 0);
    state.delveCount = hasPriorProgression ? 999 : 0;
  }
  if (!Array.isArray(state.seenTutorials)) {
    state.seenTutorials = [];
  }

  // originClass anchors the relative class-unlock ladder. Pre-relative saves
  // lack it → leave null here; scatterSnapshot fills it from the worn body so a
  // veteran keeps its origin, and a fresh forge stamps it on first creation.
  if (typeof state.originClass !== 'string') {
    state.originClass = null;
  }

  // v14 → v15: Throne-of-Bhaal ending capstone. Old saves haven't seen the
  // finale, so the one-time ending fires on their next full-chain clear.
  if (typeof state.gameCompleted !== 'boolean') {
    state.gameCompleted = false;
  }

  // v15 → v16: the ending is flavor-only now — drop the recorded ascend/mortal
  // branch cleanly. The ascension picker moved to the title's New Game+ flow;
  // `selectedAscension` (the run's ascension level) defaults to the base chain.
  delete state.endingChosen;
  if (typeof state.selectedAscension !== 'number' || state.selectedAscension < 0) {
    state.selectedAscension = 0;
  }

  // v10 → v11: rageUsesRemaining removed (Rage is now per-combat, not per-rest).
  if (
    state.character &&
    typeof state.character === 'object' &&
    'resources' in (state.character as object)
  ) {
    const resources = (state.character as Record<string, unknown>).resources as
      | Record<string, unknown>
      | undefined;
    if (resources) delete resources.rageUsesRemaining;
  }

  // v11 → v12: prune dead affix/blessing/quirk ids so renamed or removed
  // content never silently drops effects — unknown ids are filtered here.
  if (state.character) {
    state.character = pruneDeadContentIds(state.character as Character) as Character;
  }

  return state as MigratedSnapshot;
}
