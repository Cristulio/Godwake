import { create } from 'zustand';
import type { Character } from '../types/character';
import type { CampRiskResult, DelveState, RoomSpec } from '../types/delve';
import type { ItemRef, GearRarity } from '../schemas/item';
import { getActiveRoller } from '../engine/dice';
import { rollRoomGoldDrops } from '../engine/combat/goldDrop';
import { rollItem, rollGearDrop, rollPotionDrop, rollLegendaryDrop, rollSetPieceDrop, injectSetPieces } from '../engine/items';
import { getSetPiece, canEquipSetPiece } from '../content/sets';
import { classStartingResources } from '../engine/character/initialize';
import { buildPlayerCharacter, presetCreationInput } from '../engine/character/defaultCharacter';
import { effectiveAbilityScores } from '../engine/character/derived';
import { abilityModifier } from '../types/abilities';
import { getRace } from '../content/races';
import { getClass } from '../content/classes';
import { longRest, shortRestHeal, withResetActionEconomy } from '../engine/character/actions';
import { honeItem, canHoneSlot } from '../engine/delve/hone';
import { rollBlessingOptions } from '../engine/character/blessings';
import {
  rollQuirks,
  characterQuirkMods,
  soulMarkMultiplier,
  renownSoulMarkMultiplier,
  firstBoonQuirk,
} from '../engine/character/quirks';
import { applyDelveStartUpgrades } from '../engine/character/upgrades';
import { hasPendingLevelUp } from '../engine/character/leveling';
import {
  getAscensionLevel,
  ascensionAscendantLoot,
  ascensionExclusiveLoot,
  ascensionGoldFindMult,
} from '../engine/delve/ascension';
import { TOTAL_CHAPTERS, BASE_GAME_CHAPTERS } from '../engine/delve/constants';
import { getItem } from '../content/items';
import { getCampBoon } from '../content/campBoons';
import { nextLoreBeat } from '../content/loreBeats';
import { equippedInventoryIndices, type EquipSlot } from '../engine/character/equip';
import { sellValue } from '../components/delve/shopStock';
import { newlyUnlocked, newlyUnlockedByChapter } from '../engine/progression';
import { FIRST_GEAR_TUTORIAL_ID } from '../content/tutorials';
import { useCharacterStore } from './characterStore';
import { useCombatStore } from './combatStore';
import { useScreenStore } from './screenStore';
import { useMetaStore } from './metaStore';
import { isFeatureUnlocked } from '../engine/progression/unlocks';
import { runAchievementCheck } from '../engine/achievements/check';

/**
 * Queue the one-time unlock tutorial for every FEATURE whose delve-count threshold
 * the descent just crossed AND that this soul hasn't been taught yet. Kept its own
 * function so the feature-gating and lore lanes can hang their own delve-transition
 * hooks alongside it without entangling. Migrated veterans (delveCount floored to
 * 999) never cross a threshold, so they see nothing. The per-class "a new soul
 * surfaced" cards no longer ride a descent — they fire on the RENOWN-SPENT axis off
 * a Grove purchase (gameStore.purchaseUpgrade).
 */
function queueUnlockTutorials(prevDelveCount: number, nextDelveCount: number) {
  const seen = useMetaStore.getState().seenTutorials;
  const fresh = newlyUnlocked(prevDelveCount, nextDelveCount).filter((id) => !seen.includes(id));
  // Hub-surfaced (not in-delve): these onboarding reveals show at the hub before
  // the descent, never over the delve. startDelve holds the screen flip while any
  // are queued; App gates this queue to the hub. The in-delve chapter/first-gear
  // reveals stay on the separate tutorialQueue.
  if (fresh.length > 0) useScreenStore.getState().enqueueHubUnlocks(fresh);
}

/**
 * Reveal-on-unlock for the PROGRESSION axis: any power feature whose chapter
 * threshold the soul just crossed by clearing a new deepest chapter. Fires in
 * finishDelve when the chaptersCleared high-water mark advances.
 */
function queueChapterUnlockTutorials(prevChapters: number, nextChapters: number) {
  if (nextChapters <= prevChapters) return;
  const seen = useMetaStore.getState().seenTutorials;
  // Power-feature reveals only — the per-class "a new soul surfaced" cards now
  // fire on the delve-count axis (see queueUnlockTutorials), not on depth.
  const fresh = newlyUnlockedByChapter(prevChapters, nextChapters).filter(
    (id) => !seen.includes(id),
  );
  if (fresh.length > 0) useScreenStore.getState().enqueueTutorials(fresh);
}

/**
 * Fire the one-time first-gear reveal the moment a found/bought piece enters the
 * pack — pointing a green soul at the Pack where gear is read and worn. Gated by
 * seenTutorials so it shows once per account; the enqueue dedupes if two pieces
 * arrive before the card is dismissed. Called from every inventory-add path
 * (road drop, merchant buy, rolled-gear buy); the class starting kit is seeded
 * by buildPlayerCharacter, never through these, so it doesn't trip the reveal.
 */
function queueFirstGearTutorial() {
  if (useMetaStore.getState().seenTutorials.includes(FIRST_GEAR_TUTORIAL_ID)) return;
  useScreenStore.getState().enqueueTutorials([FIRST_GEAR_TUTORIAL_ID]);
}

/** Renown granted per successful delve clear (final boss felled). */
export const RENOWN_PER_DELVE_CLEAR = 50;
/**
 * Flat consolation for a failed delve. Deliberately tiny — an early death
 * should pay almost nothing. Real renown comes from PROGRESS (mobs felled,
 * bosses broken, depth reached), not from showing up and dying in room one.
 */
export const RENOWN_PER_DELVE_FAILURE = 3;
/**
 * Progress credit: renown for every monster felled this run. The bread of the
 * payout — a run that actually fought its way deep banks far more than one
 * that died shallow, regardless of the flat floor.
 */
export const RENOWN_PER_MOB_KILLED = 2;
/**
 * Hades-style partial credit: a fat bonus per chapter boss broken. Dying at
 * the Matron's door is worth far more than dying to a goblin in room one — and
 * a boss is worth many trash mobs.
 */
export const RENOWN_PER_CHAPTER_BOSS = 25;
/**
 * Depth credit: renown per room reached this run, paid on BOTH clear and
 * death. Rewards pushing deeper even between bosses, so dying at the Ch2 boss
 * after clearing twenty rooms pays far more than dying in room 1 — fixing the
 * old flat-failure formula where only boss kills moved the needle.
 */
export const RENOWN_PER_ROOM_REACHED = 1;

/** Renown a single cleared room contributes, before run-end multipliers. */
export function roomRenownReward(room: Pick<RoomSpec, 'kind' | 'monsters'>): number {
  const isCombat =
    room.kind === 'combat' || room.kind === 'elite' || room.kind === 'boss';
  if (!isCombat) return 0;
  const mobs = (room.monsters ?? []).reduce((n, m) => n + m.count, 0);
  const bossBonus = room.kind === 'boss' ? RENOWN_PER_CHAPTER_BOSS : 0;
  return RENOWN_PER_MOB_KILLED * mobs + bossBonus;
}

import type { RenownBreakdown } from '../types/delve';
export type { RenownBreakdown } from '../types/delve';

/**
 * The single source of truth for a run's renown payout. `finishDelve` banks
 * exactly this, and `DelveSummary` displays exactly this — they must never
 * drift. Pays for PROGRESS: mobs felled + bosses broken + depth reached, on
 * top of a tiny clear/fail floor, then scaled by soul-mark and ascension.
 */
