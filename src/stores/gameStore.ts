import { create, type StoreApi } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Character } from '../types/character';
import type { CombatState } from '../types/combat';
import type { DelveState, RoomSpec } from '../types/delve';
import type { Postmortem } from '../types/postmortem';
import { setActiveRoller } from '../engine/dice';
import {
  buildPlayerCharacter,
  presetCreationInput,
  carrySoulProgress,
  type CharacterCreationInput,
} from '../engine/character/defaultCharacter';
import { type ClassId } from '../schemas/ids';
import { getClass } from '../content/classes';
import type { ItemRef } from '../schemas/item';
import { type UnlockedUpgrades } from '../engine/character/upgrades';
import { type EquipSlot } from '../engine/character/equip';
import { useCharacterStore } from './characterStore';
import { useDelveStore, type LootSummary } from './delveStore';
import { useCombatStore } from './combatStore';
import { useMetaStore } from './metaStore';
import { useScreenStore, type Screen } from './screenStore';
import { migrateV1ToV2, SAVE_VERSION } from './persistMigration';
import { isFeatureUnlocked, newlyUnlockedClasses } from '../engine/progression/unlocks';
import { getTutorial } from '../content/tutorials';
import { loadDelveFactory } from '../engine/delve/loadDelveFactory';
import { TOTAL_CHAPTERS, BASE_GAME_CHAPTERS } from '../engine/delve/constants';
import type { TauntContext, SoulVoiceSpeaker } from '../components/lore/IrenicusTaunt';

export type { Screen };
export {
  RENOWN_PER_DELVE_CLEAR,
  RENOWN_PER_DELVE_FAILURE,
  RENOWN_PER_MOB_KILLED,
  RENOWN_PER_CHAPTER_BOSS,
  RENOWN_PER_ROOM_REACHED,
  GROVE_UNLOCK_THRESHOLD,
  computeDelveRenown,
} from './delveStore';

/** Save-slot ids. 0 = autosave, 1 & 2 = manual slots. */
export type SaveSlotId = 0 | 1 | 2;
export const SAVE_SLOT_IDS: SaveSlotId[] = [0, 1, 2];
const LEGACY_SAVE_KEY = 'godwake-save';
export const SAVE_SLOT_KEY_PREFIX = 'godwake-save-slot-';
function slotKey(slot: SaveSlotId): string {
  return `${SAVE_SLOT_KEY_PREFIX}${slot}`;
}

export interface SaveSlotMetadata {
  savedAt: string;
  characterName: string;
  characterLevel: number;
  characterClass: string;
  location: string;
  chapterCleared: number;
}

/** Pretty location label for the save-slot UI. */
function locationLabel(screen: Screen): string {
  switch (screen) {
    case 'title':
      return 'Title';
    case 'character-creation':
      return 'Soul-shaping';
    case 'intro':
      return 'Soul-bond intro';
    case 'hub':
      return 'Phandalin';
    case 'druid-grove':
      return 'Druid Grove';
    case 'codex':
      return 'Bestiary';
    case 'inventory':
      return 'Pack';
    case 'level-up':
      return 'Forge of Worlds';
    case 'delve':
      return 'In delve';
    case 'reincarnation':
      return 'Between lives';
    default:
      return String(screen);
  }
}

/** Migrate the legacy single-key save into slot 0. Runs once on module load. */
function migrateLegacySaveKey() {
  if (typeof localStorage === 'undefined') return;
  const legacy = localStorage.getItem(LEGACY_SAVE_KEY);
  if (!legacy) return;
  const targetKey = slotKey(0);
  if (!localStorage.getItem(targetKey)) {
    localStorage.setItem(targetKey, legacy);
  }
  localStorage.removeItem(LEGACY_SAVE_KEY);
}
migrateLegacySaveKey();

/**
 * Backward-compat facade. Mirrors the shape of the pre-split god store so
 * consumers (`useGameStore((s) => s.character)`) keep working without
 * change. State lives in five focused stores:
 *
 *   - useCharacterStore: character, saveSeed
 *   - useDelveStore:     delve + cross-slice run orchestrators
 *   - useCombatStore:    combat
 *   - useMetaStore:      meta progress (renown gates, codex, Grove)
 *   - useScreenStore:    routing + UI overlays
 *
 * The facade subscribes to each slice and mirrors into its own state so
 * Zustand selectors stay reactive. Actions delegate to the focused stores.
 *
 * Persistence: the facade owns the v2 persist on `godwake-save-slot-0`
 * (the legacy autosave key). Focused stores are not independently persisted
 * in this PR — see [[dd-roguelite-store-split-plan]] for why we kept one
 * root key + versioned slices. Save-slot ops (saveToSlot/loadFromSlot/etc.)
 * also gather/scatter through the facade.
 */
