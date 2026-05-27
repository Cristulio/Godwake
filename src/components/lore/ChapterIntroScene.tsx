import type React from 'react';

/**
 * Painted full-bleed transition scenes shown when the player crosses a
 * chapter boundary inside a delve. Each chapter renders its own inline SVG
 * sized 824 x 280 so it drops in over the Battlefield without reflowing.
 *
 * No engine integration — the component is a pure visual. A caller can mount
 * it briefly between rooms when `delveState.chapter` advances.
 */

export type ChapterId = 1 | 2 | 3 | 4;

interface ChapterIntroSceneProps {
  chapter: ChapterId;
  title?: string;
  subtitle?: string;
}

const CHAPTER_META: Record<
  ChapterId,
  { title: string; subtitle: string; render: () => React.ReactElement }
> = {
  1: {
    title: 'Chapter I — Iron Cells',
    subtitle: 'Beneath Tresendar Manor',
    render: IronCellsScene,
  },
  2: {
    title: 'Chapter II — Athkatla',
    subtitle: 'The City of Coin, by dusk',
    render: AthkatlaIntroScene,
  },
  3: {
    title: 'Chapter III — Spellhold',
    subtitle: 'An asylum on a cold island',
    render: SpellholdScene,
  },
  4: {
    title: 'Chapter IV — Ust Natha',
    subtitle: 'A drow city in the deep faerzress',
    render: UstNathaScene,
  },
};

