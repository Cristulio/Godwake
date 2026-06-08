/**
 * The shared d20 die face — a flat 8-bit-styled icosahedron with the rolled
 * number centred. Used by the combat attack-roll overlay and the out-of-combat
 * event skill-check roll. `spinning` runs the tumble animation; `glow` lights it
 * gold for a special result (a crit, or a natural 20).
 */
export function D20Die({
  natural,
  spinning,
  glow = false,
}: {
  natural: number;
  spinning: boolean;
  glow?: boolean;
}) {
  return (
    <div
      className={`
        relative w-16 h-16 flex items-center justify-center
        ${spinning ? 'animate-d20-tumble' : ''}
        ${glow ? 'drop-shadow-[0_0_18px_rgba(244,167,66,0.7)]' : ''}
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
          stroke={glow ? '#f4a742' : '#8c6232'}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <polygon
          points="50,8 89,70 11,70"
          fill="none"
          stroke={glow ? '#ffb347' : '#6b4a2e'}
          strokeWidth="1"
          opacity="0.55"
        />
        <polygon
          points="50,92 89,30 11,30"
          fill="none"
          stroke={glow ? '#ffb347' : '#6b4a2e'}
          strokeWidth="1"
          opacity="0.55"
        />
        <polygon
          points="34,46 66,46 50,75"
          fill="#1a1410"
          stroke={glow ? '#f4a742' : '#8c6232'}
          strokeWidth="1.5"
        />
      </svg>
      <div
        className={`
          absolute inset-0 flex items-center justify-center font-mono text-lg pt-2
          ${glow ? 'text-[var(--color-accent-amber)]' : 'text-[var(--color-text-primary)]'}
        `}
      >
        {natural}
      </div>
    </div>
  );
}
