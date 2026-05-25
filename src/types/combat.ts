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
  conditions: ActiveCondition[];
  actionEconomy: ActionEconomy;
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

export interface CombatState {
  combatants: Combatant[];
  /** Combatant ids in turn order, set when combat starts. */
  initiativeOrder: string[];
  currentTurnIndex: number;
  round: number;
  log: CombatLogEntry[];
  status: CombatStatus;
}
