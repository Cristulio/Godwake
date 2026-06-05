import type { Character } from '../../types/character';
import type { CombatState, CombatLogEntry } from '../../types/combat';
import {
  combatResult,
  patchActionEconomy,
  patchResources,
  type CombatActionResult,
} from './types';
import { appendLog } from './log';
import { attachCombatVfx } from './vfx';

export type CunningActionChoice = 'quick-strike' | 'feint' | 'hide' | 'steel';

export interface CunningActionContext {
  character: Character;
  state: CombatState;
  choice: CunningActionChoice;
}

/**
 * Rogue L1 Cunning Action. Bonus action, pick one effect:
 *  - Hide: next attack rolls with advantage (setup — also enables Sneak Attack).
 *  - Quick Strike: a second weapon strike this turn (the rogue's answer to Extra
 *    Attack). The once-per-turn Sneak gate still applies, so it carries Sneak
 *    only when the main strike hasn't already spent it.
 *  - Feint: bait the guard open — the next strike is guaranteed to land Sneak
 *    Attack, even with no advantage, no wound, and no dagger, and even through a
 *    dice tilt that would cancel a Hide.
 *  - Steel: advantage on the next saving throw (anti-paralyze / anti-fear).
 *
 * Burns the bonus action and one use from the per-combat pool (Thief / Cunning
 * Mastery grant extra uses).
 */
export function useCunningAction(ctx: CunningActionContext): CombatActionResult {
  const { character, state, choice } = ctx;
  if (character.classId !== 'rogue') return combatResult(state, character);
  if (character.actionEconomy.bonusActionUsed) return combatResult(state, character);
  const usesLeft = character.resources.cunningActionUsesRemaining ?? 0;
  if (usesLeft <= 0) return combatResult(state, character);

  let nextCharacter: Character = character;
  nextCharacter = patchResources(nextCharacter, {
    cunningActionUsesRemaining: usesLeft - 1,
  });
  nextCharacter = patchActionEconomy(nextCharacter, { bonusActionUsed: true });

  let narration: string;
  if (choice === 'hide') {
    nextCharacter = { ...nextCharacter, nextAttackAdvantage: true };
    narration = `${nextCharacter.name} slips into a shadow. Next strike lands with advantage.`;
  } else if (choice === 'feint') {
    nextCharacter = { ...nextCharacter, nextAttackForceSneak: true };
    narration = `${nextCharacter.name} feints high — the guard drops. The next strike finds the gap.`;
  } else if (choice === 'steel') {
    nextCharacter = { ...nextCharacter, nextSaveAdvantage: true };
    narration = `${nextCharacter.name} steels their nerve — the soul braces for the strike. Advantage on the next save.`;
  } else {
    nextCharacter = { ...nextCharacter, bonusAttackAvailable: true };
    narration = `${nextCharacter.name} surges forward — a second quick strike rides the momentum.`;
  }

  const log: CombatLogEntry = {
    id: state.log.length + 1,
    kind: 'narration',
    text: narration,
  };

  return combatResult(attachCombatVfx(appendLog(state, log), 'cunning-action', 'player'), nextCharacter);
}
