import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Character } from '../types/character';
import type { CombatState } from '../types/combat';
import type { DelveState } from '../types/delve';
import { setActiveRoller, getActiveRoller } from '../engine/dice';
import { buildPlayerCharacter, type CharacterCreationInput } from '../engine/character/defaultCharacter';
import { classStartingResources } from '../engine/character/initialize';
import { effectiveAbilityScores } from '../engine/character/derived';
import { abilityModifier } from '../types/abilities';
import { getRace } from '../content/races';
import { getClass } from '../content/classes';
import { longRest, shortRestHeal, withResetActionEconomy } from '../engine/character/actions';
import { rollBlessingOptions } from '../engine/character/blessings';
import {
  rollQuirks,
  characterQuirkMods,
  soulMarkMultiplier,
  renownSoulMarkMultiplier,
} from '../engine/character/quirks';
import { applyDelveStartUpgrades, applyPermanentUpgrade, type UnlockedUpgrades } from '../engine/character/upgrades';
import { hasPendingLevelUp, applyLevelUp } from '../engine/character/leveling';
import { equipItem as equipItemFn, unequipSlot as unequipSlotFn, type EquipSlot } from '../engine/character/equip';
import { createGodwakeDelve } from '../engine/delve';
import { getItem } from '../content/items';

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
import { getUpgrade } from '../content/upgrades';

/**
 * Convert legacy `string[]` of owned upgrade ids → the rank-aware
 * `Record<id, rank>` shape. Used both at slot-load and at persist-rehydrate.
 */
function migrateUnlockedUpgrades(raw: unknown): UnlockedUpgrades {
  if (Array.isArray(raw)) {
    const out: UnlockedUpgrades = {};
    for (const id of raw) {
      if (typeof id === 'string') out[id] = 1;
    }
    return out;
  }
  if (raw && typeof raw === 'object') return raw as UnlockedUpgrades;
  return {};
}
import type { TauntContext, SoulVoiceSpeaker } from '../components/lore/IrenicusTaunt';

export type Screen =
  | 'title'
  | 'character-creation'
  | 'intro'
  | 'hub'
  | 'delve'
  | 'reincarnation'
  | 'codex'
  | 'inventory'
  | 'druid-grove'
  | 'level-up';

/** Renown granted per successful delve clear (boss killed). */
export const RENOWN_PER_DELVE_CLEAR = 25;

/** Renown granted on a failed delve — small consolation for the soul. */
export const RENOWN_PER_DELVE_FAILURE = 5;

/** Renown threshold that reveals the Druid Grove on the hub — matches the cheapest upgrade. */
export const GROVE_UNLOCK_THRESHOLD = 60;

/** Renown threshold required to unlock the road to Athkatla (Chapter 2). */
export const RENOWN_FOR_CHAPTER_2 = 500;

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

interface GameState {
  screen: Screen;
  saveSeed: string | null;
  character: Character | null;
  delve: DelveState | null;
  combat: CombatState | null;
  /** Active soul-bond voice (Irenicus or Imoen) overlay, null if hidden. */
  taunt: { speaker: SoulVoiceSpeaker; context: TauntContext; seed: number } | null;
  /** True if the player has seen the intro already this save. */
  introSeen: boolean;
  /** True once the player has died and been reincarnated at least once. */
  hasReincarnated: boolean;
  /** Number of times the soul has walked back into Phandalin from the Grove. Increments on every reincarnation, including the first. */
  deathCount: number;
  /** True once the quirks tutorial has been dismissed. */
  quirksTutorialSeen: boolean;
  /** Monster def ids the player has fought at least once. Powers the codex. */
  discoveredMonsters: string[];
  /** Cumulative encounter count per monster def id, incremented per-combat-start. */
  monsterEncounters: Record<string, number>;
  /**
   * Druid Grove upgrades the player has purchased with Renown. Each id maps
   * to the current rank (1..maxRank). Missing keys / rank 0 = not owned.
   * Persists across reincarnation; wipes on new game.
   */
  unlockedUpgrades: UnlockedUpgrades;
  /** True once the player has beaten Ilyich at least once on any incarnation. Gates Chapter 2 access. */
  chapter1Cleared: boolean;
  /** True once the player has ever held enough renown to buy the cheapest Grove upgrade. Sticky — does not re-lock when renown is spent. */
  druidGroveUnlocked: boolean;

