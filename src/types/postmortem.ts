/**
 * Snapshot captured the moment the player falls. Built from the combat state
 * + character state at HP=0, shown on the death screen between the failed
 * delve and the reincarnation reveal. Transient — never persisted; cleared
 * when the player clicks REINCARNATE.
 */
export interface Postmortem {
  /** Display name of the killer (e.g. "Magistrate", "Karzok"). */
  killerName: string;
  /** Monster def id of the killer, when known. Lets the postmortem deep-link to the codex. */
  killerDefId?: string;
  /** Name of the final attack/action that finished the player. */
  attackName: string;
  /** Damage delivered on the killing blow (after resists). */
  damageDealt?: number;
  damageType?: string;
  crit: boolean;
  /** Room number within the chapter (1-indexed). */
  roomNumber: number;
  /** Pretty name for the dungeon/chapter where it happened. */
  dungeonName: string;
  /** Most recent failed save the player suffered before dying. */
  failedSave?: {
    sourceName: string;
    casterName?: string;
    ability: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
    dc: number;
    rolled: number;
    mod: number;
  };
  /** Active conditions on the player at the moment of death (e.g. "paralyzed"). */
  activeConditions: string[];
  /** Resources still in the bank — what could have helped. Human-readable strings. */
  unspentResources: string[];
}
