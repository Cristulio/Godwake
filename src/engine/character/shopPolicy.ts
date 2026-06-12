import type { Character } from '../../types/character';
import type { Consumable } from '../../schemas/item';
import { getItem } from '../../content/items';
import { consumableIdsForChapter } from '../../content/items/consumables';

/**
 * The sim bot's consumable shopping policy — how a soul spends shop gold on
 * draughts, shared by every sim script so the balance sims model the SAME
 * buyer (sims model full play; an unbought consumable is invisible to them).
 * The real game never calls this: a human does their own shopping.
 *
 * Greedy and tier-aware: keep a survival pocket of healing draughts, buying
 * the DEAREST rung the current chapter stocks first (late gold chases the
 * late rungs — the designed sink), stepping down as gold thins; then hold one
 * Elixir of Iron and one Oil of Sharpness whenever the depth stocks them.
 * Caps are PROVISIONAL seeds for the economy/usage sim pass.
 */

/** Most healing draughts the bot carries — buys top up to this, never hoard. */
export const SIM_HEAL_CARRY_CAP = 6;

function consumableOrNull(itemId: string): Consumable | null {
  try {
    const item = getItem(itemId);
    return item.kind === 'consumable' ? item : null;
  } catch {
    return null;
  }
}

/** Spend pocket gold on the consumable rack at `chapter`. Returns the character
 *  with purchases in the pack and gold debited. Deterministic — no dice. */
export function buyShopConsumables(
  character: Character,
  chapter: number | undefined,
): Character {
  let c = character;
  let gold = c.goldInPocket;
  const stock = consumableIdsForChapter(chapter ?? 1)
    .map(consumableOrNull)
    .filter((it): it is Consumable => it !== null);

  // Healing pocket first — survival buys before edge buys.
  const healRungs = stock
    .filter((it) => it.effect === 'heal')
    .sort((a, b) => b.cost - a.cost);
  let healsHeld = c.inventory.filter(
    (ref) => consumableOrNull(ref.itemId)?.effect === 'heal',
  ).length;
  while (healsHeld < SIM_HEAL_CARRY_CAP) {
    const pick = healRungs.find((it) => it.cost <= gold);
    if (!pick) break;
    c = { ...c, inventory: [...c.inventory, { itemId: pick.id }] };
    gold -= pick.cost;
    healsHeld += 1;
  }

  // One encounter buff of each kind in the pack at a time — they're one-fight
  // effects, so a second copy is dead weight until the first is drunk.
  for (const buff of stock.filter((it) => it.effect === 'buff')) {
    if (buff.cost > gold) continue;
    if (c.inventory.some((ref) => ref.itemId === buff.id)) continue;
    c = { ...c, inventory: [...c.inventory, { itemId: buff.id }] };
    gold -= buff.cost;
  }

  return { ...c, goldInPocket: gold };
}
