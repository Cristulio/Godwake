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
  /** True after the player has made their first attack roll this combat. */
  playerHasAttacked: boolean;
  /** Missed-attack rerolls remaining for this encounter (Tymora's Coin etc.). */
  rerollMissesEncounterRemaining: number;
  /** Player attacks made on the current turn — supports Extra Attack at Fighter L5. Reset on turn change. */
  playerAttacksThisTurn: number;
}
