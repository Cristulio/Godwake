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
  /**
   * Ascension dungeon twist riding this combat room (id into the twist
   * registry, see engine/delve/twists.ts). Assigned to a fraction of combat
   * rooms only at Ascension >= 4; absent otherwise. Telegraphed before the
   * fight and resolved into combat effects by createCombat.
   */
  twistId?: string;
  /**
   * Branching map: the node exists on the route but is not yet available to this
   * soul (e.g. an ELITE node before the elite-reveal unlock). Rendered greyed and
   * unselectable rather than hidden, so the player can see what is there and
   * route around it. The map generator guarantees a selectable alternate at every
   * step, so a locked node never traps the run.
   */
  locked?: boolean;
}

export type DelvePhase = 'in-room' | 'between-rooms' | 'completed' | 'failed';

/** Outcome of a campfire "Tempt the Dark" bones throw. */
export interface CampRiskResult {
  roll: number;
  outcome: 'win' | 'loss';
  blessingId: string | null;
  gold: number;
  damage: number;
}

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
   * Count of monsters felled this run (every mob in every combat/elite/boss
   * room cleared, the boss included). Feeds the progress-scaled renown payout
   * so a run that actually fought pays more than one that walked past rooms.
   */
  mobsKilled?: number;
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
  campChoice?: 'rest';
  /**
   * Elite node risk/reward gate. Undefined while the decision is pending (the
   * EliteRoom panel shows); set true once the player chooses to FIGHT, which
   * lets the spawn-on-enter effect build the encounter. Taking the gold instead
   * advances past the node without engaging. Cleared on every room entry.
   */
  eliteEngaged?: boolean;
  /**
   * Per-camp boon resolutions: one entry appended each time the player
   * picks a boon OR explicitly skips the picker at a camp. `boonId === null`
   * means "skipped, do not offer again at this camp". Tier corresponds to
   * the 1st/2nd/3rd camp encountered in the delve. Cleared on delve end.
   */
  campBoons?: Array<{ tier: number; boonId: string | null }>;
  /**
   * Resolution of the campfire "Tempt the Dark" gamble at the CURRENT camp.
   * Set by `resolveCampRisk` once the bones are thrown; locks the fork so the
   * throw can't be repeated. Cleared on every room entry (like `campChoice`)
   * so each camp offers one fresh throw — persisting it here, rather than in
   * component state, keeps the gate alive across a trip to the backpack and back.
   */
  campRisk?: CampRiskResult;
  /**
   * Ascension level this run is being played at (0 = base). Stamped at delve
   * creation from the hub selector; read by combat spawning (enemy HP/damage),
   * starting-gold scaling, and the renown payout on clear/death.
   */
  ascensionLevel?: number;
  /**
   * How many chapters THIS run spans — the base game's Cells→Irenicus arc
   * (`BASE_GAME_CHAPTERS` = 11) or the full New Game+ chain to the Throne
   * (`TOTAL_CHAPTERS` = 14). Stamped at delve creation so finishDelve fires the
   * win when the run beats its OWN final chapter instead of a global constant:
   * a base run ends on Irenicus, a NG+ run on Melissan. Absent on legacy
   * hand-built delves, which fall back to the full chain.
   */
  chapterCount?: number;
  /**
   * Set when a final-chapter WIN banks its renown at the win moment, before the
   * narrative ending screen. The ending's conclude re-enters `finishDelve` to run
   * the deferred settle (reincarnation, hub); this flag tells that re-entry the
   * renown is already paid so it isn't banked twice. Session-only (the delve
   * never persists), which is all the guard needs — the double-bank window is the
   * in-session conclude re-entry while the delve is still held 'completed'.
   */
  renownSettled?: boolean;
}