  // Navigation
  goToTitle: () => void;
  goToHub: () => void;
  goToDelve: () => void;
  goToReincarnation: () => void;
  goToDruidGrove: () => void;

  // Lifecycle
  startNewGame: (seed: string) => void;
  /** Commits a player's character-creation choices and proceeds to intro. */
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
  /** Player gives up mid-delve: HP restored, rewards dropped, no XP/gold gain. */
  abandonDelve: () => void;
  /** Flip the on-delve Ch1-boss flag the moment Ilyich falls. Lets the camp early-exit and post-camp deaths still credit chapter1Cleared. */
  markChapter1BossKilled: () => void;
  /**
   * Quartermaster's Stipend hook: called when any chapter boss falls. Adds
   * `chapterClearGoldBonus` (set at delve start) to the delve's gold ledger.
   * No-op if the player doesn't own the upgrade.
   */
  creditChapterClearGold: () => void;
  /** Camp early-exit: complete the delve at the seam with Ch1 rewards and CLEAR-tier renown. */
  concludeDelveAtCamp: () => void;
  /**
   * Lock in one of the three roadside-camp choices. Applies its effect
   * immediately and stamps `delve.campChoice` so the UI disables the others.
   * No-op if already chosen.
   */
  pickCampChoice: (choice: 'rest' | 'sharpen' | 'prayer') => void;
  /** Merchant purchase at camp. Deducts gold from pocket; pushes item ref to inventory. */
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

  // Blessings (mid-delve grants from shrine rooms; wipe at delve end)
  addBlessing: (id: string) => void;

  // Tutorials
  markQuirksTutorialSeen: () => void;

  // Renown shop
  purchaseUpgrade: (upgradeId: string) => { ok: boolean; reason?: string };

  // Leveling: applies one pending level. `overrides` may carry ASI choices etc.
  applyPendingLevelUp: (overrides?: Partial<Character>) => void;

