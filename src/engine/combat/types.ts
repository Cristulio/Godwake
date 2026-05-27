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
 * Internals may still mutate the passed-in character — the engine is not
 * yet fully pure, but the public API surface is. Callers consume:
 *
 *   const result = playerAttack(ctx, targetId, weaponId);
 *   setCharacter(result.character);
 *   setCombat(result.state);
 */
export interface CombatActionResult {
  state: CombatState;
  character: Character;
}

/**
 * Helper to build a CombatActionResult. Always returns a fresh character
 * reference so memo'd components see a change. Internals may have already
 * mutated `character` in-place; the spread captures whatever final state
 * the engine landed on.
 */
export function combatResult(state: CombatState, character: Character): CombatActionResult {
  return { state, character: { ...character } };
}
