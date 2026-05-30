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
 * Rarity weights per source — better fights skew richer. Weights need not sum
 * to 100; they're normalised at roll time.
 */
const RARITY_WEIGHTS: Record<DropSource, Array<[GearRarity, number]>> = {
  combat: [
    ['green', 72],
    ['blue', 24],
    ['purple', 4],
  ],
  elite: [
    ['green', 45],
    ['blue', 42],
    ['purple', 13],
  ],
  boss: [
    ['green', 20],
    ['blue', 50],
    ['purple', 30],
  ],
};

/**
 * Per-source chance (percent) a cleared room ALSO yields a legendary relic. Very
 * low ("from time to time") and climbing by source. A legendary that drops is
 * BANKED to the persistent collection (it doesn't roll like normal gear and
 * doesn't equip mid-run) — see delveStore.resolveRoomVictory.
 */
const LEGENDARY_DROP_CHANCE: Record<DropSource, number> = {
  combat: 1,
  elite: 3,
  boss: 6,
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
 * Roll whether a cleared combat room drops loot, and at what rarity. Returns the
 * rolled rarity (green/blue/purple) or null for no drop. Deterministic.
 */
export function rollGearDrop(roller: DiceRoller, roomKind: string): GearRarity | null {
  const source = dropSourceForRoom(roomKind);
  if (!source) return null;
  if (roller.roll('1d100').total > DROP_CHANCE[source]) return null;
  return pickWeightedRarity(roller, RARITY_WEIGHTS[source]);
}