  // Save slots — slot 0 is autosave (written on every state change by the
  // persist middleware); slots 1 and 2 are manual.
  saveToSlot: (slot: SaveSlotId) => { ok: boolean; reason?: string };
  loadFromSlot: (slot: SaveSlotId) => { ok: boolean; reason?: string };
  deleteSlot: (slot: SaveSlotId) => void;
  /** Returns the JSON string for the requested slot, or null if empty. */
  exportSlot: (slot: SaveSlotId) => string | null;
  /** Parses a previously-exported JSON string into slot 1 or 2. Slot 0 is never the import target. */
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

function buildSnapshot(state: GameState): PersistedSnapshot {
  return {
    screen:
      state.screen === 'delve' || state.screen === 'reincarnation'
        ? 'hub'
        : state.screen,
    saveSeed: state.saveSeed,
    character: state.character,
    introSeen: state.introSeen,
    hasReincarnated: state.hasReincarnated,
    deathCount: state.deathCount,
    quirksTutorialSeen: state.quirksTutorialSeen,
    discoveredMonsters: state.discoveredMonsters,
    monsterEncounters: state.monsterEncounters,
    unlockedUpgrades: state.unlockedUpgrades,
    chapter1Cleared: state.chapter1Cleared,
    druidGroveUnlocked: state.druidGroveUnlocked,
    __metadata: {
      savedAt: new Date().toISOString(),
      characterName: state.character?.name ?? '—',
      characterLevel: state.character?.level ?? 0,
      location: locationLabel(state.screen),
      chapterCleared: state.chapter1Cleared ? 1 : 0,
    },
  };
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

/** Read-only inspector for the save-slot UI. Pulls metadata out of localStorage. */
export function getSlotMetadata(slot: SaveSlotId): SaveSlotMetadata | null {
  const wrapper = readSlotWrapper(slot);
  return wrapper?.state.__metadata ?? null;
}

export function hasAnySave(): boolean {
  return SAVE_SLOT_IDS.some((s) => readSlotWrapper(s) !== null);
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
  screen: 'title',
  saveSeed: null,
  character: null,
  delve: null,
  combat: null,
  taunt: null,
  introSeen: false,
  hasReincarnated: false,
  deathCount: 0,
  quirksTutorialSeen: false,
  discoveredMonsters: [],
  monsterEncounters: {},
  unlockedUpgrades: {},
  chapter1Cleared: false,
  druidGroveUnlocked: false,

  goToTitle: () => set({ screen: 'title' }),
  goToHub: () => set({ screen: 'hub' }),
  goToDelve: () => set({ screen: 'delve' }),
  goToReincarnation: () =>
    set((s) => ({ screen: 'reincarnation', deathCount: s.deathCount + 1 })),
  goToDruidGrove: () => set({ screen: 'druid-grove' }),
  startNewGame: (seed) => {
    setActiveRoller(seed);
    set({
      saveSeed: seed,
      character: null,
      combat: null,
      delve: null,
      taunt: null,
      introSeen: false,
      hasReincarnated: false,
      deathCount: 0,
      quirksTutorialSeen: false,
      discoveredMonsters: [],
      monsterEncounters: {},
      unlockedUpgrades: {},
      chapter1Cleared: false,
      druidGroveUnlocked: false,
      screen: 'character-creation',
    });
  },

  commitCharacterCreation: (input) => {
    const character = buildPlayerCharacter(input);
    set({ character, screen: 'intro' });
  },

  setCharacter: (character) => set({ character }),
  setCombat: (combat) => set({ combat }),

  startDelve: (delve) => {
    const ch = get().character;
    if (!ch) return;
    // Hades-style fresh run: level, xp, gold all reset to baseline.
    // Renown + Grove upgrades + quirks survived the wheel.
    const cls = getClass(ch.classId);
    const conMod = abilityModifier(effectiveAbilityScores(ch).con);
    const race = getRace(ch.raceId);
    const bonusHp = race.bonusHpPerLevel ?? 0;
    const baseHpMax = cls.hitDie + conMod + bonusHp;
    const freshlyDescended: Character = {
      ...ch,
      level: 1,
      xp: 0,
      goldInPocket: 0,
      hp: { current: baseHpMax, max: baseHpMax, temp: 0 },
      hitDice: { current: 1, max: 1, die: cls.hitDie },
      // Class resources reset to starting state (Second Wind ready, no
      // surge, sneak attack available, full Wizard slots for L1).
      resources: classStartingResources(ch.classId),
      blessings: [],
      delveAttackBonus: 0,
      delveInitBonus: 0,
      nextAttackAdvantage: false,
      poisonImmuneEncounter: false,
      conditions: [],
    };
    const unlocked = get().unlockedUpgrades;
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
      const rolled = rollBlessingOptions(getActiveRoller(), pilgrimRank);
      withQuirkBudgets = {
        ...withQuirkBudgets,
        blessings: [...withQuirkBudgets.blessings, ...rolled],
      };
    }

    set({
      delve,
      combat: null,
      character: withQuirkBudgets,
      screen: 'delve',
    });
  },

  advanceRoom: () =>
    set((s) => {
      if (!s.delve) return s;
      const wasLast = s.delve.currentRoomIdx >= s.delve.rooms.length - 1;
      return {
        delve: {
          ...s.delve,
          currentRoomIdx: wasLast ? s.delve.currentRoomIdx : s.delve.currentRoomIdx + 1,
          phase: wasLast ? 'completed' : 'in-room',
          roomsCleared: s.delve.roomsCleared + 1,
        },
        combat: null,
      };
    }),

  addDelveReward: (gold, xp) =>
    set((s) => {
      if (!s.delve) return s;
      // Bargain Hunter / Pinchpurse scale gold; Soul-mark scales gold AND xp
      // (each bane quirk = +20%). Both stack multiplicatively.
      const goldMul = s.character
        ? (characterQuirkMods(s.character).goldMultiplier ?? 1) *
          soulMarkMultiplier(s.character)
        : 1;
      const xpMul = s.character ? soulMarkMultiplier(s.character) : 1;
      const finalGold = Math.floor(gold * goldMul);
      const finalXp = Math.floor(xp * xpMul);
      return {
        delve: {
          ...s.delve,
          goldEarned: s.delve.goldEarned + finalGold,
          xpEarned: s.delve.xpEarned + finalXp,
        },
      };
    }),

  finishDelve: () =>
    set((s) => {
      if (!s.character) return s;
      if (!s.delve) {
        return { ...s, screen: 'hub', combat: null };
      }
      const wonBoss = s.delve.phase === 'completed';
      // Renown is the ONLY thing that crosses the wheel — soul-mark bumps
      // it (each bane quirk = +20%). Gold and XP and level all stay in the
      // delve and die with it; startDelve seeds the next run at L1/0/0.
      const renownBase = wonBoss ? RENOWN_PER_DELVE_CLEAR : RENOWN_PER_DELVE_FAILURE;
      const renownGain = Math.floor(renownBase * renownSoulMarkMultiplier(s.character));
      const settled: Character = {
        ...s.character,
        renown: s.character.renown + renownGain,
        blessings: [],
        delveAttackBonus: 0,
        delveInitBonus: 0,
      };
      const ch1Killed = s.delve.chapter1BossKilled === true;
      return {
        character: settled,
        delve: null,
        combat: null,
        screen: 'hub',
        chapter1Cleared: s.chapter1Cleared || wonBoss || ch1Killed,
        druidGroveUnlocked:
          s.druidGroveUnlocked || settled.renown >= GROVE_UNLOCK_THRESHOLD,
      };
    }),

  applyPendingLevelUp: (overrides) =>
    set((s) => {
      if (!s.character) return s;
      if (!hasPendingLevelUp(s.character)) return { ...s, screen: 'hub' };
      const leveled = applyLevelUp({ ...s.character, ...(overrides ?? {}) });
      return {
        character: leveled,
        screen: hasPendingLevelUp(leveled) ? 'level-up' : 'hub',
      };
    }),

  failDelve: () =>
    set((s) => {
      if (!s.delve || !s.character) return s;
      // Reincarnation: re-roll quirks for the next life. Class/level/XP persist.
      // Blessings and conditions wipe — they were on the falling life, not the soul.
      // Wheelturner: the first existing quirk survives the turn; only the rest reroll.
      const oldQuirks = s.character.quirks;
      const carry =
        s.character.wheelturnerUnlocked && oldQuirks.length > 0
          ? [oldQuirks[0]]
          : [];
      const rolledCount = Math.max(0, 2 - carry.length);
      const fresh = rolledCount > 0 ? rollQuirks(getActiveRoller(), rolledCount) : [];
      const newQuirks = [...carry, ...fresh.filter((id) => !carry.includes(id))];
      // Guard: if dedupe shrank fresh, top up with one more roll attempt.
      while (newQuirks.length < 2 && rolledCount > 0) {
        const more = rollQuirks(getActiveRoller(), 1);
        for (const id of more) {
          if (!newQuirks.includes(id)) newQuirks.push(id);
        }
        if (newQuirks.length >= 2) break;
        if (more.length === 0) break;
      }
      return {
        delve: { ...s.delve, phase: 'failed' },
        character: {
          ...s.character,
          quirks: newQuirks,
          blessings: [],
          conditions: [],
          delveAttackBonus: 0,
          delveInitBonus: 0,
        },
        hasReincarnated: true,
      };
    }),

  abandonDelve: () =>
    set((s) => {
      if (!s.character) return s;
      return {
        // Restore HP and rest, drop all delve rewards, wipe blessings + camp buffs.
        character: longRest({ ...s.character, blessings: [], delveAttackBonus: 0, delveInitBonus: 0 }),
        delve: null,
        combat: null,
        screen: 'hub',
      };
    }),

  showTaunt: (speaker, context) =>
    set({ taunt: { speaker, context, seed: Math.floor(Math.random() * 1000) } }),
  dismissTaunt: () => set({ taunt: null }),
  markIntroSeen: () => {
    set({ introSeen: true });
    // First incarnation: drop the player straight into the cells. They wake
    // in the dungeon — the hub doesn't reveal until they've fallen at least
    // once. On subsequent reincarnations the intro doesn't replay, so this
    // only fires for the very first life.
    const s = get();
    if (!s.hasReincarnated && s.character) {
      get().startDelve(createGodwakeDelve());
    } else {
      set({ screen: 'hub' });
    }
  },

  discoverMonster: (defId) =>
    set((s) => {
      const already = s.discoveredMonsters.includes(defId);
      const prevCount = s.monsterEncounters[defId] ?? 0;
      return {
        discoveredMonsters: already ? s.discoveredMonsters : [...s.discoveredMonsters, defId],
        monsterEncounters: { ...s.monsterEncounters, [defId]: prevCount + 1 },
      };
    }),
  goToCodex: () => set({ screen: 'codex' }),

  goToInventory: () => set({ screen: 'inventory' }),
  equipFromInventory: (inventoryIdx) =>
    set((s) => (s.character ? { character: equipItemFn(s.character, inventoryIdx) } : s)),
  unequipSlot: (slot) =>
    set((s) => (s.character ? { character: unequipSlotFn(s.character, slot) } : s)),
  addBlessing: (id) =>
    set((s) =>
      s.character
        ? { character: { ...s.character, blessings: [...s.character.blessings, id] } }
        : s,
    ),
  markQuirksTutorialSeen: () => set({ quirksTutorialSeen: true }),

  markChapter1BossKilled: () =>
    set((s) => (s.delve ? { delve: { ...s.delve, chapter1BossKilled: true } } : s)),

  creditChapterClearGold: () =>
    set((s) => {
      if (!s.delve || !s.character) return s;
      const bonus = s.character.chapterClearGoldBonus ?? 0;
      if (bonus <= 0) return s;
      return {
        character: { ...s.character, goldInPocket: s.character.goldInPocket + bonus },
        delve: { ...s.delve, goldEarned: s.delve.goldEarned + bonus },
      };
    }),

  concludeDelveAtCamp: () =>
    set((s) => (s.delve ? { delve: { ...s.delve, phase: 'completed' } } : s)),

  pickCampChoice: (choice) => {
    const s = get();
    if (!s.character || !s.delve) return;
    if (s.delve.campChoice) return;

    let nextCharacter = s.character;
    if (choice === 'rest') {
      // Same shape as the old Short Rest button: refresh Second Wind +
      // Action Surge, no HP heal.
      nextCharacter = shortRestHeal(s.character, 0);
    } else if (choice === 'sharpen') {
      nextCharacter = {
        ...s.character,
        delveAttackBonus: (s.character.delveAttackBonus ?? 0) + 1,
      };
    } else if (choice === 'prayer') {
      const [rolled] = rollBlessingOptions(getActiveRoller(), 1);
      if (rolled) {
        nextCharacter = {
          ...s.character,
          blessings: [...s.character.blessings, rolled],
        };
      }
    }

    set({
      character: nextCharacter,
      delve: { ...s.delve, campChoice: choice },
    });
  },

  purchaseFromMerchant: (itemId) => {
    const s = get();
    if (!s.character) return { ok: false, reason: 'No character.' };
    let item;
    try {
      item = getItem(itemId);
    } catch {
      return { ok: false, reason: 'Unknown item.' };
    }
    if (s.character.goldInPocket < item.cost) {
      return { ok: false, reason: 'Not enough gold.' };
    }
    set({
      character: {
        ...s.character,
        goldInPocket: s.character.goldInPocket - item.cost,
        inventory: [...s.character.inventory, { itemId }],
      },
    });
    return { ok: true };
  },

  purchaseUpgrade: (upgradeId) => {
    const s = get();
    if (!s.character) return { ok: false, reason: 'No character.' };
    let up;
    try {
      up = getUpgrade(upgradeId);
    } catch {
      return { ok: false, reason: 'Unknown upgrade.' };
    }
    const currentRank = s.unlockedUpgrades[upgradeId] ?? 0;
    if (currentRank >= up.maxRank) {
      return { ok: false, reason: 'Already at max rank.' };
    }
    const nextRank = currentRank + 1;
    const cost = up.costForRank(nextRank);
    if (s.character.renown < cost) return { ok: false, reason: 'Not enough Renown.' };
    let next: Character = { ...s.character, renown: s.character.renown - cost };
    if (up.kind === 'permanent') {
      next = applyPermanentUpgrade(next, upgradeId, nextRank);
    }
    set({
      character: next,
      unlockedUpgrades: { ...s.unlockedUpgrades, [upgradeId]: nextRank },
    });
    return { ok: true };
  },

  saveToSlot: (slot) => {
    if (typeof localStorage === 'undefined') return { ok: false, reason: 'No storage.' };
    const snapshot = buildSnapshot(get());
    try {
      const wrapper: SlotWrapper = { state: snapshot, version: 1 };
      localStorage.setItem(slotKey(slot), JSON.stringify(wrapper));
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: e instanceof Error ? e.message : 'Save failed.' };
    }
  },

