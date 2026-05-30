/**
 * Chapter-keyed camp illustration. Each of the five camp seams in the
 * six-chapter run sits in a different world, so we author one scene per
 * chapter rather than reusing a single fire. The `chapter` prop is the
 * RoomSpec.chapter value (1–5) set by campNode in createDelve.
 *
 * Chapter thematic map:
 *   1 → roadside fire on the Trade Way (Iron Cells → Athkatla)
 *   2 → harbour lamp on the Athkatla docks (Athkatla → Asylum)
 *   3 → smokeless chemical-fire in the Upperdark (Asylum → Underdark)
 *   4 → cold fire at the edge of the upwelling light (Underdark → Godwake)
 *   5 → guttering coals before the Wheel (Godwake → Beyond)
 */
export function CampScene({ chapter }: { chapter: number | undefined }) {
  if (chapter === 2) return <HarbourLampScene />;
  if (chapter === 3) return <SmugglerFireScene />;
  if (chapter === 4) return <EdgeOfLightScene />;
  if (chapter === 5) return <StillnessBeforeWheelScene />;
  return <RoadsideFireScene />;
}

const SCENE_CLASS = 'w-full max-w-md drop-shadow-[0_0_18px_rgba(244,167,66,0.4)]';

/** Camp 1 — a roadside fire on the Trade Way, the road bending south to Amn. */
function RoadsideFireScene() {
  return (
    <svg
      viewBox="0 0 320 140"
      className={SCENE_CLASS}
      role="img"
      aria-label="A roadside fire under a dusk sky, the road bending south."
    >
      <defs>
        <radialGradient id="camp-fire-glow" cx="0.5" cy="0.65" r="0.6">
          <stop offset="0%" stopColor="#ffd76a" stopOpacity="0.95" />
          <stop offset="50%" stopColor="#f4a742" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#f4a742" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="camp-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a1322" />
          <stop offset="55%" stopColor="#3a1f1c" />
          <stop offset="100%" stopColor="#5a2a1a" />
        </linearGradient>
        <linearGradient id="camp-road" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a2a20" />
          <stop offset="100%" stopColor="#1a1208" />
        </linearGradient>
      </defs>
      {/* Sky */}
      <rect x="0" y="0" width="320" height="90" fill="url(#camp-sky)" />
      {/* Stars */}
      <circle cx="40" cy="18" r="0.8" fill="#fff8d0" />
      <circle cx="80" cy="30" r="0.6" fill="#fff8d0" opacity="0.7" />
      <circle cx="230" cy="14" r="0.9" fill="#fff8d0" />
      <circle cx="280" cy="32" r="0.6" fill="#fff8d0" opacity="0.7" />
      {/* Distant southern hills */}
      <path d="M0 78 L 60 60 L 110 70 L 170 56 L 230 68 L 320 58 L 320 90 L 0 90 Z" fill="#1a1018" />
      {/* Road bending south */}
      <path
        d="M 0 130 L 110 100 L 170 92 L 220 90 L 320 95 L 320 140 L 0 140 Z"
        fill="url(#camp-road)"
      />
      {/* Milestone */}
      <rect x="195" y="80" width="6" height="14" fill="#3a2a20" stroke="#1a1208" strokeWidth="0.5" />
      <rect x="193" y="79" width="10" height="3" fill="#5a4030" />
      {/* Cart silhouette */}
      <rect x="230" y="80" width="40" height="14" fill="#2a1a10" stroke="#1a1208" strokeWidth="0.5" />
      <rect x="234" y="76" width="32" height="6" fill="#3a2418" />
      <circle cx="238" cy="96" r="4" fill="#1a1208" stroke="#3a2418" strokeWidth="0.5" />
      <circle cx="262" cy="96" r="4" fill="#1a1208" stroke="#3a2418" strokeWidth="0.5" />
      {/* Tarp pegs lines */}
      <line x1="270" y1="80" x2="285" y2="92" stroke="#3a2418" strokeWidth="0.5" />
      {/* Fire glow */}
      <ellipse cx="100" cy="110" rx="55" ry="22" fill="url(#camp-fire-glow)" />
      {/* Fire logs */}
      <rect x="86" y="108" width="28" height="3" fill="#3a2418" />
      <rect x="92" y="112" width="22" height="3" fill="#2a1a10" />
      {/* Fire flames */}
      <path d="M 92 108 Q 96 96 100 108 Q 104 90 108 108 Z" fill="#ffd76a" opacity="0.9" />
      <path d="M 95 108 Q 100 102 105 108 Z" fill="#fff8d0" opacity="0.85" />
      {/* Sitting figure silhouette */}
      <ellipse cx="65" cy="106" rx="6" ry="3" fill="#1a1208" />
      <rect x="62" y="98" width="6" height="8" fill="#1a1208" />
      <circle cx="65" cy="95" r="3" fill="#1a1208" />
      {/* Ox silhouette (unhitched) */}
      <rect x="280" y="100" width="22" height="9" fill="#1a1208" />
      <rect x="280" y="108" width="3" height="6" fill="#1a1208" />
      <rect x="299" y="108" width="3" height="6" fill="#1a1208" />
      <rect x="298" y="96" width="6" height="6" fill="#1a1208" />
    </svg>
  );
}

