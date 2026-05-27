import type { DiceRoller } from '../dice';
import type { Character } from '../../types/character';
import type { CombatState, CombatLogEntry } from '../../types/combat';
import { combatResult, type CombatActionResult } from './types';
import { appendLog } from './log';

export interface SecondWindContext {
  roller: DiceRoller;
  character: Character;
  state: CombatState;
}

/**
 * Fighter feature. Bonus action, once per short rest: regain 1d10 + fighter
 * level hit points. Returns the new combat state and a fresh character
 * reference per CombatActionResult.
 */
export function useSecondWind(ctx: SecondWindContext): CombatActionResult {
  const { roller, character, state } = ctx;

  if (!character.resources.secondWindAvailable) return combatResult(state, character);
  if (character.actionEconomy.bonusActionUsed) return combatResult(state, character);

  const heal = roller.roll(`1d10+${character.level}`);
  const before = character.hp.current;
  const after = Math.min(character.hp.max, before + heal.total);
  const actuallyHealed = after - before;

  character.hp = { ...character.hp, current: after };
  character.resources = { ...character.resources, secondWindAvailable: false };
  character.actionEconomy = {
    ...character.actionEconomy,
    bonusActionUsed: true,
  };

  const log: CombatLogEntry = {
    id: state.log.length + 1,
    kind: 'narration',
    text: `${character.name} catches a second wind. 1d10+${character.level} = ${heal.total} → +${actuallyHealed} HP.`,
  };

  return combatResult(appendLog(state, log), character);
}
