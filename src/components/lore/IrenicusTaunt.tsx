import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';

export type TauntContext = 'death' | 'chapter-clear' | 'first-blood' | 'idle' | 'rest' | 'victory';
export type SoulVoiceSpeaker = 'irenicus' | 'imoen';

const QUOTES: Record<SoulVoiceSpeaker, Record<TauntContext, string[]>> = {
  irenicus: {
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
    rest: [
      'Sit. Breathe. Pretend the chains are not still wrapped around your spine.',
    ],
    victory: [
      'You enjoy this, don\'t you. You begin to understand what I made you for.',
    ],
  },
  imoen: {
    death: [
      "Hey. Hey, c'mon. Get up. Don't you dare die on me here.",
      "I felt that. Don't... don't go quiet on me. Please.",
    ],
    'chapter-clear': [
      "I felt that crash. You did that? You're really doing this. Keep going. Find me.",
    ],
    'first-blood': [
      "Was that you? It felt like you. I can almost... almost see where you are.",
    ],
    idle: [
      "I'm in the dark too. He hasn't started on me yet. I think. Hurry.",
    ],
    rest: [
      "Catch your breath. He can't reach you when you're still. Or — I don't think he can.",
      "I think this is the first time I've been able to whisper without him hearing. Don't waste it. Eat. Drink. Live.",
    ],
    victory: [
      "You won. I can feel you grinning. Don't lose that.",
    ],
  },
};

interface SoulVoiceProps {
  speaker: SoulVoiceSpeaker;
  context: TauntContext;
  onDismiss: () => void;
  seed?: number;
}

export function IrenicusTaunt({ speaker, context, onDismiss, seed = 0 }: SoulVoiceProps) {
  const pool = QUOTES[speaker]?.[context] ?? QUOTES.irenicus.idle;
  const quote = pool[seed % pool.length];

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

  const isIrenicus = speaker === 'irenicus';
  const accentClass = isIrenicus
    ? 'text-[var(--color-accent-blood)]'
    : 'text-[var(--color-accent-amber)]';
  const borderClass = isIrenicus
    ? 'border-[var(--color-accent-blood)] shadow-[0_0_32px_rgba(181,48,44,0.45)]'
    : 'border-[var(--color-accent-amber)] shadow-[0_0_32px_rgba(244,167,66,0.35)]';
  const bgClass = isIrenicus ? 'bg-[#160a08]' : 'bg-[#1a1408]';
  // Antagonist stays anonymous until the player has unmasked him through play.
  // Imoen is named once she speaks (she introduces herself in her first whisper).
  const speakerName = isIrenicus ? 'The voice in the dark' : 'A voice — small, frightened';
  const subtitle = isIrenicus
    ? '(through the soul-bond)'
    : '(through the soul-bond, faint)';
  const buttonVariant = isIrenicus ? 'danger' : 'primary';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-bg-base)]/85 p-6 animate-fade-in"
      onClick={() => done && onDismiss()}
    >
      <div className={`max-w-xl w-full ${bgClass} border-2 ${borderClass} p-6`}>
        <div className="flex items-center justify-between mb-3">
          <div className={`${accentClass} text-xs uppercase tracking-[0.4em] font-bold`}>
            ◆ {speakerName}
          </div>
          <div className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest italic">
            {subtitle}
          </div>
        </div>
        <p
          className="text-[var(--color-text-primary)] text-base italic leading-relaxed min-h-[5rem]"
          style={{ textShadow: '0 0 6px rgba(0,0,0,0.6)' }}
        >
          "{typed}
          {!done && <span className={`animate-pulse ${accentClass}`}>▌</span>}
          {done && '"'}
        </p>
        <div className="mt-5 flex justify-end">
          <Button variant={done ? buttonVariant : 'secondary'} onClick={onDismiss} disabled={!done}>
            {done ? 'Continue' : '...'}
          </Button>
        </div>
      </div>
    </div>
  );
}