/** Camp 2 — a harbour-lamp at the end of an Athkatla jetty, a wherry alongside. */
function HarbourLampScene() {
  return (
    <svg
      viewBox="0 0 320 140"
      className={SCENE_CLASS}
      role="img"
      aria-label="A lamp on a coil of rope at the end of a jetty, the gilded towers of Athkatla across dark water, a smuggler's wherry tied alongside."
    >
      <defs>
        <radialGradient id="harbour-lamp-glow" cx="0.5" cy="0.5" r="0.6">
          <stop offset="0%" stopColor="#ffd76a" stopOpacity="0.95" />
          <stop offset="50%" stopColor="#f4a742" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#f4a742" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="harbour-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#171430" />
          <stop offset="55%" stopColor="#3a2440" />
          <stop offset="100%" stopColor="#7a4422" />
        </linearGradient>
        <linearGradient id="harbour-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a2418" />
          <stop offset="100%" stopColor="#100c08" />
        </linearGradient>
        <linearGradient id="harbour-deck" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a2a1c" />
          <stop offset="100%" stopColor="#160f08" />
        </linearGradient>
      </defs>
      {/* Sky */}
      <rect x="0" y="0" width="320" height="86" fill="url(#harbour-sky)" />
      {/* Stars */}
      <circle cx="48" cy="16" r="0.8" fill="#fff8d0" />
      <circle cx="120" cy="24" r="0.6" fill="#fff8d0" opacity="0.7" />
      <circle cx="250" cy="12" r="0.9" fill="#fff8d0" />
      {/* City skyline across the water — domes and spires of Athkatla */}
      <g fill="#241a2e">
        <rect x="0" y="66" width="320" height="20" />
        <rect x="22" y="54" width="26" height="14" />
        <rect x="120" y="50" width="30" height="18" />
        <rect x="250" y="56" width="34" height="12" />
      </g>
      {/* Gilded dome (the Great Dome) */}
      <path d="M 70 66 Q 92 38 114 66 Z" fill="#6a4a1e" stroke="#2a1808" strokeWidth="0.5" />
      <path d="M 80 60 Q 92 44 104 60" fill="none" stroke="#c8902a" strokeWidth="1" opacity="0.6" />
      <rect x="90" y="32" width="4" height="8" fill="#5a3a14" />
      <polygon points="90,32 92,26 94,32" fill="#ffd76a" />
      {/* Distant lit windows */}
      <g fill="#ffd76a" opacity="0.6">
        <rect x="28" y="58" width="2" height="3" />
        <rect x="40" y="58" width="2" height="3" />
        <rect x="128" y="56" width="2" height="3" />
        <rect x="140" y="56" width="2" height="3" />
        <rect x="258" y="60" width="2" height="3" />
        <rect x="272" y="60" width="2" height="3" />
      </g>
      {/* Sea band */}
      <rect x="0" y="86" width="320" height="54" fill="url(#harbour-sea)" />
      {/* Lamp reflection on the water */}
      <ellipse cx="232" cy="108" rx="10" ry="20" fill="#ffd76a" opacity="0.18" />
      {/* Faint swell highlights */}
      <g fill="#9a7a4a" opacity="0.3">
        <rect x="40" y="96" width="22" height="1" />
        <rect x="120" y="100" width="28" height="1" />
        <rect x="60" y="110" width="20" height="1" />
      </g>
      {/* The jetty deck — foreground planks */}
      <rect x="0" y="116" width="320" height="24" fill="url(#harbour-deck)" />
      <g stroke="#160f08" strokeWidth="1" opacity="0.7">
        <line x1="40" y1="116" x2="40" y2="140" />
        <line x1="96" y1="116" x2="96" y2="140" />
        <line x1="152" y1="116" x2="152" y2="140" />
        <line x1="208" y1="116" x2="208" y2="140" />
        <line x1="264" y1="116" x2="264" y2="140" />
      </g>
      {/* A smuggler's wherry tied alongside, hull ticking against the boards */}
      <path d="M 4 110 Q 60 96 130 110 L 122 120 L 16 120 Z" fill="#2a1a10" stroke="#160f08" strokeWidth="0.5" />
      <line x1="64" y1="100" x2="64" y2="80" stroke="#3a2418" strokeWidth="1.5" />
      <polygon points="64,82 64,100 88,100" fill="#3a2418" opacity="0.85" />
      {/* Mooring post + rope */}
      <rect x="150" y="104" width="6" height="14" fill="#3a2418" />
      <path d="M 153 110 Q 180 116 208 112" fill="none" stroke="#5a4030" strokeWidth="1" />
      {/* Coil of rope with the lamp set on it */}
      <ellipse cx="232" cy="118" rx="14" ry="5" fill="#3a2a1c" />
      <ellipse cx="232" cy="116" rx="10" ry="3.5" fill="#2a1d12" />
      {/* Lamp glow */}
      <ellipse cx="232" cy="104" rx="40" ry="34" fill="url(#harbour-lamp-glow)" />
      {/* The lamp itself */}
      <rect x="228" y="96" width="8" height="12" fill="#2a1a10" stroke="#160f08" strokeWidth="0.5" />
      <rect x="229" y="98" width="6" height="8" fill="#ffd76a" opacity="0.95" />
      <rect x="230" y="90" width="4" height="6" fill="#3a2418" />
      <circle cx="232" cy="90" r="2" fill="#3a2418" />
      {/* Merchant figure beside the lamp, kettle in hand */}
      <ellipse cx="270" cy="120" rx="6" ry="3" fill="#160f08" />
      <rect x="266" y="104" width="8" height="16" fill="#160f08" />
      <circle cx="270" cy="100" r="3.5" fill="#160f08" />
      <rect x="258" y="112" width="6" height="5" fill="#160f08" />
    </svg>
  );
}