export function ChapterIntroScene({ chapter, title, subtitle }: ChapterIntroSceneProps) {
  const meta = CHAPTER_META[chapter];
  const Scene = meta.render;
  return (
    <div className="relative w-full max-w-[824px] mx-auto border-2 border-[var(--color-border-warm)] overflow-hidden shadow-[0_0_48px_rgba(0,0,0,0.7)]">
      <svg
        viewBox="0 0 824 280"
        preserveAspectRatio="xMidYMid slice"
        className="block w-full h-auto"
        shapeRendering="geometricPrecision"
      >
        <Scene />
      </svg>
      <div className="absolute inset-x-0 bottom-0 px-4 pt-10 pb-3 bg-gradient-to-t from-[var(--color-bg-base)] via-[rgba(0,0,0,0.55)] to-transparent">
        <div className="font-display text-[var(--color-accent-amber)] text-sm md:text-base uppercase tracking-[0.4em]">
          ◆ {title ?? meta.title}
        </div>
        <div className="text-[var(--color-text-dim)] text-[10px] md:text-xs uppercase tracking-[0.3em] italic mt-1">
          {subtitle ?? meta.subtitle}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   Chapter 1 — Iron Cells
   Cold stone walls, a single torch sconce, distant dripping water,
   a chain hanging from a rusted iron ring. Subterranean variant of
   the manor — darker than PhandalinScene.
   ───────────────────────────────────────────────────────────────────── */
function IronCellsScene() {
  return (
    <>
      <defs>
        <linearGradient id="c1-stone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a120e" />
          <stop offset="55%" stopColor="#0f0a08" />
          <stop offset="100%" stopColor="#050302" />
        </linearGradient>
        <radialGradient id="c1-torch" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#ffd07a" stopOpacity="0.95" />
          <stop offset="45%" stopColor="#f4a742" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#7a2a10" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="c1-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a1310" />
          <stop offset="100%" stopColor="#040302" />
        </linearGradient>
        <radialGradient id="c1-puddle" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#3a2a18" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#0a0604" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Base wall fill */}
      <rect x="0" y="0" width="824" height="280" fill="url(#c1-stone)" />

      {/* Vault arches — three receding arches with shadow */}
      <g opacity="0.85">
        <path
          d="M -20 240 L -20 130 Q 120 30 260 130 L 260 240 Z"
          fill="#0a0706"
          stroke="#1a1410"
          strokeWidth="2"
        />
        <path
          d="M 240 240 L 240 120 Q 412 14 584 120 L 584 240 Z"
          fill="#0e0a08"
          stroke="#1a1410"
          strokeWidth="2"
        />
        <path
          d="M 564 240 L 564 130 Q 704 30 844 130 L 844 240 Z"
          fill="#0a0706"
          stroke="#1a1410"
          strokeWidth="2"
        />
      </g>

      {/* Stone block courses on the back wall */}
      <g stroke="#1f1612" strokeWidth="1" opacity="0.55">
        {Array.from({ length: 7 }).map((_, row) => (
          <line key={`r${row}`} x1="0" y1={50 + row * 28} x2="824" y2={50 + row * 28} />
        ))}
        {Array.from({ length: 13 }).map((_, col) => (
          <line
            key={`c${col}`}
            x1={(col * 824) / 12 + (col % 2 === 0 ? 0 : 30)}
            y1="50"
            x2={(col * 824) / 12 + (col % 2 === 0 ? 0 : 30)}
            y2="240"
          />
        ))}
      </g>

      {/* Cell bars in the deepest arch — silhouetted from a dim back-corridor */}
      <g>
        <rect x="380" y="80" width="64" height="120" fill="#020100" />
        <g stroke="#3a2a1a" strokeWidth="2">
          <line x1="386" y1="84" x2="386" y2="200" />
          <line x1="398" y1="84" x2="398" y2="200" />
          <line x1="410" y1="84" x2="410" y2="200" />
          <line x1="422" y1="84" x2="422" y2="200" />
          <line x1="434" y1="84" x2="434" y2="200" />
        </g>
        <rect x="378" y="78" width="68" height="6" fill="#2a1c12" />
      </g>

      {/* Iron sconce, left wall — flickering halo */}
      <g>
        <rect x="118" y="92" width="2" height="14" fill="#1a1008" />
        <rect x="114" y="88" width="10" height="6" fill="#3a2a18" />
        <rect x="116" y="80" width="6" height="10" fill="#3a2a18" />
        {/* Flame */}
        <path
          d="M 119 78 Q 122 70 119 60 Q 116 70 119 78 Z"
          fill="#f4a742"
          className="animate-torch-flicker"
          style={{ animationDelay: '-0.4s', animationDuration: '2.6s' }}
        />
        <path
          d="M 119 76 Q 121 70 119 64 Q 117 70 119 76 Z"
          fill="#ffd07a"
          className="animate-torch-flicker"
          style={{ animationDelay: '-1.1s', animationDuration: '3.1s' }}
        />
        {/* Halo */}
        <rect
          x="40"
          y="20"
          width="160"
          height="160"
          fill="url(#c1-torch)"
          className="animate-torch-flicker"
          style={{ animationDelay: '-0.6s', animationDuration: '3.4s' }}
        />
      </g>

      {/* Hanging chain from iron ring, right side */}
      <g>
        <circle cx="710" cy="42" r="6" stroke="#3a2a18" strokeWidth="2" fill="none" />
        <line x1="710" y1="48" x2="710" y2="62" stroke="#2a1c12" strokeWidth="2" />
        {Array.from({ length: 9 }).map((_, i) => (
          <ellipse
            key={`ch${i}`}
            cx="710"
            cy={68 + i * 10}
            rx="4"
            ry="5"
            fill="none"
            stroke="#3a2a18"
            strokeWidth="1.5"
          />
        ))}
        {/* Manacle at the end */}
        <rect x="700" y="160" width="20" height="12" fill="#2a1c12" stroke="#1a1008" strokeWidth="1" />
        <rect x="704" y="164" width="12" height="4" fill="#1a1008" />
      </g>

      {/* Wall stains — old blood or rust */}
      <path
        d="M 540 100 q 4 22 -2 50 q 6 -8 8 8 q -6 6 -10 -6 q -4 -28 4 -52"
        fill="#3a0a08"
        opacity="0.45"
      />
      <path
        d="M 220 70 q 4 30 -4 70 q 8 -6 6 16"
        fill="#3a0a08"
        opacity="0.3"
      />

      {/* Floor */}
      <rect x="0" y="222" width="824" height="58" fill="url(#c1-floor)" />

      {/* Flagstones — slight grid */}
      <g stroke="#1a1310" strokeWidth="1" opacity="0.7">
        <line x1="0" y1="244" x2="824" y2="244" />
        <line x1="0" y1="262" x2="824" y2="262" />
        {Array.from({ length: 9 }).map((_, i) => (
          <line key={`fs${i}`} x1={i * 100 + 40} y1="222" x2={i * 100 + 60} y2="280" />
        ))}
      </g>

      {/* A puddle reflecting the torch — distant dripping rendered as ripple rings */}
      <ellipse cx="190" cy="258" rx="44" ry="10" fill="url(#c1-puddle)" />
      <ellipse
        cx="190"
        cy="258"
        rx="14"
        ry="3"
        fill="none"
        stroke="#5a4422"
        strokeWidth="0.6"
        opacity="0.7"
        className="animate-pulse-glow"
        style={{ animationDelay: '-0.5s', animationDuration: '4.2s' }}
      />
      <ellipse
        cx="190"
        cy="258"
        rx="24"
        ry="5"
        fill="none"
        stroke="#5a4422"
        strokeWidth="0.4"
        opacity="0.45"
        className="animate-pulse-glow"
        style={{ animationDelay: '-2.1s', animationDuration: '4.2s' }}
      />

      {/* A single drop, mid-fall */}
      <line x1="412" y1="100" x2="412" y2="106" stroke="#7a8c9a" strokeWidth="1" opacity="0.6" />

      {/* Vignette */}
      <rect x="0" y="0" width="824" height="280" fill="url(#c1-vignette)" />
      <defs>
        <radialGradient id="c1-vignette" cx="0.5" cy="0.55" r="0.7">
          <stop offset="55%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.75" />
        </radialGradient>
      </defs>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   Chapter 2 — Athkatla
   City silhouette at dusk, gold-domed temple of Waukeen, chimney smoke,
   a hooded Cowled Wizard on a high balcony.
   ───────────────────────────────────────────────────────────────────── */
function AthkatlaIntroScene() {
  return (
    <>
      <defs>
        <linearGradient id="c2-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a1238" />
          <stop offset="40%" stopColor="#42203a" />
          <stop offset="75%" stopColor="#a55a32" />
          <stop offset="100%" stopColor="#d6924a" />
        </linearGradient>
        <linearGradient id="c2-far-city" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#352440" />
          <stop offset="100%" stopColor="#180e22" />
        </linearGradient>
        <linearGradient id="c2-mid-city" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a2c2a" />
          <stop offset="100%" stopColor="#1a0e0c" />
        </linearGradient>
        <radialGradient id="c2-dome" cx="0.5" cy="0.55" r="0.5">
          <stop offset="0%" stopColor="#ffe27a" />
          <stop offset="55%" stopColor="#c8902a" />
          <stop offset="100%" stopColor="#3a1f0a" />
        </radialGradient>
        <radialGradient id="c2-window" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#ffd07a" stopOpacity="0.95" />
          <stop offset="60%" stopColor="#ffa342" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#7a2a10" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="c2-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#fff5d1" />
          <stop offset="55%" stopColor="#f4b042" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#f4b042" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Sky */}
      <rect x="0" y="0" width="824" height="280" fill="url(#c2-sky)" />
      {/* Sun on the horizon */}
      <rect x="120" y="130" width="120" height="120" fill="url(#c2-sun)" />
      <circle cx="180" cy="190" r="22" fill="#fff5d1" opacity="0.85" />

      {/* Distant city — far silhouette */}
      <polygon
        points="0,200 40,180 80,184 120,170 170,178 220,168 270,182 320,170 380,176 430,162 490,178 540,168 590,176 640,166 700,180 750,170 824,182 824,210 0,210"
        fill="url(#c2-far-city)"
      />

      {/* Mid-distance harbor district */}
      <polygon
        points="0,220 60,200 130,210 200,194 280,206 360,196 440,210 520,200 600,214 690,200 760,212 824,200 824,260 0,260"
        fill="url(#c2-mid-city)"
      />

      {/* Temple of Waukeen — gold dome, center */}
      <g>
        {/* Marble base */}
        <rect x="356" y="180" width="112" height="40" fill="#2a1f1a" stroke="#0a0606" strokeWidth="1" />
        <rect x="350" y="218" width="124" height="6" fill="#1a120c" />
        {/* Colonnade */}
        <g fill="#5a4030">
          <rect x="362" y="186" width="5" height="34" />
          <rect x="378" y="186" width="5" height="34" />
          <rect x="394" y="186" width="5" height="34" />
          <rect x="410" y="186" width="5" height="34" />
          <rect x="426" y="186" width="5" height="34" />
          <rect x="442" y="186" width="5" height="34" />
          <rect x="458" y="186" width="5" height="34" />
        </g>
        {/* Pediment */}
        <polygon points="350,180 412,158 474,180" fill="#3a2820" stroke="#0a0606" strokeWidth="1" />
        {/* Dome drum */}
        <rect x="386" y="120" width="52" height="40" fill="#5a4030" stroke="#0a0606" strokeWidth="1" />
        {/* Gold dome */}
        <path
          d="M 386 122 Q 412 86 438 122 Z"
          fill="url(#c2-dome)"
          stroke="#3a1f0a"
          strokeWidth="1.5"
        />
        {/* Dome shine */}
        <path d="M 396 116 Q 408 96 420 110" stroke="#ffe27a" strokeWidth="1.6" fill="none" opacity="0.7" />
        {/* Spire on top */}
        <rect x="411" y="78" width="2" height="14" fill="#3a1f0a" />
        <polygon points="408,80 412,72 416,80" fill="#ffd070" />
      </g>

      {/* Buildings around the temple — tall, terraced */}
      <g>
        {/* Left tenement block */}
        <rect x="40" y="160" width="120" height="80" fill="#2a1c18" stroke="#0a0606" strokeWidth="1" />
        <rect x="60" y="174" width="10" height="14" fill="#ffb347" opacity="0.85" />
        <rect x="60" y="174" width="10" height="14" fill="url(#c2-window)" />
        <rect x="86" y="178" width="10" height="14" fill="#ffb347" opacity="0.85" />
        <rect x="86" y="178" width="10" height="14" fill="url(#c2-window)" />
        <rect x="112" y="174" width="10" height="14" fill="#ffb347" opacity="0.7" />
        <rect x="136" y="178" width="10" height="14" fill="#ffb347" opacity="0.6" />
        <rect x="60" y="200" width="10" height="14" fill="#ffb347" opacity="0.55" />
        <rect x="112" y="200" width="10" height="14" fill="#ffb347" opacity="0.7" />
        {/* Roof / chimney */}
        <polygon points="36,162 160,162 156,148 40,148" fill="#1a120c" />
        <rect x="120" y="130" width="10" height="20" fill="#1a120c" />
        {/* Chimney smoke */}
        <g
          className="animate-smoke-drift"
          style={{ transformOrigin: '125px 130px', animationDelay: '0s' }}
        >
          <ellipse cx="125" cy="122" rx="6" ry="4" fill="#2a1a14" opacity="0.85" />
          <ellipse cx="128" cy="110" rx="8" ry="5" fill="#1a120c" opacity="0.7" />
          <ellipse cx="125" cy="98" rx="10" ry="6" fill="#0e0806" opacity="0.55" />
        </g>
        <g
          className="animate-smoke-drift"
          style={{ transformOrigin: '125px 130px', animationDelay: '-3.4s' }}
        >
          <ellipse cx="123" cy="124" rx="5" ry="3.5" fill="#2a1a14" opacity="0.7" />
          <ellipse cx="126" cy="112" rx="7" ry="4.5" fill="#1a120c" opacity="0.5" />
        </g>

        {/* Right cluster — taller tower with the Cowled Wizard balcony */}
        <rect x="600" y="120" width="80" height="120" fill="#2a1c20" stroke="#0a0606" strokeWidth="1" />
        <rect x="600" y="120" width="80" height="8" fill="#1a120c" />
        <polygon points="596,124 684,124 680,110 600,110" fill="#1a120c" />
        {/* Tower windows */}
        <rect x="616" y="148" width="8" height="12" fill="#ffb347" opacity="0.8" />
        <rect x="616" y="148" width="8" height="12" fill="url(#c2-window)" />
        <rect x="654" y="154" width="8" height="12" fill="#ffb347" opacity="0.6" />
        <rect x="616" y="184" width="8" height="12" fill="#ffb347" opacity="0.45" />
        <rect x="654" y="184" width="8" height="12" fill="#ffb347" opacity="0.55" />
        {/* Balcony */}
        <rect x="608" y="160" width="64" height="3" fill="#5a4030" />
        <rect x="608" y="160" width="2" height="10" fill="#3a2820" />
        <rect x="670" y="160" width="2" height="10" fill="#3a2820" />
        {/* Cowled Wizard silhouette on balcony — leaning, watchful */}
        <g>
          {/* Robe */}
          <path
            d="M 632 158 L 640 158 L 644 156 L 648 158 L 652 158 L 656 162 L 658 168 L 656 168 L 652 168 L 648 168 L 644 168 L 640 168 L 636 168 L 632 168 L 630 162 Z"
            fill="#1a1228"
          />
          <path
            d="M 638 134 L 650 134 L 654 140 L 654 156 L 648 158 L 640 158 L 636 156 L 634 142 Z"
            fill="#1a1228"
            stroke="#0a0510"
            strokeWidth="0.5"
          />
          {/* Hood opening — pure black */}
          <path
            d="M 640 138 L 650 138 L 651 148 L 643 150 Z"
            fill="#020005"
          />
          {/* Silver collar */}
          <rect x="638" y="150" width="14" height="2" fill="#c8c4d6" />
          <rect x="638" y="150" width="14" height="1" fill="#fff" opacity="0.5" />
        </g>
      </g>

      {/* Crows in the painted sky */}
      <g
        className="animate-bird-fly"
        style={{ animationDelay: '0s', animationDuration: '24s' }}
      >
        <path d="M 0 60 q 4 -4 8 0 q 4 -4 8 0" stroke="#1a0e10" strokeWidth="1.4" fill="none" />
      </g>
      <g
        className="animate-bird-fly"
        style={{ animationDelay: '-8s', animationDuration: '28s' }}
      >
        <path d="M 0 80 q 3 -3 6 0 q 3 -3 6 0" stroke="#1a0e10" strokeWidth="1.1" fill="none" />
      </g>
      <g
        className="animate-bird-fly"
        style={{ animationDelay: '-14s', animationDuration: '20s' }}
      >
        <path d="M 0 96 q 2.6 -2.6 5.2 0 q 2.6 -2.6 5.2 0" stroke="#1a0e10" strokeWidth="0.9" fill="none" />
      </g>

      {/* Foreground street paving */}
      <rect x="0" y="248" width="824" height="32" fill="#0c0806" />
      <path d="M 0 268 Q 412 256 824 270" stroke="#3a2a1a" strokeWidth="1.5" fill="none" opacity="0.7" />

      {/* Vignette */}
      <rect x="0" y="0" width="824" height="280" fill="url(#c2-vignette)" />
      <defs>
        <radialGradient id="c2-vignette" cx="0.5" cy="0.5" r="0.7">
          <stop offset="55%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.55" />
        </radialGradient>
      </defs>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   Chapter 3 — Spellhold
   An island prison off a stormy coast. Lightning splits the sky.
   The spire has one lit window — someone is awake inside.
   ───────────────────────────────────────────────────────────────────── */
function SpellholdScene() {
  return (
    <>
      <defs>
        <linearGradient id="c3-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a0a14" />
          <stop offset="55%" stopColor="#161624" />
          <stop offset="100%" stopColor="#2a2436" />
        </linearGradient>
        <linearGradient id="c3-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#161830" />
          <stop offset="60%" stopColor="#0a0c18" />
          <stop offset="100%" stopColor="#040408" />
        </linearGradient>
        <linearGradient id="c3-island" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a1820" />
          <stop offset="100%" stopColor="#0a080c" />
        </linearGradient>
        <radialGradient id="c3-window" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#ffd07a" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#f4a742" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#7a2a10" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="c3-cloud" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a3450" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#0a0a12" stopOpacity="0.9" />
        </linearGradient>
      </defs>

      {/* Sky */}
      <rect x="0" y="0" width="824" height="280" fill="url(#c3-sky)" />

      {/* Storm clouds — heavy bands at the top */}
      <path
        d="M -20 0 L -20 50 q 60 -10 120 6 q 60 14 120 -2 q 60 -16 120 4 q 60 18 120 -4 q 60 -16 120 6 q 60 14 120 -2 q 60 -16 120 6 L 844 0 Z"
        fill="url(#c3-cloud)"
      />
      <path
        d="M -20 30 q 80 24 160 -6 q 80 -22 160 8 q 80 22 160 -8 q 80 -22 160 8 q 80 22 160 -6"
        stroke="#1a1830"
        strokeWidth="2"
        fill="none"
        opacity="0.6"
      />

      {/* Lightning bolt — fixed but flickers via opacity */}
      <g
        className="animate-torch-flicker"
        style={{ animationDelay: '-0.2s', animationDuration: '5.2s' }}
      >
        <path
          d="M 220 4 L 232 60 L 218 64 L 244 130 L 226 134 L 238 178"
          stroke="#ffeaa0"
          strokeWidth="2"
          fill="none"
          opacity="0.9"
        />
        <path
          d="M 232 60 L 250 70"
          stroke="#ffeaa0"
          strokeWidth="1.4"
          fill="none"
          opacity="0.85"
        />
        <path
          d="M 226 134 L 210 152"
          stroke="#ffeaa0"
          strokeWidth="1.2"
          fill="none"
          opacity="0.7"
        />
      </g>
      {/* Lightning halo glow */}
      <ellipse
        cx="232"
        cy="80"
        rx="120"
        ry="90"
        fill="#5a5a8a"
        opacity="0.18"
        className="animate-torch-flicker"
        style={{ animationDelay: '-0.2s', animationDuration: '5.2s' }}
      />

      {/* Distant smaller islands */}
      <path d="M 0 196 q 30 -6 60 0 q 30 -4 60 0 L 120 200 L 0 200 Z" fill="#0e0c16" />
      <path d="M 720 198 q 30 -8 60 0 q 30 -4 60 0 L 840 204 L 720 204 Z" fill="#0e0c16" />

      {/* Main Spellhold island silhouette — jagged cliffs */}
      <path
        d="M 280 220 L 310 188 L 340 196 L 358 174 L 386 184 L 412 156 L 442 178 L 466 168 L 488 180 L 510 174 L 534 196 L 552 188 L 568 220 Z"
        fill="url(#c3-island)"
        stroke="#0a080c"
        strokeWidth="1"
      />

      {/* Cliff cracks / texture */}
      <g stroke="#050408" strokeWidth="0.8" opacity="0.65">
        <path d="M 320 200 L 330 218" fill="none" />
        <path d="M 360 190 L 370 218" fill="none" />
        <path d="M 396 200 L 410 218" fill="none" />
        <path d="M 470 192 L 480 218" fill="none" />
        <path d="M 520 200 L 530 218" fill="none" />
      </g>

      {/* The Spire — central, narrow, oppressive */}
      <g>
        {/* Spire body */}
        <rect x="402" y="80" width="20" height="80" fill="#1f1a26" stroke="#0a0810" strokeWidth="1" />
        <rect x="400" y="78" width="24" height="4" fill="#0e0a14" />
        {/* Crenellations */}
        <rect x="400" y="74" width="4" height="4" fill="#1f1a26" />
        <rect x="408" y="72" width="4" height="6" fill="#1f1a26" />
        <rect x="416" y="74" width="4" height="4" fill="#1f1a26" />
        {/* Conical roof / spike */}
        <polygon points="398,78 412,52 426,78" fill="#0a0810" stroke="#1f1a26" strokeWidth="1" />
        <line x1="412" y1="52" x2="412" y2="42" stroke="#3a2820" strokeWidth="1" />
        <polygon points="408,46 412,38 416,46" fill="#3a2820" />
        {/* The one lit window — small, halfway up */}
        <rect x="408" y="108" width="8" height="10" fill="#ffd07a" />
        <rect x="408" y="108" width="8" height="10" fill="#ffb347" opacity="0.85" />
        {/* Bars over the window */}
        <line x1="410" y1="108" x2="410" y2="118" stroke="#1a1008" strokeWidth="0.8" />
        <line x1="412" y1="108" x2="412" y2="118" stroke="#1a1008" strokeWidth="0.8" />
        <line x1="414" y1="108" x2="414" y2="118" stroke="#1a1008" strokeWidth="0.8" />
        <line x1="408" y1="113" x2="416" y2="113" stroke="#1a1008" strokeWidth="0.8" />
        {/* Halo */}
        <rect
          x="380"
          y="92"
          width="68"
          height="42"
          fill="url(#c3-window)"
          className="animate-torch-flicker"
          style={{ animationDelay: '-0.8s', animationDuration: '3.8s' }}
        />
        {/* Base buttress */}
        <polygon points="402,160 388,220 422,220 422,160" fill="#1a1620" />
        <polygon points="408,160 396,220 428,220 422,160" fill="#0e0a14" opacity="0.6" />
      </g>

      {/* Sea — choppy water with whitecaps */}
      <rect x="0" y="220" width="824" height="60" fill="url(#c3-sea)" />
      <g stroke="#3a4060" strokeWidth="1" fill="none" opacity="0.7">
        <path d="M 0 232 q 20 -4 40 0 q 20 4 40 0 q 20 -4 40 0 q 20 4 40 0 q 20 -4 40 0 q 20 4 40 0 q 20 -4 40 0 q 20 4 40 0 q 20 -4 40 0 q 20 4 40 0" />
        <path d="M 0 248 q 24 -6 48 0 q 24 6 48 0 q 24 -6 48 0 q 24 6 48 0 q 24 -6 48 0 q 24 6 48 0 q 24 -6 48 0 q 24 6 48 0" opacity="0.55" />
        <path d="M 0 264 q 30 -4 60 0 q 30 4 60 0 q 30 -4 60 0 q 30 4 60 0 q 30 -4 60 0 q 30 4 60 0 q 30 -4 60 0" opacity="0.35" />
      </g>
      {/* Whitecaps */}
      <g fill="#a8b0c8" opacity="0.45">
        <rect x="80" y="240" width="6" height="1" />
        <rect x="220" y="252" width="6" height="1" />
        <rect x="400" y="258" width="8" height="1" />
        <rect x="540" y="244" width="6" height="1" />
        <rect x="660" y="252" width="8" height="1" />
        <rect x="760" y="246" width="6" height="1" />
      </g>
      {/* Rain streaks — diagonal lines, very subtle */}
      <g stroke="#7a8aa0" strokeWidth="0.5" opacity="0.35">
        {Array.from({ length: 24 }).map((_, i) => {
          const x = (i * 824) / 24 + ((i % 3) * 11);
          return <line key={`rn${i}`} x1={x} y1="40" x2={x - 8} y2="160" />;
        })}
      </g>

      {/* Vignette */}
      <rect x="0" y="0" width="824" height="280" fill="url(#c3-vignette)" />
      <defs>
        <radialGradient id="c3-vignette" cx="0.5" cy="0.5" r="0.7">
          <stop offset="55%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.65" />
        </radialGradient>
      </defs>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   Chapter 4 — Ust Natha
   Faerzress-blue cavern, drow city silhouette under a fungal canopy,
   spider banner hung from the rock arch.
   ───────────────────────────────────────────────────────────────────── */
function UstNathaScene() {
  return (
    <>
      <defs>
        <radialGradient id="c4-faerzress" cx="0.5" cy="0.5" r="0.55">
          <stop offset="0%" stopColor="#5e6cd0" stopOpacity="0.55" />
          <stop offset="55%" stopColor="#2a2864" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#0a0820" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="c4-rock" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a1632" />
          <stop offset="100%" stopColor="#06040e" />
        </linearGradient>
        <linearGradient id="c4-city" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#221a3a" />
          <stop offset="100%" stopColor="#080612" />
        </linearGradient>
        <radialGradient id="c4-citylight" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#a8b8ff" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#5468d4" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#1a1842" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="c4-mush" cx="0.5" cy="0.4" r="0.5">
          <stop offset="0%" stopColor="#7a92d8" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#1a1842" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Deep cave background */}
      <rect x="0" y="0" width="824" height="280" fill="#040308" />
      {/* Faerzress glow filling the cavern */}
      <rect x="0" y="0" width="824" height="280" fill="url(#c4-faerzress)" />

      {/* Cavern ceiling — jagged stalactites at top */}
      <path
        d="M 0 0 L 0 50 L 20 70 L 40 40 L 70 80 L 100 50 L 130 90 L 160 60 L 200 96 L 240 60 L 280 90 L 320 50 L 360 80 L 400 56 L 440 90 L 480 60 L 520 92 L 560 60 L 600 88 L 640 56 L 680 86 L 720 60 L 760 92 L 800 60 L 824 84 L 824 0 Z"
        fill="url(#c4-rock)"
      />
      {/* Stalactite shadow line */}
      <path
        d="M 0 50 L 20 70 L 40 40 L 70 80 L 100 50 L 130 90 L 160 60 L 200 96 L 240 60 L 280 90 L 320 50 L 360 80 L 400 56 L 440 90 L 480 60 L 520 92 L 560 60 L 600 88 L 640 56 L 680 86 L 720 60 L 760 92 L 800 60 L 824 84"
        fill="none"
        stroke="#0a0820"
        strokeWidth="1.5"
      />

      {/* Glowing mushroom canopy hanging from ceiling — softer ovals */}
      <g>
        <ellipse cx="100" cy="100" rx="22" ry="10" fill="url(#c4-mush)" />
        <ellipse cx="260" cy="118" rx="30" ry="14" fill="url(#c4-mush)" opacity="0.85" />
        <ellipse cx="430" cy="98" rx="24" ry="11" fill="url(#c4-mush)" />
        <ellipse cx="600" cy="120" rx="34" ry="15" fill="url(#c4-mush)" opacity="0.85" />
        <ellipse cx="740" cy="104" rx="22" ry="10" fill="url(#c4-mush)" />
        {/* Mushroom stalks */}
        <rect x="98" y="100" width="4" height="20" fill="#3a3a6a" opacity="0.7" />
        <rect x="258" y="118" width="4" height="18" fill="#3a3a6a" opacity="0.7" />
        <rect x="428" y="98" width="4" height="22" fill="#3a3a6a" opacity="0.7" />
        <rect x="598" y="120" width="4" height="18" fill="#3a3a6a" opacity="0.7" />
        <rect x="738" y="104" width="4" height="20" fill="#3a3a6a" opacity="0.7" />
        {/* Glowing caps */}
        <ellipse cx="100" cy="96" rx="14" ry="6" fill="#9aa8ff" opacity="0.85" />
        <ellipse cx="260" cy="114" rx="18" ry="7" fill="#9aa8ff" opacity="0.8" />
        <ellipse cx="430" cy="94" rx="15" ry="6" fill="#9aa8ff" opacity="0.85" />
        <ellipse cx="600" cy="116" rx="20" ry="8" fill="#9aa8ff" opacity="0.8" />
        <ellipse cx="740" cy="100" rx="14" ry="6" fill="#9aa8ff" opacity="0.85" />
      </g>

      {/* Drow city silhouette — tall spires on a stone shelf */}
      <g>
        {/* Shelf */}
        <path d="M 0 230 L 80 218 L 180 226 L 280 214 L 400 224 L 520 214 L 640 224 L 740 216 L 824 226 L 824 280 L 0 280 Z" fill="url(#c4-rock)" />
        {/* City glow halo */}
        <rect x="180" y="140" width="500" height="100" fill="url(#c4-citylight)" />

        {/* Spires — slender, gothic */}
        <g fill="url(#c4-city)" stroke="#0a0820" strokeWidth="1">
          <polygon points="220,224 224,148 230,224" />
          <polygon points="248,224 256,168 262,224" />
          <polygon points="282,224 290,140 298,224" />
          <polygon points="316,224 320,160 326,224" />
          <polygon points="352,224 360,128 370,224" />
          <polygon points="394,224 398,164 402,224" />
          <polygon points="424,224 432,142 438,224" />
          <polygon points="462,224 470,168 476,224" />
          <polygon points="500,224 506,150 512,224" />
          <polygon points="536,224 542,170 548,224" />
          <polygon points="570,224 576,156 584,224" />
          <polygon points="606,224 614,176 620,224" />
        </g>
        {/* Tower windows — tiny pale-blue dots */}
        <g fill="#a8b8ff">
          <rect x="226" y="186" width="2" height="2" />
          <rect x="291" y="172" width="2" height="2" />
          <rect x="291" y="196" width="2" height="2" />
          <rect x="361" y="160" width="2" height="2" />
          <rect x="361" y="186" width="2" height="2" />
          <rect x="361" y="208" width="2" height="2" />
          <rect x="432" y="172" width="2" height="2" />
          <rect x="432" y="196" width="2" height="2" />
          <rect x="506" y="180" width="2" height="2" />
          <rect x="506" y="204" width="2" height="2" />
          <rect x="576" y="186" width="2" height="2" />
        </g>
      </g>

      {/* Stone arch in foreground with spider banner */}
      <g>
        {/* Arch left */}
        <path d="M 0 230 L 60 230 L 60 80 Q 80 50 100 60 L 100 100 Q 80 100 70 120 L 70 230 Z" fill="url(#c4-rock)" />
        {/* Arch right */}
        <path d="M 824 230 L 760 230 L 760 100 Q 740 100 730 80 Q 750 50 770 80 L 770 230 Z" fill="url(#c4-rock)" />
        {/* Hanging spider banner */}
        <g>
          {/* Rope */}
          <line x1="90" y1="100" x2="740" y2="100" stroke="#2a2438" strokeWidth="1" />
          {/* Banner */}
          <polygon points="380,100 444,100 432,150 392,150" fill="#1a0a18" stroke="#3a1c2c" strokeWidth="1" />
          {/* Embroidered spider — eight legs, body */}
          <g stroke="#c8a4d8" strokeWidth="0.9" fill="none">
            <circle cx="412" cy="120" r="4" fill="#0a0410" />
            <circle cx="412" cy="114" r="2.4" fill="#0a0410" />
            <line x1="408" y1="120" x2="396" y2="114" />
            <line x1="408" y1="122" x2="396" y2="128" />
            <line x1="416" y1="120" x2="428" y2="114" />
            <line x1="416" y1="122" x2="428" y2="128" />
            <line x1="408" y1="124" x2="400" y2="138" />
            <line x1="416" y1="124" x2="424" y2="138" />
            <line x1="410" y1="124" x2="406" y2="142" />
            <line x1="414" y1="124" x2="418" y2="142" />
          </g>
          {/* Banner tassels */}
          <line x1="392" y1="150" x2="392" y2="158" stroke="#3a1c2c" strokeWidth="1" />
          <line x1="412" y1="150" x2="412" y2="160" stroke="#3a1c2c" strokeWidth="1" />
          <line x1="432" y1="150" x2="432" y2="158" stroke="#3a1c2c" strokeWidth="1" />
        </g>
      </g>

      {/* A few faerzress motes drifting */}
      <g fill="#9eb0ff">
        <circle
          cx="160"
          cy="170"
          r="1.4"
          opacity="0.75"
          className="animate-pulse-glow"
          style={{ animationDelay: '-0.2s', animationDuration: '5.4s' }}
        />
        <circle
          cx="660"
          cy="160"
          r="1.6"
          opacity="0.75"
          className="animate-pulse-glow"
          style={{ animationDelay: '-1.8s', animationDuration: '5.4s' }}
        />
        <circle
          cx="380"
          cy="200"
          r="1.2"
          opacity="0.7"
          className="animate-pulse-glow"
          style={{ animationDelay: '-3.2s', animationDuration: '6.2s' }}
        />
        <circle
          cx="500"
          cy="194"
          r="1.4"
          opacity="0.7"
          className="animate-pulse-glow"
          style={{ animationDelay: '-2.6s', animationDuration: '5.8s' }}
        />
      </g>

      {/* Vignette */}
      <rect x="0" y="0" width="824" height="280" fill="url(#c4-vignette)" />
      <defs>
        <radialGradient id="c4-vignette" cx="0.5" cy="0.5" r="0.7">
          <stop offset="50%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.65" />
        </radialGradient>
      </defs>
    </>
  );
}
