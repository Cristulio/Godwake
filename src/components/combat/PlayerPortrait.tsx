interface PlayerPortraitProps {
  classId: string;
  className?: string;
}

export function PlayerPortrait({ classId, className = '' }: PlayerPortraitProps) {
  switch (classId) {
    case 'fighter':
      return <FighterSvg className={className} />;
    default:
      return <FighterSvg className={className} />;
  }
}

function FighterSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      className={className}
      aria-label="Fighter"
    >
      <rect width="16" height="16" fill="#1a1410" />
      {/* helmet crown */}
      <rect x="4" y="1" width="8" height="2" fill="#8c6232" />
      <rect x="5" y="0" width="6" height="1" fill="#8c6232" />
      <rect x="3" y="2" width="1" height="2" fill="#6b4a2e" />
      <rect x="12" y="2" width="1" height="2" fill="#6b4a2e" />
      {/* helmet body */}
      <rect x="3" y="3" width="10" height="6" fill="#8c6232" />
      <rect x="2" y="4" width="1" height="4" fill="#6b4a2e" />
      <rect x="13" y="4" width="1" height="4" fill="#6b4a2e" />
      {/* visor slit */}
      <rect x="4" y="6" width="3" height="1" fill="#1a1410" />
      <rect x="9" y="6" width="3" height="1" fill="#1a1410" />
      <rect x="5" y="6" width="1" height="1" fill="#f4a742" />
      <rect x="10" y="6" width="1" height="1" fill="#f4a742" />
      {/* chin guard */}
      <rect x="5" y="9" width="6" height="1" fill="#6b4a2e" />
      {/* shoulders / chest */}
      <rect x="2" y="10" width="12" height="4" fill="#3a2e22" />
      <rect x="3" y="10" width="10" height="1" fill="#8c6232" />
      <rect x="6" y="11" width="4" height="3" fill="#6b4a2e" />
      {/* shield emblem */}
      <rect x="7" y="12" width="2" height="1" fill="#f4a742" />
    </svg>
  );
}
