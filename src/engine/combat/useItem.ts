import type { DiceRoller } from '../dice';
import type { Character } from '../../types/character';
import type { CombatState, CombatLogEntry } from '../../types/combat';
import { getItem } from '../../content/items';

export interface UseItemContext {
  roller: DiceRoller;
  character: Character;
  state: CombatState;
}

/**
 * Consume an item from inventory. For MVP only healing potions are supported.
 * The matching ItemRef is removed from inventory; the appropriate action cost
 * is spent; HP is restored on heal items.
 */
export function useConsumable(
  ctx: UseItemContext,
  inventoryIndex: number,
): CombatState {
  const { roller, character, state } = ctx;
  const ref = character.inventory[inventoryIndex];
  if (!ref) return state;
  const item = getItem(ref.itemId);
  if (item.kind !== 'consumable') return state;

  // Action economy check
  if (item.actionCost === 'action' && character.actionEconomy.actionUsed) return state;
  if (item.actionCost === 'bonus' && character.actionEconomy.bonusActionUsed) return state;

  let logText = `${character.name} uses ${item.name}.`;

  if (item.effect === 'heal' && item.healDice) {
    const heal = roller.roll(item.healDice);
    const before = character.hp.current;
    const after = Math.min(character.hp.max, before + heal.total);
    const actuallyHealed = after - before;
    character.hp = { ...character.hp, current: after };
    logText += ` Rolls ${item.healDice} = ${heal.total} → +${actuallyHealed} HP.`;
  }

  // Spend action economy
  if (item.actionCost === 'action') {
    character.actionEconomy = { ...character.actionEconomy, actionUsed: true };
  } else {
    character.actionEconomy = { ...character.actionEconomy, bonusActionUsed: true };
  }

  // Remove one of this item from inventory (the specific index)
  character.inventory = [
    ...character.inventory.slice(0, inventoryIndex),
    ...character.inventory.slice(inventoryIndex + 1),
  ];

  const log: CombatLogEntry = {
    id: state.log.length + 1,
    kind: 'narration',
    text: logText,
  };

  return {
    ...state,
    log: [...state.log, log],
  };
}
