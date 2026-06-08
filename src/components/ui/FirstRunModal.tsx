import { useSettingsStore } from '../../stores/settingsStore';
import { feedbackEnabled } from '../../feedback/feedback';
import { LOCALES, type Locale } from '../../i18n';
import { useT } from '../../i18n/useT';
import { Button } from './Button';

/** Self-referential language labels — shown in their OWN language, never translated. */
const LANGUAGE_LABEL: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
};

/**
 * First-run welcome: shown once, the very first time a player opens the game
 * (gated on settingsStore.firstRunSeen). Two jobs — let them pick a display
 * language, and tell them this is an early alpha + where to leave feedback. The
 * alpha copy localizes live, so picking Español flips it on the spot. Cleared by
 * "Begin", which sets the persisted flag so it never reappears. Language stays
 * changeable later in Settings.
 */
export function FirstRunModal() {
  const { t, locale } = useT();
  const setLocale = useSettingsStore((s) => s.setLocale);
  const markFirstRunSeen = useSettingsStore((s) => s.markFirstRunSeen);

  const alphaBody = feedbackEnabled()
    ? t('ui.firstRun.alphaBody')
    : t('ui.firstRun.alphaBodyNoFeedback');

  return (
    <div className="fixed inset-0 z-[80] bg-black/85 flex items-center justify-center p-4 animate-fade-in">
      <div className="panel-etched-warm border-2 border-[var(--color-accent-gold)] max-w-md w-full p-6 animate-scale-in">
        <h1
          className="font-display text-2xl text-[var(--color-accent-amber)] tracking-[0.18em] text-center"
          style={{ textShadow: '3px 3px 0 rgba(0,0,0,0.85), 0 0 18px rgba(244,167,66,0.3)' }}
        >
          {t('ui.firstRun.welcome')}
        </h1>

        <div className="mt-6">
          <div className="font-display text-[10px] text-[var(--color-text-dim)] uppercase tracking-[0.3em] mb-2 text-center">
            {t('ui.firstRun.languageLabel')}
          </div>
          <div className="flex gap-2 justify-center">
            {LOCALES.map((l) => (
              <Button
                key={l}
                variant={l === locale ? 'primary' : 'secondary'}
                onClick={() => setLocale(l)}
                aria-pressed={l === locale}
                className="min-w-[7rem]"
              >
                {LANGUAGE_LABEL[l]}
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-6 border border-[var(--color-accent-deep-blood)] bg-[var(--color-bg-panel)] px-4 py-3">
          <div className="font-display text-[var(--color-accent-blood)] text-[10px] uppercase tracking-[0.3em] mb-1">
            {t('ui.firstRun.alphaTitle')}
          </div>
          <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">{alphaBody}</p>
        </div>

        <div className="mt-6 flex justify-center">
          <Button variant="primary" size="lg" onClick={markFirstRunSeen} className="min-w-[10rem]">
            {t('ui.firstRun.begin')}
          </Button>
        </div>
      </div>
    </div>
  );
}
