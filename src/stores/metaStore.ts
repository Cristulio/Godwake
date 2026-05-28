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
  /** Times the player has defeated each monster def. */
  monsterDefeats: Record<string, number>;
  /** Times each monster def has dealt the killing blow to the player. */
  monsterKilledBy: Record<string, number>;
  /** Per-def map of {abilityName: kills} — which attack a given monster used to finish the player. */
  monsterKillingAbilities: Record<string, Record<string, number>>;
  unlockedUpgrades: UnlockedUpgrades;
  /**
   * Highest number of chapter bosses felled in any single run. The continuous
   * chain is linear, so this doubles as "deepest chapter ever cleared" — the
   * small progression model the meta loop builds on (Ascension, deeper Grove
   * tiers). `chapter1Cleared` is the legacy boolean view of it (>= 1).
   */
  chaptersCleared: number;
  chapter1Cleared: boolean;
  druidGroveUnlocked: boolean;
  /**
   * NPC ids the player has been introduced to in-game. Drives whether the
   * soul-bond panel shows the real name (e.g. "Irenicus") or the pre-reveal
   * placeholder ("The Voice"). Persists across reincarnation — the reveal is
   * one-time-per-soul.
   */
  knownNpcs: string[];

  discoverMonster: (defId: string) => void;
  recordMonsterDefeat: (defId: string) => void;
  recordPlayerKilledBy: (defId: string, abilityName?: string) => void;
  purchaseUpgrade: (upgradeId: string) => { ok: boolean; reason?: string };
  setHasReincarnated: (v: boolean) => void;
  incrementDeathCount: () => void;
  /**
   * Record that `count` chapters were cleared in a run. Raises the all-time
   * high water mark and keeps the legacy `chapter1Cleared` flag in sync.
   */
  recordChapterCleared: (count: number) => void;
  setChapter1Cleared: (v: boolean) => void;
  setDruidGroveUnlocked: (v: boolean) => void;
  setUnlockedUpgrades: (u: UnlockedUpgrades) => void;
  markNpcKnown: (npcId: string) => void;
  resetMeta: () => void;
}

export const useMetaStore = create<MetaStoreState>()((set, get) => ({
  hasReincarnated: false,
  deathCount: 0,
  discoveredMonsters: [],
  monsterEncounters: {},
  monsterDefeats: {},
  monsterKilledBy: {},
  monsterKillingAbilities: {},
  unlockedUpgrades: {},
  chaptersCleared: 0,
  chapter1Cleared: false,
  druidGroveUnlocked: false,
  knownNpcs: [],

  discoverMonster: (defId) =>
    set((s) => {
      const already = s.discoveredMonsters.includes(defId);
      const prevCount = s.monsterEncounters[defId] ?? 0;
      return {
        discoveredMonsters: already ? s.discoveredMonsters : [...s.discoveredMonsters, defId],
        monsterEncounters: { ...s.monsterEncounters, [defId]: prevCount + 1 },
      };
    }),

  recordMonsterDefeat: (defId) =>
    set((s) => ({
      monsterDefeats: {
        ...s.monsterDefeats,
        [defId]: (s.monsterDefeats[defId] ?? 0) + 1,
      },
    })),

  recordPlayerKilledBy: (defId, abilityName) =>
    set((s) => {
      const prevForDef = s.monsterKillingAbilities[defId] ?? {};
      const nextForDef = abilityName
        ? { ...prevForDef, [abilityName]: (prevForDef[abilityName] ?? 0) + 1 }
        : prevForDef;
      return {
        monsterKilledBy: {
          ...s.monsterKilledBy,
          [defId]: (s.monsterKilledBy[defId] ?? 0) + 1,
        },
        monsterKillingAbilities: abilityName
          ? { ...s.monsterKillingAbilities, [defId]: nextForDef }
          : s.monsterKillingAbilities,
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
  recordChapterCleared: (count) =>
    set((s) => ({
      chaptersCleared: Math.max(s.chaptersCleared, count),
      chapter1Cleared: s.chapter1Cleared || count >= 1,
    })),
  setChapter1Cleared: (v) => set({ chapter1Cleared: v }),
  setDruidGroveUnlocked: (v) => set({ druidGroveUnlocked: v }),
  setUnlockedUpgrades: (u) => set({ unlockedUpgrades: u }),
  markNpcKnown: (npcId) =>
    set((s) =>
      s.knownNpcs.includes(npcId)
        ? s
        : { knownNpcs: [...s.knownNpcs, npcId] },
    ),

  resetMeta: () =>
    set({
      hasReincarnated: false,
      deathCount: 0,
      discoveredMonsters: [],
      monsterEncounters: {},
      monsterDefeats: {},
      monsterKilledBy: {},
      monsterKillingAbilities: {},
      unlockedUpgrades: {},
      chaptersCleared: 0,
      chapter1Cleared: false,
      druidGroveUnlocked: false,
      knownNpcs: [],
    }),
}));