interface GameState {
  screen: Screen;
  saveSeed: string | null;
  character: Character | null;
  delve: DelveState | null;
  lastLoot: LootSummary | null;
  combat: CombatState | null;
  taunt: {
    speaker: SoulVoiceSpeaker;
    context: TauntContext;
    seed: number;
    chapter?: number;
    line?: string;
  } | null;
  /** Session-only queue of in-delve unlock tutorials pending (chapter reveals, first-gear; head shows first). */
  tutorialQueue: string[];
  /** Session-only queue of hub-surfaced unlock cards (delve-count axis); shown at the hub before a descent. */
  hubUnlockQueue: string[];
  introSeen: boolean;
  hasReincarnated: boolean;
  deathCount: number;
  quirksTutorialSeen: boolean;
  discoveredMonsters: string[];
  monsterEncounters: Record<string, number>;
  monsterDefeats: Record<string, number>;
  monsterKilledBy: Record<string, number>;
  monsterKillingAbilities: Record<string, Record<string, number>>;
  postmortem: Postmortem | null;
  unlockedUpgrades: UnlockedUpgrades;
  chaptersCleared: number;
  chapter1Cleared: boolean;
  druidGroveUnlocked: boolean;
  ascensionUnlocked: number;
  knownNpcs: string[];
  seenDialogueBeats: string[];
  seenTutorials: string[];
  delveCount: number;
  renownSpent: number;
  originClass: ClassId | null;
  ownedLegendaries: string[];
  activeLegendaries: string[];
  gameCompleted: boolean;
  selectedAscension: number;
  newGamePlusActive: boolean;
  throneCompleted: boolean;
  /** Session-only: inside the New Game+ run-launcher (see screenStore). */
  newGamePlusFlow: boolean;

  // Navigation
  goToTitle: () => void;
  goToHub: () => void;
  goToDelve: () => void;
  goToReincarnation: () => void;
  goToDruidGrove: () => void;
  goToCharacterSelect: () => void;
  /** Enter the New Game+ run-launcher (ascension-select → character-select → descend). */
  goToAscensionSelect: () => void;

  // Lifecycle
  startNewGame: (seed: string) => void;
  commitCharacterCreation: (input: CharacterCreationInput) => void;
  /**
   * Swap to a different class-character at the hub between runs. Re-creates the
   * vessel from the chosen class preset and carries the soul's renown, Grove
   * payloads, and quirks across. metaStore (the Grove ledger + renown gates) is
   * left untouched; the new character starts a fresh L1 run on the next descent.
   */
  selectCharacter: (classId: ClassId) => void;
  /**
   * New Game+ confirm: adopt the chosen class-soul (carrying renown/Grove/relics
   * like {@link selectCharacter}) and descend straight into a fresh run at the
   * stored `selectedAscension`, instead of returning to the hub.
   */
  selectCharacterAndDescend: (classId: ClassId) => void;

  // Character + combat
  setCharacter: (character: Character) => void;
  setCombat: (combat: CombatState | null) => void;

  // Delve flow
  startDelve: (delve: DelveState) => void;
  advanceRoom: () => void;
  chooseRoom: (nextId: string) => void;
  addDelveReward: (gold: number, xp: number, skipLevelUpRoute?: boolean) => void;
  grantTitheGold: (amount: number) => void;
  resolveRoomVictory: (room: RoomSpec) => void;
  finishDelve: () => void;
  failDelve: () => void;
  abandonDelve: () => void;
  markChapter1BossKilled: () => void;
  creditChapterClearGold: () => void;
  concludeDelveAtCamp: () => void;
  pickCampChoice: (choice: 'rest') => string | null;
  pickEliteChoice: (choice: 'fight' | 'gold') => void;
  pickCampBoon: (tier: number, boonId: string | null) => void;
  purchaseFromMerchant: (itemId: string) => { ok: boolean; reason?: string };
  purchaseRolledGear: (ref: ItemRef, cost: number) => { ok: boolean; reason?: string };
  purchaseLegendary: (legendaryId: string, cost: number) => { ok: boolean; reason?: string };
  sellItem: (inventoryIdx: number) => { ok: boolean; reason?: string; gold?: number };
  acceptSpoils: () => void;
  clearLastLoot: () => void;

  // Lore overlays
  showTaunt: (speaker: SoulVoiceSpeaker, context: TauntContext, chapter?: number) => void;
  dismissTaunt: () => void;
  /** Dismiss the head unlock tutorial: mark it seen (persisted) and shift the queue. */
  dismissTutorial: () => void;
  /** Dismiss the head HUB unlock card: mark it seen and shift; the parked descent resumes once the last clears. */
  dismissHubTutorial: () => void;
  markIntroSeen: () => void;

  // Codex
  discoverMonster: (defId: string) => void;
  recordMonsterDefeat: (defId: string) => void;
  recordPlayerKilledBy: (defId: string, abilityName?: string) => void;
  goToCodex: () => void;

  // Postmortem (transient, cleared on REINCARNATE)
  setPostmortem: (p: Postmortem | null) => void;
  clearPostmortem: () => void;

  // Inventory
  goToInventory: () => void;
  equipFromInventory: (inventoryIdx: number) => void;
  equipToSlot: (inventoryIdx: number, slot: EquipSlot) => void;
  unequipSlot: (slot: EquipSlot) => void;

  // Blessings
  addBlessing: (id: string) => void;

  // Tutorials
  markQuirksTutorialSeen: () => void;
  markDialogueBeatSeen: (beatId: string) => void;
  markTutorialSeen: (tutorialId: string) => void;

  // Renown shop
  purchaseUpgrade: (upgradeId: string) => { ok: boolean; reason?: string };

  // Legendary relics
  setActiveLegendaries: (ids: string[]) => void;

