import type { ActiveCondition, ConditionName } from './conditions';
import type { ActionEconomy, HitPoints } from './character';
import type { MonsterAction } from '../schemas/monster';

// === enemy-telegraph === Slay-the-Spire-style enemy intent. Each live monster
// carries the action it will take on its NEXT turn, selected ahead of the
// player's turn and resolved verbatim on the monster's turn so the telegraph
// never lies. Owned by feat/enemy-telegraph; engine selection lives in
// engine/combat/attack/monsterIntent.ts, display in components/combat.

/** Display category for the intent badge. */
export type MonsterIntentKind =
  | 'attack' // single weapon swing — carries expected damage
  | 'multiattack' // flurry of swings — carries per-hit damage + hit count
  | 'drain' // life-draining attack — carries expected damage
  | 'paralyze' // save-or-be-held
  | 'debuff' // inflict a condition (carries the condition name)
  | 'summon' // call reinforcements onto the field
  | 'sustain-heal' // heal itself or a wounded ally
  | 'ward'; // gird itself or an ally with temporary HP

export interface MonsterIntent {
  /** What the badge shows. */
  kind: MonsterIntentKind;
  /**
   * Addresses the def action this intent resolves to (kind + name uniquely
   * identify it within a monster's action list). The engine re-derives the
   * action from the canonical content def at resolve time — never a stored
   * copy — so the resolved action is guaranteed to equal the telegraph.
   */
  actionKind: MonsterAction['kind'];
  actionName: string;
  /**
   * Damage RANGE for attack / multiattack / drain intents — min/max of the
   * action's dice plus flat mods (ascension + rage), pre-resistance. For a
   * multiattack this is the per-hit range (multiply by `hits` for the total).
   */
  damageMin?: number;
  damageMax?: number;
  /** Number of strikes for a multiattack intent. */
  hits?: number;
  /** Condition inflicted, for debuff / paralyze intents. */
  condition?: ConditionName;
}
// === end enemy-telegraph ===

export interface MonsterInstance {
  /** Unique instance id within the combat encounter. */
  id: string;
  /** Monster definition id — looks up the stat block. */
  defId: string;
  /** Display name for the combat log ("Goblin A", "Goblin B" when duplicated). */
  displayName: string;
  hp: HitPoints;
  ac: number;
  /** True once the player has attacked this monster at least once. Reveals AC in the UI. */
  acRevealed: boolean;
  conditions: ActiveCondition[];
  actionEconomy: ActionEconomy;
  /** Set true the first time a 'battle-rage' boss drops to/below half HP. Sticks for the rest of combat. */
  bossRageActive?: boolean;
  /**
   * Ascension extra-phase (Asc >= 3): armed at spawn on the primary boss. The
   * first time the boss takes its turn while bloodied it spends one immediate
   * extra action (a second wind), then this clears so it fires once per fight.
   */
  bossExtraPhaseArmed?: boolean;
  /** Flat damage added to each of this monster's landed attacks (ascension scaling). Set at spawn. */
  bonusDamage?: number;
  /**
   * Per-action cadence bookkeeping for summon / sustain specials, keyed by the
   * action's name. `uses` enforces `once`; `lastRound` enforces `cooldownRounds`.
   * Optional so legacy saves rehydrate (treated as "never used").
   */
  actionState?: Record<string, { uses: number; lastRound: number }>;
  /**
   * enemy-telegraph: the action this monster will take on its next turn,
   * selected ahead of the player's turn. Absent when freshly summoned or
   * rehydrated from a legacy save (the engine re-picks on the fly), and cleared
   * while the monster is paralyzed (it has no honest move to telegraph).
   */
  intent?: MonsterIntent;
  /** Bleed DOT: damage dealt at the start of each player turn for bleedTurnsRemaining turns. */
  bleedDamagePerTurn?: number;
  bleedTurnsRemaining?: number;
  /** Burn DOT (Fireball ignite): fire damage at the start of each player turn. */
  burnDamagePerTurn?: number;
  burnTurnsRemaining?: number;
  /**
   * Legendary-resistance pool: the number of times this monster auto-succeeds a
   * player-applied control save (Hold Person) before the condition can land.
   * Stamped on the primary monster of a boss/elite encounter at spawn so a lone
   * boss can't be chain-paralyze-locked. Absent on rank-and-file monsters.
   */
  legendaryResistances?: number;
  /**
   * Staggered: turns this monster will lose to a Barbarian's Knockdown. Each of
   * its turns decrements the count and is skipped while > 0. Absent on monsters
   * that haven't been knocked down.
   */
  staggeredTurns?: number;
}

