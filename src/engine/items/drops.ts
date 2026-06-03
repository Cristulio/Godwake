import type { DiceRoller } from '../dice';
import type { GearRarity } from '../../schemas/item';

/**
 * Loot source = the combat-room clear. Drops are intentionally LOW chance ("from
 * time to time, not always") and climb by source: a mob rarely coughs up gear,
 * an elite more often, a boss usually. This is the gold/gear sink the economy
 * re-sim will tune; Wave 1 just needs sane, playable numbers.
 */
export type DropSource = 'combat' | 'elite' | 'boss';

/** Percent chance a cleared room of each kind drops anything at all. */
const DROP_CHANCE: Record<DropSource, number> = {
  combat: 12,
  elite: 35,
  boss: 70,
};

/**
 * Rarity weights by RICHNESS TIER (low → high). A drop's tier is its chapter band
 * promoted by the source, so a dropped item tracks the SHOP RACK for the same
 * chapter instead of the old flat, chapter-blind green-heavy mix that fell far
 * below a deep merchant (a Ch14 mob used to drop the same green-72 spread as a
 * Ch1 one). Mirrors shopStock.GEAR_RARITY_MIX_BY_CHAPTER — kept inline so the
 * engine doesn't import a component (and to avoid an items↔shopStock cycle).
 * Weights need not sum to 100; they're normalised at roll time.
 */
const RARITY_TIERS: Array<Array<[GearRarity, number]>> = [
  // tier 0 — Ch1-2 floor: white/green, a little blue, no purple (rack W/G).
  [['white', 42], ['green', 44], ['blue', 14]],
  // tier 1 — Ch3-4: blue-centred, still no purple (rack W/G/B).
  [['white', 15], ['green', 40], ['blue', 45]],
  // tier 2 — Ch5-7: purple enters, blue carries (rack first shows purple at Ch5).
  [['white', 3], ['green', 27], ['blue', 45], ['purple', 25]],
  // tier 3 — Ch8+: the richest spread (rack flattens to G/B/B/P; depth climbs on).
  [['green', 20], ['blue', 50], ['purple', 30]],
];

/** Chapter → base richness tier (the `combat` source). */
function chapterBand(chapter: number): number {
  if (chapter >= 8) return 3;
  if (chapter >= 5) return 2;
  if (chapter >= 3) return 1;
  return 0;
}

/** Tiers a source rolls ABOVE a plain mob — an elite/boss fight skews richer at
 * the same chapter, the way a deeper shop layer promotes the rack. */
const SOURCE_RICHNESS: Record<DropSource, number> = {
  combat: 0,
  elite: 1,
  boss: 2,
};

/** The rarity weight table for a (source, chapter): the chapter band promoted by
 * the source, clamped to the richest tier. */
function rarityTableFor(source: DropSource, chapter: number): Array<[GearRarity, number]> {
  const tier = Math.min(RARITY_TIERS.length - 1, chapterBand(chapter) + SOURCE_RICHNESS[source]);
  return RARITY_TIERS[tier];
}

/**
 * Chance (percent) that WINNING an ELITE fight yields a legendary relic. The
 * elite node is the SOLE source: legendaries are earned by taking the elite-risk
 * path (Fight, not Take-the-gold). Regular combats and bosses never drop them.
 * A relic that drops is BANKED to the persistent hub reliquary — it never enters
 * the run inventory and isn't equipped mid-run (see delveStore.resolveRoomVictory).
 */
const LEGENDARY_DROP_CHANCE: Record<DropSource, number> = {
  combat: 0,
  elite: 35,
  boss: 0,
};

/** Roll whether a cleared room yields a legendary relic. Deterministic. */
export function rollLegendaryDrop(roller: DiceRoller, roomKind: string): boolean {
  const source = dropSourceForRoom(roomKind);
  if (!source) return false;
  return roller.roll('1d100').total <= LEGENDARY_DROP_CHANCE[source];
}

function pickWeightedRarity(roller: DiceRoller, table: Array<[GearRarity, number]>): GearRarity {
  const total = table.reduce((sum, [, w]) => sum + w, 0);
  // 1..total inclusive from the seeded roller.
  let roll = ((roller.roll('1d100').total - 1) % total) + 1;
  for (const [rarity, weight] of table) {
    if (roll <= weight) return rarity;
    roll -= weight;
  }
  return table[table.length - 1][0];
}

/** Map a room kind to a drop source, or null for non-combat rooms. */
export function dropSourceForRoom(kind: string): DropSource | null {
  if (kind === 'boss') return 'boss';
  if (kind === 'elite') return 'elite';
  if (kind === 'combat') return 'combat';
  return null;
}

/**
 * Roll whether a cleared combat room drops loot, and at what rarity. The rarity
 * scales with `chapter` (and the source), so a drop you GET is chapter-appropriate
 * — comparable to the same-chapter shop rack, not far below it. Returns the rolled
 * rarity (white→purple) or null for no drop. Deterministic.
 */
export function rollGearDrop(
  roller: DiceRoller,
  roomKind: string,
  chapter = 1,
): GearRarity | null {
  const source = dropSourceForRoom(roomKind);
  if (!source) return null;
  if (roller.roll('1d100').total > DROP_CHANCE[source]) return null;
  return pickWeightedRarity(roller, rarityTableFor(source, chapter));
}
