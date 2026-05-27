import type { Character } from '../types/character';
import type { UnlockedUpgrades } from '../engine/character/upgrades';

/** Current persisted save shape version. Bumped from 1 → 2 in this PR. */
export const SAVE_VERSION = 2;

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
  const c: Character = { ...character };

  // Field was undefined in older saves before the quirks system existed.
  if (!Array.isArray(c.quirks)) c.quirks = [];
  // Engine started reading conditions explicitly later in the session.
  if (!Array.isArray(c.conditions)) c.conditions = [];

  // permanentHpBonus: pre-refactor, Mantle of the Wakened / Iron Will mutated
  // hp.max directly and that mutation got wiped on every startDelve. Re-derive
  // from owned Grove ranks so existing players don't lose Renown spend.
  if (typeof c.permanentHpBonus !== 'number') {
    const mantleRank = unlockedUpgrades['mantle-of-the-wakened'] ?? 0;
    const ironWillRank = unlockedUpgrades['iron-will'] ?? 0;
    const rederived = mantleRank * 5 + ironWillRank * 5;
    if (rederived > 0) c.permanentHpBonus = rederived;
  }

  // The remaining new optional fields default to undefined naturally — the
  // engine reads them with `??` so no explicit fill is needed. Listing them
  // here as a manifest for future diffs:
  //   permanentSpellAttackBonus, permanentSpellDcBonus, permanentSpellDamageBonus
  //   permanentCunningActionBonus, permanentSneakAttackDiceBonus
  //   nextAttackBonus, incomingDamageReduction, bonusAttackAvailable
  //   resources.mistyStepActive

  return c;
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
 * Apply v1 → v2 migration to a persisted snapshot in-place. Used by:
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