export interface PlayerCombatant {
  kind: 'player';
  id: string;
  characterId: string;
}

export interface MonsterCombatant {
  kind: 'monster';
  id: string;
  instance: MonsterInstance;
}

export type Combatant = PlayerCombatant | MonsterCombatant;

export type CombatStatus = 'active' | 'player-victory' | 'player-defeat';

export interface CombatLogEntry {
  id: number;
  text: string;
  /** Bucketing for styling: 'roll', 'damage', 'system', 'narration'. */
  kind?: 'roll' | 'damage' | 'system' | 'narration';
}

export interface AttackEvent {
  /** Monotonic id — increments per attack so subscribers can detect new events. */
  id: number;
  attackerName: string;
  targetName: string;
  attackerKind: 'player' | 'monster';
  /** Combatant id of the attacker. Optional so legacy rehydrates work. Used by the postmortem to look up the killer's monster def. */
  attackerId?: string;
  /** Monster def id of the attacker, when the attacker is a monster. Lets the postmortem resolve the killer's codex entry directly. */
  attackerDefId?: string;
  weaponName: string;
  attackBonus: number;
  natural: number;
  total: number;
  targetAC: number;
  hit: boolean;
  crit: boolean;
  /** Damage actually applied to the target after immunities/resistances. Optional so legacy rehydrates work. */
  damageDealt?: number;
  /** Damage type, when applicable. */
  damageType?: string;
}

export interface SaveEvent {
  /** Monotonic id — increments per save roll. */
  id: number;
  /** Display name of the effect/source (e.g. "Hold Person"). */
  sourceName: string;
  /** Display name of the caster (e.g. "Magistrate"). */
  casterName?: string;
  ability: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
  dc: number;
  /** Player's ability modifier on the save. */
  mod: number;
  /** d20 face. */
  natural: number;
  /** Final total (d20 + mod). */
  total: number;
  success: boolean;
  advantage: boolean;
}

/**
 * Canonical combat-VFX kind union — every bespoke battlefield effect the
 * `SpellEffectLayer` can render. Despite the legacy `SpellEffect*` naming this
 * is no longer spell-only: it also carries weapon swings and class-ability
 * signatures. `feat/vfx-combat` owns this union; sibling VFX lanes append at
 * the extension point at the bottom.
 */
export type SpellEffectKind =
  // Spell casts (the original VFX bus).
  | 'magic-missile'
  | 'fire-bolt'
  | 'burning-hands'
  | 'shield'
  | 'mage-armor'
  | 'hold-person'
  | 'misty-step'
  | 'fireball'
  | 'lightning-bolt'
  // Weapon attacks (feat/vfx-combat).
  | 'slash'
  | 'pierce'
  | 'bludgeon'
  | 'arrow'
  // Class-ability signatures (feat/vfx-combat).
  | 'rage'
  | 'reckless'
  | 'hunters-mark'
  | 'colossus'
  | 'cunning-action'
  | 'second-wind'
  | 'action-surge'
  // === enemy-vfx (feat/vfx-enemies) === bespoke effects for the monster toolkit
  // (#164). Each maps to a component in SpellEffect.tsx + keyframes in the
  // enemy-vfx block of index.css. Emitted from monsterAttack.ts.
  | 'enemy-summon' // rift portal / spawn-in poof at the new add's slot
  | 'debuff-poison' // green drip cloud over the player
  | 'debuff-frighten' // cold shadow looming + recoil
  | 'debuff-blind' // ink black-out splatter
  | 'debuff-weaken' // grey sapping motes drawn off the player
  | 'debuff-restrain' // sticky web strands snapping taut
  | 'sustain-heal' // green up-glow on the mending monster
  | 'sustain-ward' // amber protective bubble over the warded monster
  | 'sustain-drain' // life-drain tether pulling motes target→attacker
  | 'multiattack-flurry' // flurry of fast strike streaks on the player
  | 'enemy-frenzy'; // red battle-rage aura flash on the monster

/** Alias spelling out that the union is the canonical combat-VFX kind set. */
export type CombatVfxKind = SpellEffectKind;

export interface SpellEffectEvent {
  /** Monotonic id — increments per emit so the SpellEffectLayer mounts a fresh component. */
  id: number;
  kind: SpellEffectKind;
  /** Combatant id of the source — 'player' or a monster id. */
  attackerId: string;
  /** Combatant id of the target. Undefined for self-effects (shield, rage, second-wind). */
  targetId?: string;
}

