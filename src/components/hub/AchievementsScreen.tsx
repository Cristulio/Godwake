import { useMemo } from 'react';
import { Panel } from '../ui/Panel';
import { Button } from '../ui/Button';
import {
  ACHIEVEMENTS,
  type Achievement,
  type AchievementCategory,
} from '../../content/achievements';
import { useGameStore } from '../../stores/gameStore';
import { useT } from '../../i18n/useT';

interface AchievementsScreenProps {
  onBack: () => void;
}

const CATEGORY_ORDER: AchievementCategory[] = [
  'progression',
  'challenge',
  'quirky',
  'completionist',
];

/**
 * The dedicated Achievements record, reached from a hub tile. Groups every
 * achievement by category, shows an "earned / total" header, and renders each
 * row unlocked (full colour) or locked (dim). Spoiler-hidden achievements stay
 * masked behind "???" until earned. Content (name/description) localizes through
 * the `achievements` overlay seam; the chrome through `screens.achievements`.
 */
export function AchievementsScreen({ onBack }: AchievementsScreenProps) {
  const { t, tc } = useT();
  const unlocked = useGameStore((s) => s.unlockedAchievements);
  const unlockedSet = useMemo(() => new Set(unlocked), [unlocked]);

  const byCategory = useMemo(() => {
    const map: Record<AchievementCategory, Achievement[]> = {
      progression: [],
      challenge: [],
      quirky: [],
      completionist: [],
    };
    for (const a of ACHIEVEMENTS) map[a.category].push(a);
    return map;
  }, []);

  const total = ACHIEVEMENTS.length;
  const earned = ACHIEVEMENTS.filter((a) => unlockedSet.has(a.id)).length;

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-4xl mx-auto animate-room-enter">
      <header className="flex flex-wrap gap-2 items-start justify-between mb-4 pb-4 border-b border-[var(--color-border-warm)]">
        <div>
          <h1
            className="font-display text-2xl md:text-3xl text-[var(--color-accent-amber)] tracking-[0.15em]"
            style={{ textShadow: '3px 3px 0 rgba(0,0,0,0.85), 0 0 18px rgba(244,167,66,0.3)' }}
          >
            {t('screens.achievements.title')}
          </h1>
          <p className="text-[var(--color-text-secondary)] text-xs uppercase tracking-widest mt-1">
            {t('screens.achievements.subtitle')}
          </p>
          <p className="text-[var(--color-accent-gold)] font-mono text-sm mt-2">
            {t('screens.achievements.progress', { earned, total })}
          </p>
        </div>
        <Button variant="ghost" onClick={onBack}>
          {t('screens.achievements.back')}
        </Button>
      </header>

      <div className="flex flex-col gap-5">
        {CATEGORY_ORDER.map((category) => {
          const items = byCategory[category];
          const catEarned = items.filter((a) => unlockedSet.has(a.id)).length;
          return (
            <Panel
              key={category}
              tone="warm"
              title={`${t(`screens.achievements.categories.${category}`)} · ${catEarned}/${items.length}`}
            >
              <div className="grid sm:grid-cols-2 gap-3">
                {items.map((a) => (
                  <AchievementRow
                    key={a.id}
                    achievement={a}
                    unlocked={unlockedSet.has(a.id)}
                    t={t}
                    tc={tc}
                  />
                ))}
              </div>
            </Panel>
          );
        })}
      </div>

      <div className="flex justify-center mt-6">
        <Button variant="ghost" onClick={onBack}>
          {t('screens.achievements.back')}
        </Button>
      </div>
    </div>
  );
}

interface AchievementRowProps {
  achievement: Achievement;
  unlocked: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
  tc: (namespace: string, id: string, field: string, fallbackEnglish: string) => string;
}

function AchievementRow({ achievement, unlocked, t, tc }: AchievementRowProps) {
  // A hidden achievement stays masked until earned — name + description concealed.
  const masked = achievement.hidden && !unlocked;
  const name = masked
    ? t('screens.achievements.hiddenName')
    : tc('achievements', achievement.id, 'name', achievement.name);
  const desc = masked
    ? t('screens.achievements.hiddenDesc')
    : tc('achievements', achievement.id, 'description', achievement.description);

  return (
    <div
      className={`border p-3 transition-colors ${
        unlocked
          ? 'border-[var(--color-accent-gold)] bg-[rgba(244,167,66,0.06)]'
          : 'border-[var(--color-border-dim)] opacity-60'
      }`}
    >
      <div className="flex items-start gap-2">
        <span
          className={`text-sm shrink-0 ${
            unlocked ? 'text-[var(--color-accent-gold)]' : 'text-[var(--color-text-dim)]'
          }`}
          style={unlocked ? { textShadow: '0 0 8px rgba(244,167,66,0.7)' } : undefined}
          aria-hidden
        >
          {unlocked ? '◆' : '◇'}
        </span>
        <div className="min-w-0">
          <div
            className={`font-display text-[11px] uppercase tracking-[0.15em] ${
              unlocked ? 'text-[var(--color-accent-amber)]' : 'text-[var(--color-text-dim)]'
            }`}
          >
            {name}
          </div>
          <div className="text-[var(--color-text-secondary)] text-xs leading-relaxed mt-1">
            {desc}
          </div>
        </div>
      </div>
    </div>
  );
}
