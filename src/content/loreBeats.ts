/**
 * The progressive soul-bond story — an ORDERED arc of short beats that drip-feed
 * the backstory a little further as the soul accumulates delves and clears
 * chapters. Each beat plays ONCE (persisted in metaStore.seenDialogueBeats) and
 * strictly in order: a later beat never fires before its predecessor is seen.
 *
 * Two beats also REVEAL a soul-bond NPC's name (`reveals`): Imoen introduces
 * herself early, and the antagonist is not named "Irenicus" to the player until
 * the BG2-equivalent reveal — Imoen overhears it only after Chapter 2 has
 * fallen. Until then every surface shows his pre-reveal label ("The Voice"); see
 * metaStore.knownNpcs and IrenicusTaunt's PRE_REVEAL_LABEL.
 *
 * The beats are triggered on DESCENT (delveStore.startDelve) — a calm transition
 * that happens every run, so the milestone counters are fresh and exactly one
 * unseen-eligible beat advances per descent. A returning veteran (high delveCount
 * from the migration) therefore walks the arc one beat at a time, never a wall of
 * text. See {@link nextLoreBeat}.
 */
import type { SoulVoiceSpeaker, TauntContext } from '../components/lore/IrenicusTaunt';

export interface LoreBeat {
  /** Stable id, persisted in seenDialogueBeats. Never reuse or renumber. */
  id: string;
  speaker: SoulVoiceSpeaker;
  /** Visual framing only (palette + side). The text is rendered verbatim. */
  context: TauntContext;
  /** The line shown verbatim — keep it to a sentence or two. */
  text: string;
  /**
   * Milestone gate. A beat is eligible once the soul has STARTED `minDelves`
   * delves AND cleared `minChapters` chapters (both default 0). Author the list
   * so requirements never decrease — strict-order play depends on it.
   */
  minDelves?: number;
  minChapters?: number;
  /**
   * If set, playing this beat marks the named NPC known (metaStore.knownNpcs),
   * flipping every surface from the pre-reveal label to the real name. This is
   * the one and only place a soul-bond name is revealed.
   */
  reveals?: SoulVoiceSpeaker;
}

/**
 * The arc, in play order. Opening beats are delve-gated so a struggling player
 * still gets the setup; the deeper story is chapter-gated so it can only unfold
 * by actually descending the chain. Menace from the antagonist, warmth and worry
 * from Imoen.
 */
