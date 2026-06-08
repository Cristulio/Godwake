import type { GearRarity, ItemRef } from '../../schemas/item';
import type { ClassId } from '../../schemas/ids';
import type { CampBoonTier } from '../../content/campBoons';
import { createDiceRoller } from '../../engine/dice';
import {
  rollItem,
  rolledItemCost,
  maxRolledRarityForChapter,
  capRarity,
  type BaseKind,
} from '../../engine/items';
import { legendaryDropPool, getLegendary } from '../../content/legendaries';
import { ascensionAscendantLoot } from '../../engine/delve/ascension';

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
 * The four-slot rarity mix the merchant lays out, by CHAPTER (1–14). The rack
 * trends richer with depth — the top rarity climbs — but it never saturates:
 * every rack keeps at least two slots at white/green/blue, and purple is capped
 * at two slots (see MAX_PURPLE_PER_RACK) so the lower rarities are always on the
 * rack. The TOP rarity per row tracks the chapter ceiling
 * (maxRolledRarityForChapter): greens through Ch2, blue Ch3–6, purple from Ch7 —
 * so the shop and the drop table unlock rarities on the same chapter schedule.
 * Past Ch8 the SPREAD holds steady; deeper chapters keep climbing on the OTHER
 * axis — enhancement +N and base power via rollItem's depth, which takes the raw
 * chapter (10–14 included) uncapped. Indexed 1-based; clamp out-of-range so 10–14
 * take the Ch8 row. Magnitudes are by judgment — a sim pass tunes them.
 */
const GEAR_RARITY_MIX_BY_CHAPTER: GearRarity[][] = [
  ['white', 'white', 'green', 'green'], // ch1 (green ceiling)
  ['white', 'green', 'green', 'green'], // ch2 (green ceiling)
  ['white', 'green', 'blue', 'blue'], // ch3 (blue ceiling)
  ['white', 'green', 'blue', 'blue'], // ch4
  ['green', 'green', 'blue', 'blue'], // ch5
  ['green', 'blue', 'blue', 'blue'], // ch6
  ['green', 'blue', 'blue', 'purple'], // ch7 (purple ceiling enters)
  ['green', 'blue', 'purple', 'purple'], // ch8–14 (spread holds; depth still climbs)
];

function gearRarityMixForChapter(chapter: number): GearRarity[] {
  const i = Math.max(1, Math.min(GEAR_RARITY_MIX_BY_CHAPTER.length, chapter)) - 1;
  return GEAR_RARITY_MIX_BY_CHAPTER[i];
}

/** Shop rarity ladder for depth promotion — white floor up to a purple ceiling
 * (legendaries are the hub layer now, never rolled onto shop stock). */
const SHOP_RARITY_LADDER: GearRarity[] = ['white', 'green', 'blue', 'purple'];

/** The flattened rack never saturates to all-purple: at most this many of the
 * four slots are purple, even when deep-layer promotion would push more. Keeps
 * white/green/blue always present. */
const MAX_PURPLE_PER_RACK = 2;

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
 * slots are buyable, not drop-only. A monk (no legal body armour) is capped at a
 * single weapon slot with the rest accessories, so their rack doesn't collapse
 * into the three monk weapons — see `stockSlotKind`.
 *
 * `chapter` (1–14) is the power axis: it sets the rarity mix AND feeds rollItem's
 * depth (base tier + the +1/+2/+3 enhancement ceiling), so a deep-chapter rack
 * carries stronger, pricier arms. The rarity SPREAD stops climbing at Ch8 (the
 * mix flattens out); past that, depth alone keeps the endgame rack richer.
 *
 * `layer` is the node's column on the chapter map (`RoomSpec.layer`): deeper
 * shops within a chapter promote the weaker slots one rarity step, so a
 * late-chapter merchant stocks richer than the one at the gate — but never above
 * the chapter's rarity ceiling (maxRolledRarityForChapter), and purples stay
 * capped (`MAX_PURPLE_PER_RACK`), so the rack never saturates to all-purple.
 *
 * Rarity is gated PURELY by the current `chapter` — a Ch1 rack is greens only and
 * climbs to epic only deep in. There is no meta/cross-run rarity unlock: a fresh
 * run always starts at greens because the ceiling reads the live chapter.
 */
