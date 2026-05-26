import { useEffect, useRef, useState } from 'react';

interface IntroScreenProps {
  onComplete: () => void;
}

const SCENES: { speaker?: string; text: string }[] = [
  {
    text: 'In the dark, you wake. Iron at your wrists. Salt on your tongue. The stink of the dying nearby.',
  },
  {
    text: 'You remember a forest road. A blade between your ribs. Your sister\'s voice, calling.',
  },
  {
    text: 'You remember the man with the eyes that did not blink — the one who said, "You are mine now."',
  },
  {
    speaker: 'The voice in the dark',
    text: 'Bhaalspawn. Childe of the slain. You have proven exceptionally resilient. Even your sister\'s screams could not break you. Yet.',
  },
  {
    text: 'The cell door is not locked. He has left it open for you to walk.',
  },
  {
    speaker: 'The voice in the dark',
    text: 'You will work for me, whether you know it or not. The cellars beneath this place are mine — and so, in time, will be the rest. Walk, child. There is so much you have to learn.',
  },
  {
    text: 'He gave no name. The unblinking eyes did not need one.',
  },
  {
    text: 'You are the work.',
  },
];

export function IntroScreen({ onComplete }: IntroScreenProps) {
  const [idx, setIdx] = useState(0);
  const [typed, setTyped] = useState('');
  const [done, setDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scene = SCENES[idx];

  useEffect(() => {
    setTyped('');
    setDone(false);
    let i = 0;
    const text = scene.text;
    intervalRef.current = setInterval(() => {
      i += 1;
      setTyped(text.slice(0, i));
      if (i >= text.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        setDone(true);
      }
    }, 22);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [idx, scene.text]);

  function handleAdvance() {
    // If still typing: STOP the interval and reveal the full line.
    if (!done) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      setTyped(scene.text);
      setDone(true);
      return;
    }
    // If already shown: move to the next scene (or finish).
    if (idx >= SCENES.length - 1) {
      onComplete();
      return;
    }
    setIdx((i) => i + 1);
  }

  const isVoiceLine = scene.speaker !== undefined;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-8 [background:radial-gradient(ellipse_at_center,#1a0e08_0%,#080404_100%)]">
      <div
        className="max-w-2xl w-full bg-[var(--color-bg-panel)] border-2 border-[var(--color-border-warm)] p-8 shadow-[0_8px_40px_rgba(0,0,0,0.6)] animate-fade-in select-none"
        onClick={handleAdvance}
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
          style={{
            textShadow: '0 0 8px rgba(0,0,0,0.5)',
          }}
        >
          {typed}
          {!done && <span className="animate-pulse text-[var(--color-accent-amber)]">▌</span>}
        </p>
        <div className="mt-6 flex justify-between items-center text-xs uppercase tracking-widest text-[var(--color-text-dim)]">
          <span>
            {idx + 1} / {SCENES.length}
          </span>
          <span>{done ? '► click to continue' : '► click to skip text'}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={onComplete}
        className="text-[var(--color-text-dim)] text-xs uppercase tracking-widest hover:text-[var(--color-text-secondary)]"
      >
        Skip intro
      </button>
    </div>
  );
}
