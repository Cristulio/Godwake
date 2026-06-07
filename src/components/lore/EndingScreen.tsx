import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { useDelveStore } from '../../stores/delveStore';
import { TOTAL_CHAPTERS } from '../../engine/delve/constants';
import { Button } from '../ui/Button';
import { playMusic, stopMusic } from '../../engine/audio';
import { useT } from '../../i18n/useT';

const BASE_TICK = 34;
const FAST_TICK = 4;

type Stage = 'offer' | 'credits';

export function EndingScreen() {
  const { t } = useT();
  const finishDelve = useGameStore((s) => s.finishDelve);
  const goToTitle = useGameStore((s) => s.goToTitle);

  // Which ending: the Throne (New Game+ capstone, Melissan) or the Pit (base
  // game, Irenicus)? Read once at mount off the run's OWN chapter count — the
  // delve is still held 'completed' here (finishDelve detours to the ending
  // before it settles), so chapterCount is present; default to the Throne if it
  // has somehow gone.
  const [isThrone] = useState(() => {
    const cc = useDelveStore.getState().delve?.chapterCount ?? TOTAL_CHAPTERS;
    return cc >= TOTAL_CHAPTERS;
  });

  const [stage, setStage] = useState<Stage>('offer');
  const [typed, setTyped] = useState('');
  const [done, setDone] = useState(false);
  const [holding, setHolding] = useState(false);
  const indexRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const narrationKey = isThrone
    ? stage === 'offer'
      ? 'scenes.ending.throneOffer'
      : 'scenes.ending.throneCredits'
    : stage === 'offer'
      ? 'scenes.ending.pitOffer'
      : 'scenes.ending.pitCredits';
  const fullText = t(narrationKey);

  // Triumphant fanfare under the finale — the one bright theme in the game.
  useEffect(() => {
    playMusic('victory_theme');
    return () => {
      stopMusic();
    };
  }, []);

  // Typewriter for the active stage's block, with hold-to-speed. Re-runs whenever
  // the stage (and thus fullText) changes; resetTyper zeroes the index on a switch.
  useEffect(() => {
    if (done) return;
    const speed = holding ? FAST_TICK : BASE_TICK;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      indexRef.current += 1;
      setTyped(fullText.slice(0, indexRef.current));
      if (indexRef.current >= fullText.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        setDone(true);
      }
    }, speed);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [holding, done, fullText]);

  function resetTyper() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    indexRef.current = 0;
    setTyped('');
    setDone(false);
  }

  function completeNow() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    indexRef.current = fullText.length;
    setTyped(fullText);
    setDone(true);
  }

  // A click skips the typewriter to the end; once the offer has finished typing,
  // a further click steps on to the closing credits beat.
  function handleClick() {
    if (!done) {
      completeNow();
      return;
    }
    if (stage === 'offer') {
      setStage('credits');
      resetTyper();
    }
  }

  function concludeEnding() {
    // Completion AND renown were both locked in at the win moment (finishDelve,
    // before this screen rendered), so the gate is cleared and the soul is paid.
    // This re-entry just runs the deferred settle — reincarnation, the next
    // ascension rung — then leaves on the title. The finale is a full stop, and
    // because the renown is already banked, leaving it any other way costs the
    // player nothing.
    finishDelve();
    goToTitle();
  }

  function handleDoubleClick(e: React.MouseEvent) {
    e.preventDefault();
    if (!done) completeNow();
  }

  const paragraphs = typed.split('\n\n');

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-8 md:px-6 md:py-12 gap-8 select-none relative overflow-hidden"
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseDown={() => setHolding(true)}
      onMouseUp={() => setHolding(false)}
      onMouseLeave={() => setHolding(false)}
      onTouchStart={() => setHolding(true)}
      onTouchEnd={() => setHolding(false)}
    >
      {isThrone ? (
        <ThroneBackdrop dimmed={stage === 'credits'} />
      ) : (
        <PitBackdrop dimmed={stage === 'credits'} />
      )}

      <div className="relative z-10 max-w-2xl w-full flex flex-col items-center gap-8">
        <div className="font-display text-[var(--color-accent-amber)] text-[10px] uppercase tracking-[0.4em] animate-fade-in-slow">
          {stage === 'credits'
            ? isThrone
              ? t('scenes.ending.throneCreditsEyebrow')
              : t('scenes.ending.pitCreditsEyebrow')
            : isThrone
              ? t('scenes.ending.throneEyebrow')
              : t('scenes.ending.pitEyebrow')}
        </div>

        <div className="text-center flex flex-col gap-5 min-h-[12rem] justify-center">
          {paragraphs.map((p, i) => (
            <p
              key={i}
              className="font-narrative text-lg md:text-xl text-[var(--color-text-primary)] italic leading-relaxed"
              style={{
                textShadow:
                  '0 0 24px rgba(244,167,66,0.35), 0 0 12px rgba(0,0,0,0.85), 0 2px 0 rgba(0,0,0,0.9)',
              }}
            >
              {p}
              {!done && i === paragraphs.length - 1 && (
                <span className="animate-pulse text-[var(--color-accent-amber)]">▌</span>
              )}
            </p>
          ))}
        </div>

        <div className="mt-2 flex flex-col items-center gap-3 min-h-[5rem]">
          {stage === 'offer' && done && (
            <div className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest italic animate-fade-in">
              {t('scenes.ending.clickToGoOn')}
            </div>
          )}

          {stage === 'credits' && done && (
            <div className="animate-fade-in flex flex-col items-center gap-3">
              <Button
                variant="primary"
                size="lg"
                onClick={(e) => {
                  e.stopPropagation();
                  concludeEnding();
                }}
              >
                {t('scenes.ending.letWheelTurn')}
              </Button>
            </div>
          )}

          {!done && (
            <div className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest italic">
              {holding ? t('scenes.ending.holdSpeed') : t('scenes.ending.skipHint')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Painted backdrop for the finale: the empty Throne of Bhaal in the red hall of
 * the Pocket Plane, the harvested essence pooling and steaming around its dais.
 * Goes cold and grey for the credits beat (the wheel ended, the red light gone).
 */
function ThroneBackdrop({ dimmed }: { dimmed: boolean }) {
  return (
    <div
      className="absolute inset-0 transition-[filter,opacity] duration-[2000ms]"
      style={{
        background: 'radial-gradient(ellipse at center, #1a0808 0%, #060202 100%)',
        filter: dimmed ? 'grayscale(0.85) brightness(0.7)' : 'none',
      }}
    >
      <svg
        viewBox="0 0 800 600"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
      >
        <defs>
          <linearGradient id="thr-hall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a0606" />
            <stop offset="45%" stopColor="#2a0a0c" />
            <stop offset="100%" stopColor="#120406" />
          </linearGradient>
          <radialGradient id="thr-glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#ff7a4a" stopOpacity="0.85" />
            <stop offset="45%" stopColor="#c0301c" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#c0301c" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="thr-pool" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#ff8a3a" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#a01818" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#a01818" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="thr-stone" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1c1216" />
            <stop offset="100%" stopColor="#0a0608" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="800" height="600" fill="url(#thr-hall)" />

        {/* Vaulted columns receding to the throne */}
        <g fill="#0c0608" opacity="0.9">
          <polygon points="0,80 90,140 90,520 0,560" />
          <polygon points="800,80 710,140 710,520 800,560" />
          <polygon points="120,150 180,190 180,500 120,520" />
          <polygon points="680,150 620,190 620,500 680,520" />
        </g>

        {/* Halo of the empty seat */}
        <rect x="280" y="120" width="240" height="280" fill="url(#thr-glow)" />

        {/* Dais steps */}
        <polygon points="300,470 500,470 540,500 260,500" fill="url(#thr-stone)" />
        <polygon points="320,440 480,440 512,468 288,468" fill="url(#thr-stone)" />
        <polygon points="340,412 460,412 486,438 314,438" fill="url(#thr-stone)" />

        {/* The empty throne */}
        <g>
          <rect x="356" y="250" width="88" height="170" fill="url(#thr-stone)" stroke="#060304" strokeWidth="2" />
          <rect x="348" y="232" width="104" height="26" fill="url(#thr-stone)" stroke="#060304" strokeWidth="2" />
          {/* High back, jagged crown */}
          <polygon
            points="360,250 360,150 378,120 386,160 400,110 414,160 422,120 440,150 440,250"
            fill="url(#thr-stone)"
            stroke="#060304"
            strokeWidth="2"
          />
          {/* Arms */}
          <rect x="338" y="300" width="20" height="80" fill="url(#thr-stone)" stroke="#060304" strokeWidth="1.5" />
          <rect x="442" y="300" width="20" height="80" fill="url(#thr-stone)" stroke="#060304" strokeWidth="1.5" />
          {/* The seat itself — emptiness, faintly lit from within */}
          <rect x="366" y="270" width="68" height="40" fill="#3a0e0e" opacity="0.8" />
          <rect x="372" y="276" width="56" height="28" fill="url(#thr-glow)" opacity="0.7" />
        </g>

        {/* Pools of harvested essence, steaming */}
        <ellipse cx="190" cy="540" rx="120" ry="26" fill="url(#thr-pool)" />
        <ellipse cx="610" cy="545" rx="130" ry="28" fill="url(#thr-pool)" />
        <ellipse cx="400" cy="560" rx="160" ry="22" fill="url(#thr-pool)" opacity="0.7" />

        {/* Faint embers rising */}
        <g fill="#ff9a5a" opacity="0.5">
          {[
            [220, 470],
            [560, 480],
            [300, 520],
            [500, 510],
            [400, 440],
            [180, 430],
            [640, 440],
          ].map(([x, y], i) => (
            <rect key={i} x={x} y={y} width={2} height={2} />
          ))}
        </g>

        <rect x="0" y="540" width="800" height="60" fill="#060202" opacity="0.6" />
      </svg>

      {/* Slow pulse on the throne halo — the seat breathing as it fills */}
      <div className="absolute left-1/2 top-[40%] -translate-x-1/2 w-64 h-72 rounded-full bg-[#ff5a2a] opacity-15 blur-3xl pointer-events-none animate-pulse-glow" />
      {/* Heat-shimmer flicker over the pools */}
      <div className="absolute inset-0 pointer-events-none animate-torch-flicker [background:radial-gradient(ellipse_at_50%_90%,rgba(255,120,60,0.2)_0%,transparent_45%)]" />
      <div className="absolute inset-0 [background:radial-gradient(ellipse_at_center,transparent_38%,rgba(0,0,0,0.7)_100%)] pointer-events-none" />
    </div>
  );
}

/**
 * Painted backdrop for the BASE-game finale: Irenicus's hell, the Pit. A cracked
 * floor breathing magma at the lip of a bottomless rift, jagged black spires, and
 * a broken iron cage hung open on its chains — the Cells you climbed out of, left
 * empty behind you. Goes cold and grey for the credits beat.
 */
function PitBackdrop({ dimmed }: { dimmed: boolean }) {
  return (
    <div
      className="absolute inset-0 transition-[filter,opacity] duration-[2000ms]"
      style={{
        background: 'radial-gradient(ellipse at center 70%, #2a0606 0%, #050101 100%)',
        filter: dimmed ? 'grayscale(0.85) brightness(0.7)' : 'none',
      }}
    >
      <svg
        viewBox="0 0 800 600"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
      >
        <defs>
          <radialGradient id="pit-rift" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#ffb04a" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#d0381c" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#a01010" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="pit-spire" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a0a0a" />
            <stop offset="100%" stopColor="#070202" />
          </linearGradient>
          <linearGradient id="pit-iron" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2a2024" />
            <stop offset="100%" stopColor="#0c0608" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="800" height="600" fill="#0a0303" />

        {/* The rift's deep glow, welling up from the centre of the floor */}
        <ellipse cx="400" cy="430" rx="300" ry="150" fill="url(#pit-rift)" />

        {/* Jagged spires of the hell, receding to either side */}
        <g fill="url(#pit-spire)">
          <polygon points="0,600 0,300 60,360 110,260 150,380 200,300 240,600" />
          <polygon points="800,600 800,320 740,370 690,250 650,390 600,310 560,600" />
          <polygon points="250,600 290,420 330,600" />
          <polygon points="470,600 520,440 560,600" />
        </g>

        {/* Cracked floor at the lip of the Pit, magma in the seams */}
        <g stroke="#ff7a30" strokeWidth="2" opacity="0.7">
          <path d="M 220 470 L 300 460 L 360 478 L 300 500 L 230 492 Z" fill="#1a0606" />
          <path d="M 480 466 L 560 458 L 600 480 L 540 498 L 478 488 Z" fill="#1a0606" />
          <path d="M 360 510 L 440 506 L 470 524 L 400 534 L 350 524 Z" fill="#1a0606" />
        </g>
        <g stroke="#ffaa4a" strokeWidth="1.5" opacity="0.55" fill="none">
          <path d="M 180 500 L 260 484 L 340 502" />
          <path d="M 470 498 L 560 482 L 640 500" />
          <path d="M 300 540 L 400 528 L 500 544" />
        </g>

        {/* The broken iron cage, hung open on its chains — the Cells, left empty */}
        <g stroke="#0a0506" strokeWidth="2">
          {/* Chain up to the dark */}
          <line x1="404" y1="40" x2="404" y2="150" stroke="#1a1216" strokeWidth="3" />
          {[60, 80, 100, 120].map((y) => (
            <ellipse key={y} cx="404" cy={y} rx="6" ry="9" fill="none" stroke="#1a1216" strokeWidth="2.5" />
          ))}
          {/* Cage body — bars bent outward, the door sprung open */}
          <g fill="url(#pit-iron)">
            <rect x="366" y="150" width="76" height="14" />
            <rect x="366" y="252" width="76" height="14" />
          </g>
          <g stroke="#2a2024" strokeWidth="4" fill="none" strokeLinecap="round">
            <line x1="376" y1="164" x2="374" y2="252" />
            <line x1="404" y1="164" x2="404" y2="252" />
            {/* Two bars wrenched open — the prisoner is long gone */}
            <path d="M 432 164 C 452 190, 456 220, 440 252" />
            <path d="M 418 164 C 430 196, 430 224, 420 252" />
          </g>
          {/* Faint heat-light leaking up through the empty cage */}
          <rect x="376" y="170" width="58" height="78" fill="url(#pit-rift)" opacity="0.4" />
        </g>

        {/* Embers rising off the seams */}
        <g fill="#ff9a4a" opacity="0.6">
          {[
            [240, 470],
            [560, 460],
            [400, 510],
            [320, 440],
            [500, 430],
            [180, 410],
            [620, 420],
            [400, 380],
          ].map(([x, y], i) => (
            <rect key={i} x={x} y={y} width={2} height={2} />
          ))}
        </g>

        <rect x="0" y="556" width="800" height="44" fill="#050101" opacity="0.7" />
      </svg>

      {/* Slow pulse on the rift — the Pit breathing as it cools */}
      <div className="absolute left-1/2 top-[68%] -translate-x-1/2 w-80 h-40 rounded-full bg-[#ff5a2a] opacity-15 blur-3xl pointer-events-none animate-pulse-glow" />
      {/* Heat-shimmer flicker over the seams */}
      <div className="absolute inset-0 pointer-events-none animate-torch-flicker [background:radial-gradient(ellipse_at_50%_75%,rgba(255,110,50,0.2)_0%,transparent_45%)]" />
      <div className="absolute inset-0 [background:radial-gradient(ellipse_at_center,transparent_38%,rgba(0,0,0,0.72)_100%)] pointer-events-none" />
    </div>
  );
}
