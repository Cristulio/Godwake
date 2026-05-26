/**
 * Painted Phandalin skyline — Tresendar Manor (left, ruined), Stonehill Inn
 * (center, warm), Druid Grove (right, ancient oak). Rendered as inline SVG
 * with multiple gradient layers for a painterly dusk-into-night feel.
 */
export function PhandalinScene() {
  return (
    <div className="relative w-full h-48 md:h-56 border-2 border-[var(--color-border-warm)] overflow-hidden mb-6">
      <svg
        viewBox="0 0 800 220"
        preserveAspectRatio="xMidYEnd slice"
        className="absolute inset-0 w-full h-full"
      >
        <defs>
          {/* Dusk sky */}
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a0e1a" />
            <stop offset="35%" stopColor="#3a1c1e" />
            <stop offset="65%" stopColor="#6b3a22" />
            <stop offset="100%" stopColor="#8c4a26" />
          </linearGradient>
          {/* Moon */}
          <radialGradient id="moon" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#fff5d1" />
            <stop offset="60%" stopColor="#f4d042" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#f4d042" stopOpacity="0" />
          </radialGradient>
          {/* Distant mountain */}
          <linearGradient id="mountains" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a0e10" />
            <stop offset="100%" stopColor="#3a1f1a" />
          </linearGradient>
          {/* Middle hills */}
          <linearGradient id="hills" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0e0608" />
            <stop offset="100%" stopColor="#1a0c0a" />
          </linearGradient>
          {/* Foreground ground */}
          <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a120a" />
            <stop offset="100%" stopColor="#0a0606" />
          </linearGradient>
          {/* Inn window glow */}
          <radialGradient id="inn-glow" cx="0.5" cy="0.6" r="0.5">
            <stop offset="0%" stopColor="#ffb347" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#ffb347" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Sky */}
        <rect x="0" y="0" width="800" height="220" fill="url(#sky)" />

        {/* Stars */}
        <g fill="#fff5d1" opacity="0.7">
          <rect x="60" y="14" width="1" height="1" />
          <rect x="120" y="22" width="1" height="1" />
          <rect x="180" y="10" width="1" height="1" />
          <rect x="260" y="28" width="1" height="1" />
          <rect x="320" y="16" width="1" height="1" />
          <rect x="480" y="20" width="1" height="1" />
          <rect x="540" y="32" width="1" height="1" />
          <rect x="610" y="14" width="1" height="1" />
          <rect x="690" y="24" width="1" height="1" />
          <rect x="740" y="12" width="1" height="1" />
        </g>

        {/* Moon */}
        <rect x="610" y="0" width="80" height="80" fill="url(#moon)" />
        <circle cx="650" cy="40" r="18" fill="#fff5d1" opacity="0.85" />
        <circle cx="657" cy="34" r="3" fill="#e0c878" opacity="0.5" />
        <circle cx="643" cy="46" r="2" fill="#e0c878" opacity="0.5" />

        {/* Distant mountain range */}
        <polygon
          points="0,140 80,90 130,110 180,80 240,100 310,75 370,100 430,85 510,110 580,90 660,108 730,95 800,120 800,180 0,180"
          fill="url(#mountains)"
        />

        {/* Closer hills */}
        <polygon
          points="0,160 60,135 140,150 220,130 320,148 420,135 500,150 600,140 700,152 800,140 800,200 0,200"
          fill="url(#hills)"
        />

        {/* Tresendar Manor — ruined tower on the left */}
        <g>
          {/* Tower body */}
          <rect x="80" y="110" width="60" height="80" fill="#2a1a14" stroke="#0a0606" strokeWidth="1" />
          <rect x="80" y="110" width="60" height="6" fill="#3a2a1c" />
          {/* Broken battlements */}
          <rect x="80" y="106" width="10" height="6" fill="#2a1a14" />
          <rect x="98" y="100" width="8" height="10" fill="#2a1a14" />
          <rect x="116" y="108" width="8" height="4" fill="#2a1a14" />
          <rect x="130" y="106" width="10" height="6" fill="#2a1a14" />
          {/* Crack down the side */}
          <line x1="98" y1="110" x2="92" y2="190" stroke="#0a0606" strokeWidth="2" />
          <line x1="120" y1="116" x2="124" y2="190" stroke="#0a0606" strokeWidth="1" />
          {/* Empty windows */}
          <rect x="92" y="130" width="6" height="10" fill="#0a0606" />
          <rect x="118" y="135" width="6" height="10" fill="#0a0606" />
          <rect x="92" y="155" width="6" height="10" fill="#0a0606" />
          <rect x="118" y="160" width="6" height="10" fill="#0a0606" />
          {/* Manor walls behind tower */}
          <rect x="40" y="155" width="40" height="40" fill="#1a120c" stroke="#0a0606" strokeWidth="1" />
          <rect x="60" y="170" width="8" height="14" fill="#0a0606" />
          {/* Tower base / collapse */}
          <polygon points="80,190 60,200 80,200" fill="#0e0606" />
          <polygon points="140,190 160,200 140,200" fill="#0e0606" />
        </g>

        {/* Stonehill Inn — center, warm */}
        <g>
          {/* Glow halo */}
          <rect x="290" y="120" width="220" height="80" fill="url(#inn-glow)" />
          {/* Building body */}
          <rect x="320" y="140" width="160" height="55" fill="#3a2418" stroke="#0a0606" strokeWidth="1" />
          {/* Stone foundation */}
          <rect x="316" y="180" width="168" height="15" fill="#1a120c" stroke="#0a0606" strokeWidth="1" />
          {/* Thatched roof */}
          <polygon
            points="310,142 400,108 490,142 480,148 320,148"
            fill="#5a3a22"
            stroke="#1a120c"
            strokeWidth="1"
          />
          <polygon
            points="320,148 400,116 480,148 470,154 330,154"
            fill="#3a2414"
          />
          {/* Chimney */}
          <rect x="430" y="118" width="12" height="22" fill="#2a1a10" stroke="#0a0606" strokeWidth="1" />
          <rect x="428" y="116" width="16" height="3" fill="#2a1a10" />
          {/* Smoke */}
          <ellipse cx="436" cy="106" rx="6" ry="4" fill="#3a2a1c" opacity="0.6" />
          <ellipse cx="442" cy="96" rx="8" ry="5" fill="#2a1a10" opacity="0.5" />
          <ellipse cx="448" cy="84" rx="10" ry="6" fill="#1a0e08" opacity="0.4" />
          {/* Door */}
          <rect x="392" y="158" width="14" height="22" fill="#1a0e08" stroke="#0a0606" strokeWidth="1" />
          <rect x="394" y="164" width="2" height="2" fill="#ffb347" />
          {/* Windows with warm light */}
          <rect x="338" y="155" width="14" height="14" fill="#ffb347" />
          <rect x="340" y="157" width="10" height="10" fill="#f4d042" />
          <line x1="345" y1="155" x2="345" y2="169" stroke="#3a2418" strokeWidth="1" />
          <line x1="338" y1="162" x2="352" y2="162" stroke="#3a2418" strokeWidth="1" />
          <rect x="446" y="155" width="14" height="14" fill="#ffb347" />
          <rect x="448" y="157" width="10" height="10" fill="#f4d042" />
          <line x1="453" y1="155" x2="453" y2="169" stroke="#3a2418" strokeWidth="1" />
          <line x1="446" y1="162" x2="460" y2="162" stroke="#3a2418" strokeWidth="1" />
          {/* Hanging sign */}
          <line x1="320" y1="150" x2="320" y2="165" stroke="#1a120c" strokeWidth="1" />
          <rect x="310" y="160" width="20" height="10" fill="#5a3a22" stroke="#0a0606" strokeWidth="1" />
          <rect x="315" y="163" width="10" height="4" fill="#3a2418" />
        </g>

        {/* Druid Grove — right, ancient oak */}
        <g>
          {/* Trunk */}
          <path
            d="M 690 200 L 692 150 L 685 140 L 695 130 L 700 120 L 708 110 L 716 100 L 720 95 L 728 110 L 730 130 L 728 150 L 730 200 Z"
            fill="#1f0e08"
            stroke="#0a0606"
            strokeWidth="1"
          />
          {/* Roots */}
          <path d="M 680 200 L 690 180 L 700 200" fill="#1a0c08" stroke="#0a0606" strokeWidth="0.5" />
          <path d="M 720 200 L 730 180 L 740 200" fill="#1a0c08" stroke="#0a0606" strokeWidth="0.5" />
          {/* Canopy mass */}
          <ellipse cx="710" cy="80" rx="55" ry="32" fill="#1a2e1a" />
          <ellipse cx="685" cy="90" rx="35" ry="22" fill="#1a2e1a" />
          <ellipse cx="735" cy="92" rx="32" ry="20" fill="#1a2e1a" />
          {/* Leaf highlights */}
          <ellipse cx="700" cy="68" rx="20" ry="12" fill="#2d4a22" opacity="0.7" />
          <ellipse cx="720" cy="82" rx="15" ry="9" fill="#2d4a22" opacity="0.6" />
          <ellipse cx="680" cy="84" rx="12" ry="7" fill="#2d4a22" opacity="0.5" />
          {/* Glowing fey-light in the canopy */}
          <circle cx="700" cy="80" r="3" fill="#a8d042" opacity="0.6" />
          <circle cx="725" cy="78" r="2" fill="#a8d042" opacity="0.5" />
          {/* Standing stones at the base */}
          <rect x="668" y="184" width="6" height="14" fill="#3a2a22" />
          <rect x="666" y="182" width="10" height="2" fill="#3a2a22" />
          <rect x="744" y="186" width="6" height="12" fill="#3a2a22" />
          <rect x="742" y="184" width="10" height="2" fill="#3a2a22" />
        </g>

        {/* Foreground ground */}
        <rect x="0" y="195" width="800" height="25" fill="url(#ground)" />

        {/* Path / road suggestion */}
        <path d="M 0 210 Q 400 196 800 208" stroke="#3a2a1a" strokeWidth="2" fill="none" opacity="0.7" />

        {/* Subtle title text — town name engraved in stone */}
      </svg>
      {/* Inn warm glow as a CSS pseudo on top (gives it a flicker feel) */}
      <div className="absolute left-[42%] top-[55%] w-32 h-20 rounded-full bg-[var(--color-accent-amber)] opacity-15 blur-2xl pointer-events-none animate-pulse-glow" />
    </div>
  );
}
