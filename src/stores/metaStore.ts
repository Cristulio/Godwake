import { create } from 'zustand';
import type { Character } from '../types/character';
import { applyPermanentUpgrade, type UnlockedUpgrades } from '../engine/character/upgrades';
import { getUpgrade } from '../content/upgrades';
import { MAX_ASCENSION } from '../engine/delve/ascension';
import { useCharacterStore } from './characterStore';
import { getActiveRoller } from '../engine/dice';
import {
  LEGENDARY_ORDER,
  legendaryBankPool,
  aggregateLegendaryEffects,
  canEquipLegendary,
} from '../content/legendaries';
import { isFeatureUnlocked } from '../engine/progression/unlocks';

/**
 * Long-term progress that survives reincarnation but resets on New Game:
 * codex discoveries, reincarnation counters, Grove purchases, chapter gates.
 *
 * Persisted as part of the facade's slot-0 snapshot.
 */
interface MetaStoreState {
  hasReincarnated: boolean;
  deathCount: number;
  /**
   * Account-level count of delves STARTED (incremented on every descent, see
   * delveStore.startDelve). Survives reincarnation like deathCount. Drives the
   * progressive-unlock ladder (engine/progression/unlocks.ts): features open as
   * this crosses authored thresholds. A brand-new soul starts at 0; migrated
   * veterans are floored to 999 so onboarding never re-gates them.
   */
  delveCount: number;
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
   * Highest ascension level the player has unlocked (default 0 = base only).
   * Clearing the chain at this level unlocks the next (Spire-style); a lower
   * level may always be replayed. Gates the hub ascension selector and the
   * deeper Grove tiers. Persisted.
   */
  ascensionUnlocked: number;
  /**
   * NPC ids the player has been introduced to in-game. Drives whether the
   * soul-bond panel shows the real name (e.g. "Irenicus") or the pre-reveal
   * placeholder ("The Voice"). Persists across reincarnation — the reveal is
   * one-time-per-soul.
   */
  knownNpcs: string[];
  /**
   * Dialogue beat IDs the soul has already heard. Prevents one-time beats
   * (e.g. Imoen's camp/rest whispers) from replaying on re-entry or in
   * subsequent runs. Soul-level — persists across reincarnations.
   */
  seenDialogueBeats: string[];
  /**
   * Tutorial ids the soul has already been shown. Phase-2 onboarding tutorials
   * mark themselves seen here so a one-time prompt never replays. Soul-level —
   * persists across reincarnation, reset only on New Game.
   */
  seenTutorials: string[];
  /**
   * Legendary relics the soul has earned (cross-delve persistent gear, hub-only).
   * Account level — survives reincarnation, reset only on New Game. Earned at the
   * elite node (the fight-the-elite risk path) and the shop reliquary.
   */
  ownedLegendaries: string[];
  /**
   * The owned legendaries currently EQUIPPED (no slot cap — they stay on until
   * changed). Their effect payloads are baked onto the character by
   * `setActiveLegendaries`; class-bound relics only stick while playing that class.
   */
  activeLegendaries: string[];
  /**
   * Whether the soul has cleared the whole chain (felled Melissan) at least once.
   * Set the first time the final chapter is cleared. Gates the one-time
   * Throne-of-Bhaal ending capstone — later full clears fall straight through to
   * the normal reincarnation flow — and unlocks the title's New Game+ entry (the
   * ascension-select run-launcher). Account-level: survives reincarnation AND a
   * New Game (the mastery is permanent), reset only by deleting the save.
   */
  gameCompleted: boolean;
  /**
   * The ascension level the soul's current run is being played at. Chosen in the
   * New Game+ flow's ascension-select step and reused by every descent of that
   * run (incl. post-death hub re-descents), so the whole replay stays at one
   * difficulty. 0 = base chain. Clamped to `ascensionUnlocked`. Reset to 0 on a
   * fresh base New Game. Persisted.
   */
  selectedAscension: number;