export function computeDelveRenown(delve: DelveState, character: Character): RenownBreakdown {
  const wonBoss = delve.phase === 'completed';
  const bossLimitIdx = wonBoss ? delve.currentRoomIdx + 1 : delve.currentRoomIdx;
  const bossesKilled = delve.rooms
    .slice(0, bossLimitIdx)
    .filter((r) => r.kind === 'boss').length;
  const roomsVisited = delve.visitedRoomIds?.length;
  const roomsReached =
    roomsVisited !== undefined ? Math.max(0, roomsVisited - 1) : delve.currentRoomIdx;
  const mobsKilled = delve.mobsKilled ?? 0;
  const base =
    (wonBoss ? RENOWN_PER_DELVE_CLEAR : RENOWN_PER_DELVE_FAILURE) +
    RENOWN_PER_MOB_KILLED * mobsKilled +
    RENOWN_PER_CHAPTER_BOSS * bossesKilled +
    RENOWN_PER_ROOM_REACHED * roomsReached;
  // Soul-mark and ascension reward multipliers compose MULTIPLICATIVELY.
  const soulMarkMult = renownSoulMarkMultiplier(character);
  const ascensionMult = getAscensionLevel(delve.ascensionLevel ?? 0).renownMult;
  const multiplier = soulMarkMult * ascensionMult;
  return {
    base,
    multiplier,
    total: Math.floor(base * multiplier),
    // The run ledger, surfaced so the summary can SHOW the arithmetic — a
    // wiped or under-counted ledger is then visible at a glance (owner's
    // 204-renown Maevra run was undiagnosable from the bare total).
    mobsKilled,
    bossesKilled,
    roomsReached,
    soulMarkMult,
    ascensionMult,
  };
}

/** Renown threshold that reveals the Druid Grove on the hub. */
export const GROVE_UNLOCK_THRESHOLD = 30;

/**
 * The level-1 HP ceiling a soul descends with: class hit die + CON mod +
 * racial per-level HP + the wizard's +1 baseline + any permanent Grove HP
 * (Mantle of the Wakened, Iron Will). `startDelve` rebuilds this on every
 * descent; `reincarnateSoul` refills to it so the between-lives screen shows
 * the SAME number the soul will descend with — not the dead life's leveled
 * max. effectiveAbilityScores reads only base + race, so run-scoped blessings
 * still on the dead character don't skew the result.
 */
function level1HpMax(ch: Character): number {
  const cls = getClass(ch.classId);
  const conMod = abilityModifier(effectiveAbilityScores(ch).con);
  const raceBonusHp = getRace(ch.raceId).bonusHpPerLevel ?? 0;
  const classBonusHp = ch.classId === 'wizard' ? 1 : 0;
  const permanentHp = ch.permanentBonuses?.hp ?? 0;
  return cls.hitDie + conMod + raceBonusHp + classBonusHp + permanentHp;
}

/**
 * All found/bought gear is INTRA-DELVE: descent (`startDelve`) and reincarnation
 * (`reincarnateSoul`) reset inventory + equipped to the class starting kit so
 * shop weapons, road drops, AND set pieces never carry across lives — set pieces
 * are run-scoped loot now (only the SET UNLOCK persists, metaStore.unlockedSets;
 * the player re-buys the kit each life). Returns only the gear fields — gold and
 * HP are owned by the callers.
 */
function gearResetToKit(
  character: Character,
): Pick<Character, 'inventory' | 'equipped'> {
  try {
    const fresh = buildPlayerCharacter(presetCreationInput(character.classId));
    return { inventory: fresh.inventory, equipped: fresh.equipped };
  } catch {
    // Non-playable class with no preset — leave gear untouched rather than
    // strip the soul bare.
    return { inventory: character.inventory, equipped: character.equipped };
  }
}

/**
 * Step the run into the node with id `nextId`: sync currentRoomIdx/Id, light it
 * up on the map's visited trail, and return to the in-room phase. `roomsCleared`
 * is passed only by the auto-step path (the node just left was cleared); a map
 * pick leaves it alone because `advanceRoom` already credited the clear.
 */
function enterRoom(
  delve: DelveState,
  nextId: string,
  roomsCleared?: number,
): DelveState {
  const idx = delve.rooms.findIndex((r) => r.id === nextId);
  if (idx < 0) return delve;
  const visited = delve.visitedRoomIds ?? [];
  return {
    ...delve,
    currentRoomIdx: idx,
    currentRoomId: nextId,
    visitedRoomIds: visited.includes(nextId) ? visited : [...visited, nextId],
    phase: 'in-room',
    // The campfire fork lock is per-camp: clear it on every room entry so the
    // next camp offers a fresh pick (boons stay tier-keyed in `campBoons`).
    campChoice: undefined,
    // The bones-throw gate is part of the same per-camp fork — reset it too so
    // each camp grants one fresh throw.
    campRisk: undefined,
    // The rest-room Rest/Hone fork is per-room: clear it so the next alcove offers
    // a fresh pick (and the gate can't be re-armed by leaving for the backpack).
    restChoice: undefined,
    // The elite fight/gold gate is per-node: reset so each elite re-prompts.
    eliteEngaged: undefined,
    // The buyback stack is per-shop: leaving the room ends the buyback window.
    recentlySold: undefined,
    ...(roomsCleared !== undefined ? { roomsCleared } : {}),
  };
}

function applyDelveStartQuirks(character: Character): Character {
  const mods = characterQuirkMods(character);
  const bonusGold = mods.startBonusGold ?? 0;
  return {
    ...character,
    goldInPocket: character.goldInPocket + bonusGold,
    delveBudgets: {
      quirkRerollMissesRemaining: mods.rerollMissesPerDelve ?? 0,
      stabilisesUsed: 0,
    },
  };
}

/**
 * Roll the next life's quirks, guaranteeing at least two distinct ids. `carry`
 * holds quirks that survive the turn (Wheelturner keeps the first boon). The bounded
 * retry tops up one at a time and is capped so a small or exhausted quirk pool
 * can never spin forever.
 */
function rollReincarnationQuirks(carry: string[]): string[] {
  const roller = getActiveRoller();
  const result = [...carry];
  for (const id of rollQuirks(roller, Math.max(2 - result.length, 1))) {
    if (!result.includes(id)) result.push(id);
  }
  for (let attempt = 0; result.length < 2 && attempt < 32; attempt++) {
    const [id] = rollQuirks(roller, 1);
    if (id && !result.includes(id)) result.push(id);
  }
  return result;
}

/**
 * Turn the wheel: the soul reincarnates into a fresh life. Quirks reroll (the
 * Wheelturner upgrade carries the first boon forward), level/xp reset to the
 * baseline, and everything that belonged to the life just ended — blessings,
 * camp boons, conditions, delve buffs, boss intel — is left behind.
 *
 * This is the single reincarnation routine shared by BOTH death (`failDelve`)
 * and clear (`finishDelve`): winning and dying differ only in the renown tier
 * and lore beat, never in whether the soul turns the wheel. A future endless
 * mode would simply skip this call to keep a build across clears.
 *
 * Returns the reincarnated character; also fires the one-time meta side effects
 * (reincarnation flag + first-life NPC reveal).
 */
function reincarnateSoul(character: Character): Character {
  const oldQuirks = character.quirks;
  // Wheelturner carries the first BOON forward — never a bane. A soul that paid
  // 300 renown to keep "one bright thread" should not have that thread be a curse.
  const carriedBoon = character.wheelturnerUnlocked
    ? firstBoonQuirk(oldQuirks)
    : undefined;
  const carry = carriedBoon ? [carriedBoon] : [];
  const newQuirks = rollReincarnationQuirks(carry);

  const meta = useMetaStore.getState();
  const firstReincarnation = !meta.hasReincarnated;
  meta.setHasReincarnated(true);
  // The Druid Grove opens the first time the wheel hauls the soul back: Renown
  // only means something once there's a life-after to spend it on. Fire its
  // one-time reveal here, on that first return — not on an early delve step (it
  // is no longer delve-gated, see engine/progression/unlocks.ts). Seen-once via
  // seenTutorials; the `firstReincarnation` guard keeps veterans (already past
  // their first death) from ever re-triggering it.
  // Onto the HUB-gated queue, not the in-delve one: this fires inside failDelve,
  // a step BEFORE the reincarnation reveal renders. The in-delve queue paints
  // over any screen, so the grove card would stomp the dramatic quirk reveal.
  // hubUnlockQueue holds until screen === 'hub', so the card waits for the hub —
  // exactly where its "Past the hub, on older ground..." copy reads right.
  if (firstReincarnation && !meta.seenTutorials.includes('grove')) {
    useScreenStore.getState().enqueueHubUnlocks(['grove']);
  }
  // The soul-bond name reveals are no longer wired to the wheel — they now ride
  // the progressive lore arc (content/loreBeats.ts): Inara introduces herself in
  // an early beat, the antagonist stays "The Voice" until the soul reaches
  // Tor Maladin (cleared Chapter 10), one step before the Chapter 11
  // confrontation. A reincarnation alone reveals nothing.

  // Refill the body to the LEVEL-1 ceiling the soul will actually descend with,
  // not the dead life's leveled max. This is the same number startDelve rebuilds
  // on descent, so the between-lives screen no longer shows e.g. 46/46 and then
  // snaps to 16 on Descend. runAsiGains is cleared so in-run ASI gains do not
  // compound into the next life.
  const hpMax = level1HpMax({ ...character, runAsiGains: undefined });
  return {
    ...character,
    ...gearResetToKit(character),
    runAsiGains: undefined,
    level: 1,
    xp: 0,
    // The school/archetype is a per-run choice re-made at the subclass level;
    // clear it so the next life re-picks rather than inheriting the dead life's.
    subclassId: null,
    quirks: newQuirks,
    blessings: [],
    campBoons: [],
    conditions: [],
    hp: { current: hpMax, max: hpMax, temp: 0 },
    delveAttackBonus: 0,
    delveSpellAttackBonus: 0,
    bossIntel: {},
    boldApproachBosses: [],
  };
}

