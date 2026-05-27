import { create } from 'zustand';
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

/**
 * Screen routing + transient UI overlays (taunt, tutorial gates).
 *
 * Persisted bits (`screen`, `introSeen`, `quirksTutorialSeen`) ride the
 * shared facade persist (godwake-save-slot-0). `taunt` is session-only.
 */
interface ScreenStoreState {
  screen: Screen;
  introSeen: boolean;
  quirksTutorialSeen: boolean;
  taunt: { speaker: SoulVoiceSpeaker; context: TauntContext; seed: number } | null;

  setScreen: (screen: Screen) => void;
  goToTitle: () => void;
  goToHub: () => void;
  goToDelve: () => void;
  goToReincarnation: () => void;
  goToDruidGrove: () => void;
  goToCodex: () => void;
  goToInventory: () => void;
  showTaunt: (speaker: SoulVoiceSpeaker, context: TauntContext) => void;
  dismissTaunt: () => void;
  setIntroSeen: (v: boolean) => void;
  markQuirksTutorialSeen: () => void;
}

export const useScreenStore = create<ScreenStoreState>()((set) => ({
  screen: 'title',
  introSeen: false,
  quirksTutorialSeen: false,
  taunt: null,

  setScreen: (screen) => set({ screen }),
  goToTitle: () => set({ screen: 'title' }),
  goToHub: () => set({ screen: 'hub' }),
  goToDelve: () => set({ screen: 'delve' }),
  // deathCount lives on metaStore; goToReincarnation in the facade increments
  // it. This slice just flips the screen.
  goToReincarnation: () => set({ screen: 'reincarnation' }),
  goToDruidGrove: () => set({ screen: 'druid-grove' }),
  goToCodex: () => set({ screen: 'codex' }),
  goToInventory: () => set({ screen: 'inventory' }),
  showTaunt: (speaker, context) =>
    set({ taunt: { speaker, context, seed: Math.floor(Math.random() * 1000) } }),
  dismissTaunt: () => set({ taunt: null }),
  setIntroSeen: (v) => set({ introSeen: v }),
  markQuirksTutorialSeen: () => set({ quirksTutorialSeen: true }),
}));
