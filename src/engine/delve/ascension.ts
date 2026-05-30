import type { Monster } from '../../schemas/monster';

/**
 * The chain-wide gameplay levers an ascension level pulls. Authored as ABSOLUTE
 * resolved values per level (not deltas), so the engine never has to accumulate
 * — it reads one level's full modifier set. Every field defaults to its neutral
 * value at Ascension 0.
 */
export interface AscensionModifiers {
  /** Multiplier on every enemy's max HP. */
  enemyHpMult: number;
  /** Flat damage added to each enemy attack that lands. */
  enemyDamageBonus: number;
  /** Extra HP multiplier for boss-kind enemies, stacked on top of enemyHpMult. */
  bossHpMult: number;
  /** Multiplier on the gold seeded into the purse at delve start. */
  startingGoldMult: number;
  /** Multiplier on renown earned from the run. Composes MULTIPLICATIVELY with the soul-mark. */
  renownMult: number;
}

export interface AscensionLevel extends AscensionModifiers {
  level: number;
  name: string;
  /** One-line description of the modifier this level introduces — for the selector UI. */
  newModifier: string;
}

/** Highest ascension level the ladder defines. */
export const MAX_ASCENSION = 6;

/**
 * Slay-the-Spire-style ascension ladder over the full six-chapter Godwake
 * chain. The modifiers are global multipliers applied to every enemy at spawn
 * (see applyAscensionToMonster / createCombat), so they ride the natural
 * difficulty ramp into the endgame chapters — Ch5/6 carry the highest base
 * stat blocks, so the same ascension step bites hardest there. Clear the chain
 * at Ascension N → unlock N+1 (see
 * metaStore.unlockNextAscension); a lower level may always be replayed.
 *
 * Each entry holds the FULL resolved modifier set at that level — authored so
 * every step is strictly harder and pays strictly more renown. Consumed by:
 *  - createCombat (enemy HP/damage, boss HP),
 *  - delveStore.startDelve (starting gold),
 *  - delveStore.finishDelve (renown reward + unlock-next).
 * Data-driven on purpose: extend this list, don't scatter conditionals.
 */
export const ASCENSION_LEVELS: AscensionLevel[] = [
  {
    level: 0,
    name: 'Ascension 0',
    newModifier: 'The chain as the world first knew it.',
    enemyHpMult: 1,
    enemyDamageBonus: 0,
    bossHpMult: 1,
    startingGoldMult: 1,
    renownMult: 1,
  },
  {
    level: 1,
    name: 'Ascension 1',
    newModifier: 'Every enemy carries +10% HP.',
    enemyHpMult: 1.1,
    enemyDamageBonus: 0,
    bossHpMult: 1,
    startingGoldMult: 1,
    renownMult: 1.15,
  },
  {
    level: 2,
    name: 'Ascension 2',
    newModifier: 'Enemy blows land for +1 damage.',
    enemyHpMult: 1.1,
    enemyDamageBonus: 1,
    bossHpMult: 1,
    startingGoldMult: 1,
    renownMult: 1.3,
  },
  {
    level: 3,
    name: 'Ascension 3',
    newModifier: 'Chapter bosses gain +25% HP.',
    enemyHpMult: 1.1,
    enemyDamageBonus: 1,
    bossHpMult: 1.25,
    startingGoldMult: 1,
    renownMult: 1.5,
  },
  {
    level: 4,
    name: 'Ascension 4',
    newModifier: 'Enemies +20% HP; you descend with a quarter less gold.',
    enemyHpMult: 1.2,
    enemyDamageBonus: 1,
    bossHpMult: 1.25,
    startingGoldMult: 0.75,
    renownMult: 1.7,
  },
  {
    level: 5,
    name: 'Ascension 5',
    newModifier: 'Enemy blows land for +2 damage.',
    enemyHpMult: 1.2,
    enemyDamageBonus: 2,
    bossHpMult: 1.25,
    startingGoldMult: 0.75,
    renownMult: 1.9,
  },
  {
    level: 6,
    name: 'Ascension 6',
    newModifier: 'Bosses gain +50% HP; you descend with half the gold.',
    enemyHpMult: 1.25,
    enemyDamageBonus: 2,
    bossHpMult: 1.5,
    startingGoldMult: 0.5,
    renownMult: 2.15,
  },
];

/** Coerce any input (legacy save, stale selection) to a valid ladder index. */
export function clampAscension(level: number): number {
  if (!Number.isFinite(level)) return 0;
  return Math.max(0, Math.min(MAX_ASCENSION, Math.floor(level)));
}

export function getAscensionLevel(level: number): AscensionLevel {
  return ASCENSION_LEVELS[clampAscension(level)];
}

/** Scaled max HP for an enemy at the given ascension level. Bosses take the extra boss multiplier. */
export function ascensionMonsterHp(baseHp: number, level: number, isBoss: boolean): number {
  const m = getAscensionLevel(level);
  const mult = m.enemyHpMult * (isBoss ? m.bossHpMult : 1);
  return Math.max(1, Math.round(baseHp * mult));
}

/** Flat damage bonus added to every enemy attack at the given ascension level. */
export function ascensionDamageBonus(level: number): number {
  return getAscensionLevel(level).enemyDamageBonus;
}

/**
 * Return a copy of `def` with its max HP scaled for the given ascension level.
 * Only HP rides on the def — enemy damage is carried on the spawned instance
 * (see createCombat / monsterAttack) because monsterAttack re-derives its
 * damage expression from the canonical content def, not the spawned copy.
 */
export function applyAscensionToMonster(def: Monster, level: number, isBoss: boolean): Monster {
  if (clampAscension(level) === 0) return def;
  return { ...def, maxHp: ascensionMonsterHp(def.maxHp, level, isBoss) };
}