/** Camp 3 — a smokeless chemical-fire in a brass bowl, deep in the Upperdark. */
function SmugglerFireScene() {
  return (
    <svg
      viewBox="0 0 320 140"
      className={SCENE_CLASS}
      role="img"
      aria-label="A smokeless chemical-fire in a brass bowl lighting a smuggler's cache in an Underdark cavern, stalactites overhead."
    >
      <defs>
        <radialGradient id="under-fire-glow" cx="0.5" cy="0.6" r="0.6">
          <stop offset="0%" stopColor="#ffd76a" stopOpacity="0.95" />
          <stop offset="45%" stopColor="#f4a742" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#f4a742" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="cavern-dark" cx="0.5" cy="0.55" r="0.75">
          <stop offset="0%" stopColor="#241a16" />
          <stop offset="100%" stopColor="#0c0808" />
        </radialGradient>
        <linearGradient id="cavern-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a1d14" />
          <stop offset="100%" stopColor="#100a08" />
        </linearGradient>
      </defs>
      {/* Cavern void */}
      <rect x="0" y="0" width="320" height="140" fill="url(#cavern-dark)" />
      {/* Rock ceiling */}
      <path d="M0 0 L 320 0 L 320 18 Q 280 30 240 16 Q 200 4 160 20 Q 120 34 80 18 Q 40 4 0 20 Z" fill="#1a1310" />
      {/* Stalactites */}
      <g fill="#1a1310">
        <polygon points="56,18 60,18 58,40" />
        <polygon points="132,22 138,22 135,48" />
        <polygon points="214,16 218,16 216,38" />
        <polygon points="276,22 280,22 278,44" />
      </g>
      {/* Faint faerzress specks on the far wall (cool, kept subordinate to the warm fire) */}
      <g fill="#5a8a7a" opacity="0.35">
        <circle cx="44" cy="52" r="0.8" />
        <circle cx="290" cy="58" r="0.8" />
        <circle cx="300" cy="46" r="0.6" />
      </g>
      {/* Cavern floor */}
      <path d="M 0 110 Q 80 100 160 106 Q 240 112 320 102 L 320 140 L 0 140 Z" fill="url(#cavern-floor)" />
      {/* Smuggler's cache — crates stacked, goods to move down */}
      <rect x="40" y="92" width="26" height="22" fill="#2a1d12" stroke="#120c08" strokeWidth="0.5" />
      <rect x="40" y="92" width="26" height="3" fill="#3a2a1c" />
      <line x1="53" y1="92" x2="53" y2="114" stroke="#120c08" strokeWidth="0.5" />
      <rect x="50" y="78" width="22" height="14" fill="#2a1d12" stroke="#120c08" strokeWidth="0.5" />
      <rect x="50" y="78" width="22" height="3" fill="#3a2a1c" />
      {/* A sealed cask beside the crates */}
      <ellipse cx="80" cy="112" rx="8" ry="3" fill="#1a120c" />
      <rect x="72" y="98" width="16" height="14" fill="#2a1d12" stroke="#120c08" strokeWidth="0.5" />
      <rect x="72" y="103" width="16" height="2" fill="#3a2a1c" />
      {/* Fire glow from the brass bowl */}
      <ellipse cx="190" cy="108" rx="62" ry="30" fill="url(#under-fire-glow)" />
      {/* Tripod stand */}
      <line x1="178" y1="118" x2="190" y2="100" stroke="#3a2a1c" strokeWidth="2" />
      <line x1="202" y1="118" x2="190" y2="100" stroke="#3a2a1c" strokeWidth="2" />
      <line x1="190" y1="120" x2="190" y2="100" stroke="#3a2a1c" strokeWidth="2" />
      {/* Brass bowl */}
      <path d="M 174 100 Q 190 112 206 100 Z" fill="#7a5a24" stroke="#3a2a14" strokeWidth="0.5" />
      <ellipse cx="190" cy="100" rx="16" ry="3.5" fill="#9a7430" />
      {/* Smokeless flame — warm core with a faint chemical-green lick */}
      <path d="M 182 100 Q 186 86 190 100 Q 194 84 198 100 Z" fill="#ffd76a" opacity="0.92" />
      <path d="M 185 100 Q 190 92 195 100 Z" fill="#fff8d0" opacity="0.85" />
      <path d="M 188 100 Q 190 90 192 100 Z" fill="#9fe0b0" opacity="0.45" />
      {/* Smuggler figure across the bowl, seated on a crate */}
      <rect x="232" y="100" width="16" height="12" fill="#1a120c" />
      <ellipse cx="244" cy="112" rx="7" ry="3" fill="#120c08" />
      <rect x="240" y="92" width="8" height="14" fill="#120c08" />
      <circle cx="244" cy="88" r="3.5" fill="#120c08" />
    </svg>
  );
}

