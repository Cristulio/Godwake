import type { DiceRoller } from '../dice';
import type { Character } from '../../types/character';
import type { CombatState, CombatLogEntry } from '../../types/combat';
import { getItem } from '../../content/items';
import { combatResult, type CombatActionResult } from './types';

export interface UseItemContext {
  roller: DiceRoller;
  character: Character;
  state: CombatState;
}

/**
 * Consume an item from inventory. Heal potions roll dice and restore HP;
 * Antitoxin grants per-combat poison immunity. The matching ItemRef is
 * removed from inventory and the appropriate action cost is spent.
 */
export function useConsumable(
  ctx: UseItemContext,
  inventoryIndex: number,
): CombatActionResult {
  const { roller, character, state } = ctx;
  const ref = character.inventory[inventoryIndex];
  if (!ref) return combatResult(state, character);
  const item = getItem(ref.itemId);
  if (item.kind !== 'consumable') return combatResult(state, character);

  // Action economy check
  if (item.actionCost === 'action' && character.actionEconomy.actionUsed) return combatResult(state, character);
  if (item.actionCost === 'bonus' && character.actionEconomy.bonusActionUsed) return combatResult(state, character);

  let logText = `${character.name} uses ${item.name}.`;

  if (item.effect === 'heal' && item.healDice) {
    const heal = roller.roll(item.healDice);
    const before = character.hp.current;
    const after = Math.min(character.hp.max, before + heal.total);
    const actuallyHealed = after - before;
    character.hp = { ...character.hp, current: after };
    logText += ` Rolls ${item.healDice} = ${heal.total} → +${actuallyHealed} HP.`;
  } else if (ref.itemId === 'antitoxin') {
    // Per-combat poison immunity. Mirrors the Iron Stomach quirk's
    // poisonImmune path in applyDamage so the existing immune gate
    // handles both transparently. Cleared in combat resolution.
    character.poisonImmuneEncounter = true;
    logText += ` The phial empties cold — poison will slide off until the room falls silent.`;
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

  return combatResult({ ...state, log: [...state.log, log] }, character);
}