  discoverMonster: (defId: string) => void;
  recordMonsterDefeat: (defId: string) => void;
  recordPlayerKilledBy: (defId: string, abilityName?: string) => void;
  purchaseUpgrade: (upgradeId: string) => { ok: boolean; reason?: string };
  setHasReincarnated: (v: boolean) => void;
  incrementDeathCount: () => void;
  /** Bump the account-level delve counter by one (called on every descent). */
  incrementDelveCount: () => void;
  /**
   * Record that `count` chapters were cleared in a run. Raises the all-time
   * high water mark and keeps the legacy `chapter1Cleared` flag in sync.
   */
  recordChapterCleared: (count: number) => void;
  setChapter1Cleared: (v: boolean) => void;
  setDruidGroveUnlocked: (v: boolean) => void;
  /**
   * Clear-the-chain payoff: if the run was played at the current highest
   * unlocked level, open the next rung (capped at MAX_ASCENSION). Replaying a
   * lower level unlocks nothing new.
   */
  unlockNextAscension: (clearedAtLevel: number) => void;
  setUnlockedUpgrades: (u: UnlockedUpgrades) => void;
  markNpcKnown: (npcId: string) => void;
  markDialogueBeatSeen: (beatId: string) => void;
  /** Record that a one-time tutorial has been shown to this soul. */
  markTutorialSeen: (tutorialId: string) => void;
  /**
   * Bank a RANDOM un-owned legendary (the elite-node drop path). Drops can be any
   * class's relic — off-class ones are stashed until the player runs that class.
   * Returns the banked id, or null when none remain. Banks to the collection
   * only; the player equips it at the hub for a future descent.
   */
  grantLegendaryDrop: (allowAscendant: boolean) => string | null;
  /**
   * Bank a SPECIFIC legendary by id (the shop "reliquary" purchase). Adds it to
   * the collection if it's a real, un-owned relic. Returns whether it banked.
   */
  bankLegendary: (id: string) => boolean;
  /**
   * Set the equipped legendaries (validated against ownership + the class-bound
   * gate; no slot cap) and bake their effect payloads onto the active character.
   */
  setActiveLegendaries: (ids: string[]) => void;
  /**
   * Mark the whole chain cleared (felled Melissan). Set once the Throne-of-Bhaal
   * ending capstone has played; idempotent. Unlocks the title's New Game+ entry.
   */
  markGameCompleted: () => void;
  /** Set the run's ascension level, clamped to 0..ascensionUnlocked. */
  setSelectedAscension: (level: number) => void;
  resetMeta: () => void;
}

