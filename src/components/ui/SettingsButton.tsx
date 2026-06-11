import { useState } from 'react';
import { useAudioStore } from '../../stores/audioStore';
import { useT } from '../../i18n/useT';
import { useFeedbackUi } from '../../feedback/feedbackUi';
import { feedbackEnabled } from '../../feedback/feedback';
import { SettingsModal } from './SettingsModal';

/**
 * Fixed top-right mute pill + settings gear. Hidden on the title screen so it
 * doesn't fight with the painted backdrop.
 *
 * Below `lg` the cluster collapses to icon-only (▸/× and ⚙) so it stays compact
 * over narrow screens; at `lg`+ it shows the full word labels. The viewport-wide
 * screens reserve a top gutter for it on mobile (see App.tsx) so it never paints
 * over a screen header — on desktop the centered/maxed screens leave the corner
 * empty, so the fixed placement is unchanged there.
 */
export function SettingsButton() {
  const { t } = useT();
  const muted = useAudioStore((s) => s.muted);
  const toggleMuted = useAudioStore((s) => s.toggleMuted);
  const openFeedback = useFeedbackUi((s) => s.openFeedback);
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="fixed top-3 right-3 z-40 flex items-center gap-1 select-none">
        <button
          type="button"
          onClick={toggleMuted}
          title={muted ? t('ui.settings.unmute') : t('ui.settings.mute')}
          aria-label={muted ? t('ui.settings.unmute') : t('ui.settings.mute')}
          className={`inline-flex items-center justify-center min-w-[2.25rem] lg:min-w-0 px-2.5 py-1.5 lg:px-2 lg:py-1 border-2 text-xs lg:text-[10px] uppercase tracking-widest font-bold transition-colors ${
            muted
              ? 'bg-[var(--color-bg-panel)] border-[var(--color-border-warm)] text-[var(--color-text-dim)]'
              : 'bg-[var(--color-bg-panel)] border-[var(--color-border-warm)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-panel-hover)] hover:border-[var(--color-accent-amber)]'
          }`}
        >
          <span className="lg:hidden" aria-hidden="true">{muted ? '×' : '▸'}</span>
          <span className="hidden lg:inline">{muted ? `× ${t('ui.settings.muted')}` : `▸ ${t('ui.settings.soundLabel')}`}</span>
        </button>
        <button
          type="button"
          onClick={() => setOpen(true)}
          title={t('ui.settings.title')}
          aria-label={t('ui.settings.title')}
          className="inline-flex items-center justify-center min-w-[2.25rem] lg:min-w-0 px-2.5 py-1.5 lg:px-2 lg:py-1 border-2 border-[var(--color-border-warm)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-panel-hover)] hover:border-[var(--color-accent-amber)] text-xs lg:text-[10px] uppercase tracking-widest font-bold transition-colors"
        >
          <span className="lg:hidden" aria-hidden="true">⚙</span>
          <span className="hidden lg:inline">⚙ {t('ui.settings.title')}</span>
        </button>
        {feedbackEnabled() && (
          <button
            type="button"
            onClick={openFeedback}
            title={t('ui.feedback.title')}
            aria-label={t('ui.feedback.title')}
            className="inline-flex items-center justify-center min-w-[2.25rem] lg:min-w-0 px-2.5 py-1.5 lg:px-2 lg:py-1 border-2 border-[var(--color-border-warm)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-panel-hover)] hover:border-[var(--color-accent-amber)] text-xs lg:text-[10px] uppercase tracking-widest font-bold transition-colors"
          >
            <span aria-hidden="true">✎</span>
          </button>
        )}
      </div>
      {open && <SettingsModal onClose={() => setOpen(false)} />}
    </>
  );
}
