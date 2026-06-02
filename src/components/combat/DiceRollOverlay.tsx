import { useEffect, useState } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { playSfx } from '../../engine/audio';

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

  const resultLabel = crit ? 'CRIT!' : hit ? 'HIT' : 'MISS';
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
        <D20Svg natural={shownNumber} spinning={spinning} crit={crit && !spinning} />
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
              vs AC {targetAC}
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
            rolling…
          </div>
        )}
        <div className="text-[var(--color-text-dim)] text-[8px] uppercase tracking-widest text-center truncate w-full mt-1">
          {attackerName} <span className="opacity-50">→</span> {targetName}
        </div>
      </div>
    </div>
  );
}

function D20Svg({
  natural,
  spinning,
  crit,
}: {
  natural: number;
  spinning: boolean;
  crit: boolean;
}) {
  return (
    <div
      className={`
        relative w-16 h-16 flex items-center justify-center
        ${spinning ? 'animate-d20-tumble' : ''}
        ${crit ? 'drop-shadow-[0_0_18px_rgba(244,167,66,0.7)]' : ''}
      `}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <defs>
          <radialGradient id="d20-grad-side" cx="0.4" cy="0.35">
            <stop offset="0%" stopColor="#4a3a26" />
            <stop offset="55%" stopColor="#2d2218" />
            <stop offset="100%" stopColor="#1a1410" />
          </radialGradient>
        </defs>
        <polygon
          points="50,4 93,28 93,72 50,96 7,72 7,28"
          fill="url(#d20-grad-side)"
          stroke={crit ? '#f4a742' : '#8c6232'}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <polygon
          points="50,8 89,70 11,70"
          fill="none"
          stroke={crit ? '#ffb347' : '#6b4a2e'}
          strokeWidth="1"
          opacity="0.55"
        />
        <polygon
          points="50,92 89,30 11,30"
          fill="none"
          stroke={crit ? '#ffb347' : '#6b4a2e'}
          strokeWidth="1"
          opacity="0.55"
        />
        <polygon
          points="34,46 66,46 50,75"
          fill="#1a1410"
          stroke={crit ? '#f4a742' : '#8c6232'}
          strokeWidth="1.5"
        />
      </svg>
      <div
        className={`
          absolute inset-0 flex items-center justify-center font-mono text-lg pt-2
          ${crit ? 'text-[var(--color-accent-amber)]' : 'text-[var(--color-text-primary)]'}
        `}
      >
        {natural}
      </div>
    </div>
  );
}
