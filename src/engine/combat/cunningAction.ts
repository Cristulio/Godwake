import type { Character } from '../../types/character';
import type { CombatState, CombatLogEntry } from '../../types/combat';
import { combatResult, type CombatActionResult } from './types';
import { appendLog } from './log';

export type CunningActionChoice = 'dash' | 'disengage' | 'hide';

export interface CunningActionContext {
  character: Character;
  state: CombatState;
  choice: CunningActionChoice;
}

const DISENGAGE_DAMAGE_REDUCTION = 2;

/**
 * Rogue L1 Cunning Action. Bonus action, pick one effect:
 *  - Hide: next attack rolls with advantage (setup).
 *  - Dash: gain a second swing this turn (burst). Sneak Attack still gated to
 *    once per turn, so the bonus swing is a clean damage roll without it.
 *  - Disengage: 2 damage reduction on the next incoming hit (survival).
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
    character.incomingDamageReduction = DISENGAGE_DAMAGE_REDUCTION;
    narration = `${character.name} twists clear — next incoming hit deals ${DISENGAGE_DAMAGE_REDUCTION} less damage.`;
  } else {
    character.bonusAttackAvailable = true;
    narration = `${character.name} surges forward — a second strike rides the momentum.`;
  }

  const log: CombatLogEntry = {
    id: state.log.length + 1,
    kind: 'narration',
    text: narration,
  };

  return combatResult(appendLog(state, log), character);
}
