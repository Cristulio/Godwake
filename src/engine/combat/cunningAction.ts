import type { Character } from '../../types/character';
import type { CombatState, CombatLogEntry } from '../../types/combat';
import { combatResult, type CombatActionResult } from './types';

export type CunningActionChoice = 'dash' | 'disengage' | 'hide';

export interface CunningActionContext {
  character: Character;
  state: CombatState;
  choice: CunningActionChoice;
}

/**
 * Rogue L1 Cunning Action. Bonus action, pick one effect:
 *  - Hide: next attack rolls with advantage.
 *  - Disengage: a one-turn defense buff (granted via temp HP — engine
 *    doesn't track movement, so this softens the next monster blow instead
 *    of avoiding it outright).
 *  - Dash: flavor only — no movement system to feed.
 *
 * Burns the bonus action and one use from the per-combat pool (Thief gets
 * two uses via Fast Hands).
 */
export function useCunningAction(ctx: CunningActionContext): CombatActionResult {
  const { character, state, choice } = ctx;
  if (character.classId !== 'rogue') return combatResult(state, character);
  if (character.actionEconomy.bonusActionUsed) return combatResult(state, character);
  const usesLeft = character.resources.cunningActionUsesRemaining ?? 0;
  if (usesLeft <= 0) return combatResult(state, character);

  character.resources = {
    ...character.resources,
    cunningActionUsesRemaining: usesLeft - 1,
  };
  character.actionEconomy = {
    ...character.actionEconomy,
    bonusActionUsed: true,
  };

  let narration: string;
  if (choice === 'hide') {
    character.nextAttackAdvantage = true;
    narration = `${character.name} slips into a shadow. Next strike lands with advantage.`;
  } else if (choice === 'disengage') {
    // Engine has no movement; grant 3 temp HP as a one-turn soak so the
    // pick has a tangible payoff. Temp HP doesn't stack — take the higher.
    const grant = 3;
    const newTemp = Math.max(character.hp.temp, grant);
    character.hp = { ...character.hp, temp: newTemp };
    narration = `${character.name} slips back a step — +${grant} temporary HP to soak the next blow.`;
  } else {
    narration = `${character.name} darts across the room — every angle suddenly looks open.`;
  }

  const log: CombatLogEntry = {
    id: state.log.length + 1,
    kind: 'narration',
    text: narration,
  };

  return combatResult({ ...state, log: [...state.log, log] }, character);
}
