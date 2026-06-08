import { useEffect, useState } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { playSfx } from '../../engine/audio';
import { useT } from '../../i18n/useT';
import { D20Die } from '../ui/D20Die';

interface DiceRollOverlayProps {
  attackerName: string;
  targetName: string;
  attackerKind: 'player' | 'monster';
  weaponName: string;
  attackBonus: number;
  rollNatural: number;
  total: number;
  targetAC: number;
  hit: boolean;
  crit: boolean;
  onDismiss: () => void;
}

/**
 * Side-panel dice display. Pinned to the top-right of the combat area so the
 * battlefield and sprite animations stay visible. Self-dismissing.
 */
export function DiceRollOverlay({
  attackerName,
  targetName,
  attackerKind,
  weaponName,
  attackBonus,
  rollNatural,
  total,
  targetAC,
  hit,
  crit,
  onDismiss,
}: DiceRollOverlayProps) {
  const { t } = useT();
  const speed = useSettingsStore((s) => s.speedMultiplier);
  const [spinning, setSpinning] = useState(true);
  const [shownNumber, setShownNumber] = useState(rollNatural);
  const [revealedResult, setRevealedResult] = useState(false);

  useEffect(() => {
    let mounted = true;
    const t = (ms: number) => Math.max(40, Math.round(ms / speed));

    playSfx('dice_clack');
    // Player swings are emitted from `playerAttack` so the audio matches the
    // equipped weapon's category. Monster swings come through here.
    if (attackerKind === 'monster') playSfx('swing_whoosh');

    const tickInterval = setInterval(() => {
      if (!mounted) return;
      setShownNumber(Math.floor(Math.random() * 20) + 1);
    }, t(35));

    const stopSpin = setTimeout(() => {
      if (!mounted) return;
      clearInterval(tickInterval);
      setShownNumber(rollNatural);
      setSpinning(false);
    }, t(260));

    const revealTimer = setTimeout(() => {
      if (!mounted) return;
      setRevealedResult(true);
      // A blow landing ON the player reads differently from the player's hits:
      // monster hits play the pained `player_hurt`, the player's land as `hit_thud`.
      if (crit) playSfx('crit_hit');
      else if (hit) playSfx(attackerKind === 'monster' ? 'player_hurt' : 'hit_thud');
      else playSfx('miss_whiff');
    }, t(330));

    const dismissTimer = setTimeout(() => {
      if (!mounted) return;
      onDismiss();
    }, t(1200));

    return () => {
      mounted = false;
      clearInterval(tickInterval);
      clearTimeout(stopSpin);
      clearTimeout(revealTimer);
      clearTimeout(dismissTimer);
    };
  }, [rollNatural, onDismiss, speed, hit, crit, attackerKind]);

  const resultLabel = crit ? t('combat.dice.crit') : hit ? t('combat.dice.hit') : t('combat.dice.miss');
  const resultClass = crit
    ? 'text-[var(--color-dmg-crit)]'
    : hit
      ? 'text-[var(--color-status-poison)]'
      : 'text-[var(--color-text-muted)]';

  return (
    <div className="w-full animate-fade-in" style={{ pointerEvents: 'none' }}>
      <div className="flex flex-col items-center gap-1.5">
        <div className="font-display text-[var(--color-accent-gold)] text-[8px] uppercase tracking-[0.3em] text-center truncate w-full">
          {weaponName}
        </div>
        <D20Die natural={shownNumber} spinning={spinning} glow={crit && !spinning} />
        {revealedResult ? (
          <div className="flex flex-col items-center gap-0.5 animate-scale-in w-full">
            <div className="text-[var(--color-text-primary)] text-[11px] font-mono">
              <span className="text-[var(--color-text-dim)]">{rollNatural}</span>
              <span className="text-[var(--color-text-secondary)]">
                {' '}{attackBonus >= 0 ? '+' : ''}{attackBonus}{' '}=
              </span>{' '}
              <span className="text-[var(--color-accent-amber)] font-bold text-base">{total}</span>
            </div>
            <div className="text-[var(--color-text-dim)] text-[9px] font-mono">
              {t('combat.dice.vsAc', { ac: targetAC })}
            </div>
            <div
              className={`font-display text-base uppercase tracking-[0.3em] mt-1 ${resultClass}`}
              style={{
                textShadow: crit
                  ? '0 0 12px rgba(255,71,48,0.8), 2px 2px 0 rgba(0,0,0,0.9)'
                  : '2px 2px 0 rgba(0,0,0,0.7)',
              }}
            >
              {resultLabel}
            </div>
          </div>
        ) : (
          <div className="text-[var(--color-text-dim)] text-[9px] font-mono uppercase tracking-widest h-9 flex items-center animate-pulse">
            {t('combat.dice.rolling')}
          </div>
        )}
        <div className="text-[var(--color-text-dim)] text-[8px] uppercase tracking-widest text-center truncate w-full mt-1">
          {attackerName} <span className="opacity-50">→</span> {targetName}
        </div>
      </div>
    </div>
  );
}

