import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../ui/Button';
import { Imoen, Irenicus as IrenicusPortrait } from './NpcPortrait';

export type TauntContext =
  | 'death'
  | 'chapter-clear'
  | 'first-blood'
  | 'idle'
  | 'rest'
  | 'victory'
  | 'descent'
  | 'reincarnation'
  | 'boss-approach'
  | 'low-hp';
export type SoulVoiceSpeaker = 'irenicus' | 'imoen';

const QUOTES: Record<SoulVoiceSpeaker, Record<TauntContext, string[]>> = {
  irenicus: {
    death: [
      'Again? You are very predictable, you know. Rise, and try not to disappoint me a third time.',
      'Pain teaches. Death teaches better. Walk back into the dark, child, and learn.',
      'The grove revives you. The grove will tire of you. Hurry.',
      'You die so prettily. Almost as if you were made for it.',
      'There is no end here, only repetition. I had hoped you would understand by now.',
      'The body fails. The soul does not — that is the experiment. Continue.',
      'I have watched a thousand of you fall. You are not the first, and you will not be the last.',
    ],
    'chapter-clear': [
      'The Warden was useful, in his way. Less so now. You move forward. Good.',
      'You begin to surprise me. I had not expected this much of you.',
      'Tresendar Manor was only the lid. What lies beneath is the wound.',
      'Athkatla bleeds gold, and you have learned to draw it. Useful.',
      'Spellhold sealed me once. You will be the one to pry it open. How fitting.',
      'Ust Natha is the throat of the Underdark. Walk it. Do not cough.',
      'One more door behind you. There are still more in front than you imagine.',
      'You think this is a victory. You are wrong, but the mistake is instructive.',
    ],
    'first-blood': [
      'Good. The Reincarnate spell holds. The mortal you call yourself will not — but you persist.',
      'The shape changes. The soul does not. You are still mine.',
      'First blood. You always did love this part of yourself.',
      "The kill steadied you, didn't it. I felt it through the bond. Do not pretend otherwise.",
      'There. That is the part of you I want. Hold onto it.',
    ],
    idle: [
      'I see you, child. Whatever flesh, whatever name. I see you.',
      'The chains are mine to forge and mine to lift. Remember that, when next you wake.',
      'You are quiet. That is when you are most dangerous. To yourself.',
      'I am always here, in the back of you. Like a tooth that hurts when you forget it.',
    ],
    rest: [
      'Sit. Breathe. Pretend the chains are not still wrapped around your spine.',
      'Rest is a small mercy I have not yet decided to take from you.',
      'A fire, a meal, a moment of peace. Enjoy it. I will be here when the embers die.',
      'You think yourself safe by a fire. I have burned safer places than this.',
    ],
    victory: [
      "You enjoy this, don't you. You begin to understand what I made you for.",
      'Yes. Yes. That is the look I have been waiting to see in you.',
      'A clean kill. A clean breath. You are becoming what I require.',
      'Hold the moment. Then walk forward. There is more for you.',
    ],
    descent: [
      'Down again. Always down. You begin to feel the pattern of it.',
      'The dark is not your enemy. The dark is the room you were born in.',
      'Walk. I will not narrate every step — but I will be watching the important ones.',
      'You step into the dark of your own accord this time. Good. That is closer to honesty.',
      'Another delve. Another peeling. Each one shows me more of the shape beneath.',
    ],
    reincarnation: [
      'Awake again. The grove is so very obliging.',
      'A new body. The same soul. The same chain.',
      'You wear flesh the way one wears a coat. I am the cold under both.',
      'They say the body remembers. Yours does. Try not to make it remember pain.',
      'Reborn. Reborn. Reborn. Has the word lost its weight for you yet? It has for me.',
    ],
    'boss-approach': [
      'Ah. Now we see if you have been listening, or only breathing.',
      'The thing on the other side of this door is bigger than you. Most things are.',
      'I am curious. Truly. Try not to die in a boring way.',
      'A worthy opponent. Mine were worthier. Show me you have grown.',
      'Hold your weapon as if you mean it. The room ahead will not forgive a half-grip.',
    ],
    'low-hp': [
      'Bleeding already. How quickly the spine softens.',
      'You are not finished yet. I would notice if you were.',
      'Hold. The last quarter of a life is where the soul learns what it is.',
      'One more wound and I will have to find you another body. Inconvenient. For both of us.',
      'You taste the iron in your mouth. Good. Remember it.',
    ],
  },
  imoen: {
    death: [
      "Hey. Hey, c'mon. Get up. Don't you dare die on me here.",
      "I felt that. Don't... don't go quiet on me. Please.",
      "No. Not yet. We're not done. Get up.",
      "I'm not letting go. Whatever this is, whatever you're feeling — I'm holding on.",
      "It hurts, I know. I'm sorry. I'm so sorry. But you have to get up.",
      "Don't make me come find a body. Get up. Get UP.",
    ],
    'chapter-clear': [
      "I felt that crash. You did that? You're really doing this. Keep going. Find me.",
      "Every door you break, I hear it. It's like — it's like you're getting closer.",
      "He's quieter when you win. Did you know that? It's the only time he ever shuts up.",
      "I knew it. I knew it was you. Keep coming. Please keep coming.",
      "One step closer to wherever he's keeping me. I'm trying to stay still so you can find me.",
    ],
    'first-blood': [
      "Was that you? It felt like you. I can almost... almost see where you are.",
      "I felt it. The strike. It was clean. Don't let him talk you into thinking that was bad.",
      "First one's the hardest. You did fine. Keep your head.",
      "I can feel your heart from here. It's loud. It's good. Keep it loud.",
    ],
    idle: [
      "I'm in the dark too. He hasn't started on me yet. I think. Hurry.",
      "If I think too loud he hears me. So I'm — I'm just going to whisper. Hi. I love you.",
      "I'm okay. Don't worry about me. Worry about the next room.",
      "Sometimes I'm not sure if you can hear me. But I keep talking. Just in case.",
    ],
    rest: [
      "Catch your breath. He can't reach you when you're still. Or — I don't think he can.",
      "I think this is the first time I've been able to whisper without him hearing. Don't waste it. Eat. Drink. Live.",
      "If you sleep, dream of something kind. There's been enough of the other kind.",
      "I used to make you eat when you forgot to. Eat now. I'm watching.",
      "Sit with me a minute. Even if you can't see me. I'm here.",
    ],
    victory: [
      "You won. I can feel you grinning. Don't lose that.",
      "There you are. There's the one I remember.",
      "I felt that. Whoever it was — they deserved it. I won't pretend otherwise.",
      "Keep that. Whatever it is that just lit up in you. Keep it.",
    ],
    descent: [
      "You're going back in. Of course you are. Be careful. Be loud only when you mean to be.",
      "Take a breath at the door. I always made you do that. Do it now.",
      "I'm here. The whole way down. I won't go quiet.",
      "Don't be afraid. Or — be afraid, but go anyway. That's all bravery ever was.",
    ],
    reincarnation: [
      "You're back. You're back you're back you're back. I felt you wake up.",
      "Hi. Hi, hello. I know you don't remember the last one. That's okay. I do.",
      "New face. Same you. I'd know your soul anywhere.",
      "Get up slow. The grove always makes the first breath hurt. Drink some water.",
    ],
    'boss-approach': [
      "Whatever's behind that door — it's big. I can feel it from here. Be ready.",
      "You don't have to go in yet. Breathe first. Then go.",
      "I'm scared for you. I am. But you can do this.",
      "If you have a thing you say to yourself before a hard fight — say it now.",
    ],
    'low-hp': [
      "You're bleeding too much. Drink a potion. Right now. Please.",
      "I can feel you fading. Don't. Don't you dare.",
      "Step back. Just for a second. The fight will still be there.",
      "If you don't take care of yourself I'm going to be very cross when you get here.",
    ],
  },
};

