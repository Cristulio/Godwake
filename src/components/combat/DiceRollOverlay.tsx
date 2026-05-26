import { useEffect, useState } from 'react';
import { useGameStore } from '../../stores/gameStore';

interface DiceRollOverlayProps {
  attackerName: string;
  targetName: string;
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
  weaponName,
  attackBonus,
  rollNatural,
  total,
  targetAC,
  hit,
  crit,
  onDismiss,
}: DiceRollOverlayProps) {
  const speed = useGameStore((s) => s.speedMultiplier);
  const [spinning, setSpinning] = useState(true);
  const [shownNumber, setShownNumber] = useState(rollNatural);
  const [revealedResult, setRevealedResult] = useState(false);

  useEffect(() => {
    let mounted = true;
    const t = (ms: number) => Math.max(40, Math.round(ms / speed));

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
  }, [rollNatural, onDismiss, speed]);

  const resultLabel = crit ? 'CRITICAL' : hit ? 'HIT' : 'MISS';
  const resultClass = crit
    ? 'text-[var(--color-accent-amber)]'
    : hit
      ? 'text-[var(--color-status-poison)]'
      : 'text-[var(--color-text-muted)]';

  return (
    <div
      className="absolute top-2 right-2 z-40 w-44 bg-[var(--color-bg-panel)] border-2 border-[var(--color-border-warm)] p-2 shadow-[0_6px_24px_rgba(0,0,0,0.55)] animate-fade-in"
      style={{ pointerEvents: 'none' }}
    >
      <div className="flex flex-col items-center gap-1.5">
        <div className="text-[var(--color-text-secondary)] text-[9px] uppercase tracking-[0.25em] text-center truncate w-full">
          {weaponName}
        </div>
        <D20Svg natural={shownNumber} spinning={spinning} crit={crit && !spinning} />
        {revealedResult ? (
          <div className="flex flex-col items-center gap-0.5 animate-fade-in w-full">
            <div className="text-[var(--color-text-primary)] text-[10px] font-mono">
              {rollNatural} {attackBonus >= 0 ? '+' : ''}
              {attackBonus} = <span className="text-[var(--color-accent-amber)]">{total}</span>
            </div>
            <div className="text-[var(--color-text-dim)] text-[9px] font-mono">
              vs AC {targetAC}
            </div>
            <div className={`text-sm font-bold uppercase tracking-[0.3em] mt-0.5 ${resultClass}`}>
              {resultLabel}
            </div>
          </div>
        ) : (
          <div className="text-[var(--color-text-dim)] text-[9px] font-mono uppercase tracking-widest h-9 flex items-center">
            rolling…
          </div>
        )}
        <div className="text-[var(--color-text-dim)] text-[8px] uppercase tracking-widest text-center truncate w-full">
          {attackerName} → {targetName}
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
