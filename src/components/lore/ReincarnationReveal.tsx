import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { Button } from '../ui/Button';
import { QuirkCard } from '../ui/QuirkCard';
import { playSfx } from '../../engine/audio';
import { useInputBlock } from '../ui/useInputBlock';
import { useT } from '../../i18n/useT';

const BASE_TICK = 36;
const FAST_TICK = 4;

export function ReincarnationReveal() {
  const { t } = useT();
  const HEADLINE = t('scenes.reincarnation.headline');
  const character = useGameStore((s) => s.character);
  const deathCount = useGameStore((s) => s.deathCount);
  const finishDelve = useGameStore((s) => s.finishDelve);

  const [typed, setTyped] = useState('');
  const [headlineDone, setHeadlineDone] = useState(false);
  const [revealedCount, setRevealedCount] = useState(0);
  const [holding, setHolding] = useState(false);
  const indexRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSfxCountRef = useRef(0);
  const overlayRef = useInputBlock<HTMLDivElement>();

  // Typewriter for the headline, with hold-to-speed.
  useEffect(() => {
    if (headlineDone) return;
    const speed = holding ? FAST_TICK : BASE_TICK;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      indexRef.current += 1;
      setTyped(HEADLINE.slice(0, indexRef.current));
      if (indexRef.current >= HEADLINE.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        setHeadlineDone(true);
      }
    }, speed);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [holding, headlineDone, HEADLINE]);

  // After the headline completes, stagger-reveal quirks. Each arrival plays
  // a soft ui_click so the soul-mark drop has audible weight.
  const quirkCount = character?.quirks.length ?? 0;
  useEffect(() => {
    if (!headlineDone) return;
    if (revealedCount >= quirkCount) return;
    const delay = holding ? 80 : 200;
    const t = setTimeout(() => {
      setRevealedCount((c) => c + 1);
    }, delay);
    return () => clearTimeout(t);
  }, [headlineDone, revealedCount, quirkCount, holding]);

  // Fire ui_click on every quirk arrival (including skip-completes), without
  // re-firing for unchanged renders. Tracks the last count we played for.
  useEffect(() => {
    if (revealedCount > lastSfxCountRef.current) {
      lastSfxCountRef.current = revealedCount;
      playSfx('ui_click');
    }
  }, [revealedCount]);

  function completeNow() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    indexRef.current = HEADLINE.length;
    setTyped(HEADLINE);
    setHeadlineDone(true);
    setRevealedCount(quirkCount);
  }

  function handleClick() {
    if (!headlineDone || revealedCount < quirkCount) {
      completeNow();
    }
  }

  function handleDoubleClick(e: React.MouseEvent) {
    e.preventDefault();
    completeNow();
  }

  if (!character) return null;

  const allRevealed = headlineDone && revealedCount >= quirkCount;

  return (
    <div
      ref={overlayRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      className="min-h-screen flex flex-col items-center justify-center px-4 py-8 md:px-6 md:py-12 gap-8 select-none relative overflow-hidden outline-none"
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseDown={() => setHolding(true)}
      onMouseUp={() => setHolding(false)}
      onMouseLeave={() => setHolding(false)}
      onTouchStart={() => setHolding(true)}
      onTouchEnd={() => setHolding(false)}
    >
      <GroveBackdrop />

      <div className="relative z-10 max-w-3xl w-full flex flex-col items-center gap-8">
        {/* Souls-walked counter */}
        <div className="font-display text-[var(--color-accent-amber)] text-[10px] uppercase tracking-[0.4em] animate-fade-in-slow">
          {t('scenes.reincarnation.soulsWalked', { n: deathCount })}
        </div>

        {/* Headline */}
        <div className="text-center min-h-[7rem] flex items-center justify-center max-w-md">
          <p
            className="font-narrative text-2xl md:text-3xl text-[var(--color-text-primary)] italic leading-relaxed"
            style={{
              textShadow:
                '0 0 24px rgba(244,167,66,0.5), 0 0 12px rgba(0,0,0,0.85), 0 2px 0 rgba(0,0,0,0.9)',
            }}
          >
            {typed}
            {!headlineDone && (
              <span className="animate-pulse text-[var(--color-accent-amber)]">▌</span>
            )}
          </p>
        </div>

        {/* Quirks reveal */}
        {headlineDone && quirkCount > 0 && (
          <div className="w-full flex flex-col gap-3 animate-fade-in">
            <div className="font-display text-[var(--color-accent-amber)] text-[10px] uppercase tracking-[0.4em] text-center mb-1">
              {t('scenes.reincarnation.carries')}
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {character.quirks.slice(0, revealedCount).map((id) => (
                <div key={id} className="animate-scale-in">
                  <QuirkCard quirkId={id} />
                </div>
              ))}
            </div>
          </div>
        )}

        {headlineDone && quirkCount === 0 && (
          <div className="font-narrative text-[var(--color-text-secondary)] text-base italic text-center animate-fade-in max-w-md">
            {t('scenes.reincarnation.noQuirks')}
          </div>
        )}

        {/* Continue */}
        <div className="mt-4 flex flex-col items-center gap-2 min-h-[4rem]">
          {allRevealed ? (
            <div className="animate-fade-in flex flex-col items-center gap-3">
              <Button
                variant="primary"
                size="lg"
                onClick={(e) => {
                  e.stopPropagation();
                  finishDelve();
                }}
              >
                {t('scenes.reincarnation.walkBack')}
              </Button>
              <div className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest italic">
                {t('scenes.reincarnation.orDoubleClick')}
              </div>
            </div>
          ) : (
            <div className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest italic">
              {holding ? t('scenes.reincarnation.holdSpeed') : t('scenes.reincarnation.skipHint')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Painted backdrop for the reincarnation: the Druid Grove at moonrise.
 * Ancient oak, fey-lights in the canopy, standing stones, a glowing
 * Wellspring basin at centre. Multi-layer parallax for atmosphere.
 */
function GroveBackdrop() {
  return (
    <div className="absolute inset-0 [background:radial-gradient(ellipse_at_center,#1a140e_0%,#080404_100%)]">
      <svg
        viewBox="0 0 800 600"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
      >
        <defs>
          <linearGradient id="grv-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0a0612" />
            <stop offset="35%" stopColor="#1a0e1c" />
            <stop offset="65%" stopColor="#2a1422" />
            <stop offset="100%" stopColor="#1a0e10" />
          </linearGradient>
          <radialGradient id="grv-moon" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#fff5d1" />
            <stop offset="60%" stopColor="#e8dcc4" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#e8dcc4" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="grv-wellspring" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#ffd76a" stopOpacity="0.85" />
            <stop offset="40%" stopColor="#f4a742" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#f4a742" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="grv-trunk" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a0e08" />
            <stop offset="100%" stopColor="#0a0604" />
          </linearGradient>
          <radialGradient id="grv-fey" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#a8d042" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#a8d042" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Sky */}
        <rect x="0" y="0" width="800" height="600" fill="url(#grv-sky)" />

        {/* Stars */}
        <g fill="#fff5d1" opacity="0.7">
          {[
            [60, 40],
            [140, 70],
            [220, 30],
            [310, 90],
            [410, 50],
            [510, 80],
            [610, 40],
            [690, 110],
            [760, 60],
            [180, 130],
            [380, 140],
            [580, 160],
            [720, 180],
          ].map(([x, y], i) => (
            <rect key={i} x={x} y={y} width={1} height={1} />
          ))}
        </g>

        {/* Moon */}
        <rect x="540" y="20" width="120" height="120" fill="url(#grv-moon)" />
        <circle cx="600" cy="80" r="28" fill="#fff5d1" opacity="0.9" />
        <circle cx="611" cy="70" r="4" fill="#d4c8a8" opacity="0.5" />
        <circle cx="588" cy="86" r="3" fill="#d4c8a8" opacity="0.5" />
        <circle cx="603" cy="90" r="2" fill="#d4c8a8" opacity="0.5" />

        {/* Distant hills */}
        <polygon
          points="0,460 80,400 180,420 290,380 410,410 530,390 650,420 760,400 800,420 800,460"
          fill="#0a0608"
        />
        <polygon
          points="0,500 120,460 240,480 360,450 480,470 600,460 720,475 800,470 800,510 0,510"
          fill="#0e0808"
        />

        {/* Standing stones flanking the oak */}
        <g fill="#1a0e10" stroke="#2a1418" strokeWidth="1">
          <rect x="160" y="420" width="20" height="80" />
          <rect x="158" y="416" width="24" height="6" />
          <rect x="240" y="430" width="16" height="70" />
          <rect x="238" y="426" width="20" height="6" />
          <rect x="540" y="430" width="16" height="70" />
          <rect x="538" y="426" width="20" height="6" />
          <rect x="620" y="420" width="20" height="80" />
          <rect x="618" y="416" width="24" height="6" />
        </g>
        {/* Glyphs on the centre stones (very subtle) */}
        <g fill="#3a8c5a" opacity="0.5">
          <rect x="166" y="450" width="8" height="2" />
          <rect x="168" y="456" width="4" height="2" />
          <rect x="624" y="450" width="8" height="2" />
          <rect x="626" y="456" width="4" height="2" />
        </g>

        {/* Wellspring basin (centre) */}
        <ellipse cx="400" cy="500" rx="80" ry="14" fill="#0a0606" />
        <ellipse cx="400" cy="496" rx="74" ry="10" fill="#1a0e0a" />
        <ellipse cx="400" cy="494" rx="64" ry="8" fill="#2a1814" />
        <ellipse cx="400" cy="492" rx="56" ry="6" fill="url(#grv-wellspring)" />
        {/* Wellspring glow halo */}
        <rect x="280" y="430" width="240" height="160" fill="url(#grv-wellspring)" opacity="0.6" />

        {/* Ancient oak trunk */}
        <path
          d="M 380 500 L 384 360 L 372 340 L 388 320 L 380 290 L 396 270 L 408 240 L 418 220 L 428 200 L 436 240 L 432 280 L 440 320 L 432 360 L 436 400 L 428 440 L 432 500 Z"
          fill="url(#grv-trunk)"
          stroke="#080404"
          strokeWidth="1.5"
        />
        {/* Roots crawling forward */}
        <path d="M 370 500 L 360 510 L 350 504 L 340 514 L 326 510" fill="none" stroke="#0a0604" strokeWidth="3" />
        <path d="M 432 500 L 446 510 L 458 504 L 472 514 L 484 510" fill="none" stroke="#0a0604" strokeWidth="3" />

        {/* Canopy mass */}
        <ellipse cx="400" cy="190" rx="180" ry="100" fill="#0c1408" opacity="0.95" />
        <ellipse cx="340" cy="210" rx="110" ry="68" fill="#0c1408" opacity="0.92" />
        <ellipse cx="465" cy="220" rx="100" ry="60" fill="#0c1408" opacity="0.92" />
        <ellipse cx="400" cy="170" rx="120" ry="60" fill="#102014" opacity="0.7" />

        {/* Fey-lights in the canopy */}
        <rect x="370" y="170" width="50" height="50" fill="url(#grv-fey)" />
        <rect x="320" y="195" width="40" height="40" fill="url(#grv-fey)" />
        <rect x="430" y="200" width="44" height="44" fill="url(#grv-fey)" />
        <circle cx="395" cy="195" r="3" fill="#d8f08c" />
        <circle cx="340" cy="220" r="2.5" fill="#a8d042" />
        <circle cx="450" cy="220" r="2.5" fill="#a8d042" />
        <circle cx="412" cy="170" r="2" fill="#d8f08c" />

        {/* Foreground ground vignette */}
        <rect x="0" y="520" width="800" height="80" fill="#050304" />
      </svg>
      {/* CSS-level slow pulse on the wellspring halo */}
      <div className="absolute left-1/2 top-[78%] -translate-x-1/2 w-72 h-32 rounded-full bg-[var(--color-accent-amber)] opacity-15 blur-3xl pointer-events-none animate-pulse-glow" />
      {/* Fey-light flicker on the canopy — makes the painted scene breathe. */}
      <div className="absolute inset-0 pointer-events-none animate-torch-flicker [background:radial-gradient(ellipse_at_50%_32%,rgba(168,208,66,0.18)_0%,transparent_35%)]" />
      {/* Edge vignette */}
      <div className="absolute inset-0 [background:radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.6)_100%)] pointer-events-none" />
    </div>
  );
}
