import type { Character } from '../../types/character';
import type { CombatState, CombatLogEntry, MonsterCombatant } from '../../types/combat';
import { characterHasMechanic } from '../character/derived';
import {
  combatResult,
  patchActionEconomy,
  type CombatActionResult,
} from './types';
import { appendLog } from './log';
import { attachCombatVfx } from './vfx';
import { t } from '../../i18n';

export interface HuntersMarkContext {
  character: Character;
  state: CombatState;
  targetId: string;
}

/** Bonus damage dice a marked target takes per hit. Doubled on a crit. */
export const HUNTERS_MARK_DICE = '1d6';

/**
 * Ranger Hunter's Mark. Bonus action: brand a living enemy as the quarry. Every
 * weapon hit the ranger lands on the marked target deals an extra {@link
 * HUNTERS_MARK_DICE} (resolved in playerAttack). Re-casting moves the mark to a
 * new target (the cost: another bonus action), so when the quarry falls the
 * ranger re-brands the next threat.
 */
export function useHuntersMark(ctx: HuntersMarkContext): CombatActionResult {
  const { character, state, targetId } = ctx;
  if (character.classId !== 'ranger') return combatResult(state, character);
  if (!characterHasMechanic(character, 'hunters-mark')) return combatResult(state, character);
  if (character.actionEconomy.bonusActionUsed) return combatResult(state, character);

  const target = state.combatants.find(
    (c): c is MonsterCombatant =>
      c.kind === 'monster' && c.id === targetId && c.instance.hp.current > 0,
  );
  if (!target) return combatResult(state, character);
  if (state.huntersMarkTargetId === targetId) return combatResult(state, character);

  const nextCharacter = patchActionEconomy(character, { bonusActionUsed: true });
  const log: CombatLogEntry = {
    id: state.log.length + 1,
    kind: 'narration',
    text: t('combat.log.huntersMark', {
      name: nextCharacter.name,
      target: target.instance.displayName,
    }),
  };
  return combatResult(
    attachCombatVfx(
      appendLog({ ...state, huntersMarkTargetId: targetId }, log),
      'hunters-mark',
      'player',
      targetId,
    ),
    nextCharacter,
  );
}