export const LORE_BEATS: LoreBeat[] = [
  {
    id: 'lore-01-the-cage-held',
    speaker: 'irenicus',
    context: 'descent',
    minDelves: 1,
    text: 'So. The cage held, and the soul did not spill out with the blood. I have opened a thousand of your kind. None of them looked back at me the way you do. Begin.',
  },
  {
    id: 'lore-02-not-alone',
    speaker: 'imoen',
    context: 'idle',
    minDelves: 1,
    text: "You can hear me? Oh — thank every god there is. I thought I was the only thing left awake down here. Whoever you are now, don't stop. Don't let him have it all.",
  },
  {
    id: 'lore-03-he-took-the-strength',
    speaker: 'irenicus',
    context: 'idle',
    minDelves: 2,
    text: 'You wonder why you wake in rags, weak as a newborn thing. I took the strength out of you and set it aside. I am still measuring how much there was to take.',
  },
  {
    id: 'lore-04-the-glass-cell',
    speaker: 'imoen',
    context: 'rest',
    minDelves: 3,
    text: "He keeps me behind glass where I have to watch him work. Knives, candles, your blood in little dishes. I'm sorry — I shouldn't tell you that. But you should know what he is.",
  },
  {
    id: 'lore-05-imoen-names-herself',
    speaker: 'imoen',
    context: 'idle',
    minDelves: 4,
    reveals: 'imoen',
    text: "I should have told you lifetimes ago. My name's Imoen. We grew up together, you and me — a library by the sea, before any of this. You don't remember. That's alright. I remember enough for the both of us.",
  },
  {
    id: 'lore-06-a-vein-of-god',
    speaker: 'irenicus',
    context: 'descent',
    minDelves: 6,
    text: 'There is a god in your blood — old, murdered, divine. That is the thing I draw out of you, drop by drop, death by death. You are not a person to me. You are a vein I have not finished opening.',
  },
  {
    id: 'lore-07-the-repetition',
    speaker: 'irenicus',
    context: 'idle',
    minDelves: 8,
    text: 'You die, the grove hands you back, and we begin again. Do you understand yet? The repetition is the experiment. Each death distils you a little purer. I am patient. I have nothing but time, and neither, now, do you.',
  },
  {
    id: 'lore-08-the-place-shook',
    speaker: 'imoen',
    context: 'victory',
    minChapters: 1,
    text: "You beat it — the big one. I felt the whole place shake from in here. He felt it too. He went very, very quiet. Keep making him quiet.",
  },
  {
    id: 'lore-09-the-godwake',
    speaker: 'irenicus',
    context: 'descent',
    minChapters: 1,
    text: 'They have a word for the thing stirring in you: the Godwake — the moment a dead god opens its eye inside a living host. I intend to be the hand on the reins when it does.',
  },
  {
    id: 'lore-10-the-kid-is-still-in-there',
    speaker: 'imoen',
    context: 'rest',
    minDelves: 10,
    minChapters: 1,
    text: "I keep remembering things. You, smaller, stealing books with me off the high shelves. Whatever he's made of you down here — that kid is still in there. I'd stake my life on it. I sort of already have.",
  },
  {
    id: 'lore-11-his-name-is-irenicus',
    speaker: 'imoen',
    context: 'idle',
    minChapters: 2,
    reveals: 'irenicus',
    text: "I heard the others say it at last — his name, the one who did this to us both. Irenicus. It tastes like a curse in the mouth. Good. Now we know what to scream when we pull him down.",
  },
  {
    id: 'lore-12-the-hollow-they-made',
    speaker: 'irenicus',
    context: 'descent',
    minChapters: 2,
    text: 'Yes. Say it, if a name comforts you. I was cast out of a city of immortals and left with nothing — no soul, no death, no end to the wanting. I will take the god out of your blood and fill the hollow they made of me.',
  },
  {
    id: 'lore-13-dont-spend-it-all',
    speaker: 'imoen',
    context: 'low-hp',
    minDelves: 14,
    minChapters: 2,
    text: "You're bleeding and you're still standing and you're still coming. Gods, I love you for it. Just don't spend it all before you reach me. I'm close now. Closer every time you wake.",
  },
  {
    id: 'lore-14-something-went-wrong',
    speaker: 'irenicus',
    context: 'idle',
    minChapters: 3,
    text: 'Something has gone wrong with the experiment. I have begun to want you to live. I tell myself it is only that the work requires it. I was ever a poor liar — even to myself.',
  },
  {
    id: 'lore-15-come-find-me-first',
    speaker: 'imoen',
    context: 'victory',
    minChapters: 3,
    text: "He hid me behind the last doors — I'm certain of it now. When the Godwake comes, don't let him put himself between you and it. Come find me first. Promise me that. Come find me first.",
  },
  {
    id: 'lore-16-the-last-door',
    speaker: 'irenicus',
    context: 'boss-approach',
    minChapters: 4,
    text: 'The last door. Past it the dead god wakes, and one of us holds its leash. I made you for this moment. I no longer know whether I want to win it. Walk in anyway. Let us both see what you have become.',
  },
];

/** The slice of meta {@link nextLoreBeat} reads. metaStore is a structural superset. */
export interface LoreBeatMeta {
  delveCount: number;
  chaptersCleared: number;
  seenDialogueBeats: string[];
  knownNpcs: string[];
}

function isEligible(beat: LoreBeat, meta: LoreBeatMeta): boolean {
  return (
    meta.delveCount >= (beat.minDelves ?? 0) &&
    meta.chaptersCleared >= (beat.minChapters ?? 0)
  );
}

/**
 * The next beat to play, or null. Strict in-order, one at a time: scan the arc
 * from the top, skip beats already seen, and return the FIRST unseen beat — but
 * ONLY if it is eligible. If the first unseen beat is not yet eligible, return
 * null (a later beat must never leapfrog an unseen predecessor, even if its own
 * milestone is met). This is what advances a veteran one beat per descent and
 * holds the deeper story behind the chapter the player hasn't cleared yet.
 */
export function nextLoreBeat(meta: LoreBeatMeta): LoreBeat | null {
  for (const beat of LORE_BEATS) {
    if (meta.seenDialogueBeats.includes(beat.id)) continue;
    return isEligible(beat, meta) ? beat : null;
  }
  return null;
}