  // Ending capstone
  markGameCompleted: () => void;

  // Ascension run-config (New Game+ flow)
  /**
   * New Game+ ascension-select confirm: store the run's ascension level and
   * advance to character-select, keeping the run-launcher flow active so the
   * char-select confirm descends rather than returning to the hub.
   */
  confirmAscensionSelection: (level: number) => void;

  // Leveling
  applyPendingLevelUp: (overrides?: Partial<Character>) => void;

  // Save slots
  saveToSlot: (slot: SaveSlotId) => { ok: boolean; reason?: string };
  loadFromSlot: (slot: SaveSlotId) => { ok: boolean; reason?: string };
  deleteSlot: (slot: SaveSlotId) => void;
  exportSlot: (slot: SaveSlotId) => string | null;
  importToSlot: (slot: 1 | 2, json: string) => { ok: boolean; reason?: string };
}

interface PersistedSnapshot {
  screen: Screen;
  saveSeed: string | null;
  character: Character | null;
  introSeen: boolean;
  hasReincarnated: boolean;
  deathCount: number;
  quirksTutorialSeen: boolean;
  discoveredMonsters: string[];
  monsterEncounters: Record<string, number>;
  monsterDefeats: Record<string, number>;
  monsterKilledBy: Record<string, number>;
  monsterKillingAbilities: Record<string, Record<string, number>>;
  unlockedUpgrades: UnlockedUpgrades;
  chaptersCleared: number;
  chapter1Cleared: boolean;
  druidGroveUnlocked: boolean;
  ascensionUnlocked: number;
  knownNpcs: string[];
  seenDialogueBeats: string[];
  seenTutorials: string[];
  delveCount: number;
  renownSpent: number;
  originClass: ClassId | null;
  ownedLegendaries: string[];
  activeLegendaries: string[];
  gameCompleted: boolean;
  selectedAscension: number;
  newGamePlusActive: boolean;
  throneCompleted: boolean;
  __metadata?: SaveSlotMetadata;
}

interface SlotWrapper {
  state: PersistedSnapshot;
  version: number;
}

/** Gather a snapshot from all focused stores for persistence / save-slot ops. */
function gatherSnapshot(screenOverride?: Screen): PersistedSnapshot {
  const ch = useCharacterStore.getState();
  const screen = useScreenStore.getState();
  const meta = useMetaStore.getState();
  const screenForSave =
    screenOverride ??
    (screen.screen === 'delve' ||
    screen.screen === 'spoils' ||
    screen.screen === 'reincarnation' ||
    screen.screen === 'ending' ||
    screen.screen === 'level-up'
      ? 'hub'
      : screen.screen);
  return {
    screen: screenForSave,
    saveSeed: ch.saveSeed,
    character: ch.character,
    introSeen: screen.introSeen,
    hasReincarnated: meta.hasReincarnated,
    deathCount: meta.deathCount,
    quirksTutorialSeen: screen.quirksTutorialSeen,
    discoveredMonsters: meta.discoveredMonsters,
    monsterEncounters: meta.monsterEncounters,
    monsterDefeats: meta.monsterDefeats,
    monsterKilledBy: meta.monsterKilledBy,
    monsterKillingAbilities: meta.monsterKillingAbilities,
    unlockedUpgrades: meta.unlockedUpgrades,
    chaptersCleared: meta.chaptersCleared,
    chapter1Cleared: meta.chapter1Cleared,
    druidGroveUnlocked: meta.druidGroveUnlocked,
    ascensionUnlocked: meta.ascensionUnlocked,
    knownNpcs: meta.knownNpcs,
    seenDialogueBeats: meta.seenDialogueBeats,
    seenTutorials: meta.seenTutorials,
    delveCount: meta.delveCount,
    renownSpent: meta.renownSpent,
    originClass: meta.originClass,
    ownedLegendaries: meta.ownedLegendaries,
    activeLegendaries: meta.activeLegendaries,
    gameCompleted: meta.gameCompleted,
    selectedAscension: meta.selectedAscension,
    newGamePlusActive: meta.newGamePlusActive,
    throneCompleted: meta.throneCompleted,
    __metadata: {
      savedAt: new Date().toISOString(),
      characterName: ch.character?.name ?? '—',
      characterLevel: ch.character?.level ?? 0,
      characterClass: ch.character ? getClass(ch.character.classId).name : '—',
      location: locationLabel(screen.screen),
      chapterCleared: meta.chaptersCleared,
    },
  };
}