/**
 * Camp 4 — a cold fire at the edge of the upwelling light. The deep gnome exile
 * who fled the Underdark and could go no further. A pale golden glow bleeds up
 * from a rift in the floor ahead — dawn leaking through the floor of the world.
 * The fire throws no shadow toward the light.
 */
function EdgeOfLightScene() {
  return (
    <svg
      viewBox="0 0 320 140"
      className={SCENE_CLASS}
      role="img"
      aria-label="A cold fire on a rocky shelf at the edge of a rift, pale golden light rising from the crack in the floor ahead."
    >
      <defs>
        <radialGradient id="edge-void" cx="0.5" cy="0.45" r="0.7">
          <stop offset="0%" stopColor="#1a1228" />
          <stop offset="100%" stopColor="#06040e" />
        </radialGradient>
        <radialGradient id="edge-upwell" cx="0.5" cy="1" r="0.7">
          <stop offset="0%" stopColor="#f0e8c8" stopOpacity="0.95" />
          <stop offset="35%" stopColor="#d0bc80" stopOpacity="0.6" />
          <stop offset="70%" stopColor="#a09050" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#805a20" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="edge-shelf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#201830" />
          <stop offset="100%" stopColor="#080610" />
        </linearGradient>
        <radialGradient id="edge-cold-fire" cx="0.5" cy="0.6" r="0.6">
          <stop offset="0%" stopColor="#c89840" stopOpacity="0.85" />
          <stop offset="55%" stopColor="#8a5820" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#5a3010" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Void background — no sky, only deep Underdark */}
      <rect x="0" y="0" width="320" height="140" fill="url(#edge-void)" />
      {/* Rock ceiling, jagged */}
      <path
        d="M 0 0 L 0 24 L 18 38 L 38 20 L 62 40 L 88 22 L 114 42 L 148 18 L 170 36 L 200 14 L 230 34 L 256 18 L 280 38 L 320 20 L 320 0 Z"
        fill="#120e1e"
      />
      {/* Faint faerzress residue on ceiling — cool, barely visible */}
      <g fill="#4a5880" opacity="0.22">
        <circle cx="70" cy="28" r="1.2" />
        <circle cx="160" cy="20" r="1.0" />
        <circle cx="260" cy="30" r="0.9" />
      </g>
      {/* Rocky shelf — the floor slopes and then drops away on the right */}
      <path
        d="M 0 90 Q 60 82 120 88 Q 160 92 190 86 L 200 96 L 220 106 L 240 118 L 0 118 Z"
        fill="url(#edge-shelf)"
      />
      {/* Rock cracks and texture */}
      <g stroke="#100c1c" strokeWidth="0.7" opacity="0.55">
        <path d="M 50 96 L 60 110" fill="none" />
        <path d="M 100 88 L 108 104" fill="none" />
        <path d="M 150 90 L 156 106" fill="none" />
      </g>
      {/* The rift — a jagged crack in the floor on the right, with the upwelling light */}
      <path
        d="M 200 96 L 210 80 L 224 68 L 238 56 L 252 44 L 264 56 L 270 76 L 278 94 L 280 110 L 268 120 L 250 126 L 232 122 L 218 114 L 206 108 Z"
        fill="#0a0816"
      />
      {/* The upwelling — pale gold light from below the crack */}
      <ellipse cx="240" cy="100" rx="42" ry="30" fill="url(#edge-upwell)" />
      {/* Rift edges lit from below */}
      <path
        d="M 200 96 L 210 80 L 224 68 L 238 56 L 252 44"
        fill="none"
        stroke="#c0a060"
        strokeWidth="1"
        opacity="0.65"
      />
      <path
        d="M 264 56 L 270 76 L 278 94 L 280 110"
        fill="none"
        stroke="#c0a060"
        strokeWidth="1"
        opacity="0.55"
      />
      {/* Pale light column rising from the rift into the cavern */}
      <rect
        x="210"
        y="20"
        width="60"
        height="80"
        fill="url(#edge-upwell)"
        opacity="0.35"
      />
      {/* Cold fire — small, muted, throws no vivid shadows */}
      <ellipse cx="98" cy="108" rx="28" ry="12" fill="url(#edge-cold-fire)" />
      {/* Fire rocks */}
      <rect x="86" y="108" width="24" height="3" fill="#2a1e10" />
      {/* Cold flames — low, barely alive */}
      <path d="M 90 108 Q 93 101 97 108 Q 101 98 105 108 Z" fill="#c89040" opacity="0.75" />
      <path d="M 93 108 Q 97 103 101 108 Z" fill="#e0b860" opacity="0.6" />
      {/* Deep gnome exile — small and stocky (gnomes ~75% human height) */}
      <ellipse cx="66" cy="106" rx="5" ry="2.5" fill="#060410" />
      <rect x="63" y="97" width="7" height="10" fill="#080612" />
      <circle cx="66.5" cy="94" r="3.2" fill="#080612" />
      {/* Large gnome ears — slight stub points */}
      <path d="M 62 94 L 58 91 L 60 96 Z" fill="#080612" />
      <path d="M 71 94 L 75 91 L 73 96 Z" fill="#080612" />
      {/* Cup in hand — the gnome holds it out toward you */}
      <rect x="73" y="100" width="5" height="4" fill="#0e0c18" />
      {/* Rock wall behind gnome — far side of shelf */}
      <path d="M 0 80 Q 20 74 40 80 Q 50 82 60 78 L 60 118 L 0 118 Z" fill="#100c1a" />
    </svg>
  );
}

