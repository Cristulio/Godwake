import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Character } from '../types/character';
import type { CombatState } from '../types/combat';
import type { DelveState } from '../types/delve';
import { setActiveRoller, getActiveRoller } from '../engine/dice';
import { buildPlayerCharacter, type CharacterCreationInput } from '../engine/character/defaultCharacter';
import { longRest, withResetActionEconomy } from '../engine/character/actions';
import { rollQuirks, characterQuirkMods } from '../engine/character/quirks';
import { applyDelveStartUpgrades, applyPermanentUpgrade } from '../engine/character/upgrades';

function applyDelveStartQuirks(character: Character): Character {
  const mods = characterQuirkMods(character);
  const bonusGold = mods.startBonusGold ?? 0;
  return {
    ...character,
    goldInPocket: character.goldInPocket + bonusGold,
    delveBudgets: {
      quirkRerollMissesRemaining: mods.rerollMissesPerDelve ?? 0,
    },
  };
}
import { getUpgrade } from '../content/upgrades';
import type { TauntContext, SoulVoiceSpeaker } from '../components/lore/IrenicusTaunt';

export type Screen =
  | 'title'
  | 'character-creation'
  | 'intro'
  | 'hub'
  | 'delve'
  | 'reincarnation'
  | 'codex'
  | 'druid-grove';

/** Renown granted per successful delve clear. */
export const RENOWN_PER_DELVE_CLEAR = 50;

interface GameState {
  screen: Screen;
  saveSeed: string | null;
  character: Character | null;
  delve: DelveState | null;
  combat: CombatState | null;
  /** Animation/turn-pacing multiplier. 1 = normal, 2 = fast forward. */
  speedMultiplier: 1 | 2;
  /** Active soul-bond voice (Irenicus or Imoen) overlay, null if hidden. */
  taunt: { speaker: SoulVoiceSpeaker; context: TauntContext; seed: number } | null;
  /** True if the player has seen the intro already this save. */
  introSeen: boolean;
  /** True once the player has died and been reincarnated at least once. */
  hasReincarnated: boolean;
  /** True once the quirks tutorial has been dismissed. */
  quirksTutorialSeen: boolean;
  /** Monster def ids the player has fought at least once. Powers the codex. */
  discoveredMonsters: string[];
  /** Druid Grove upgrades the player has purchased with Renown. Persists across reincarnation; wipes on new game. */
  unlockedUpgrades: string[];

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

  // Settings
  setSpeed: (s: 1 | 2) => void;

  // Lore overlays
  showTaunt: (speaker: SoulVoiceSpeaker, context: TauntContext) => void;
  dismissTaunt: () => void;
  markIntroSeen: () => void;

  // Codex
  discoverMonster: (defId: string) => void;
  goToCodex: () => void;

  // Blessings (mid-delve grants from shrine rooms; wipe at delve end)
  addBlessing: (id: string) => void;

  // Tutorials
  markQuirksTutorialSeen: () => void;

  // Renown shop
  purchaseUpgrade: (upgradeId: string) => { ok: boolean; reason?: string };
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
  screen: 'title',
  saveSeed: null,
  character: null,
  delve: null,
  combat: null,
  speedMultiplier: 1,
  taunt: null,
  introSeen: false,
  hasReincarnated: false,
  quirksTutorialSeen: false,
  discoveredMonsters: [],
  unlockedUpgrades: [],

