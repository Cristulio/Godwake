interface PlayerPortraitProps {
  classId: string;
  className?: string;
}

export function PlayerPortrait({ classId, className = '' }: PlayerPortraitProps) {
  switch (classId) {
    case 'fighter':
    default:
      return <FighterSvg className={className} />;
  }
}

function FighterSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 40"
      shapeRendering="crispEdges"
      className={className}
      preserveAspectRatio="xMidYMax meet"
      aria-label="Fighter"
    >
      {/* Plume / crest */}
      <rect x="11" y="0" width="2" height="1" fill="#d4b062" />
      {/* Helmet crown */}
      <rect x="8" y="1" width="8" height="1" fill="#8c6232" />
      <rect x="8" y="2" width="8" height="5" fill="#8c6232" />
      <rect x="7" y="3" width="1" height="5" fill="#6b4a2e" />
      <rect x="16" y="3" width="1" height="5" fill="#6b4a2e" />
      {/* Visor slit */}
      <rect x="9" y="4" width="6" height="1" fill="#1a1410" />
      <rect x="10" y="4" width="1" height="1" fill="#f4a742" />
      <rect x="13" y="4" width="1" height="1" fill="#f4a742" />
      {/* Cheek / jaw plates */}
      <rect x="8" y="7" width="8" height="2" fill="#6b4a2e" />
      {/* Neck */}
      <rect x="10" y="9" width="4" height="1" fill="#3a2e22" />
      {/* Shoulders / pauldrons */}
      <rect x="5" y="10" width="14" height="2" fill="#8c6232" />
      <rect x="5" y="10" width="2" height="2" fill="#6b4a2e" />
      <rect x="17" y="10" width="2" height="2" fill="#6b4a2e" />
      {/* Chest plate */}
      <rect x="7" y="12" width="10" height="9" fill="#3a2e22" />
      <rect x="6" y="12" width="1" height="9" fill="#5a4030" />
      <rect x="17" y="12" width="1" height="9" fill="#5a4030" />
      {/* Gold emblem (cross/shield shape) */}
      <rect x="11" y="14" width="2" height="5" fill="#d4b062" />
      <rect x="10" y="15" width="4" height="2" fill="#d4b062" />
      {/* Belt */}
      <rect x="6" y="21" width="12" height="1" fill="#1a1410" />
      <rect x="11" y="21" width="2" height="1" fill="#d4b062" />
      {/* Right arm holding sword */}
      <rect x="18" y="11" width="2" height="2" fill="#8c6232" />
      <rect x="18" y="13" width="2" height="6" fill="#3a2e22" />
      <rect x="18" y="19" width="3" height="2" fill="#3a2e22" />
      {/* Longsword sticking up */}
      <rect x="19" y="2" width="2" height="13" fill="#b5a282" />
      <rect x="20" y="2" width="1" height="13" fill="#e8dcc4" />
      <rect x="18" y="15" width="4" height="1" fill="#6b4a2e" />
      <rect x="19" y="16" width="2" height="3" fill="#3a2e22" />
      {/* Left arm holding shield */}
      <rect x="4" y="11" width="2" height="2" fill="#8c6232" />
      <rect x="4" y="13" width="2" height="6" fill="#3a2e22" />
      <rect x="3" y="19" width="3" height="2" fill="#3a2e22" />
      {/* Shield on left arm */}
      <rect x="0" y="11" width="4" height="14" fill="#6b4a2e" />
      <rect x="1" y="12" width="2" height="12" fill="#8c6232" />
      <rect x="1" y="15" width="2" height="2" fill="#d4b062" />
      <rect x="1" y="20" width="2" height="2" fill="#d4b062" />
      {/* Hip / skirt */}
      <rect x="7" y="22" width="10" height="3" fill="#3a2e22" />
      <rect x="11" y="22" width="2" height="3" fill="#5a4030" />
      {/* Right leg */}
      <rect x="8" y="25" width="3" height="9" fill="#3a2e22" />
      <rect x="8" y="25" width="1" height="9" fill="#5a4030" />
      {/* Left leg */}
      <rect x="13" y="25" width="3" height="9" fill="#3a2e22" />
      <rect x="13" y="25" width="1" height="9" fill="#5a4030" />
      {/* Boots */}
      <rect x="7" y="34" width="5" height="4" fill="#1a1410" />
      <rect x="7" y="38" width="5" height="1" fill="#5a4030" />
      <rect x="12" y="34" width="5" height="4" fill="#1a1410" />
      <rect x="12" y="38" width="5" height="1" fill="#5a4030" />
    </svg>
  );
}
