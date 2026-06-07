import { useState } from 'react';
import { Button } from '../ui/Button';
import { useGameStore } from '../../stores/gameStore';
import { getAscensionLevel, MAX_ASCENSION } from '../../engine/delve';
import { useT } from '../../i18n/useT';

/** Truthful, config-derived list of the modifiers ACTIVE at a level (they accumulate). */
function activeModifierLines(
  level: ReturnType<typeof getAscensionLevel>,
  t: (key: string, params?: Record<string, string | number>) => string,
): string[] {
  const lines: string[] = [];
  if (level.enemyHpMult > 1) {
    lines.push(t('screens.ascension.enemyHp', { pct: Math.round((level.enemyHpMult - 1) * 100) }));
  }
  if (level.enemyDamageBonus > 0) {
    lines.push(t('screens.ascension.enemyDamage', { n: level.enemyDamageBonus }));
  }
  if (level.bossHpMult > 1) {
    lines.push(t('screens.ascension.bossHp', { pct: Math.round((level.bossHpMult - 1) * 100) }));
  }
  if (level.startingGoldMult < 1) {
    lines.push(t('screens.ascension.lessGold', { pct: Math.round((1 - level.startingGoldMult) * 100) }));
  }
  return lines;
}

/**
 * New Game+ run-launcher, step one: pick how deep the wheel bites this descent.
 * Reached from the title once the chain has been cleared once (gameCompleted →
 * ascensionUnlocked > 0). The player may dial any level 0..unlocked (Spire-style);
 * confirming carries the choice into character-select and then the descent.
 */
export function AscensionSelectScreen() {
  const { t } = useT();
  const ascensionUnlocked = useGameStore((s) => s.ascensionUnlocked);
  const storedAscension = useGameStore((s) => s.selectedAscension);
  const confirmAscensionSelection = useGameStore((s) => s.confirmAscensionSelection);
  const goToTitle = useGameStore((s) => s.goToTitle);

  const [selected, setSelected] = useState(() =>
    Math.max(0, Math.min(storedAscension || ascensionUnlocked, ascensionUnlocked)),
  );
  const level = getAscensionLevel(selected);
  const atCeiling = ascensionUnlocked >= MAX_ASCENSION;
  const modifiers = activeModifierLines(level, t);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 md:px-6 md:py-12 animate-room-enter">
      <div className="w-full max-w-xl">
        <header className="text-center mb-8">
          <div className="font-display text-[var(--color-text-dim)] text-[9px] uppercase tracking-[0.4em] mb-3">
            {t('screens.ascension.eyebrow')}
          </div>
          <h1
            className="font-display text-3xl md:text-4xl text-[var(--color-accent-amber)] tracking-[0.2em]"
            style={{ textShadow: '0 0 18px rgba(244,167,66,0.45), 4px 4px 0 rgba(0,0,0,0.85)' }}
          >
            {t('screens.ascension.heading')}
          </h1>
          <p className="font-narrative text-[var(--color-text-secondary)] text-sm italic mt-3 leading-relaxed">
            {t('screens.ascension.intro')}
          </p>
        </header>

        <div className="border border-[var(--color-border-warm)] bg-[var(--color-bg-deep)]/40 p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="font-display text-[9px] text-[var(--color-text-dim)] uppercase tracking-widest">
              {t('screens.ascension.label')}
            </div>
            <div className="font-mono text-[9px] text-[var(--color-text-dim)] uppercase tracking-widest">
              {atCeiling
                ? t('screens.ascension.mastered')
                : t('screens.ascension.highestUnlocked', { n: ascensionUnlocked })}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {Array.from({ length: ascensionUnlocked + 1 }, (_, lvl) => {
              const active = lvl === selected;
              return (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setSelected(lvl)}
                  className={`
                    w-10 h-10 border-2 font-mono text-sm transition-colors
                    ${active
                      ? 'border-[var(--color-accent-amber)] text-[var(--color-accent-amber)] bg-[var(--color-bg-panel)]'
                      : 'border-[var(--color-border-dim)] text-[var(--color-text-dim)] hover:border-[var(--color-border-warm)] hover:text-[var(--color-text-secondary)]'}
                  `}
                  aria-label={t('screens.ascension.levelAria', { n: lvl })}
                  aria-pressed={active}
                >
                  {lvl}
                </button>
              );
            })}
          </div>
          {modifiers.length === 0 ? (
            <div className="text-[var(--color-text-secondary)] text-xs italic leading-relaxed">
              {t('screens.ascension.noModifiers')}
            </div>
          ) : (
            <ul className="text-[var(--color-text-secondary)] text-xs leading-relaxed list-none space-y-0.5">
              {modifiers.map((m) => (
                <li key={m} className="flex gap-1.5">
                  <span className="text-[var(--color-accent-blood)]">▸</span>
                  {m}
                </li>
              ))}
            </ul>
          )}
          <div className="font-mono text-[10px] text-[var(--color-accent-gold)] uppercase tracking-widest mt-2">
            {t('screens.ascension.renownReward', { mult: level.renownMult.toFixed(2) })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={goToTitle}>
            {t('screens.ascension.backTitle')}
          </Button>
          <Button
            variant="primary"
            size="lg"
            onClick={() => confirmAscensionSelection(selected)}
          >
            {selected > 0
              ? t('screens.ascension.chooseSoulAt', { n: selected })
              : t('screens.ascension.chooseSoul')}
          </Button>
        </div>
      </div>
    </div>
  );
}