interface SoulVoiceProps {
  speaker: SoulVoiceSpeaker;
  context: TauntContext;
  onDismiss: () => void;
  seed?: number;
}

const BASE_TICK = 28;
const FAST_TICK = 4;

export function IrenicusTaunt({ speaker, context, onDismiss, seed = 0 }: SoulVoiceProps) {
  const pool = QUOTES[speaker]?.[context] ?? QUOTES.irenicus.idle;
  const quote = pool[seed % pool.length];

  const [typed, setTyped] = useState('');
  const [done, setDone] = useState(false);
  const [holding, setHolding] = useState(false);
  const indexRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset when quote changes
  useEffect(() => {
    indexRef.current = 0;
    setTyped('');
    setDone(false);
  }, [quote]);

  useEffect(() => {
    if (done) return;
    const speed = holding ? FAST_TICK : BASE_TICK;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      indexRef.current += 1;
      setTyped(quote.slice(0, indexRef.current));
      if (indexRef.current >= quote.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        setDone(true);
      }
    }, speed);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [quote, holding, done]);

  function completeNow() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    indexRef.current = quote.length;
    setTyped(quote);
    setDone(true);
  }

  function handleClick() {
    if (!done) {
      completeNow();
      return;
    }
    onDismiss();
  }

  function handleDoubleClick(e: React.MouseEvent) {
    e.preventDefault();
    onDismiss();
  }

  const isIrenicus = speaker === 'irenicus';
  const sideClass = isIrenicus ? 'justify-end' : 'justify-start';
  const accentClass = isIrenicus
    ? 'text-[var(--color-accent-blood)]'
    : 'text-[var(--color-accent-amber)]';
  const borderClass = isIrenicus
    ? 'border-[var(--color-accent-blood)] shadow-[0_0_36px_rgba(181,48,44,0.55)]'
    : 'border-[var(--color-accent-amber)] shadow-[0_0_36px_rgba(244,167,66,0.45)]';
  const paletteBg = useMemo(() => {
    if (isIrenicus) {
      return 'linear-gradient(135deg, #1c0814 0%, #260a18 55%, #14060c 100%)';
    }
    return 'linear-gradient(135deg, #1a1408 0%, #2a1c0a 55%, #1a1408 100%)';
  }, [isIrenicus]);
  const speakerName = isIrenicus ? 'Irenicus' : 'Imoen';
  const subtitle = isIrenicus
    ? 'the voice in the dark — through the soul-bond'
    : 'a voice, small and frightened — through the soul-bond';

  const buttonVariant = isIrenicus ? 'danger' : 'primary';

  const PortraitGlyph = isIrenicus ? IrenicusPortrait : Imoen;

  // Tail / arrow points from the bubble back toward the portrait. For
  // Irenicus the portrait sits on the right, so the tail points right.
  const tailSide = isIrenicus ? 'right-[12.5rem]' : 'left-[12.5rem]';
  const portraitFrameTint = isIrenicus
    ? 'border-[var(--color-accent-blood)] shadow-[0_0_20px_rgba(181,48,44,0.55)] bg-[#1a0a14]'
    : 'border-[var(--color-accent-amber)] shadow-[0_0_20px_rgba(244,167,66,0.45)] bg-[#1a1408]';

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end ${sideClass} bg-[var(--color-bg-base)]/85 p-4 md:p-10 animate-fade-in`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseDown={() => setHolding(true)}
      onMouseUp={() => setHolding(false)}
      onMouseLeave={() => setHolding(false)}
    >
      {/* Layout: portrait + bubble in a row. Imoen on left, Irenicus on right. */}
      <div
        className={`flex items-end gap-3 md:gap-5 max-w-3xl w-full ${
          isIrenicus ? 'flex-row-reverse' : 'flex-row'
        }`}
      >
        {/* Portrait pillar */}
        <div
          className={`shrink-0 border-2 ${portraitFrameTint} p-2 md:p-3 select-none`}
          style={{ imageRendering: 'pixelated' }}
        >
          <PortraitGlyph className="w-20 md:w-28 h-auto" />
          <div
            className={`mt-1 text-center text-[10px] md:text-xs uppercase tracking-[0.3em] font-bold ${accentClass}`}
          >
            ◆ {speakerName}
          </div>
        </div>

        {/* Speech bubble */}
        <div className="relative flex-1 min-w-0">
          {/* Tail (subtle triangle pointing toward the portrait) */}
          <div
            className={`hidden md:block absolute bottom-6 ${tailSide} w-0 h-0 border-y-8 border-y-transparent ${
              isIrenicus
                ? 'border-l-8 border-l-[var(--color-accent-blood)]'
                : 'border-r-8 border-r-[var(--color-accent-amber)]'
            }`}
            aria-hidden
          />
          <div
            className={`border-2 ${borderClass} p-4 md:p-6 select-none`}
            style={{ background: paletteBg }}
          >
            <div className="flex items-center justify-between mb-2 gap-3">
              <div
                className={`${accentClass} text-[10px] md:text-xs uppercase tracking-[0.35em] font-bold`}
              >
                {subtitle}
              </div>
            </div>
            <p
              className="text-[var(--color-text-primary)] text-sm md:text-base italic leading-relaxed min-h-[4.5rem]"
              style={{ textShadow: '0 0 6px rgba(0,0,0,0.6)' }}
            >
              "{typed}
              {!done && <span className={`animate-pulse ${accentClass}`}>▌</span>}
              {done && '"'}
            </p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest italic">
                {holding
                  ? '▶▶ holding to speed'
                  : done
                    ? ''
                    : 'click skip · hold speed · 2× dismiss'}
              </div>
              <Button
                variant={done ? buttonVariant : 'secondary'}
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss();
                }}
                disabled={!done}
              >
                {done ? 'Continue' : '...'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
