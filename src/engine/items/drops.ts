import type { DiceRoller } from '../dice';
import type { GearRarity } from '../../schemas/item';
import { ALL_CONSUMABLES, consumableIdsForChapter } from '../../content/items/consumables';

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
 * The HARD ceiling on rolled gear rarity, by the run's CURRENT chapter (1–14).
 * Monotonic: greens only early, blue mid, epic late. This is the single axis that
 * governs rolled rarity — it reads the LIVE chapter, so it resets to greens every
 * run automatically (a fresh run starts at Ch1). It is NOT meta-persisted: clearing
 * deep in a prior run grants no rarity head-start in the next one. Legendaries and
 * set gear keep their own cross-run persistence and are unaffected by this.
 *
 * Thresholds (shared with the shop rack, shopStock.GEAR_RARITY_MIX_BY_CHAPTER):
 *   Ch1–2  → green   (white/green only — early fights stay un-trivialised)
 *   Ch3–6  → blue
 *   Ch7–14 → purple  (epic; the deep-run reward)
 */
export function maxRolledRarityForChapter(chapter: number): GearRarity {
  if (chapter >= 7) return 'purple';
  if (chapter >= 3) return 'blue';
  return 'green';
}

/** The rarity ladder, lowest → highest. `legendary` never rolls here (hub layer). */
const RARITY_LADDER: GearRarity[] = ['white', 'green', 'blue', 'purple', 'legendary'];

/** Clamp `rarity` so it never exceeds `max` on the white → purple ladder. */
export function capRarity(rarity: GearRarity, max: GearRarity): GearRarity {
  const ri = RARITY_LADDER.indexOf(rarity);
  const mi = RARITY_LADDER.indexOf(max);
  return mi < 0 || ri <= mi ? rarity : max;
}

/**
 * The weighted rarity spread for a REGULAR mob drop at the given chapter — a
 * distribution within the chapter band (every entry already sits at or below the
 * band ceiling). Bosses and elites don't use this: they drop AT the ceiling (see
 * rollGearDrop). Weights need not sum to 100; they're normalised at roll time.
 */
function combatRarityTable(chapter: number): Array<[GearRarity, number]> {
  switch (maxRolledRarityForChapter(chapter)) {
    case 'purple':
      return [['green', 20], ['blue', 50], ['purple', 30]]; // Ch7+
    case 'blue':
      return [['white', 18], ['green', 42], ['blue', 40]]; // Ch3–6
    default:
      return [['white', 45], ['green', 55]]; // Ch1–2, greens only
  }
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

/**
 * Chance (percent) that winning a fight yields a persistent SET piece, banked to
 * the soul (content/sets.ts). Set gear is the deep-run / NG+ reward, so it drops
 * only at elite + boss nodes (an elite some of the time, a boss usually); regular
 * combats never cough one up. UN-SIMMED seed values — owner tunes after.
 */
const SET_PIECE_DROP_CHANCE: Record<DropSource, number> = {
  combat: 0,
  elite: 25,
  boss: 40,
};

/** Roll whether a cleared room yields a set piece. Deterministic. */
export function rollSetPieceDrop(roller: DiceRoller, roomKind: string): boolean {
  const source = dropSourceForRoom(roomKind);
  if (!source) return false;
  return roller.roll('1d100').total <= SET_PIECE_DROP_CHANCE[source];
}

/**
 * Chance (percent) a cleared room also coughs up a healing draught — a separate,
 * rarer channel than gear so found potions supplement the shop sink, never
 * replace it. PROVISIONAL seeds for the economy sim pass.
 */
const POTION_DROP_CHANCE: Record<DropSource, number> = {
  combat: 8,
  elite: 20,
  boss: 30,
};

/**
 * Roll whether a cleared room drops a healing draught, and which rung. The pool
 * is the HEAL side of the consumable ladder legal at the run's current chapter
 * (CONSUMABLE_MIN_CHAPTER — the same gate the shop stock reads), so found
 * potions tier with depth exactly as bought ones do. Within the pool, weights
 * climb linearly toward the deepest rung (rung i of n weighs i+1), so a deep
 * clear usually pays in the potions worth carrying there. Buff consumables
 * (Elixir of Iron, Oil of Sharpness) never drop — they stay a pure gold sink.
 * Returns the consumable id or null. Deterministic.
 */
export function rollPotionDrop(
  roller: DiceRoller,
  roomKind: string,
  chapter = 1,
): string | null {
  const source = dropSourceForRoom(roomKind);
  if (!source) return null;
  if (roller.roll('1d100').total > POTION_DROP_CHANCE[source]) return null;
  const heals = new Set(
    ALL_CONSUMABLES.filter((c) => c.effect === 'heal').map((c) => c.id),
  );
  // consumableIdsForChapter sorts cheapest-first, so index order IS rung order.
  const pool = consumableIdsForChapter(chapter).filter((id) => heals.has(id));
  if (pool.length === 0) return null;
  const total = (pool.length * (pool.length + 1)) / 2;
  let roll = ((roller.roll('1d100').total - 1) % total) + 1;
  for (let i = 0; i < pool.length; i++) {
    if (roll <= i + 1) return pool[i];
    roll -= i + 1;
  }
  return pool[pool.length - 1];
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
 * Roll whether a cleared combat room drops loot, and at what rarity. Rarity is
 * gated by the run's CURRENT `chapter` (maxRolledRarityForChapter) — a fresh run
 * starts at greens and climbs to epic only deep in. A regular mob rolls a weighted
 * spread WITHIN the band; an elite or boss drops AT the band ceiling (the top of
 * the current chapter's allowed rarity — a modest reward, never above it, so no
 * epic falls from a Ch1 elite). Returns the rolled rarity (white→purple) or null
 * for no drop. Deterministic.
 */
export function rollGearDrop(
  roller: DiceRoller,
  roomKind: string,
  chapter = 1,
): GearRarity | null {
  const source = dropSourceForRoom(roomKind);
  if (!source) return null;
  if (roller.roll('1d100').total > DROP_CHANCE[source]) return null;
  const ceiling = maxRolledRarityForChapter(chapter);
  if (source === 'elite' || source === 'boss') return ceiling;
  return capRarity(pickWeightedRarity(roller, combatRarityTable(chapter)), ceiling);
}
