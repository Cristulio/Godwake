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
  /** Event rooms: which template to render. Resolved against `getEvent(id)`. */
  eventTemplateId?: string;
}

export type DelvePhase = 'in-room' | 'between-rooms' | 'completed' | 'failed';

export interface DelveState {
  dungeonName: string;
  chapterId: string;
  rooms: RoomSpec[];
  currentRoomIdx: number;
  phase: DelvePhase;
  roomsCleared: number;
  /** Cumulative gold/xp awarded this delve; surfaced on DelveSummary. */
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
  /**
   * Per-camp boon resolutions: one entry appended each time the player
   * picks a boon OR explicitly skips the picker at a camp. `boonId === null`
   * means "skipped, do not offer again at this camp". Tier corresponds to
   * the 1st/2nd/3rd camp encountered in the delve. Cleared on delve end.
   */
  campBoons?: Array<{ tier: number; boonId: string | null }>;
  /**
   * Set true when Eyes of the Lich is picked; cleared the first time the
   * player enters a boss room afterwards (the stat-block reveal consumes it).
   */
  lichEyesAvailable?: boolean;
  /**
   * Ascension level this run is being played at (0 = base). Stamped at delve
   * creation from the hub selector; read by combat spawning (enemy HP/damage),
   * starting-gold scaling, and the renown payout on clear/death.
   */
  ascensionLevel?: number;
}
