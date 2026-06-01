import { create } from 'zustand';
import type { TauntContext, SoulVoiceSpeaker } from '../components/lore/IrenicusTaunt';
import type { Postmortem } from '../types/postmortem';

export type Screen =
  | 'title'
  | 'ascension-select'
  | 'character-creation'
  | 'intro'
  | 'hub'
  | 'delve'
  | 'spoils'
  | 'reincarnation'
  | 'ending'
  | 'codex'
  | 'inventory'
  | 'druid-grove'
  | 'level-up';

export interface Taunt {
  speaker: SoulVoiceSpeaker;
  context: TauntContext;
  seed: number;
  chapter?: number;
  /** Verbatim line for a progressive lore beat (overrides the seeded pool). */
  line?: string;
}

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
  /**
   * Session-only: the player is inside the New Game+ run-launcher
   * (ascension-select → character-select → descend). It steers the shared
   * character-select screen to descend on confirm instead of returning to the
   * hub, and its back buttons to step back through the flow. Cleared whenever
   * navigation lands on the hub or title.
   */
  newGamePlusFlow: boolean;
  /** The soul-voice line currently on screen (queue head), or null if none. */
  taunt: Taunt | null;
  /**
   * Lines waiting behind `taunt`. Two NPCs can fire close together (e.g. the
   * camp's Imoen whisper after a boss-clear Irenicus line) — queueing instead
   * of overwriting means each line is read and dismissed before the next shows.
   */
  tauntQueue: Taunt[];
  postmortem: Postmortem | null;
  /**
   * Feature ids whose one-time unlock tutorial is waiting to be shown, in
   * reveal order. Session-only (not persisted) — the persisted record of what's
   * already been taught is metaStore.seenTutorials. The delve-count trigger
   * fills this; App shows the head and dismissing it shifts to the next.
   */
  tutorialQueue: string[];

  setScreen: (screen: Screen) => void;
  goToTitle: () => void;
  goToHub: () => void;
  /** Enter the New Game+ run-launcher at its ascension-select step. */
  goToAscensionSelect: () => void;
  goToDelve: () => void;
  goToReincarnation: () => void;
  goToDruidGrove: () => void;
  goToCodex: () => void;
  goToInventory: () => void;
  showTaunt: (speaker: SoulVoiceSpeaker, context: TauntContext, chapter?: number) => void;
  /**
   * Enqueue a progressive lore beat (content/loreBeats.ts) with a verbatim line.
   * Queues behind the active overlay exactly like {@link showTaunt}.
   */
  playLoreBeat: (speaker: SoulVoiceSpeaker, context: TauntContext, line: string) => void;
  dismissTaunt: () => void;
  setIntroSeen: (v: boolean) => void;
  markQuirksTutorialSeen: () => void;
  /** Append unlock-tutorial ids to the reveal queue, skipping any already queued. */
  enqueueTutorials: (ids: string[]) => void;
  /** Drop the current tutorial off the front of the queue (after it's dismissed). */
  shiftTutorial: () => void;
  setPostmortem: (p: Postmortem | null) => void;
  clearPostmortem: () => void;
}

export const useScreenStore = create<ScreenStoreState>()((set) => ({
  screen: 'title',
  introSeen: false,
  quirksTutorialSeen: false,
  newGamePlusFlow: false,
  taunt: null,
  tauntQueue: [],
  postmortem: null,
  tutorialQueue: [],

  setScreen: (screen) => set({ screen }),
  goToTitle: () => set({ screen: 'title', newGamePlusFlow: false }),
  goToHub: () => set({ screen: 'hub', newGamePlusFlow: false }),
  goToAscensionSelect: () => set({ screen: 'ascension-select', newGamePlusFlow: true }),
  goToDelve: () => set({ screen: 'delve' }),
  // deathCount lives on metaStore; goToReincarnation in the facade increments
  // it. This slice just flips the screen.
  goToReincarnation: () => set({ screen: 'reincarnation' }),
  goToDruidGrove: () => set({ screen: 'druid-grove' }),
  goToCodex: () => set({ screen: 'codex' }),
  goToInventory: () => set({ screen: 'inventory' }),
  showTaunt: (speaker, context, chapter) =>
    set((s) => {
      const next: Taunt = {
        speaker,
        context,
        seed: Math.floor(Math.random() * 1000),
        chapter,
      };
      // Nothing on screen → show it now; otherwise queue behind the active line.
      return s.taunt
        ? { tauntQueue: [...s.tauntQueue, next] }
        : { taunt: next };
    }),
  playLoreBeat: (speaker, context, line) =>
    set((s) => {
      const next: Taunt = { speaker, context, seed: 0, line };
      return s.taunt ? { tauntQueue: [...s.tauntQueue, next] } : { taunt: next };
    }),
  dismissTaunt: () =>
    set((s) => {
      const [head, ...rest] = s.tauntQueue;
      return head ? { taunt: head, tauntQueue: rest } : { taunt: null };
    }),
  setIntroSeen: (v) => set({ introSeen: v }),
  markQuirksTutorialSeen: () => set({ quirksTutorialSeen: true }),
  enqueueTutorials: (ids) =>
    set((s) => {
      const fresh = ids.filter((id) => !s.tutorialQueue.includes(id));
      return fresh.length ? { tutorialQueue: [...s.tutorialQueue, ...fresh] } : s;
    }),
  shiftTutorial: () => set((s) => ({ tutorialQueue: s.tutorialQueue.slice(1) })),
  setPostmortem: (p) => set({ postmortem: p }),
  clearPostmortem: () => set({ postmortem: null }),
}));
