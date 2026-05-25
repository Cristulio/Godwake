interface MonsterPortraitProps {
  defId: string;
  className?: string;
}

/**
 * Inline SVG pixel-art portraits at viewBox 16x16. Pure shapes, no external
 * assets — keeps the bundle small and lets the warm-dark palette flow through.
 */
export function MonsterPortrait({ defId, className = '' }: MonsterPortraitProps) {
  switch (defId) {
    case 'goblin':
      return <GoblinSvg className={className} />;
    default:
      return <GenericMonsterSvg className={className} />;
  }
}

function GoblinSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      className={className}
      aria-label="Goblin"
    >
      <rect width="16" height="16" fill="#221a14" />
      <rect x="3" y="4" width="10" height="8" fill="#4a7022" />
      <rect x="4" y="3" width="8" height="1" fill="#4a7022" />
      <rect x="4" y="12" width="8" height="1" fill="#4a7022" />
      <rect x="2" y="5" width="1" height="4" fill="#4a7022" />
      <rect x="13" y="5" width="1" height="4" fill="#4a7022" />
      {/* pointy ears */}
      <rect x="1" y="6" width="1" height="2" fill="#4a7022" />
      <rect x="14" y="6" width="1" height="2" fill="#4a7022" />
      {/* red eyes */}
      <rect x="5" y="7" width="2" height="2" fill="#b5302c" />
      <rect x="9" y="7" width="2" height="2" fill="#b5302c" />
      <rect x="5" y="7" width="1" height="1" fill="#ffb347" />
      <rect x="9" y="7" width="1" height="1" fill="#ffb347" />
      {/* mouth + teeth */}
      <rect x="5" y="10" width="6" height="2" fill="#1a1410" />
      <rect x="5" y="10" width="1" height="1" fill="#e8dcc4" />
      <rect x="7" y="10" width="1" height="1" fill="#e8dcc4" />
      <rect x="9" y="10" width="1" height="1" fill="#e8dcc4" />
      <rect x="10" y="11" width="1" height="1" fill="#e8dcc4" />
    </svg>
  );
}

function GenericMonsterSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      className={className}
      aria-label="Creature"
    >
      <rect width="16" height="16" fill="#221a14" />
      <rect x="3" y="4" width="10" height="9" fill="#6b4a2e" />
      <rect x="5" y="7" width="2" height="2" fill="#b5302c" />
      <rect x="9" y="7" width="2" height="2" fill="#b5302c" />
      <rect x="5" y="11" width="6" height="1" fill="#1a1410" />
    </svg>
  );
}
