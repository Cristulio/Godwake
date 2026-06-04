import type { DiceRoller } from '../dice';
import type { Character } from '../../types/character';
import type { CombatState, CombatLogEntry } from '../../types/combat';
import { getItem } from '../../content/items';
import { isRaging } from '../character/derived';
import {
  combatResult,
  patchActionEconomy,
  patchHp,
  patchResources,
  type CombatActionResult,
} from './types';
import { appendLog } from './log';

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

  // Rage's tradeoff: no safety net. A raging barbarian can't drink a healing
  // draught — the fury locks out recovery until it passes. No-op (the potion is
  // kept, not wasted) so the gate reads as "can't", not "lost it".
  if (item.effect === 'heal' && isRaging(nextCharacter)) {
    return combatResult(state, nextCharacter);
  }

  // Action economy check
  if (item.actionCost === 'action' && nextCharacter.actionEconomy.actionUsed) {
    return combatResult(state, nextCharacter);
  }
  if (item.actionCost === 'bonus' && nextCharacter.actionEconomy.bonusActionUsed) {
    return combatResult(state, nextCharacter);
  }

  let logText = `${nextCharacter.name} uses ${item.name}.`;

  if (item.effect === 'heal' && item.healDice) {
    const heal = roller.roll(item.healDice);
    const before = nextCharacter.hp.current;
    const after = Math.min(nextCharacter.hp.max, before + heal.total);
    const actuallyHealed = after - before;
    nextCharacter = patchHp(nextCharacter, { current: after });
    logText += ` Rolls ${item.healDice} = ${heal.total} → +${actuallyHealed} HP.`;

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
      logText += ` A slow vitality settles in — about ${perTurn} HP at the start of each of the next ${item.regenTurns} turns.`;
    }
  } else if (ref.itemId === 'antitoxin') {
    // Per-combat poison immunity. Mirrors the Iron Stomach quirk's
    // poisonImmune path in applyDamage so the existing immune gate
    // handles both transparently. Cleared in combat resolution.
    nextCharacter = { ...nextCharacter, poisonImmuneEncounter: true };
    logText += ` The phial empties cold — poison will slide off until the room falls silent.`;
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
