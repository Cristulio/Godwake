import { useEffect, useState } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { playSfx } from '../../engine/audio';
import { useT } from '../../i18n/useT';
import { D20Die } from '../ui/D20Die';
import type { SkillCheckResult } from '../../engine/character/skillCheck';

interface EventDiceRollProps {
  check: SkillCheckResult;
  /** Already-localized skill name (e.g. "Persuasion" / "Persuasión"). */
  skillName: string;
  /** Fires once the roll has fully resolved (or the player taps to skip). */
  onDone: () => void;
}

/**
 * BG3-style skill-check roll for out-of-combat events. A centred d20 tumbles,
 * lands on the natural roll, then the bonus math and the verdict resolve in.
 * Self-dismisses after a couple of seconds; tapping anywhere skips ahead.
 */
export function EventDiceRoll({ check, skillName, onDone }: EventDiceRollProps) {
  const { t } = useT();
  const speed = useSettingsStore((s) => s.speedMultiplier);
  const [spinning, setSpinning] = useState(true);
  const [shownNumber, setShownNumber] = useState(check.d20);
  const [revealedTotal, setRevealedTotal] = useState(false);
  const [revealedVerdict, setRevealedVerdict] = useState(false);

  useEffect(() => {
    let mounted = true;
    // Dice animation caps at 2× — at 4× the tumble is too quick to read.
    const ms = (n: number) => Math.max(40, Math.round(n / Math.min(speed, 2)));

    playSfx('dice_clack');

    const tick = setInterval(() => {
      if (!mounted) return;
      setShownNumber(Math.floor(Math.random() * 20) + 1);
    }, ms(60));

    const stopSpin = setTimeout(() => {
      if (!mounted) return;
      clearInterval(tick);
      setShownNumber(check.d20);
      setSpinning(false);
      playSfx('ui_click');
    }, ms(900));

    const showTotal = setTimeout(() => {
      if (!mounted) return;
      setRevealedTotal(true);
    }, ms(1300));

    const showVerdict = setTimeout(() => {
      if (!mounted) return;
      setRevealedVerdict(true);
      playSfx(check.passed ? 'shrine_chime' : 'miss_whiff');
    }, ms(1700));

    const dismiss = setTimeout(() => {
      if (!mounted) return;
      onDone();
    }, ms(2500));

    return () => {
      mounted = false;
      clearInterval(tick);
      clearTimeout(stopSpin);
      clearTimeout(showTotal);
      clearTimeout(showVerdict);
      clearTimeout(dismiss);
    };
  }, [check, onDone, speed]);

  const verdictClass = check.passed
    ? 'text-[var(--color-status-poison)]'
    : 'text-[var(--color-accent-blood)]';

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={t('delve.event.skipRoll')}
      onClick={onDone}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') onDone();
      }}
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6 animate-fade-in cursor-pointer"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="font-display text-[var(--color-accent-gold)] text-[10px] uppercase tracking-[0.3em] text-center">
          {skillName}
        </div>

        <D20Die natural={shownNumber} spinning={spinning} glow={!spinning && check.d20 === 20} />

        {revealedTotal ? (
          <div className="flex flex-col items-center gap-1 animate-scale-in">
            <div className="text-[var(--color-text-primary)] text-base font-mono">
              <span className="text-[var(--color-text-dim)]">{check.d20}</span>
              {check.abilityMod !== 0 && (
                <span className="text-[var(--color-text-secondary)]">
                  {' '}{check.abilityMod >= 0 ? '+' : '−'}{Math.abs(check.abilityMod)}
                </span>
              )}
              {check.proficiencyMod !== 0 && (
                <span className="text-[var(--color-accent-amber)]"> +{check.proficiencyMod}</span>
              )}
              <span className="text-[var(--color-text-secondary)]"> =</span>{' '}
              <span className="text-[var(--color-accent-amber)] font-bold text-2xl">{check.total}</span>
            </div>
            <div className="text-[var(--color-text-dim)] text-[10px] font-mono uppercase tracking-widest">
              {t('delve.event.vsDc', { dc: check.dc })}
            </div>
          </div>
        ) : (
          <div className="text-[var(--color-text-dim)] text-[10px] font-mono uppercase tracking-widest h-10 flex items-center animate-pulse">
            {t('combat.dice.rolling')}
          </div>
        )}

        {revealedVerdict && (
          <div
            className={`font-display text-xl uppercase tracking-[0.3em] mt-1 animate-scale-in ${verdictClass}`}
            style={{
              textShadow: check.passed
                ? '0 0 12px rgba(122,196,108,0.6), 2px 2px 0 rgba(0,0,0,0.9)'
                : '2px 2px 0 rgba(0,0,0,0.7)',
            }}
          >
            {check.passed ? t('delve.event.success') : t('delve.event.failure')}
          </div>
        )}
      </div>
    </div>
  );
}
