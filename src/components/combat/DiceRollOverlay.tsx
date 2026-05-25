import { useEffect, useState } from 'react';

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
 * Mounted briefly when an attack roll happens. Shows a spinning d20 cycling
 * through random numbers, then settles on the actual natural roll. After a
 * short pause, displays the math (1d20+X vs AC Y) and the result tag, then
 * fades out.
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
  const [spinning, setSpinning] = useState(true);
  const [shownNumber, setShownNumber] = useState(rollNatural);
  const [revealedResult, setRevealedResult] = useState(false);

  useEffect(() => {
    let mounted = true;
    let tickInterval: ReturnType<typeof setInterval>;

    // Phase 1: spin (700ms) — flashing numbers 1-20
    tickInterval = setInterval(() => {
      if (!mounted) return;
      setShownNumber(Math.floor(Math.random() * 20) + 1);
    }, 55);

    const stopSpin = setTimeout(() => {
      if (!mounted) return;
      clearInterval(tickInterval);
      setShownNumber(rollNatural);
      setSpinning(false);
    }, 700);

    // Phase 2: settle (180ms) then reveal full result
    const revealTimer = setTimeout(() => {
      if (!mounted) return;
      setRevealedResult(true);
    }, 880);

    // Phase 3: dismiss
    const dismissTimer = setTimeout(() => {
      if (!mounted) return;
      onDismiss();
    }, 2200);

    return () => {
      mounted = false;
      clearInterval(tickInterval);
      clearTimeout(stopSpin);
      clearTimeout(revealTimer);
      clearTimeout(dismissTimer);
    };
  }, [rollNatural, onDismiss]);

  const resultLabel = crit ? 'CRITICAL HIT' : hit ? 'HIT' : 'MISS';
  const resultClass = crit
    ? 'text-[var(--color-accent-amber)]'
    : hit
      ? 'text-[var(--color-status-poison)]'
      : 'text-[var(--color-text-muted)]';

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-[var(--color-bg-base)] opacity-60" />
      <div className="relative flex flex-col items-center gap-4">
        <div className="text-[var(--color-text-secondary)] text-xs uppercase tracking-[0.3em]">
          {attackerName} → {targetName} · {weaponName}
        </div>
        <D20Svg natural={shownNumber} spinning={spinning} crit={crit && !spinning} />
        {revealedResult ? (
          <div className="flex flex-col items-center gap-1">
            <div className="text-[var(--color-text-primary)] text-base font-mono tracking-wide">
              1d20{attackBonus >= 0 ? '+' : ''}
              {attackBonus} = <span className="text-[var(--color-accent-amber)]">{total}</span>{' '}
              <span className="text-[var(--color-text-dim)]">vs AC {targetAC}</span>
            </div>
            <div className={`text-2xl font-bold uppercase tracking-[0.4em] ${resultClass}`}>
              {resultLabel}
            </div>
          </div>
        ) : (
          <div className="text-[var(--color-text-secondary)] text-xs uppercase tracking-[0.3em] opacity-0">
            rolling
          </div>
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
        relative w-32 h-32 flex items-center justify-center
        ${spinning ? 'animate-spin' : ''}
        ${crit ? 'drop-shadow-[0_0_24px_rgba(244,167,66,0.6)]' : ''}
      `}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full" shapeRendering="geometricPrecision">
        <polygon
          points="50,5 95,30 95,70 50,95 5,70 5,30"
          fill="var(--color-bg-panel)"
          stroke={crit ? 'var(--color-accent-amber)' : 'var(--color-border-bright)'}
          strokeWidth="2"
        />
        <polygon
          points="50,5 95,30 50,55 5,30"
          fill="var(--color-bg-panel-hover)"
          stroke={crit ? 'var(--color-accent-amber)' : 'var(--color-border-warm)'}
          strokeWidth="1"
          opacity="0.5"
        />
      </svg>
      <div
        className={`
          absolute inset-0 flex items-center justify-center font-mono text-3xl
          ${crit ? 'text-[var(--color-accent-amber)]' : 'text-[var(--color-text-primary)]'}
          ${spinning ? 'opacity-70' : ''}
        `}
      >
        {natural}
      </div>
    </div>
  );
}
