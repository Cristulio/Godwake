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

/** Wizard spell slots by level. Missing entries treated as 0. */
export interface SpellSlots {
  1?: number;
  2?: number;
  3?: number;
  4?: number;
}

/** Per-class run-state resources (Second Wind charges, Action Surge uses, rage, etc.). */
export interface ClassResources {
  /** Fighter: Second Wind (1 use per short rest). */
  secondWindAvailable?: boolean;
  /**
   * Fighter: extra Second Wind charges granted by the Wellspring Vigil
   * Grove upgrade. Initialized at delve start; consumed BEFORE the boolean
   * `secondWindAvailable` flips so rest-refreshes still get the L1 charge.
   * Not refreshed by short/long rest — these are per-delve charges.
   */
  secondWindBonusRemaining?: number;
  /** Fighter: Action Surge (1 use at lv2, 2 at lv17). */
  actionSurgeRemaining?: number;
  /** Rogue: Sneak Attack already fired this turn (true once spent, reset on turn change). */
  sneakAttackUsedThisTurn?: boolean;
  /** Rogue: Cunning Action uses left this combat. 1 base, 2 for Thief subclass. Refreshes on encounter start + short/long rest. */
  cunningActionUsesRemaining?: number;
  /** Wizard: current spell slots remaining by level. Refreshes on long rest. */
  spellSlots?: SpellSlots;
  /** Wizard: spell ids the wizard has prepared/known and can cast. Cantrips included; cantrips don't consume a slot. */
  knownSpells?: string[];
  /** Wizard: Mage Armor active this combat (+3 AC). Clears at combat end. */
  mageArmorActive?: boolean;
  /** Wizard: Shield reaction-buff active for the next monster turn (+5 AC). Cleared at start of player's next turn. */
  shieldActive?: boolean;
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

  // Progression — run-scoped. Resets to 1/0 in gameStore.startDelve;
  // wiped back to 1/0 in finishDelve. Persists through combat ticks but
  // not between delves.
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

  // Currencies. goldInPocket is RUN-SCOPED (resets at delve start/end);
  // renown is the only currency that survives the wheel.
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
  /** Grove upgrade: +N damage on every weapon hit. */
  permanentDamageBonus?: number;
  /** Grove upgrade: crit range widens by N (so default 20-only becomes (20-N)-20). */
  permanentCritRangeBonus?: number;
  /** Grove upgrade: +N damage on the first attack of each combat. */
  permanentFirstAttackDamage?: number;
  /** Grove upgrade: +N damage against wounded targets (HP at half or less). */
  permanentWoundedTargetDamage?: number;
  /** Grove upgrade: +N damage on critical hits (added after dice doubling). */
  permanentCritDamageBonus?: number;
  /** Grove upgrade: extra fraction of renown per bane-quirk on top of soul-mark. */
  permanentRenownBonusPerBane?: number;
  /** Grove upgrade: unlocks the on-reincarnation quirk picker. */
  wheelturnerUnlocked?: boolean;
  /**
   * Grove upgrade: extra stabilise charges per delve (Hardier Soul). Stacks
   * with Ilmater's Patience (blessing). Reset at delve start.
   */
  delveStabiliseBonus?: number;
  /**
   * Grove upgrade: extra blessing options offered at each shrine room.
   * Set at delve start, read by ShrineRoom.
   */
  shrineOptionBonus?: number;
  /**
   * Grove upgrade: gold awarded each time the player enters a shrine room.
   * Set at delve start, paid out by ShrineRoom on mount.
   */
  shrineTitheGold?: number;
  /**
   * Grove upgrade: gold awarded each time a chapter boss falls (Quartermaster's
   * Stipend). Set at delve start, paid out by the boss-clear branch in
   * DelveScreen.
   */
  chapterClearGoldBonus?: number;
  /**
   * Per-delve attack bonus granted by camp choices (Sharpen the Blade adds
   * +1). Stacks with `permanentAttackBonus`. Cleared in `finishDelve`.
   */
  delveAttackBonus?: number;
  /**
   * Per-delve initiative bonus granted by event choices (e.g. picking up
   * the bone on the stake). Stacks with `permanentInitBonus`. Cleared in
   * `finishDelve` / `failDelve` / `abandonDelve`.
   */
  delveInitBonus?: number;
  /**
   * One-shot advantage on the player's next attack roll. Set true by Rogue's
   * Cunning Action: Hide (and cleared when that attack resolves). Optional so
   * legacy saves rehydrate without migration.
   */
  nextAttackAdvantage?: boolean;
  /**
   * Per-combat poison immunity. Set true when the player drinks Antitoxin;
   * cleared in combat resolution (player-victory or player-defeat). Stacks
   * with the Iron Stomach quirk's permanent immunity — either is enough.
   */
  poisonImmuneEncounter?: boolean;
}