/**
 * Camp 5 — the Stillness Before the Wheel. Aurelach is dead. At the rim of
 * something too large to see the curve of, a figure that was once a pilgrim
 * tends a guttering fire out of habit. Everything is worn smooth. The great
 * Wheel is barely visible as an arc in the absolute dark behind it all.
 */
function StillnessBeforeWheelScene() {
  return (
    <svg
      viewBox="0 0 320 140"
      className={SCENE_CLASS}
      role="img"
      aria-label="A guttering fire at the rim of an immense Wheel in absolute void, a worn pilgrim offering a cup."
    >
      <defs>
        <radialGradient id="still-void" cx="0.5" cy="0.5" r="0.75">
          <stop offset="0%" stopColor="#0e0812" />
          <stop offset="100%" stopColor="#030206" />
        </radialGradient>
        <radialGradient id="still-ember" cx="0.5" cy="0.6" r="0.55">
          <stop offset="0%" stopColor="#9a4020" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#5a1a08" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#2a0804" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="still-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#140e18" />
          <stop offset="100%" stopColor="#060408" />
        </linearGradient>
      </defs>
      {/* Absolute void */}
      <rect x="0" y="0" width="320" height="140" fill="url(#still-void)" />
      {/* The Wheel — vast arc barely visible in the dark, the curve of something
          too large to see whole. Only the near edge is present. */}
      <circle
        cx="160"
        cy="-240"
        r="320"
        fill="none"
        stroke="#1c1020"
        strokeWidth="14"
        opacity="0.7"
      />
      {/* Inner ring — the wheel has two concentric bands */}
      <circle
        cx="160"
        cy="-240"
        r="290"
        fill="none"
        stroke="#140c18"
        strokeWidth="5"
        opacity="0.5"
      />
      {/* Wheel spokes — barely visible radial lines */}
      <g stroke="#150d1a" strokeWidth="1.5" opacity="0.4">
        <line x1="160" y1="80" x2="20" y2="-80" />
        <line x1="160" y1="80" x2="300" y2="-80" />
        <line x1="160" y1="80" x2="160" y2="-120" />
        <line x1="160" y1="80" x2="60" y2="-160" />
        <line x1="160" y1="80" x2="260" y2="-160" />
      </g>
      {/* Worn floor — the rim of the wheel is the ground */}
      <path d="M 0 104 Q 80 96 160 100 Q 240 104 320 98 L 320 140 L 0 140 Z" fill="url(#still-floor)" />
      {/* Subtle floor cracks — worn by the turning */}
      <g stroke="#0e0812" strokeWidth="0.6" opacity="0.5">
        <path d="M 30 110 L 44 130" fill="none" />
        <path d="M 200 106 L 208 126" fill="none" />
        <path d="M 280 100 L 290 120" fill="none" />
      </g>
      {/* The guttering fire — almost just coals, barely alive */}
      <ellipse cx="140" cy="114" rx="22" ry="9" fill="url(#still-ember)" />
      {/* Coals — no logs, just embers */}
      <ellipse cx="136" cy="114" rx="8" ry="2.5" fill="#3a1208" />
      <ellipse cx="144" cy="115" rx="6" ry="2" fill="#2a0e06" />
      {/* Barely-alive flame — one small tongue */}
      <path d="M 138 114 Q 140 108 142 114 Z" fill="#8a3810" opacity="0.8" />
      <path d="M 139 114 Q 141 110 143 114 Z" fill="#c05820" opacity="0.55" />
      {/* The pilgrim — worn smooth, barely distinguishable from the dark,
          seated on the wheel's rim, holding out a cup */}
      <ellipse cx="175" cy="116" rx="6" ry="2.5" fill="#0c0a10" />
      <rect x="172" y="104" width="8" height="13" fill="#0c0a10" />
      {/* Head — worn, almost featureless */}
      <circle cx="176" cy="101" r="3.5" fill="#0e0c14" />
      {/* The cup — held out toward the viewer, the one visible gesture */}
      <rect x="182" y="106" width="5" height="4" fill="#2a2030" />
      <rect x="181" y="105" width="7" height="1.5" fill="#3a2a40" />
    </svg>
  );
}
