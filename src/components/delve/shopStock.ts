import type { GearRarity, ItemRef } from '../../schemas/item';
import type { ClassId } from '../../schemas/ids';
import type { CampBoonTier } from '../../content/campBoons';
import { createDiceRoller } from '../../engine/dice';
import { rollItem, rolledItemCost } from '../../engine/items';
import { legendaryDropPool, getLegendary } from '../../content/legendaries';

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
const CONSUMABLE_BASE = ['potion-of-healing', 'antitoxin'];
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
 * The rarity mix the merchant lays out by depth. Wave 2 widens the rack to five
 * slots drawn from the big rolled pool (weapons / armour / accessories), so the
 * stock rotates meaningfully each visit (seeded by the room id) — richer and
 * deeper as the chapters climb.
 */
const GEAR_RARITY_MIX: Record<CampBoonTier, GearRarity[]> = {
  1: ['green', 'green', 'green', 'blue', 'blue'],
  2: ['green', 'green', 'blue', 'blue', 'purple'],
  3: ['green', 'blue', 'blue', 'purple', 'purple'],
};

/** Shop rarity ladder for depth promotion — capped at purple (legendaries are
 * the hub layer now, never rolled onto shop stock). */
const SHOP_RARITY_LADDER: GearRarity[] = ['green', 'blue', 'purple'];

function promoteRarity(rarity: GearRarity, steps: number): GearRarity {
  if (steps <= 0) return rarity;
  const i = SHOP_RARITY_LADDER.indexOf(rarity);
  if (i < 0) return rarity;
  return SHOP_RARITY_LADDER[Math.min(SHOP_RARITY_LADDER.length - 1, i + steps)];
}

export interface GearStock {
  ref: ItemRef;
  cost: number;
}

/**
 * Roll the merchant's arms rack: class-legal bases with rolled affixes, priced
 * by rarity. Deterministic per `seed` (pass the room id) so re-renders don't
 * reroll the stock. At least one accessory is guaranteed on the rack so the new
 * slots are buyable, not drop-only.
 *
 * `depth` is the node's column on the chapter map (`RoomSpec.layer`): deeper
 * shops within a chapter promote the weaker slots up the rarity ladder, so a
 * late-chapter merchant stocks strictly richer than the one at the gate.
 */
export function rollGearStock(
  seed: string,
  tier: CampBoonTier,
  classId: ClassId,
  depth = 0,
): GearStock[] {
  const roller = createDiceRoller(`${seed}:gear-shop`);
  const promotions = Math.min(5, Math.floor(depth / 2));
  return GEAR_RARITY_MIX[tier].map((baseRarity, i) => {
    const rarity = promoteRarity(baseRarity, i < promotions ? 1 : 0);
    const ref = rollItem(
      roller,
      i === 1 ? { rarity, classId, kind: 'accessory' } : { rarity, classId },
    );
    return { ref, cost: rolledItemCost(ref) };
  });
}

/** Fraction of an item's value the merchant pays back when buying it from you. */
const SELL_RATE = 0.4;

/** What the merchant pays for a carried item — a fraction of its rolled value. */
export function sellValue(ref: ItemRef): number {
  return Math.max(1, Math.round(rolledItemCost(ref) * SELL_RATE));
}

export interface LegendaryOffer {
  legendaryId: string;
  name: string;
  cost: number;
}

/** Per-tier chance (percent) the merchant has a legendary relic for sale. */
const LEGENDARY_OFFER_CHANCE: Record<CampBoonTier, number> = { 1: 0, 2: 15, 3: 30 };

/**
 * Maybe lay out a single legendary relic for sale — the "reliquary" offer. Rare,
 * deep-chapter only, and only an UN-OWNED relic eligible for the class. Buying it
 * BANKS the relic to the persistent collection (it does not enter the pack) and
 * removes it from stock. Deterministic per `seed` so the offer is stable per
 * visit. Returns null when there's no offer this visit.
 */
export function rollLegendaryOffer(
  seed: string,
  tier: CampBoonTier,
  classId: ClassId,
  ownedIds: readonly string[],
): LegendaryOffer | null {
  const chance = LEGENDARY_OFFER_CHANCE[tier];
  if (chance <= 0) return null;
  const roller = createDiceRoller(`${seed}:legendary-offer`);
  if (roller.roll('1d100').total > chance) return null;
  const pool = legendaryDropPool(classId).filter((id) => !ownedIds.includes(id));
  if (pool.length === 0) return null;
  const id = pool[(roller.roll('1d100').total - 1) % pool.length];
  const leg = getLegendary(id);
  if (!leg) return null;
  return { legendaryId: id, name: leg.name, cost: 350 * tier };
}
