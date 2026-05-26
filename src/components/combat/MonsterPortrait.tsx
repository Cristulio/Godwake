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
    case 'stirge':
      return <StirgeSvg className={className} />;
    case 'ghoul':
      return <GhoulSvg className={className} />;
    case 'hobgoblin':
      return <HobgoblinSvg className={className} />;
    case 'cult-fanatic':
      return <CultFanaticSvg className={className} />;
    case 'shadow':
      return <ShadowSvg className={className} />;
    case 'cowled-enforcer':
      return <CowledEnforcerSvg className={className} />;
    case 'slaver-cuirassier':
      return <SlaverCuirassierSvg className={className} />;
    case 'athkatla-magistrate':
      return <AthkatlaMagistrateSvg className={className} />;
    default:
      return <GoblinSvg className={className} />;
  }
}

function CultFanaticSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 22 36"
      shapeRendering="crispEdges"
      className={className}
      preserveAspectRatio="xMidYMax meet"
      aria-label="Cult Fanatic"
    >
      {/* Hood crown — peaked back */}
      <polygon points="7,1 11,-1 15,1 16,5 6,5" fill="#d8c8a8" />
      <polygon points="7,1 11,-1 15,1 16,3 6,3" fill="#a89878" opacity="0.6" />
      {/* Robe hood draping past shoulders */}
      <rect x="5" y="4" width="12" height="6" fill="#d8c8a8" />
      <rect x="4" y="6" width="1" height="4" fill="#a89878" />
      <rect x="17" y="6" width="1" height="4" fill="#a89878" />
      {/* Shadowed face inside the hood */}
      <rect x="7" y="6" width="8" height="5" fill="#3a2818" />
      {/* Sunken eye sockets, red coal eyes */}
      <rect x="8" y="7" width="2" height="2" fill="#1a0e08" />
      <rect x="12" y="7" width="2" height="2" fill="#1a0e08" />
      <rect x="8" y="8" width="1" height="1" fill="#b5302c" />
      <rect x="13" y="8" width="1" height="1" fill="#b5302c" />
      {/* Mouth open in mid-shriek */}
      <rect x="9" y="10" width="4" height="1" fill="#1a0e08" />
      <rect x="10" y="10" width="1" height="1" fill="#e8dcc4" />
      {/* Blood streak from collar — circle of dried blood */}
      <rect x="5" y="10" width="12" height="1" fill="#5a1208" />
      {/* Robe body — dirty white with grime */}
      <rect x="4" y="11" width="14" height="14" fill="#d8c8a8" />
      <rect x="4" y="11" width="14" height="1" fill="#a89878" />
      {/* Grime smears */}
      <rect x="6" y="14" width="2" height="3" fill="#7a6848" opacity="0.55" />
      <rect x="13" y="16" width="3" height="2" fill="#7a6848" opacity="0.55" />
      <rect x="8" y="20" width="4" height="1" fill="#5a1208" opacity="0.7" />
      <rect x="11" y="22" width="2" height="2" fill="#5a1208" opacity="0.7" />
      {/* Rope belt */}
      <rect x="4" y="22" width="14" height="2" fill="#5a4028" />
      <rect x="9" y="22" width="2" height="3" fill="#5a4028" />
      <rect x="10" y="24" width="1" height="2" fill="#3a2818" />
      {/* Arms — bare skinny forearms */}
      <rect x="2" y="13" width="2" height="6" fill="#d8c8a8" />
      <rect x="18" y="13" width="2" height="6" fill="#d8c8a8" />
      <rect x="2" y="13" width="1" height="6" fill="#a89878" />
      <rect x="19" y="13" width="1" height="6" fill="#a89878" />
      <rect x="2" y="19" width="2" height="3" fill="#b5a282" />
      <rect x="18" y="19" width="2" height="3" fill="#b5a282" />
      {/* Sacrificial dagger held aloft in the right hand */}
      <rect x="19" y="4" width="2" height="9" fill="#5a4028" />
      <polygon points="18,4 22,4 20,-1" fill="#b5a282" />
      <rect x="19" y="2" width="2" height="2" fill="#e8dcc4" />
      <rect x="18" y="13" width="4" height="1" fill="#3a2818" />
      {/* Off-hand grasping at the air */}
      <rect x="1" y="20" width="3" height="2" fill="#b5a282" />
      <rect x="0" y="21" width="1" height="1" fill="#3a2818" />
      {/* Robe lower half — torn hem */}
      <rect x="5" y="25" width="12" height="8" fill="#d8c8a8" />
      <rect x="5" y="25" width="12" height="1" fill="#a89878" />
      <polygon points="5,33 7,30 9,33" fill="#d8c8a8" />
      <polygon points="9,33 11,30 13,33" fill="#d8c8a8" />
      <polygon points="13,33 15,30 17,33" fill="#d8c8a8" />
      <rect x="7" y="32" width="1" height="1" fill="#a89878" />
      <rect x="11" y="32" width="1" height="1" fill="#a89878" />
      <rect x="15" y="32" width="1" height="1" fill="#a89878" />
      {/* Bare feet poking out */}
      <rect x="6" y="33" width="3" height="2" fill="#b5a282" />
      <rect x="13" y="33" width="3" height="2" fill="#b5a282" />
      <rect x="6" y="35" width="3" height="1" fill="#7a6848" />
      <rect x="13" y="35" width="3" height="1" fill="#7a6848" />
    </svg>
  );
}

function ShadowSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 22 36"
      shapeRendering="crispEdges"
      className={className}
      preserveAspectRatio="xMidYMax meet"
      aria-label="Shadow"
    >
      {/* Wisping head — tall and thin, fades at the top */}
      <rect x="9" y="2" width="4" height="6" fill="#1a0e1a" opacity="0.55" />
      <rect x="8" y="3" width="6" height="5" fill="#0a0610" />
      <rect x="9" y="2" width="4" height="1" fill="#0a0610" opacity="0.55" />
      <rect x="9" y="0" width="4" height="2" fill="#1a0e1a" opacity="0.25" />
      {/* Two pinpricks of dead light for eyes */}
      <rect x="9" y="5" width="1" height="1" fill="#7a82a0" />
      <rect x="12" y="5" width="1" height="1" fill="#7a82a0" />
      {/* Sloping shoulders that bleed into the body */}
      <polygon points="3,11 11,8 19,11 19,15 3,15" fill="#0a0610" />
      <polygon points="2,12 11,9 20,12 20,14 2,14" fill="#1a0e1a" opacity="0.4" />
      {/* Tall narrow body, edges feathered */}
      <rect x="5" y="14" width="12" height="14" fill="#0a0610" />
      <rect x="4" y="15" width="1" height="12" fill="#1a0e1a" opacity="0.5" />
      <rect x="17" y="15" width="1" height="12" fill="#1a0e1a" opacity="0.5" />
      <rect x="3" y="17" width="1" height="8" fill="#1a0e1a" opacity="0.3" />
      <rect x="18" y="17" width="1" height="8" fill="#1a0e1a" opacity="0.3" />
      {/* Faint inner glow — necrotic violet */}
      <rect x="9" y="16" width="4" height="6" fill="#3a1a4a" opacity="0.55" />
      <rect x="10" y="18" width="2" height="3" fill="#5a2a6a" opacity="0.5" />
      {/* Long reaching arms — left arm extended toward viewer */}
      <rect x="0" y="17" width="5" height="2" fill="#0a0610" />
      <rect x="0" y="17" width="5" height="1" fill="#1a0e1a" opacity="0.55" />
      <polygon points="0,17 -1,16 -1,20 0,19" fill="#1a0e1a" opacity="0.4" />
      {/* Long-fingered claw at the end of the left arm */}
      <rect x="-1" y="16" width="2" height="4" fill="#0a0610" />
      <polygon points="-1,16 -3,14 -1,17" fill="#0a0610" />
      <polygon points="-1,18 -3,20 -1,19" fill="#0a0610" />
      <polygon points="-1,20 -3,22 -1,21" fill="#0a0610" />
      {/* Right arm trailing back, less reach */}
      <rect x="17" y="18" width="4" height="2" fill="#0a0610" />
      <polygon points="21,18 23,20 21,20" fill="#0a0610" />
      {/* Body fading into a ground-bound trail (no feet) */}
      <polygon points="5,28 17,28 20,34 2,34" fill="#0a0610" />
      <polygon points="4,30 18,30 21,36 1,36" fill="#0a0610" opacity="0.7" />
      <polygon points="3,32 19,32 22,36 0,36" fill="#0a0610" opacity="0.4" />
      {/* Cold breath wisps trailing off the silhouette */}
      <rect x="6" y="10" width="1" height="2" fill="#7a82a0" opacity="0.35" />
      <rect x="15" y="11" width="1" height="2" fill="#7a82a0" opacity="0.35" />
      <rect x="8" y="22" width="1" height="2" fill="#7a82a0" opacity="0.25" />
      <rect x="13" y="24" width="1" height="2" fill="#7a82a0" opacity="0.25" />
    </svg>
  );
}

function CowledEnforcerSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 22 36"
      shapeRendering="crispEdges"
      className={className}
      preserveAspectRatio="xMidYMax meet"
      aria-label="Cowled Enforcer"
    >
      {/* Tall peaked hood */}
      <polygon points="8,0 11,-2 14,0 16,5 6,5" fill="#4a4858" />
      <polygon points="8,0 11,-2 14,0 15,3 7,3" fill="#2a2838" opacity="0.7" />
      {/* Hood draping past the shoulders */}
      <rect x="5" y="4" width="12" height="6" fill="#4a4858" />
      <rect x="4" y="6" width="1" height="5" fill="#2a2838" />
      <rect x="17" y="6" width="1" height="5" fill="#2a2838" />
      {/* Hood trim */}
      <rect x="5" y="4" width="12" height="1" fill="#7a7888" />
      {/* Silver featureless mask — full face plate */}
      <rect x="7" y="5" width="8" height="6" fill="#b5b5c8" />
      <rect x="7" y="5" width="8" height="1" fill="#e8e8f0" />
      <rect x="7" y="10" width="8" height="1" fill="#5a5a78" />
      <rect x="7" y="5" width="1" height="6" fill="#7a7a98" />
      <rect x="14" y="5" width="1" height="6" fill="#7a7a98" />
      {/* Two narrow eye slits — empty black */}
      <rect x="9" y="7" width="2" height="1" fill="#0a0a18" />
      <rect x="11" y="7" width="2" height="1" fill="#0a0a18" />
      {/* Faint engraved sigil on the forehead of the mask */}
      <rect x="10" y="6" width="2" height="1" fill="#7a7a98" opacity="0.7" />
      {/* High silver collar visible above the robe */}
      <rect x="6" y="11" width="10" height="2" fill="#b5b5c8" />
      <rect x="6" y="11" width="10" height="1" fill="#e8e8f0" />
      <rect x="6" y="12" width="10" height="1" fill="#5a5a78" />
      {/* Body robe — deep grey, formal cut */}
      <rect x="4" y="13" width="14" height="14" fill="#3a3848" />
      <rect x="4" y="13" width="14" height="1" fill="#5a5868" />
      {/* Vertical seam down center */}
      <rect x="10" y="13" width="2" height="14" fill="#2a2838" />
      {/* Silver buckle/clasp at sternum */}
      <rect x="10" y="16" width="2" height="2" fill="#b5b5c8" />
      <rect x="10" y="16" width="2" height="1" fill="#e8e8f0" />
      {/* Wide sleeves, draping inward */}
      <polygon points="4,13 0,18 0,24 4,22" fill="#3a3848" />
      <polygon points="18,13 22,18 22,24 18,22" fill="#3a3848" />
      <polygon points="4,13 1,18 4,18" fill="#2a2838" opacity="0.6" />
      <polygon points="18,13 21,18 18,18" fill="#2a2838" opacity="0.6" />
      {/* Sleeve cuffs */}
      <rect x="0" y="22" width="5" height="2" fill="#7a7888" />
      <rect x="17" y="22" width="5" height="2" fill="#7a7888" />
      {/* Right hand raised, casting — pale palm out */}
      <rect x="0" y="22" width="3" height="3" fill="#d8c4a8" />
      <rect x="0" y="22" width="3" height="1" fill="#a89878" />
      {/* Force-bolt orb building in the right hand — pale violet light */}
      <circle cx="1" cy="26" r="3" fill="#a48ee0" opacity="0.55" />
      <circle cx="1" cy="26" r="2" fill="#e8d4ff" opacity="0.75" />
      <circle cx="1" cy="26" r="1" fill="#ffffff" opacity="0.9" />
      {/* Left hand at the side, holding a staff casually */}
      <rect x="19" y="22" width="3" height="3" fill="#d8c4a8" />
      <rect x="19" y="22" width="3" height="1" fill="#a89878" />
      <rect x="21" y="2" width="1" height="32" fill="#3a2418" />
      <circle cx="21.5" cy="2" r="2" fill="#b5b5c8" />
      <circle cx="21.5" cy="2" r="1" fill="#e8e8f0" />
      {/* Belt sash */}
      <rect x="4" y="25" width="14" height="2" fill="#1a1828" />
      <rect x="4" y="25" width="14" height="1" fill="#3a3848" />
      {/* Lower robe — flowing down */}
      <rect x="5" y="27" width="12" height="7" fill="#3a3848" />
      <rect x="5" y="27" width="12" height="1" fill="#5a5868" />
      <polygon points="5,34 6,32 8,34" fill="#3a3848" />
      <polygon points="9,34 11,32 13,34" fill="#3a3848" />
      <polygon points="14,34 16,32 17,34" fill="#3a3848" />
      {/* Boots */}
      <rect x="6" y="33" width="3" height="3" fill="#1a1828" />
      <rect x="13" y="33" width="3" height="3" fill="#1a1828" />
      <rect x="6" y="35" width="3" height="1" fill="#0a0a18" />
      <rect x="13" y="35" width="3" height="1" fill="#0a0a18" />
    </svg>
  );
}

function SlaverCuirassierSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 22 36"
      shapeRendering="crispEdges"
      className={className}
      preserveAspectRatio="xMidYMax meet"
      aria-label="Slaver Cuirassier"
    >
      {/* Tall lacquered helm with brim */}
      <rect x="6" y="1" width="10" height="5" fill="#1a1410" />
      <rect x="6" y="0" width="10" height="2" fill="#0a0808" />
      <rect x="5" y="5" width="12" height="1" fill="#3a2418" />
      <rect x="6" y="1" width="10" height="1" fill="#3a3228" />
      {/* Red plume */}
      <rect x="10" y="-2" width="2" height="3" fill="#b5302c" />
      <polygon points="9,-2 11,-4 13,-2" fill="#8c1818" />
      {/* Face shadowed under brim, sun-bronzed */}
      <rect x="7" y="6" width="8" height="4" fill="#a87838" />
      <rect x="7" y="6" width="8" height="1" fill="#5a3c1c" />
      {/* Eyes — cold professional */}
      <rect x="8" y="7" width="2" height="1" fill="#1a1410" />
      <rect x="12" y="7" width="2" height="1" fill="#1a1410" />
      <rect x="8" y="7" width="1" height="1" fill="#e8dcc4" />
      <rect x="13" y="7" width="1" height="1" fill="#e8dcc4" />
      {/* Heavy brow */}
      <rect x="7" y="7" width="8" height="1" fill="#5a3c1c" opacity="0.55" />
      {/* Hard mouth, dark moustache */}
      <rect x="9" y="9" width="4" height="1" fill="#3a2010" />
      {/* Strong jaw */}
      <rect x="8" y="10" width="6" height="1" fill="#a87838" />
      {/* Red surcoat collar over the breastplate */}
      <polygon points="4,12 11,11 18,12 18,14 4,14" fill="#8c1818" />
      <polygon points="4,12 11,11 18,12 18,13 4,13" fill="#b5302c" opacity="0.6" />
      {/* Lacquered black pauldrons */}
      <rect x="2" y="11" width="4" height="5" fill="#0a0808" />
      <rect x="16" y="11" width="4" height="5" fill="#0a0808" />
      <rect x="3" y="12" width="2" height="3" fill="#3a3228" />
      <rect x="17" y="12" width="2" height="3" fill="#3a3228" />
      <rect x="2" y="11" width="4" height="1" fill="#5a5048" />
      <rect x="16" y="11" width="4" height="1" fill="#5a5048" />
      {/* Lacquered black breastplate */}
      <rect x="5" y="14" width="12" height="11" fill="#0a0808" />
      <rect x="5" y="14" width="12" height="1" fill="#5a5048" />
      <rect x="5" y="24" width="12" height="1" fill="#5a5048" />
      {/* Breastplate sheen */}
      <rect x="6" y="15" width="2" height="8" fill="#2a221c" opacity="0.7" />
      <rect x="14" y="15" width="2" height="8" fill="#2a221c" opacity="0.7" />
      {/* Twisted Coin sigil — gold disc on the chest */}
      <circle cx="11" cy="18" r="3" fill="#8c6232" />
      <circle cx="11" cy="18" r="2" fill="#d4a850" />
      <rect x="10" y="17" width="2" height="2" fill="#5a3c1c" />
      <rect x="11" y="16" width="1" height="3" fill="#8c6232" />
      {/* Arms in red sleeves with black bracers */}
      <rect x="3" y="15" width="3" height="6" fill="#8c1818" />
      <rect x="16" y="15" width="3" height="6" fill="#8c1818" />
      <rect x="3" y="20" width="3" height="3" fill="#0a0808" />
      <rect x="16" y="20" width="3" height="3" fill="#0a0808" />
      <rect x="3" y="20" width="3" height="1" fill="#5a5048" />
      <rect x="16" y="20" width="3" height="1" fill="#5a5048" />
      {/* Gauntlets */}
      <rect x="2" y="23" width="4" height="2" fill="#1a1410" />
      <rect x="16" y="23" width="4" height="2" fill="#1a1410" />
      {/* Heavy mace held at right hand, head down */}
      <rect x="17" y="23" width="2" height="9" fill="#3a2418" />
      <rect x="18" y="23" width="1" height="9" fill="#5a3c1c" />
      {/* Mace head — flanged at the bottom */}
      <rect x="15" y="31" width="6" height="4" fill="#3a3228" />
      <rect x="16" y="32" width="4" height="2" fill="#5a5048" />
      <polygon points="15,31 13,33 15,33" fill="#3a3228" />
      <polygon points="21,31 23,33 21,33" fill="#3a3228" />
      <polygon points="15,35 13,33 15,33" fill="#3a3228" />
      <polygon points="21,35 23,33 21,33" fill="#3a3228" />
      {/* Belt with chain coiled at left hip */}
      <rect x="4" y="25" width="14" height="2" fill="#1a1410" />
      <rect x="10" y="25" width="2" height="2" fill="#8c6232" />
      <circle cx="3" cy="26" r="1.5" fill="#5a5048" />
      <circle cx="3" cy="28" r="1.5" fill="#5a5048" />
      <circle cx="3" cy="26" r="0.6" fill="#1a1410" />
      <circle cx="3" cy="28" r="0.6" fill="#1a1410" />
      {/* Tasset skirt */}
      <rect x="5" y="27" width="12" height="3" fill="#0a0808" />
      <rect x="5" y="27" width="12" height="1" fill="#5a5048" />
      <rect x="7" y="28" width="1" height="2" fill="#3a3228" />
      <rect x="11" y="28" width="1" height="2" fill="#3a3228" />
      <rect x="14" y="28" width="1" height="2" fill="#3a3228" />
      {/* Legs in red breeches */}
      <rect x="6" y="30" width="4" height="3" fill="#8c1818" />
      <rect x="12" y="30" width="4" height="3" fill="#8c1818" />
      {/* Greaves */}
      <rect x="6" y="32" width="4" height="3" fill="#1a1410" />
      <rect x="12" y="32" width="4" height="3" fill="#1a1410" />
      <rect x="6" y="32" width="4" height="1" fill="#5a5048" />
      <rect x="12" y="32" width="4" height="1" fill="#5a5048" />
      {/* Boots */}
      <rect x="5" y="34" width="6" height="2" fill="#0a0808" />
      <rect x="11" y="34" width="6" height="2" fill="#0a0808" />
    </svg>
  );
}

function AthkatlaMagistrateSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 38"
      shapeRendering="crispEdges"
      className={className}
      preserveAspectRatio="xMidYMax meet"
      aria-label="The Magistrate"
    >
      {/* Tall four-pointed hat / mortarboard — Cowled magistrate's crown */}
      <polygon points="6,2 18,2 22,5 2,5" fill="#1a1828" />
      <polygon points="6,2 18,2 22,5 2,5" fill="#3a3848" opacity="0.5" />
      <rect x="9" y="0" width="6" height="3" fill="#1a1828" />
      <rect x="9" y="0" width="6" height="1" fill="#3a3848" />
      <rect x="11" y="-2" width="2" height="2" fill="#8c6232" />
      <circle cx="12" cy="-2" r="1.5" fill="#d4a850" />
      <circle cx="12" cy="-2" r="0.7" fill="#ffe890" />
      {/* Tassel hanging off one side */}
      <rect x="20" y="5" width="1" height="4" fill="#d4a850" />
      <rect x="20" y="9" width="2" height="1" fill="#d4a850" />
      <rect x="20" y="10" width="1" height="2" fill="#8c6232" />
      {/* Long thin face — late fifties */}
      <rect x="8" y="5" width="8" height="7" fill="#d8c4a8" />
      <rect x="8" y="5" width="8" height="1" fill="#a89878" />
      <rect x="8" y="11" width="8" height="1" fill="#a89878" />
      <rect x="7" y="6" width="1" height="6" fill="#a89878" />
      <rect x="16" y="6" width="1" height="6" fill="#a89878" />
      {/* Receding silver hair at temples visible behind the hat */}
      <rect x="6" y="6" width="2" height="2" fill="#b5b5c8" />
      <rect x="16" y="6" width="2" height="2" fill="#b5b5c8" />
      {/* Narrow cold eyes — pale grey */}
      <rect x="9" y="7" width="2" height="1" fill="#1a1410" />
      <rect x="13" y="7" width="2" height="1" fill="#1a1410" />
      <rect x="9" y="7" width="1" height="1" fill="#a8b8c8" />
      <rect x="14" y="7" width="1" height="1" fill="#a8b8c8" />
      {/* Heavy brow ridge */}
      <rect x="8" y="6" width="8" height="1" fill="#a89878" />
      {/* Sharp nose */}
      <rect x="11" y="8" width="2" height="2" fill="#a89878" />
      {/* Thin pressed-line mouth — no expression */}
      <rect x="10" y="10" width="4" height="1" fill="#3a2010" />
      {/* Silver Cowled-Wizard high collar */}
      <polygon points="4,12 12,11 20,12 21,15 3,15" fill="#b5b5c8" />
      <polygon points="4,12 12,11 20,12 20,13 4,13" fill="#e8e8f0" />
      {/* Magistrate's seal of office on a chain */}
      <line x1="9" y1="13" x2="12" y2="17" stroke="#d4a850" strokeWidth="0.6" />
      <line x1="15" y1="13" x2="12" y2="17" stroke="#d4a850" strokeWidth="0.6" />
      <rect x="11" y="17" width="3" height="3" fill="#d4a850" />
      <rect x="11" y="17" width="3" height="1" fill="#ffe890" />
      <rect x="12" y="18" width="1" height="1" fill="#5a3c1c" />
      {/* Magistrate's robe — deep midnight blue with silver trim */}
      <rect x="4" y="13" width="16" height="15" fill="#1a2050" />
      <rect x="4" y="13" width="16" height="1" fill="#3a4080" />
      <rect x="4" y="27" width="16" height="1" fill="#0a0a28" />
      {/* Center robe seam */}
      <rect x="11" y="13" width="2" height="15" fill="#0a0a28" />
      {/* Embroidered silver runes down the seam */}
      <rect x="11" y="15" width="2" height="1" fill="#b5b5c8" />
      <rect x="11" y="18" width="2" height="1" fill="#b5b5c8" />
      <rect x="11" y="21" width="2" height="1" fill="#b5b5c8" />
      <rect x="11" y="24" width="2" height="1" fill="#b5b5c8" />
      {/* Pauldron-like robe shoulders */}
      <rect x="3" y="13" width="2" height="5" fill="#0a0a28" />
      <rect x="19" y="13" width="2" height="5" fill="#0a0a28" />
      {/* Wide sleeves draping to the elbow then narrowing */}
      <polygon points="3,15 0,20 0,26 4,22" fill="#1a2050" />
      <polygon points="21,15 24,20 24,26 20,22" fill="#1a2050" />
      <polygon points="3,15 1,20 3,20" fill="#0a0a28" opacity="0.5" />
      <polygon points="21,15 23,20 21,20" fill="#0a0a28" opacity="0.5" />
      {/* Silver trim at the sleeve mouth */}
      <rect x="0" y="24" width="5" height="1" fill="#b5b5c8" />
      <rect x="19" y="24" width="5" height="1" fill="#b5b5c8" />
      <rect x="0" y="25" width="5" height="1" fill="#7a7a98" />
      <rect x="19" y="25" width="5" height="1" fill="#7a7a98" />
      {/* Right gloved hand raised — palm out, mid-cast */}
      <rect x="0" y="20" width="3" height="3" fill="#1a1410" />
      <rect x="-1" y="20" width="1" height="3" fill="#1a1410" />
      <polygon points="0,20 -2,18 -1,21" fill="#1a1410" />
      <polygon points="0,23 -2,25 -1,22" fill="#1a1410" />
      {/* Hold Person glyph — a hollow silver ring forming over the open palm */}
      <circle cx="-1" cy="21" r="3.5" fill="none" stroke="#b5b5c8" strokeWidth="0.6" opacity="0.85" />
      <circle cx="-1" cy="21" r="2.5" fill="none" stroke="#e8e8f0" strokeWidth="0.4" opacity="0.85" />
      <circle cx="-1" cy="21" r="1.2" fill="#b5b5c8" opacity="0.55" />
      <rect x="-3" y="21" width="4" height="0.5" fill="#e8e8f0" opacity="0.7" />
      <rect x="-1" y="19" width="0.5" height="4" fill="#e8e8f0" opacity="0.7" />
      {/* Left gloved hand at the side — holding a rolled warrant scroll */}
      <rect x="21" y="22" width="3" height="3" fill="#1a1410" />
      <rect x="21" y="22" width="1" height="2" fill="#e8dcc4" />
      <rect x="22" y="23" width="2" height="1" fill="#d4a850" />
      {/* Belt sash with silver clasp */}
      <rect x="4" y="25" width="16" height="2" fill="#0a0a28" />
      <rect x="11" y="25" width="2" height="2" fill="#b5b5c8" />
      <rect x="11" y="25" width="2" height="1" fill="#e8e8f0" />
      {/* Lower robe flaring out */}
      <polygon points="4,28 20,28 22,35 2,35" fill="#1a2050" />
      <polygon points="4,28 20,28 22,30 2,30" fill="#3a4080" opacity="0.4" />
      <rect x="11" y="28" width="2" height="7" fill="#0a0a28" />
      {/* Silver hem */}
      <rect x="2" y="34" width="20" height="1" fill="#b5b5c8" />
      <polygon points="2,35 5,33 8,35" fill="#1a2050" />
      <polygon points="8,35 11,33 14,35" fill="#1a2050" />
      <polygon points="14,35 17,33 20,35" fill="#1a2050" />
      {/* Black formal boots barely peeking out */}
      <rect x="9" y="35" width="2" height="2" fill="#0a0808" />
      <rect x="13" y="35" width="2" height="2" fill="#0a0808" />
      {/* Faint ambient mage-glow at the feet */}
      <ellipse cx="12" cy="37" rx="11" ry="1" fill="#3a4080" opacity="0.25" />
    </svg>
  );
}

function StirgeSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 22 22"
      shapeRendering="crispEdges"
      className={className}
      preserveAspectRatio="xMidYMax meet"
      aria-label="Stirge"
    >
      {/* Bat wings spread wide */}
      <polygon points="0,7 5,3 7,10 5,12" fill="#5a3818" />
      <polygon points="22,7 17,3 15,10 17,12" fill="#5a3818" />
      <polygon points="1,8 4,5 5,10" fill="#7a5028" opacity="0.6" />
      <polygon points="21,8 18,5 17,10" fill="#7a5028" opacity="0.6" />
      {/* Wing bones */}
      <line x1="2" y1="5" x2="6" y2="11" stroke="#1a1410" strokeWidth="0.4" />
      <line x1="20" y1="5" x2="16" y2="11" stroke="#1a1410" strokeWidth="0.4" />
      {/* Bulbous insect body */}
      <ellipse cx="11" cy="9" rx="4" ry="3" fill="#3a2418" />
      <ellipse cx="11" cy="8" rx="3" ry="2" fill="#5a3818" />
      {/* Body segmentation */}
      <rect x="8" y="9" width="6" height="1" fill="#1a1410" />
      <rect x="9" y="11" width="4" height="1" fill="#1a1410" />
      {/* Tiny compound eyes (clustered) */}
      <rect x="8" y="6" width="2" height="2" fill="#1a1410" />
      <rect x="12" y="6" width="2" height="2" fill="#1a1410" />
      <rect x="9" y="6" width="1" height="1" fill="#b5302c" />
      <rect x="12" y="6" width="1" height="1" fill="#b5302c" />
      {/* Long needle proboscis */}
      <rect x="10" y="11" width="2" height="2" fill="#3a2418" />
      <rect x="10" y="13" width="2" height="1" fill="#5a3818" />
      <rect x="10" y="14" width="1" height="7" fill="#a89878" />
      <rect x="10" y="14" width="1" height="2" fill="#d4c8a8" />
      {/* Tiny clawed legs tucked up */}
      <rect x="7" y="11" width="1" height="2" fill="#1a1410" />
      <rect x="14" y="11" width="1" height="2" fill="#1a1410" />
      <rect x="6" y="13" width="1" height="1" fill="#1a1410" />
      <rect x="15" y="13" width="1" height="1" fill="#1a1410" />
      {/* Antennae */}
      <rect x="9" y="4" width="1" height="2" fill="#1a1410" />
      <rect x="12" y="4" width="1" height="2" fill="#1a1410" />
      <rect x="8" y="3" width="1" height="1" fill="#1a1410" />
      <rect x="13" y="3" width="1" height="1" fill="#1a1410" />
    </svg>
  );
}

function GhoulSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 22 34"
      shapeRendering="crispEdges"
      className={className}
      preserveAspectRatio="xMidYMax meet"
      aria-label="Ghoul"
    >
      {/* Patches of scalp — tufts of hair on a bald skull */}
      <rect x="7" y="1" width="1" height="2" fill="#2a1a10" />
      <rect x="11" y="0" width="2" height="2" fill="#2a1a10" />
      <rect x="14" y="2" width="1" height="1" fill="#2a1a10" />
      {/* Gaunt elongated head — grey-green flesh stretched on bone */}
      <rect x="6" y="2" width="10" height="9" fill="#8a8a78" />
      <rect x="6" y="2" width="10" height="1" fill="#6a6a58" />
      <rect x="5" y="4" width="1" height="5" fill="#6a6a58" />
      <rect x="16" y="4" width="1" height="5" fill="#6a6a58" />
      {/* Hollowed cheeks — shadow streaks */}
      <rect x="6" y="7" width="2" height="2" fill="#5a5a48" />
      <rect x="14" y="7" width="2" height="2" fill="#5a5a48" />
      {/* Sunken black sockets */}
      <rect x="7" y="4" width="3" height="3" fill="#0a0a08" />
      <rect x="12" y="4" width="3" height="3" fill="#0a0a08" />
      {/* Tiny pin-point eyes — sickly yellow */}
      <rect x="8" y="5" width="1" height="1" fill="#c4a430" />
      <rect x="13" y="5" width="1" height="1" fill="#c4a430" />
      {/* Slit nose — two dark holes */}
      <rect x="10" y="7" width="1" height="1" fill="#1a1410" />
      <rect x="11" y="7" width="1" height="1" fill="#1a1410" />
      {/* Distended jaw — unhinged from too many bites */}
      <rect x="6" y="9" width="10" height="3" fill="#1a1410" />
      <rect x="7" y="9" width="1" height="2" fill="#d4c8a8" />
      <rect x="9" y="9" width="1" height="3" fill="#d4c8a8" />
      <rect x="11" y="9" width="1" height="2" fill="#d4c8a8" />
      <rect x="13" y="9" width="1" height="3" fill="#d4c8a8" />
      {/* Bottom row of fangs */}
      <rect x="8" y="11" width="1" height="1" fill="#d4c8a8" />
      <rect x="10" y="11" width="1" height="1" fill="#d4c8a8" />
      <rect x="12" y="11" width="1" height="1" fill="#d4c8a8" />
      {/* Drool */}
      <rect x="9" y="12" width="1" height="2" fill="#a8c478" opacity="0.7" />
      {/* Bony neck */}
      <rect x="9" y="11" width="4" height="2" fill="#6a6a58" />
      {/* Skeletal shoulders */}
      <rect x="3" y="13" width="16" height="2" fill="#8a8a78" />
      <rect x="3" y="13" width="3" height="2" fill="#6a6a58" />
      <rect x="16" y="13" width="3" height="2" fill="#6a6a58" />
      {/* Rope-tight torso, ribcage showing through */}
      <rect x="5" y="15" width="12" height="9" fill="#8a8a78" />
      <rect x="6" y="16" width="10" height="1" fill="#6a6a58" />
      <rect x="6" y="18" width="10" height="1" fill="#6a6a58" />
      <rect x="6" y="20" width="10" height="1" fill="#6a6a58" />
      {/* Sternum shadow */}
      <rect x="10" y="15" width="2" height="9" fill="#5a5a48" />
      {/* Tattered shroud strap */}
      <rect x="5" y="17" width="12" height="1" fill="#3a2e22" />
      {/* Spindly arms */}
      <rect x="2" y="15" width="3" height="9" fill="#8a8a78" />
      <rect x="17" y="15" width="3" height="9" fill="#8a8a78" />
      <rect x="2" y="15" width="1" height="9" fill="#6a6a58" />
      <rect x="19" y="15" width="1" height="9" fill="#6a6a58" />
      {/* Skeletal arm hints */}
      <rect x="3" y="17" width="1" height="1" fill="#5a5a48" />
      <rect x="18" y="19" width="1" height="1" fill="#5a5a48" />
      {/* Splayed clawed hands */}
      <rect x="1" y="23" width="4" height="2" fill="#8a8a78" />
      <rect x="17" y="23" width="4" height="2" fill="#8a8a78" />
      {/* Long curving claws */}
      <polygon points="1,25 0,28 2,26" fill="#3a3228" />
      <polygon points="3,25 2,28 4,26" fill="#3a3228" />
      <polygon points="5,25 5,28 6,26" fill="#3a3228" />
      <polygon points="17,25 16,26 18,28" fill="#3a3228" />
      <polygon points="19,25 18,26 20,28" fill="#3a3228" />
      <polygon points="21,25 20,26 21,28" fill="#3a3228" />
      {/* Tattered loincloth */}
      <rect x="5" y="24" width="12" height="3" fill="#3a2e22" />
      <rect x="6" y="26" width="1" height="2" fill="#3a2e22" />
      <rect x="9" y="26" width="1" height="3" fill="#3a2e22" />
      <rect x="13" y="26" width="1" height="2" fill="#3a2e22" />
      {/* Stick-thin legs */}
      <rect x="6" y="27" width="3" height="5" fill="#8a8a78" />
      <rect x="13" y="27" width="3" height="5" fill="#8a8a78" />
      <rect x="6" y="27" width="1" height="5" fill="#6a6a58" />
      <rect x="15" y="27" width="1" height="5" fill="#6a6a58" />
      {/* Knee bulge */}
      <rect x="6" y="29" width="3" height="1" fill="#5a5a48" />
      <rect x="13" y="29" width="3" height="1" fill="#5a5a48" />
      {/* Splayed clawed feet */}
      <rect x="5" y="32" width="5" height="2" fill="#8a8a78" />
      <rect x="12" y="32" width="5" height="2" fill="#8a8a78" />
      <polygon points="5,34 4,33 6,34" fill="#3a3228" />
      <polygon points="9,34 9,33 11,34" fill="#3a3228" />
      <polygon points="13,34 12,33 14,34" fill="#3a3228" />
      <polygon points="17,34 16,33 18,34" fill="#3a3228" />
    </svg>
  );
}

function HobgoblinSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 22 36"
      shapeRendering="crispEdges"
      className={className}
      preserveAspectRatio="xMidYMax meet"
      aria-label="Hobgoblin Soldier"
    >
      {/* Helm comb / ridge */}
      <rect x="9" y="0" width="4" height="1" fill="#1a1410" />
      <rect x="10" y="-1" width="2" height="1" fill="#1a1410" />
      {/* Black-iron helm */}
      <rect x="6" y="1" width="10" height="4" fill="#3a3228" />
      <rect x="5" y="2" width="1" height="3" fill="#1a1410" />
      <rect x="16" y="2" width="1" height="3" fill="#1a1410" />
      <rect x="6" y="1" width="10" height="1" fill="#5a5048" />
      {/* Cheek-pieces flanking the face */}
      <rect x="6" y="5" width="2" height="3" fill="#3a3228" />
      <rect x="14" y="5" width="2" height="3" fill="#3a3228" />
      {/* Burnt-orange face */}
      <rect x="8" y="5" width="6" height="5" fill="#c46a2a" />
      <rect x="8" y="5" width="6" height="1" fill="#9c4a18" />
      {/* Pointed ears poking past the cheek-pieces */}
      <rect x="4" y="3" width="2" height="2" fill="#c46a2a" />
      <rect x="16" y="3" width="2" height="2" fill="#c46a2a" />
      <rect x="3" y="4" width="1" height="1" fill="#9c4a18" />
      <rect x="18" y="4" width="1" height="1" fill="#9c4a18" />
      {/* Disciplined narrow eyes — amber */}
      <rect x="8" y="6" width="2" height="1" fill="#1a1410" />
      <rect x="12" y="6" width="2" height="1" fill="#1a1410" />
      <rect x="8" y="6" width="1" height="1" fill="#f4a02a" />
      <rect x="13" y="6" width="1" height="1" fill="#f4a02a" />
      {/* Strong nose */}
      <rect x="10" y="7" width="2" height="2" fill="#9c4a18" />
      {/* Hard set mouth — no snarl, no smile */}
      <rect x="9" y="9" width="4" height="1" fill="#1a1410" />
      <rect x="9" y="9" width="1" height="1" fill="#e8dcc4" />
      <rect x="12" y="9" width="1" height="1" fill="#e8dcc4" />
      {/* Chin */}
      <rect x="9" y="10" width="4" height="1" fill="#9c4a18" />
      {/* Black-iron pauldrons */}
      <rect x="2" y="11" width="4" height="4" fill="#1a1410" />
      <rect x="16" y="11" width="4" height="4" fill="#1a1410" />
      <rect x="3" y="12" width="2" height="2" fill="#5a5048" />
      <rect x="17" y="12" width="2" height="2" fill="#5a5048" />
      {/* Half-plate breastplate */}
      <rect x="5" y="11" width="12" height="11" fill="#3a3228" />
      <rect x="6" y="12" width="10" height="9" fill="#2a221c" />
      {/* Plate trim */}
      <rect x="5" y="11" width="12" height="1" fill="#5a5048" />
      <rect x="5" y="21" width="12" height="1" fill="#5a5048" />
      {/* Center groove */}
      <rect x="10" y="12" width="2" height="9" fill="#5a5048" />
      {/* Regimental sash diagonal — burnt orange */}
      <polygon points="6,15 8,11 9,11 7,15" fill="#9c4a18" />
      {/* Brass insignia on chest */}
      <rect x="9" y="15" width="4" height="3" fill="#8c6232" />
      <rect x="10" y="16" width="2" height="1" fill="#1a1410" />
      {/* Belt */}
      <rect x="4" y="22" width="14" height="2" fill="#1a1410" />
      <rect x="10" y="22" width="2" height="2" fill="#8c6232" />
      {/* Arms — orange skin, faulds at shoulder */}
      <rect x="3" y="15" width="3" height="7" fill="#c46a2a" />
      <rect x="16" y="15" width="3" height="7" fill="#c46a2a" />
      <rect x="3" y="15" width="1" height="7" fill="#9c4a18" />
      <rect x="18" y="15" width="1" height="7" fill="#9c4a18" />
      {/* Iron vambraces */}
      <rect x="3" y="19" width="3" height="3" fill="#3a3228" />
      <rect x="16" y="19" width="3" height="3" fill="#3a3228" />
      <rect x="3" y="19" width="3" height="1" fill="#5a5048" />
      <rect x="16" y="19" width="3" height="1" fill="#5a5048" />
      {/* Gauntlets */}
      <rect x="2" y="22" width="4" height="2" fill="#1a1410" />
      <rect x="16" y="22" width="4" height="2" fill="#1a1410" />
      {/* Longsword — held vertical at the right hip, parade-ready */}
      <rect x="18" y="3" width="2" height="20" fill="#b5a282" />
      <rect x="19" y="3" width="1" height="20" fill="#e8dcc4" />
      <rect x="17" y="22" width="4" height="1" fill="#5a4030" />
      <rect x="18" y="22" width="2" height="3" fill="#3a2418" />
      <rect x="19" y="2" width="1" height="1" fill="#8c6232" />
      {/* Skirt of tassets */}
      <rect x="5" y="24" width="12" height="3" fill="#3a3228" />
      <rect x="5" y="24" width="12" height="1" fill="#5a5048" />
      <rect x="7" y="25" width="1" height="2" fill="#1a1410" />
      <rect x="11" y="25" width="1" height="2" fill="#1a1410" />
      <rect x="14" y="25" width="1" height="2" fill="#1a1410" />
      {/* Legs — orange skin under iron greaves */}
      <rect x="6" y="27" width="4" height="6" fill="#c46a2a" />
      <rect x="12" y="27" width="4" height="6" fill="#c46a2a" />
      {/* Greaves over the lower leg */}
      <rect x="6" y="30" width="4" height="3" fill="#3a3228" />
      <rect x="12" y="30" width="4" height="3" fill="#3a3228" />
      <rect x="6" y="30" width="4" height="1" fill="#5a5048" />
      <rect x="12" y="30" width="4" height="1" fill="#5a5048" />
      {/* Iron boots */}
      <rect x="5" y="33" width="6" height="3" fill="#1a1410" />
      <rect x="11" y="33" width="6" height="3" fill="#1a1410" />
      <rect x="5" y="35" width="6" height="1" fill="#3a3228" />
      <rect x="11" y="35" width="6" height="1" fill="#3a3228" />
    </svg>
  );
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