  goToTitle: () => set({ screen: 'title' }),
  goToHub: () => set({ screen: 'hub' }),
  goToDelve: () => set({ screen: 'delve' }),
  goToReincarnation: () => set({ screen: 'reincarnation' }),
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
      quirksTutorialSeen: false,
      discoveredMonsters: [],
      unlockedUpgrades: [],
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
    const withUpgrades = applyDelveStartUpgrades(withResetActionEconomy(ch), get().unlockedUpgrades);
    const withQuirkBudgets = applyDelveStartQuirks(withUpgrades);
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
      return {
        delve: {
          ...s.delve,
          goldEarned: s.delve.goldEarned + gold,
          xpEarned: s.delve.xpEarned + xp,
        },
      };
    }),

  finishDelve: () =>
    set((s) => {
      if (!s.character) return s;
      if (!s.delve) {
        return { ...s, screen: 'hub', combat: null };
      }
      const earnedGold = s.delve.goldEarned;
      const earnedXp = s.delve.xpEarned;
      const rested = longRest({
        ...s.character,
        goldInPocket: s.character.goldInPocket + earnedGold,
        xp: s.character.xp + earnedXp,
        renown: s.character.renown + RENOWN_PER_DELVE_CLEAR,
        // Blessings were granted for the delve only — they wipe at the hub.
        blessings: [],
      });
      return {
        character: rested,
        delve: null,
        combat: null,
        screen: 'hub',
      };
    }),

  failDelve: () =>
    set((s) => {
      if (!s.delve || !s.character) return s;
      // Reincarnation: re-roll quirks for the next life. Class/level/XP persist.
      // Blessings wipe — they were granted to the falling life, not the soul.
      const newQuirks = rollQuirks(getActiveRoller(), 2);
      return {
        delve: { ...s.delve, phase: 'failed' },
        character: { ...s.character, quirks: newQuirks, blessings: [] },
        hasReincarnated: true,
      };
    }),

  abandonDelve: () =>
    set((s) => {
      if (!s.character) return s;
      return {
        // Restore HP and rest, drop all delve rewards, wipe blessings.
        character: longRest({ ...s.character, blessings: [] }),
        delve: null,
        combat: null,
        screen: 'hub',
      };
    }),

  setSpeed: (s) => set({ speedMultiplier: s }),

  showTaunt: (speaker, context) =>
    set({ taunt: { speaker, context, seed: Math.floor(Math.random() * 1000) } }),
  dismissTaunt: () => set({ taunt: null }),
  markIntroSeen: () => set({ introSeen: true, screen: 'hub' }),

  discoverMonster: (defId) =>
    set((s) =>
      s.discoveredMonsters.includes(defId)
        ? s
        : { discoveredMonsters: [...s.discoveredMonsters, defId] },
    ),
  goToCodex: () => set({ screen: 'codex' }),
  addBlessing: (id) =>
    set((s) =>
      s.character
        ? { character: { ...s.character, blessings: [...s.character.blessings, id] } }
        : s,
    ),
  markQuirksTutorialSeen: () => set({ quirksTutorialSeen: true }),

  purchaseUpgrade: (upgradeId) => {
    const s = get();
    if (!s.character) return { ok: false, reason: 'No character.' };
    if (s.unlockedUpgrades.includes(upgradeId)) return { ok: false, reason: 'Already owned.' };
    let up;
    try {
      up = getUpgrade(upgradeId);
    } catch {
      return { ok: false, reason: 'Unknown upgrade.' };
    }
    if (s.character.renown < up.cost) return { ok: false, reason: 'Not enough Renown.' };
    const spent = { ...s.character, renown: s.character.renown - up.cost };
    const withPermanent = applyPermanentUpgrade(spent, upgradeId);
    set({
      character: withPermanent,
      unlockedUpgrades: [...s.unlockedUpgrades, upgradeId],
    });
    return { ok: true };
  },
    }),
    {
      name: 'godwake-save',
      storage: createJSONStorage(() => localStorage),
      // Only persist long-term state; delve/combat are session-scoped.
      partialize: (state) => ({
        screen:
          state.screen === 'delve' || state.screen === 'reincarnation'
            ? 'hub'
            : state.screen,
        saveSeed: state.saveSeed,
        character: state.character,
        speedMultiplier: state.speedMultiplier,
        introSeen: state.introSeen,
        hasReincarnated: state.hasReincarnated,
        quirksTutorialSeen: state.quirksTutorialSeen,
        discoveredMonsters: state.discoveredMonsters,
        unlockedUpgrades: state.unlockedUpgrades,
      }),
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
        // Older saves predate the renown shop.
        if (state && !state.unlockedUpgrades) {
          state.unlockedUpgrades = [];
        }
      },
    },
  ),
);
