import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../ui/Button';
import { Imoen, Irenicus as IrenicusPortrait } from './NpcPortrait';
import { useMetaStore } from '../../stores/metaStore';

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

// Pre-reveal labels for the soul-bond NPCs. The player only sees the real
// name after an in-game introduction beat (see metaStore.knownNpcs).
const PRE_REVEAL_LABEL: Record<SoulVoiceSpeaker, string> = {
  irenicus: 'The Voice',
  imoen: 'A Whisper',
};
const REAL_NAME: Record<SoulVoiceSpeaker, string> = {
  irenicus: 'Irenicus',
  imoen: 'Imoen',
};

/**
 * The soul-bond voices evolve with story progress, not just the moment.
 * `chaptersCleared` (the all-time high-water mark on metaStore) is the arc
 * axis: 0 = still in the Iron Cells, 4 = the whole chain has fallen.
 *
 *   Irenicus: clinical curiosity → genuine investment → revealing the bond.
 *   Imoen:    distant frightened whisper → "I can almost see you" → "you're
 *             close, find me."
 */
type VoiceTier = 'early' | 'mid' | 'late';
type ArcContext = Exclude<TauntContext, 'chapter-clear'>;

export interface VoiceProgression {
  chaptersCleared: number;
  deathCount: number;
  hasReincarnated: boolean;
  /** Chapter just cleared (1-4). Only meaningful for the 'chapter-clear' context. */
  clearedChapter?: number;
  /** Drives the within-tier pick so a given moment is stable but varied across plays. */
  seed: number;
}

export function progressionTier(chaptersCleared: number): VoiceTier {
  if (chaptersCleared >= 3) return 'late';
  if (chaptersCleared >= 1) return 'mid';
  return 'early';
}

// chapter-clear lines name specific chapters, so they are keyed by the chapter
// actually cleared (1 = Tresendar, 2 = Athkatla, 3 = Spellhold, 4 = Ust Natha)
// rather than picked at random.
export const CHAPTER_CLEAR: Record<SoulVoiceSpeaker, Record<number, string[]>> = {
  irenicus: {
    1: [
      'Tresendar Manor was only the lid. What lies beneath is the wound.',
      'The Warden was useful, in his way. Less so now. You move forward. Good.',
      'You begin to surprise me. I had not expected this much of you.',
    ],
    2: [
      'Athkatla bleeds gold, and you have learned to draw it. Useful.',
      'One more door behind you. There are still more in front than you imagine.',
      'You think this is a victory. You are wrong, but the mistake is instructive.',
    ],
    3: [
      'Spellhold sealed me once. You will be the one to pry it open. How fitting.',
      'Three doors. I no longer pretend I am only measuring you. Somewhere past the second, I began to hope. Keep walking.',
    ],
    4: [
      'Ust Natha is the throat of the Underdark. Walk it. Do not cough.',
      "The spider's city. The last door but one. You should know by now what I have made of you — what we have made of each other. The experiment was never only your soul. It was whether I would still wish to end it, once I knew you. I do not.",
    ],
  },
  imoen: {
    1: [
      "I felt that crash. You did that? You're really doing this. Keep going. Find me.",
      "Every door you break, I hear it. It's like — it's like you're getting closer.",
    ],
    2: [
      "He's quieter when you win. Did you know that? It's the only time he ever shuts up.",
      "Two doors down. I felt the second one give. You're really coming for me, aren't you. Don't stop.",
    ],
    3: [
      "I knew it. I knew it was you. Keep coming. Please keep coming.",
      "Three now. He's pretending he doesn't notice how close you're getting. I notice. Hurry.",
    ],
    4: [
      "One step closer to wherever he's keeping me. I'm trying to stay still so you can find me.",
      "That's the last big door but one. I can almost SEE you now — I swear I can. One more and you're here. Come and get me. Please come and get me.",
    ],
  },
};

