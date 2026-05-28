import type { ActiveCondition } from './conditions';
import type { ActionEconomy, HitPoints } from './character';

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
  weaponName: string;
  attackBonus: number;
  natural: number;
  total: number;
  targetAC: number;
  hit: boolean;
  crit: boolean;
}

export type SpellEffectKind =
  | 'magic-missile'
  | 'fire-bolt'
  | 'burning-hands'
  | 'shield'
  | 'mage-armor'
  | 'hold-person'
  | 'misty-step'
  | 'fireball'
  | 'lightning-bolt';

export interface SpellEffectEvent {
  /** Monotonic id — increments per cast so the SpellEffectLayer mounts a fresh component. */
  id: number;
  kind: SpellEffectKind;
  /** Combatant id of the caster — 'player' or a monster id. */
  attackerId: string;
  /** Combatant id of the target. Undefined for self-buffs (shield, mage-armor). */
  targetId?: string;
}

export interface CombatState {
  combatants: Combatant[];
  /** Combatant ids in turn order, set when combat starts. */
  initiativeOrder: string[];
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
  /** True after the player has made their first attack roll this combat. */
  playerHasAttacked: boolean;
  /** Missed-attack rerolls remaining for this encounter (Tymora's Coin etc.). */
  rerollMissesEncounterRemaining: number;
  /** Player attacks made on the current turn — supports Extra Attack at Fighter L5. Reset on turn change. */
  playerAttacksThisTurn: number;
  /** Rogue Sneak Attack already fired this turn. Reset on turn change. Optional so legacy saves rehydrate. */
  sneakAttackUsedThisTurn?: boolean;
  /**
   * Blade of the Vow (camp boon) re-roll budget for this encounter. Reset to 1
   * on combat start when the boon is active; consumed on the first weapon
   * damage roll by re-rolling the lowest die and keeping the higher result.
   */
  bladeOfVowRerollsRemaining?: number;
}