/** Apply a (post-migration) snapshot to the focused stores. */
function scatterSnapshot(s: PersistedSnapshot) {
  // Settings/audio stores have their own persistence and are not touched by
  // slot loads. Combat/delve are session-only — always reset.
  useCharacterStore.setState({
    character: s.character ?? null,
    saveSeed: s.saveSeed ?? null,
  });
  // High-water chapter mark, deriving from the legacy chapter1Cleared boolean
  // for pre-progression saves. `>= BASE_GAME_CHAPTERS` means the base chain fell
  // (Irenicus); `>= TOTAL_CHAPTERS` means the Throne fell too.
  const chaptersClearedValue =
    typeof s.chaptersCleared === 'number'
      ? s.chaptersCleared
      : s.chapter1Cleared
        ? 1
        : 0;
  useMetaStore.setState({
    hasReincarnated: !!s.hasReincarnated,
    deathCount: typeof s.deathCount === 'number' ? s.deathCount : 0,
    discoveredMonsters: Array.isArray(s.discoveredMonsters) ? s.discoveredMonsters : [],
    monsterEncounters:
      s.monsterEncounters && typeof s.monsterEncounters === 'object'
        ? s.monsterEncounters
        : {},
    monsterDefeats:
      s.monsterDefeats && typeof s.monsterDefeats === 'object'
        ? s.monsterDefeats
        : {},
    monsterKilledBy:
      s.monsterKilledBy && typeof s.monsterKilledBy === 'object'
        ? s.monsterKilledBy
        : {},
    monsterKillingAbilities:
      s.monsterKillingAbilities && typeof s.monsterKillingAbilities === 'object'
        ? s.monsterKillingAbilities
        : {},
    unlockedUpgrades: s.unlockedUpgrades ?? {},
    // Old saves predate the progression model — derive the high-water mark
    // from the legacy boolean so a prior chapter-1 clear isn't lost.
    chaptersCleared: chaptersClearedValue,
    chapter1Cleared: !!s.chapter1Cleared,
    druidGroveUnlocked: !!s.druidGroveUnlocked,
    ascensionUnlocked:
      typeof s.ascensionUnlocked === 'number' && s.ascensionUnlocked >= 0
        ? s.ascensionUnlocked
        : 0,
    knownNpcs: Array.isArray(s.knownNpcs) ? s.knownNpcs : [],
    seenDialogueBeats: Array.isArray(s.seenDialogueBeats) ? s.seenDialogueBeats : [],
    seenTutorials: Array.isArray(s.seenTutorials) ? s.seenTutorials : [],
    // Post-migration this is always present (a veteran's missing field floors
    // to 999, a fresh/wiped save to 0); the guard only catches malformed data.
    delveCount: typeof s.delveCount === 'number' ? s.delveCount : 0,
    // Cumulative renown spent paces the class-unlock ladder. Older saves predate
    // it → 0 (no back-credit for past spends; saves are disposable in dev).
    renownSpent: typeof s.renownSpent === 'number' && s.renownSpent >= 0 ? s.renownSpent : 0,
    // Origin starter anchors the relative unlock ladder. Pre-relative saves lack
    // it → fall back to the worn body's class (null with no soul yet, so the
    // first forge stamps it cleanly).
    originClass: s.originClass ?? s.character?.classId ?? null,
    ownedLegendaries: Array.isArray(s.ownedLegendaries) ? s.ownedLegendaries : [],
    activeLegendaries: Array.isArray(s.activeLegendaries) ? s.activeLegendaries : [],
    // Recovery: a save whose deepest run cleared the BASE chain (Irenicus, Ch11)
    // but never flipped gameCompleted — e.g. an older build whose lazy ending
    // screen crashed before recording it — has beaten the base game. Restore the
    // flag on load so the player gets their New Game+ and isn't dropped back into
    // a finished run. A run that cleared the full chain (Melissan, Ch14) likewise
    // recovers the Throne milestone.
    gameCompleted: !!s.gameCompleted || chaptersClearedValue >= BASE_GAME_CHAPTERS,
    throneCompleted: !!s.throneCompleted || chaptersClearedValue >= TOTAL_CHAPTERS,
    // Campaign mode is per-campaign, not mastery: an old save defaults to a base
    // campaign (the player re-enters NG+ from the title, which re-sets this).
    newGamePlusActive: !!s.newGamePlusActive,
    selectedAscension:
      typeof s.selectedAscension === 'number' && s.selectedAscension >= 0
        ? s.selectedAscension
        : 0,
  });
  useScreenStore.setState({
    screen: (s.screen ?? 'hub') as Screen,
    introSeen: !!s.introSeen,
    quirksTutorialSeen: !!s.quirksTutorialSeen,
    newGamePlusFlow: false,
    taunt: null,
    tutorialQueue: [],
    hubUnlockQueue: [],
    pendingDescent: false,
    postmortem: null,
  });
  useDelveStore.setState({ delve: null });
  useCombatStore.setState({ combat: null });
  if (s.saveSeed) setActiveRoller(s.saveSeed);
  // Re-bake the equipped-legendary effect payloads onto the loaded character
  // (and drop any off-class relics the current class can't equip). Idempotent
  // for current saves; for pre-v10 saves it converts the stripped stat field to
  // the new effect form so equipped relics actually apply.
  useMetaStore.getState().setActiveLegendaries(useMetaStore.getState().activeLegendaries);
}

/**
 * Adopt a class-soul: build a fresh vessel from the class preset and carry the
 * existing soul's renown / Grove payloads / quirks onto it (or use it bare for a
 * brand-new soul), then re-validate equipped relics against the new class. Shared
 * by the hub swap ({@link GameState.selectCharacter}) and the New Game+ descend
 * launcher ({@link GameState.selectCharacterAndDescend}).
 */
