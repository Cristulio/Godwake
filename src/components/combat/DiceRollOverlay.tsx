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
    }, t(280));

    const revealTimer = setTimeout(() => {
      if (!mounted) return;
      setRevealedResult(true);
    }, t(360));

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

  const resultLabel = crit ? 'CRITICAL HIT' : hit ? 'HIT' : 'MISS';
  const resultClass = crit
    ? 'text-[var(--color-accent-amber)]'
    : hit
      ? 'text-[var(--color-status-poison)]'
      : 'text-[var(--color-text-muted)]';

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-[var(--color-bg-base)] opacity-65" />
      <div className="relative flex flex-col items-center gap-3">
        <div className="text-[var(--color-text-secondary)] text-[10px] uppercase tracking-[0.3em]">
          {attackerName} → {targetName} · {weaponName}
        </div>
        <D20Svg natural={shownNumber} spinning={spinning} crit={crit && !spinning} />
        {revealedResult ? (
          <div className="flex flex-col items-center gap-0.5 animate-fade-in">
            <div className="text-[var(--color-text-primary)] text-sm font-mono tracking-wide">
              1d20{attackBonus >= 0 ? '+' : ''}
              {attackBonus} = <span className="text-[var(--color-accent-amber)]">{total}</span>{' '}
              <span className="text-[var(--color-text-dim)]">vs AC {targetAC}</span>
            </div>
            <div className={`text-xl font-bold uppercase tracking-[0.4em] ${resultClass}`}>
              {resultLabel}
            </div>
          </div>
        ) : (
          <div className="h-9" />
        )}
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
        relative w-28 h-28 flex items-center justify-center
        ${spinning ? 'animate-d20-tumble' : ''}
        ${crit ? 'drop-shadow-[0_0_28px_rgba(244,167,66,0.7)]' : ''}
      `}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <defs>
          <radialGradient id="d20-grad" cx="0.4" cy="0.35">
            <stop offset="0%" stopColor="#4a3a26" />
            <stop offset="55%" stopColor="#2d2218" />
            <stop offset="100%" stopColor="#1a1410" />
          </radialGradient>
        </defs>
        {/* outer icosahedron silhouette */}
        <polygon
          points="50,4 93,28 93,72 50,96 7,72 7,28"
          fill="url(#d20-grad)"
          stroke={crit ? '#f4a742' : '#8c6232'}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* upward triangle facet — top half of star */}
        <polygon
          points="50,8 89,70 11,70"
          fill="none"
          stroke={crit ? '#ffb347' : '#6b4a2e'}
          strokeWidth="1"
          opacity="0.55"
        />
        {/* downward triangle facet — bottom half of star */}
        <polygon
          points="50,92 89,30 11,30"
          fill="none"
          stroke={crit ? '#ffb347' : '#6b4a2e'}
          strokeWidth="1"
          opacity="0.55"
        />
        {/* central front-facing triangle: where the number is read */}
        <polygon
          points="34,46 66,46 50,75"
          fill="#1a1410"
          stroke={crit ? '#f4a742' : '#8c6232'}
          strokeWidth="1.5"
        />
      </svg>
      <div
        className={`
          absolute inset-0 flex items-center justify-center font-mono text-2xl pt-3
          ${crit ? 'text-[var(--color-accent-amber)]' : 'text-[var(--color-text-primary)]'}
        `}
      >
        {natural}
      </div>
    </div>
  );
}
