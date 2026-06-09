import { useEffect, useState } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { playSfx } from '../../engine/audio';
import { useT } from '../../i18n/useT';
import { D20Die } from '../ui/D20Die';

interface CampDiceRollProps {
  /** The d20 the bones came up. */
  roll: number;
  /** Whether the dark answered (win) or took its due (loss). */
  win: boolean;
  /** Fires once the roll resolves (or the player taps to skip). */
  onDone: () => void;
}

/**
 * "Throw the bones" (Tempt the Dark) roll — a centred d20 tumbles, lands on the
 * roll, then the verdict resolves in. Mirrors the event skill-check roll; the
 * dark answers on a high roll, takes its due on a low one. Dice animation caps
 * at 2× (at 4× the tumble is too quick to read).
 */
export function CampDiceRoll({ roll, win, onDone }: CampDiceRollProps) {
  const { t } = useT();
  const speed = useSettingsStore((s) => s.speedMultiplier);
  const [spinning, setSpinning] = useState(true);
  const [shown, setShown] = useState(roll);
  const [revealedVerdict, setRevealedVerdict] = useState(false);

  useEffect(() => {
    let mounted = true;
    const ms = (n: number) => Math.max(40, Math.round(n / Math.min(speed, 2)));

    playSfx('dice_clack');

    const tick = setInterval(() => {
      if (!mounted) return;
      setShown(Math.floor(Math.random() * 20) + 1);
    }, ms(60));

    const stopSpin = setTimeout(() => {
      if (!mounted) return;
      clearInterval(tick);
      setShown(roll);
      setSpinning(false);
      playSfx('ui_click');
    }, ms(900));

    const showVerdict = setTimeout(() => {
      if (!mounted) return;
      setRevealedVerdict(true);
      playSfx(win ? 'shrine_chime' : 'hit_thud');
    }, ms(1500));

    const dismiss = setTimeout(() => {
      if (!mounted) return;
      onDone();
    }, ms(2400));

    return () => {
      mounted = false;
      clearInterval(tick);
      clearTimeout(stopSpin);
      clearTimeout(showVerdict);
      clearTimeout(dismiss);
    };
  }, [roll, win, onDone, speed]);

  const verdictClass = win
    ? 'text-[var(--color-accent-gold)]'
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
          {t('delve.camp.risk.title')}
        </div>

        <D20Die natural={shown} spinning={spinning} glow={!spinning && win} />

        {!spinning ? (
          <div className="text-[var(--color-accent-amber)] font-mono font-bold text-2xl animate-scale-in">
            {roll}
          </div>
        ) : (
          <div className="text-[var(--color-text-dim)] text-[10px] font-mono uppercase tracking-widest h-8 flex items-center animate-pulse">
            {t('combat.dice.rolling')}
          </div>
        )}

        {revealedVerdict && (
          <div
            className={`font-display text-xl uppercase tracking-[0.3em] mt-1 animate-scale-in ${verdictClass}`}
            style={{
              textShadow: win
                ? '0 0 12px rgba(244,167,66,0.6), 2px 2px 0 rgba(0,0,0,0.9)'
                : '2px 2px 0 rgba(0,0,0,0.7)',
            }}
          >
            {win ? t('delve.camp.risk.diceWin') : t('delve.camp.risk.diceLoss')}
          </div>
        )}
      </div>
    </div>
  );
}