function adoptSoul(classId: ClassId) {
  const charSlice = useCharacterStore.getState();
  const soul = charSlice.character;
  const fresh = buildPlayerCharacter(presetCreationInput(classId));
  charSlice.setCharacter(soul ? carrySoulProgress(fresh, soul) : fresh);
  // Class-bound relics the new body can't wield drop; the effect payloads re-bake.
  useMetaStore.getState().setActiveLegendaries(useMetaStore.getState().activeLegendaries);
}

/**
 * Queue the one-time "a new soul surfaced" reveal for every class whose
 * renown-spent bar a Grove purchase just crossed (prevSpent → nextSpent), relative
 * to the soul's origin starter. Deduped against seenTutorials and the worn class;
 * surfaced on the general tutorial queue so the card pops right at the Grove. The
 * delve-axis FEATURE reveals stay in delveStore (queueUnlockTutorials).
 *
 * The 'class-roster' soul-swapping explainer rides ALONG WITH the very first
 * alternate soul that ever surfaces (combined, first time only) — so it lands the
 * instant a roster body actually opens, naming it, never as a premature teaser.
 * Once seen it's done; later unlocks just name the new soul.
 */
function queueClassUnlockReveals(prevSpent: number, nextSpent: number) {
  if (nextSpent <= prevSpent) return;
  const meta = useMetaStore.getState();
  const currentClass = useCharacterStore.getState().character?.classId;
  const origin = meta.originClass ?? currentClass ?? null;
  if (!origin) return;
  const seen = meta.seenTutorials;
  const reveals = newlyUnlockedClasses(prevSpent, nextSpent, origin).filter(
    (id) => id !== currentClass && getTutorial(id) !== undefined && !seen.includes(id),
  );
  if (reveals.length === 0) return;
  const withRoster =
    seen.includes('class-roster') ? reveals : ['class-roster', ...reveals];
  useScreenStore.getState().enqueueTutorials(withRoster);
}

function readSlotWrapper(slot: SaveSlotId): SlotWrapper | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(slotKey(slot));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SlotWrapper;
    if (!parsed || typeof parsed !== 'object' || !parsed.state) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Read-only inspector for the save-slot UI. */
export function getSlotMetadata(slot: SaveSlotId): SaveSlotMetadata | null {
  const wrapper = readSlotWrapper(slot);
  return wrapper?.state.__metadata ?? null;
}

export function hasAnySave(): boolean {
  // A pristine install autosaves the default title state immediately, so a bare
  // wrapper isn't a real save. Only count slots where a soul has been forged.
  return SAVE_SLOT_IDS.some((s) => {
    const meta = getSlotMetadata(s);
    return meta != null && meta.characterLevel >= 1;
  });
}

/** True only when the autosave (slot 0) holds an active soul. */
export function hasAutosave(): boolean {
  const meta = getSlotMetadata(0);
  return meta != null && meta.characterLevel >= 1;
}

