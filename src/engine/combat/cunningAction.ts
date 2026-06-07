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
import { rogueCunningActionMax } from '../character/actions';
import { wearsHeavierThanLight } from '../character/equip';

export type CunningActionChoice = 'quick-strike' | 'feint' | 'hide' | 'steel';

/**
 * Rounds between mid-fight Cunning Action regen ticks — the rogue claws one use
 * back every couple of turns so it isn't dead-handed after spending the bonus
 * action. Mirrors the martial pool's {@link MARTIAL_REGEN_INTERVAL}: the pool
 * refills full at the start of each fight (createCombat), and this paces the
 * top-up across the rest of the fight, capped at the class max
 * ({@link rogueCunningActionMax}). N=2 is the starting cadence — a dedicated sim
 * pass tunes it.
 */
export const CUNNING_ACTION_REGEN_INTERVAL = 2;

/**
 * True on the player-turn rounds a regen tick lands. The pool refreshes full on
 * round 1 (createCombat), so ticks begin on rounds 3, 5, 7, … — one use returned
 * every {@link CUNNING_ACTION_REGEN_INTERVAL} of the rogue's turns.
 */
export function isCunningRegenRound(round: number): boolean {
  return round > 1 && (round - 1) % CUNNING_ACTION_REGEN_INTERVAL === 0;
}

/**
 * Player-turns until the next Cunning Action regen tick — for the HUD countdown.
 * Alternates 2,1,2,1 across the fight as the metronome lands on rounds 3,5,7,….
 */
export function turnsUntilCunningRegen(round: number): number {
  let next = Math.max(3, round + 1);
  while (!isCunningRegenRound(next)) next += 1;
  return next - round;
}

/**
 * Mid-fight Cunning Action regen. Called at the start of each of the rogue's
 * turns (endTurn). Returns one use on a regen-tick round, capped at the class
 * max. Heavy-than-light armor locks the kit out entirely (mirrors createCombat),
 * so it never regens a use the rogue can't spend. Returns the SAME reference when
 * nothing changes, so callers can cheaply detect a real top-up.
 */
export function regenCunningActionForRound(
  character: Readonly<Character>,
  round: number,
): Character {
  const self = character as Character;
  if (self.classId !== 'rogue') return self;
  if (!isCunningRegenRound(round)) return self;
  if (wearsHeavierThanLight(self)) return self;
  const max = rogueCunningActionMax(self);
  const current = self.resources.cunningActionUsesRemaining ?? 0;
  if (current >= max) return self;
  return patchResources(self, { cunningActionUsesRemaining: current + 1 });
}

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
