import type { Character } from '../types/character';
import type { UnlockedUpgrades } from '../engine/character/upgrades';

/**
 * Current persisted save shape version.
 *  v1 → v2: unlockedUpgrades array → record, permanentHpBonus re-derived, etc.
 *  v2 → v3: top-level `permanentXxxBonus` fields folded into one
 *           `permanentBonuses: { ac, init, attack, ... }` nested object.
 */
export const SAVE_VERSION = 3;

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
    ['init', 'permanentInitBonus'],
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

  if (anyFolded || c.permanentBonuses) {
    c.permanentBonuses = folded;
  }

  return c as Character;
}

export interface MigratedSnapshot {
  unlockedUpgrades: UnlockedUpgrades;
  character: Character | null;
  monsterEncounters: Record<string, number>;
  discoveredMonsters: string[];
  chapter1Cleared: boolean;
  druidGroveUnlocked: boolean;
  deathCount: number;
  hasReincarnated: boolean;
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

  return state as MigratedSnapshot;
}