/** The post-fight reward tally shown by the spoils screen after a combat clear. */
export interface LootSummary {
  gold: number;
  xp: number;
  /**
   * Dropped loot, as the structured `ItemRef`s rolled this fight. The spoils
   * screen recomposes the LOCALIZED display name / description at render time
   * (rolled.name is a baked-English string built at roll time, so storing the
   * ref lets the spoils screen show Spanish under the es locale).
   */
  items: ItemRef[];
  /** Id of a legendary relic banked to the reliquary this fight, if any. */
  bankedLegendaryId?: string;
  /** Id of a SET-gear piece found into the run this fight (its set now unlocked), if any. */
  foundSetPieceId?: string;
  /**
   * Renown this fight earned toward the run total (mobs felled + boss bonus,
   * pre run-end multipliers). Surfaced on the spoils screen so the player sees
   * progress accrue; the full multiplied total settles on DelveSummary.
   */
  renown: number;
}

/**
 * The active run: delve state + the cross-cutting orchestrators that mutate
 * delve, character, combat, screen, and meta together. Session-only — never
 * persisted (delve drops on reload).
 */
interface DelveStoreState {
  delve: DelveState | null;
  /**
   * Everything the most recent fight dropped — shown on the blocking spoils
   * screen before the player may advance. Session-only; set on a combat-room
   * clear, cleared by acceptSpoils. Gathers gold + xp + each rolled item, plus
   * a `bankedLegendary` name when an elite coughs up a relic.
   */
  lastLoot: LootSummary | null;
  /**
   * The room just cleared, held until the player accepts the spoils. Used by
   * acceptSpoils to fire boss taunts and chapter bookkeeping after advancing.
   */
  pendingSpoilsRoom: RoomSpec | null;
  /**
   * Per-shop record of bought stock keys — a gear slot id (`gear-N`), a
   * consumable's item id, or the `legendary` marker. Lets a merchant rack keep a
   * purchased ware SOLD when the player steps away to the pack and returns within
   * the same delve (the buy-state used to live in component state and reset on
   * unmount, so bought items re-appeared and were re-buyable). Keyed by room id
   * so each shop tracks its own sold-state and a different shop starts fresh;
   * cleared on every descent since room ids repeat across delves. Session-only.
   */
  purchasedShopKeys: Record<string, string[]>;

  setDelve: (delve: DelveState | null) => void;
  startDelve: (delve: DelveState) => void;
  /**
   * Finish the current node: reveal the route map at a branch, walk straight
   * through a forced step, or complete the run at the final boss.
   */
  advanceRoom: () => void;
  /** Step the run into a chosen reachable next node from the route map. */
  chooseRoom: (nextId: string) => void;
  /**
   * Credit gold/xp from a combat or non-combat source. Pass `skipLevelUpRoute`
   * when the caller will gate progression behind the spoils screen — the level-up
   * check should fire from acceptSpoils after the room has advanced, not here.
   */
  addDelveReward: (gold: number, xp: number, skipLevelUpRoute?: boolean) => void;
  /** Credit gold from a non-combat source (e.g. Shrine Tithe) to purse + ledger. */
  grantTitheGold: (amount: number) => void;
  /**
   * Settle a cleared combat/boss room: gold drops, room advance, first-blood /
   * boss taunts, chapter-boss + NPC-reveal bookkeeping. The view just dispatches.
   */
  resolveRoomVictory: (room: RoomSpec) => void;
  finishDelve: () => void;
  failDelve: () => void;
  abandonDelve: () => void;
  markChapter1BossKilled: () => void;
  creditChapterClearGold: (clearedChapter?: number) => void;
  /** Resolve a camp choice. Returns null (rest grants no blessing). */
  pickCampChoice: (choice: 'rest') => string | null;
  /**
   * Resolve the rest-room fork. 'rest' knits 70% of max HP and refreshes class
   * resources (today's behaviour); 'hone' forgoes the heal to raise the equipped
   * item at `slot` by +1 enhancement for the rest of the run (engine/delve/hone).
   * The lock lives on the delve so it survives an unmount/remount. No-op once a
   * choice is made (or a 'hone' with no honeable slot). Returns true when applied.
   */
  pickRestChoice: (choice: 'rest' | 'hone', slot?: EquipSlot) => boolean;
  /**
   * Resolve the elite node's risk/reward decision. 'fight' engages the encounter
   * (the spawn-on-enter effect builds it; a win may yield a legendary relic);
   * 'gold' takes the safe purse and advances past the node with no fight, no loot,
   * and no relic.
   */
  pickEliteChoice: (choice: 'fight' | 'gold') => void;
  /**
   * Resolve the current camp's boon picker. `boonId === null` means the player
   * explicitly skipped the panel. The same camp tier cannot be resolved twice.
   */
  pickCampBoon: (tier: number, boonId: string | null) => void;
  /**
   * Throw the bones at the campfire's "Tempt the Dark" gamble. Rolls a d20,
   * applies the win (blessing + gold) or loss (HP), and records the outcome on
   * the delve so the gate survives leaving and re-entering the camp screen.
   * No-ops (returns null) if already thrown this camp. `riskTier` scales the
   * gold payout (the camp's tier, min 1).
   */
  resolveCampRisk: (riskTier: number) => CampRiskResult | null;
  purchaseFromMerchant: (itemId: string) => { ok: boolean; reason?: string };
  /** Buy a pre-rolled shop item (carries its rolled payload) at the given price. */
  purchaseRolledGear: (ref: ItemRef, cost: number) => { ok: boolean; reason?: string };
  /**
   * Buy a legendary relic from the shop "reliquary": deducts gold and BANKS it to
   * the persistent collection (it does not enter the pack and isn't equipped this
   * run). Caller removes the offer from stock on success.
   */
  purchaseLegendary: (legendaryId: string, cost: number) => { ok: boolean; reason?: string };
  /** Record a shop stock key as bought so the rack disables/hides it on re-entry. */
  recordShopPurchase: (roomId: string, key: string) => void;
  /**
   * Sell a carried (non-equipped) item to a merchant: removes it from the pack
   * and credits a fraction of its value. Returns the gold paid on success.
   */
  sellItem: (inventoryIdx: number) => { ok: boolean; reason?: string; gold?: number };
  /**
   * Undo a misclicked sale: rebuy an item from this shop's buyback stack
   * (`delve.recentlySold`) at the same price it fetched. Returns the gold spent.
   */
  buyBackItem: (soldIndex: number) => { ok: boolean; reason?: string; gold?: number };
  /**
   * Accept the spoils screen: advance the room, fire boss taunts/bookkeeping,
   * then route to level-up (if the fight leveled up the character) or back to
   * the delve. This is the ONLY way to proceed past a combat victory.
   */
  acceptSpoils: () => void;
  /** Clear the loot summary without advancing (internal / legacy). */
  clearLastLoot: () => void;
}

