import type { AbilityScores } from './abilities';
import type { ActiveCondition } from './conditions';
import type { SkillName } from './skills';
import type { ItemRef, AffixModifiers } from '../schemas/item';
import type { ClassId, RaceId } from '../schemas/ids';

/** Action economy state during a combat turn. */
export interface ActionEconomy {
  actionUsed: boolean;
  bonusActionUsed: boolean;
  reactionUsed: boolean;
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

/**
 * What's equipped on the body right now (refs into inventory). The three combat
 * slots (main hand / off hand / body) are always present; Wave 2 adds accessory
 * slots — helm, amulet, two rings, belt, boots — that carry rolled affixes.
 * The accessory slots are optional so legacy saves rehydrate without migration
 * (an absent slot reads the same as an empty one).
 */
export interface EquipmentSlots {
  mainHand: ItemRef | null;
  offHand: ItemRef | null;
  armor: ItemRef | null;
  helm?: ItemRef | null;
  amulet?: ItemRef | null;
  ring1?: ItemRef | null;
  ring2?: ItemRef | null;
  belt?: ItemRef | null;
  boots?: ItemRef | null;
}

/** A castable spell-slot tier. Cantrips (level 0) cost no slot. */
export type SpellSlotLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/** Wizard spell slots by level. Missing entries treated as 0. */
export interface SpellSlots {
  1?: number;
  2?: number;
  3?: number;
  4?: number;
  5?: number;
  6?: number;
  7?: number;
  8?: number;
  9?: number;
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
  /**
   * Martial resource pool (Fighter Resolve / Barbarian Fury / Ranger Focus).
   * The shared per-fight currency these three classes spend on their OFFENSE /
   * DEFENSE / DISRUPT abilities. Refreshes to {@link MARTIAL_POOL_MAX} at the
   * start of every encounter (createCombat); at most one point's-worth is spent
   * per turn (see `martialSpentThisTurn`).
   */
  martialPointsRemaining?: number;
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
  /**
   * Wizard: whether Shield auto-fires as a reaction when it would flip a hit to
   * a miss. Default ON (undefined = true). Player can toggle off in the HUD to
   * preserve slots — the toggle persists in character resources across combats.
   */
  shieldAutoFire?: boolean;
  /** Wizard: Misty Step bonus-action displacement active (+2 AC). Cleared at start of player's next turn. */
  mistyStepActive?: boolean;
  /** Wizard: Blur rounds left. While > 0, attackers roll against the player at disadvantage. Decrements at the start of each player turn; reset at combat start. */
  blurRoundsRemaining?: number;
  /** Wizard: Mirror Image duplicates left. Each absorbs one blow that would otherwise hit the player; cleared at combat start. */
  mirrorImages?: number;
  /**
   * Wizard: rounds the Apotheosis transformation holds (9th-level capstone).
   * While > 0 the caster is ascendant — every attack (weapon and spell) bites
   * for {@link APOTHEOSIS_BONUS_DAMAGE} more and AC rises by 2. Decrements at
   * the start of each player turn; reset to 0 at combat start.
   */
  ascendantRoundsRemaining?: number;
  /**
   * Barbarian: rounds the current Rage holds. While > 0 the barbarian is
   * raging (physical-damage resistance + bonus melee damage). Decrements at the
   * start of each player turn; reset to 0 at combat start.
   */
  rageRoundsRemaining?: number;
  /**
   * Barbarian: Rage charges left to spend before a rest. Entering a Rage costs
   * one (L20 capstone rages free — see `rageChargesMax`/`isRageUnlimited`). The
   * pool is rationed across the delve: it does NOT refill per fight (createCombat
   * leaves it alone), only at a short/long rest. Seeded full at L1 by
   * `classStartingResources`. Optional so legacy saves rehydrate without
   * migration; an absent value reads as 0 until the first rest tops it up.
   */
  rageChargesRemaining?: number;
  /**
   * Druid: rounds the current Wild Shape holds. While > 0 the druid wears a
   * beast form — it fights with a natural claw/bite profile and carries the
   * beast's vitality as temp HP. Decrements at the start of each player turn;
   * reverts when it hits 0 or the beast vitality (temp HP) is spent. Reset to 0
   * at combat start.
   */
  wildShapeRoundsRemaining?: number;
  /**
   * Druid: Wild Shape uses left this combat. 1 base, 2 for Circle of the Moon.
   * Refreshes at the start of every encounter (createCombat), like the Fighter's
   * Second Wind and the Rogue's Cunning Action.
   */
  wildShapeUsesRemaining?: number;
  /**
   * Druid (Regrowth): player turns of healing left, and the HP knit at the
   * start of each. The cast heals once immediately, then ticks for
   * {@link regrowthTurnsRemaining} more player-turn-starts (turn.ts). The
   * Druid's only sustain. Both reset to 0 at combat start (createCombat).
   */
  regrowthTurnsRemaining?: number;
  regrowthHealPerTurn?: number;
  /**
   * Potion of Vitality (regen draught): player turns of healing left, and the HP
   * knit at the start of each. The drink heals once immediately (the potion's
   * `healDice`), then ticks for {@link vitalityRegenTurnsRemaining} more
   * player-turn-starts (turn.ts) for {@link vitalityRegenHealPerTurn} each. Runs
   * independently of the Druid's Regrowth and the Mending affix — all three can
   * be live at once. Suppressed (but not consumed) while raging, like Mending.
   * Both reset to 0 at combat start (createCombat), for every class.
   */
  vitalityRegenTurnsRemaining?: number;
  vitalityRegenHealPerTurn?: number;
  /**
   * Druid (Spirit Beast): player turns the summoned companion keeps mauling,
   * and the damage it deals to a live foe at the start of each. The cast strikes
   * once immediately, then ticks for {@link spiritBeastTurnsRemaining} more
   * player-turn-starts (turn.ts). A persistent-effect companion — no ally
   * combatant entity. Both reset to 0 at combat start (createCombat).
   */
  spiritBeastTurnsRemaining?: number;
  spiritBeastDamagePerTurn?: number;
  /**
   * Monk: Ki points left. The whole monk economy — Flurry of Blows, Patient
   * Defense, and Stunning Strike each spend from this pool. Refreshes to its max
   * (monkKiMax — the monk's level, +2 at the L20 capstone) at the start of every
   * encounter (createCombat), like the Fighter's Second Wind.
   */
  kiPointsRemaining?: number;
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
  /**
   * Additive ability-score gains from in-run ASIs (level-up picks). Run-scoped:
   * cleared by startDelve and reincarnateSoul so they never compound across
   * lives. effectiveAbilityScores folds these on top of baseAbilityScores so all
   * downstream reads (attack, AC, saves, HP) pick them up within the run.
   * Optional so old saves rehydrate without migration.
   */
  runAsiGains?: Partial<AbilityScores>;

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
   * Camp Boon ids active for the current delve. Each Camp room offers a
   * Hades-style "Mirror of Night" pick of 3 small permanent buffs scoped to
   * the run. Mirrored from `delve.campBoons` for fast derived reads; cleared
   * on delve end alongside blessings.
   */
  campBoons?: string[];
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
   * legacy saves rehydrate without migration; treat any undefined key as 0.
   * Consolidated from 11 top-level `permanentXxxBonus` fields in the v3
   * save migration.
   */
  permanentBonuses?: {
    ac?: number;
    attack?: number;
    damage?: number;
    /** Crit-range widening (Killer's Eye): default 20-only becomes (20-N)-20. */
    critRange?: number;
    hp?: number;
    spellAttack?: number;
    spellDc?: number;
    spellDamage?: number;
    /** Rogue Shadowstep: +N extra Cunning Action uses per combat. */
    cunningAction?: number;
    /** Rogue Knife in the Dark: +N bonus Sneak Attack dice. */
    sneakAttackDice?: number;
    /** Monk Brimming Well: +N max Ki points per combat (folded into monkKiMax). */
    kiPoints?: number;
    /** Druid Primal Reservoir: +N Wild Shape uses per combat (folded into wildShapeUsesMax). */
    wildShapeUses?: number;
    /** Caster Wellspring of Mysteries / Deep Roots: +N extra 1st-level spell slot (folded into wizardSpellSlots + delve-start seed). */
    bonusSpellSlotsL1?: number;
    /** Coin in the Pocket: seed gold at delve start. Read by delveStore.startDelve. */
    startingGold?: number;
    /** Coin in the Pocket: gold credited each time a chapter boss falls. Read by creditChapterClearGold (stacks with Quartermaster's Stipend's `chapterClearGoldBonus`). */
    chapterClearGold?: number;
  };
  /**
   * Effect payloads of the player's EQUIPPED legendary relics + completed-set
   * bonuses (hub-managed, cross-delve persistent gear). Pure effects — no AC, no
   * weapon damage. Baked on by `applyRelicLoadout` and carried across the
   * wheel; folded into the affix pipeline by `characterAffixMods`. Optional;
   * undefined = no relics equipped.
   */
  legendaryEffects?: AffixModifiers[];
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
   * +1). Stacks with `permanentBonuses.attack`. Cleared in `finishDelve`.
   */
  delveAttackBonus?: number;
  /**
   * Per-delve spell-attack bonus granted by the wizard-flavored camp choice
   * "Whet the Mind". Mirrors `delveAttackBonus` for spell attack rolls so
   * Sharpen-the-Blade has a class-appropriate analogue for casters. Cleared
   * in `finishDelve`.
   */
  delveSpellAttackBonus?: number;
  /**
   * One-shot advantage on the player's next attack roll. Set true by Rogue's
   * Cunning Action: Hide (and cleared when that attack resolves). Optional so
   * legacy saves rehydrate without migration.
   */
  nextAttackAdvantage?: boolean;
  /**
   * One-shot advantage on the player's next saving throw. Set by Rogue's
   * Cunning Action: Steel Yourself and as a side effect of Wizard's Misty
   * Step. Consumed by the next save roll regardless of outcome. Persists
   * across turns until used; cleared on combat start.
   */
  nextSaveAdvantage?: boolean;
  /**
   * One-shot +N bonus added to the player's next attack roll. Reserved for
   * future buffs that need flat-to-hit; Dash no longer uses it. Consumed on
   * the actual attack roll, hit or miss. Stacks with nextAttackAdvantage.
   */
  nextAttackBonus?: number;
  /**
   * Barbarian Reckless Attack stance. Set true when the barbarian declares a
   * reckless turn: their melee attacks roll with advantage, and attacks against
   * them roll with advantage until the start of their next turn (when it is
   * cleared in `endTurn`). Cleared on combat start.
   */
  recklessActive?: boolean;
  /**
   * Martial OFFENSE stance (Fighter/Barbarian/Ranger). Set true when a martial
   * spends from the pool on a heavy/aimed strike: this turn's weapon strikes
   * land for {@link martialOffenseDamage} more (and the Barbarian's swing also
   * cleaves into a second foe). Free to declare; cleared at the start of the
   * next turn (in `endTurn`) and on combat start.
   */
  martialOffenseActive?: boolean;
  /**
   * Martial DISRUPT stance (Fighter/Barbarian/Ranger). Set true when a martial
   * spends from the pool to arm a staggering strike: the next weapon hit fells
   * the target (it loses its next turn), resolved in playerAttack. The point is
   * already spent on declaration; cleared on the connecting hit, at the start of
   * the next turn, and on combat start.
   */
  martialDisruptActive?: boolean;
  /**
   * True once a martial point has been spent this turn (OFFENSE / DEFENSE /
   * DISRUPT). Caps the pool to one spend per turn so it is paced across the
   * fight rather than dumped at once. Cleared at the start of the player's next
   * turn and on combat start.
   */
  martialSpentThisTurn?: boolean;
  /**
   * Monk Flurry of Blows. Extra unarmed strikes funded by Ki and spent after the
   * Attack action: while > 0 the monk can keep striking even with the action
   * spent (each swing decrements it in playerAttack). 2 base, 3 at L9, 4 at the
   * L20 capstone. Cleared at turn end and on combat start.
   */
  flurryStrikesRemaining?: number;
  /**
   * Monk Patient Defense stance. Set when the monk spends Ki on a flowing guard:
   * attacks against the monk roll at disadvantage until the start of its next
   * turn (read in monsterAttack), when it is cleared in `endTurn`. Cleared on
   * combat start.
   */
  patientDefenseActive?: boolean;
  /**
   * Monk Stunning Strike stance. Set when the monk arms a staggering blow with
   * Ki: the next unarmed hit forces a CON save or the target is staggered (loses
   * its next turn) — resolved and cleared on the connecting hit in playerAttack.
   * A clean miss leaves it armed. Cleared at the start of the next turn and on
   * combat start.
   */
  stunningStrikeActive?: boolean;
  /**
   * One-shot extra attack this turn, funded by Rogue's Cunning Action: Dash.
   * When set, the player can swing again even after the Action is spent. The
   * Sneak Attack once-per-turn gate (`sneakAttackUsedThisTurn`) still applies,
   * so the bonus swing does not double Sneak. Cleared on use or at turn end.
   */
  bonusAttackAvailable?: boolean;
  /**
   * One-shot damage reduction applied to the next incoming hit on the player.
   * Set by Rogue's Cunning Action: Disengage (twisting out of the way). Read
   * and cleared inside applyDamage. Subtracts from raw damage before temp HP
   * absorbs the rest; can reduce a hit to 0 but not below.
   */
  incomingDamageReduction?: number;
  /**
   * Per-combat poison immunity. Set true when the player drinks Antitoxin;
   * cleared in combat resolution (player-victory or player-defeat). Stacks
   * with the Iron Stomach quirk's permanent immunity — either is enough.
   */
  poisonImmuneEncounter?: boolean;
  /**
   * Tactical edge readied against a chapter boss this delve, keyed by boss
   * monster def id. `weak-spot` is the free minor opener advantage; `battle-plan`
   * is the paid gird + brace. Set by the pre-boss intel room, consumed at the
   * boss fight in `createCombat`. Cleared at delve end.
   */
  bossIntel?: Record<string, 'weak-spot' | 'battle-plan'>;
  /**
   * Bosses the player chose to walk past without intel. Each entry grants a
   * +10% gold bonus on that specific boss's drop ("the gods reward the bold").
   * Cleared at delve end.
   */
  boldApproachBosses?: string[];
}