export const ARC_QUOTES: Record<SoulVoiceSpeaker, Record<ArcContext, Record<VoiceTier, string[]>>> = {
  irenicus: {
    death: {
      early: [
        'Again? You are very predictable, you know. Rise, and try not to disappoint me a third time.',
        'The grove revives you. The grove will tire of you. Hurry.',
      ],
      mid: [
        'You die so prettily. Almost as if you were made for it.',
        'There is no end here, only repetition. I had hoped you would understand by now.',
        'Pain teaches. Death teaches better. Walk back into the dark, child, and learn.',
      ],
      late: [
        'The body fails. The soul does not — that is the experiment. Continue.',
        'I have watched a thousand of you fall. You are not the first, and you will not be the last.',
        'Each death feeds the work. I am not cruel — I am measuring. And you are very nearly the result I have waited centuries for.',
      ],
    },
    'first-blood': {
      early: [
        'Good. The Reincarnate spell holds. The mortal you call yourself will not — but you persist.',
        'The shape changes. The soul does not. You are still mine.',
      ],
      mid: [
        'First blood. You always did love this part of yourself.',
        'There. That is the part of you I want. Hold onto it.',
      ],
      late: [
        "The kill steadied you, didn't it. I felt it through the bond. Do not pretend otherwise.",
        'I feel each strike land as though it were my own hand. We are closer than you know now. Closer than I intended.',
      ],
    },
    idle: {
      early: [
        'The chains are mine to forge and mine to lift. Remember that, when next you wake.',
        'A subject at rest still tells me things. Breathe. I am reading the rhythm of it.',
      ],
      mid: [
        'I see you, child. Whatever flesh, whatever name. I see you.',
        'You are quiet. That is when you are most dangerous. To yourself.',
      ],
      late: [
        'I am always here, in the back of you. Like a tooth that hurts when you forget it.',
        'I have stopped pretending I merely observe you. Somewhere in these repetitions I began to wait for you. Do not tell the others I said so.',
      ],
    },
    rest: {
      early: [
        'Rest is a small mercy I have not yet decided to take from you.',
        'You think yourself safe by a fire. I have burned safer places than this.',
      ],
      mid: [
        'Sit. Breathe. Pretend the chains are not still wrapped around your spine.',
        'A fire, a meal, a moment of peace. Enjoy it. I will be here when the embers die.',
      ],
      late: [
        'Rest. I find I want you whole for the next door, and not only because the work requires it. That is new. I am still deciding what to make of it.',
        'Sleep. I will keep the dark off you tonight. Do not ask me why.',
      ],
    },
    victory: {
      early: [
        'A clean kill. A clean breath. You are becoming what I require.',
        'Hold the moment. Then walk forward. There is more for you.',
      ],
      mid: [
        "You enjoy this, don't you. You begin to understand what I made you for.",
        'Yes. Yes. That is the look I have been waiting to see in you.',
      ],
      late: [
        'There. That is not the spell winning, nor the steel. That is you — the thing I have been trying to wake all these deaths. Hello.',
        'A victory. I felt it before you did. The bond runs that deep now. I no longer mind.',
      ],
    },
    descent: {
      early: [
        'Down again. Always down. You begin to feel the pattern of it.',
        'Walk. I will not narrate every step — but I will be watching the important ones.',
      ],
      mid: [
        'You step into the dark of your own accord this time. Good. That is closer to honesty.',
        'Another delve. Another peeling. Each one shows me more of the shape beneath.',
        'The dark is not your enemy. The dark is the room you were born in.',
      ],
      late: [
        'Down, then. I will walk it beside you this time — not above you, watching. When did that change? I cannot find the moment it changed.',
        'Each descent brings you nearer the centre of the experiment — and nearer to me. I had a hypothesis once. You are dismantling it, step by step.',
      ],
    },
    reincarnation: {
      early: [
        'Awake again. The grove is so very obliging.',
        'A new body. The same soul. The same chain.',
      ],
      mid: [
        'You wear flesh the way one wears a coat. I am the cold under both.',
        'They say the body remembers. Yours does. Try not to make it remember pain.',
      ],
      late: [
        'Reborn. Reborn. Reborn. Has the word lost its weight for you yet? It has for me.',
        'You wake, and something in me eases that I will not name. So many bodies. I have stopped counting the others. I only count you.',
      ],
    },
    'boss-approach': {
      early: [
        'Ah. Now we see if you have been listening, or only breathing.',
        'I am curious. Truly. Try not to die in a boring way.',
      ],
      mid: [
        'A worthy opponent. Mine were worthier. Show me you have grown.',
        'Hold your weapon as if you mean it. The room ahead will not forgive a half-grip.',
      ],
      late: [
        'Whatever waits past this door, I will not lose you to it. I am surprised by the force of that sentence. So, I imagine, are you.',
        'The thing on the other side of this door is bigger than you. Good. I want to see the whole of what you have become.',
      ],
    },
    'low-hp': {
      early: [
        'Bleeding already. How quickly the spine softens.',
        'You taste the iron in your mouth. Good. Remember it.',
      ],
      mid: [
        'Hold. The last quarter of a life is where the soul learns what it is.',
        'One more wound and I will have to find you another body. Inconvenient. For both of us.',
      ],
      late: [
        'You are not finished yet. I would notice if you were.',
        'Do not die here. Not here, not to this. I have grown intolerant of losing you. Stay standing — for me, if no better reason serves.',
      ],
    },
  },
  imoen: {
    death: {
      early: [
        "I felt that. Don't... don't go quiet on me. Please.",
        "I — I don't even know if you can hear me. But please. Please get up. I can't lose the one thread I've got.",
      ],
      mid: [
        "Hey. Hey, c'mon. Get up. Don't you dare die on me here.",
        "No. Not yet. We're not done. Get up.",
        "I'm not letting go. Whatever this is, whatever you're feeling — I'm holding on.",
        "It hurts, I know. I'm sorry. I'm so sorry. But you have to get up.",
      ],
      late: [
        "Don't make me come find a body. Get up. Get UP. You're nearly here.",
        "No no no — not now, not when you're this close. I can almost feel the room you're in. Get UP and come find me.",
      ],
    },
    'first-blood': {
      early: [
        "Something just... moved, far off. Was that you? It's so faint. Like hearing a voice underwater.",
        "First one's the hardest. I think — I think that was you. Keep your head.",
      ],
      mid: [
        "Was that you? It felt like you. I can almost... almost see where you are.",
        "I felt it. The strike. It was clean. Don't let him talk you into thinking that was bad.",
        "I can feel your heart from here. It's loud. It's good. Keep it loud.",
      ],
      late: [
        "That was you. No 'almost' anymore — I felt that strike like it was my own hand. You're so close now.",
        "I don't have to guess if it's you these days. I just know. Keep cutting your way toward me.",
      ],
    },
    idle: {
      early: [
        "I'm in the dark too. He hasn't started on me yet. I think. Hurry.",
        "Sometimes I'm not sure if you can hear me. But I keep talking. Just in case.",
      ],
      mid: [
        "If I think too loud he hears me. So I'm — I'm just going to whisper. Hi. I love you.",
        "I'm okay. Don't worry about me. Worry about the next room.",
      ],
      late: [
        "I can hear you breathing now, when it's quiet. That's how close you are. I just sit and listen to it.",
        "Almost there. I keep to the same corner so you'll know where to look. I'm not going anywhere. Come find me.",
      ],
    },
    rest: {
      early: [
        "Catch your breath. He can't reach you when you're still. Or — I don't think he can.",
        "I found a quiet minute. I don't get many. Rest while I can keep him off you — I think I can keep him off you.",
      ],
      mid: [
        "I think this is the first time I've been able to whisper without him hearing. Don't waste it. Eat. Drink. Live.",
        "If you sleep, dream of something kind. There's been enough of the other kind.",
        "Sit with me a minute. Even if you can't see me. I'm here.",
      ],
      late: [
        "I used to make you eat when you forgot to. Eat now. I'm watching.",
        "Rest here. When you're this close I can almost pretend we're just sitting by a fire again, like before any of this. Soon. Soon we will be.",
      ],
    },
    victory: {
      early: [
        "You won — I think? It's faint, but it felt like winning. It felt like you. Hold onto it.",
        "Something good just happened down there. I can't see it clearly yet, but I felt the dark flinch. Good.",
      ],
      mid: [
        "You won. I can feel you grinning. Don't lose that.",
        "I felt that. Whoever it was — they deserved it. I won't pretend otherwise.",
        "Keep that. Whatever it is that just lit up in you. Keep it.",
      ],
      late: [
        "There you are. There's the one I remember.",
        "I felt every second of that, clear as day. You're so close now I can cheer you on out loud. So — go you. Mean it.",
      ],
    },
    descent: {
      early: [
        "You're going down into the dark. I'm down here in it too, somewhere. Find the stairs. Find me. Be careful.",
        "I can't see where you're headed — just that it's down, always down. Go slow. Come back to me.",
      ],
      mid: [
        "You're going back in. Of course you are. Be careful. Be loud only when you mean to be.",
        "Take a breath at the door. I always made you do that. Do it now.",
        "Don't be afraid. Or — be afraid, but go anyway. That's all bravery ever was.",
      ],
      late: [
        "I'm here. The whole way down. I won't go quiet.",
        "Every floor down is a floor closer to me now. I can feel it shrinking, the dark between us. Keep coming.",
      ],
    },
    reincarnation: {
      early: [
        "You woke up. I felt it — like a candle lighting somewhere far off. I don't know your new face yet, but it's you. It's always you.",
        "Get up slow. The grove always makes the first breath hurt. Drink some water.",
      ],
      mid: [
        "You're back. You're back you're back you're back. I felt you wake up.",
        "Hi. Hi, hello. I know you don't remember the last one. That's okay. I do.",
      ],
      late: [
        "New face. Same you. I'd know your soul anywhere.",
        "Back again. Closer than the last time you woke — I can tell. The grove keeps handing you back to me and I keep getting to fall for you again. Come on. Up.",
      ],
    },
    'boss-approach': {
      early: [
        "Something huge is near you. I can feel it even from way back here, and it scares me. Please be careful.",
        "I'm scared for you. I am. But you can do this.",
      ],
      mid: [
        "Whatever's behind that door — it's big. I can feel it from here. Be ready.",
        "You don't have to go in yet. Breathe first. Then go.",
        "If you have a thing you say to yourself before a hard fight — say it now.",
      ],
      late: [
        "I know what's behind that door — I'm close enough to feel the shape of it now. It's bad. But you're better. Go. I'll be right here, the whole time.",
        "Big fight. I'd be terrified if you weren't this close to me. Win it, and the next door might be mine. Go.",
      ],
    },
    'low-hp': {
      early: [
        "You're hurt — I can feel it, faint and awful, all the way over here. Please, please be careful. Don't go quiet on me.",
        "Step back. Just for a second. The fight will still be there.",
      ],
      mid: [
        "You're bleeding too much. Drink a potion. Right now. Please.",
        "I can feel you fading. Don't. Don't you dare.",
      ],
      late: [
        "If you don't take care of yourself I'm going to be very cross when you get here.",
        "No. Not when you're this close. I can almost touch you — don't you dare bleed out one room away from me. Potion. NOW.",
      ],
    },
  },
};

