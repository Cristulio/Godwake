/**
 * Painted Athkatla skyline — the City of Coin at dawn over the Sea of Swords.
 * Gilded domes, marble spires, the harbor wall and merchant ships in silhouette.
 * Companion piece to PhandalinScene and GroveScene.
 */
export function AthkatlaScene() {
  return (
    <div className="relative w-full h-48 md:h-56 border-2 border-[var(--color-border-warm)] overflow-hidden mb-6">
      <svg
        viewBox="0 0 800 220"
        preserveAspectRatio="xMidYEnd slice"
        className="absolute inset-0 w-full h-full"
      >
        <defs>
          {/* Dawn sky — gold over rose over deep blue */}
          <linearGradient id="ath-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a1638" />
            <stop offset="35%" stopColor="#4a2c4a" />
            <stop offset="65%" stopColor="#a86a3a" />
            <stop offset="100%" stopColor="#e8b860" />
          </linearGradient>
          {/* Rising sun */}
          <radialGradient id="ath-sun" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#fff4c8" />
            <stop offset="55%" stopColor="#f4b840" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#f4b840" stopOpacity="0" />
          </radialGradient>
          {/* Sea — gold-touched mercury */}
          <linearGradient id="ath-sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5a4a3c" />
            <stop offset="50%" stopColor="#2a2418" />
            <stop offset="100%" stopColor="#140c08" />
          </linearGradient>
          {/* Distant city silhouette */}
          <linearGradient id="ath-far" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3a2c40" />
            <stop offset="100%" stopColor="#1a1428" />
          </linearGradient>
          {/* Mid city — gilded stone */}
          <linearGradient id="ath-mid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c8a45a" />
            <stop offset="100%" stopColor="#5a3a1c" />
          </linearGradient>
          {/* Dome highlight */}
          <radialGradient id="ath-dome" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#ffd870" />
            <stop offset="60%" stopColor="#c8902a" />
            <stop offset="100%" stopColor="#5a3a14" />
          </radialGradient>
          {/* Foreground harbor wall */}
          <linearGradient id="ath-wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3a2418" />
            <stop offset="100%" stopColor="#140c06" />
          </linearGradient>
        </defs>

        {/* Sky */}
        <rect x="0" y="0" width="800" height="220" fill="url(#ath-sky)" />

        {/* Sun bloom */}
        <rect x="320" y="20" width="160" height="120" fill="url(#ath-sun)" />
        <circle cx="400" cy="80" r="22" fill="#fff4c8" opacity="0.95" />

        {/* Reflection on the sea */}
        <ellipse cx="400" cy="170" rx="180" ry="6" fill="#ffd870" opacity="0.35" />
        <ellipse cx="400" cy="174" rx="120" ry="3" fill="#ffd870" opacity="0.25" />

        {/* Far hills / distant towers */}
        <polygon
          points="0,140 60,128 110,135 160,120 220,134 280,118 340,128 460,118 520,130 580,114 640,128 710,120 800,134 800,180 0,180"
          fill="url(#ath-far)"
        />
        {/* Distant skinny spires */}
        <g fill="#2a1f38">
          <rect x="70" y="118" width="3" height="18" />
          <rect x="148" y="106" width="3" height="22" />
          <rect x="252" y="100" width="3" height="26" />
          <rect x="528" y="110" width="3" height="22" />
          <rect x="640" y="108" width="3" height="22" />
          <rect x="710" y="100" width="3" height="22" />
        </g>

        {/* Sea band */}
        <rect x="0" y="148" width="800" height="32" fill="url(#ath-sea)" />
        {/* Subtle sea highlights */}
        <g fill="#9a7a4a" opacity="0.35">
          <rect x="40" y="156" width="20" height="1" />
          <rect x="120" y="160" width="28" height="1" />
          <rect x="220" y="158" width="22" height="1" />
          <rect x="500" y="160" width="24" height="1" />
          <rect x="600" y="156" width="30" height="1" />
          <rect x="720" y="160" width="20" height="1" />
        </g>

        {/* Merchant ships in silhouette */}
        <g fill="#1a0e08" stroke="#0a0606" strokeWidth="0.5">
          {/* Left ship */}
          <polygon points="120,162 158,162 152,170 126,170" />
          <line x1="139" y1="162" x2="139" y2="142" stroke="#1a0e08" strokeWidth="1" />
          <polygon points="139,144 139,160 152,160" fill="#3a2418" />
          <polygon points="139,144 139,156 128,156" fill="#3a2418" />
          {/* Right ship — smaller */}
          <polygon points="610,164 638,164 634,170 614,170" />
          <line x1="624" y1="164" x2="624" y2="148" stroke="#1a0e08" strokeWidth="1" />
          <polygon points="624,150 624,162 634,162" fill="#3a2418" />
        </g>

        {/* === The city itself, sweeping from left to right === */}

        {/* Left district — walled tenements */}
        <g>
          <rect x="20" y="115" width="120" height="40" fill="url(#ath-mid)" stroke="#2a1808" strokeWidth="1" />
          <rect x="20" y="115" width="120" height="4" fill="#5a3a1c" />
          {/* Windows */}
          <g fill="#ffd870" opacity="0.7">
            <rect x="32" y="124" width="4" height="6" />
            <rect x="48" y="124" width="4" height="6" />
            <rect x="64" y="124" width="4" height="6" />
            <rect x="80" y="124" width="4" height="6" />
            <rect x="96" y="124" width="4" height="6" />
            <rect x="112" y="124" width="4" height="6" />
            <rect x="124" y="124" width="4" height="6" />
            <rect x="40" y="138" width="4" height="6" />
            <rect x="72" y="138" width="4" height="6" />
            <rect x="104" y="138" width="4" height="6" />
          </g>
          {/* Square tower */}
          <rect x="50" y="92" width="22" height="62" fill="url(#ath-mid)" stroke="#2a1808" strokeWidth="1" />
          <rect x="48" y="88" width="26" height="6" fill="#7a4e22" stroke="#2a1808" strokeWidth="1" />
          <rect x="58" y="100" width="6" height="8" fill="#1a0e06" />
          <rect x="58" y="116" width="6" height="8" fill="#1a0e06" />
        </g>

        {/* The Great Dome — center, gilded */}
        <g>
          {/* Drum */}
          <rect x="356" y="98" width="88" height="22" fill="url(#ath-mid)" stroke="#2a1808" strokeWidth="1" />
          <rect x="356" y="98" width="88" height="3" fill="#7a4e22" />
          <g fill="#1a0e06">
            <rect x="368" y="104" width="4" height="10" />
            <rect x="384" y="104" width="4" height="10" />
            <rect x="400" y="104" width="4" height="10" />
            <rect x="416" y="104" width="4" height="10" />
            <rect x="428" y="104" width="4" height="10" />
          </g>
          {/* Dome itself */}
          <path
            d="M 356 98 Q 400 36 444 98 Z"
            fill="url(#ath-dome)"
            stroke="#2a1808"
            strokeWidth="1"
          />
          {/* Highlight stripe */}
          <path
            d="M 372 90 Q 400 50 428 90"
            fill="none"
            stroke="#ffe890"
            strokeWidth="2"
            opacity="0.55"
          />
          {/* Spire on top */}
          <rect x="398" y="28" width="4" height="10" fill="#7a4e22" />
          <polygon points="398,28 400,18 402,28" fill="#ffd870" />
          <circle cx="400" cy="32" r="2" fill="#ffd870" />
          {/* Flanking towers */}
          <rect x="338" y="80" width="14" height="74" fill="url(#ath-mid)" stroke="#2a1808" strokeWidth="1" />
          <polygon points="338,80 345,64 352,80" fill="#c8902a" stroke="#2a1808" strokeWidth="1" />
          <rect x="448" y="80" width="14" height="74" fill="url(#ath-mid)" stroke="#2a1808" strokeWidth="1" />
          <polygon points="448,80 455,64 462,80" fill="#c8902a" stroke="#2a1808" strokeWidth="1" />
          <rect x="342" y="100" width="4" height="6" fill="#1a0e06" />
          <rect x="342" y="116" width="4" height="6" fill="#1a0e06" />
          <rect x="342" y="132" width="4" height="6" fill="#1a0e06" />
          <rect x="454" y="100" width="4" height="6" fill="#1a0e06" />
          <rect x="454" y="116" width="4" height="6" fill="#1a0e06" />
          <rect x="454" y="132" width="4" height="6" fill="#1a0e06" />
        </g>

        {/* Right district — counting houses + the Coronet */}
        <g>
          <rect x="500" y="118" width="280" height="38" fill="url(#ath-mid)" stroke="#2a1808" strokeWidth="1" />
          <rect x="500" y="118" width="280" height="3" fill="#7a4e22" />
          {/* Stepped rooflines */}
          <rect x="520" y="100" width="34" height="20" fill="url(#ath-mid)" stroke="#2a1808" strokeWidth="1" />
          <rect x="580" y="92" width="40" height="28" fill="url(#ath-mid)" stroke="#2a1808" strokeWidth="1" />
          <rect x="640" y="104" width="32" height="16" fill="url(#ath-mid)" stroke="#2a1808" strokeWidth="1" />
          <rect x="700" y="96" width="34" height="24" fill="url(#ath-mid)" stroke="#2a1808" strokeWidth="1" />
          <rect x="748" y="108" width="28" height="14" fill="url(#ath-mid)" stroke="#2a1808" strokeWidth="1" />
          {/* Small dome — the Coronet */}
          <ellipse cx="600" cy="92" rx="18" ry="11" fill="url(#ath-dome)" stroke="#2a1808" strokeWidth="1" />
          <rect x="598" y="76" width="4" height="8" fill="#7a4e22" />
          <circle cx="600" cy="76" r="1.5" fill="#ffd870" />
          {/* Windows */}
          <g fill="#ffd870" opacity="0.7">
            <rect x="512" y="128" width="4" height="6" />
            <rect x="528" y="128" width="4" height="6" />
            <rect x="544" y="128" width="4" height="6" />
            <rect x="560" y="128" width="4" height="6" />
            <rect x="576" y="128" width="4" height="6" />
            <rect x="592" y="128" width="4" height="6" />
            <rect x="608" y="128" width="4" height="6" />
            <rect x="624" y="128" width="4" height="6" />
            <rect x="640" y="128" width="4" height="6" />
            <rect x="656" y="128" width="4" height="6" />
            <rect x="672" y="128" width="4" height="6" />
            <rect x="688" y="128" width="4" height="6" />
            <rect x="704" y="128" width="4" height="6" />
            <rect x="720" y="128" width="4" height="6" />
            <rect x="736" y="128" width="4" height="6" />
            <rect x="752" y="128" width="4" height="6" />
            <rect x="768" y="128" width="4" height="6" />
            <rect x="520" y="142" width="4" height="6" />
            <rect x="552" y="142" width="4" height="6" />
            <rect x="584" y="142" width="4" height="6" />
            <rect x="616" y="142" width="4" height="6" />
            <rect x="648" y="142" width="4" height="6" />
            <rect x="680" y="142" width="4" height="6" />
            <rect x="712" y="142" width="4" height="6" />
            <rect x="744" y="142" width="4" height="6" />
            <rect x="528" y="108" width="3" height="6" />
            <rect x="540" y="108" width="3" height="6" />
            <rect x="590" y="100" width="3" height="8" />
            <rect x="606" y="100" width="3" height="8" />
            <rect x="648" y="112" width="3" height="5" />
            <rect x="710" y="106" width="3" height="6" />
            <rect x="720" y="106" width="3" height="6" />
            <rect x="756" y="114" width="3" height="5" />
          </g>
        </g>

        {/* Harbor wall — foreground band */}
        <rect x="0" y="178" width="800" height="42" fill="url(#ath-wall)" />
        {/* Crenellations along the top of the wall */}
        <g fill="#3a2418">
          <rect x="10" y="174" width="10" height="4" />
          <rect x="40" y="174" width="10" height="4" />
          <rect x="70" y="174" width="10" height="4" />
          <rect x="100" y="174" width="10" height="4" />
          <rect x="130" y="174" width="10" height="4" />
          <rect x="160" y="174" width="10" height="4" />
          <rect x="190" y="174" width="10" height="4" />
          <rect x="220" y="174" width="10" height="4" />
          <rect x="250" y="174" width="10" height="4" />
          <rect x="280" y="174" width="10" height="4" />
          <rect x="310" y="174" width="10" height="4" />
          <rect x="340" y="174" width="10" height="4" />
          <rect x="370" y="174" width="10" height="4" />
          <rect x="400" y="174" width="10" height="4" />
          <rect x="430" y="174" width="10" height="4" />
          <rect x="460" y="174" width="10" height="4" />
          <rect x="490" y="174" width="10" height="4" />
          <rect x="520" y="174" width="10" height="4" />
          <rect x="550" y="174" width="10" height="4" />
          <rect x="580" y="174" width="10" height="4" />
          <rect x="610" y="174" width="10" height="4" />
          <rect x="640" y="174" width="10" height="4" />
          <rect x="670" y="174" width="10" height="4" />
          <rect x="700" y="174" width="10" height="4" />
          <rect x="730" y="174" width="10" height="4" />
          <rect x="760" y="174" width="10" height="4" />
        </g>
        {/* Brazier glow on the wall */}
        <circle cx="200" cy="182" r="4" fill="#ffb347" opacity="0.85" />
        <circle cx="200" cy="182" r="10" fill="#ffb347" opacity="0.18" />
        <circle cx="600" cy="182" r="4" fill="#ffb347" opacity="0.85" />
        <circle cx="600" cy="182" r="10" fill="#ffb347" opacity="0.18" />
      </svg>
      {/* Soft dome bloom on top */}
      <div className="absolute left-[48%] top-[18%] w-32 h-20 rounded-full bg-[var(--color-accent-gold)] opacity-15 blur-2xl pointer-events-none animate-pulse-glow" />
    </div>
  );
}
