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
  /**
   * Multiplier on the renown PRICE of every Grove upgrade. Climbs with the ladder
   * so a higher standing soul pays more to deepen the Wellspring — the cost side
   * of the same coin as `renownMult` (you earn more, the Grove asks more). Applied
   * in content/upgrades.groveUpgradeCost; 1 at Ascension 0.
   */
  upgradeCostMult: number;
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
 * Slay-the-Spire-style ascension ladder over the full fourteen-chapter Godwake
 * chain. The modifiers are global multipliers applied to every enemy at spawn
 * (see applyAscensionToMonster / createCombat), so they ride the natural
 * difficulty ramp into the endgame chapters — the Throne-of-Bhaal chapters carry
 * the highest base stat blocks, so the same ascension step bites hardest there.
 * Clear the chain
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
    upgradeCostMult: 1,
  },
  {
    level: 1,
    name: 'Ascension 1',
    newModifier: 'Every enemy carries +15% HP.',
    enemyHpMult: 1.15,
    enemyDamageBonus: 0,
    bossHpMult: 1,
    startingGoldMult: 1,
    renownMult: 1.25,
    upgradeCostMult: 1.2,
  },
  {
    level: 2,
    name: 'Ascension 2',
    newModifier: 'Enemy blows land for +1 damage.',
    enemyHpMult: 1.15,
    enemyDamageBonus: 1,
    bossHpMult: 1,
    startingGoldMult: 1,
    renownMult: 1.45,
    upgradeCostMult: 1.4,
  },
  {
    level: 3,
    name: 'Ascension 3',
    newModifier: 'Chapter bosses gain +25% HP.',
    enemyHpMult: 1.15,
    enemyDamageBonus: 1,
    bossHpMult: 1.25,
    startingGoldMult: 1,
    renownMult: 1.65,
    upgradeCostMult: 1.6,
  },
  {
    level: 4,
    name: 'Ascension 4',
    newModifier: 'Enemies +25% HP; you descend with a quarter less gold.',
    enemyHpMult: 1.25,
    enemyDamageBonus: 1,
    bossHpMult: 1.25,
    startingGoldMult: 0.75,
    renownMult: 1.9,
    upgradeCostMult: 1.85,
  },
  {
    level: 5,
    name: 'Ascension 5',
    newModifier: 'Enemy blows land for +2 damage.',
    enemyHpMult: 1.25,
    enemyDamageBonus: 2,
    bossHpMult: 1.25,
    startingGoldMult: 0.75,
    renownMult: 2.15,
    upgradeCostMult: 2.1,
  },
  {
    level: 6,
    name: 'Ascension 6',
    newModifier: 'Enemies +30% HP; bosses gain +50% HP; you descend with half the gold.',
    enemyHpMult: 1.3,
    enemyDamageBonus: 2,
    bossHpMult: 1.5,
    startingGoldMult: 0.5,
    renownMult: 2.45,
    upgradeCostMult: 2.4,
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

/**
 * Hard cap on the COMBINED boss HP multiplier (enemyHpMult × bossHpMult). At the
 * top of the ladder the two compound to 1.95× (Asc6: 1.30 × 1.50), which on an
 * already-slow boss — the Ch8 Ashen Marshal is a non-threatening 15-round slog at
 * Asc0 (win min-HP 82%) — balloons the fight past the 30-round timeout into a
 * STALL rather than a kill (the boss-gauntlet read 45% time-outs there at Asc6).
 * Capping the product keeps the apex lethal-but-finite while staying strictly
 * above the Asc5 boss multiplier (1.25 × 1.25 = 1.5625×), so the ladder stays
 * monotone-harder; only the sponge artifact is removed. Non-boss HP and every
 * damage knob are untouched. Magnitude pending the validation sim pass.
 */
export const MAX_BOSS_HP_MULT = 1.7;

/** Scaled max HP for an enemy at the given ascension level. Bosses take the extra boss multiplier, capped at MAX_BOSS_HP_MULT. */
export function ascensionMonsterHp(baseHp: number, level: number, isBoss: boolean): number {
  const m = getAscensionLevel(level);
  const rawMult = m.enemyHpMult * (isBoss ? m.bossHpMult : 1);
  const mult = isBoss ? Math.min(rawMult, MAX_BOSS_HP_MULT) : rawMult;
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

/**
 * Content-gating thresholds: the ascension level at which each layer of
 * ascension-only content switches on. Authored here as the single source of
 * truth so the content lanes ask via the predicate helpers below rather than
 * scattering `level >= n` literals across the codebase.
 */
export const ELITE_VARIANTS_FROM = 2;
export const BOSS_EXTRA_PHASE_FROM = 3;
export const DUNGEON_TWISTS_FROM = 4;
export const ASCENDANT_LOOT_FROM = 3;
/**
 * The whole ascension-exclusive loot layer (class signature sets + the new global
 * sets) switches on the moment a soul leaves the first chain behind. A first /
 * normal playthrough (Ascension 0) never rolls or is offered any of it; every
 * New Game+ run can. The apex `ascendant` tier sits ABOVE this, at
 * ASCENDANT_LOOT_FROM.
 */
export const ASCENSION_EXCLUSIVE_LOOT_FROM = 1;

/** Whether ascension-only elite variants enter the encounter pool at this level. */
export function ascensionEliteVariants(level: number): boolean {
  return clampAscension(level) >= ELITE_VARIANTS_FROM;
}

/** Whether chapter bosses gain an extra mechanic/phase at this level. */
export function ascensionBossExtraPhase(level: number): boolean {
  return clampAscension(level) >= BOSS_EXTRA_PHASE_FROM;
}

/** Whether per-room twists/hazards are active at this level. */
export function ascensionDungeonTwists(level: number): boolean {
  return clampAscension(level) >= DUNGEON_TWISTS_FROM;
}

/** Whether the "ascendant" legendary tier is obtainable at this level. */
export function ascensionAscendantLoot(level: number): boolean {
  return clampAscension(level) >= ASCENDANT_LOOT_FROM;
}

/**
 * Whether the ascension-EXCLUSIVE loot layer (signature class sets + new global
 * sets) is obtainable at this level. False on a first/normal run (Ascension 0),
 * true on every New Game+ run.
 */
export function ascensionExclusiveLoot(level: number): boolean {
  return clampAscension(level) >= ASCENSION_EXCLUSIVE_LOOT_FROM;
}

/** Renown-price multiplier on Grove upgrades at the given ascension standing. */
export function ascensionUpgradeCostMult(level: number): number {
  return getAscensionLevel(level).upgradeCostMult;
}
