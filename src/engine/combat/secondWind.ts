import type { DiceRoller } from '../dice';
import type { Character } from '../../types/character';
import type { CombatState, CombatLogEntry } from '../../types/combat';
import {
  combatResult,
  patchActionEconomy,
  patchHp,
  patchResources,
  type CombatActionResult,
} from './types';
import { appendLog } from './log';
import { attachCombatVfx } from './vfx';
import { t } from '../../i18n';

export interface SecondWindContext {
  roller: DiceRoller;
  character: Character;
  state: CombatState;
}

/**
 * Fighter feature. Bonus action, once per combat: regain 1d10 + fighter
 * level hit points. The base charge refreshes at the start of every encounter
 * (see createCombat); short/long rest also refresh it, but the per-combat
 * refresh is the load-bearing one for boss attrition. Returns the new combat
 * state and a fresh character reference per CombatActionResult.
 */
export function useSecondWind(ctx: SecondWindContext): CombatActionResult {
  const { roller, character, state } = ctx;

  const baseCharge = character.resources.secondWindAvailable === true;
  const bonusCharges = character.resources.secondWindBonusRemaining ?? 0;
  if (!baseCharge && bonusCharges <= 0) return combatResult(state, character);
  if (character.actionEconomy.bonusActionUsed) return combatResult(state, character);

  let nextCharacter: Character = character;
  const bonus = nextCharacter.level;
  const heal = roller.roll(`1d10+${bonus}`);
  const before = nextCharacter.hp.current;
  const after = Math.min(nextCharacter.hp.max, before + heal.total);
  const actuallyHealed = after - before;

  nextCharacter = patchHp(nextCharacter, { current: after });
  // Spend bonus charges first — they're per-delve and don't refresh on rest.
  if (bonusCharges > 0) {
    nextCharacter = patchResources(nextCharacter, {
      secondWindBonusRemaining: bonusCharges - 1,
    });
  } else {
    nextCharacter = patchResources(nextCharacter, { secondWindAvailable: false });
  }
  nextCharacter = patchActionEconomy(nextCharacter, { bonusActionUsed: true });

  const log: CombatLogEntry = {
    id: state.log.length + 1,
    kind: 'narration',
    text: t('combat.log.secondWind', {
      name: nextCharacter.name,
      bonus,
      roll: heal.total,
      healed: actuallyHealed,
    }),
  };

  return combatResult(attachCombatVfx(appendLog(state, log), 'second-wind', 'player'), nextCharacter);
}