  loadFromSlot: (slot) => {
    const wrapper = readSlotWrapper(slot);
    if (!wrapper) return { ok: false, reason: 'Empty slot.' };
    const s = wrapper.state;
    useGameStore.setState({
      screen: (s.screen ?? 'hub') as Screen,
      saveSeed: s.saveSeed ?? null,
      character: s.character ?? null,
      // speed/timing settings live in useSettingsStore now — slot loads
      // don't touch them, so the player's pacing preference survives a
      // slot switch.
      introSeen: s.introSeen ?? false,
      hasReincarnated: s.hasReincarnated ?? false,
      quirksTutorialSeen: s.quirksTutorialSeen ?? false,
      discoveredMonsters: Array.isArray(s.discoveredMonsters) ? s.discoveredMonsters : [],
      monsterEncounters:
        s.monsterEncounters && typeof s.monsterEncounters === 'object'
          ? s.monsterEncounters
          : {},
      unlockedUpgrades: migrateUnlockedUpgrades(s.unlockedUpgrades),
      chapter1Cleared: !!s.chapter1Cleared,
      druidGroveUnlocked: !!s.druidGroveUnlocked,
      delve: null,
      combat: null,
      taunt: null,
    });
    if (s.saveSeed) setActiveRoller(s.saveSeed);
    return { ok: true };
  },

