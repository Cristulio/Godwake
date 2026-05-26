import { useEffect, useState } from 'react';

interface SlashEffectProps {
  /** Direction of the slash from the attacker's perspective. */
  direction: 'left-to-right' | 'right-to-left';
  /** Style hint: melee slash vs ranged hit vs blunt impact. */
  kind?: 'slash' | 'pierce' | 'bludgeon';
  onComplete?: () => void;
}

/**
 * Quick draw-and-fade slash overlay. Rendered absolutely-positioned by a
 * parent that places it over the target sprite. Self-cleans after the
 * animation completes.
 */
export function SlashEffect({ direction, kind = 'slash', onComplete }: SlashEffectProps) {
  const [phase, setPhase] = useState<'draw' | 'fade' | 'gone'>('draw');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('fade'), 160);
    const t2 = setTimeout(() => {
      setPhase('gone');
      onComplete?.();
    }, 320);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onComplete]);

  if (phase === 'gone') return null;

  // The arc is drawn corner-to-corner across the sprite area.
  const path =
    direction === 'left-to-right'
      ? 'M 10 80 Q 50 20 90 30'
      : 'M 90 80 Q 50 20 10 30';

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={`
        absolute inset-0 pointer-events-none transition-opacity duration-150
        ${phase === 'fade' ? 'opacity-0' : 'opacity-100'}
      `}
    >
      {/* Glow */}
      <path
        d={path}
        stroke={kind === 'slash' ? '#ffb347' : kind === 'pierce' ? '#f4a742' : '#e8dcc4'}
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
        opacity="0.4"
      />
      {/* Main blade trail */}
      <path
        d={path}
        stroke="#ffffff"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      {/* Faint inner highlight */}
      <path
        d={path}
        stroke={kind === 'bludgeon' ? '#d4b062' : '#ffb347'}
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
