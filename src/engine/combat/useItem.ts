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

  if (item.effect === 'heal' && (item.healDice || item.healPercent)) {
    let rolled = 0;
    if (item.healDice) rolled = roller.roll(item.healDice).total;
    // Percentage rung (Superior/Vigor): half of max scales with the drinker
    // forever — no level-band dice to mistune. Additive with any flat dice.
    const pctHeal = item.healPercent
      ? Math.ceil((nextCharacter.hp.max * item.healPercent) / 100)
      : 0;
    // Rage halves what a draught restores (rounded up), it no longer locks it out.
    const restored = ragedHealAmount(nextCharacter, rolled + pctHeal);
    const before = nextCharacter.hp.current;
    const after = Math.min(nextCharacter.hp.max, before + restored);
    const actuallyHealed = after - before;
    nextCharacter = patchHp(nextCharacter, { current: after });
    logText += item.healDice
      ? t('combat.log.useItemHeal', {
          dice: item.healDice,
          roll: rolled,
          healed: actuallyHealed,
        })
      : t('combat.log.useItemHealPct', {
          pct: item.healPercent ?? 0,
          healed: actuallyHealed,
        });

    // Vigor's over-shield: temp HP as a fraction of max. Temp HP never stacks —
    // keep the larger of this grant and any pool already up (Hold-the-Wall rule).
    if (item.tempHpPercent) {
      const grant = Math.ceil((nextCharacter.hp.max * item.tempHpPercent) / 100);
      if (grant > nextCharacter.hp.temp) {
        nextCharacter = patchHp(nextCharacter, { temp: grant });
        logText += t('combat.log.useItemTempHp', { n: grant });
      }
    }

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

  // Encounter buffs (Elixir of Iron / Oil of Sharpness) — per-combat flat
  // effects on the antitoxin lifecycle (set here, cleared in combat
  // resolution). A re-drink keeps the stronger pour rather than stacking.
  if (item.encounterDamageReduction) {
    nextCharacter = {
      ...nextCharacter,
      damageReductionEncounter: Math.max(
        nextCharacter.damageReductionEncounter ?? 0,
        item.encounterDamageReduction,
      ),
    };
    logText += t('combat.log.useItemIron', { n: item.encounterDamageReduction });
  }
  if (item.encounterAttackBonus || item.encounterDamageBonus) {
    nextCharacter = {
      ...nextCharacter,
      attackBonusEncounter: Math.max(
        nextCharacter.attackBonusEncounter ?? 0,
        item.encounterAttackBonus ?? 0,
      ),
      damageBonusEncounter: Math.max(
        nextCharacter.damageBonusEncounter ?? 0,
        item.encounterDamageBonus ?? 0,
      ),
    };
    logText += t('combat.log.useItemOil', {
      hit: item.encounterAttackBonus ?? 0,
      dmg: item.encounterDamageBonus ?? 0,
    });
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
