import type { Character } from '../../types/character';
import type { CombatState } from '../../types/combat';

/**
 * Public contract for combat actions. Every engine function that takes a
 * `character` and either reads it or modifies it returns this shape so the
 * caller receives BOTH the new combat state AND a fresh character
 * reference. React.memo / identity-based comparators rely on the fresh
 * reference; before this contract, callers had to do
 * `setCharacter({ ...character })` shotgun-style after every action.
 *
 * Internals are now fully pure: each function threads a local `nextCharacter`
 * accumulator and emits it via `combatResult`. No in-place mutation of the
 * input character anywhere in `src/engine/combat/**`.
 */
export interface CombatActionResult {
  state: CombatState;
  character: Character;
}

/**
 * Build a CombatActionResult. The caller is responsible for passing the
 * already-patched `nextCharacter`; no defensive spread happens here so the
 * identity returned is exactly the accumulator the engine built.
 */
export function combatResult(state: CombatState, character: Character): CombatActionResult {
  return { state, character };
}

/** Shallow patch onto Character.actionEconomy, returning a new Character. */
export function patchActionEconomy(
  c: Character,
  patch: Partial<Character['actionEconomy']>,
): Character {
  return { ...c, actionEconomy: { ...c.actionEconomy, ...patch } };
}

/** Shallow patch onto Character.resources, returning a new Character. */
export function patchResources(
  c: Character,
  patch: Partial<Character['resources']>,
): Character {
  return { ...c, resources: { ...c.resources, ...patch } };
}

/** Shallow patch onto Character.hp, returning a new Character. */
export function patchHp(c: Character, patch: Partial<Character['hp']>): Character {
  return { ...c, hp: { ...c.hp, ...patch } };
}

/**
 * Patch into Character.resources.spellSlots (preserves other slot levels).
 * Caller supplies a partial of the SpellSlots map.
 */
export function patchSpellSlots(
  c: Character,
  patch: Partial<NonNullable<Character['resources']['spellSlots']>>,
): Character {
  return {
    ...c,
    resources: {
      ...c.resources,
      spellSlots: { ...(c.resources.spellSlots ?? {}), ...patch },
    },
  };
}

/** Patch into Character.delveBudgets (treating undefined as empty). */
export function patchDelveBudgets(
  c: Character,
  patch: Partial<NonNullable<Character['delveBudgets']>>,
): Character {
  return {
    ...c,
    delveBudgets: { ...(c.delveBudgets ?? {}), ...patch },
  };
}
