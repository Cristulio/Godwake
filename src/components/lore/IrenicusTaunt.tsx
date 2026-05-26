import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';

export type TauntContext = 'death' | 'chapter-clear' | 'first-blood' | 'idle';

const QUOTE_POOL: Record<TauntContext, string[]> = {
  death: [
    'Again? You are very predictable, you know. Rise, and try not to disappoint me a third time.',
    'Pain teaches. Death teaches better. Walk back into the dark, child, and learn.',
    'The grove revives you. The grove will tire of you. Hurry.',
  ],
  'chapter-clear': [
    'The Warden was useful, in his way. Less so now. You move forward. Good.',
    'You begin to surprise me. I had not expected this much of you.',
    'Tresendar Manor was only the lid. What lies beneath is the wound.',
  ],
  'first-blood': [
    'Good. The Reincarnate spell holds. The mortal you call yourself will not — but you persist.',
    'The shape changes. The soul does not. You are still mine.',
  ],
  idle: [
    'I see you, child. Whatever flesh, whatever name. I see you.',
    'The chains are mine to forge and mine to lift. Remember that, when next you wake.',
  ],
};

interface IrenicusTauntProps {
  context: TauntContext;
  onDismiss: () => void;
  seed?: number;
}

/**
 * Dark dialog overlay — Irenicus speaking through the soul-bond. Typewriter
 * reveal. Click anywhere or press the button to dismiss.
 */
export function IrenicusTaunt({ context, onDismiss, seed = 0 }: IrenicusTauntProps) {
  const quotes = QUOTE_POOL[context];
  const quote = quotes[seed % quotes.length];

  const [typed, setTyped] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setTyped('');
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setTyped(quote.slice(0, i));
      if (i >= quote.length) {
        clearInterval(interval);
        setDone(true);
      }
    }, 28);
    return () => clearInterval(interval);
  }, [quote]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-bg-base)]/85 p-6 animate-fade-in"
      onClick={() => done && onDismiss()}
    >
      <div className="max-w-xl w-full bg-[#160a08] border-2 border-[var(--color-accent-blood)] p-6 shadow-[0_0_32px_rgba(181,48,44,0.45)]">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[var(--color-accent-blood)] text-xs uppercase tracking-[0.4em] font-bold">
            ◆ Jon Irenicus
          </div>
          <div className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest italic">
            (through the soul-bond)
          </div>
        </div>
        <p
          className="text-[var(--color-text-primary)] text-base italic leading-relaxed min-h-[5rem]"
          style={{ textShadow: '0 0 6px rgba(0,0,0,0.6)' }}
        >
          "{typed}
          {!done && <span className="animate-pulse text-[var(--color-accent-blood)]">▌</span>}
          {done && '"'}
        </p>
        <div className="mt-5 flex justify-end">
          <Button variant={done ? 'danger' : 'secondary'} onClick={onDismiss} disabled={!done}>
            {done ? 'Continue' : '...'}
          </Button>
        </div>
      </div>
    </div>
  );
}
