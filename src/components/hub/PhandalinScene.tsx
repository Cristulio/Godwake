/**
 * Painted Phandalin skyline — Tresendar Manor (left, ruined), Stonehill Inn
 * (center, warm), Druid Grove (right, ancient oak). Rendered as inline SVG
 * with multiple gradient layers for a painterly dusk-into-night feel.
 *
 * Ambient life: chimney smoke, flickering torches, distant birds, swaying
 * grass, a villager in a doorway, a cart by the well, a flock of crows.
 * The Iron Cells stairwell shows as a darker opening at the manor base.
 * The Druid Grove only renders if `druidGroveUnlocked` — before it's unlocked,
 * the painted treeline is a quiet, undifferentiated dark mass.
 */
interface PhandalinSceneProps {
  druidGroveUnlocked?: boolean;
}

export function PhandalinScene({ druidGroveUnlocked = true }: PhandalinSceneProps = {}) {
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
          {/* Cooler dusk overlay — breathes in/out on top of base sky */}
          <linearGradient id="sky-cool" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0e0a24" />
            <stop offset="50%" stopColor="#241830" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#3a2238" stopOpacity="0" />
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
          {/* Torch / lantern radial halo */}
          <radialGradient id="torch-halo" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#ffd07a" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#ffb347" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ffb347" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Sky */}
        <rect x="0" y="0" width="800" height="220" fill="url(#sky)" />

        {/* Sky breathing overlay — long slow cool shift */}
        <rect
          x="0"
          y="0"
          width="800"
          height="220"
          fill="url(#sky-cool)"
          className="animate-sky-breathe"
        />

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

        {/* Distant birds — a small flock of crows drifting across at different cadences */}
        <g
          className="animate-bird-fly"
          style={{ animationDelay: '0s', animationDuration: '22s' }}
        >
          <path
            d="M 0 40 q 3 -3 6 0 q 3 -3 6 0"
            stroke="#1a0e10"
            strokeWidth="1.2"
            fill="none"
          />
        </g>
        <g
          className="animate-bird-fly"
          style={{ animationDelay: '-9s', animationDuration: '26s' }}
        >
          <path
            d="M 0 58 q 2.4 -2.4 4.8 0 q 2.4 -2.4 4.8 0"
            stroke="#1a0e10"
            strokeWidth="1"
            fill="none"
          />
        </g>
        <g
          className="animate-bird-fly"
          style={{ animationDelay: '-4s', animationDuration: '30s' }}
        >
          <path
            d="M 0 46 q 2.2 -2.2 4.4 0 q 2.2 -2.2 4.4 0"
            stroke="#1a0e10"
            strokeWidth="0.9"
            fill="none"
          />
        </g>
        <g
          className="animate-bird-fly"
          style={{ animationDelay: '-15s', animationDuration: '24s' }}
        >
          <path
            d="M 0 70 q 2.6 -2.6 5.2 0 q 2.6 -2.6 5.2 0"
            stroke="#1a0e10"
            strokeWidth="1.0"
            fill="none"
          />
        </g>
        <g
          className="animate-bird-fly"
          style={{ animationDelay: '-2s', animationDuration: '34s' }}
        >
          <path
            d="M 0 32 q 2 -2 4 0 q 2 -2 4 0"
            stroke="#1a0e10"
            strokeWidth="0.8"
            fill="none"
          />
        </g>

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
          {/* A single ember in one of the windows — someone's holed up in the ruin */}
          <rect
            x="118"
            y="135"
            width="6"
            height="10"
            fill="#a8421a"
            opacity="0.85"
            className="animate-torch-flicker"
            style={{ animationDelay: '-1.4s', animationDuration: '4.1s' }}
          />
          {/* Manor walls behind tower */}
          <rect x="40" y="155" width="40" height="40" fill="#1a120c" stroke="#0a0606" strokeWidth="1" />
          {/* Iron Cells stairwell — a dark square opening in the manor base
              with stone steps descending into pure black. The way down. */}
          <rect x="56" y="172" width="14" height="22" fill="#020000" stroke="#0a0606" strokeWidth="1" />
          <polygon points="56,172 56,168 70,168 70,172" fill="#1a120c" />
          {/* Steps descending — staggered shadow bands */}
          <rect x="58" y="176" width="10" height="1.5" fill="#0a0606" opacity="0.95" />
          <rect x="58" y="180" width="10" height="1.5" fill="#0a0606" opacity="0.9" />
          <rect x="58" y="184" width="10" height="1.5" fill="#0a0606" opacity="0.85" />
          <rect x="58" y="188" width="10" height="1.5" fill="#0a0606" opacity="0.8" />
          {/* Faint cell-bar grid carved on the lintel */}
          <line x1="58" y1="169" x2="58" y2="172" stroke="#3a2418" strokeWidth="0.6" />
          <line x1="62" y1="169" x2="62" y2="172" stroke="#3a2418" strokeWidth="0.6" />
          <line x1="66" y1="169" x2="66" y2="172" stroke="#3a2418" strokeWidth="0.6" />
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
          {/* Chimney smoke — two staggered wisps so the column never stops */}
          <g
            className="animate-smoke-drift"
            style={{ transformOrigin: '436px 116px', animationDelay: '0s' }}
          >
            <ellipse cx="436" cy="110" rx="5" ry="3.5" fill="#3a2a1c" />
            <ellipse cx="438" cy="100" rx="6" ry="4" fill="#2a1a10" />
            <ellipse cx="436" cy="90" rx="7" ry="4.5" fill="#1a0e08" />
          </g>
          <g
            className="animate-smoke-drift"
            style={{ transformOrigin: '436px 116px', animationDelay: '-3.2s' }}
          >
            <ellipse cx="434" cy="112" rx="4" ry="3" fill="#3a2a1c" />
            <ellipse cx="437" cy="102" rx="5" ry="3.5" fill="#2a1a10" />
            <ellipse cx="435" cy="92" rx="6" ry="4" fill="#1a0e08" />
          </g>
          {/* Door */}
          <rect x="392" y="158" width="14" height="22" fill="#1a0e08" stroke="#0a0606" strokeWidth="1" />
          <rect x="394" y="164" width="2" height="2" fill="#ffb347" />
          {/* Lantern halo over the door */}
          <rect
            x="380"
            y="146"
            width="38"
            height="38"
            fill="url(#torch-halo)"
            className="animate-torch-flicker"
            style={{ animationDelay: '-0.6s', animationDuration: '3.4s' }}
          />
          {/* Villager silhouette in the doorway — leaning out, watching the road */}
          <g>
            <rect x="396" y="164" width="6" height="14" fill="#0a0604" />
            <rect x="397" y="160" width="4" height="5" fill="#0a0604" />
            {/* Warm rim-light from the lantern */}
            <rect x="395" y="160" width="1" height="20" fill="#ffb347" opacity="0.55" />
          </g>
          {/* Windows with warm light */}
          <rect x="338" y="155" width="14" height="14" fill="#ffb347" />
          <rect x="340" y="157" width="10" height="10" fill="#f4d042" />
          <line x1="345" y1="155" x2="345" y2="169" stroke="#3a2418" strokeWidth="1" />
          <line x1="338" y1="162" x2="352" y2="162" stroke="#3a2418" strokeWidth="1" />
          {/* Left window flicker halo */}
          <rect
            x="326"
            y="145"
            width="38"
            height="34"
            fill="url(#torch-halo)"
            className="animate-torch-flicker"
            style={{ animationDelay: '-2.1s', animationDuration: '3.8s' }}
          />
          <rect x="446" y="155" width="14" height="14" fill="#ffb347" />
          <rect x="448" y="157" width="10" height="10" fill="#f4d042" />
          <line x1="453" y1="155" x2="453" y2="169" stroke="#3a2418" strokeWidth="1" />
          <line x1="446" y1="162" x2="460" y2="162" stroke="#3a2418" strokeWidth="1" />
          {/* Right window flicker halo */}
          <rect
            x="434"
            y="145"
            width="38"
            height="34"
            fill="url(#torch-halo)"
            className="animate-torch-flicker"
            style={{ animationDelay: '-1.1s', animationDuration: '3.0s' }}
          />
          {/* Hanging sign */}
          <line x1="320" y1="150" x2="320" y2="165" stroke="#1a120c" strokeWidth="1" />
          <rect x="310" y="160" width="20" height="10" fill="#5a3a22" stroke="#0a0606" strokeWidth="1" />
          <rect x="315" y="163" width="10" height="4" fill="#3a2418" />
        </g>

        {/* Town well + cart, between the inn and the grove */}
        <g>
          {/* Well — stone ring */}
          <ellipse cx="552" cy="200" rx="10" ry="3" fill="#2a1c14" />
          <rect x="544" y="192" width="16" height="8" fill="#3a2820" stroke="#0a0606" strokeWidth="0.8" />
          <rect x="544" y="192" width="16" height="2" fill="#5a4030" />
          {/* Well roof posts */}
          <rect x="544" y="178" width="2" height="14" fill="#1a120c" />
          <rect x="558" y="178" width="2" height="14" fill="#1a120c" />
          {/* Roof */}
          <polygon points="540,180 552,170 564,180 562,182 542,182" fill="#3a2418" stroke="#1a120c" strokeWidth="0.8" />
          {/* Bucket on the rope */}
          <line x1="552" y1="180" x2="552" y2="190" stroke="#3a2418" strokeWidth="0.5" />
          <rect x="550" y="188" width="4" height="3" fill="#5a4030" />

          {/* Cart parked beside the well */}
          <g>
            <rect x="500" y="195" width="36" height="5" fill="#5a3a22" stroke="#0a0606" strokeWidth="0.8" />
            <rect x="500" y="195" width="36" height="1" fill="#7a5630" />
            <line x1="502" y1="194" x2="534" y2="194" stroke="#3a2418" strokeWidth="0.6" />
            <circle cx="507" cy="202" r="3" fill="#1a120c" stroke="#3a2418" strokeWidth="0.6" />
            <circle cx="507" cy="202" r="1" fill="#3a2418" />
            <circle cx="529" cy="202" r="3" fill="#1a120c" stroke="#3a2418" strokeWidth="0.6" />
            <circle cx="529" cy="202" r="1" fill="#3a2418" />
            <line x1="498" y1="198" x2="488" y2="200" stroke="#3a2418" strokeWidth="1" />
            <rect x="514" y="190" width="8" height="6" fill="#3a2418" stroke="#1a120c" strokeWidth="0.5" />
            <line x1="514" y1="193" x2="522" y2="193" stroke="#1a120c" strokeWidth="0.4" />
            <line x1="518" y1="190" x2="518" y2="196" stroke="#1a120c" strokeWidth="0.4" />
          </g>
        </g>

        {/* Druid Grove — right, ancient oak. Only painted when unlocked.
            When sealed, a dark undifferentiated treeline holds the silhouette
            so the skyline isn't empty. */}
        {druidGroveUnlocked ? (
          <g>
            {/* Backing treeline — softer hint of the deeper grove */}
            <path
              d="M 624 162 L 632 152 L 640 158 L 650 148 L 660 156 L 670 146 L 680 156 L 690 148 L 700 158 L 712 150 L 724 158 L 736 152 L 750 158 L 762 154 L 774 158 L 786 152 L 800 158 L 800 200 L 624 200 Z"
              fill="#0a1208"
              opacity="0.85"
            />
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
            <circle
              cx="700"
              cy="80"
              r="3"
              fill="#a8d042"
              opacity="0.6"
              className="animate-torch-flicker"
              style={{ animationDelay: '-0.3s', animationDuration: '4.6s' }}
            />
            <circle
              cx="725"
              cy="78"
              r="2"
              fill="#a8d042"
              opacity="0.5"
              className="animate-torch-flicker"
              style={{ animationDelay: '-2.4s', animationDuration: '5.1s' }}
            />
            {/* Standing stones at the base */}
            <rect x="668" y="184" width="6" height="14" fill="#3a2a22" />
            <rect x="666" y="182" width="10" height="2" fill="#3a2a22" />
            <rect x="744" y="186" width="6" height="12" fill="#3a2a22" />
            <rect x="742" y="184" width="10" height="2" fill="#3a2a22" />
          </g>
        ) : (
          <g opacity="0.95">
            <path
              d="M 624 168 L 632 154 L 640 162 L 650 150 L 660 158 L 670 146 L 680 158 L 690 148 L 700 160 L 712 150 L 724 160 L 736 152 L 750 160 L 762 154 L 774 160 L 786 152 L 800 160 L 800 200 L 624 200 Z"
              fill="#0a0a0a"
            />
            <path
              d="M 624 168 L 632 154 L 640 162 L 650 150 L 660 158 L 670 146 L 680 158 L 690 148 L 700 160 L 712 150 L 724 160 L 736 152 L 750 160 L 762 154 L 774 160 L 786 152 L 800 160"
              fill="none"
              stroke="#1a1a1a"
              strokeWidth="0.8"
            />
          </g>
        )}

        {/* Foreground ground */}
        <rect x="0" y="195" width="800" height="25" fill="url(#ground)" />

        {/* Path / road suggestion */}
        <path d="M 0 210 Q 400 196 800 208" stroke="#3a2a1a" strokeWidth="2" fill="none" opacity="0.7" />

        {/* Foreground grass / weeds — small swaying clusters across the base */}
        <g
          className="animate-grass-sway"
          style={{ transformOrigin: '170px 213px', animationDelay: '0s' }}
        >
          <line x1="168" y1="213" x2="166" y2="204" stroke="#2a3a18" strokeWidth="1" />
          <line x1="170" y1="213" x2="170" y2="202" stroke="#3a4a20" strokeWidth="1" />
          <line x1="172" y1="213" x2="174" y2="205" stroke="#2a3a18" strokeWidth="1" />
        </g>
        <g
          className="animate-grass-sway"
          style={{ transformOrigin: '258px 213px', animationDelay: '-1.1s', animationDuration: '3.6s' }}
        >
          <line x1="256" y1="213" x2="255" y2="206" stroke="#2a3a18" strokeWidth="1" />
          <line x1="258" y1="213" x2="258" y2="203" stroke="#3a4a20" strokeWidth="1" />
          <line x1="260" y1="213" x2="262" y2="207" stroke="#2a3a18" strokeWidth="1" />
        </g>
        <g
          className="animate-grass-sway"
          style={{ transformOrigin: '516px 213px', animationDelay: '-0.6s', animationDuration: '2.7s' }}
        >
          <line x1="514" y1="213" x2="513" y2="205" stroke="#2a3a18" strokeWidth="1" />
          <line x1="516" y1="213" x2="516" y2="202" stroke="#3a4a20" strokeWidth="1" />
          <line x1="518" y1="213" x2="520" y2="206" stroke="#2a3a18" strokeWidth="1" />
        </g>
        <g
          className="animate-grass-sway"
          style={{ transformOrigin: '604px 213px', animationDelay: '-1.8s', animationDuration: '3.2s' }}
        >
          <line x1="602" y1="213" x2="601" y2="207" stroke="#2a3a18" strokeWidth="1" />
          <line x1="604" y1="213" x2="604" y2="204" stroke="#3a4a20" strokeWidth="1" />
          <line x1="606" y1="213" x2="608" y2="206" stroke="#2a3a18" strokeWidth="1" />
        </g>
        <g
          className="animate-grass-sway"
          style={{ transformOrigin: '60px 213px', animationDelay: '-2.4s', animationDuration: '3.4s' }}
        >
          <line x1="58" y1="213" x2="57" y2="206" stroke="#2a3a18" strokeWidth="1" />
          <line x1="60" y1="213" x2="60" y2="203" stroke="#3a4a20" strokeWidth="1" />
          <line x1="62" y1="213" x2="64" y2="207" stroke="#2a3a18" strokeWidth="1" />
        </g>
      </svg>
      {/* Inn warm glow as a CSS pseudo on top (gives it a flicker feel) */}
      <div className="absolute left-[42%] top-[55%] w-32 h-20 rounded-full bg-[var(--color-accent-amber)] opacity-15 blur-2xl pointer-events-none animate-pulse-glow" />
    </div>
  );
}
