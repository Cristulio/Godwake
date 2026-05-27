import type { Character } from '../../types/character';
import type { CombatState, CombatLogEntry } from '../../types/combat';
import { combatResult, type CombatActionResult } from './types';

export interface ActionSurgeContext {
  character: Character;
  state: CombatState;
}

/**
 * Fighter L2. Takes a free Action this turn — clears `actionUsed` so the
 * player can Attack/Item again — and burns one Action Surge charge.
 * Refreshes on short or long rest (handled in actions.ts).
 *
 * Resets `playerAttacksThisTurn` too so a Fighter L5 with Extra Attack still
 * gets their full two-attack swing on the surged Action.
 */
export function useActionSurge(ctx: ActionSurgeContext): CombatActionResult {
  const { character, state } = ctx;
  if ((character.resources.actionSurgeRemaining ?? 0) <= 0) return combatResult(state, character);
  if (!character.actionEconomy.actionUsed) return combatResult(state, character);

  character.resources = {
    ...character.resources,
    actionSurgeRemaining: (character.resources.actionSurgeRemaining ?? 0) - 1,
  };
  character.actionEconomy = {
    ...character.actionEconomy,
    actionUsed: false,
  };

  const log: CombatLogEntry = {
    id: state.log.length + 1,
    kind: 'narration',
    text: `${character.name} surges — adrenaline burns through the wound. One more swing.`,
  };

  return combatResult(
    {
      ...state,
      playerAttacksThisTurn: 0,
      sneakAttackUsedThisTurn: false,
      log: [...state.log, log],
    },
    character,
  );
}
