import { useGameStore } from '../../stores/gameStore';
import { useT } from '../../i18n/useT';
import { useFeedbackUi } from '../../feedback/feedbackUi';
import { feedbackEnabled } from '../../feedback/feedback';

/**
 * Small unobtrusive screen-corner feedback trigger. Lives bottom-left so it
 * never fights the top-right Sound/Settings cluster or a bottom combat bar.
 * Hidden when the Worker URL isn't configured (the feature no-ops until wired),
 * and on the title + delve screens to keep them clean — the Settings modal
 * carries the same entry for in-delve access.
 */
export function FeedbackButton() {
  const { t } = useT();
  const screen = useGameStore((s) => s.screen);
  const openFeedback = useFeedbackUi((s) => s.openFeedback);

  if (!feedbackEnabled()) return null;
  if (screen === 'title' || screen === 'delve') return null;

  return (
    <button
      type="button"
      onClick={openFeedback}
      title={t('ui.feedback.title')}
      aria-label={t('ui.feedback.title')}
      className="fixed bottom-3 left-3 z-40 inline-flex items-center justify-center min-w-[2.25rem] lg:min-w-0 px-2.5 py-1.5 lg:px-2 lg:py-1 border-2 border-[var(--color-border-warm)] text-[var(--color-text-secondary)] bg-[var(--color-bg-panel)] hover:bg-[var(--color-bg-panel-hover)] hover:border-[var(--color-accent-amber)] text-xs lg:text-[10px] uppercase tracking-widest font-bold transition-colors select-none"
    >
      <span className="lg:hidden" aria-hidden="true">✎</span>
      <span className="hidden lg:inline">✎ {t('ui.feedback.button')}</span>
    </button>
  );
}
