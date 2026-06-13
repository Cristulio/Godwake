import { useEffect, useState } from 'react';
import { getAchievement } from '../../content/achievements';
import { useT } from '../../i18n/useT';

interface AchievementToastProps {
  /** The achievement id at the head of the toast queue. */
  id: string;
  onDismiss: () => void;
}

const DISPLAY_MS = 3800;
const FADE_MS = 280;

/**
 * The unlock "sign" — a transient, NON-blocking banner that drops in at the top
 * of the screen when an achievement is earned, then fades itself away. It never
 * holds input (unlike the soul-voice / tutorial modals): it sits above whatever
 * screen is up and clears on its own timer, or early on tap. The positive chime
 * is played once per batch by engine/achievements/check.ts, so it isn't replayed
 * here. Keyed on `id` by the parent so each queued unlock remounts with a fresh
 * timer.
 */
export function AchievementToast({ id, onDismiss }: AchievementToastProps) {
  const { t, tc } = useT();
  const achievement = getAchievement(id);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const hold = setTimeout(() => setLeaving(true), DISPLAY_MS);
    const gone = setTimeout(onDismiss, DISPLAY_MS + FADE_MS);
    return () => {
      clearTimeout(hold);
      clearTimeout(gone);
    };
  }, [id, onDismiss]);

  if (!achievement) return null;

  const name = tc('achievements', achievement.id, 'name', achievement.name);
  const categoryLabel = t(`screens.achievements.categories.${achievement.category}`);

  return (
    <div
      className="fixed inset-x-0 top-0 z-[60] flex justify-end px-4 pt-16 pointer-events-none"
      role="status"
      aria-live="polite"
    >
      <button
        type="button"
        onClick={onDismiss}
        className={`pointer-events-auto max-w-md w-full text-left border-2 border-[var(--color-accent-gold)] px-4 py-3 shadow-[0_0_28px_rgba(244,167,66,0.5)] transition-all duration-300 ${
          leaving ? 'opacity-0 -translate-y-3' : 'opacity-100 translate-y-0 animate-fade-in'
        }`}
        style={{
          background: 'linear-gradient(135deg, #1f1708 0%, #2c1f0a 55%, #1a1305 100%)',
        }}
      >
        <div className="flex items-center gap-3">
          <span
            className="text-2xl text-[var(--color-accent-gold)] shrink-0"
            style={{ textShadow: '0 0 12px rgba(244,167,66,0.8)' }}
            aria-hidden
          >
            ◆
          </span>
          <div className="min-w-0">
            <div className="font-display text-[9px] uppercase tracking-[0.3em] text-[var(--color-accent-amber)]">
              {t('screens.achievements.toastTitle')}
            </div>
            <div className="text-[var(--color-text-primary)] text-sm font-bold truncate">
              {name}
            </div>
            <div className="text-[var(--color-text-dim)] text-[9px] uppercase tracking-widest mt-0.5">
              {categoryLabel}
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}
