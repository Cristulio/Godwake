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
import type { ItemRef, GearRarity } from '../schemas/item';
import { type UnlockedUpgrades } from '../engine/character/upgrades';
import { type EquipSlot } from '../engine/character/equip';
import { createGodwakeDelve } from '../engine/delve';
import { useCharacterStore } from './characterStore';
import { useDelveStore } from './delveStore';
import { useCombatStore } from './combatStore';
import { useMetaStore } from './metaStore';
import { useScreenStore, type Screen } from './screenStore';
import { migrateV1ToV2, SAVE_VERSION } from './persistMigration';
import type { TauntContext, SoulVoiceSpeaker } from '../components/lore/IrenicusTaunt';

export type { Screen };
export {
  RENOWN_PER_DELVE_CLEAR,
  RENOWN_PER_DELVE_FAILURE,
  RENOWN_PER_CHAPTER_BOSS,
  RENOWN_PER_ROOM_REACHED,
  GROVE_UNLOCK_THRESHOLD,
  RENOWN_FOR_CHAPTER_2,
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
  lastLoot: { name: string; rarity: GearRarity; banked?: boolean } | null;
  combat: CombatState | null;
  taunt: { speaker: SoulVoiceSpeaker; context: TauntContext; seed: number; chapter?: number } | null;
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
  ownedLegendaries: string[];
  activeLegendaries: string[];

  // Navigation
  goToTitle: () => void;
  goToHub: () => void;
  goToDelve: () => void;
  goToReincarnation: () => void;
  goToDruidGrove: () => void;
  goToCharacterSelect: () => void;

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

  // Character + combat
  setCharacter: (character: Character) => void;
  setCombat: (combat: CombatState | null) => void;

  // Delve flow
  startDelve: (delve: DelveState) => void;
  advanceRoom: () => void;
  chooseRoom: (nextId: string) => void;
  addDelveReward: (gold: number, xp: number) => void;
  grantTitheGold: (amount: number) => void;
  resolveRoomVictory: (room: RoomSpec) => void;
  finishDelve: () => void;
  failDelve: () => void;
  abandonDelve: () => void;
  markChapter1BossKilled: () => void;
  creditChapterClearGold: () => void;
  concludeDelveAtCamp: () => void;
  pickCampChoice: (choice: 'rest' | 'sharpen' | 'prayer') => string | null;
  pickCampBoon: (tier: number, boonId: string | null) => void;
  consumeLichEyes: () => void;
  purchaseFromMerchant: (itemId: string) => { ok: boolean; reason?: string };
  purchaseRolledGear: (ref: ItemRef, cost: number) => { ok: boolean; reason?: string };
  purchaseLegendary: (legendaryId: string, cost: number) => { ok: boolean; reason?: string };
  clearLastLoot: () => void;

  // Lore overlays
  showTaunt: (speaker: SoulVoiceSpeaker, context: TauntContext, chapter?: number) => void;
  dismissTaunt: () => void;
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
  unequipSlot: (slot: EquipSlot) => void;

  // Blessings
  addBlessing: (id: string) => void;

  // Tutorials
  markQuirksTutorialSeen: () => void;
  markDialogueBeatSeen: (beatId: string) => void;

  // Renown shop
  purchaseUpgrade: (upgradeId: string) => { ok: boolean; reason?: string };

  // Legendary relics
  setActiveLegendaries: (ids: string[]) => void;

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
  ownedLegendaries: string[];
  activeLegendaries: string[];
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
    (screen.screen === 'delve' || screen.screen === 'reincarnation'
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
    ownedLegendaries: meta.ownedLegendaries,
    activeLegendaries: meta.activeLegendaries,
    __metadata: {
      savedAt: new Date().toISOString(),
      characterName: ch.character?.name ?? '—',
      characterLevel: ch.character?.level ?? 0,
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
    chaptersCleared:
      typeof s.chaptersCleared === 'number'
        ? s.chaptersCleared
        : s.chapter1Cleared
          ? 1
          : 0,
    chapter1Cleared: !!s.chapter1Cleared,
    druidGroveUnlocked: !!s.druidGroveUnlocked,
    ascensionUnlocked:
      typeof s.ascensionUnlocked === 'number' && s.ascensionUnlocked >= 0
        ? s.ascensionUnlocked
        : 0,
    knownNpcs: Array.isArray(s.knownNpcs) ? s.knownNpcs : [],
    seenDialogueBeats: Array.isArray(s.seenDialogueBeats) ? s.seenDialogueBeats : [],
    ownedLegendaries: Array.isArray(s.ownedLegendaries) ? s.ownedLegendaries : [],
    activeLegendaries: Array.isArray(s.activeLegendaries) ? s.activeLegendaries : [],
  });
  useScreenStore.setState({
    screen: (s.screen ?? 'hub') as Screen,
    introSeen: !!s.introSeen,
    quirksTutorialSeen: !!s.quirksTutorialSeen,
    taunt: null,
    postmortem: null,
  });
  useDelveStore.setState({ delve: null });
  useCombatStore.setState({ combat: null });
  if (s.saveSeed) setActiveRoller(s.saveSeed);
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
          druidGroveUnlocked: m.druidGroveUnlocked,
          ownedLegendaries: m.ownedLegendaries,
          activeLegendaries: m.activeLegendaries,
        });
      };
      const mirrorScreen = () => {
        const sc = useScreenStore.getState();
        set({
          screen: sc.screen,
          introSeen: sc.introSeen,
          quirksTutorialSeen: sc.quirksTutorialSeen,
          taunt: sc.taunt,
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
        ownedLegendaries: useMetaStore.getState().ownedLegendaries,
        activeLegendaries: useMetaStore.getState().activeLegendaries,

        goToTitle: () => useScreenStore.getState().goToTitle(),
        goToHub: () => useScreenStore.getState().goToHub(),
        goToDelve: () => useScreenStore.getState().goToDelve(),
        goToReincarnation: () => {
          useScreenStore.getState().goToReincarnation();
          useMetaStore.getState().incrementDeathCount();
        },
        goToDruidGrove: () => useScreenStore.getState().goToDruidGrove(),
        goToCharacterSelect: () =>
          useScreenStore.getState().setScreen('character-creation'),
        goToCodex: () => useScreenStore.getState().goToCodex(),
        goToInventory: () => useScreenStore.getState().goToInventory(),

        startNewGame: (seed) => {
          setActiveRoller(seed);
          useCharacterStore.setState({ character: null, saveSeed: seed });
          useDelveStore.setState({ delve: null });
          useCombatStore.setState({ combat: null });
          useMetaStore.getState().resetMeta();
          useScreenStore.setState({
            screen: 'character-creation',
            introSeen: false,
            quirksTutorialSeen: false,
            taunt: null,
            tauntQueue: [],
            postmortem: null,
          });
        },

        commitCharacterCreation: (input) =>
          useCharacterStore.getState().commitCharacterCreation(input),

        selectCharacter: (classId) => {
          const charSlice = useCharacterStore.getState();
          const soul = charSlice.character;
          const fresh = buildPlayerCharacter(presetCreationInput(classId));
          charSlice.setCharacter(soul ? carrySoulProgress(fresh, soul) : fresh);
          useScreenStore.getState().setScreen('hub');
        },

        setCharacter: (character) =>
          useCharacterStore.getState().setCharacter(character),
        setCombat: (combat) => useCombatStore.getState().setCombat(combat),

        startDelve: (delve) => useDelveStore.getState().startDelve(delve),
        advanceRoom: () => useDelveStore.getState().advanceRoom(),
        chooseRoom: (nextId) => useDelveStore.getState().chooseRoom(nextId),
        addDelveReward: (gold, xp) =>
          useDelveStore.getState().addDelveReward(gold, xp),
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
        pickCampBoon: (tier, boonId) =>
          useDelveStore.getState().pickCampBoon(tier, boonId),
        consumeLichEyes: () => useDelveStore.getState().consumeLichEyes(),
        purchaseFromMerchant: (itemId) =>
          useDelveStore.getState().purchaseFromMerchant(itemId),
        purchaseRolledGear: (ref, cost) =>
          useDelveStore.getState().purchaseRolledGear(ref, cost),
        purchaseLegendary: (legendaryId, cost) =>
          useDelveStore.getState().purchaseLegendary(legendaryId, cost),
        clearLastLoot: () => useDelveStore.getState().clearLastLoot(),

        showTaunt: (speaker, context, chapter) =>
          useScreenStore.getState().showTaunt(speaker, context, chapter),
        dismissTaunt: () => useScreenStore.getState().dismissTaunt(),
        markIntroSeen: () => {
          useScreenStore.getState().setIntroSeen(true);
          // First incarnation: drop the player straight into the cells.
          // On subsequent reincarnations the intro doesn't replay, so this
          // only fires for the very first life.
          const meta = useMetaStore.getState();
          const ch = useCharacterStore.getState().character;
          if (!meta.hasReincarnated && ch) {
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
        unequipSlot: (slot) => useCharacterStore.getState().unequipSlot(slot),
        addBlessing: (id) => useCharacterStore.getState().addBlessing(id),

        markQuirksTutorialSeen: () =>
          useScreenStore.getState().markQuirksTutorialSeen(),

        markDialogueBeatSeen: (beatId) =>
          useMetaStore.getState().markDialogueBeatSeen(beatId),

        purchaseUpgrade: (upgradeId) =>
          useMetaStore.getState().purchaseUpgrade(upgradeId),

        setActiveLegendaries: (ids) =>
          useMetaStore.getState().setActiveLegendaries(ids),

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
