export type RoomKind =
  | 'combat'
  | 'rest'
  | 'treasure'
  | 'event'
  | 'boss'
  | 'shrine'
  | 'camp'
  | 'shop'
  | 'elite';

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
  /** Combat / boss / elite rooms: monsters to spawn. */
  monsters?: RoomMonster[];
  /** Treasure: gold granted on entry. */
  goldReward?: number;
  /** Rest: short or long rest available. */
  restType?: 'short' | 'long';
  /** XP awarded for clearing (combat + boss + elite). */
  xpReward?: number;
  /** Event rooms: which template to render. Resolved against `getEvent(id)`. */
  eventTemplateId?: string;
  /**
   * Branching map: ids of the nodes reachable by stepping forward from this
   * one. Empty/absent marks a terminal node (the final boss). The chapter
   * camps and the intel→boss seam carry a single id (forced step); the earlier
   * layers carry several (a real route fork). Linear delves omit this entirely
   * and navigation falls back to the next array index.
   */
  next?: string[];
  /** Column on the chapter map (0 = chapter entry, boss = last). Layout only. */
  layer?: number;
  /** Which chapter (1–6) this node belongs to. Set by the branching generator. */
  chapter?: number;
}

export type DelvePhase = 'in-room' | 'between-rooms' | 'completed' | 'failed';

export interface DelveState {
  dungeonName: string;
  chapterId: string;
  rooms: RoomSpec[];
  currentRoomIdx: number;
  /**
   * Id of the current node. Mirrors `rooms[currentRoomIdx].id` and is the
   * source of truth the branching map reads. Absent on legacy linear delves,
   * where `currentRoomIdx` alone drives navigation.
   */
  currentRoomId?: string;
  /**
   * Ids of every node the soul has entered this run, in order. Drives the map's
   * lit "road taken"; the branches not chosen stay dark. Seeded with the entry
   * node at generation.
   */
  visitedRoomIds?: string[];
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
   * The mutually-exclusive choice the player made at the CURRENT roadside camp.
   * Set by `pickCampChoice`; locks the other two options while at that camp.
   * Cleared on every room entry (and on delve end) so each camp offers a fresh
   * fork — the per-camp boon resolution lives in `campBoons`, keyed by tier.
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
