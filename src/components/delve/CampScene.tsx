import type { ReactElement } from 'react';
import { useT } from '../../i18n/useT';

interface SceneProps {
  label: string;
}

/**
 * Chapter-keyed camp illustration. Each camp seam between two chapters sits in
 * a different region of the long road from the Iron Cells to the Throne of
 * the Slain God, so we author one bespoke 8-bit-dark scene per chapter rather than
 * reusing a single fire. The `chapter` prop is the RoomSpec.chapter value set
 * by campNode in createDelve; camps run 1–13 (one seam between each of the 14
 * chained chapters), with chapter 14 mapped too for forward-safety.
 *
 * Each scene tracks the same BG2 chapter→place spine that EventIllustration
 * derives from a chapter (iron-cells → athkatla → spellhold → underdark →
 * the-godwake → drowned-archive → ashfall → court-of-masks → suldanessellar →
 * hell → saradush → throne-of-bhaal), but unlike the shared region banner each
 * camp is its own hand-drawn scene with a fire and a keeper — so chapters that
 * share a region band (5/6 the Godwake, 12/13 the war on the Five) still read
 * as distinct places.
 */
const CAMP_SCENES: Record<number, (props: SceneProps) => ReactElement> = {
  1: RoadsideFireScene,
  2: HarbourLampScene,
  3: SmugglerFireScene,
  4: EdgeOfLightScene,
  5: StillnessBeforeWheelScene,
  6: LongDescentScene,
  7: WaterEndsScene,
  8: BrokenMirrorsScene,
  9: BurningBoughsScene,
  10: ThresholdOfPitScene,
  11: BurningSiegeScene,
  12: LastTwoDoorsScene,
  13: PocketPlaneScene,
  14: ThroneOfBhaalScene,
};

export function CampScene({ chapter }: { chapter: number | undefined }) {
  const { t } = useT();
  const key = chapter != null && CAMP_SCENES[chapter] ? chapter : 1;
  const Scene = CAMP_SCENES[key];
  return <Scene label={t(`delve.campScene.${key}`)} />;
}

const SCENE_CLASS = 'w-full max-w-md drop-shadow-[0_0_18px_rgba(244,167,66,0.4)]';

