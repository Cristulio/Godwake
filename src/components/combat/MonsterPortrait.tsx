interface MonsterPortraitProps {
  defId: string;
  className?: string;
}

/**
 * Full-body pixel-art monster sprites. Slender humanoid silhouettes drawn
 * with inline SVG rects on integer grids. The viewBox sets the natural
 * aspect ratio; callers control display size via height (width auto).
 */
export function MonsterPortrait({ defId, className = '' }: MonsterPortraitProps) {
  switch (defId) {
    case 'goblin':
      return <GoblinSvg className={className} />;
    case 'goblin-warden':
      return <GoblinWardenSvg className={className} />;
    case 'skeleton':
      return <SkeletonSvg className={className} />;
    case 'kobold':
      return <KoboldSvg className={className} />;
    case 'duergar-ilyich':
      return <IlyichSvg className={className} />;
    case 'dust-mephit':
      return <DustMephitSvg className={className} />;
    case 'animated-armor':
      return <AnimatedArmorSvg className={className} />;
    case 'bugbear':
      return <BugbearSvg className={className} />;
    case 'imp':
      return <ImpSvg className={className} />;
    default:
      return <GoblinSvg className={className} />;
  }
}

function BugbearSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 38"
      shapeRendering="crispEdges"
      className={className}
      preserveAspectRatio="xMidYMax meet"
      aria-label="Bugbear Brute"
    >
      {/* Tufted ears, swept up like a hyena's */}
      <polygon points="3,3 1,0 5,3" fill="#7a5028" />
      <polygon points="21,3 23,0 19,3" fill="#7a5028" />
      <rect x="2" y="2" width="1" height="1" fill="#3a2210" />
      <rect x="21" y="2" width="1" height="1" fill="#3a2210" />
      {/* Heavy brutish head */}
      <rect x="5" y="3" width="14" height="8" fill="#7a5028" />
      <rect x="5" y="3" width="14" height="1" fill="#3a2210" />
      <rect x="4" y="5" width="1" height="5" fill="#5a3818" />
      <rect x="19" y="5" width="1" height="5" fill="#5a3818" />
      {/* Patchy fur tufts */}
      <rect x="6" y="3" width="1" height="1" fill="#3a2210" />
      <rect x="9" y="3" width="2" height="1" fill="#3a2210" />
      <rect x="14" y="3" width="1" height="1" fill="#3a2210" />
      <rect x="17" y="3" width="1" height="1" fill="#3a2210" />
      {/* Mean little eyes — red, set deep */}
      <rect x="7" y="5" width="3" height="2" fill="#1a1410" />
      <rect x="14" y="5" width="3" height="2" fill="#1a1410" />
      <rect x="8" y="6" width="1" height="1" fill="#b5302c" />
      <rect x="15" y="6" width="1" height="1" fill="#b5302c" />
      {/* Broad flat snout */}
      <rect x="10" y="7" width="4" height="2" fill="#5a3818" />
      <rect x="11" y="8" width="1" height="1" fill="#1a1410" />
      <rect x="13" y="8" width="1" height="1" fill="#1a1410" />
      {/* Tusks jutting up from lower jaw */}
      <rect x="8" y="10" width="1" height="2" fill="#e8dcc4" />
      <rect x="15" y="10" width="1" height="2" fill="#e8dcc4" />
      {/* Snarling mouth */}
      <rect x="7" y="9" width="10" height="2" fill="#1a1410" />
      <rect x="9" y="9" width="1" height="1" fill="#e8dcc4" />
      <rect x="11" y="9" width="1" height="2" fill="#e8dcc4" />
      <rect x="13" y="9" width="1" height="2" fill="#e8dcc4" />
      <rect x="15" y="9" width="1" height="1" fill="#e8dcc4" />
      {/* Iron-studded leather collar (slaver mark) */}
      <rect x="4" y="11" width="16" height="2" fill="#3a2210" />
      <rect x="4" y="11" width="16" height="1" fill="#5a3818" />
      <rect x="6" y="11" width="1" height="1" fill="#8c6232" />
      <rect x="10" y="11" width="1" height="1" fill="#8c6232" />
      <rect x="14" y="11" width="1" height="1" fill="#8c6232" />
      <rect x="17" y="11" width="1" height="1" fill="#8c6232" />
      {/* Hulking shoulders, hunched */}
      <rect x="2" y="13" width="20" height="3" fill="#7a5028" />
      <rect x="2" y="13" width="3" height="3" fill="#5a3818" />
      <rect x="19" y="13" width="3" height="3" fill="#5a3818" />
      {/* Hairy barrel chest */}
      <rect x="4" y="16" width="16" height="9" fill="#7a5028" />
      {/* Chest fur shading */}
      <rect x="5" y="17" width="14" height="1" fill="#5a3818" />
      <rect x="6" y="20" width="2" height="1" fill="#5a3818" />
      <rect x="10" y="19" width="2" height="1" fill="#5a3818" />
      <rect x="14" y="21" width="2" height="1" fill="#5a3818" />
      <rect x="16" y="18" width="2" height="1" fill="#5a3818" />
      {/* Crude leather strap across chest */}
      <rect x="4" y="18" width="16" height="1" fill="#3a2210" />
      <rect x="11" y="17" width="2" height="3" fill="#3a2210" />
      <rect x="11" y="18" width="2" height="1" fill="#8c6232" />
      {/* Massive arms */}
      <rect x="1" y="16" width="3" height="9" fill="#7a5028" />
      <rect x="20" y="16" width="3" height="9" fill="#7a5028" />
      <rect x="1" y="16" width="1" height="9" fill="#5a3818" />
      <rect x="22" y="16" width="1" height="9" fill="#5a3818" />
      {/* Fists */}
      <rect x="0" y="24" width="4" height="3" fill="#7a5028" />
      <rect x="20" y="24" width="4" height="3" fill="#7a5028" />
      <rect x="0" y="24" width="1" height="3" fill="#5a3818" />
      {/* Morningstar — held high and angled, both hands grip the haft */}
      <rect x="20" y="3" width="2" height="22" fill="#3a2210" />
      <rect x="21" y="3" width="1" height="22" fill="#5a3818" />
      {/* Spiked head of the morningstar — big spiky ball at top */}
      <rect x="18" y="0" width="6" height="4" fill="#3a3228" />
      <rect x="19" y="1" width="4" height="2" fill="#5a5248" />
      <polygon points="18,0 17,-1 19,1" fill="#3a3228" />
      <polygon points="24,0 25,-1 23,1" fill="#3a3228" />
      <polygon points="21,-1 21,1 22,-1" fill="#3a3228" />
      <polygon points="18,4 17,5 19,3" fill="#3a3228" />
      <polygon points="24,4 25,5 23,3" fill="#3a3228" />
      {/* Belt with iron ring */}
      <rect x="4" y="25" width="16" height="2" fill="#1a1410" />
      <rect x="10" y="25" width="2" height="2" fill="#8c6232" />
      {/* Tattered breechcloth */}
      <rect x="5" y="27" width="14" height="3" fill="#3a2210" />
      <rect x="8" y="29" width="1" height="2" fill="#3a2210" />
      <rect x="14" y="29" width="1" height="2" fill="#3a2210" />
      {/* Thick legs, bowed */}
      <rect x="5" y="30" width="5" height="6" fill="#7a5028" />
      <rect x="14" y="30" width="5" height="6" fill="#7a5028" />
      <rect x="5" y="30" width="1" height="6" fill="#5a3818" />
      <rect x="18" y="30" width="1" height="6" fill="#5a3818" />
      {/* Leg fur tufts */}
      <rect x="7" y="32" width="1" height="1" fill="#3a2210" />
      <rect x="16" y="33" width="1" height="1" fill="#3a2210" />
      {/* Crude leather wraps on the calves */}
      <rect x="5" y="34" width="5" height="1" fill="#3a2210" />
      <rect x="14" y="34" width="5" height="1" fill="#3a2210" />
      {/* Splayed clawed feet */}
      <rect x="4" y="36" width="7" height="2" fill="#5a3818" />
      <rect x="13" y="36" width="7" height="2" fill="#5a3818" />
      <rect x="4" y="37" width="1" height="1" fill="#1a1410" />
      <rect x="6" y="37" width="1" height="1" fill="#1a1410" />
      <rect x="9" y="37" width="1" height="1" fill="#1a1410" />
      <rect x="13" y="37" width="1" height="1" fill="#1a1410" />
      <rect x="16" y="37" width="1" height="1" fill="#1a1410" />
      <rect x="19" y="37" width="1" height="1" fill="#1a1410" />
    </svg>
  );
}

function ImpSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 22 28"
      shapeRendering="crispEdges"
      className={className}
      preserveAspectRatio="xMidYMax meet"
      aria-label="Imp"
    >
      {/* Bat wings spread wide behind */}
      <polygon points="0,9 5,4 7,11 5,14" fill="#5a1818" />
      <polygon points="22,9 17,4 15,11 17,14" fill="#5a1818" />
      <polygon points="1,10 4,7 5,12" fill="#8c2828" opacity="0.55" />
      <polygon points="21,10 18,7 17,12" fill="#8c2828" opacity="0.55" />
      {/* Wing bones */}
      <line x1="2" y1="6" x2="6" y2="13" stroke="#1a0808" strokeWidth="0.5" />
      <line x1="20" y1="6" x2="16" y2="13" stroke="#1a0808" strokeWidth="0.5" />
      <line x1="5" y1="4" x2="5" y2="13" stroke="#1a0808" strokeWidth="0.3" />
      <line x1="17" y1="4" x2="17" y2="13" stroke="#1a0808" strokeWidth="0.3" />
      {/* Crimson body — slender devil */}
      <rect x="8" y="7" width="6" height="8" fill="#a83018" />
      <rect x="7" y="8" width="1" height="6" fill="#8c2010" />
      <rect x="14" y="8" width="1" height="6" fill="#8c2010" />
      {/* Demon head — pointed chin */}
      <rect x="7" y="2" width="8" height="5" fill="#a83018" />
      <rect x="7" y="2" width="8" height="1" fill="#8c2010" />
      <rect x="8" y="6" width="6" height="2" fill="#a83018" />
      <polygon points="9,8 11,10 13,8" fill="#a83018" />
      {/* Long curving horns */}
      <rect x="6" y="0" width="1" height="3" fill="#3a1208" />
      <rect x="15" y="0" width="1" height="3" fill="#3a1208" />
      <rect x="5" y="1" width="1" height="2" fill="#3a1208" />
      <rect x="16" y="1" width="1" height="2" fill="#3a1208" />
      <rect x="4" y="2" width="1" height="1" fill="#3a1208" />
      <rect x="17" y="2" width="1" height="1" fill="#3a1208" />
      {/* Glowing yellow slit eyes */}
      <rect x="8" y="3" width="2" height="2" fill="#1a0808" />
      <rect x="12" y="3" width="2" height="2" fill="#1a0808" />
      <rect x="8" y="3" width="1" height="1" fill="#f4d042" />
      <rect x="13" y="4" width="1" height="1" fill="#f4d042" />
      {/* Grin with tiny fangs */}
      <rect x="8" y="5" width="6" height="1" fill="#1a0808" />
      <rect x="9" y="6" width="1" height="1" fill="#e8dcc4" />
      <rect x="12" y="6" width="1" height="1" fill="#e8dcc4" />
      {/* Slender arms */}
      <rect x="5" y="9" width="2" height="5" fill="#a83018" />
      <rect x="15" y="9" width="2" height="5" fill="#a83018" />
      {/* Clawed hands */}
      <rect x="4" y="13" width="3" height="2" fill="#a83018" />
      <rect x="15" y="13" width="3" height="2" fill="#a83018" />
      <polygon points="4,15 3,17 5,16" fill="#1a0808" />
      <polygon points="6,15 5,17 7,16" fill="#1a0808" />
      <polygon points="15,15 14,17 16,16" fill="#1a0808" />
      <polygon points="17,15 16,17 18,16" fill="#1a0808" />
      {/* Stinger orb of dark energy in right hand (ranged caster motif) */}
      <circle cx="17" cy="14" r="2" fill="#8c2828" opacity="0.7" />
      <circle cx="17" cy="14" r="1" fill="#f4a02a" opacity="0.85" />
      <rect x="17" y="14" width="1" height="1" fill="#fff" opacity="0.6" />
      {/* Long whippy tail with arrowhead barb */}
      <rect x="11" y="15" width="1" height="3" fill="#a83018" />
      <rect x="12" y="17" width="1" height="2" fill="#a83018" />
      <rect x="13" y="18" width="1" height="2" fill="#a83018" />
      <rect x="14" y="19" width="1" height="2" fill="#a83018" />
      <polygon points="14,21 17,21 15,24" fill="#3a1208" />
      <polygon points="14,21 17,21 16,19" fill="#3a1208" />
      {/* Goat-style legs */}
      <rect x="8" y="15" width="2" height="6" fill="#a83018" />
      <rect x="12" y="15" width="2" height="6" fill="#a83018" />
      <rect x="8" y="15" width="1" height="6" fill="#8c2010" />
      <rect x="12" y="15" width="1" height="6" fill="#8c2010" />
      {/* Cloven hoof-feet */}
      <rect x="7" y="21" width="4" height="3" fill="#3a1208" />
      <rect x="11" y="21" width="4" height="3" fill="#3a1208" />
      <rect x="8" y="23" width="1" height="1" fill="#1a0808" />
      <rect x="10" y="23" width="1" height="1" fill="#1a0808" />
      <rect x="12" y="23" width="1" height="1" fill="#1a0808" />
      <rect x="14" y="23" width="1" height="1" fill="#1a0808" />
      {/* Sulphur haze at feet */}
      <ellipse cx="11" cy="26" rx="8" ry="1.5" fill="#8c2828" opacity="0.25" />
      <ellipse cx="11" cy="27" rx="6" ry="0.8" fill="#f4a02a" opacity="0.15" />
    </svg>
  );
}

function IlyichSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 22 36"
      shapeRendering="crispEdges"
      className={className}
      preserveAspectRatio="xMidYMax meet"
      aria-label="Ilyich the Duergar"
    >
      {/* Iron skull-cap helm */}
      <rect x="7" y="2" width="8" height="4" fill="#3a2e22" />
      <rect x="6" y="3" width="1" height="3" fill="#1a1410" />
      <rect x="15" y="3" width="1" height="3" fill="#1a1410" />
      <rect x="9" y="0" width="4" height="2" fill="#3a2e22" />
      <rect x="10" y="0" width="2" height="1" fill="#5a4030" />
      {/* Grey duergar face */}
      <rect x="6" y="6" width="10" height="4" fill="#7a7068" />
      <rect x="6" y="6" width="10" height="1" fill="#5a5048" />
      {/* Sunken angry eyes */}
      <rect x="7" y="7" width="2" height="1" fill="#1a1410" />
      <rect x="13" y="7" width="2" height="1" fill="#1a1410" />
      <rect x="7" y="7" width="1" height="1" fill="#ffb347" />
      <rect x="14" y="7" width="1" height="1" fill="#ffb347" />
      {/* Bulbous nose */}
      <rect x="10" y="8" width="2" height="2" fill="#5a5048" />
      {/* Huge braided beard */}
      <rect x="5" y="10" width="12" height="6" fill="#3a2418" />
      <rect x="5" y="10" width="12" height="1" fill="#2a180c" />
      <rect x="7" y="12" width="2" height="2" fill="#2a180c" />
      <rect x="11" y="13" width="2" height="2" fill="#2a180c" />
      <rect x="13" y="11" width="2" height="2" fill="#2a180c" />
      {/* Beard braid bead */}
      <rect x="10" y="15" width="2" height="1" fill="#8c6232" />
      {/* Heavy iron pauldrons */}
      <rect x="1" y="12" width="4" height="4" fill="#1a1410" />
      <rect x="17" y="12" width="4" height="4" fill="#1a1410" />
      <rect x="2" y="13" width="2" height="1" fill="#5a4030" />
      <rect x="18" y="13" width="2" height="1" fill="#5a4030" />
      {/* Plate breastplate */}
      <rect x="4" y="14" width="14" height="9" fill="#3a2e22" />
      <rect x="5" y="15" width="12" height="7" fill="#2a1f17" />
      {/* Chest emblem - duergar slaver insignia */}
      <rect x="9" y="17" width="4" height="3" fill="#5a4030" />
      <rect x="10" y="18" width="2" height="1" fill="#b5302c" />
      {/* Plate trim highlights */}
      <rect x="4" y="14" width="14" height="1" fill="#5a4030" />
      <rect x="4" y="22" width="14" height="1" fill="#5a4030" />
      {/* Arms */}
      <rect x="2" y="16" width="3" height="7" fill="#7a7068" />
      <rect x="17" y="16" width="3" height="7" fill="#7a7068" />
      {/* Gauntlets */}
      <rect x="1" y="22" width="4" height="3" fill="#1a1410" />
      <rect x="17" y="22" width="4" height="3" fill="#1a1410" />
      <rect x="2" y="23" width="2" height="1" fill="#3a2e22" />
      <rect x="18" y="23" width="2" height="1" fill="#3a2e22" />
      {/* Heavy war pick handle (held diagonally) */}
      <rect x="18" y="3" width="2" height="20" fill="#3a2418" />
      <rect x="19" y="3" width="1" height="20" fill="#5a4030" />
      {/* Pick head */}
      <rect x="16" y="3" width="4" height="2" fill="#1a1410" />
      <polygon points="20,5 24,1 22,7" fill="#1a1410" />
      <rect x="20" y="3" width="1" height="2" fill="#5a4030" />
      {/* Belt */}
      <rect x="4" y="23" width="14" height="2" fill="#1a1410" />
      <rect x="10" y="23" width="2" height="2" fill="#8c6232" />
      {/* Stout legs in iron greaves */}
      <rect x="6" y="25" width="4" height="8" fill="#3a2e22" />
      <rect x="12" y="25" width="4" height="8" fill="#3a2e22" />
      <rect x="7" y="26" width="2" height="7" fill="#2a1f17" />
      <rect x="13" y="26" width="2" height="7" fill="#2a1f17" />
      {/* Iron boots */}
      <rect x="5" y="33" width="6" height="3" fill="#1a1410" />
      <rect x="11" y="33" width="6" height="3" fill="#1a1410" />
    </svg>
  );
}

function DustMephitSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 22 28"
      shapeRendering="crispEdges"
      className={className}
      preserveAspectRatio="xMidYMax meet"
      aria-label="Dust Mephit"
    >
      {/* Wings spread behind */}
      <polygon points="0,8 4,4 6,12 4,14" fill="#5a5048" />
      <polygon points="22,8 18,4 16,12 18,14" fill="#5a5048" />
      <polygon points="1,9 4,6 5,11" fill="#7a7068" opacity="0.6" />
      <polygon points="21,9 18,6 17,11" fill="#7a7068" opacity="0.6" />
      {/* Wing bones */}
      <line x1="3" y1="6" x2="5" y2="13" stroke="#1a1410" strokeWidth="0.4" />
      <line x1="19" y1="6" x2="17" y2="13" stroke="#1a1410" strokeWidth="0.4" />
      {/* Body (chalk-grey) */}
      <rect x="8" y="6" width="6" height="9" fill="#a8a098" />
      <rect x="7" y="7" width="1" height="6" fill="#8a8278" />
      <rect x="14" y="7" width="1" height="6" fill="#8a8278" />
      {/* Demon head */}
      <rect x="7" y="2" width="8" height="5" fill="#a8a098" />
      <rect x="7" y="2" width="8" height="1" fill="#8a8278" />
      {/* Horns */}
      <rect x="7" y="0" width="1" height="3" fill="#5a5048" />
      <rect x="14" y="0" width="1" height="3" fill="#5a5048" />
      <rect x="6" y="1" width="1" height="1" fill="#5a5048" />
      <rect x="15" y="1" width="1" height="1" fill="#5a5048" />
      {/* Glowing pale eyes */}
      <rect x="8" y="3" width="2" height="2" fill="#1a1410" />
      <rect x="12" y="3" width="2" height="2" fill="#1a1410" />
      <rect x="8" y="3" width="1" height="1" fill="#e0d8c0" />
      <rect x="12" y="3" width="1" height="1" fill="#e0d8c0" />
      {/* Fanged mouth */}
      <rect x="8" y="5" width="6" height="2" fill="#1a1410" />
      <rect x="8" y="5" width="1" height="2" fill="#e0d8c0" />
      <rect x="10" y="5" width="1" height="1" fill="#e0d8c0" />
      <rect x="13" y="5" width="1" height="2" fill="#e0d8c0" />
      {/* Spindly arms with claws */}
      <rect x="6" y="9" width="2" height="5" fill="#a8a098" />
      <rect x="14" y="9" width="2" height="5" fill="#a8a098" />
      <rect x="5" y="13" width="3" height="2" fill="#a8a098" />
      <rect x="14" y="13" width="3" height="2" fill="#a8a098" />
      {/* Sharp claws */}
      <polygon points="5,14 4,16 6,15" fill="#1a1410" />
      <polygon points="7,14 6,16 8,15" fill="#1a1410" />
      <polygon points="15,14 14,16 16,15" fill="#1a1410" />
      <polygon points="17,14 16,16 18,15" fill="#1a1410" />
      {/* Tail */}
      <rect x="11" y="15" width="1" height="6" fill="#5a5048" />
      <rect x="10" y="20" width="1" height="2" fill="#5a5048" />
      <polygon points="9,22 11,24 10,22" fill="#1a1410" />
      {/* Tiny legs */}
      <rect x="8" y="15" width="2" height="6" fill="#a8a098" />
      <rect x="12" y="15" width="2" height="6" fill="#a8a098" />
      {/* Feet/claws */}
      <rect x="7" y="21" width="4" height="2" fill="#a8a098" />
      <rect x="11" y="21" width="4" height="2" fill="#a8a098" />
      <polygon points="7,23 8,25 9,23" fill="#1a1410" />
      <polygon points="13,23 14,25 15,23" fill="#1a1410" />
      {/* Dust cloud at the feet */}
      <ellipse cx="11" cy="26" rx="8" ry="1.5" fill="#a8a098" opacity="0.3" />
      <ellipse cx="11" cy="27" rx="6" ry="0.8" fill="#a8a098" opacity="0.2" />
    </svg>
  );
}

function AnimatedArmorSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 22 40"
      shapeRendering="crispEdges"
      className={className}
      preserveAspectRatio="xMidYMax meet"
      aria-label="Animated Armor"
    >
      {/* Helmet plume */}
      <rect x="10" y="0" width="2" height="1" fill="#b5302c" />
      <rect x="11" y="-1" width="1" height="1" fill="#b5302c" />
      {/* Helmet body */}
      <rect x="7" y="1" width="8" height="2" fill="#6a625a" />
      <rect x="6" y="2" width="10" height="6" fill="#7a7268" />
      <rect x="5" y="3" width="1" height="5" fill="#5a5248" />
      <rect x="16" y="3" width="1" height="5" fill="#5a5248" />
      {/* Visor slit — empty void inside */}
      <rect x="7" y="5" width="8" height="2" fill="#0a0606" />
      <rect x="8" y="5" width="1" height="1" fill="#3a8c5a" /> {/* fey-green soul */}
      <rect x="13" y="5" width="1" height="1" fill="#3a8c5a" />
      {/* Helmet jaw */}
      <rect x="7" y="7" width="8" height="2" fill="#5a5248" />
      {/* No neck — gap between helm and gorget */}
      <rect x="9" y="9" width="4" height="1" fill="#0a0606" />
      {/* Massive pauldrons */}
      <rect x="2" y="10" width="5" height="4" fill="#5a5248" />
      <rect x="15" y="10" width="5" height="4" fill="#5a5248" />
      <rect x="3" y="11" width="3" height="2" fill="#7a7268" />
      <rect x="16" y="11" width="3" height="2" fill="#7a7268" />
      {/* Spikes on pauldrons */}
      <polygon points="2,10 1,8 3,10" fill="#3a3228" />
      <polygon points="20,10 21,8 19,10" fill="#3a3228" />
      {/* Breastplate */}
      <rect x="6" y="11" width="10" height="11" fill="#6a625a" />
      <rect x="5" y="12" width="12" height="9" fill="#7a7268" />
      <rect x="5" y="12" width="12" height="1" fill="#5a5248" />
      {/* Center groove */}
      <rect x="10" y="13" width="2" height="8" fill="#5a5248" />
      {/* Glowing fey-rune in chest */}
      <rect x="9" y="16" width="4" height="2" fill="#3a8c5a" />
      <rect x="10" y="17" width="2" height="1" fill="#a8d042" />
      {/* Faulds (skirts) */}
      <rect x="5" y="22" width="12" height="3" fill="#5a5248" />
      <rect x="5" y="22" width="12" height="1" fill="#3a3228" />
      <rect x="7" y="23" width="1" height="2" fill="#3a3228" />
      <rect x="10" y="23" width="1" height="2" fill="#3a3228" />
      <rect x="13" y="23" width="1" height="2" fill="#3a3228" />
      {/* Arms - rerebrace, couter, vambrace */}
      <rect x="3" y="14" width="3" height="3" fill="#7a7268" />
      <rect x="16" y="14" width="3" height="3" fill="#7a7268" />
      <rect x="3" y="17" width="2" height="1" fill="#3a3228" /> {/* elbow */}
      <rect x="17" y="17" width="2" height="1" fill="#3a3228" />
      <rect x="3" y="18" width="3" height="5" fill="#7a7268" />
      <rect x="16" y="18" width="3" height="5" fill="#7a7268" />
      {/* Gauntlets */}
      <rect x="2" y="23" width="5" height="3" fill="#3a3228" />
      <rect x="15" y="23" width="5" height="3" fill="#3a3228" />
      <rect x="3" y="24" width="3" height="1" fill="#7a7268" />
      <rect x="16" y="24" width="3" height="1" fill="#7a7268" />
      {/* Mace held in right hand */}
      <rect x="18" y="6" width="2" height="18" fill="#3a2e22" />
      <rect x="17" y="3" width="4" height="4" fill="#5a5248" />
      <rect x="16" y="4" width="6" height="2" fill="#3a3228" />
      <rect x="17" y="2" width="1" height="1" fill="#3a3228" /> {/* spike */}
      <rect x="20" y="2" width="1" height="1" fill="#3a3228" /> {/* spike */}
      <rect x="18" y="1" width="2" height="2" fill="#3a3228" /> {/* spike */}
      {/* Cuisses + greaves */}
      <rect x="6" y="25" width="4" height="9" fill="#7a7268" />
      <rect x="12" y="25" width="4" height="9" fill="#7a7268" />
      <rect x="6" y="25" width="1" height="9" fill="#5a5248" />
      <rect x="12" y="25" width="1" height="9" fill="#5a5248" />
      {/* Knee couters */}
      <rect x="6" y="29" width="4" height="2" fill="#3a3228" />
      <rect x="12" y="29" width="4" height="2" fill="#3a3228" />
      {/* Sabatons */}
      <rect x="5" y="34" width="6" height="4" fill="#3a3228" />
      <rect x="11" y="34" width="6" height="4" fill="#3a3228" />
      <polygon points="5,38 7,40 11,38" fill="#3a3228" /> {/* pointed toe */}
      <polygon points="11,38 13,40 17,38" fill="#3a3228" />
    </svg>
  );
}

function SkeletonSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 36"
      shapeRendering="crispEdges"
      className={className}
      preserveAspectRatio="xMidYMax meet"
      aria-label="Skeleton"
    >
      {/* Skull crown */}
      <rect x="6" y="0" width="8" height="2" fill="#d4c8a8" />
      <rect x="5" y="2" width="10" height="7" fill="#d4c8a8" />
      <rect x="4" y="3" width="1" height="5" fill="#a89878" />
      <rect x="15" y="3" width="1" height="5" fill="#a89878" />
      {/* Black eye sockets */}
      <rect x="6" y="4" width="3" height="3" fill="#0a0808" />
      <rect x="11" y="4" width="3" height="3" fill="#0a0808" />
      <rect x="7" y="5" width="1" height="1" fill="#ffb347" />
      <rect x="12" y="5" width="1" height="1" fill="#ffb347" />
      {/* Nasal cavity */}
      <rect x="9" y="6" width="2" height="2" fill="#0a0808" />
      {/* Grinning teeth */}
      <rect x="6" y="8" width="8" height="2" fill="#0a0808" />
      <rect x="6" y="8" width="1" height="2" fill="#d4c8a8" />
      <rect x="8" y="8" width="1" height="2" fill="#d4c8a8" />
      <rect x="10" y="8" width="1" height="2" fill="#d4c8a8" />
      <rect x="12" y="8" width="1" height="2" fill="#d4c8a8" />
      {/* Spinal column / vertebrae */}
      <rect x="9" y="10" width="2" height="1" fill="#a89878" />
      <rect x="9" y="13" width="2" height="1" fill="#a89878" />
      <rect x="9" y="16" width="2" height="1" fill="#a89878" />
      {/* Ribcage */}
      <rect x="6" y="11" width="8" height="9" fill="#1a1410" />
      <rect x="7" y="11" width="1" height="9" fill="#d4c8a8" />
      <rect x="12" y="11" width="1" height="9" fill="#d4c8a8" />
      <rect x="6" y="12" width="2" height="1" fill="#d4c8a8" />
      <rect x="12" y="12" width="2" height="1" fill="#d4c8a8" />
      <rect x="6" y="14" width="2" height="1" fill="#d4c8a8" />
      <rect x="12" y="14" width="2" height="1" fill="#d4c8a8" />
      <rect x="6" y="16" width="2" height="1" fill="#d4c8a8" />
      <rect x="12" y="16" width="2" height="1" fill="#d4c8a8" />
      <rect x="6" y="18" width="2" height="1" fill="#d4c8a8" />
      <rect x="12" y="18" width="2" height="1" fill="#d4c8a8" />
      {/* Pelvis */}
      <rect x="6" y="20" width="8" height="2" fill="#a89878" />
      {/* Bone arms */}
      <rect x="4" y="11" width="2" height="9" fill="#d4c8a8" />
      <rect x="14" y="11" width="2" height="9" fill="#d4c8a8" />
      {/* Hand bones */}
      <rect x="3" y="20" width="3" height="2" fill="#d4c8a8" />
      <rect x="14" y="20" width="3" height="2" fill="#d4c8a8" />
      {/* Rusted shortsword in right hand */}
      <rect x="15" y="9" width="2" height="11" fill="#8c7a52" />
      <rect x="16" y="9" width="1" height="11" fill="#d4c8a8" />
      <rect x="14" y="19" width="4" height="1" fill="#5a4030" />
      <rect x="15" y="20" width="2" height="2" fill="#1a1410" />
      {/* Bone legs */}
      <rect x="7" y="22" width="2" height="11" fill="#d4c8a8" />
      <rect x="11" y="22" width="2" height="11" fill="#d4c8a8" />
      <rect x="7" y="22" width="1" height="11" fill="#a89878" />
      <rect x="11" y="22" width="1" height="11" fill="#a89878" />
      {/* Bone feet */}
      <rect x="5" y="33" width="4" height="2" fill="#d4c8a8" />
      <rect x="11" y="33" width="4" height="2" fill="#d4c8a8" />
    </svg>
  );
}

function KoboldSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 18 26"
      shapeRendering="crispEdges"
      className={className}
      preserveAspectRatio="xMidYMax meet"
      aria-label="Kobold"
    >
      {/* Reptilian head with snout */}
      <rect x="5" y="2" width="8" height="6" fill="#8a4a1c" />
      <rect x="13" y="3" width="3" height="3" fill="#8a4a1c" /> {/* snout */}
      <rect x="14" y="4" width="1" height="1" fill="#5a3010" />
      {/* Tiny horns */}
      <rect x="6" y="0" width="1" height="2" fill="#5a3010" />
      <rect x="11" y="0" width="1" height="2" fill="#5a3010" />
      {/* Yellow eyes */}
      <rect x="6" y="4" width="2" height="2" fill="#f4d042" />
      <rect x="9" y="4" width="2" height="2" fill="#f4d042" />
      <rect x="7" y="5" width="1" height="1" fill="#0a0808" />
      <rect x="10" y="5" width="1" height="1" fill="#0a0808" />
      {/* Toothy mouth */}
      <rect x="6" y="7" width="6" height="1" fill="#0a0808" />
      <rect x="7" y="7" width="1" height="1" fill="#d4c8a8" />
      <rect x="10" y="7" width="1" height="1" fill="#d4c8a8" />
      {/* Scrawny neck */}
      <rect x="7" y="8" width="4" height="1" fill="#8a4a1c" />
      {/* Tiny body (scaled) */}
      <rect x="5" y="9" width="8" height="5" fill="#a05428" />
      <rect x="5" y="9" width="8" height="1" fill="#5a3010" />
      <rect x="7" y="11" width="4" height="2" fill="#3a1a08" /> {/* dark torso shadow */}
      {/* Scrawny arms */}
      <rect x="3" y="9" width="2" height="6" fill="#8a4a1c" />
      <rect x="13" y="9" width="2" height="6" fill="#8a4a1c" />
      {/* Small claw hands */}
      <rect x="2" y="14" width="3" height="2" fill="#8a4a1c" />
      <rect x="13" y="14" width="3" height="2" fill="#8a4a1c" />
      {/* Bone dagger in right hand */}
      <rect x="14" y="10" width="1" height="5" fill="#d4c8a8" />
      <rect x="13" y="14" width="3" height="1" fill="#6b4a2e" />
      {/* Loincloth */}
      <rect x="5" y="14" width="8" height="2" fill="#3a2e22" />
      {/* Stubby legs */}
      <rect x="6" y="16" width="2" height="5" fill="#8a4a1c" />
      <rect x="10" y="16" width="2" height="5" fill="#8a4a1c" />
      {/* Tail visible behind */}
      <rect x="13" y="14" width="1" height="6" fill="#5a3010" />
      <rect x="14" y="18" width="1" height="2" fill="#5a3010" />
      {/* Clawed feet */}
      <rect x="5" y="21" width="4" height="3" fill="#8a4a1c" />
      <rect x="9" y="21" width="4" height="3" fill="#8a4a1c" />
      <rect x="5" y="23" width="1" height="2" fill="#d4c8a8" /> {/* claws */}
      <rect x="7" y="23" width="1" height="2" fill="#d4c8a8" />
      <rect x="10" y="23" width="1" height="2" fill="#d4c8a8" />
      <rect x="12" y="23" width="1" height="2" fill="#d4c8a8" />
    </svg>
  );
}

function GoblinSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 32"
      shapeRendering="crispEdges"
      className={className}
      preserveAspectRatio="xMidYMax meet"
      aria-label="Goblin"
    >
      {/* Pointed ears — angular, swept back */}
      <rect x="3" y="3" width="2" height="3" fill="#4a7022" />
      <rect x="15" y="3" width="2" height="3" fill="#4a7022" />
      <rect x="2" y="4" width="1" height="2" fill="#3a5018" />
      <rect x="17" y="4" width="1" height="2" fill="#3a5018" />
      {/* Hunched head, leans forward */}
      <rect x="5" y="2" width="10" height="8" fill="#4a7022" />
      <rect x="4" y="4" width="1" height="4" fill="#3a5018" />
      <rect x="15" y="4" width="1" height="4" fill="#3a5018" />
      <rect x="5" y="2" width="10" height="1" fill="#3a5018" />
      {/* Big hooked nose */}
      <rect x="9" y="4" width="2" height="3" fill="#3a5018" />
      <rect x="10" y="5" width="1" height="3" fill="#2d3f12" />
      <rect x="9" y="7" width="1" height="1" fill="#2d3f12" />
      {/* Mean narrow yellow eyes with red glints */}
      <rect x="6" y="5" width="2" height="1" fill="#f4d042" />
      <rect x="12" y="5" width="2" height="1" fill="#f4d042" />
      <rect x="6" y="5" width="1" height="1" fill="#b5302c" />
      <rect x="13" y="5" width="1" height="1" fill="#b5302c" />
      {/* Heavy brow shadow */}
      <rect x="5" y="4" width="4" height="1" fill="#2d3f12" />
      <rect x="11" y="4" width="4" height="1" fill="#2d3f12" />
      {/* Snarling mouth with crooked teeth */}
      <rect x="6" y="8" width="8" height="2" fill="#1a1410" />
      <rect x="6" y="8" width="1" height="1" fill="#d4c8a8" />
      <rect x="8" y="8" width="1" height="2" fill="#d4c8a8" />
      <rect x="11" y="8" width="1" height="1" fill="#d4c8a8" />
      <rect x="13" y="9" width="1" height="1" fill="#d4c8a8" />
      {/* Bony chin */}
      <rect x="7" y="10" width="6" height="1" fill="#3a5018" />
      {/* Hunched shoulders, raised */}
      <rect x="3" y="11" width="14" height="2" fill="#4a7022" />
      <rect x="3" y="11" width="2" height="2" fill="#3a5018" />
      <rect x="15" y="11" width="2" height="2" fill="#3a5018" />
      {/* Crude leather armor with bone studs */}
      <rect x="5" y="13" width="10" height="7" fill="#5a3a22" />
      <rect x="5" y="13" width="10" height="1" fill="#3a2418" />
      <rect x="5" y="20" width="10" height="1" fill="#3a2418" />
      {/* Bone studs */}
      <rect x="6" y="15" width="1" height="1" fill="#d4c8a8" />
      <rect x="9" y="15" width="1" height="1" fill="#d4c8a8" />
      <rect x="12" y="15" width="1" height="1" fill="#d4c8a8" />
      <rect x="7" y="17" width="1" height="1" fill="#d4c8a8" />
      <rect x="11" y="17" width="1" height="1" fill="#d4c8a8" />
      {/* Skull pendant on chest */}
      <rect x="9" y="18" width="2" height="2" fill="#d4c8a8" />
      <rect x="9" y="18" width="1" height="1" fill="#1a1410" />
      <rect x="10" y="19" width="1" height="1" fill="#1a1410" />
      {/* Scrawny arms */}
      <rect x="3" y="13" width="2" height="7" fill="#4a7022" />
      <rect x="15" y="13" width="2" height="7" fill="#4a7022" />
      {/* Hands */}
      <rect x="2" y="19" width="3" height="2" fill="#4a7022" />
      <rect x="15" y="19" width="3" height="2" fill="#4a7022" />
      {/* Scimitar held down low and ready, curved blade */}
      <rect x="17" y="13" width="1" height="6" fill="#b5a282" />
      <rect x="18" y="19" width="1" height="2" fill="#b5a282" />
      <rect x="17" y="13" width="1" height="2" fill="#e8dcc4" />
      <rect x="16" y="18" width="2" height="1" fill="#6b4a2e" />
      {/* Belt */}
      <rect x="5" y="20" width="10" height="1" fill="#1a1410" />
      {/* Tattered loincloth */}
      <rect x="6" y="21" width="8" height="3" fill="#3a2418" />
      {/* Bowlegged legs, low stance */}
      <rect x="6" y="24" width="3" height="6" fill="#4a7022" />
      <rect x="11" y="24" width="3" height="6" fill="#4a7022" />
      <rect x="6" y="26" width="1" height="4" fill="#3a5018" />
      <rect x="13" y="26" width="1" height="4" fill="#3a5018" />
      {/* Crusty bare feet */}
      <rect x="5" y="30" width="4" height="2" fill="#4a7022" />
      <rect x="11" y="30" width="4" height="2" fill="#4a7022" />
    </svg>
  );
}

function GoblinWardenSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 22 36"
      shapeRendering="crispEdges"
      className={className}
      preserveAspectRatio="xMidYMax meet"
      aria-label="Goblin Warden"
    >
      {/* Helm crest */}
      <rect x="10" y="0" width="2" height="1" fill="#8c6232" />
      {/* Iron helm */}
      <rect x="6" y="1" width="10" height="3" fill="#5a4030" />
      <rect x="5" y="2" width="1" height="2" fill="#3a2e22" />
      <rect x="16" y="2" width="1" height="2" fill="#3a2e22" />
      <rect x="6" y="1" width="10" height="1" fill="#8c6232" />
      {/* Head below helm */}
      <rect x="6" y="4" width="10" height="5" fill="#3a5018" />
      {/* Large ears */}
      <rect x="3" y="3" width="3" height="4" fill="#3a5018" />
      <rect x="16" y="3" width="3" height="4" fill="#3a5018" />
      <rect x="2" y="4" width="1" height="2" fill="#2d3a12" />
      <rect x="19" y="4" width="1" height="2" fill="#2d3a12" />
      {/* Intense eyes */}
      <rect x="7" y="5" width="2" height="2" fill="#b5302c" />
      <rect x="13" y="5" width="2" height="2" fill="#b5302c" />
      <rect x="7" y="5" width="1" height="1" fill="#ffb347" />
      <rect x="13" y="5" width="1" height="1" fill="#ffb347" />
      {/* Scar */}
      <rect x="9" y="7" width="4" height="1" fill="#b5302c" opacity="0.6" />
      {/* Snarling mouth */}
      <rect x="7" y="8" width="8" height="2" fill="#1a1410" />
      <rect x="7" y="8" width="1" height="2" fill="#e8dcc4" />
      <rect x="9" y="8" width="1" height="2" fill="#e8dcc4" />
      <rect x="12" y="8" width="1" height="2" fill="#e8dcc4" />
      <rect x="14" y="8" width="1" height="2" fill="#e8dcc4" />
      {/* Pauldrons */}
      <rect x="2" y="10" width="4" height="3" fill="#1a1410" />
      <rect x="16" y="10" width="4" height="3" fill="#1a1410" />
      <rect x="3" y="11" width="2" height="1" fill="#5a4030" />
      <rect x="17" y="11" width="2" height="1" fill="#5a4030" />
      {/* Chain mail torso */}
      <rect x="5" y="10" width="12" height="11" fill="#5a4030" />
      <rect x="6" y="11" width="10" height="9" fill="#3a2e22" />
      {/* Chain mail dot pattern */}
      <rect x="7" y="12" width="1" height="1" fill="#6b4a2e" />
      <rect x="9" y="12" width="1" height="1" fill="#6b4a2e" />
      <rect x="13" y="12" width="1" height="1" fill="#6b4a2e" />
      <rect x="15" y="12" width="1" height="1" fill="#6b4a2e" />
      <rect x="8" y="15" width="1" height="1" fill="#6b4a2e" />
      <rect x="10" y="15" width="1" height="1" fill="#6b4a2e" />
      <rect x="14" y="15" width="1" height="1" fill="#6b4a2e" />
      <rect x="9" y="17" width="1" height="1" fill="#6b4a2e" />
      <rect x="13" y="17" width="1" height="1" fill="#6b4a2e" />
      {/* Belt with buckle */}
      <rect x="4" y="21" width="14" height="1" fill="#1a1410" />
      <rect x="10" y="21" width="2" height="1" fill="#8c6232" />
      {/* Left/right arms */}
      <rect x="2" y="13" width="3" height="8" fill="#3a5018" />
      <rect x="17" y="13" width="3" height="8" fill="#3a5018" />
      <rect x="2" y="20" width="3" height="2" fill="#3a5018" />
      <rect x="17" y="20" width="3" height="2" fill="#3a5018" />
      {/* Hands gripping greatsword in front */}
      <rect x="9" y="13" width="2" height="3" fill="#3a5018" />
      <rect x="12" y="11" width="2" height="3" fill="#3a5018" />
      {/* Chain-bound greatsword: massive blade up the center */}
      <rect x="10" y="0" width="2" height="2" fill="#5a4030" />
      <rect x="9" y="0" width="4" height="11" fill="#b5a282" />
      <rect x="11" y="0" width="1" height="11" fill="#e8dcc4" />
      <rect x="8" y="11" width="6" height="1" fill="#6b4a2e" />
      <rect x="10" y="12" width="2" height="4" fill="#3a2e22" />
      {/* Chain wrapped around blade */}
      <rect x="9" y="2" width="1" height="1" fill="#3a2e22" />
      <rect x="12" y="3" width="1" height="1" fill="#3a2e22" />
      <rect x="9" y="5" width="1" height="1" fill="#3a2e22" />
      <rect x="12" y="6" width="1" height="1" fill="#3a2e22" />
      <rect x="9" y="8" width="1" height="1" fill="#3a2e22" />
      {/* Hip armor */}
      <rect x="5" y="22" width="12" height="3" fill="#3a2e22" />
      <rect x="5" y="22" width="12" height="1" fill="#5a4030" />
      {/* Legs */}
      <rect x="6" y="25" width="3" height="8" fill="#3a5018" />
      <rect x="13" y="25" width="3" height="8" fill="#3a5018" />
      <rect x="7" y="26" width="1" height="7" fill="#2d3a12" />
      <rect x="14" y="26" width="1" height="7" fill="#2d3a12" />
      {/* Boots */}
      <rect x="5" y="33" width="5" height="3" fill="#1a1410" />
      <rect x="12" y="33" width="5" height="3" fill="#1a1410" />
      <rect x="5" y="35" width="5" height="1" fill="#5a4030" />
      <rect x="12" y="35" width="5" height="1" fill="#5a4030" />
    </svg>
  );
}
