import { create } from 'zustand';
import type { Character } from '../types/character';
import { applyPermanentUpgrade, type UnlockedUpgrades } from '../engine/character/upgrades';
import { getUpgrade } from '../content/upgrades';
import { useCharacterStore } from './characterStore';

/**
 * Long-term progress that survives reincarnation but resets on New Game:
 * codex discoveries, reincarnation counters, Grove purchases, chapter gates.
 *
 * Persisted as part of the facade's slot-0 snapshot.
 */
interface MetaStoreState {
  hasReincarnated: boolean;
  deathCount: number;
  discoveredMonsters: string[];
  monsterEncounters: Record<string, number>;
  unlockedUpgrades: UnlockedUpgrades;
  chapter1Cleared: boolean;
  druidGroveUnlocked: boolean;

  discoverMonster: (defId: string) => void;
  purchaseUpgrade: (upgradeId: string) => { ok: boolean; reason?: string };
  setHasReincarnated: (v: boolean) => void;
  incrementDeathCount: () => void;
  setChapter1Cleared: (v: boolean) => void;
  setDruidGroveUnlocked: (v: boolean) => void;
  setUnlockedUpgrades: (u: UnlockedUpgrades) => void;
  resetMeta: () => void;
}

export const useMetaStore = create<MetaStoreState>()((set, get) => ({
  hasReincarnated: false,
  deathCount: 0,
  discoveredMonsters: [],
  monsterEncounters: {},
  unlockedUpgrades: {},
  chapter1Cleared: false,
  druidGroveUnlocked: false,

  discoverMonster: (defId) =>
    set((s) => {
      const already = s.discoveredMonsters.includes(defId);
      const prevCount = s.monsterEncounters[defId] ?? 0;
      return {
        discoveredMonsters: already ? s.discoveredMonsters : [...s.discoveredMonsters, defId],
        monsterEncounters: { ...s.monsterEncounters, [defId]: prevCount + 1 },
      };
    }),

  purchaseUpgrade: (upgradeId) => {
    const character = useCharacterStore.getState().character;
    if (!character) return { ok: false, reason: 'No character.' };
    let up;
    try {
      up = getUpgrade(upgradeId);
    } catch {
      return { ok: false, reason: 'Unknown upgrade.' };
    }
    const currentRank = get().unlockedUpgrades[upgradeId] ?? 0;
    if (currentRank >= up.maxRank) {
      return { ok: false, reason: 'Already at max rank.' };
    }
    const nextRank = currentRank + 1;
    const cost = up.costForRank(nextRank);
    if (character.renown < cost) return { ok: false, reason: 'Not enough Renown.' };
    let next: Character = { ...character, renown: character.renown - cost };
    if (up.kind === 'permanent') {
      next = applyPermanentUpgrade(next, upgradeId, nextRank);
    }
    useCharacterStore.getState().setCharacter(next);
    set({
      unlockedUpgrades: { ...get().unlockedUpgrades, [upgradeId]: nextRank },
    });
    return { ok: true };
  },

  setHasReincarnated: (v) => set({ hasReincarnated: v }),
  incrementDeathCount: () => set((s) => ({ deathCount: s.deathCount + 1 })),
  setChapter1Cleared: (v) => set({ chapter1Cleared: v }),
  setDruidGroveUnlocked: (v) => set({ druidGroveUnlocked: v }),
  setUnlockedUpgrades: (u) => set({ unlockedUpgrades: u }),

  resetMeta: () =>
    set({
      hasReincarnated: false,
      deathCount: 0,
      discoveredMonsters: [],
      monsterEncounters: {},
      unlockedUpgrades: {},
      chapter1Cleared: false,
      druidGroveUnlocked: false,
    }),
}));