/** Camp 1 — a roadside fire on the Trade Road, the road bending south to Sudria. */
function RoadsideFireScene({ label }: SceneProps) {
  return (
    <svg
      viewBox="0 0 320 140"
      className={SCENE_CLASS}
      role="img"
      aria-label={label}
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

/** Camp 2 — a harbour-lamp at the end of an Stormhaven jetty, a wherry alongside. */
function HarbourLampScene({ label }: SceneProps) {
  return (
    <svg
      viewBox="0 0 320 140"
      className={SCENE_CLASS}
      role="img"
      aria-label={label}
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
      {/* City skyline across the water — domes and spires of Stormhaven */}
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
function SmugglerFireScene({ label }: SceneProps) {
  return (
    <svg
      viewBox="0 0 320 140"
      className={SCENE_CLASS}
      role="img"
      aria-label={label}
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
 * who fled the Deepdark and could go no further. A pale golden glow bleeds up
 * from a rift in the floor ahead — dawn leaking through the floor of the world.
 * The fire throws no shadow toward the light.
 */
function EdgeOfLightScene({ label }: SceneProps) {
  return (
    <svg
      viewBox="0 0 320 140"
      className={SCENE_CLASS}
      role="img"
      aria-label={label}
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
      {/* Void background — no sky, only deep Deepdark */}
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
function StillnessBeforeWheelScene({ label }: SceneProps) {
  return (
    <svg
      viewBox="0 0 320 140"
      className={SCENE_CLASS}
      role="img"
      aria-label={label}
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

/**
 * Camp 6 — the Lip of the Long Descent. The Wheel is stopped, and where it
 * stood the floor of the world has cracked open onto a stair going down into a
 * cold salt dark. A deep-salvager keeps a shuttered lamp and pays out
 * sounding-rope toward the drowned library far below. (Region band: the-godwake.)
 */
function LongDescentScene({ label }: SceneProps) {
  return (
    <svg
      viewBox="0 0 320 140"
      className={SCENE_CLASS}
      role="img"
      aria-label={label}
    >
      <defs>
        <radialGradient id="descent-lamp-glow" cx="0.32" cy="0.62" r="0.55">
          <stop offset="0%" stopColor="#ffd76a" stopOpacity="0.92" />
          <stop offset="50%" stopColor="#f4a742" stopOpacity="0.38" />
          <stop offset="100%" stopColor="#f4a742" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="descent-void" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0b0a14" />
          <stop offset="100%" stopColor="#08131a" />
        </linearGradient>
        <radialGradient id="descent-deep" cx="0.66" cy="1" r="0.6">
          <stop offset="0%" stopColor="#2a6a6a" stopOpacity="0.4" />
          <stop offset="60%" stopColor="#163a40" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#0a1c20" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="descent-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#221a26" />
          <stop offset="100%" stopColor="#0a0810" />
        </linearGradient>
      </defs>
      {/* Cold void */}
      <rect x="0" y="0" width="320" height="140" fill="url(#descent-void)" />
      {/* The stopped Wheel — the great arc from the last camp, now broken */}
      <path d="M -20 70 Q 120 -70 360 70" fill="none" stroke="#1a1322" strokeWidth="12" opacity="0.7" />
      <path d="M 150 8 Q 220 2 252 28" fill="none" stroke="#0b0814" strokeWidth="13" opacity="0.9" />
      {/* spokes barely visible */}
      <g stroke="#150d1a" strokeWidth="1.2" opacity="0.35">
        <line x1="120" y1="20" x2="60" y2="70" />
        <line x1="160" y1="14" x2="160" y2="64" />
        <line x1="210" y1="18" x2="262" y2="64" />
      </g>
      {/* The lip / near floor on the left */}
      <path d="M 0 92 Q 50 86 96 92 L 110 104 L 120 120 L 0 120 Z" fill="url(#descent-floor)" />
      {/* The shaft going down on the right — a dark well with cold light far below */}
      <path d="M 120 92 L 150 92 L 168 110 L 200 120 L 320 120 L 320 92 L 300 92 Q 260 100 220 94 Q 170 88 150 96 Z" fill="#06121a" />
      <ellipse cx="210" cy="124" rx="70" ry="26" fill="url(#descent-deep)" />
      {/* Stair steps descending into the shaft */}
      <g fill="#1a1622" stroke="#0a0810" strokeWidth="0.5">
        <rect x="120" y="94" width="22" height="5" />
        <rect x="132" y="100" width="22" height="5" />
        <rect x="146" y="106" width="22" height="5" />
        <rect x="160" y="112" width="22" height="5" />
      </g>
      {/* faint salt-cold motes rising from the deep */}
      <g fill="#7ac0c0" opacity="0.35">
        <circle cx="200" cy="100" r="0.8" />
        <circle cx="232" cy="92" r="0.6" />
        <circle cx="248" cy="104" r="0.7" />
      </g>
      {/* Coil of sounding-rope on the lip */}
      <ellipse cx="60" cy="100" rx="14" ry="5" fill="#2a2018" />
      <ellipse cx="60" cy="98" rx="10" ry="3.5" fill="#1c150f" />
      {/* rope paying out over the edge into the shaft */}
      <path d="M 66 96 Q 120 96 150 108 Q 175 118 196 122" fill="none" stroke="#5a4632" strokeWidth="1" />
      {/* Shuttered lamp + glow */}
      <ellipse cx="40" cy="96" rx="34" ry="28" fill="url(#descent-lamp-glow)" />
      <rect x="35" y="86" width="10" height="14" fill="#241a10" stroke="#0e0a06" strokeWidth="0.5" />
      <rect x="37" y="89" width="6" height="8" fill="#ffd76a" opacity="0.9" />
      {/* shutter slats across the lamp */}
      <g stroke="#0e0a06" strokeWidth="0.8" opacity="0.8">
        <line x1="35" y1="91" x2="45" y2="91" />
        <line x1="35" y1="94" x2="45" y2="94" />
      </g>
      <rect x="38" y="80" width="4" height="6" fill="#241a10" />
      {/* The salvager — kneeling at the edge, paying out rope hand over hand */}
      <ellipse cx="92" cy="100" rx="7" ry="3" fill="#0c0a10" />
      <rect x="86" y="88" width="12" height="13" fill="#0e0c14" />
      <circle cx="92" cy="84" r="3.5" fill="#0e0c14" />
      {/* arm reaching to the rope */}
      <line x1="86" y1="92" x2="74" y2="96" stroke="#0e0c14" strokeWidth="2.5" />
    </svg>
  );
}

/**
 * Camp 7 — a Fire Where the Water Ends. The drowned stacks are below; the road
 * lifts clear of the cold black into dry, bitter air that tastes of old
 * burning. A figure in the rags of an unknown uniform warms its hands at the
 * last wet stone, the ashfield waiting ahead. (Region band: drowned-archive →
 * ashfall-march seam.)
 */
function WaterEndsScene({ label }: SceneProps) {
  return (
    <svg
      viewBox="0 0 320 140"
      className={SCENE_CLASS}
      role="img"
      aria-label={label}
    >
      <defs>
        <radialGradient id="ashend-fire-glow" cx="0.34" cy="0.62" r="0.55">
          <stop offset="0%" stopColor="#ffd76a" stopOpacity="0.92" />
          <stop offset="50%" stopColor="#f4a742" stopOpacity="0.38" />
          <stop offset="100%" stopColor="#f4a742" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ashend-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a1410" />
          <stop offset="60%" stopColor="#3a2a1e" />
          <stop offset="100%" stopColor="#4a3526" />
        </linearGradient>
        <linearGradient id="ashend-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0c1418" />
          <stop offset="100%" stopColor="#05080a" />
        </linearGradient>
        <linearGradient id="ashend-ash" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a2e24" />
          <stop offset="100%" stopColor="#1a120c" />
        </linearGradient>
      </defs>
      {/* Dry bitter sky ahead, hazed with ash */}
      <rect x="0" y="0" width="320" height="92" fill="url(#ashend-sky)" />
      {/* Distant ashfield ridge — the field that has burned a hundred years */}
      <path d="M 120 92 L 170 74 L 210 84 L 250 70 L 300 82 L 320 76 L 320 92 Z" fill="#241812" />
      {/* faint embers on the far ridge — the army's fires that never went out */}
      <g fill="#c8602a" opacity="0.55">
        <circle cx="190" cy="80" r="0.9" />
        <circle cx="232" cy="78" r="0.8" />
        <circle cx="268" cy="76" r="0.9" />
        <circle cx="300" cy="80" r="0.7" />
      </g>
      {/* Drifting ash motes in the air */}
      <g fill="#9a8a76" opacity="0.5">
        <circle cx="150" cy="36" r="0.9" />
        <circle cx="210" cy="50" r="0.7" />
        <circle cx="264" cy="30" r="0.8" />
        <circle cx="290" cy="58" r="0.7" />
        <circle cx="176" cy="64" r="0.6" />
      </g>
      {/* The black water behind/left — where the road climbed out */}
      <path d="M 0 84 L 90 84 L 70 140 L 0 140 Z" fill="url(#ashend-water)" />
      {/* faint cold swell highlights on the dying water */}
      <g fill="#3a5a60" opacity="0.3">
        <rect x="14" y="98" width="20" height="1" />
        <rect x="22" y="112" width="16" height="1" />
      </g>
      {/* The shore of ash — dry ground rising to the right */}
      <path d="M 60 140 L 84 92 Q 160 100 240 96 Q 300 94 320 100 L 320 140 Z" fill="url(#ashend-ash)" />
      {/* the last wet stone — a slab with a cold sheen, where the fire sits */}
      <path d="M 78 112 Q 100 106 124 112 L 120 120 L 84 120 Z" fill="#161a1c" />
      <path d="M 84 112 Q 100 109 116 112" fill="none" stroke="#3a5a60" strokeWidth="0.7" opacity="0.4" />
      {/* Fire glow */}
      <ellipse cx="100" cy="110" rx="48" ry="20" fill="url(#ashend-fire-glow)" />
      {/* salt-bleached driftwood logs */}
      <rect x="88" y="108" width="26" height="3" fill="#4a463c" />
      <rect x="93" y="112" width="20" height="3" fill="#322e26" />
      {/* flames */}
      <path d="M 92 108 Q 96 96 100 108 Q 104 90 108 108 Z" fill="#ffd76a" opacity="0.9" />
      <path d="M 95 108 Q 100 102 105 108 Z" fill="#fff8d0" opacity="0.85" />
      {/* The uniformed figure warming its hands at the fire */}
      <ellipse cx="64" cy="108" rx="6" ry="3" fill="#120e0a" />
      <rect x="60" y="96" width="9" height="12" fill="#181208" />
      {/* tattered cloak hem */}
      <path d="M 60 108 L 58 114 L 70 114 L 69 108 Z" fill="#120c06" />
      <circle cx="64.5" cy="92" r="3.4" fill="#181208" />
      {/* hands held out to the warmth */}
      <line x1="69" y1="100" x2="80" y2="104" stroke="#181208" strokeWidth="2.2" />
      {/* a faded rank-sash, the one bit of colour left on the uniform */}
      <line x1="61" y1="97" x2="67" y2="105" stroke="#7a2a20" strokeWidth="1.2" opacity="0.7" />
    </svg>
  );
}

/**
 * Camp 8 — a Fire Among the Broken Mirrors. The road tips down into the
 * captor's own fallen court: marble, dust, old perfume, and shards of mirror
 * that throw a dozen tired faces back. A hooded keeper watches itself in the
 * glass — and its reflection wears a mask that does not match. (Region band:
 * court-of-masks.)
 */
function BrokenMirrorsScene({ label }: SceneProps) {
  return (
    <svg
      viewBox="0 0 320 140"
      className={SCENE_CLASS}
      role="img"
      aria-label={label}
    >
      <defs>
        <radialGradient id="mirror-fire-glow" cx="0.5" cy="0.62" r="0.55">
          <stop offset="0%" stopColor="#ffd76a" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#f4a742" stopOpacity="0.36" />
          <stop offset="100%" stopColor="#f4a742" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="mirror-hall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#161018" />
          <stop offset="100%" stopColor="#241a26" />
        </linearGradient>
        <linearGradient id="mirror-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2e2630" />
          <stop offset="100%" stopColor="#100c14" />
        </linearGradient>
        <linearGradient id="mirror-shard" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3a3346" />
          <stop offset="45%" stopColor="#6a5a70" />
          <stop offset="55%" stopColor="#8a7a90" />
          <stop offset="100%" stopColor="#2a2230" />
        </linearGradient>
      </defs>
      {/* Dim hall */}
      <rect x="0" y="0" width="320" height="140" fill="url(#mirror-hall)" />
      {/* Broken marble columns at the back */}
      <g fill="#241c2a">
        <rect x="24" y="28" width="14" height="58" />
        <rect x="22" y="24" width="18" height="5" />
        <rect x="282" y="20" width="14" height="66" />
        <rect x="280" y="16" width="18" height="5" />
        <rect x="150" y="44" width="13" height="42" />
      </g>
      {/* the snapped column's fallen capital */}
      <rect x="150" y="40" width="22" height="5" fill="#241c2a" transform="rotate(-12 161 42)" />
      {/* The grand fallen stair behind */}
      <g fill="#1e1622">
        <path d="M 196 86 L 320 60 L 320 86 Z" />
        <path d="M 210 86 L 320 66 L 320 72 L 214 90 Z" opacity="0.6" />
      </g>
      {/* faint stopped-music dust drifting */}
      <g fill="#9a8aa0" opacity="0.3">
        <circle cx="120" cy="34" r="0.8" />
        <circle cx="206" cy="46" r="0.7" />
        <circle cx="70" cy="52" r="0.6" />
      </g>
      {/* Cracked dance-floor */}
      <path d="M 0 96 Q 160 88 320 96 L 320 140 L 0 140 Z" fill="url(#mirror-floor)" />
      {/* inlaid floor cracks radiating from the fire */}
      <g stroke="#0c0810" strokeWidth="0.6" opacity="0.6">
        <path d="M 150 112 L 60 104" fill="none" />
        <path d="M 160 112 L 250 102" fill="none" />
        <path d="M 156 118 L 120 138" fill="none" />
      </g>
      {/* Standing mirror shards catching the firelight */}
      <polygon points="48,104 58,60 70,64 66,106" fill="url(#mirror-shard)" stroke="#0e0a12" strokeWidth="0.6" />
      <rect x="56" y="78" width="4" height="9" fill="#120e16" opacity="0.7" />
      <polygon points="250,106 244,58 258,62 264,108" fill="url(#mirror-shard)" stroke="#0e0a12" strokeWidth="0.6" />
      {/* a small near shard on the floor */}
      <polygon points="110,118 116,100 124,104 120,120" fill="url(#mirror-shard)" stroke="#0e0a12" strokeWidth="0.5" opacity="0.85" />
      {/* Fire glow */}
      <ellipse cx="160" cy="114" rx="50" ry="20" fill="url(#mirror-fire-glow)" />
      <rect x="148" y="112" width="24" height="3" fill="#3a2a1c" />
      <path d="M 152 112 Q 156 100 160 112 Q 164 96 168 112 Z" fill="#ffd76a" opacity="0.9" />
      <path d="M 155 112 Q 160 106 165 112 Z" fill="#fff8d0" opacity="0.85" />
      {/* The hooded keeper, back to us, watching itself in the right shard */}
      <ellipse cx="196" cy="114" rx="7" ry="3" fill="#0e0b12" />
      <path d="M 189 114 L 190 98 Q 196 90 202 98 L 203 114 Z" fill="#120c16" />
      <path d="M 192 99 Q 196 90 200 99 Z" fill="#0c0810" />
      {/* its reflection — a pale masked face, smiling, that does not match the back of its head */}
      <ellipse cx="255" cy="84" rx="3.6" ry="4.4" fill="#e8dcc0" opacity="0.5" />
      <rect x="252" y="82" width="6" height="2" fill="#0e0a12" opacity="0.6" />
      <path d="M 252 87 Q 255 89 258 87" fill="none" stroke="#0e0a12" strokeWidth="0.6" opacity="0.6" />
    </svg>
  );
}

/**
 * Camp 9 — a Fire Beneath the Burning Boughs. The broken stair turns upward
 * into the open dark under a canopy lit orange from above: Tor Maladin
 * burning slow in the crowns of the trees. A fugitive elf keeps a low fire that
 * throws no light past its ring, an unstrung bow across its knees. (Region
 * band: suldanessellar.)
 */
function BurningBoughsScene({ label }: SceneProps) {
  return (
    <svg
      viewBox="0 0 320 140"
      className={SCENE_CLASS}
      role="img"
      aria-label={label}
    >
      <defs>
        <radialGradient id="boughs-fire-glow" cx="0.36" cy="0.66" r="0.5">
          <stop offset="0%" stopColor="#ffce5a" stopOpacity="0.85" />
          <stop offset="55%" stopColor="#e0892a" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#e0892a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="boughs-air" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a1a10" />
          <stop offset="45%" stopColor="#1e1410" />
          <stop offset="100%" stopColor="#0e0a08" />
        </linearGradient>
        <radialGradient id="boughs-canopy" cx="0.5" cy="0" r="0.9">
          <stop offset="0%" stopColor="#ff7a2a" stopOpacity="0.7" />
          <stop offset="45%" stopColor="#c84a1a" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#c84a1a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="boughs-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e1610" />
          <stop offset="100%" stopColor="#0a0806" />
        </linearGradient>
      </defs>
      {/* Air under the canopy */}
      <rect x="0" y="0" width="320" height="140" fill="url(#boughs-air)" />
      {/* The burning canopy overhead */}
      <rect x="0" y="0" width="320" height="70" fill="url(#boughs-canopy)" />
      {/* crown silhouettes, lit from within by the slow fire */}
      <path d="M 0 48 Q 30 18 70 40 Q 100 12 140 38 Q 180 10 220 36 Q 260 14 300 38 Q 316 30 320 44 L 320 0 L 0 0 Z" fill="#160d0a" />
      {/* hot spots burning in the crowns */}
      <g fill="#ff9a3a" opacity="0.7">
        <circle cx="58" cy="34" r="2.2" />
        <circle cx="132" cy="30" r="2.6" />
        <circle cx="210" cy="30" r="2.0" />
        <circle cx="286" cy="34" r="2.4" />
      </g>
      {/* Tall trunks framing, rising into the burning crowns */}
      <g fill="#120c08">
        <rect x="36" y="40" width="12" height="76" />
        <rect x="262" y="36" width="14" height="84" />
        <rect x="150" y="44" width="9" height="60" />
      </g>
      {/* Embers drifting down */}
      <g fill="#ff8a32" opacity="0.7">
        <circle cx="96" cy="60" r="0.9" />
        <circle cx="178" cy="74" r="0.8" />
        <circle cx="232" cy="56" r="0.9" />
        <circle cx="120" cy="86" r="0.7" />
        <circle cx="200" cy="92" r="0.6" />
      </g>
      {/* Forest floor */}
      <path d="M 0 104 Q 80 98 160 102 Q 240 106 320 100 L 320 140 L 0 140 Z" fill="url(#boughs-floor)" />
      {/* Low contained fire — small, throwing no light past its ring */}
      <ellipse cx="104" cy="112" rx="34" ry="13" fill="url(#boughs-fire-glow)" />
      {/* ring of stones */}
      <g fill="#241c16">
        <ellipse cx="88" cy="114" rx="3" ry="1.6" />
        <ellipse cx="104" cy="116" rx="3" ry="1.6" />
        <ellipse cx="120" cy="114" rx="3" ry="1.6" />
      </g>
      <path d="M 98 112 Q 101 104 104 112 Q 107 102 110 112 Z" fill="#ffce5a" opacity="0.9" />
      <path d="M 100 112 Q 104 107 108 112 Z" fill="#fff0c0" opacity="0.8" />
      {/* The fugitive elf — seated, slender, bow across the knees */}
      <ellipse cx="150" cy="114" rx="7" ry="3" fill="#0c0a08" />
      <rect x="145" y="102" width="10" height="13" fill="#100c0a" />
      {/* knees drawn up */}
      <rect x="143" y="110" width="14" height="5" rx="2" fill="#0c0908" />
      <circle cx="150" cy="98" r="3.4" fill="#100c0a" />
      {/* swept-back elf ear */}
      <path d="M 153 97 L 158 94 L 154 99 Z" fill="#100c0a" />
      {/* the unstrung bow laid across the knees — stave with the string hanging slack */}
      <path d="M 134 110 Q 150 104 166 110" fill="none" stroke="#3a2a1a" strokeWidth="1.4" />
      <path d="M 134 110 Q 150 116 166 110" fill="none" stroke="#5a4a32" strokeWidth="0.5" opacity="0.6" />
    </svg>
  );
}

/**
 * Camp 10 — a Breath on the Threshold of the Pit. The captor took the Tree's
 * light and yours, and the world tipped into a long red falling. This is no
 * camp at all — a held idea of a ledge over a pit that breathes, a guttering
 * soul-light someone left burning, words scratched in the rock beside it.
 * (Region band: hell-trials.)
 */
function ThresholdOfPitScene({ label }: SceneProps) {
  return (
    <svg
      viewBox="0 0 320 140"
      className={SCENE_CLASS}
      role="img"
      aria-label={label}
    >
      <defs>
        <radialGradient id="pit-hell" cx="0.5" cy="0.2" r="0.95">
          <stop offset="0%" stopColor="#3a0e0e" />
          <stop offset="55%" stopColor="#1c0608" />
          <stop offset="100%" stopColor="#0a0204" />
        </radialGradient>
        <radialGradient id="pit-maw" cx="0.5" cy="0.55" r="0.6">
          <stop offset="0%" stopColor="#8a1808" stopOpacity="0.7" />
          <stop offset="45%" stopColor="#3a0a06" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#0a0204" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="pit-soul" cx="0.5" cy="0.6" r="0.6">
          <stop offset="0%" stopColor="#bfe6ff" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#6a9ad0" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#6a9ad0" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="pit-ledge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a1010" />
          <stop offset="100%" stopColor="#0c0404" />
        </linearGradient>
      </defs>
      {/* Hell void */}
      <rect x="0" y="0" width="320" height="140" fill="url(#pit-hell)" />
      {/* The pit that breathes — concentric maw below, lit from within */}
      <ellipse cx="170" cy="150" rx="170" ry="80" fill="#0a0204" />
      <ellipse cx="170" cy="150" rx="130" ry="60" fill="url(#pit-maw)" />
      <g fill="none" stroke="#5a1408" strokeWidth="1" opacity="0.5">
        <ellipse cx="170" cy="150" rx="150" ry="70" />
        <ellipse cx="170" cy="150" rx="110" ry="50" />
        <ellipse cx="170" cy="150" rx="74" ry="32" />
      </g>
      {/* far jagged ridges of the hell */}
      <path d="M 0 56 L 30 40 L 56 54 L 90 38 L 120 52 L 120 70 L 0 70 Z" fill="#180608" opacity="0.8" />
      <path d="M 230 52 L 260 36 L 290 50 L 320 40 L 320 68 L 230 68 Z" fill="#180608" opacity="0.8" />
      {/* The narrow ledge — a held idea of a place, hung over the pit on the left */}
      <path d="M 0 92 Q 30 86 64 90 L 78 102 L 86 116 L 0 116 Z" fill="url(#pit-ledge)" />
      {/* rock wall rising behind the ledge */}
      <path d="M 0 92 L 0 40 L 18 44 Q 30 60 26 92 Z" fill="#1a0808" />
      {/* words scratched into the rock — raw, shaking scratch-strokes */}
      <g stroke="#c89a6a" strokeWidth="0.7" opacity="0.55" fill="none">
        <path d="M 8 58 l 0 6 M 8 61 l 5 0 M 13 58 l 0 6" />
        <path d="M 18 58 l 0 6 M 18 58 l 5 0 M 18 61 l 4 0 M 18 64 l 5 0" />
        <path d="M 8 70 l 0 6 M 8 70 l 5 0 M 8 73 l 4 0 M 8 76 l 5 0" />
        <path d="M 16 70 l 0 6 M 16 70 l 4 4 M 20 74 l 0 2" />
      </g>
      {/* The guttering soul-light — a pale cold flame on the ledge, no keeper */}
      <ellipse cx="44" cy="98" rx="26" ry="16" fill="url(#pit-soul)" />
      {/* a thin cresset it burns in */}
      <path d="M 38 100 Q 44 106 50 100 Z" fill="#1a0c0c" />
      <ellipse cx="44" cy="100" rx="6" ry="1.6" fill="#2a1414" />
      {/* the cold soul-flame, low and wavering */}
      <path d="M 41 100 Q 43 92 45 100 Q 47 90 49 100 Z" fill="#bfe6ff" opacity="0.7" />
      <path d="M 43 100 Q 45 95 47 100 Z" fill="#eaf6ff" opacity="0.6" />
      {/* drifting soul-motes rising */}
      <circle cx="46" cy="84" r="0.9" fill="#bfe6ff" opacity="0.5" />
      <circle cx="52" cy="76" r="0.7" fill="#bfe6ff" opacity="0.35" />
    </svg>
  );
}

/**
 * Camp 11 — a Fire at the Edge of the Burning Siege. The Pit spits you back
 * into a world gone to war. On a ridge above a walled city ringed in fire and
 * giants — Karthen, burning — a refugee feeds a thin fire a broken chair-leg,
 * others huddled who fled the same gates. (Region band: saradush.)
 */
function BurningSiegeScene({ label }: SceneProps) {
  return (
    <svg
      viewBox="0 0 320 140"
      className={SCENE_CLASS}
      role="img"
      aria-label={label}
    >
      <defs>
        <radialGradient id="siege-fire-glow" cx="0.3" cy="0.62" r="0.55">
          <stop offset="0%" stopColor="#ffd76a" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#f4a742" stopOpacity="0.36" />
          <stop offset="100%" stopColor="#f4a742" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="siege-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#140e16" />
          <stop offset="60%" stopColor="#3a1c18" />
          <stop offset="100%" stopColor="#6a2c16" />
        </linearGradient>
        <radialGradient id="siege-city-glow" cx="0.5" cy="1" r="0.7">
          <stop offset="0%" stopColor="#ff7a2a" stopOpacity="0.7" />
          <stop offset="50%" stopColor="#c8401a" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#c8401a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="siege-ridge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a1d16" />
          <stop offset="100%" stopColor="#100a08" />
        </linearGradient>
      </defs>
      {/* Smoke-stained sky */}
      <rect x="0" y="0" width="320" height="96" fill="url(#siege-sky)" />
      {/* smoke columns rising from the city */}
      <g fill="#2a201e" opacity="0.6">
        <path d="M 150 96 Q 142 60 158 30 Q 150 60 166 96 Z" />
        <path d="M 210 96 Q 204 64 218 40 Q 212 64 226 96 Z" />
      </g>
      {/* The burning city in the valley — glow within the walls */}
      <ellipse cx="190" cy="92" rx="120" ry="34" fill="url(#siege-city-glow)" />
      {/* city wall + towers, silhouetted against their own fire */}
      <g fill="#1a1210">
        <rect x="120" y="78" width="150" height="16" />
        <rect x="124" y="74" width="6" height="5" />
        <rect x="138" y="74" width="6" height="5" />
        <rect x="152" y="74" width="6" height="5" />
        <rect x="166" y="74" width="6" height="5" />
        <rect x="180" y="74" width="6" height="5" />
        <rect x="194" y="74" width="6" height="5" />
        <rect x="208" y="74" width="6" height="5" />
        <rect x="222" y="74" width="6" height="5" />
        <rect x="236" y="74" width="6" height="5" />
        <rect x="250" y="74" width="6" height="5" />
        <rect x="132" y="60" width="14" height="34" />
        <rect x="200" y="56" width="16" height="38" />
        <rect x="252" y="62" width="14" height="32" />
      </g>
      {/* fires breaking through the city */}
      <g fill="#ff8a32" opacity="0.8">
        <path d="M 150 84 Q 152 78 154 84 Z" />
        <path d="M 184 82 Q 186 75 188 82 Z" />
        <path d="M 230 84 Q 232 79 234 84 Z" />
      </g>
      {/* Giants ringing the wall — vast dark silhouettes outside it */}
      <g fill="#0e0a0a">
        <path d="M 104 94 L 104 56 Q 110 48 118 56 L 118 94 Z" />
        <ellipse cx="111" cy="52" rx="5" ry="6" />
        <path d="M 276 94 L 276 52 Q 283 42 291 52 L 291 94 Z" />
        <ellipse cx="283" cy="48" rx="5.5" ry="6.5" />
      </g>
      {/* The ridge in the foreground */}
      <path d="M 0 102 Q 80 96 160 100 Q 240 104 320 98 L 320 140 L 0 140 Z" fill="url(#siege-ridge)" />
      {/* Thin refugee fire */}
      <ellipse cx="74" cy="112" rx="40" ry="16" fill="url(#siege-fire-glow)" />
      {/* the broken chair-leg feeding it */}
      <rect x="80" y="110" width="20" height="3" fill="#3a2a1c" transform="rotate(-18 90 111)" />
      <rect x="64" y="110" width="20" height="3" fill="#2a1d14" />
      <path d="M 66 110 Q 70 99 74 110 Q 78 97 82 110 Z" fill="#ffd76a" opacity="0.9" />
      <path d="M 69 110 Q 74 104 79 110 Z" fill="#fff8d0" opacity="0.85" />
      {/* The refugee feeding the fire, arm extended with the chair-leg */}
      <ellipse cx="44" cy="110" rx="6" ry="3" fill="#120c0a" />
      <rect x="40" y="98" width="9" height="12" fill="#160f0a" />
      <circle cx="44.5" cy="94" r="3.4" fill="#160f0a" />
      <line x1="49" y1="102" x2="62" y2="108" stroke="#160f0a" strokeWidth="2.2" />
      {/* a second huddled figure who fled the same gates */}
      <ellipse cx="22" cy="112" rx="5" ry="2.6" fill="#0e0a08" />
      <rect x="18" y="102" width="8" height="10" fill="#120c08" />
      <circle cx="22" cy="99" r="3" fill="#120c08" />
    </svg>
  );
}

/**
 * Camp 12 — a Fire Between the Last Two Doors. The road past the siege forks
 * toward two dark doors: a drow enclave sunk under a mountain (Szendra) and a
 * dragon's lair in the deep waste (Korvazel). A Harper agent keeps a watch-fire
 * between them, turning a blade in the light. (Region band: saradush — distinct
 * from Ch11 by the fork and the two lairs.)
 */
function LastTwoDoorsScene({ label }: SceneProps) {
  return (
    <svg
      viewBox="0 0 320 140"
      className={SCENE_CLASS}
      role="img"
      aria-label={label}
    >
      <defs>
        <radialGradient id="doors-fire-glow" cx="0.5" cy="0.64" r="0.5">
          <stop offset="0%" stopColor="#ffd76a" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#f4a742" stopOpacity="0.36" />
          <stop offset="100%" stopColor="#f4a742" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="doors-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0e0c16" />
          <stop offset="100%" stopColor="#241a22" />
        </linearGradient>
        <linearGradient id="doors-waste" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#241c1a" />
          <stop offset="100%" stopColor="#0e0a08" />
        </linearGradient>
        <radialGradient id="doors-drow" cx="0.5" cy="0.5" r="0.6">
          <stop offset="0%" stopColor="#6a4aa0" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#2a1a50" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="doors-lair" cx="0.5" cy="0.5" r="0.6">
          <stop offset="0%" stopColor="#c85a1a" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#6a2a08" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Waste sky */}
      <rect x="0" y="0" width="320" height="96" fill="url(#doors-sky)" />
      {/* a cold star or two over the waste */}
      <circle cx="160" cy="20" r="0.8" fill="#cfe0ff" opacity="0.6" />
      <circle cx="120" cy="34" r="0.5" fill="#cfe0ff" opacity="0.4" />
      {/* LEFT — the mountain mass, a drow gate sunk beneath it */}
      <path d="M 0 96 L 0 40 L 28 22 L 56 44 L 78 30 L 96 96 Z" fill="#16121c" />
      <path d="M 28 22 L 40 32 L 24 36 Z" fill="#0e0a14" opacity="0.7" />
      {/* the drow doorway — a faerie-fire-lit arch in the mountain's foot */}
      <path d="M 30 96 L 30 70 Q 44 56 58 70 L 58 96 Z" fill="#0a0612" />
      <ellipse cx="44" cy="80" rx="14" ry="18" fill="url(#doors-drow)" />
      <path d="M 34 96 L 34 72 Q 44 62 54 72 L 54 96 Z" fill="none" stroke="#7a5ac0" strokeWidth="0.8" opacity="0.55" />
      {/* spider-glyph hint over the drow gate */}
      <g stroke="#8a6ad0" strokeWidth="0.5" opacity="0.5">
        <line x1="44" y1="66" x2="44" y2="74" />
        <line x1="40" y1="68" x2="48" y2="72" />
        <line x1="48" y1="68" x2="40" y2="72" />
      </g>
      {/* RIGHT — the dragon's lair, a cave mouth in the deep waste */}
      <path d="M 224 96 L 240 50 L 270 64 L 300 44 L 320 60 L 320 96 Z" fill="#1a1410" />
      <path d="M 262 96 L 262 66 Q 284 50 306 66 L 306 96 Z" fill="#0c0806" />
      <ellipse cx="284" cy="78" rx="18" ry="16" fill="url(#doors-lair)" />
      {/* two ember-eyes deep in the lair */}
      <circle cx="278" cy="78" r="1.4" fill="#ff8a2a" opacity="0.8" />
      <circle cx="290" cy="79" r="1.4" fill="#ff8a2a" opacity="0.8" />
      {/* scatter of bones/scales at the lair mouth */}
      <g stroke="#5a4a3a" strokeWidth="0.6" opacity="0.5">
        <line x1="266" y1="94" x2="272" y2="92" />
        <line x1="296" y1="93" x2="302" y2="94" />
      </g>
      {/* The waste floor + the fork in the road */}
      <path d="M 0 102 Q 80 96 160 100 Q 240 104 320 98 L 320 140 L 0 140 Z" fill="url(#doors-waste)" />
      {/* the road forking — one track to the mountain, one to the lair */}
      <path d="M 150 140 L 160 112 L 60 96 L 50 100 L 150 118 Z" fill="#181210" opacity="0.8" />
      <path d="M 170 140 L 162 112 L 268 96 L 278 100 L 172 118 Z" fill="#181210" opacity="0.8" />
      {/* Watch-fire in the fork */}
      <ellipse cx="160" cy="116" rx="38" ry="15" fill="url(#doors-fire-glow)" />
      <rect x="148" y="114" width="24" height="3" fill="#3a2a1c" />
      <path d="M 152 114 Q 156 103 160 114 Q 164 100 168 114 Z" fill="#ffd76a" opacity="0.9" />
      <path d="M 155 114 Q 160 108 165 114 Z" fill="#fff8d0" opacity="0.85" />
      {/* The Harper agent, seated, turning a blade that catches the firelight */}
      <ellipse cx="192" cy="116" rx="7" ry="3" fill="#100c0a" />
      <rect x="187" y="104" width="10" height="13" fill="#140e0a" />
      <circle cx="192" cy="100" r="3.4" fill="#140e0a" />
      {/* the blade, held to the light */}
      <line x1="184" y1="108" x2="172" y2="100" stroke="#9aa0a8" strokeWidth="1.2" />
      <circle cx="184" cy="108" r="1.4" fill="#140e0a" />
      {/* the Harper's silver pin, a fleck of moonlight on the chest */}
      <circle cx="190" cy="107" r="1" fill="#cfe0ff" opacity="0.75" />
    </svg>
  );
}

/**
 * Camp 13 — a Fire in the Threshold. The world thins to the small folded
 * plane that has been yours since the first death. A keeperless fire burns on a
 * fragment adrift in the void; one dark door stands free with the throne behind
 * it; and the only ally who came the whole way sits across the flame, eyes
 * turned away. (Region band: throne-of-bhaal seam.)
 */
function PocketPlaneScene({ label }: SceneProps) {
  return (
    <svg
      viewBox="0 0 320 140"
      className={SCENE_CLASS}
      role="img"
      aria-label={label}
    >
      <defs>
        <radialGradient id="pocket-void" cx="0.5" cy="0.45" r="0.8">
          <stop offset="0%" stopColor="#140e1e" />
          <stop offset="100%" stopColor="#040208" />
        </radialGradient>
        <radialGradient id="pocket-fire-glow" cx="0.42" cy="0.6" r="0.55">
          <stop offset="0%" stopColor="#ffe08a" stopOpacity="0.95" />
          <stop offset="50%" stopColor="#f4a742" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#f4a742" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="pocket-shard" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#241a2e" />
          <stop offset="100%" stopColor="#0a0610" />
        </linearGradient>
        <radialGradient id="pocket-door" cx="0.5" cy="0.5" r="0.6">
          <stop offset="0%" stopColor="#9a7a3a" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#3a2a10" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* The void of the folded plane */}
      <rect x="0" y="0" width="320" height="140" fill="url(#pocket-void)" />
      {/* drifting fragments of plane, floating free */}
      <g fill="#1a1426" opacity="0.85">
        <path d="M 36 40 L 64 34 L 70 48 L 40 54 Z" />
        <path d="M 250 30 L 286 26 L 290 42 L 256 46 Z" />
        <path d="M 280 86 L 312 82 L 316 96 L 284 100 Z" />
      </g>
      {/* faint stars / soul-sparks suspended in the fold */}
      <g fill="#cfc0f0" opacity="0.5">
        <circle cx="90" cy="28" r="0.7" />
        <circle cx="170" cy="20" r="0.8" />
        <circle cx="214" cy="40" r="0.6" />
        <circle cx="120" cy="50" r="0.6" />
      </g>
      {/* The one door left, standing free in the void — the throne behind it */}
      <rect x="146" y="34" width="28" height="48" fill="#0a0610" stroke="#2a2030" strokeWidth="1.5" />
      <ellipse cx="160" cy="58" rx="18" ry="26" fill="url(#pocket-door)" />
      <rect x="150" y="38" width="20" height="44" fill="#120c1a" />
      {/* a thin line of throne-light bleeding under the door */}
      <rect x="150" y="80" width="20" height="2" fill="#ffd76a" opacity="0.5" />
      {/* The fragment the camp sits on — bare ground adrift */}
      <path d="M 30 104 Q 160 92 290 104 L 270 130 Q 160 140 50 130 Z" fill="url(#pocket-shard)" />
      {/* Keeperless fire — a clean self-sustaining flame, no logs, on bare ground */}
      <ellipse cx="138" cy="114" rx="40" ry="16" fill="url(#pocket-fire-glow)" />
      <path d="M 132 114 Q 136 100 140 114 Q 144 98 148 114 Z" fill="#ffe08a" opacity="0.92" />
      <path d="M 135 114 Q 139 106 143 114 Z" fill="#fff6d4" opacity="0.85" />
      {/* a faint pale core — it has burned the whole way, never tended */}
      <path d="M 138 114 Q 140 104 142 114 Z" fill="#ffffff" opacity="0.4" />
      {/* The ally across the fire — head turned aside, will not meet your eye */}
      <ellipse cx="180" cy="116" rx="7" ry="3" fill="#0c0a12" />
      <rect x="175" y="103" width="10" height="14" fill="#100c18" />
      <circle cx="183" cy="100" r="3.4" fill="#100c18" />
      {/* a cloak shoulder, hunched away from the light */}
      <path d="M 175 105 Q 170 108 172 116 L 178 116 Z" fill="#0c0814" />
    </svg>
  );
}

/**
 * Camp 14 — the Throne of the Slain God. The terminal chapter has no rest seam of its
 * own, but the scene is mapped for forward-safety: the empty seat of the dead
 * god on a dark dais, a thin bloodlight behind it, a low fire guttering at the
 * foot of the steps. (Region band: throne-of-bhaal.)
 */
function ThroneOfBhaalScene({ label }: SceneProps) {
  return (
    <svg
      viewBox="0 0 320 140"
      className={SCENE_CLASS}
      role="img"
      aria-label={label}
    >
      <defs>
        <radialGradient id="throne-void" cx="0.5" cy="0.4" r="0.85">
          <stop offset="0%" stopColor="#1a0c12" />
          <stop offset="100%" stopColor="#060206" />
        </radialGradient>
        <radialGradient id="throne-blood" cx="0.5" cy="0.5" r="0.6">
          <stop offset="0%" stopColor="#8a1020" stopOpacity="0.6" />
          <stop offset="55%" stopColor="#3a0810" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#3a0810" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="throne-fire-glow" cx="0.5" cy="0.6" r="0.55">
          <stop offset="0%" stopColor="#ffd76a" stopOpacity="0.85" />
          <stop offset="55%" stopColor="#f4a742" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#f4a742" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="throne-dais" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1c1018" />
          <stop offset="100%" stopColor="#080408" />
        </linearGradient>
      </defs>
      {/* Void */}
      <rect x="0" y="0" width="320" height="140" fill="url(#throne-void)" />
      {/* Bloodlight rising behind the throne */}
      <ellipse cx="160" cy="70" rx="70" ry="64" fill="url(#throne-blood)" />
      {/* The dais steps */}
      <g fill="url(#throne-dais)" stroke="#040204" strokeWidth="0.5">
        <path d="M 96 118 L 224 118 L 240 130 L 80 130 Z" />
        <path d="M 110 108 L 210 108 L 224 118 L 96 118 Z" />
        <path d="M 124 98 L 196 98 L 210 108 L 110 108 Z" />
      </g>
      {/* The throne — a high seat of bone and iron, the dead god's */}
      <g fill="#140a10" stroke="#060206" strokeWidth="0.6">
        <rect x="142" y="56" width="36" height="44" />
        <rect x="138" y="52" width="44" height="8" />
        <path d="M 142 56 L 138 24 L 150 38 L 160 18 L 170 38 L 182 24 L 178 56 Z" />
        <rect x="134" y="74" width="8" height="22" />
        <rect x="178" y="74" width="8" height="22" />
      </g>
      {/* a skull set in the crest — the Slain God, Lord of Murder */}
      <ellipse cx="160" cy="40" rx="5" ry="5.5" fill="#3a2a2e" />
      <circle cx="158" cy="39" r="1.2" fill="#8a1020" />
      <circle cx="162" cy="39" r="1.2" fill="#8a1020" />
      <path d="M 158 44 L 160 47 L 162 44 Z" fill="#1a0c10" />
      {/* faint blood sheen down the dais front */}
      <path d="M 150 100 Q 160 116 170 100" fill="none" stroke="#5a0c14" strokeWidth="1" opacity="0.5" />
      {/* A low fire guttering at the foot of the steps — the last rest before the seat */}
      <ellipse cx="108" cy="126" rx="30" ry="11" fill="url(#throne-fire-glow)" />
      <rect x="98" y="124" width="20" height="3" fill="#2a1d14" />
      <path d="M 101 124 Q 104 115 107 124 Q 110 113 113 124 Z" fill="#ffd76a" opacity="0.88" />
      <path d="M 104 124 Q 107 119 110 124 Z" fill="#fff8d0" opacity="0.8" />
    </svg>
  );
}
