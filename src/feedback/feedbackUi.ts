import { create } from 'zustand';

/** Session-only open/close state for the feedback modal, so the screen-corner
 * button and the Settings entry can both summon the one modal mounted in App. */
interface FeedbackUiState {
  open: boolean;
  openFeedback: () => void;
  closeFeedback: () => void;
}

export const useFeedbackUi = create<FeedbackUiState>((set) => ({
  open: false,
  openFeedback: () => set({ open: true }),
  closeFeedback: () => set({ open: false }),
}));