/**
 * Advance the progressive soul-bond story by at most one beat. Called on every
 * descent (the calm transition) AFTER the delve counter has been bumped, so the
 * milestone read is fresh. Plays the single next in-order, unseen, eligible beat
 * (content/loreBeats.ts), marks it seen, and — for the two reveal beats — flips
 * the named NPC to known so their real name appears from then on. One beat per
 * descent means a returning veteran walks the arc one step at a time, never a
 * wall of text. Own function — additive to the other startDelve descent hooks.
 */
function playNextLoreBeat(): void {
  const meta = useMetaStore.getState();
  const beat = nextLoreBeat(meta);
  if (!beat) return;
  useScreenStore.getState().playLoreBeat(beat.speaker, beat.context, beat.text);
  meta.markDialogueBeatSeen(beat.id);
  if (beat.reveals) meta.markNpcKnown(beat.reveals);
}

export const useDelveStore = create<DelveStoreState>()((set, get) => ({
  delve: null,
  lastLoot: null,
  pendingSpoilsRoom: null,
  purchasedShopKeys: {},

  setDelve: (delve) => set({ delve }),

  startDelve: (delve) => {
    const charSlice = useCharacterStore.getState();
    const ch = charSlice.character;
    if (!ch) return;
    const meta = useMetaStore.getState();
    // Hades-style fresh run: level, xp, gold all reset to baseline.
    // Renown + Grove upgrades + quirks survived the wheel.
    const cls = getClass(ch.classId);
    // Level-1 ceiling, rebuilt every descent (see level1HpMax): hit die + CON +
    // race HP + wizard's +1 baseline + permanent Grove HP. reincarnateSoul
    // refills to the same value so the wait-screen matches the descent.
    // runAsiGains is cleared so in-run ASI gains never carry into the next run
    // (covers the abandon path that bypasses reincarnateSoul).
    const baseHpMax = level1HpMax({ ...ch, runAsiGains: undefined });
    // Coin in the Pocket seeds gold from a permanent bonus on the soul, not
    // a delve-start mutation, so we add it after the run-scoped reset to 0.
    // Higher ascension levels tighten the purse (startingGoldMult < 1).
    const ascension = getAscensionLevel(delve.ascensionLevel ?? 0);
    const startingGold = Math.floor(
      (ch.permanentBonuses?.startingGold ?? 0) * ascension.startingGoldMult,
    );
    const freshlyDescended: Character = {
      ...ch,
      ...gearResetToKit(ch),
      runAsiGains: undefined,
      level: 1,
      xp: 0,
      // Fresh descent re-picks the school/archetype at the subclass level — the
      // abandon path bypasses reincarnateSoul, so clear it here too.
      subclassId: null,
      goldInPocket: startingGold,
      hp: { current: baseHpMax, max: baseHpMax, temp: 0 },
      hitDice: { current: 1, max: 1, die: cls.hitDie },
      resources: classStartingResources(ch.classId),
      blessings: [],
      campBoons: [],
      delveAttackBonus: 0,
      delveSpellAttackBonus: 0,
      nextAttackAdvantage: false,
      poisonImmuneEncounter: false,
      damageReductionEncounter: 0,
      attackBonusEncounter: 0,
      damageBonusEncounter: 0,
      conditions: [],
      bossIntel: {},
      boldApproachBosses: [],
    };
    const unlocked = meta.unlockedUpgrades;
    const withUpgrades = applyDelveStartUpgrades(
      withResetActionEconomy(freshlyDescended),
      unlocked,
    );
    let withQuirkBudgets = applyDelveStartQuirks(withUpgrades);

    // Pilgrim's Step: seed N random blessings at delve start. Done here
    // because the upgrade's apply() is pure and can't reach the active
    // dice roller — this is the natural seam.
    const pilgrimRank = unlocked['pilgrims-step'] ?? 0;
    if (pilgrimRank > 0) {
      const rolled = rollBlessingOptions(getActiveRoller(), pilgrimRank, withQuirkBudgets);
      withQuirkBudgets = {
        ...withQuirkBudgets,
        blessings: [...withQuirkBudgets.blessings, ...rolled],
      };
    }

    // Fresh rack on every descent: room ids repeat across delves, so a stale
    // sold-state would carry one run's purchases onto the next run's shops.
    set({ delve, purchasedShopKeys: {} });
    useCombatStore.getState().setCombat(null);
    charSlice.setCharacter(withQuirkBudgets);
    // Account-level: every descent is one delve started. Drives the
    // progressive-unlock ladder (engine/progression/unlocks.ts).
    const prevDelveCount = meta.delveCount;
    meta.incrementDelveCount();
    // Achievement bookkeeping: which class-souls have ever been carried down.
    meta.recordClassPlayed(ch.classId);
    // Reveal-on-unlock: fire a one-time tutorial for any feature this descent
    // just opened. Reads the post-increment count off the captured prev value.
    // These are hub-surfaced (delve-count axis): if this descent crossed a
    // threshold, hold at the hub so the card(s) show BEFORE the delve — the
    // descent resumes into the delve once the last one is dismissed.
    queueUnlockTutorials(prevDelveCount, prevDelveCount + 1);
    // The descent is the calm beat-trigger moment: drip the next story beat (and
    // any name reveal it carries) now that the delve counter is current. Fire it
    // BEFORE the screen flips to the delve, so the beat is already the active
    // dialogue when DelveScreen mounts — its spawn-on-enter effect holds the first
    // fight (and the first-combat coach) behind the dialogue until it's dismissed,
    // instead of the beat painting over a live combat.
    playNextLoreBeat();
    const screenStore = useScreenStore.getState();
    if (screenStore.hubUnlockQueue.length > 0) {
      screenStore.holdForHubUnlock();
    } else {
      screenStore.setScreen('delve');
    }
  },

  advanceRoom: () =>
    set((s) => {
      if (!s.delve) return s;
      const d = s.delve;
      const cur = d.rooms[d.currentRoomIdx];
      useCombatStore.getState().setCombat(null);
      const roomsCleared = d.roomsCleared + 1;

      // Legacy linear delve (no graph edges): step the array index, as before.
      if (d.currentRoomId === undefined) {
        const wasLast = d.currentRoomIdx >= d.rooms.length - 1;
        return {
          delve: {
            ...d,
            currentRoomIdx: wasLast ? d.currentRoomIdx : d.currentRoomIdx + 1,
            phase: wasLast ? 'completed' : 'in-room',
            roomsCleared,
            campChoice: undefined,
            restChoice: undefined,
            eliteEngaged: undefined,
            recentlySold: undefined,
          },
        };
      }

      const nextIds = cur?.next ?? [];
      // Terminal node (the final boss) — the chain has fallen.
      if (nextIds.length === 0) {
        return { delve: { ...d, phase: 'completed', roomsCleared, recentlySold: undefined } };
      }
      // A forced single step (intel→boss, boss→camp, camp→next entry): walk
      // straight through. Only a real fork opens the route map.
      if (nextIds.length === 1) {
        return { delve: enterRoom(d, nextIds[0], roomsCleared) };
      }
      // A real fork opens the route map; clear the per-shop buyback window here too
      // (enterRoom isn't reached until the player picks the next node).
      return { delve: { ...d, phase: 'between-rooms', roomsCleared, recentlySold: undefined } };
    }),

  chooseRoom: (nextId) => {
    const s = get();
    if (!s.delve) return;
    // Backstop the level-up-before-fight invariant: you cannot step into the
    // next node — and never into a fight — while a level-up is owed. Route to
    // the level-up screen instead, regardless of how the player reached the map
    // (this also catches any path that slipped past the spoils screen). After
    // leveling, hasPendingLevelUp clears and the pick goes through normally.
    const character = useCharacterStore.getState().character;
    if (character && hasPendingLevelUp(character)) {
      useScreenStore.getState().setScreen('level-up');
      return;
    }
    const cur = s.delve.rooms[s.delve.currentRoomIdx];
    // Only step to a node actually reachable from where we stand.
    if (cur?.next && !cur.next.includes(nextId)) return;
    useCombatStore.getState().setCombat(null);
    set({ delve: enterRoom(s.delve, nextId) });
  },

  addDelveReward: (gold, xp, skipLevelUpRoute = false) => {
    const s = get();
    if (!s.delve) return;
    const charSlice = useCharacterStore.getState();
    const character = charSlice.character;
    // Bargain Hunter / Pinchpurse scale gold; Soul-mark scales gold AND xp
    // (each bane quirk = +20%); ascension squeezes the find-rate (the real gold
    // penalty — runs start at ~0 gold, so the legacy startingGoldMult barely
    // bites). All stack multiplicatively.
    const goldFind = ascensionGoldFindMult(s.delve.ascensionLevel ?? 0);
    const goldMul = character
      ? (characterQuirkMods(character).goldMultiplier ?? 1) *
        soulMarkMultiplier(character) *
        goldFind
      : goldFind;
    const xpMul = character ? soulMarkMultiplier(character) : 1;
    const finalGold = Math.floor(gold * goldMul);
    const finalXp = Math.floor(xp * xpMul);
    set({
      delve: {
        ...s.delve,
        goldEarned: s.delve.goldEarned + finalGold,
        xpEarned: s.delve.xpEarned + finalXp,
      },
    });
    if (!character) return;
    // goldEarned is the run-aggregate ledger; goldInPocket is the spendable
    // purse the shop reads from. Both must update or boss/treasure gold never
    // reaches the player.
    const nextChar: Character = {
      ...character,
      goldInPocket: character.goldInPocket + finalGold,
      xp: (character.xp ?? 0) + finalXp,
    };
    charSlice.setCharacter(nextChar);
    if (!skipLevelUpRoute && hasPendingLevelUp(nextChar)) {
      useScreenStore.getState().setScreen('level-up');
    }
  },

  grantTitheGold: (amount) => {
    if (amount <= 0) return;
    const s = get();
    const charSlice = useCharacterStore.getState();
    const character = charSlice.character;
    if (!character) return;
    // Mirror the addDelveReward split: spendable purse + run-aggregate ledger.
    charSlice.setCharacter({
      ...character,
      goldInPocket: character.goldInPocket + amount,
    });
    if (s.delve) {
      set({ delve: { ...s.delve, goldEarned: s.delve.goldEarned + amount } });
    }
  },

  resolveRoomVictory: (room) => {
    const s = get();
    const charSlice = useCharacterStore.getState();
    const character = charSlice.character;
    if (!s.delve || !character) return;
    const isBossRoom = room.kind === 'boss';
    const isRegularCombat = room.kind === 'combat' || room.kind === 'elite' || isBossRoom;

    let goldGained = 0;
    let xpGained = 0;
    const droppedItems: LootSummary['items'] = [];
    let bankedLegendaryId: string | undefined;
    let foundSetPieceId: string | undefined;

    if (isRegularCombat) {
      const roomGold = room.goldReward ?? 0;
      const xpDrop = room.xpReward ?? 0;
      // Per-monster CR-scaled gold drops, on top of any fixed room-level goldReward.
      const monsterDefIds = (room.monsters ?? []).flatMap((m) =>
        Array.from({ length: m.count }, () => m.defId),
      );
      const mobGold = rollRoomGoldDrops(getActiveRoller(), monsterDefIds);
      let goldDrop = roomGold + mobGold;
      // Boss intel "walk past" reward: +10% gold from that specific boss.
      if (isBossRoom) {
        const bossDefId = room.monsters?.[0]?.defId;
        if (bossDefId && character.boldApproachBosses?.includes(bossDefId)) {
          goldDrop = Math.floor(goldDrop * 1.10);
        }
      }
      const goldBefore = character.goldInPocket;
      const xpBefore = character.xp ?? 0;
      // Skip level-up routing — acceptSpoils handles that after the room advances.
      if (goldDrop || xpDrop) get().addDelveReward(goldDrop, xpDrop, true);
      // Gear drop: a low-chance rolled item from the combat-room clear. Re-read
      // the character so the new item layers onto the gold/xp just credited.
      // Rarity is gated by the run's CURRENT chapter inside rollGearDrop (a fresh
      // run starts at greens, epic only deep in) — no cross-run rarity unlock.
      const meta = useMetaStore.getState();
      const dropRarity: GearRarity | null = rollGearDrop(getActiveRoller(), room.kind, room.chapter ?? 1);
      if (dropRarity) {
        const cur = useCharacterStore.getState().character;
        if (cur) {
          const ref = rollItem(getActiveRoller(), {
            rarity: dropRarity,
            classId: cur.classId,
            depth: room.chapter ?? 1,
          });
          useCharacterStore.getState().setCharacter({
            ...cur,
            inventory: [...cur.inventory, ref],
          });
          queueFirstGearTutorial();
          if (ref.rolled) droppedItems.push(ref);
        }
      }
      // Healing-draught drop: a rarer side channel beside the gear roll. The
      // rung pool tiers with the run's chapter (the same CONSUMABLE_CHAPTER_GATE
      // the shops read), so deep clears pay in deep potions.
      const potionId = rollPotionDrop(getActiveRoller(), room.kind, room.chapter ?? 1);
      if (potionId) {
        const cur = useCharacterStore.getState().character;
        if (cur) {
          const ref = { itemId: potionId };
          useCharacterStore.getState().setCharacter({
            ...cur,
            inventory: [...cur.inventory, ref],
          });
          droppedItems.push(ref);
        }
      }
      // Rare legendary relic drop: banked to the collection, not equipped this run.
      // Gate: elite legendary drops are only available once the legendaries feature is unlocked.
      if (isFeatureUnlocked('legendaries', meta) && rollLegendaryDrop(getActiveRoller(), room.kind)) {
        const allowAscendant = ascensionAscendantLoot(s.delve.ascensionLevel ?? 0);
        const bankedId = useMetaStore.getState().grantLegendaryDrop(allowAscendant);
        if (bankedId) bankedLegendaryId = bankedId;
      }
      // Unlock-on-find SET drop (elite/boss): the find permanently UNLOCKS its set
      // (grantSetPieceDrop → metaStore.unlockedSets) and hands over one class-legal
      // piece for THIS run. Gated on the sets feature; NG+ runs fold in the
      // exclusive sets. The piece is run-scoped loot (wiped next descent); only the
      // unlock persists, opening the set for purchase in shops.
      if (isFeatureUnlocked('sets', meta) && rollSetPieceDrop(getActiveRoller(), room.kind)) {
        const allowExclusive = ascensionExclusiveLoot(s.delve.ascensionLevel ?? 0);
        const droppedPieceId = useMetaStore.getState().grantSetPieceDrop(allowExclusive);
        if (droppedPieceId) {
          foundSetPieceId = droppedPieceId;
          // Surface the found piece in the live backpack now (the drop pool is
          // class-legal, so it always fits) — usable this run, not banked forever.
          const cur = useCharacterStore.getState().character;
          const piece = getSetPiece(droppedPieceId);
          if (cur && piece && canEquipSetPiece(droppedPieceId, cur.classId)) {
            useCharacterStore.getState().setCharacter(injectSetPieces(cur, [piece]));
          }
        }
      }
      // Tally actual deltas (quirk multipliers applied by addDelveReward).
      const after = useCharacterStore.getState().character;
      goldGained = (after?.goldInPocket ?? character.goldInPocket) - goldBefore;
      xpGained = (after?.xp ?? character.xp ?? xpBefore) - xpBefore;
      // Achievement counters: a win ending on a single hit point, and elites
      // felled in open battle (the fight path — the toll path never reaches here).
      if ((after?.hp.current ?? 0) === 1) meta.recordLowHpWin();
      if (room.kind === 'elite') meta.recordEliteFightWin();
    }

    useCombatStore.getState().setCombat(null);
    // Progress-renown: every mob this room held is now dead. Tally them onto the
    // run ledger (computeDelveRenown reads delve.mobsKilled at finish) and surface
    // this fight's slice on the spoils screen.
    const mobsThisRoom = isRegularCombat
      ? (room.monsters ?? []).reduce((n, m) => n + m.count, 0)
      : 0;
    const fightRenown = roomRenownReward(room);
    // Store the cleared room so acceptSpoils can fire boss taunts / bookkeeping.
    // Always show the spoils screen — the rhythm beat fires even on a 0/0 drop.
    set((cur) => ({
      lastLoot: {
        gold: goldGained,
        xp: xpGained,
        items: droppedItems,
        bankedLegendaryId,
        foundSetPieceId,
        renown: fightRenown,
      },
      pendingSpoilsRoom: room,
      delve: cur.delve
        ? { ...cur.delve, mobsKilled: (cur.delve.mobsKilled ?? 0) + mobsThisRoom }
        : cur.delve,
    }));
    useScreenStore.getState().setScreen('spoils');
  },

  acceptSpoils: () => {
    const s = get();
    const room = s.pendingSpoilsRoom;
    set({ lastLoot: null, pendingSpoilsRoom: null });

    get().advanceRoom();

    // Inara whispers on the FIRST cleared room of the run. Fired synchronously
    // at the transition (not deferred), so it's the active dialogue before the
    // next room mounts — DelveScreen then holds that room's fight behind it.
    const d = get().delve;
    if (d && d.roomsCleared === 0) {
      useScreenStore.getState().showTaunt('imoen', 'first-blood');
    }
    // Velnaris taunts after a boss clear.
    if (room?.kind === 'boss') {
      const bossIdx = s.delve?.rooms.findIndex((r) => r.id === room.id) ?? -1;
      const clearedChapter =
        bossIdx >= 0
          ? (s.delve?.rooms.slice(0, bossIdx + 1).filter((r) => r.kind === 'boss').length ?? 1)
          : 1;
      // Fire the chapter-unlock reveal the INSTANT this chapter falls — and advance
      // the chaptersCleared high-water now so whatever this clear just unlocked
      // (legendary drops, epic affixes, …) goes live for the REST of this run, not
      // only the next one. recordChapterCleared is an idempotent Math.max and
      // seenTutorials dedupes, so finishDelve's run-end re-fire stays a no-op.
      const prevChapters = useMetaStore.getState().chaptersCleared;
      useMetaStore.getState().recordChapterCleared(clearedChapter);
      queueChapterUnlockTutorials(prevChapters, useMetaStore.getState().chaptersCleared);
      // Synchronous (was a 1.5s setTimeout that landed the overlay AFTER the next
      // room loaded): fire it now so it precedes the next room rather than
      // painting over it. The victory beat already played on the spoils screen.
      // Velnaris IS the Ch11 boss (BASE_GAME_CHAPTERS) — clearing Ch11 is his
      // death, so a final line there is fine, but he falls silent after. Through
      // the Throne-of-the Slain God chapters (Ch12-13) Maevra, the false "kind ally,"
      // whispers in his place — solicitous, the mask slipping as the Throne
      // nears. Ch14 is her own death: the Throne finale fires there, no whisper.
      if (clearedChapter <= BASE_GAME_CHAPTERS) {
        useScreenStore.getState().showTaunt('irenicus', 'chapter-clear', clearedChapter);
      } else if (clearedChapter < TOTAL_CHAPTERS) {
        useScreenStore.getState().showTaunt('melissan', 'chapter-clear', clearedChapter);
      }
      get().creditChapterClearGold(clearedChapter);
    }
    // Chained Godwake delve: Karzok is the Ch1 boss. Flag the kill. The Voice is
    // NOT named here — the antagonist's name stays hidden until the Chapter-10 lore
    // beat (content/loreBeats.ts) reveals it; a Chapter-1 clear is far too early.
    if (
      room?.kind === 'boss' &&
      room.monsters?.[0]?.defId === 'duergar-ilyich' &&
      s.delve?.chapterId === 'godwake'
    ) {
      get().markChapter1BossKilled();
    }

    // Achievement check: a cleared chapter, banked relic/set drops from the room
    // just resolved, and the low-HP / elite counters are all settled by now.
    runAchievementCheck();

    // Level up or return to the delve (room already advanced above).
    const updatedChar = useCharacterStore.getState().character;
    if (updatedChar && hasPendingLevelUp(updatedChar)) {
      useScreenStore.getState().setScreen('level-up');
    } else {
      useScreenStore.getState().setScreen('delve');
    }
  },

  finishDelve: () => {
    const s = get();
    const charSlice = useCharacterStore.getState();
    const character = charSlice.character;
    const meta = useMetaStore.getState();
    if (!character) return;
    if (!s.delve) {
      useScreenStore.getState().setScreen('hub');
      useCombatStore.getState().setCombat(null);
      return;
    }
    const wonBoss = s.delve.phase === 'completed';
    const bossLimitIdx = wonBoss
      ? s.delve.currentRoomIdx + 1
      : s.delve.currentRoomIdx;
    const bossesKilled = s.delve.rooms
      .slice(0, bossLimitIdx)
      .filter((r) => r.kind === 'boss').length;
    const ch1Killed = s.delve.chapter1BossKilled === true;
    // Beating the run's final boss = its chain fell. Mid-run deaths credit the
    // chapter bosses actually killed. The room-10 flag is a belt-and-braces
    // floor for chapter 1 (it's set the instant Karzok dies).
    const chaptersThisRun = wonBoss
      ? Math.max(bossesKilled, 1)
      : Math.max(bossesKilled, ch1Killed ? 1 : 0);
    // The win fires when the run beats ITS OWN final chapter — Velnaris at Ch11
    // for a base run, Maevra at Ch14 for New Game+ — read off the delve's own
    // chapterCount, not a global constant, so a base run can win before the
    // Throne chapters exist in the chain at all.
    const chapterCount = s.delve.chapterCount ?? TOTAL_CHAPTERS;
    const isFullChain = chapterCount >= TOTAL_CHAPTERS;
    const beatFinalChapter = wonBoss && chaptersThisRun >= chapterCount;
    // Beating the run's OWN final chapter (Velnaris at Ch11 for a base run,
    // Maevra at Ch14 for New Game+) detours to the narrative finale BEFORE the
    // soul settles: the ending screen reads the still-'completed' delve, then
    // re-enters finishDelve() on conclude to run the deferred settle below.
    // Completion is recorded HERE, at the win moment, not in the lazy-loaded
    // ending screen (#366): a stale chunk must never cost the player the clear
    // (or the New Game+ it unlocks).
    //
    // The Throne finale REPLAYS on every full-chain Maevra kill — it's the
    // true-clear payoff and must always play, like a proper ending. Gating the
    // DISPLAY on `throneCompleted` permanently hid it from anyone whose flag was
    // set without ever seeing the credits: the win-moment record above fires even
    // if the lazy ending chunk crashed, a refresh interrupted it, or the player
    // walked straight on to New Game+ — and gameStore hydration also recovers the
    // flag from `chaptersCleared >= 14`. So the flag is for UNLOCKS only; the
    // base Pit ending (Velnaris) stays first-time, but the Throne does not gate
    // on it. The re-entry breaker is the held delve's `renownSettled` (set below
    // when the ending fires): the conclude call comes back through here with it
    // set, so this block is skipped and the run falls through to the settle.
    const showFinale =
      beatFinalChapter &&
      !s.delve.renownSettled &&
      (isFullChain || !meta.gameCompleted);
    if (showFinale) {
      // Bank renown NOW, at the win moment — the deferral to the ending screen's
      // conclude lost the ENTIRE run's renown whenever the player left the finale
      // any other way (a refresh, or straight on to New Game+): the re-entry that
      // settled it simply never fired. computeDelveRenown reads the same delve +
      // soul-marks DelveSummary just displayed, so the banked amount matches what
      // the player was shown. `renownSettled` marks the held delve so the conclude
      // re-entry's fall-through settle pays the soul exactly once. Reincarnation
      // and the move to hub stay deferred to that re-entry (the soul is still
      // alive on the finale screen).
      const renownGain = computeDelveRenown(s.delve, character).total;
      charSlice.setCharacter({ ...character, renown: character.renown + renownGain });
      meta.markGameCompleted();
      if (isFullChain) meta.markThroneCompleted();
      set({ delve: { ...s.delve, renownSettled: true } });
      useScreenStore.getState().setScreen('ending');
      return;
    }
    // Renown pays for PROGRESS — mobs felled + bosses broken + depth reached —
    // on top of a tiny clear/fail floor, then scaled by soul-mark and ascension.
    // computeDelveRenown is the shared source of truth so DelveSummary's display
    // and this banked amount can never drift apart. Settled BEFORE the wheel
    // turns, since the soul-mark reads the quirks carried THIS run. A run that
    // already banked at its win moment (the ending re-entry, renownSettled) adds
    // nothing here so the soul is paid exactly once.
    const renownGain = s.delve.renownSettled
      ? 0
      : computeDelveRenown(s.delve, character).total;
    const withRenown: Character = {
      ...character,
      renown: character.renown + renownGain,
    };
    // A clear turns the wheel here; a death already reincarnated in failDelve,
    // so on the death path we only wipe run-scoped fields (this also covers
    // direct finishDelve() calls in tests that never went through failDelve).
    const settled: Character = wonBoss
      ? reincarnateSoul(withRenown)
      : {
          ...withRenown,
          blessings: [],
          campBoons: [],
          delveAttackBonus: 0,
          delveSpellAttackBonus: 0,
          bossIntel: {},
          boldApproachBosses: [],
        };
    charSlice.setCharacter(settled);
    set({ delve: null });
    useCombatStore.getState().setCombat(null);
    useScreenStore.getState().setScreen('hub');
    if (chaptersThisRun > 0) {
      const prevChapters = meta.chaptersCleared;
      meta.recordChapterCleared(chaptersThisRun);
      // Per-class depth high-water for the class-specific achievements (bard arc,
      // "every soul", "eight masters"). classId rides reincarnation unchanged.
      meta.recordClassChapterClear(character.classId, chaptersThisRun);
      // Reaching a new depth opens the next advantage — fire the reveal for any
      // power feature this clear just unlocked (boss-intel, class swapping, epic
      // gear, legendaries, sets at completion).
      queueChapterUnlockTutorials(prevChapters, useMetaStore.getState().chaptersCleared);
    }
    // A clear of the full chain advances the world: clearing at the current
    // highest unlocked ascension opens the next rung. Replaying a lower level
    // unlocks nothing new (Spire-style).
    if (wonBoss) {
      meta.unlockNextAscension(s.delve.ascensionLevel ?? 0);
      // Achievement high-water: the deepest ascension a run was beaten at, and
      // separately the deepest ascension the FULL chain (Maevra) fell at.
      meta.recordClearAscension(s.delve.ascensionLevel ?? 0);
      if (isFullChain) meta.recordThroneAscension(s.delve.ascensionLevel ?? 0);
      // Legendaries are no longer a guaranteed per-clear grant (Wave 2): they
      // drop rarely from any combat source mid-run and bank to the collection
      // (see resolveRoomVictory). Clearing the chain only advances ascension.
    }
    if (!meta.druidGroveUnlocked && settled.renown >= GROVE_UNLOCK_THRESHOLD) {
      meta.setDruidGroveUnlocked(true);
    }
    // Run's over (clear or death): evaluate every milestone it may have crossed.
    runAchievementCheck();
  },

  failDelve: () => {
    const s = get();
    const charSlice = useCharacterStore.getState();
    const character = charSlice.character;
    if (!s.delve || !character) return;
    // Death turns the wheel — but the run's renown belongs to the soul that
    // WALKED it: settle here with the DYING character (its bane soul-marks
    // boost the payout, per design), bank onto the reincarnated soul, and
    // mark the delve settled so finishDelve's fall-through pays exactly once.
    // (Previously the settle happened post-wheel with the fresh soul, so the
    // mark multiplier silently never applied to deaths.)
    const failed = { ...s.delve, phase: 'failed' as const };
    const breakdown = computeDelveRenown(failed, character);
    const reborn = reincarnateSoul(character);
    set({ delve: { ...failed, renownSettled: true, renownSettledBreakdown: breakdown } });
    charSlice.setCharacter({ ...reborn, renown: reborn.renown + breakdown.total });
  },

  abandonDelve: () => {
    const charSlice = useCharacterStore.getState();
    const character = charSlice.character;
    if (!character) return;
    charSlice.setCharacter(
      longRest({
        ...character,
        blessings: [],
        campBoons: [],
        delveAttackBonus: 0,
        delveSpellAttackBonus: 0,
        bossIntel: {},
        boldApproachBosses: [],
      }),
    );
    set({ delve: null });
    useCombatStore.getState().setCombat(null);
    useScreenStore.getState().setScreen('hub');
  },

  markChapter1BossKilled: () =>
    set((s) => (s.delve ? { delve: { ...s.delve, chapter1BossKilled: true } } : s)),

  creditChapterClearGold: (clearedChapter = 1) => {
    const s = get();
    const charSlice = useCharacterStore.getState();
    const character = charSlice.character;
    if (!s.delve || !character) return;
    // Two sources stack: Quartermaster's Stipend (delveStart, top-level) and
    // Coin in the Pocket's per-clear payout (permanent, permanentBonuses).
    // The Stipend SCALES with the chapter just cleared (owner: a flat +10 was
    // irrelevant by the late game) — Ch1 pays 1x, Ch14 pays 14x. Coin in the
    // Pocket's per-clear payout stays flat.
    const bonus =
      (character.chapterClearGoldBonus ?? 0) * Math.max(1, clearedChapter) +
      (character.permanentBonuses?.chapterClearGold ?? 0);
    if (bonus <= 0) return;
    charSlice.setCharacter({
      ...character,
      goldInPocket: character.goldInPocket + bonus,
    });
    set({ delve: { ...s.delve, goldEarned: s.delve.goldEarned + bonus } });
  },

  pickCampChoice: (choice) => {
    const s = get();
    const charSlice = useCharacterStore.getState();
    const character = charSlice.character;
    if (!character || !s.delve) return null;
    if (s.delve.campChoice) return null;

    let nextCharacter = character;
    const grantedBlessingId: string | null = null;
    if (choice === 'rest') {
      nextCharacter = longRest(character);
    }

    charSlice.setCharacter(nextCharacter);
    set({ delve: { ...s.delve, campChoice: choice } });
    return grantedBlessingId;
  },

  pickRestChoice: (choice, slot) => {
    const s = get();
    const charSlice = useCharacterStore.getState();
    const character = charSlice.character;
    if (!character || !s.delve) return false;
    if (s.delve.restChoice) return false;

    if (choice === 'hone') {
      if (!slot || !canHoneSlot(character, slot)) return false;
      charSlice.setCharacter(honeItem(character, slot));
    } else {
      // Rest: unchanged from today — 70% of max HP, refresh class resources.
      const healAmount = Math.floor(character.hp.max * 0.7);
      charSlice.setCharacter(shortRestHeal(character, healAmount));
    }

    set({ delve: { ...s.delve, restChoice: choice } });
    return true;
  },

  pickCampBoon: (tier, boonId) => {
    const s = get();
    const charSlice = useCharacterStore.getState();
    const character = charSlice.character;
    if (!character || !s.delve) return;
    const existing = s.delve.campBoons ?? [];
    if (existing.some((e) => e.tier === tier)) return;

    let nextCharacter: Character = character;
    const nextDelve: DelveState = {
      ...s.delve,
      campBoons: [...existing, { tier, boonId }],
    };

    if (boonId) {
      // Mirror onto the character so derived/combat reads stay simple.
      nextCharacter = {
        ...nextCharacter,
        campBoons: [...(nextCharacter.campBoons ?? []), boonId],
      };

      // Pick-time side effects — HP bumps, stabilise budget, Lich's Eyes flag.
      const boon = getCampBoon(boonId);
      if (boon.id === 'vigor-of-the-road') {
        const bump = Math.max(1, Math.floor(nextCharacter.hp.max * 0.05));
        nextCharacter = {
          ...nextCharacter,
          hp: {
            ...nextCharacter.hp,
            max: nextCharacter.hp.max + bump,
            current: nextCharacter.hp.current + bump,
          },
        };
      } else if (boon.id === 'mantle-of-the-slain') {
        const bump = nextCharacter.level;
        nextCharacter = {
          ...nextCharacter,
          hp: {
            ...nextCharacter.hp,
            max: nextCharacter.hp.max + bump,
            current: nextCharacter.hp.current + bump,
          },
        };
      } else if (boon.id === 'patience-of-ilmater') {
        nextCharacter = {
          ...nextCharacter,
          delveStabiliseBonus: (nextCharacter.delveStabiliseBonus ?? 0) + 1,
        };
      }
    }

    charSlice.setCharacter(nextCharacter);
    set({ delve: nextDelve });
  },

  resolveCampRisk: (riskTier) => {
    const s = get();
    const charSlice = useCharacterStore.getState();
    const character = charSlice.character;
    if (!character || !s.delve) return null;
    if (s.delve.campRisk) return null;

    const roller = getActiveRoller();
    const roll = roller.d20();
    let result: CampRiskResult;

    if (roll.total >= 11) {
      // The dark answers: a blessing's whisper, and coin pressed into the palm.
      const [blessingId] = rollBlessingOptions(roller, 1, character, character.blessings);
      const gold = blessingId ? 15 * riskTier : 50 * riskTier;
      if (blessingId) {
        charSlice.setCharacter({
          ...character,
          blessings: [...character.blessings, blessingId],
        });
      }
      get().addDelveReward(gold, 0);
      result = { roll: roll.total, outcome: 'win', blessingId: blessingId ?? null, gold, damage: 0 };
      // Achievement: the dark answered the campfire gamble.
      useMetaStore.getState().recordDarkGambleWin();
      runAchievementCheck();
    } else {
      // The dark takes its due. A campfire gamble bleeds you, but never kills.
      const damage = Math.max(1, Math.floor(character.hp.max * 0.25));
      charSlice.setCharacter({
        ...character,
        hp: { ...character.hp, current: Math.max(1, character.hp.current - damage) },
      });
      result = { roll: roll.total, outcome: 'loss', blessingId: null, gold: 0, damage };
    }

    set((cur) => (cur.delve ? { delve: { ...cur.delve, campRisk: result } } : cur));
    return result;
  },

  pickEliteChoice: (choice) => {
    const s = get();
    if (!s.delve || s.delve.eliteEngaged) return;
    if (choice === 'fight') {
      // Engage: the DelveScreen spawn-on-enter effect builds the encounter once
      // this flips. A win rolls the elite-only legendary drop in resolveRoomVictory.
      set({ delve: { ...s.delve, eliteEngaged: true } });
      return;
    }
    // 'gold': slip past with the hush-money — HALF the elite's purse (skipping
    // shouldn't pay like winning), then a parting blow (30% of max HP, cannot
    // kill). No fight, no XP, no loot, no relic. Keep the fraction + blow in sync
    // with EliteRoom's displayed numbers.
    const room = s.delve.rooms[s.delve.currentRoomIdx];
    const bounty = Math.round((room?.goldReward ?? 0) * 0.5);
    if (bounty > 0) get().addDelveReward(bounty, 0);
    const charSlice = useCharacterStore.getState();
    const character = charSlice.character;
    if (character) {
      const blow = Math.max(1, Math.round(character.hp.max * 0.3));
      const newCurrent = Math.max(1, character.hp.current - blow);
      charSlice.setCharacter({
        ...character,
        hp: { ...character.hp, current: newCurrent },
      });
    }
    // Achievement: a toll paid to slip past an elite (the coward's tithe).
    useMetaStore.getState().recordEliteGoldTaken();
    runAchievementCheck();
    get().advanceRoom();
  },

  purchaseFromMerchant: (itemId) => {
    const charSlice = useCharacterStore.getState();
    const character = charSlice.character;
    if (!character) return { ok: false, reason: 'No character.' };
    let item;
    try {
      item = getItem(itemId);
    } catch {
      return { ok: false, reason: 'Unknown item.' };
    }
    if (character.goldInPocket < item.cost) {
      return { ok: false, reason: 'Not enough gold.' };
    }
    charSlice.setCharacter({
      ...character,
      goldInPocket: character.goldInPocket - item.cost,
      inventory: [...character.inventory, { itemId }],
    });
    queueFirstGearTutorial();
    return { ok: true };
  },

  purchaseRolledGear: (ref, cost) => {
    const charSlice = useCharacterStore.getState();
    const character = charSlice.character;
    if (!character) return { ok: false, reason: 'No character.' };
    if (character.goldInPocket < cost) {
      return { ok: false, reason: 'Not enough gold.' };
    }
    charSlice.setCharacter({
      ...character,
      goldInPocket: character.goldInPocket - cost,
      inventory: [...character.inventory, ref],
    });
    queueFirstGearTutorial();
    return { ok: true };
  },

  purchaseLegendary: (legendaryId, cost) => {
    const charSlice = useCharacterStore.getState();
    const character = charSlice.character;
    if (!character) return { ok: false, reason: 'No character.' };
    if (character.goldInPocket < cost) return { ok: false, reason: 'Not enough gold.' };
    // Bank first so we never charge for a relic that can't be added.
    const banked = useMetaStore.getState().bankLegendary(legendaryId);
    if (!banked) return { ok: false, reason: 'Already in your reliquary.' };
    charSlice.setCharacter({
      ...character,
      goldInPocket: character.goldInPocket - cost,
    });
    return { ok: true };
  },

  recordShopPurchase: (roomId, key) =>
    set((s) => {
      const existing = s.purchasedShopKeys[roomId] ?? [];
      if (existing.includes(key)) return s;
      return {
        purchasedShopKeys: { ...s.purchasedShopKeys, [roomId]: [...existing, key] },
      };
    }),

  sellItem: (inventoryIdx) => {
    const charSlice = useCharacterStore.getState();
    const character = charSlice.character;
    if (!character) return { ok: false, reason: 'No character.' };
    const ref = character.inventory[inventoryIdx];
    if (!ref) return { ok: false, reason: 'No such item.' };
    // Set pieces are run-scoped loot now — sellable like rolled gear (the SET stays
    // unlocked, so it can always be re-bought). Worn gear can't be sold out from
    // under you — unequip it first. Resolve by
    // index (not object identity) so the guard still holds after a reload, where
    // the rehydrated equipped ref is a distinct object from the bag entry.
    if (equippedInventoryIndices(character).has(inventoryIdx)) {
      return { ok: false, reason: 'Unequip it first.' };
    }
    const gold = sellValue(ref);
    charSlice.setCharacter({
      ...character,
      inventory: character.inventory.filter((_, i) => i !== inventoryIdx),
      goldInPocket: character.goldInPocket + gold,
    });
    // Push onto the buyback stack so an accidental sale can be undone (until the
    // player leaves the shop, which clears it on room entry).
    set((s) => (s.delve ? { delve: { ...s.delve, recentlySold: [...(s.delve.recentlySold ?? []), ref] } } : s));
    return { ok: true, gold };
  },

  buyBackItem: (soldIndex) => {
    const s = get();
    const sold = s.delve?.recentlySold ?? [];
    const ref = sold[soldIndex];
    if (!s.delve || !ref) return { ok: false, reason: 'Nothing to buy back.' };
    const charSlice = useCharacterStore.getState();
    const character = charSlice.character;
    if (!character) return { ok: false, reason: 'No character.' };
    const cost = sellValue(ref);
    if (character.goldInPocket < cost) return { ok: false, reason: 'Not enough gold.' };
    charSlice.setCharacter({
      ...character,
      inventory: [...character.inventory, ref],
      goldInPocket: character.goldInPocket - cost,
    });
    set({ delve: { ...s.delve, recentlySold: sold.filter((_, i) => i !== soldIndex) } });
    return { ok: true, gold: cost };
  },

  clearLastLoot: () => set({ lastLoot: null }),
}));
