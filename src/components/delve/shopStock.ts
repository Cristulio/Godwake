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
 * The five-slot rarity mix the merchant lays out, by CHAPTER (1–14). The rack
 * climbs from green-heavy at the gate to all-purple in the deep chapters, so a
 * late-game merchant is visibly richer than an early one. The rarity ladder tops
 * out at purple (legendaries are the hub layer, never rolled onto shop stock), so
 * the mix saturates at all-purple from Ch8 on; deeper chapters keep climbing on
 * the OTHER axis — enhancement +N and base power via rollItem's depth, which
 * takes the raw chapter (10–14 included) uncapped. Indexed 1-based; clamp
 * out-of-range so 10–14 take the all-purple top row. Magnitudes are by judgment —
 * a sim pass tunes them.
 */
const GEAR_RARITY_MIX_BY_CHAPTER: GearRarity[][] = [
  ['green', 'green', 'green', 'blue', 'blue'], // ch1
  ['green', 'green', 'blue', 'blue', 'blue'], // ch2
  ['green', 'blue', 'blue', 'blue', 'purple'], // ch3
  ['green', 'blue', 'blue', 'purple', 'purple'], // ch4
  ['blue', 'blue', 'purple', 'purple', 'purple'], // ch5
  ['blue', 'blue', 'purple', 'purple', 'purple'], // ch6
  ['blue', 'purple', 'purple', 'purple', 'purple'], // ch7
  ['purple', 'purple', 'purple', 'purple', 'purple'], // ch8–14 (rarity ceiling; depth still climbs)
];

function gearRarityMixForChapter(chapter: number): GearRarity[] {
  const i = Math.max(1, Math.min(GEAR_RARITY_MIX_BY_CHAPTER.length, chapter)) - 1;
  return GEAR_RARITY_MIX_BY_CHAPTER[i];
}

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
 * `chapter` (1–14) is the power axis: it sets the rarity mix AND feeds rollItem's
 * depth (base tier + the +1/+2/+3 enhancement ceiling), so a deep-chapter rack
 * carries stronger, pricier arms. The rarity mix saturates at all-purple from
 * Ch8 on (purple is the shop ceiling); past that, depth alone keeps the endgame
 * rack climbing.
 *
 * `layer` is the node's column on the chapter map (`RoomSpec.layer`): deeper
 * shops within a chapter promote the weaker slots one rarity step, so a
 * late-chapter merchant stocks strictly richer than the one at the gate.
 */
export function rollGearStock(
  seed: string,
  chapter: number,
  classId: ClassId,
  layer = 0,
  maxRarity: GearRarity = 'purple',
): GearStock[] {
  const roller = createDiceRoller(`${seed}:gear-shop`);
  const promotions = Math.min(5, Math.floor(layer / 2));
  return gearRarityMixForChapter(chapter).map((baseRarity, i) => {
    let rarity = promoteRarity(baseRarity, i < promotions ? 1 : 0);
    rarity = capRarity(rarity, maxRarity);
    const ref = rollItem(
      roller,
      i === 1 ? { rarity, classId, kind: 'accessory', depth: chapter } : { rarity, classId, depth: chapter },
    );
    return { ref, cost: rolledItemCost(ref) };
  });
}

/** Clamp `rarity` to not exceed `max` on the green → blue → purple ladder. */
function capRarity(rarity: GearRarity, max: GearRarity): GearRarity {
  const order: GearRarity[] = ['white', 'green', 'blue', 'purple', 'legendary'];
  const ri = order.indexOf(rarity);
  const mi = order.indexOf(max);
  return mi < 0 || ri <= mi ? rarity : max;
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

/** Chance (percent) the merchant has a legendary relic for sale, by chapter — it
 * climbs as the run goes deep, and there's no reliquary before chapter 3. It
 * plateaus at 15 across Ch7-9, then climbs again through the endgame so a deep
 * Throne-of-Bhaal visit has the best reliquary odds in the game (Ch14 ≈ 45%).
 * Both vendors (ShopRoom + CampRoom) draw from this, so per-visit odds are small. */
function legendaryOfferChance(chapter: number): number {
  if (chapter >= 10) return 15 + (chapter - 9) * 6; // ch10 21 → ch14 45
  if (chapter >= 7) return 15;
  if (chapter >= 5) return 10;
  if (chapter >= 3) return 6;
  return 0;
}

/** The reliquary price climbs with depth — a real late-game gold sink. By judgment. */
function legendaryOfferCost(chapter: number): number {
  return 500 + Math.max(0, chapter - 3) * 250;
}

/**
 * Maybe lay out a single legendary relic for sale — the "reliquary" offer. Rare,
 * deep-chapter only, and only an UN-OWNED relic eligible for the class. Buying it
 * BANKS the relic to the persistent collection (it does not enter the pack) and
 * removes it from stock. Deterministic per `seed` so the offer is stable per
 * visit. Returns null when there's no offer this visit.
 */
export function rollLegendaryOffer(
  seed: string,
  chapter: number,
  classId: ClassId,
  ownedIds: readonly string[],
): LegendaryOffer | null {
  const chance = legendaryOfferChance(chapter);
  if (chance <= 0) return null;
  const roller = createDiceRoller(`${seed}:legendary-offer`);
  if (roller.roll('1d100').total > chance) return null;
  const pool = legendaryDropPool(classId).filter((id) => !ownedIds.includes(id));
  if (pool.length === 0) return null;
  const id = pool[(roller.roll('1d100').total - 1) % pool.length];
  const leg = getLegendary(id);
  if (!leg) return null;
  return { legendaryId: id, name: leg.name, cost: legendaryOfferCost(chapter) };
}
