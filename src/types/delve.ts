export type RoomKind = 'combat' | 'rest' | 'treasure' | 'event' | 'boss' | 'shrine' | 'camp';

export interface RoomMonster {
  defId: string;
  count: number;
  /** Display prefix when multiple of the same monster ("Goblin A", "Goblin B"). */
  displayPrefix?: string;
}

export interface RoomSpec {
  id: string;
  kind: RoomKind;
  title: string;
  flavorText: string;
  /** Combat / boss rooms: monsters to spawn. */
  monsters?: RoomMonster[];
  /** Treasure: gold granted on entry. */
  goldReward?: number;
  /** Rest: short or long rest available. */
  restType?: 'short' | 'long';
  /** XP awarded for clearing (combat + boss). */
  xpReward?: number;
}

export type DelvePhase = 'in-room' | 'between-rooms' | 'completed' | 'failed';

export interface DelveState {
  dungeonName: string;
  chapterId: string;
  rooms: RoomSpec[];
  currentRoomIdx: number;
  phase: DelvePhase;
  roomsCleared: number;
  goldEarned: number;
  xpEarned: number;
  /**
   * Set true the moment the Ch1 boss (Ilyich) is killed inside a combined
   * Godwake delve. Lets us credit `chapter1Cleared` even if the player then
   * presses south, dies in Ch2, and the delve technically fails.
   */
  chapter1BossKilled?: boolean;
  /**
   * The mutually-exclusive choice the player made at the roadside camp.
   * Set by `pickCampChoice`; locks the other two options for the rest of
   * the delve. Cleared on delve end.
   */
  campChoice?: 'rest' | 'sharpen' | 'prayer';
}
