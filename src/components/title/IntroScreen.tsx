import { useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '../../i18n/useT';

interface IntroScreenProps {
  onComplete: () => void;
}

const SCENE_COUNT = 8;
/** The scenes spoken by the unblinking voice rather than narrated. */
const VOICE_SCENES = new Set([3, 5]);

const BASE_TICK = 22;
const FAST_TICK = 4;

export function IntroScreen({ onComplete }: IntroScreenProps) {
  const { t, locale } = useT();
  const SCENES = useMemo(
    () =>
      Array.from({ length: SCENE_COUNT }, (_, i) => ({
        speaker: VOICE_SCENES.has(i) ? t('screens.intro.voiceSpeaker') : undefined,
        text: t(`screens.intro.s${i}`),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale],
  );
  const [idx, setIdx] = useState(0);
  const [typed, setTyped] = useState('');
  const [done, setDone] = useState(false);
  const [holding, setHolding] = useState(false);
  const indexRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scene = SCENES[idx];

  // Reset on scene change
  useEffect(() => {
    indexRef.current = 0;
    setTyped('');
    setDone(false);
  }, [idx]);

  // Typewriter at current speed; restarts on holding toggle, preserves index.
  useEffect(() => {
    if (done) return;
    const speed = holding ? FAST_TICK : BASE_TICK;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      indexRef.current += 1;
      setTyped(scene.text.slice(0, indexRef.current));
      if (indexRef.current >= scene.text.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        setDone(true);
      }
    }, speed);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [scene.text, holding, done]);

  function completeNow() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    indexRef.current = scene.text.length;
    setTyped(scene.text);
    setDone(true);
  }

  function advanceNext() {
    if (idx >= SCENES.length - 1) {
      onComplete();
      return;
    }
    setIdx((i) => i + 1);
  }

  function handleClick() {
    if (!done) {
      completeNow();
      return;
    }
    advanceNext();
  }

  function handleDoubleClick(e: React.MouseEvent) {
    e.preventDefault();
    completeNow();
    advanceNext();
  }

  const isVoiceLine = scene.speaker !== undefined;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-8 [background:radial-gradient(ellipse_at_center,#1a0e08_0%,#080404_100%)]">
      <div
        className="max-w-2xl w-full bg-[var(--color-bg-panel)] border-2 border-[var(--color-border-warm)] p-8 shadow-[0_8px_40px_rgba(0,0,0,0.6)] animate-fade-in select-none"
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onMouseDown={() => setHolding(true)}
        onMouseUp={() => setHolding(false)}
        onMouseLeave={() => setHolding(false)}
        onTouchStart={() => setHolding(true)}
        onTouchEnd={() => setHolding(false)}
        style={{ cursor: 'pointer' }}
      >
        {isVoiceLine && (
          <div className="text-[var(--color-accent-blood)] text-xs uppercase tracking-[0.4em] mb-3 font-bold">
            ◆ {scene.speaker}
          </div>
        )}
        <p
          className={`
            text-base md:text-lg leading-relaxed min-h-[6rem]
            ${isVoiceLine ? 'italic text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'}
          `}
          style={{ textShadow: '0 0 8px rgba(0,0,0,0.5)' }}
        >
          {typed}
          {!done && <span className="animate-pulse text-[var(--color-accent-amber)]">▌</span>}
        </p>
        <div className="mt-6 flex justify-between items-center text-xs uppercase tracking-widest text-[var(--color-text-dim)]">
          <span>
            {idx + 1} / {SCENES.length}
          </span>
          <span>
            {holding
              ? t('screens.intro.holding')
              : done
                ? t('screens.intro.clickContinue')
                : t('screens.intro.clickHint')}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={onComplete}
        className="text-[var(--color-text-dim)] text-xs uppercase tracking-widest hover:text-[var(--color-text-secondary)]"
      >
        {t('screens.intro.skip')}
      </button>
    </div>
  );
}