export const useGameStore = create<GameState>()(
  persist(
    (set) => {
      // Mirror focused stores into the facade so consumers see reactive
      // updates via the existing useGameStore selectors.
      const mirrorCharacter = () => {
        const c = useCharacterStore.getState();
        set({ character: c.character, saveSeed: c.saveSeed });
      };
      const mirrorDelve = () => {
        const d = useDelveStore.getState();
        set({ delve: d.delve, lastLoot: d.lastLoot });
      };
      const mirrorCombat = () =>
        set({ combat: useCombatStore.getState().combat });
      const mirrorMeta = () => {
        const m = useMetaStore.getState();
        set({
          hasReincarnated: m.hasReincarnated,
          deathCount: m.deathCount,
          discoveredMonsters: m.discoveredMonsters,
          monsterEncounters: m.monsterEncounters,
          monsterDefeats: m.monsterDefeats,
          monsterKilledBy: m.monsterKilledBy,
          monsterKillingAbilities: m.monsterKillingAbilities,
          unlockedUpgrades: m.unlockedUpgrades,
          chaptersCleared: m.chaptersCleared,
          chapter1Cleared: m.chapter1Cleared,
          ascensionUnlocked: m.ascensionUnlocked,
          knownNpcs: m.knownNpcs,
          seenDialogueBeats: m.seenDialogueBeats,
          seenTutorials: m.seenTutorials,
          delveCount: m.delveCount,
          renownSpent: m.renownSpent,
          originClass: m.originClass,
          druidGroveUnlocked: m.druidGroveUnlocked,
          ownedLegendaries: m.ownedLegendaries,
          activeLegendaries: m.activeLegendaries,
          gameCompleted: m.gameCompleted,
          selectedAscension: m.selectedAscension,
          newGamePlusActive: m.newGamePlusActive,
          throneCompleted: m.throneCompleted,
        });
      };
      const mirrorScreen = () => {
        const sc = useScreenStore.getState();
        set({
          screen: sc.screen,
          introSeen: sc.introSeen,
          quirksTutorialSeen: sc.quirksTutorialSeen,
          newGamePlusFlow: sc.newGamePlusFlow,
          taunt: sc.taunt,
          tutorialQueue: sc.tutorialQueue,
          hubUnlockQueue: sc.hubUnlockQueue,
          postmortem: sc.postmortem,
        });
      };

      useCharacterStore.subscribe(mirrorCharacter);
      useDelveStore.subscribe(mirrorDelve);
      useCombatStore.subscribe(mirrorCombat);
      useMetaStore.subscribe(mirrorMeta);
      useScreenStore.subscribe(mirrorScreen);

      return {
        // Initial state pulled from focused stores.
        screen: useScreenStore.getState().screen,
        saveSeed: useCharacterStore.getState().saveSeed,
        character: useCharacterStore.getState().character,
        delve: useDelveStore.getState().delve,
        lastLoot: useDelveStore.getState().lastLoot,
        combat: useCombatStore.getState().combat,
        taunt: useScreenStore.getState().taunt,
        tutorialQueue: useScreenStore.getState().tutorialQueue,
        hubUnlockQueue: useScreenStore.getState().hubUnlockQueue,
        introSeen: useScreenStore.getState().introSeen,
        hasReincarnated: useMetaStore.getState().hasReincarnated,
        deathCount: useMetaStore.getState().deathCount,
        quirksTutorialSeen: useScreenStore.getState().quirksTutorialSeen,
        discoveredMonsters: useMetaStore.getState().discoveredMonsters,
        monsterEncounters: useMetaStore.getState().monsterEncounters,
        monsterDefeats: useMetaStore.getState().monsterDefeats,
        monsterKilledBy: useMetaStore.getState().monsterKilledBy,
        monsterKillingAbilities: useMetaStore.getState().monsterKillingAbilities,
        postmortem: useScreenStore.getState().postmortem,
        unlockedUpgrades: useMetaStore.getState().unlockedUpgrades,
        chaptersCleared: useMetaStore.getState().chaptersCleared,
        chapter1Cleared: useMetaStore.getState().chapter1Cleared,
        druidGroveUnlocked: useMetaStore.getState().druidGroveUnlocked,
        ascensionUnlocked: useMetaStore.getState().ascensionUnlocked,
        knownNpcs: useMetaStore.getState().knownNpcs,
        seenDialogueBeats: useMetaStore.getState().seenDialogueBeats,
        seenTutorials: useMetaStore.getState().seenTutorials,
        delveCount: useMetaStore.getState().delveCount,
        renownSpent: useMetaStore.getState().renownSpent,
        originClass: useMetaStore.getState().originClass,
        ownedLegendaries: useMetaStore.getState().ownedLegendaries,
        activeLegendaries: useMetaStore.getState().activeLegendaries,
        gameCompleted: useMetaStore.getState().gameCompleted,
        selectedAscension: useMetaStore.getState().selectedAscension,
        newGamePlusActive: useMetaStore.getState().newGamePlusActive,
        throneCompleted: useMetaStore.getState().throneCompleted,
        newGamePlusFlow: useScreenStore.getState().newGamePlusFlow,

        goToTitle: () => useScreenStore.getState().goToTitle(),
        goToHub: () => useScreenStore.getState().goToHub(),
        goToDelve: () => useScreenStore.getState().goToDelve(),
        goToReincarnation: () => {
          useScreenStore.getState().goToReincarnation();
          useMetaStore.getState().incrementDeathCount();
        },
        goToDruidGrove: () => useScreenStore.getState().goToDruidGrove(),
        goToCharacterSelect: () =>
          useScreenStore.setState({ screen: 'character-creation', newGamePlusFlow: false }),
        goToAscensionSelect: () => useScreenStore.getState().goToAscensionSelect(),
        goToCodex: () => useScreenStore.getState().goToCodex(),
        goToInventory: () => useScreenStore.getState().goToInventory(),

        startNewGame: (seed) => {
          setActiveRoller(seed);
          // Account-level mastery is permanent: beating the base game (and the
          // Throne) once keeps the New Game+ entry + ascension ladder open across
          // a fresh base run. Carry those mastery flags over the wipe. Everything
          // else resets to a clean Ascension-0 start — including the campaign
          // mode: resetMeta drops newGamePlusActive to false, so a New Game is a
          // BASE run (Cells→Irenicus) even for a veteran.
          const prevMeta = useMetaStore.getState();
          const { gameCompleted, ascensionUnlocked, throneCompleted } = prevMeta;
          useCharacterStore.setState({ character: null, saveSeed: seed });
          useDelveStore.setState({ delve: null });
          useCombatStore.setState({ combat: null });
          prevMeta.resetMeta();
          useMetaStore.setState({ gameCompleted, ascensionUnlocked, throneCompleted });
          useScreenStore.setState({
            screen: 'character-creation',
            introSeen: false,
            quirksTutorialSeen: false,
            newGamePlusFlow: false,
            taunt: null,
            tauntQueue: [],
            tutorialQueue: [],
            hubUnlockQueue: [],
            pendingDescent: false,
            postmortem: null,
          });
        },

        commitCharacterCreation: (input) => {
          useCharacterStore.getState().commitCharacterCreation(input);
          // Stamp the soul's origin starter ONCE — it anchors the relative
          // unlock ladder and rides every reincarnation (write-once setter).
          useMetaStore.getState().setOriginClass(input.classId);
        },

        selectCharacter: (classId) => {
          adoptSoul(classId);
          useScreenStore.getState().setScreen('hub');
        },

        selectCharacterAndDescend: async (classId) => {
          adoptSoul(classId);
          const meta = useMetaStore.getState();
          // The New Game+ launcher's descent: mark the campaign NG+ so every later
          // hub re-descent (after a death) also builds the full chain, and build
          // the full Cells→Throne chain for this first New Game+ life.
          meta.setNewGamePlusActive(true);
          const elitesEnabled = isFeatureUnlocked('elite-nodes', {
            delveCount: meta.delveCount,
            chaptersCleared: meta.chaptersCleared,
            renownSpent: meta.renownSpent,
            druidGroveUnlocked: meta.druidGroveUnlocked,
          });
          const createGodwakeDelve = await loadDelveFactory();
          if (!createGodwakeDelve) return; // chunk load failed — recovery reload in flight
          const delve = createGodwakeDelve({
            ascension: meta.selectedAscension,
            elitesEnabled,
            fullChain: true,
          });
          useScreenStore.setState({ newGamePlusFlow: false });
          useDelveStore.getState().startDelve(delve);
        },

        setCharacter: (character) =>
          useCharacterStore.getState().setCharacter(character),
        setCombat: (combat) => useCombatStore.getState().setCombat(combat),

        startDelve: (delve) => useDelveStore.getState().startDelve(delve),
        advanceRoom: () => useDelveStore.getState().advanceRoom(),
        chooseRoom: (nextId) => useDelveStore.getState().chooseRoom(nextId),
        addDelveReward: (gold, xp, skipLevelUpRoute) =>
          useDelveStore.getState().addDelveReward(gold, xp, skipLevelUpRoute),
        grantTitheGold: (amount) =>
          useDelveStore.getState().grantTitheGold(amount),
        resolveRoomVictory: (room) =>
          useDelveStore.getState().resolveRoomVictory(room),
        finishDelve: () => useDelveStore.getState().finishDelve(),
        failDelve: () => useDelveStore.getState().failDelve(),
        abandonDelve: () => useDelveStore.getState().abandonDelve(),
        markChapter1BossKilled: () =>
          useDelveStore.getState().markChapter1BossKilled(),
        creditChapterClearGold: () =>
          useDelveStore.getState().creditChapterClearGold(),
        concludeDelveAtCamp: () =>
          useDelveStore.getState().concludeDelveAtCamp(),
        pickCampChoice: (choice) =>
          useDelveStore.getState().pickCampChoice(choice),
        pickEliteChoice: (choice) =>
          useDelveStore.getState().pickEliteChoice(choice),
        pickCampBoon: (tier, boonId) =>
          useDelveStore.getState().pickCampBoon(tier, boonId),
        purchaseFromMerchant: (itemId) =>
          useDelveStore.getState().purchaseFromMerchant(itemId),
        purchaseRolledGear: (ref, cost) =>
          useDelveStore.getState().purchaseRolledGear(ref, cost),
        purchaseLegendary: (legendaryId, cost) =>
          useDelveStore.getState().purchaseLegendary(legendaryId, cost),
        sellItem: (idx) => useDelveStore.getState().sellItem(idx),
        acceptSpoils: () => useDelveStore.getState().acceptSpoils(),
        clearLastLoot: () => useDelveStore.getState().clearLastLoot(),

        showTaunt: (speaker, context, chapter) =>
          useScreenStore.getState().showTaunt(speaker, context, chapter),
        dismissTaunt: () => useScreenStore.getState().dismissTaunt(),
        dismissTutorial: () => {
          const sc = useScreenStore.getState();
          const head = sc.tutorialQueue[0];
          if (head) useMetaStore.getState().markTutorialSeen(head);
          sc.shiftTutorial();
        },
        dismissHubTutorial: () => {
          const sc = useScreenStore.getState();
          const head = sc.hubUnlockQueue[0];
          if (head) useMetaStore.getState().markTutorialSeen(head);
          // Resumes a parked descent into the delve when the last hub card clears.
          sc.shiftHubUnlock();
        },
        markIntroSeen: async () => {
          useScreenStore.getState().setIntroSeen(true);
          // First incarnation: drop the player straight into the cells.
          // On subsequent reincarnations the intro doesn't replay, so this
          // only fires for the very first life.
          const meta = useMetaStore.getState();
          const ch = useCharacterStore.getState().character;
          if (!meta.hasReincarnated && ch) {
            const createGodwakeDelve = await loadDelveFactory();
            if (!createGodwakeDelve) return; // chunk load failed — recovery reload in flight
            useDelveStore.getState().startDelve(createGodwakeDelve());
          } else {
            useScreenStore.getState().setScreen('hub');
          }
        },

        discoverMonster: (defId) =>
          useMetaStore.getState().discoverMonster(defId),
        recordMonsterDefeat: (defId) =>
          useMetaStore.getState().recordMonsterDefeat(defId),
        recordPlayerKilledBy: (defId, abilityName) =>
          useMetaStore.getState().recordPlayerKilledBy(defId, abilityName),

        setPostmortem: (p) => useScreenStore.getState().setPostmortem(p),
        clearPostmortem: () => useScreenStore.getState().clearPostmortem(),

        equipFromInventory: (idx) =>
          useCharacterStore.getState().equipFromInventory(idx),
        equipToSlot: (idx, slot) => useCharacterStore.getState().equipToSlot(idx, slot),
        unequipSlot: (slot) => useCharacterStore.getState().unequipSlot(slot),
        addBlessing: (id) => useCharacterStore.getState().addBlessing(id),

        markQuirksTutorialSeen: () =>
          useScreenStore.getState().markQuirksTutorialSeen(),

        markDialogueBeatSeen: (beatId) =>
          useMetaStore.getState().markDialogueBeatSeen(beatId),

        markTutorialSeen: (tutorialId) =>
          useMetaStore.getState().markTutorialSeen(tutorialId),

        purchaseUpgrade: (upgradeId) => {
          // A Grove purchase is the only renown sink, so it's the one place the
          // class-unlock ladder can advance — fire any soul reveal it just earned.
          const prevSpent = useMetaStore.getState().renownSpent;
          const res = useMetaStore.getState().purchaseUpgrade(upgradeId);
          if (res.ok) queueClassUnlockReveals(prevSpent, useMetaStore.getState().renownSpent);
          return res;
        },

        setActiveLegendaries: (ids) =>
          useMetaStore.getState().setActiveLegendaries(ids),

        markGameCompleted: () => useMetaStore.getState().markGameCompleted(),

        confirmAscensionSelection: (level) => {
          useMetaStore.getState().setSelectedAscension(level);
          useScreenStore.setState({ screen: 'character-creation', newGamePlusFlow: true });
        },

        applyPendingLevelUp: (overrides) => {
          // Mid-delve level-ups resume the delve screen; out-of-delve fall
          // back to hub (legacy / shouldn't happen post-Hades-pivot).
          const resumeIfDelve = useDelveStore.getState().delve !== null;
          useCharacterStore
            .getState()
            .applyPendingLevelUp(overrides, resumeIfDelve);
        },

        saveToSlot: (slot) => {
          if (typeof localStorage === 'undefined')
            return { ok: false, reason: 'No storage.' };
          const snapshot = gatherSnapshot();
          try {
            const wrapper: SlotWrapper = { state: snapshot, version: SAVE_VERSION };
            localStorage.setItem(slotKey(slot), JSON.stringify(wrapper));
            return { ok: true };
          } catch (e) {
            return {
              ok: false,
              reason: e instanceof Error ? e.message : 'Save failed.',
            };
          }
        },

        loadFromSlot: (slot) => {
          const wrapper = readSlotWrapper(slot);
          if (!wrapper) return { ok: false, reason: 'Empty slot.' };
          // Migrate older slot wrappers in flight so a slot saved on a prior
          // build loads cleanly on the new build.
          const migrated =
            (wrapper.version ?? 1) < SAVE_VERSION
              ? (migrateV1ToV2({ ...wrapper.state } as unknown as Record<string, unknown>) as unknown as PersistedSnapshot)
              : wrapper.state;
          scatterSnapshot(migrated);
          return { ok: true };
        },

        deleteSlot: (slot) => {
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(slotKey(slot));
          }
          if (slot === 0) {
            useCharacterStore.setState({ character: null, saveSeed: null });
            useDelveStore.setState({ delve: null });
            useCombatStore.setState({ combat: null });
            useMetaStore.getState().resetMeta();
            useScreenStore.setState({
              screen: 'title',
              introSeen: false,
              quirksTutorialSeen: false,
              taunt: null,
              tauntQueue: [],
              tutorialQueue: [],
              hubUnlockQueue: [],
              pendingDescent: false,
              postmortem: null,
            });
          }
        },

        exportSlot: (slot) => {
          const wrapper = readSlotWrapper(slot);
          if (!wrapper) return null;
          return JSON.stringify(wrapper, null, 2);
        },

        importToSlot: (slot, json) => {
          if (typeof localStorage === 'undefined')
            return { ok: false, reason: 'No storage.' };
          let parsed: unknown;
          try {
            parsed = JSON.parse(json);
          } catch {
            return { ok: false, reason: 'Not valid JSON.' };
          }
          const candidate = parsed as Partial<SlotWrapper>;
          if (!candidate || typeof candidate !== 'object' || !candidate.state) {
            return { ok: false, reason: 'Missing save payload.' };
          }
          try {
            localStorage.setItem(
              slotKey(slot),
              JSON.stringify({
                state: candidate.state,
                version: candidate.version ?? 1,
              }),
            );
            return { ok: true };
          } catch (e) {
            return {
              ok: false,
              reason: e instanceof Error ? e.message : 'Import failed.',
            };
          }
        },
      };
    },
    {
      name: slotKey(0),
      storage: createJSONStorage(() => localStorage),
      // Persist only the long-term snapshot; delve/combat are session-scoped.
      partialize: () => gatherSnapshot() as unknown as GameState,
      version: SAVE_VERSION,
      migrate: (persistedState, version) => {
        if (version < SAVE_VERSION) {
          const s = { ...(persistedState as unknown as Record<string, unknown>) };
          return migrateV1ToV2(s) as unknown as GameState;
        }
        return persistedState as GameState;
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Persist rehydrated into the facade state shape. Scatter to the
        // focused stores so they own the data going forward.
        const snap = { ...(state as unknown as Record<string, unknown>) };
        // Re-run the migration in case the in-memory state predates the
        // migrate-function wiring (defensive — the path is the slot wrapper).
        const migrated = migrateV1ToV2(snap);
        scatterSnapshot(migrated as unknown as PersistedSnapshot);
      },
    },
  ),
) satisfies StoreApi<GameState>;