export function rollGearStock(
  seed: string,
  chapter: number,
  classId: ClassId,
  layer = 0,
): GearStock[] {
  const roller = createDiceRoller(`${seed}:gear-shop`);
  const mix = gearRarityMixForChapter(chapter);
  const ceiling = maxRolledRarityForChapter(chapter);
  const promotions = Math.min(mix.length, Math.floor(layer / 2));
  const isMonk = classId === 'monk';
  let purples = 0;
  return mix.map((baseRarity, i) => {
    let rarity = promoteRarity(baseRarity, i < promotions ? 1 : 0);
    rarity = capRarity(rarity, ceiling);
    // Deep-layer promotion can push extra slots to purple; cap them so the rack
    // never saturates and the lower rarities are always present.
    if (rarity === 'purple') {
      if (purples >= MAX_PURPLE_PER_RACK) rarity = 'blue';
      else purples += 1;
    }
    const kind = stockSlotKind(i, isMonk);
    const ref = rollItem(
      roller,
      kind ? { rarity, classId, kind, depth: chapter } : { rarity, classId, depth: chapter },
    );
    return { ref, cost: rolledItemCost(ref) };
  });
}

/**
 * The base kind forced for rack slot `i`. Slot 1 is always the guaranteed
 * accessory. A monk has NO legal body armour (unarmored; robes are wizard-only),
 * so an unforced roll on the other slots falls back to a weapon every time and
 * the rack fills with the three monk weapons — pin a monk's slots instead: slot 0
 * the lone weapon, the rest accessories (≤1 weapon + accessories, no spam). Every
 * other class leaves the non-accessory slots unforced, so the roller still picks
 * weapon/armour/accessory exactly as before — their racks are byte-for-byte the same.
 */
function stockSlotKind(i: number, isMonk: boolean): BaseKind | undefined {
  if (i === 1) return 'accessory';
  if (!isMonk) return undefined;
  return i === 0 ? 'weapon' : 'accessory';
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

/**
 * The reliquary pricing curve — the SEED a sim pass tunes. A legendary is a
 * PERMANENT, cross-run boon banked to the reliquary forever, so it must be a real
 * long-game gold sink, not a 500gp impulse buy. The cost escalates on two axes:
 *  - `base`: the floor for your FIRST relic (a deep-chapter splurge, not pocket change).
 *  - `perOwned`: each relic already banked makes the next one dearer, so a full
 *    reliquary is a long-game aspiration rather than a quick sweep.
 *  - `perChapter`: a deep-run premium on top (anchored at chapter 3, the first
 *    chapter a relic can be offered).
 * Kept in one place so the economy sim can retune the numbers without touching the
 * call sites. */
export const LEGENDARY_PRICE = {
  base: 1200,
  perOwned: 250,
  perChapter: 150,
  // Hard ceiling so a near-full reliquary stays an ATTAINABLE stretch goal (save
  // up + clear elites), never the 35k wall the old steep `perOwned` produced.
  cap: 6000,
} as const;

/** Reliquary price for the next relic: floor + per-banked-relic escalation + a
 * deep-chapter premium, clamped to `cap` so it stays reachable. `ownedCount` is
 * how many legendaries are already banked. */
function legendaryOfferCost(chapter: number, ownedCount: number): number {
  const raw =
    LEGENDARY_PRICE.base +
    Math.max(0, ownedCount) * LEGENDARY_PRICE.perOwned +
    Math.max(0, chapter - 3) * LEGENDARY_PRICE.perChapter;
  return Math.min(raw, LEGENDARY_PRICE.cap);
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
  ascensionLevel = 0,
  // The escalation input for the price. Kept SEPARATE from `ownedIds` (the pool
  // filter) on purpose: the call sites roll the offer owned-BLIND (ownedIds: [])
  // so buying a relic doesn't churn a fresh one into view, but the price must
  // still climb with the size of the reliquary you already hold.
  ownedCount = ownedIds.length,
): LegendaryOffer | null {
  const chance = legendaryOfferChance(chapter);
  if (chance <= 0) return null;
  const roller = createDiceRoller(`${seed}:legendary-offer`);
  if (roller.roll('1d100').total > chance) return null;
  // The apex ascendant tier enters the reliquary ONLY at Asc >= 3. A first/normal
  // run never sees it. (Set gear is a separate persistent layer — content/sets.ts.)
  const pool = legendaryDropPool(
    classId,
    ascensionAscendantLoot(ascensionLevel),
  ).filter((id) => !ownedIds.includes(id));
  if (pool.length === 0) return null;
  const id = pool[(roller.roll('1d100').total - 1) % pool.length];
  const leg = getLegendary(id);
  if (!leg) return null;
  return { legendaryId: id, name: leg.name, cost: legendaryOfferCost(chapter, ownedCount) };
}
