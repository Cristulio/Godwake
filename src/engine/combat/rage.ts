import type { Character } from '../../types/character';
import type { CombatState, CombatLogEntry } from '../../types/combat';
import { characterHasMechanic } from '../character/derived';
import { RAGE_ROUNDS } from '../character/actions';
import {
  combatResult,
  patchActionEconomy,
  patchResources,
  type CombatActionResult,
} from './types';
import { appendLog } from './log';
import { attachCombatVfx } from './vfx';

export interface RageContext {
  character: Character;
  state: CombatState;
}

/**
 * Barbarian Rage. Bonus action: drop into a battle-fury for {@link RAGE_ROUNDS}
 * rounds. While raging, physical damage against the barbarian is halved
 * (monsterAttack) and melee hits land for bonus damage (playerAttack) — but the
 * fury allows no recovery: healing draughts and lifesteal are locked out
 * (useItem / playerAttack gate on isRaging). The tradeoff is the point — commit
 * to the fight, no safety net. Spends one Rage use from the per-combat pool.
 * Re-casting while already raging just refreshes the duration off a fresh charge.
 */
export function useRage(ctx: RageContext): CombatActionResult {
  const { character, state } = ctx;
  if (character.classId !== 'barbarian') return combatResult(state, character);
  if (!characterHasMechanic(character, 'rage')) return combatResult(state, character);
  if (character.actionEconomy.bonusActionUsed) return combatResult(state, character);
  if ((character.resources.rageUsesRemaining ?? 0) <= 0) return combatResult(state, character);

  let nextCharacter: Character = patchResources(character, {
    rageRoundsRemaining: RAGE_ROUNDS,
    rageUsesRemaining: (character.resources.rageUsesRemaining ?? 0) - 1,
  });
  nextCharacter = patchActionEconomy(nextCharacter, { bonusActionUsed: true });

  const log: CombatLogEntry = {
    id: state.log.length + 1,
    kind: 'narration',
    text: `${nextCharacter.name} gives way to the fury — physical blows glance off and every swing bites deeper, but there is no drinking, no mending now, only the fight.`,
  };
  return combatResult(attachCombatVfx(appendLog(state, log), 'rage', 'player'), nextCharacter);
}

export interface RecklessAttackContext {
  character: Character;
  state: CombatState;
}

/**
 * Barbarian Reckless Attack. A free stance declared on the turn (no action
 * cost): the barbarian's melee attacks roll with advantage this turn, but
 * attacks against them roll with advantage until the start of their next turn
 * (cleared in `endTurn`). Declared before the action is spent so the advantage
 * actually rides the swing.
 */
export function useRecklessAttack(ctx: RecklessAttackContext): CombatActionResult {
  const { character, state } = ctx;
  if (character.classId !== 'barbarian') return combatResult(state, character);
  if (!characterHasMechanic(character, 'reckless-attack')) return combatResult(state, character);
  if (character.recklessActive === true) return combatResult(state, character);
  if (character.actionEconomy.actionUsed) return combatResult(state, character);

  const nextCharacter: Character = { ...character, recklessActive: true };
  const log: CombatLogEntry = {
    id: state.log.length + 1,
    kind: 'narration',
    text: `${nextCharacter.name} throws the guard away — strikes land with advantage, but so do the blows that answer.`,
  };
  return combatResult(attachCombatVfx(appendLog(state, log), 'reckless', 'player'), nextCharacter);
}