export const useMetaStore = create<MetaStoreState>()((set, get) => ({
  hasReincarnated: false,
  deathCount: 0,
  delveCount: 0,
  discoveredMonsters: [],
  monsterEncounters: {},
  monsterDefeats: {},
  monsterKilledBy: {},
  monsterKillingAbilities: {},
  unlockedUpgrades: {},
  chaptersCleared: 0,
  chapter1Cleared: false,
  druidGroveUnlocked: false,
  ascensionUnlocked: 0,
  knownNpcs: [],
  seenDialogueBeats: [],
  seenTutorials: [],
  ownedLegendaries: [],
  activeLegendaries: [],
  gameCompleted: false,
  selectedAscension: 0,

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
    const requiredAscension = up.unlock?.ascension ?? 0;
    if (get().ascensionUnlocked < requiredAscension) {
      return { ok: false, reason: up.unlock?.label ?? 'Locked.' };
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
      // permanent HP upgrades raise the soul's HP ceiling. applyPermanentUpgrade
      // only bumps permanentBonuses.hp — the value startDelve / reincarnateSoul
      // fold back into hp.max on the next life. Unlike AC / attack / damage
      // (read live through derived.ts), hp.max is a stored absolute, so without
      // this the hub header keeps showing the old max until the next descent.
      // Mirror the delta onto the live pool now so the purchase reads immediately.
      const hpDelta =
        (next.permanentBonuses?.hp ?? 0) - (character.permanentBonuses?.hp ?? 0);
      if (hpDelta !== 0) {
        next = {
          ...next,
          hp: {
            ...next.hp,
            max: next.hp.max + hpDelta,
            current: next.hp.current + hpDelta,
          },
        };
      }
    }
    useCharacterStore.getState().setCharacter(next);
    set({
      unlockedUpgrades: { ...get().unlockedUpgrades, [upgradeId]: nextRank },
    });
    return { ok: true };
  },

  setHasReincarnated: (v) => set({ hasReincarnated: v }),
  incrementDeathCount: () => set((s) => ({ deathCount: s.deathCount + 1 })),
  incrementDelveCount: () => set((s) => ({ delveCount: s.delveCount + 1 })),
  recordChapterCleared: (count) =>
    set((s) => ({
      chaptersCleared: Math.max(s.chaptersCleared, count),
      chapter1Cleared: s.chapter1Cleared || count >= 1,
    })),
  setChapter1Cleared: (v) => set({ chapter1Cleared: v }),
  setDruidGroveUnlocked: (v) => set({ druidGroveUnlocked: v }),
  unlockNextAscension: (clearedAtLevel) =>
    set((s) =>
      clearedAtLevel >= s.ascensionUnlocked && s.ascensionUnlocked < MAX_ASCENSION
        ? { ascensionUnlocked: s.ascensionUnlocked + 1 }
        : s,
    ),
  setUnlockedUpgrades: (u) => set({ unlockedUpgrades: u }),
  markNpcKnown: (npcId) =>
    set((s) =>
      s.knownNpcs.includes(npcId)
        ? s
        : { knownNpcs: [...s.knownNpcs, npcId] },
    ),

  markDialogueBeatSeen: (beatId) =>
    set((s) =>
      s.seenDialogueBeats.includes(beatId)
        ? s
        : { seenDialogueBeats: [...s.seenDialogueBeats, beatId] },
    ),

  markTutorialSeen: (tutorialId) =>
    set((s) =>
      s.seenTutorials.includes(tutorialId)
        ? s
        : { seenTutorials: [...s.seenTutorials, tutorialId] },
    ),

  grantLegendaryDrop: (allowAscendant) => {
    const owned = get().ownedLegendaries;
    // Elite-node drops can yield ANY class's relic; off-class relics are stashed
    // until the player runs that class (the equip gate handles use). The apex
    // ascendant tier only enters this pool at Ascension >= 3 (allowAscendant).
    const pool = legendaryBankPool(allowAscendant).filter((id) => !owned.includes(id));
    if (pool.length === 0) return null;
    const pick = pool[(getActiveRoller().roll('1d100').total - 1) % pool.length];
    set({ ownedLegendaries: [...owned, pick] });
    return pick;
  },

  bankLegendary: (id) => {
    const owned = get().ownedLegendaries;
    if (owned.includes(id) || !LEGENDARY_ORDER.includes(id)) return false;
    set({ ownedLegendaries: [...owned, id] });
    return true;
  },

  setActiveLegendaries: (ids) => {
    const owned = get().ownedLegendaries;
    const classId = useCharacterStore.getState().character?.classId;
    // Keep only owned ids, dedupe, and drop class-bound relics the current class
    // can't equip. No slot cap — equipped relics stay on until changed.
    const valid = [...new Set(ids)].filter(
      (id) => owned.includes(id) && (!classId || canEquipLegendary(id, classId)),
    );
    set({ activeLegendaries: valid });
    // Bake the effect payloads onto the live character so the affix pipeline
    // reads them. The field rides reincarnation/descent via object spread
    // (reincarnateSoul, startDelve) and a hub swap via carrySoulProgress.
    const charSlice = useCharacterStore.getState();
    const character = charSlice.character;
    if (character) {
      const setsUnlocked = isFeatureUnlocked('sets', get());
      charSlice.setCharacter({
        ...character,
        legendaryEffects: aggregateLegendaryEffects(valid, setsUnlocked),
      });
    }
  },

  markGameCompleted: () =>
    set((s) => (s.gameCompleted ? s : { gameCompleted: true })),

  setSelectedAscension: (level) =>
    set((s) => ({
      selectedAscension: Math.max(0, Math.min(Math.floor(level), s.ascensionUnlocked)),
    })),

  resetMeta: () =>
    set({
      hasReincarnated: false,
      deathCount: 0,
      delveCount: 0,
      discoveredMonsters: [],
      monsterEncounters: {},
      monsterDefeats: {},
      monsterKilledBy: {},
      monsterKillingAbilities: {},
      unlockedUpgrades: {},
      chaptersCleared: 0,
      chapter1Cleared: false,
      druidGroveUnlocked: false,
      ascensionUnlocked: 0,
      knownNpcs: [],
      seenDialogueBeats: [],
      seenTutorials: [],
      ownedLegendaries: [],
      activeLegendaries: [],
      gameCompleted: false,
      selectedAscension: 0,
    }),
}));