export interface CombatState {
  combatants: Combatant[];
  /**
   * Combatant ids in turn order, set when combat starts. Player always goes
   * first, then monsters in spawn order. No initiative rolls — deterministic.
   * Future "extra turn" mechanics (time-stop-style spells) plug into
   * `advanceTurn` rather than reshuffling this list.
   */
  turnOrder: string[];
  currentTurnIndex: number;
  round: number;
  log: CombatLogEntry[];
  status: CombatStatus;
  /** Latest attack roll — populated for dice-roll overlay animation. */
  lastAttack?: AttackEvent;
  /** Counter to issue stable AttackEvent ids. */
  attackEventCounter: number;
  /** Latest spell-cast event — populated for the SpellEffectLayer overlay. */
  spellEffectEvent?: SpellEffectEvent;
  /** Counter to issue stable SpellEffectEvent ids. Optional so legacy saves rehydrate. */
  spellEffectCounter?: number;
  /** Most recent saving-throw event the player rolled. Used by the postmortem to attribute deaths to a failed save (Hold Person, etc.). */
  lastSave?: SaveEvent;
  /** Counter to issue stable SaveEvent ids. Optional so legacy saves rehydrate. */
  saveEventCounter?: number;
  /** True after the player has made their first attack roll this combat. */
  playerHasAttacked: boolean;
  /** Missed-attack rerolls remaining for this encounter (Tymora's Coin etc.). */
  rerollMissesEncounterRemaining: number;
  /** Player attacks made on the current turn — supports Extra Attack at Fighter L5. Reset on turn change. */
  playerAttacksThisTurn: number;
  /** Rogue Sneak Attack already fired this turn. Reset on turn change. Optional so legacy saves rehydrate. */
  sneakAttackUsedThisTurn?: boolean;
  /**
   * Ranger Hunter's Mark: the combatant id of the currently-branded quarry.
   * Hits on this target deal bonus damage. Cleared/re-set by re-casting the
   * mark; combat starts unmarked. Optional so legacy saves rehydrate.
   */
  huntersMarkTargetId?: string;
  /** Ranger (Hunter) Colossus Slayer already fired this turn. Reset on turn change. Optional so legacy saves rehydrate. */
  colossusSlayerUsedThisTurn?: boolean;
  /**
   * Blade of the Vow (camp boon) re-roll budget for this encounter. Reset to 1
   * on combat start when the boon is active; consumed on the first weapon
   * damage roll by re-rolling the lowest die and keeping the higher result.
   */
  bladeOfVowRerollsRemaining?: number;
  /**
   * Ranged "kept at range" payoff: number of upcoming enemy attacks that resolve
   * at disadvantage. Set to 1 on combat start when the player wields a ranged
   * weapon (the bow identity is harder to reach before the enemy closes), and
   * spent by the first enemy attack roll of the fight. Optional so legacy saves
   * rehydrate (absent = 0).
   */
  rangedEvasionRemaining?: number;
  /**
   * Regen stacks remaining (of Mending affix). At the start of each player turn,
   * if > 0, heal regenPerTurn HP and decrement. Refreshed to 3 on every hit with
   * a regen weapon. Optional so legacy saves rehydrate (absent = 0).
   */
  playerRegenStacks?: number;
  /**
   * Ascension dungeon twist — Cursed Ground: the damage the hero takes at the
   * start of their CURRENT turn this fight. Front-loaded: set at combat start
   * from the room's twist, then decayed by {@link cursedGroundChipDecay} after
   * each application until it reaches 0, so the curse is a bounded opening spike
   * rather than a per-turn grind. Absent/0 means no curse (or it has spent
   * itself). Applied in createCombat (turn-0 player) and endTurn (every
   * subsequent player turn).
   */
  cursedGroundChip?: number;
  /**
   * Ascension dungeon twist — Cursed Ground: the flat amount {@link
   * cursedGroundChip} steps down by after each turn's bite, draining the curse
   * to nothing over a fixed few turns. Set alongside cursedGroundChip at combat
   * start; absent means no curse.
   */
  cursedGroundChipDecay?: number;
  /**
   * Ascension dungeon twist — Gloom: the hero's first attack of the fight rolls
   * at disadvantage. Read by playerAttack on the first attack (naturally one-
   * shot via playerHasAttacked). Absent means no gloom.
   */
  gloomActive?: boolean;
  /**
   * Ascension dungeon twist — Sealed Wards: blessing modifiers are inert this
   * fight. createCombat skips blessing start effects; playerAttack skips the
   * blessing first-attack bonus/advantage. Absent means blessings apply.
   */
  blessingsSealed?: boolean;
}
