import { create, type StoreApi } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Character } from '../types/character';
import type { CombatState } from '../types/combat';
import type { DelveState } from '../types/delve';
import { setActiveRoller } from '../engine/dice';
import { type CharacterCreationInput } from '../engine/character/defaultCharacter';
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
  combat: CombatState | null;
  taunt: { speaker: SoulVoiceSpeaker; context: TauntContext; seed: number } | null;
  introSeen: boolean;
  hasReincarnated: boolean;
  deathCount: number;
  quirksTutorialSeen: boolean;
  discoveredMonsters: string[];
  monsterEncounters: Record<string, number>;
  unlockedUpgrades: UnlockedUpgrades;
  chapter1Cleared: boolean;
  druidGroveUnlocked: boolean;

  // Navigation
  goToTitle: () => void;
  goToHub: () => void;
  goToDelve: () => void;
  goToReincarnation: () => void;
  goToDruidGrove: () => void;

  // Lifecycle
  startNewGame: (seed: string) => void;
  commitCharacterCreation: (input: CharacterCreationInput) => void;

  // Character + combat
  setCharacter: (character: Character) => void;
  setCombat: (combat: CombatState | null) => void;

  // Delve flow
  startDelve: (delve: DelveState) => void;
  advanceRoom: () => void;
  addDelveReward: (gold: number, xp: number) => void;
  finishDelve: () => void;
  failDelve: () => void;
  abandonDelve: () => void;
  markChapter1BossKilled: () => void;
  creditChapterClearGold: () => void;
  concludeDelveAtCamp: () => void;
  pickCampChoice: (choice: 'rest' | 'sharpen' | 'prayer') => void;
  purchaseFromMerchant: (itemId: string) => { ok: boolean; reason?: string };

  // Lore overlays
  showTaunt: (speaker: SoulVoiceSpeaker, context: TauntContext) => void;
  dismissTaunt: () => void;
  markIntroSeen: () => void;

  // Codex
  discoverMonster: (defId: string) => void;
  goToCodex: () => void;

  // Inventory
  goToInventory: () => void;
  equipFromInventory: (inventoryIdx: number) => void;
  unequipSlot: (slot: EquipSlot) => void;

  // Blessings
  addBlessing: (id: string) => void;

  // Tutorials
  markQuirksTutorialSeen: () => void;

  // Renown shop
  purchaseUpgrade: (upgradeId: string) => { ok: boolean; reason?: string };

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
  unlockedUpgrades: UnlockedUpgrades;
  chapter1Cleared: boolean;
  druidGroveUnlocked: boolean;
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
    unlockedUpgrades: meta.unlockedUpgrades,
    chapter1Cleared: meta.chapter1Cleared,
    druidGroveUnlocked: meta.druidGroveUnlocked,
    __metadata: {
      savedAt: new Date().toISOString(),
      characterName: ch.character?.name ?? '—',
      characterLevel: ch.character?.level ?? 0,
      location: locationLabel(screen.screen),
      chapterCleared: meta.chapter1Cleared ? 1 : 0,
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
    unlockedUpgrades: s.unlockedUpgrades ?? {},
    chapter1Cleared: !!s.chapter1Cleared,
    druidGroveUnlocked: !!s.druidGroveUnlocked,
  });
  useScreenStore.setState({
    screen: (s.screen ?? 'hub') as Screen,
    introSeen: !!s.introSeen,
    quirksTutorialSeen: !!s.quirksTutorialSeen,
    taunt: null,
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
  return SAVE_SLOT_IDS.some((s) => readSlotWrapper(s) !== null);
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
      const mirrorDelve = () =>
        set({ delve: useDelveStore.getState().delve });
      const mirrorCombat = () =>
        set({ combat: useCombatStore.getState().combat });
      const mirrorMeta = () => {
        const m = useMetaStore.getState();
        set({
          hasReincarnated: m.hasReincarnated,
          deathCount: m.deathCount,
          discoveredMonsters: m.discoveredMonsters,
          monsterEncounters: m.monsterEncounters,
          unlockedUpgrades: m.unlockedUpgrades,
          chapter1Cleared: m.chapter1Cleared,
          druidGroveUnlocked: m.druidGroveUnlocked,
        });
      };
      const mirrorScreen = () => {
        const sc = useScreenStore.getState();
        set({
          screen: sc.screen,
          introSeen: sc.introSeen,
          quirksTutorialSeen: sc.quirksTutorialSeen,
          taunt: sc.taunt,
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
        combat: useCombatStore.getState().combat,
        taunt: useScreenStore.getState().taunt,
        introSeen: useScreenStore.getState().introSeen,
        hasReincarnated: useMetaStore.getState().hasReincarnated,
        deathCount: useMetaStore.getState().deathCount,
        quirksTutorialSeen: useScreenStore.getState().quirksTutorialSeen,
        discoveredMonsters: useMetaStore.getState().discoveredMonsters,
        monsterEncounters: useMetaStore.getState().monsterEncounters,
        unlockedUpgrades: useMetaStore.getState().unlockedUpgrades,
        chapter1Cleared: useMetaStore.getState().chapter1Cleared,
        druidGroveUnlocked: useMetaStore.getState().druidGroveUnlocked,

        goToTitle: () => useScreenStore.getState().goToTitle(),
        goToHub: () => useScreenStore.getState().goToHub(),
        goToDelve: () => useScreenStore.getState().goToDelve(),
        goToReincarnation: () => {
          useScreenStore.getState().goToReincarnation();
          useMetaStore.getState().incrementDeathCount();
        },
        goToDruidGrove: () => useScreenStore.getState().goToDruidGrove(),
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
          });
        },

        commitCharacterCreation: (input) =>
          useCharacterStore.getState().commitCharacterCreation(input),

        setCharacter: (character) =>
          useCharacterStore.getState().setCharacter(character),
        setCombat: (combat) => useCombatStore.getState().setCombat(combat),

        startDelve: (delve) => useDelveStore.getState().startDelve(delve),
        advanceRoom: () => useDelveStore.getState().advanceRoom(),
        addDelveReward: (gold, xp) =>
          useDelveStore.getState().addDelveReward(gold, xp),
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
        purchaseFromMerchant: (itemId) =>
          useDelveStore.getState().purchaseFromMerchant(itemId),

        showTaunt: (speaker, context) =>
          useScreenStore.getState().showTaunt(speaker, context),
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

        equipFromInventory: (idx) =>
          useCharacterStore.getState().equipFromInventory(idx),
        unequipSlot: (slot) => useCharacterStore.getState().unequipSlot(slot),
        addBlessing: (id) => useCharacterStore.getState().addBlessing(id),

        markQuirksTutorialSeen: () =>
          useScreenStore.getState().markQuirksTutorialSeen(),

        purchaseUpgrade: (upgradeId) =>
          useMetaStore.getState().purchaseUpgrade(upgradeId),

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
