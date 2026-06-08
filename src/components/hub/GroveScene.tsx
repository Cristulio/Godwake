/**
 * Painted Druid Grove interior — a clearing at moonrise. Ancient oaks ring a
 * Wellspring pool that catches the moon, with standing stones half-buried in
 * moss. Companion piece to PhandalinScene.
 */
export function GroveScene() {
  return (
    <div className="relative w-full h-20 md:h-24 border-2 border-[var(--color-border-warm)] overflow-hidden">
      <svg
        viewBox="0 0 800 220"
        preserveAspectRatio="xMidYEnd slice"
        className="absolute inset-0 w-full h-full"
      >
        <defs>
          <linearGradient id="grove-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0c0a18" />
            <stop offset="40%" stopColor="#1c1830" />
            <stop offset="80%" stopColor="#2a2638" />
            <stop offset="100%" stopColor="#1a1622" />
          </linearGradient>
          <radialGradient id="grove-moon" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#f8f4e0" />
            <stop offset="50%" stopColor="#d8d8b4" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#d8d8b4" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="grove-canopy" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0a1408" />
            <stop offset="100%" stopColor="#1a2e1a" />
          </linearGradient>
          <radialGradient id="wellspring" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#a8d042" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#3a6a32" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#1a2e1a" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="grove-ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#141008" />
            <stop offset="100%" stopColor="#0a0806" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="800" height="220" fill="url(#grove-sky)" />

        <g fill="#e8e4c4" opacity="0.7">
          <rect x="70" y="14" width="1" height="1" />
          <rect x="140" y="22" width="1" height="1" />
          <rect x="200" y="10" width="1" height="1" />
          <rect x="280" y="28" width="1" height="1" />
          <rect x="340" y="16" width="1" height="1" />
          <rect x="500" y="20" width="1" height="1" />
          <rect x="560" y="32" width="1" height="1" />
          <rect x="630" y="14" width="1" height="1" />
          <rect x="710" y="24" width="1" height="1" />
          <rect x="760" y="12" width="1" height="1" />
        </g>

        <rect x="80" y="0" width="80" height="80" fill="url(#grove-moon)" />
        <circle cx="120" cy="40" r="20" fill="#f8f4e0" opacity="0.9" />
        <circle cx="126" cy="34" r="3" fill="#c8c4a0" opacity="0.5" />
        <circle cx="114" cy="46" r="2" fill="#c8c4a0" opacity="0.5" />

        <polygon
          points="0,150 80,110 160,135 240,115 320,140 400,118 480,138 560,118 640,135 720,115 800,138 800,200 0,200"
          fill="url(#grove-canopy)"
        />

        <g>
          <path
            d="M 50 200 L 56 130 L 48 115 L 56 100 L 66 88 L 76 76 L 82 88 L 88 105 L 84 125 L 92 200 Z"
            fill="#0e0806"
            stroke="#000"
            strokeWidth="0.5"
          />
          <ellipse cx="68" cy="58" rx="42" ry="28" fill="#0a1408" />
          <ellipse cx="48" cy="68" rx="28" ry="18" fill="#0a1408" />
          <ellipse cx="92" cy="66" rx="30" ry="20" fill="#0a1408" />
          <ellipse cx="62" cy="48" rx="16" ry="10" fill="#1a2e1a" opacity="0.7" />
          <circle cx="60" cy="52" r="2" fill="#a8d042" opacity="0.6" />
          <circle cx="82" cy="56" r="1.5" fill="#a8d042" opacity="0.5" />
        </g>

        <g>
          <path
            d="M 718 200 L 722 120 L 714 105 L 724 88 L 736 74 L 748 60 L 758 74 L 762 92 L 758 118 L 766 200 Z"
            fill="#0e0806"
            stroke="#000"
            strokeWidth="0.5"
          />
          <ellipse cx="740" cy="44" rx="46" ry="30" fill="#0a1408" />
          <ellipse cx="712" cy="58" rx="28" ry="18" fill="#0a1408" />
          <ellipse cx="772" cy="58" rx="28" ry="18" fill="#0a1408" />
          <ellipse cx="744" cy="36" rx="20" ry="12" fill="#1a2e1a" opacity="0.7" />
          <circle cx="742" cy="38" r="2.5" fill="#a8d042" opacity="0.6" />
          <circle cx="722" cy="48" r="1.5" fill="#a8d042" opacity="0.5" />
          <circle cx="762" cy="50" r="1.5" fill="#a8d042" opacity="0.5" />
        </g>

        <g>
          <path d="M 180 200 L 184 140 L 180 130 L 188 120 L 198 130 L 196 145 L 202 200 Z" fill="#0e0806" />
          <ellipse cx="190" cy="110" rx="24" ry="16" fill="#0a1408" />
          <circle cx="190" cy="106" r="1.5" fill="#a8d042" opacity="0.5" />

          <path d="M 600 200 L 604 140 L 600 128 L 610 118 L 620 130 L 618 145 L 624 200 Z" fill="#0e0806" />
          <ellipse cx="612" cy="108" rx="26" ry="17" fill="#0a1408" />
          <circle cx="612" cy="104" r="1.5" fill="#a8d042" opacity="0.5" />
        </g>

        <ellipse cx="400" cy="180" rx="120" ry="20" fill="url(#wellspring)" />
        <ellipse cx="400" cy="178" rx="100" ry="14" fill="#2d4a22" opacity="0.7" />
        <ellipse cx="400" cy="176" rx="80" ry="10" fill="#1a2e1a" opacity="0.6" />
        <ellipse cx="380" cy="174" rx="14" ry="2" fill="#a8d042" opacity="0.6" />
        <ellipse cx="420" cy="176" rx="10" ry="1.5" fill="#a8d042" opacity="0.5" />
        <ellipse cx="400" cy="172" rx="6" ry="1" fill="#f8f4e0" opacity="0.7" />

        <g fill="#2a2218" stroke="#0a0606" strokeWidth="0.5">
          <rect x="290" y="158" width="8" height="28" />
          <rect x="288" y="156" width="12" height="3" />
          <rect x="502" y="156" width="8" height="30" />
          <rect x="500" y="154" width="12" height="3" />
          <rect x="346" y="166" width="6" height="22" transform="rotate(-8 349 177)" />
          <rect x="448" y="166" width="6" height="22" transform="rotate(8 451 177)" />
        </g>

        <g fill="#a8d042" opacity="0.8">
          <circle cx="260" cy="150" r="1.2">
            <animate attributeName="opacity" values="0.8;0.2;0.8" dur="3.2s" repeatCount="indefinite" />
          </circle>
          <circle cx="540" cy="148" r="1.2">
            <animate attributeName="opacity" values="0.2;0.8;0.2" dur="2.8s" repeatCount="indefinite" />
          </circle>
          <circle cx="430" cy="158" r="1" >
            <animate attributeName="opacity" values="0.8;0.3;0.8" dur="2.4s" repeatCount="indefinite" />
          </circle>
          <circle cx="370" cy="156" r="1">
            <animate attributeName="opacity" values="0.3;0.9;0.3" dur="3.6s" repeatCount="indefinite" />
          </circle>
        </g>

        <rect x="0" y="195" width="800" height="25" fill="url(#grove-ground)" />
      </svg>
      <div className="absolute left-[50%] top-[78%] -translate-x-1/2 w-48 h-12 rounded-full bg-[#a8d042] opacity-15 blur-2xl pointer-events-none animate-pulse-glow" />
    </div>
  );
}
