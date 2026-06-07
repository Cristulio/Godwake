import { useEffect, useState } from 'react';
import { Button } from './Button';
import { useT } from '../../i18n/useT';
import { useFeedbackUi } from '../../feedback/feedbackUi';
import { submitFeedback, type FeedbackCategory } from '../../feedback/feedback';

const MAX_LEN = 4000;

/**
 * In-world feedback modal: a message field, a Bug / Suggestion toggle, and
 * Submit / Cancel. Auto-context is gathered at submit time inside
 * `submitFeedback`, so the player only types what they want to say.
 */
export function FeedbackModal() {
  const { t } = useT();
  const open = useFeedbackUi((s) => s.open);
  const close = useFeedbackUi((s) => s.closeFeedback);

  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<FeedbackCategory>('bug');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  // Reset transient state whenever the modal opens.
  useEffect(() => {
    if (open) {
      setMessage('');
      setCategory('bug');
      setStatus('idle');
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit() {
    if (!message.trim() || status === 'sending') return;
    setStatus('sending');
    const result = await submitFeedback(message.trim(), category);
    if (result.ok) {
      setStatus('sent');
      setTimeout(close, 1400);
    } else {
      setStatus('error');
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="panel-etched-warm border-2 border-[var(--color-border-warm)] p-0 w-[min(96vw,520px)] max-h-[88vh] flex flex-col shadow-2xl animate-scale-in">
        <header className="flex items-center justify-between border-b border-[var(--color-border-warm)] px-5 py-3">
          <h2 className="font-display text-[var(--color-accent-amber)] text-sm uppercase tracking-[0.3em] flex items-center gap-2">
            <span className="text-[var(--color-accent-gold)]">◆</span> {t('ui.feedback.title')}
          </h2>
          <button
            type="button"
            onClick={close}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-accent-amber)] text-lg leading-none"
            aria-label={t('ui.feedback.closeAria')}
          >
            ×
          </button>
        </header>

        <div className="overflow-y-auto px-5 py-4 flex-1">
          <p className="text-[var(--color-text-muted)] text-[11px] italic mb-4 leading-tight">
            {t('ui.feedback.intro')}
          </p>

          <div className="flex gap-1 mb-3">
            {(['bug', 'suggestion'] as FeedbackCategory[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`px-3 py-1.5 border-2 text-[10px] uppercase tracking-widest font-bold transition-colors ${
                  category === c
                    ? 'border-[var(--color-accent-amber)] bg-[var(--color-bg-panel-hover)] text-[var(--color-accent-amber)]'
                    : 'border-[var(--color-border-warm)] bg-[var(--color-bg-panel)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent-amber)]'
                }`}
              >
                {t(c === 'bug' ? 'ui.feedback.bug' : 'ui.feedback.suggestion')}
              </button>
            ))}
          </div>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MAX_LEN))}
            placeholder={t('ui.feedback.placeholder')}
            rows={6}
            autoFocus
            disabled={status === 'sending' || status === 'sent'}
            className="w-full bg-[var(--color-bg-deep)] border border-[var(--color-border-dim)] text-[var(--color-text-primary)] text-sm p-2.5 leading-snug focus:border-[var(--color-accent-amber)] outline-none disabled:opacity-60"
          />
          <div className="mt-1 text-right text-[var(--color-text-muted)] text-[10px] font-mono">
            {message.length}/{MAX_LEN}
          </div>

          {status === 'sent' && (
            <div className="mt-2 text-[var(--color-accent-amber)] text-[11px] tracking-wider">
              {t('ui.feedback.sent')}
            </div>
          )}
          {status === 'error' && (
            <div className="mt-2 text-[var(--color-accent-blood)] text-[11px] tracking-wider">
              {t('ui.feedback.error')}
            </div>
          )}
        </div>

        <footer className="flex justify-end gap-2 border-t border-[var(--color-border-warm)] px-5 py-3">
          <Button variant="ghost" size="sm" onClick={close}>
            {t('ui.common.cancel')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={!message.trim() || status === 'sending' || status === 'sent'}
          >
            {status === 'sending' ? t('ui.feedback.sending') : t('ui.feedback.submit')}
          </Button>
        </footer>
      </div>
    </div>
  );
}