  deleteSlot: (slot) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(slotKey(slot));
    }
    if (slot === 0) {
      useGameStore.setState({
        screen: 'title',
        saveSeed: null,
        character: null,
        delve: null,
        combat: null,
        taunt: null,
        introSeen: false,
        hasReincarnated: false,
        quirksTutorialSeen: false,
        discoveredMonsters: [],
        monsterEncounters: {},
        unlockedUpgrades: {},
        chapter1Cleared: false,
        druidGroveUnlocked: false,
      });
    }
  },

  exportSlot: (slot) => {
    const wrapper = readSlotWrapper(slot);
    if (!wrapper) return null;
    return JSON.stringify(wrapper, null, 2);
  },

  importToSlot: (slot, json) => {
    if (typeof localStorage === 'undefined') return { ok: false, reason: 'No storage.' };
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
      localStorage.setItem(slotKey(slot), JSON.stringify({ state: candidate.state, version: candidate.version ?? 1 }));
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: e instanceof Error ? e.message : 'Import failed.' };
    }
  },
    }),
    {
      name: slotKey(0),
      storage: createJSONStorage(() => localStorage),
      // Only persist long-term state; delve/combat are session-scoped.
      partialize: (state) => buildSnapshot(state as GameState),
      version: 1,
      onRehydrateStorage: () => (state) => {
        // Re-arm the dice roller from the persisted save seed on load.
        if (state?.saveSeed) {
          setActiveRoller(state.saveSeed);
        }
        // Ensure character.quirks exists on legacy saves (was undefined before
        // the system existed). Don't populate — the soul has earned no marks
        // until first death.
        if (state?.character && !state.character.quirks) {
          state.character = { ...state.character, quirks: [] };
        }
        // Legacy saves predate engine-read conditions; default to clear.
        if (state?.character && !Array.isArray(state.character.conditions)) {
          state.character = { ...state.character, conditions: [] };
        }
        // Older saves predate the renown shop OR were on the pre-rank
        // schema (string[] of owned ids). Convert array → Record<id, 1>.
        if (state) {
          state.unlockedUpgrades = migrateUnlockedUpgrades(state.unlockedUpgrades);
        }
        // Older saves predate the codex encounter counter. Seed each already-
        // discovered monster at 1 so the codex doesn't show "x 0" for known
        // entries; new combats will increment from there.
        if (state && (!state.monsterEncounters || typeof state.monsterEncounters !== 'object')) {
          const seeded: Record<string, number> = {};
          for (const id of state?.discoveredMonsters ?? []) {
            seeded[id] = 1;
          }
          state.monsterEncounters = seeded;
        }
        // Older saves predate Chapter 2 gating.
        if (state && typeof state.chapter1Cleared !== 'boolean') {
          state.chapter1Cleared = false;
        }
        // Older saves predate the Grove gate. Unlock if they already qualify
        // (already bought something, or have enough renown to do so) so we
        // don't strip access from existing players.
        if (state && typeof state.druidGroveUnlocked !== 'boolean') {
          state.druidGroveUnlocked =
            Object.keys(state.unlockedUpgrades ?? {}).length > 0 ||
            (state.character?.renown ?? 0) >= GROVE_UNLOCK_THRESHOLD;
        }
        // Older saves predate the reincarnation counter. Seed at 1 if they've
        // already reincarnated so the Souls-walked readout isn't misleading.
        if (state && typeof state.deathCount !== 'number') {
          state.deathCount = state.hasReincarnated ? 1 : 0;
        }
      },
    },
  ),
);