function clampChapter(n: number): number {
  if (n < 1) return 1;
  if (n > 4) return 4;
  return Math.floor(n);
}

/**
 * Pure line selection: (speaker, context, progression) → line. Extracted so the
 * arc logic is unit-testable without mounting the component. chapter-clear keys
 * off the chapter actually cleared; every other context picks an early/mid/late
 * tier from story progress, then a seeded line within that tier.
 */
export function selectSoulVoiceLine(
  speaker: SoulVoiceSpeaker,
  context: TauntContext,
  progression: VoiceProgression,
): string {
  const seed = progression.seed;
  if (context === 'chapter-clear') {
    const chapter = clampChapter(progression.clearedChapter ?? progression.chaptersCleared ?? 1);
    const pool = CHAPTER_CLEAR[speaker][chapter] ?? CHAPTER_CLEAR[speaker][1];
    return pool[seed % pool.length];
  }
  const tier = progressionTier(progression.chaptersCleared);
  const pool = ARC_QUOTES[speaker][context][tier];
  return pool[seed % pool.length];
}

interface SoulVoiceProps {
  speaker: SoulVoiceSpeaker;
  context: TauntContext;
  onDismiss: () => void;
  seed?: number;
  /** Chapter just cleared (1-4), threaded for the 'chapter-clear' context only. */
  chapter?: number;
  /**
   * An explicit, verbatim line — set by progressive lore beats (content/
   * loreBeats.ts). When present it overrides the seeded arc-pool selection;
   * `context` then only frames the palette/side.
   */
  line?: string;
}

