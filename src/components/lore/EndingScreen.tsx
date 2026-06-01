import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { Button } from '../ui/Button';
import { playSfx } from '../../engine/audio';

const BASE_TICK = 34;
const FAST_TICK = 4;

type EndingChoice = 'ascend' | 'mortal';
type Stage = 'offer' | 'epilogue' | 'credits';

const SOLAR_OFFER = [
  "Amelyssan is unmade. The harvest she spent an age gathering spills back into the dark, and above its cooling pools the Throne of Bhaal stands empty — empty, and waiting, and turned toward you.",
  "A Solar descends through the red light on wings the colour of a struck bell, and does not draw her blade. \"Child of the dead god,\" she says. \"The portfolio of Murder has no holder, and you are the last vessel left whole enough to take it up. The choice the Father never offered you is yours alone now.\"",
  "\"Reach into the Throne, and the divinity is yours. You will rise as the new God of Murder, and the wheel that has turned you life into life will turn for you no longer — you will be the hand that turns it for others. Or refuse it. Let the taint burn out of your blood, and the godhood with it, and walk back down into the world a mortal thing that bleeds and ages and ends.\"",
  "\"Choose. The blood is already deciding without you.\"",
];

const EPILOGUE: Record<EndingChoice, string[]> = {
  ascend: [
    "You set your hand into the Throne, and the empty seat fills.",
    "The last of the essence does not pour into you so much as recognise you — every measure Amelyssan reaped, every death you died on the long road, all of it rising at once to a single owner. The mortal thing you were thins to a rumour. Far off, the world's killers turn in their sleep toward a master they cannot name; a knife is lifted in a dark room a thousand miles away, and you answer the lifting of it before you have decided to. There is no cruelty in it, and no mercy either — only the cold arithmetic of endings, and you are the sum of it now.",
    "The Solar bows her bright head. Not in worship. In the grief of a thing that has watched this happen before. Beneath your feet the wheel that spun you through a hundred lives goes still, and does not start again. It does not need to. The God of Murder does not reincarnate. He presides.",
    "Below, in the world, they will not learn your name. They will only feel the cold when they raise the blade, and call it by older names, and never once guess that their god learned its patience in an iron cell — life, after life, after life.",
  ],
  mortal: [
    "You take your hand back from the Throne, and the empty seat stays empty.",
    "It costs more than the reaching would have. Divinity does not leave a vessel gently; it tears the way a hook tears, and every life the wheel ever spun you through goes out at once, like lamps down a long hall — the iron cell, the cold road, the hundred deaths — all of it burning away to leave a thing small enough to die. When it is done you are kneeling in the cooling blood of a god, and you are only a person, and your knees ache, and you are gloriously, ordinarily cold.",
    "The Solar smiles — the first wholly mortal expression to cross a divine face in all this hall — and the red light lifts. The wheel is broken. There will be no waking again in the grove with the flesh made new; there will be one life now, the way there is for everyone, and an end to it that stays an end.",
    "You walk back down out of the Pocket Plane into a morning that belongs to no god at all. Somewhere south the Trade Way is dusty and unremarkable and yours. You have a great deal of it left to walk — and for the first time, the certainty that the walking will not come round again.",
  ],
};

const CREDITS = [
  "The soul remembers. The flesh forgets.",
  "This one chose. Whether it climbed onto the Throne or turned its back upon it, the chain that bound it to the wheel is ended — and that, of all the things a Child of Bhaal might do, was the rarest of them.",
  "Here the tale of this soul closes.",
];

function paragraphsFor(stage: Stage, choice: EndingChoice | null): string[] {
  if (stage === 'offer') return SOLAR_OFFER;
  if (stage === 'credits') return CREDITS;
  return choice ? EPILOGUE[choice] : [];
}

export function EndingScreen() {
  const recordEnding = useGameStore((s) => s.recordEnding);
  const finishDelve = useGameStore((s) => s.finishDelve);

  const [stage, setStage] = useState<Stage>('offer');
  const [choice, setChoice] = useState<EndingChoice | null>(null);
  const [typed, setTyped] = useState('');
  const [done, setDone] = useState(false);
  const [holding, setHolding] = useState(false);
  const indexRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fullText = paragraphsFor(stage, choice).join('\n\n');

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

  function pick(c: EndingChoice) {
    playSfx('ui_click');
    // Record now (sets gameCompleted) so the deferred finishDelve() re-entry on
    // the credits button skips the capstone gate and runs the normal settle.
    recordEnding(c);
    setChoice(c);
    setStage('epilogue');
    resetTyper();
  }

  function advanceToCredits() {
    setStage('credits');
    resetTyper();
  }

  // A click skips the typewriter to the end; once a non-offer stage has finished
  // typing, a further click steps to the next stage. The offer waits for a
  // deliberate choice instead of advancing on click.
  function handleClick() {
    if (!done) {
      completeNow();
      return;
    }
    if (stage === 'epilogue') advanceToCredits();
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
      <ThroneBackdrop dimmed={stage === 'credits'} />

      <div className="relative z-10 max-w-2xl w-full flex flex-col items-center gap-8">
        <div className="font-display text-[var(--color-accent-amber)] text-[10px] uppercase tracking-[0.4em] animate-fade-in-slow">
          {stage === 'credits'
            ? '◆ The wheel, ended ◆'
            : stage === 'epilogue'
              ? choice === 'ascend'
                ? '◆ Apotheosis ◆'
                : '◆ The taint released ◆'
              : '◆ The Throne of Bhaal ◆'}
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
            <div className="animate-fade-in flex flex-col sm:flex-row items-stretch gap-3 w-full">
              <Button
                variant="primary"
                size="lg"
                onClick={(e) => {
                  e.stopPropagation();
                  pick('ascend');
                }}
              >
                Take up the portfolio — Ascend
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={(e) => {
                  e.stopPropagation();
                  pick('mortal');
                }}
              >
                Let it burn away — Walk back mortal
              </Button>
            </div>
          )}

          {stage === 'epilogue' && done && (
            <div className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest italic animate-fade-in">
              click to go on
            </div>
          )}

          {stage === 'credits' && done && (
            <div className="animate-fade-in flex flex-col items-center gap-3">
              <Button
                variant="primary"
                size="lg"
                onClick={(e) => {
                  e.stopPropagation();
                  // Re-enter the clear path: the delve is still 'completed' and
                  // gameCompleted is now true, so finishDelve settles renown,
                  // reincarnates the soul, and lands at the hub.
                  finishDelve();
                }}
              >
                Walk back into Phandalin →
              </Button>
            </div>
          )}

          {!done && (
            <div className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest italic">
              {holding ? '▶▶ holding to speed' : 'click skips · hold speeds'}
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
