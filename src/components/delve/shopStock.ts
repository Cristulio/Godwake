import type { GearRarity, ItemRef } from '../../schemas/item';
import type { ClassId } from '../../schemas/ids';
import type { CampBoonTier } from '../../content/campBoons';
import { createDiceRoller } from '../../engine/dice';
import { rollItem, rolledItemCost } from '../../engine/items';

/**
 * Shared merchant stock for both the camp caravan (CampRoom) and the route-map
 * merchant (ShopRoom). Draughts & charms come from a fixed, depth-scaled list;
 * the arms rack is Diablo-style ROLLED gear (base + affixes, rarity-coloured,
 * priced by rarity — the gold sink). Wave 1.5: a small fixed rarity spread per
 * depth; the big rotating pool is Wave 2.
 */

/** Fixed consumable stock by depth (cumulative — a deeper merchant carries
 * everything the shallower one did, plus more). Arms are rolled, not listed
 * here. */
const CONSUMABLE_BASE = ['potion-of-healing', 'antitoxin', 'scroll-of-healing-word'];
const CONSUMABLE_TIER_2 = ['potion-of-greater-healing'];
const CONSUMABLE_TIER_3 = ['potion-of-heroism']; // "Potion of Vitality" — the dearest draught

export function consumableStockForTier(tier: CampBoonTier | null): string[] {
  const t = tier ?? 1;
  const ids = [...CONSUMABLE_BASE];
  if (t >= 2) ids.push(...CONSUMABLE_TIER_2);
  if (t >= 3) ids.push(...CONSUMABLE_TIER_3);
  return ids;
}

/** Deeper chapters carry the pricier wares — maps a chapter to a stock tier. */
export function tierForChapter(chapter: number | undefined): CampBoonTier {
  if (!chapter || chapter <= 1) return 1;
  if (chapter === 2) return 2;
  return 3;
}

/**
 * The rarity mix the merchant lays out by depth. A small, fixed spread (the big
 * rotating pool is Wave 2) — bases and affixes still vary per visit via the
 * seeded roller.
 */
const GEAR_RARITY_MIX: Record<CampBoonTier, GearRarity[]> = {
  1: ['green', 'green', 'blue'],
  2: ['green', 'blue', 'blue'],
  3: ['blue', 'blue', 'purple'],
};

export interface GearStock {
  ref: ItemRef;
  cost: number;
}

/**
 * Roll the merchant's arms rack: class-legal bases with rolled affixes, priced
 * by rarity. Deterministic per `seed` (pass the room id) so re-renders don't
 * reroll the stock.
 */
export function rollGearStock(seed: string, tier: CampBoonTier, classId: ClassId): GearStock[] {
  const roller = createDiceRoller(`${seed}:gear-shop`);
  return GEAR_RARITY_MIX[tier].map((rarity) => {
    const ref = rollItem(roller, { rarity, classId });
    return { ref, cost: rolledItemCost(ref) };
  });
}
