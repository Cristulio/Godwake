import type { AbilityScores } from './abilities';
import type { ActiveCondition } from './conditions';
import type { SkillName } from './skills';
import type { ItemRef } from '../schemas/item';
import type { ClassId, RaceId } from '../schemas/ids';

/** Action economy state during a combat turn. */
export interface ActionEconomy {
  actionUsed: boolean;
  bonusActionUsed: boolean;
  reactionUsed: boolean;
  movementRemaining: number;
}

export interface HitPoints {
  current: number;
  max: number;
  temp: number;
}

export interface HitDice {
  current: number;
  max: number;
  die: 6 | 8 | 10 | 12;
}

/** What's equipped on the body right now (refs into inventory). */
export interface EquipmentSlots {
  mainHand: ItemRef | null;
  offHand: ItemRef | null;
  armor: ItemRef | null;
}

/** Per-class run-state resources (Second Wind charges, Action Surge uses, rage, etc.). */
export interface ClassResources {
  /** Fighter: Second Wind (1 use per short rest). */
  secondWindAvailable?: boolean;
  /** Fighter: Action Surge (1 use at lv2, 2 at lv17). */
  actionSurgeRemaining?: number;
}

/**
 * A character in the game world. Identity (race/class/abilities) is the "soul" —
 * stable across reincarnations. Body (HP, conditions, inventory) is per-life.
 */
export interface Character {
  id: string;
  name: string;

  // Identity (the "soul" — stable through reincarnations)
  raceId: RaceId;
  classId: ClassId;
  subclassId: string | null;
  /** Standard array values assigned at character creation. Never changes. */
  baseAbilityScores: AbilityScores;

  // Progression
  level: number;
  xp: number;

  // Skills picked at character creation
  skillProficiencies: SkillName[];
  expertSkills: SkillName[];

  // Body (per-incarnation)
  hp: HitPoints;
  hitDice: HitDice;
  conditions: ActiveCondition[];

  // Gear
  inventory: ItemRef[];
  equipped: EquipmentSlots;

  // Resources (per-class)
  resources: ClassResources;

  // Combat ephemera (cleared at end of combat)
  actionEconomy: ActionEconomy;

  // Run-state additions
  quirks: string[];
  blessings: string[];
  /**
   * Per-delve mutable budgets (Tymora's Eye reroll counter, etc.). Optional so
   * legacy saves rehydrate without migration; treat undefined fields as 0.
   * Initialized in startDelve, mutated in combat, dropped at delve end.
   */
  delveBudgets?: {
    quirkRerollMissesRemaining?: number;
    /**
     * Stabilise charges already spent this delve. Available charges =
     * 1 (free) + extraStabiliseCharges (from blessings) - stabilisesUsed.
     * Recomputed on every applyDamage call so mid-delve Ilmater pickups count.
     */
    stabilisesUsed?: number;
  };

  // Meta
  goldInBank: number;
  goldInPocket: number;
  renown: number;

  /**
   * Permanent stat bonuses baked in from Druid Grove upgrades. Optional so
   * legacy saves rehydrate without migration; treat undefined as 0.
   */
  permanentAcBonus?: number;
  permanentAttackBonus?: number;
  permanentInitBonus?: number;
  /**
   * Extra attunement slots above the default. Bumped by Sage's Pact. The cap
   * lives in `attunementSlotsCap()`; this field is only the additive bonus so
   * legacy saves with `undefined` rehydrate to the default cap.
   */
  attunementSlotsBonus?: number;
}
