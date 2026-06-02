import type { Character } from '../../types/character';
import type { CombatState, CombatLogEntry } from '../../types/combat';
import { characterHasMechanic } from '../character/derived';
import { braceDamageReduction } from '../character/actions';
import {
  combatResult,
  patchActionEconomy,
  patchResources,
  type CombatActionResult,
} from './types';
import { appendLog } from './log';
import { attachCombatVfx } from './vfx';

export interface FighterManeuverContext {
  character: Character;
  state: CombatState;
}

/**
 * Fighter Power Attack. A free stance declared on the turn (no action cost):
 * this turn's melee strikes trade accuracy for a damage spike (read in
 * playerAttack). Declared before the action is spent so the trade rides every
 * swing of the Attack action. Cleared at the start of the fighter's next turn.
 */
export function usePowerAttack(ctx: FighterManeuverContext): CombatActionResult {
  const { character, state } = ctx;
  if (character.classId !== 'fighter') return combatResult(state, character);
  if (!characterHasMechanic(character, 'power-attack')) return combatResult(state, character);
  if (character.powerAttackActive === true) return combatResult(state, character);
  if (character.actionEconomy.actionUsed) return combatResult(state, character);

  const nextCharacter: Character = { ...character, powerAttackActive: true };
  const log: CombatLogEntry = {
    id: state.log.length + 1,
    kind: 'narration',
    text: `${nextCharacter.name} sets both hands and swings heavy — slower to land, but it will hurt.`,
  };
  return combatResult(attachCombatVfx(appendLog(state, log), 'reckless', 'player'), nextCharacter);
}

/**
 * Fighter Brace. Bonus action, once per combat: set the guard so the next
 * incoming hit is blunted by {@link braceDamageReduction}. Folds onto the
 * one-shot `incomingDamageReduction` field that applyDamage already consumes
 * (taking the larger of any pending reduction), so a Rogue's Disengage and a
 * Fighter's Brace never silently overwrite each other.
 */
export function useBrace(ctx: FighterManeuverContext): CombatActionResult {
  const { character, state } = ctx;
  if (character.classId !== 'fighter') return combatResult(state, character);
  if (!characterHasMechanic(character, 'brace')) return combatResult(state, character);
  if (character.resources.braceAvailable !== true) return combatResult(state, character);
  if (character.actionEconomy.bonusActionUsed) return combatResult(state, character);

  const reduction = braceDamageReduction(character);
  let nextCharacter: Character = {
    ...character,
    incomingDamageReduction: Math.max(character.incomingDamageReduction ?? 0, reduction),
  };
  nextCharacter = patchResources(nextCharacter, { braceAvailable: false });
  nextCharacter = patchActionEconomy(nextCharacter, { bonusActionUsed: true });

  const log: CombatLogEntry = {
    id: state.log.length + 1,
    kind: 'narration',
    text: `${nextCharacter.name} braces behind the shield — the next blow will be blunted by ${reduction}.`,
  };
  return combatResult(attachCombatVfx(appendLog(state, log), 'shield', 'player'), nextCharacter);
}
