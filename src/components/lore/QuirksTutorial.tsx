import { Button } from '../ui/Button';
import { useInputBlock } from '../ui/useInputBlock';
import { useT } from '../../i18n/useT';

interface QuirksTutorialProps {
  onDismiss: () => void;
}

/**
 * Shown once, after the player's first reincarnation. Explains the quirk
 * system so the new badges in the hub make sense.
 */
export function QuirksTutorial({ onDismiss }: QuirksTutorialProps) {
  const { t } = useT();
  const overlayRef = useInputBlock<HTMLDivElement>();
  return (
    <div
      ref={overlayRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-bg-base)]/85 p-4 animate-fade-in outline-none"
    >
      <div
        className="max-w-xl w-full max-h-[90vh] overflow-y-auto bg-[#1a140e] border-2 border-[var(--color-accent-amber)] shadow-[0_0_32px_rgba(244,167,66,0.35)] p-5 md:p-7 select-none"
      >
        <div className="text-[var(--color-accent-amber)] text-xs uppercase tracking-[0.4em] font-bold mb-3">
          {t('scenes.quirks.eyebrow')}
        </div>
        <h2 className="text-[var(--color-text-primary)] text-xl uppercase tracking-wider mb-3">
          {t('scenes.quirks.title')}
        </h2>
        <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed mb-3">
          {t('scenes.quirks.bodyA')}{' '}
          <span className="text-[var(--color-accent-amber)] font-bold">{t('scenes.quirks.bodyWord')}</span>{' '}
          {t('scenes.quirks.bodyB')}
        </p>
        <div className="bg-[var(--color-bg-elevated)] border border-[var(--color-border-dim)] p-3 mb-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="border border-[var(--color-status-poison)] text-[var(--color-status-poison)] text-[10px] uppercase tracking-widest px-1.5 py-0.5">
              {t('scenes.quirks.boon')}
            </span>
            <span className="text-[var(--color-text-secondary)] text-xs">
              {t('scenes.quirks.boonDesc')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="border border-[var(--color-accent-blood)] text-[var(--color-accent-blood)] text-[10px] uppercase tracking-widest px-1.5 py-0.5">
              {t('scenes.quirks.bane')}
            </span>
            <span className="text-[var(--color-text-secondary)] text-xs">
              {t('scenes.quirks.baneDesc')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="border border-[var(--color-accent-amber)] text-[var(--color-accent-amber)] text-[10px] uppercase tracking-widest px-1.5 py-0.5">
              {t('scenes.quirks.odd')}
            </span>
            <span className="text-[var(--color-text-secondary)] text-xs">
              {t('scenes.quirks.oddDesc')}
            </span>
          </div>
        </div>
        <p className="text-[var(--color-text-secondary)] text-sm italic leading-relaxed mb-4">
          {t('scenes.quirks.footer')}
        </p>
        <div className="flex justify-end">
          <Button variant="primary" onClick={onDismiss}>
            {t('scenes.quirks.understand')}
          </Button>
        </div>
      </div>
    </div>
  );
}
