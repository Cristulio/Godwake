import { create } from 'zustand';
import type { Character } from '../types/character';
import { buildPlayerCharacter, type CharacterCreationInput } from '../engine/character/defaultCharacter';
import { equipItem as equipItemFn, unequipSlot as unequipSlotFn, type EquipSlot } from '../engine/character/equip';
import { hasPendingLevelUp, applyLevelUp } from '../engine/character/leveling';
import { useScreenStore } from './screenStore';

/**
 * The persistent character (the "soul"): identity + body + gear + per-class
 * resources. Survives between delves via the facade persist; reset to L1/0xp
 * at the start of each delve by `useDelveStore.startDelve`.
 *
 * Also owns `saveSeed`, the run's dice seed, which lives with the character
 * since it travels with the soul across reincarnations on the same slot.
 */
interface CharacterStoreState {
  character: Character | null;
  saveSeed: string | null;

  setCharacter: (character: Character | null) => void;
  setSaveSeed: (seed: string | null) => void;
  commitCharacterCreation: (input: CharacterCreationInput) => void;
  equipFromInventory: (inventoryIdx: number) => void;
  unequipSlot: (slot: EquipSlot) => void;
  addBlessing: (id: string) => void;
  /**
   * Apply one pending level-up. Returns to the screen the consumer chose
   * (delve if mid-run, hub otherwise) by routing through useScreenStore.
   */
  applyPendingLevelUp: (overrides?: Partial<Character>, resumeIfDelve?: boolean) => void;
}

export const useCharacterStore = create<CharacterStoreState>()((set, get) => ({
  character: null,
  saveSeed: null,

  setCharacter: (character) => set({ character }),
  setSaveSeed: (saveSeed) => set({ saveSeed }),

  commitCharacterCreation: (input) => {
    const character = buildPlayerCharacter(input);
    set({ character });
    useScreenStore.getState().setScreen('intro');
  },

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

  applyPendingLevelUp: (overrides, resumeIfDelve = true) => {
    const ch = get().character;
    if (!ch) return;
    const screenSlice = useScreenStore.getState();
    // Mid-delve level-ups return to the delve; out-of-delve fall back to hub.
    const resumeScreen = resumeIfDelve ? 'delve' : 'hub';
    if (!hasPendingLevelUp(ch)) {
      screenSlice.setScreen(resumeScreen);
      return;
    }
    const leveled = applyLevelUp({ ...ch, ...(overrides ?? {}) });
    set({ character: leveled });
    screenSlice.setScreen(hasPendingLevelUp(leveled) ? 'level-up' : resumeScreen);
  },
}));
