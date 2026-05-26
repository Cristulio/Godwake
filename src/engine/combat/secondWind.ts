import type { DiceRoller } from '../dice';
import type { Character } from '../../types/character';
import type { CombatState, CombatLogEntry } from '../../types/combat';

export interface SecondWindContext {
  roller: DiceRoller;
  character: Character;
  state: CombatState;
}

/**
 * Fighter feature. Bonus action, once per short rest: regain 1d10 + fighter
 * level hit points. Mutates the passed character (consistent with playerAttack
 * style); returns the updated combat state with a log entry.
 */
export function useSecondWind(ctx: SecondWindContext): CombatState {
  const { roller, character, state } = ctx;

  if (!character.resources.secondWindAvailable) return state;
  if (character.actionEconomy.bonusActionUsed) return state;

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

  return {
    ...state,
    log: [...state.log, log],
  };
}
