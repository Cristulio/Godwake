import type { DiceRoller } from '../dice';
import type { Character } from '../../types/character';
import type { CombatState, CombatLogEntry } from '../../types/combat';
import { getItem } from '../../content/items';
import { ragedHealAmount } from '../character/derived';
import {
  combatResult,
  patchActionEconomy,
  patchHp,
  patchResources,
  type CombatActionResult,
} from './types';
import { appendLog } from './log';
import { t, getLocalized } from '../../i18n';

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
  let nextCharacter: Character = character;
  const ref = nextCharacter.inventory[inventoryIndex];
  if (!ref) return combatResult(state, nextCharacter);
  const item = getItem(ref.itemId);
  if (item.kind !== 'consumable') return combatResult(state, nextCharacter);

  // Action economy check
  if (item.actionCost === 'action' && nextCharacter.actionEconomy.actionUsed) {
    return combatResult(state, nextCharacter);
  }
  if (item.actionCost === 'bonus' && nextCharacter.actionEconomy.bonusActionUsed) {
    return combatResult(state, nextCharacter);
  }

  const itemName = getLocalized('items', item.id, 'name', item.name);
  let logText = t('combat.log.useItem', { name: nextCharacter.name, item: itemName });

  if (item.effect === 'heal' && item.healDice) {
    const heal = roller.roll(item.healDice);
    // Rage halves what a draught restores (rounded up), it no longer locks it out.
    const restored = ragedHealAmount(nextCharacter, heal.total);
    const before = nextCharacter.hp.current;
    const after = Math.min(nextCharacter.hp.max, before + restored);
    const actuallyHealed = after - before;
    nextCharacter = patchHp(nextCharacter, { current: after });
    logText += t('combat.log.useItemHeal', {
      dice: item.healDice,
      roll: heal.total,
      healed: actuallyHealed,
    });

    // Potion of Vitality regen tail: beyond the immediate knit above, bank a
    // slow restore for the next couple of player turns (ticked in turn.ts).
    // Rolled once here and applied flat each tick (mirrors Regrowth). Writes its
    // own resource fields — never Mending's stacks or Regrowth's counter — so
    // drinking it leaves any other active regen untouched.
    if (item.regenPerTurnDice && item.regenTurns) {
      const perTurn = roller.roll(item.regenPerTurnDice).total;
      nextCharacter = patchResources(nextCharacter, {
        vitalityRegenHealPerTurn: perTurn,
        vitalityRegenTurnsRemaining: item.regenTurns,
      });
      logText += t('combat.log.useItemVitality', { perTurn, turns: item.regenTurns });
    }
  } else if (ref.itemId === 'antitoxin') {
    // Per-combat poison immunity. Mirrors the Iron Stomach quirk's
    // poisonImmune path in applyDamage so the existing immune gate
    // handles both transparently. Cleared in combat resolution.
    nextCharacter = { ...nextCharacter, poisonImmuneEncounter: true };
    logText += t('combat.log.useItemAntitoxin');
  }

  // Spend action economy
  if (item.actionCost === 'action') {
    nextCharacter = patchActionEconomy(nextCharacter, { actionUsed: true });
  } else {
    nextCharacter = patchActionEconomy(nextCharacter, { bonusActionUsed: true });
  }

  // Remove one of this item from inventory (the specific index)
  nextCharacter = {
    ...nextCharacter,
    inventory: [
      ...nextCharacter.inventory.slice(0, inventoryIndex),
      ...nextCharacter.inventory.slice(inventoryIndex + 1),
    ],
  };

  const log: CombatLogEntry = {
    id: state.log.length + 1,
    kind: 'narration',
    text: logText,
  };

  return combatResult(appendLog(state, log), nextCharacter);
}