const BASE_TICK = 28;
const FAST_TICK = 4;

export function IrenicusTaunt({ speaker, context, onDismiss, seed = 0, chapter, line }: SoulVoiceProps) {
  const chaptersCleared = useMetaStore((s) => s.chaptersCleared);
  const deathCount = useMetaStore((s) => s.deathCount);
  const hasReincarnated = useMetaStore((s) => s.hasReincarnated);
  const isKnown = useMetaStore((s) => s.knownNpcs.includes(speaker));
  const speakerLabel = isKnown ? REAL_NAME[speaker] : PRE_REVEAL_LABEL[speaker];

  const quote = useMemo(
    () =>
      line ??
      selectSoulVoiceLine(speaker, context, {
        chaptersCleared,
        deathCount,
        hasReincarnated,
        clearedChapter: chapter,
        seed,
      }),
    [line, speaker, context, chaptersCleared, deathCount, hasReincarnated, chapter, seed],
  );

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
  const speakerName = speakerLabel;
  // The name is already stated on the portrait pillar (◆ {speakerName}); the
  // subtitle only frames how it reaches you, so identity isn't said twice.
  const subtitle = 'through the soul-bond';

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
          <PortraitGlyph className="w-20 md:w-28 h-auto" ariaLabel={speakerName} />
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
