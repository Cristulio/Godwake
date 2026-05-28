interface PlayerPortraitProps {
  classId: string;
  className?: string;
}

export function PlayerPortrait({ classId, className = '' }: PlayerPortraitProps) {
  switch (classId) {
    case 'rogue':
      return <RogueSvg className={className} />;
    case 'wizard':
      return <WizardSvg className={className} />;
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

function RogueSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 40"
      shapeRendering="crispEdges"
      className={className}
      preserveAspectRatio="xMidYMax meet"
      aria-label="Rogue"
    >
      {/* Hood outline / peak */}
      <rect x="9" y="1" width="6" height="1" fill="#1f1a18" />
      <rect x="8" y="2" width="8" height="1" fill="#1f1a18" />
      <rect x="7" y="3" width="10" height="2" fill="#1f1a18" />
      {/* Hood body */}
      <rect x="6" y="5" width="12" height="6" fill="#2a2420" />
      <rect x="6" y="5" width="1" height="6" fill="#1a1410" />
      <rect x="17" y="5" width="1" height="6" fill="#1a1410" />
      {/* Hood front fold */}
      <rect x="6" y="10" width="12" height="1" fill="#1a1410" />
      {/* Face shadow inside hood */}
      <rect x="8" y="6" width="8" height="4" fill="#0e0a08" />
      {/* Eye glints (yellow) */}
      <rect x="9" y="7" width="2" height="1" fill="#f4d042" />
      <rect x="13" y="7" width="2" height="1" fill="#f4d042" />
      <rect x="9" y="7" width="1" height="1" fill="#b5302c" />
      <rect x="13" y="7" width="1" height="1" fill="#b5302c" />
      {/* Mouth scarf hint */}
      <rect x="9" y="9" width="6" height="1" fill="#5a4030" />
      {/* Hood shoulder drape (cape spilling over shoulders) */}
      <rect x="4" y="11" width="16" height="2" fill="#2a2420" />
      <rect x="4" y="11" width="2" height="3" fill="#1a1410" />
      <rect x="18" y="11" width="2" height="3" fill="#1a1410" />
      {/* Slight crouch — torso narrower and lower */}
      <rect x="7" y="13" width="10" height="6" fill="#3a2e22" />
      <rect x="6" y="13" width="1" height="6" fill="#1f1a18" />
      <rect x="17" y="13" width="1" height="6" fill="#1f1a18" />
      {/* Leather chest straps */}
      <rect x="8" y="14" width="8" height="1" fill="#5a4030" />
      <rect x="8" y="17" width="8" height="1" fill="#5a4030" />
      {/* Belt with pouches */}
      <rect x="6" y="19" width="12" height="2" fill="#1a1410" />
      <rect x="9" y="20" width="2" height="2" fill="#5a4030" />
      <rect x="13" y="20" width="2" height="2" fill="#5a4030" />
      {/* Right arm — extended down/back holding dagger */}
      <rect x="17" y="13" width="2" height="2" fill="#3a2e22" />
      <rect x="18" y="14" width="2" height="5" fill="#3a2e22" />
      <rect x="19" y="18" width="2" height="3" fill="#d4c8a8" />
      {/* Right-hand dagger (pointing down) */}
      <rect x="20" y="20" width="2" height="1" fill="#6b4a2e" />
      <rect x="20" y="21" width="2" height="4" fill="#b5a282" />
      <rect x="20" y="21" width="1" height="4" fill="#e8dcc4" />
      <rect x="20" y="25" width="2" height="1" fill="#1a1410" />
      {/* Left arm — across body holding dagger */}
      <rect x="5" y="13" width="2" height="2" fill="#3a2e22" />
      <rect x="4" y="14" width="2" height="5" fill="#3a2e22" />
      <rect x="3" y="18" width="2" height="3" fill="#d4c8a8" />
      {/* Left-hand dagger (pointing up — reverse grip) */}
      <rect x="2" y="13" width="2" height="1" fill="#1a1410" />
      <rect x="2" y="14" width="2" height="4" fill="#b5a282" />
      <rect x="2" y="14" width="1" height="4" fill="#e8dcc4" />
      <rect x="2" y="18" width="2" height="1" fill="#6b4a2e" />
      {/* Hood cape ends down sides */}
      <rect x="3" y="13" width="2" height="10" fill="#1a1410" />
      <rect x="19" y="13" width="2" height="6" fill="#1a1410" />
      {/* Slight crouch hip */}
      <rect x="7" y="21" width="10" height="3" fill="#2a2420" />
      {/* Legs — slightly bent / forward stance */}
      <rect x="8" y="24" width="3" height="6" fill="#2a2420" />
      <rect x="8" y="24" width="1" height="6" fill="#1a1410" />
      <rect x="13" y="24" width="3" height="6" fill="#2a2420" />
      <rect x="13" y="24" width="1" height="6" fill="#1a1410" />
      {/* Knee pads */}
      <rect x="8" y="27" width="3" height="1" fill="#5a4030" />
      <rect x="13" y="27" width="3" height="1" fill="#5a4030" />
      {/* Lower legs */}
      <rect x="8" y="30" width="3" height="4" fill="#3a2e22" />
      <rect x="13" y="30" width="3" height="4" fill="#3a2e22" />
      {/* Boots (soft, low) */}
      <rect x="7" y="34" width="5" height="4" fill="#1a1410" />
      <rect x="7" y="38" width="5" height="1" fill="#3a2e22" />
      <rect x="12" y="34" width="5" height="4" fill="#1a1410" />
      <rect x="12" y="38" width="5" height="1" fill="#3a2e22" />
    </svg>
  );
}

function WizardSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 40"
      shapeRendering="crispEdges"
      className={className}
      preserveAspectRatio="xMidYMax meet"
      aria-label="Wizard"
    >
      {/* Pointed hat — tall, slightly canted */}
      <rect x="11" y="0" width="2" height="1" fill="#3a2a5a" />
      <rect x="10" y="1" width="3" height="1" fill="#3a2a5a" />
      <rect x="9" y="2" width="4" height="1" fill="#3a2a5a" />
      <rect x="9" y="3" width="5" height="1" fill="#3a2a5a" />
      <rect x="8" y="4" width="6" height="1" fill="#3a2a5a" />
      <rect x="8" y="5" width="7" height="1" fill="#3a2a5a" />
      <rect x="7" y="6" width="8" height="1" fill="#3a2a5a" />
      {/* Hat shadow side */}
      <rect x="11" y="2" width="2" height="5" fill="#2a1d48" />
      <rect x="12" y="3" width="2" height="3" fill="#2a1d48" />
      {/* Hat brim — wide */}
      <rect x="5" y="7" width="12" height="2" fill="#3a2a5a" />
      <rect x="5" y="7" width="12" height="1" fill="#503d78" />
      <rect x="5" y="8" width="12" height="1" fill="#2a1d48" />
      {/* Star on hat */}
      <rect x="10" y="4" width="1" height="1" fill="#f4d042" />
      <rect x="9" y="5" width="3" height="1" fill="#f4d042" />
      <rect x="10" y="6" width="1" height="1" fill="#f4d042" />
      {/* Face (under brim) */}
      <rect x="8" y="9" width="8" height="4" fill="#d4c8a8" />
      <rect x="8" y="9" width="1" height="4" fill="#a89878" />
      <rect x="15" y="9" width="1" height="4" fill="#a89878" />
      {/* Eyes */}
      <rect x="9" y="10" width="2" height="1" fill="#1a1410" />
      <rect x="13" y="10" width="2" height="1" fill="#1a1410" />
      {/* White beard */}
      <rect x="8" y="13" width="8" height="3" fill="#e8dcc4" />
      <rect x="9" y="14" width="6" height="2" fill="#d4c8a8" />
      <rect x="10" y="15" width="4" height="2" fill="#e8dcc4" />
      <rect x="11" y="17" width="2" height="1" fill="#e8dcc4" />
      {/* Robe collar */}
      <rect x="6" y="16" width="12" height="2" fill="#2a1d48" />
      {/* Robe body — wide flowing */}
      <rect x="5" y="18" width="14" height="14" fill="#3a2a5a" />
      <rect x="5" y="18" width="2" height="14" fill="#2a1d48" />
      <rect x="17" y="18" width="2" height="14" fill="#2a1d48" />
      {/* Robe trim — gold band */}
      <rect x="5" y="31" width="14" height="1" fill="#d4b062" />
      {/* Sash diagonal — arcane */}
      <rect x="9" y="22" width="6" height="1" fill="#a48ee0" />
      <rect x="10" y="23" width="4" height="1" fill="#a48ee0" />
      <rect x="11" y="24" width="2" height="1" fill="#a48ee0" />
      {/* Tome cradled in left arm */}
      <rect x="2" y="20" width="5" height="6" fill="#5a1208" />
      <rect x="2" y="20" width="5" height="1" fill="#7a2a18" />
      <rect x="2" y="25" width="5" height="1" fill="#3a0a08" />
      <rect x="2" y="20" width="1" height="6" fill="#3a0a08" />
      {/* Tome gold clasp */}
      <rect x="4" y="22" width="1" height="2" fill="#d4b062" />
      <rect x="3" y="22" width="3" height="1" fill="#d4b062" />
      {/* Left arm cradling tome */}
      <rect x="6" y="19" width="2" height="2" fill="#3a2a5a" />
      <rect x="5" y="21" width="2" height="5" fill="#3a2a5a" />
      <rect x="6" y="26" width="2" height="1" fill="#d4c8a8" />
      {/* Right arm holding staff */}
      <rect x="16" y="19" width="2" height="2" fill="#3a2a5a" />
      <rect x="17" y="21" width="2" height="6" fill="#3a2a5a" />
      <rect x="18" y="26" width="2" height="2" fill="#d4c8a8" />
      {/* Staff — tall wooden */}
      <rect x="20" y="2" width="2" height="32" fill="#6b4a2e" />
      <rect x="20" y="2" width="1" height="32" fill="#8c6232" />
      <rect x="20" y="14" width="2" height="1" fill="#3a2418" />
      <rect x="20" y="24" width="2" height="1" fill="#3a2418" />
      {/* Staff crystal orb (glowing) */}
      <rect x="19" y="0" width="4" height="1" fill="#a48ee0" />
      <rect x="18" y="1" width="6" height="3" fill="#a48ee0" />
      <rect x="19" y="0" width="4" height="1" fill="#e8d4ff" />
      <rect x="19" y="2" width="4" height="1" fill="#e8d4ff" />
      <rect x="20" y="1" width="2" height="2" fill="#ffffff" />
      <rect x="18" y="4" width="6" height="1" fill="#7a5db8" />
      {/* Robe lower hem (with triangular cuts) */}
      <rect x="5" y="32" width="14" height="2" fill="#2a1d48" />
      <polygon points="5,34 7,32 9,34" fill="#3a2a5a" />
      <polygon points="9,34 11,32 13,34" fill="#3a2a5a" />
      <polygon points="13,34 15,32 17,34" fill="#3a2a5a" />
      {/* Boots peeking out */}
      <rect x="8" y="34" width="3" height="4" fill="#1a1410" />
      <rect x="13" y="34" width="3" height="4" fill="#1a1410" />
      <rect x="8" y="38" width="3" height="1" fill="#3a2418" />
      <rect x="13" y="38" width="3" height="1" fill="#3a2418" />
    </svg>
  );
}
