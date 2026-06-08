/**
 * The progressive soul-bond story — an ORDERED arc of short beats that drip-feed
 * the backstory a little further as the soul accumulates delves and clears
 * chapters. Each beat plays ONCE (persisted in metaStore.seenDialogueBeats) and
 * strictly in order: a later beat never fires before its predecessor is seen.
 *
 * Two beats also REVEAL a soul-bond NPC's name (`reveals`): Imoen introduces
 * herself early, near the start of the arc. The antagonist stays "The Voice" far
 * longer — his name is withheld until the soul has clawed all the way down to
 * Suldanessellar (cleared Chapter 10), one descent shy of the Chapter 11
 * confrontation, where Imoen overhears it at last and the boss fight puts a face
 * to it. Until then every surface shows his pre-reveal label ("The Voice"); see
 * metaStore.knownNpcs and IrenicusTaunt's PRE_REVEAL_LABEL.
 *
 * The beats are triggered on DESCENT (delveStore.startDelve) — a calm transition
 * that happens every run, so the milestone counters are fresh and exactly one
 * unseen-eligible beat advances per descent. A returning veteran (high delveCount
 * from the migration) therefore walks the arc one beat at a time, never a wall of
 * text. See {@link nextLoreBeat}.
 */
import type { SoulVoiceSpeaker, TauntContext } from '../components/lore/IrenicusTaunt';
import { BASE_GAME_CHAPTERS } from '../engine/delve/constants';

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
  // ── Ch5-9 · the Godwake reframed as his god-making engine ──────────────────
  // The captor drags the bound soul down through his own works toward the
  // divinity he covets; Imoen tracks the descent; the soul-bond strains.
  {
    id: 'lore-17-my-own-machine',
    speaker: 'irenicus',
    context: 'descent',
    minChapters: 5,
    text: 'You think these deeps are the world\'s own dark. They are mine. Every floor below the cage is a furnace I built to render the god out of you — the dawn that will not break, the wheel, the drowned stacks. I am walking you through my own machine, and it is nearly finished.',
  },
  {
    id: 'lore-18-up-is-me',
    speaker: 'imoen',
    context: 'descent',
    minChapters: 5,
    text: "We're past anywhere I have a name for. He's taking you down through things he MADE — I can feel the walls remember his hands. Don't lose which way is up. Up is me. Keep coming up to me, even while he drags you down.",
  },
  {
    id: 'lore-19-the-wheel-turns',
    speaker: 'irenicus',
    context: 'idle',
    minChapters: 6,
    text: 'Do you feel the wheel turning under your feet? I did not build that one — but I learned to read it, and it spins on the very blood I draw from you. The divinity at its hub was always meant for a hand to close on it. It will be mine. You are how I reach it.',
  },
  {
    id: 'lore-20-the-rope-pays-out',
    speaker: 'imoen',
    context: 'rest',
    minChapters: 7,
    text: "He drowned a whole library down here rather than let a soul read what he learned. That's what we're walking through — his secrets, held under black water. And the bond between us is stretching thin as a rope paid out too far. Don't let your end go. I've got mine in both hands.",
  },
  {
    id: 'lore-21-never-stood-down',
    speaker: 'irenicus',
    context: 'descent',
    minChapters: 8,
    text: 'An army that marches a hundred years because no one told it the war was won. I understand them better than they know. I too will not be told the work is finished — and it is not finished, not until the dead god in your blood stands up at last and wears my face out into the light.',
  },
  {
    id: 'lore-22-no-seam',
    speaker: 'irenicus',
    context: 'idle',
    minChapters: 9,
    text: 'This was my house once, before the elves cut the soul out of me. Here I learned that a face is only what the room expects, worn well. You wear mine a little more with every death. Soon there will be no seam between captor and captive. That was always the design, child.',
  },
  {
    id: 'lore-23-which-thoughts-are-mine',
    speaker: 'imoen',
    context: 'low-hp',
    minChapters: 9,
    text: "I can't always tell your thoughts from his down here, and that frightens me worse than anything he's done. Hold on to the one who stole books off the high shelves with me. That one is ours. Don't let his masks have it. Don't let them have you.",
  },
  // ── Ch10 · Suldanessellar / the Tree of Life — the plan AND the name revealed.
  // The Voice has narrated the whole descent unnamed; here, one step from the
  // confrontation, his plan surfaces and Imoen finally catches his name. ─────────
  {
    id: 'lore-24-the-vein-named',
    speaker: 'irenicus',
    context: 'boss-approach',
    minChapters: 10,
    text: 'Now you see the whole of it. The Tree gives back the soul the elves tore out of me — but a soul is not a godhood. For that I need the murdered god in YOUR blood, the essence I have distilled from you one death at a time. You carried it all the way up here for me. I am grateful. Truly.',
  },
  {
    id: 'lore-11-his-name-is-irenicus',
    speaker: 'imoen',
    context: 'idle',
    minChapters: 10,
    reveals: 'irenicus',
    text: "I heard the others say it at last — his name, the one who did this to us both. Irenicus. It tastes like a curse in the mouth. Good. Now we know what to scream when we pull him down.",
  },
  {
    id: 'lore-12-the-hollow-they-made',
    speaker: 'irenicus',
    context: 'descent',
    minChapters: 10,
    text: 'Yes. Say it, if a name comforts you. I was cast out of a city of immortals and left with nothing — no soul, no death, no end to the wanting. I will take the god out of your blood and fill the hollow they made of me.',
  },
  {
    id: 'lore-25-take-it-back',
    speaker: 'imoen',
    context: 'victory',
    minChapters: 10,
    text: "He needs something that lives IN you — I heard it plain this time. The thing he's bled you for, life after life. Whatever it is, it's yours, do you hear me, not his. Reach me first. We take it back together, before he can close his hand.",
  },
  // ── Ch11 · the Trials of the Pit — the confrontation, the captor falls ─────
  {
    id: 'lore-26-end-what-the-cage-began',
    speaker: 'irenicus',
    context: 'boss-approach',
    minChapters: 11,
    text: 'Down through every work of mine, and back up to me. The cold thing in your hand is the one mercy I left in all my Hell — the one piece of you I cannot take. So. No more measuring. Be still for me a final time, child of Murder. Or do not. Let us end what the cage began.',
  },
  {
    id: 'lore-27-the-voice-is-gone',
    speaker: 'imoen',
    context: 'victory',
    minChapters: 11,
    text: "He's down. He's DOWN — the Voice is gone, there's only quiet where it lived all this time. You came the whole way down and pulled him under with you. And — oh. Oh, you're truly here. I have your hand. I have it. I am never letting it go again.",
  },
  // ── Ch12-14 · Throne of Bhaal — the Voice is silenced; the Bhaalspawn truth
  // surfaces, Melissan's harvest is unmasked, and the arc hands off to the
  // ascend-or-mortal ending (EndingScreen) rather than resolving it here. ─────
  {
    id: 'lore-28-child-of-bhaal',
    speaker: 'imoen',
    context: 'descent',
    minChapters: 12,
    text: "The Voice is dead, and the truth it hid is standing up in its place. You're a Child of Bhaal — the dead Lord of Murder — and so is every soul burning in that city, all of you hunted for the god in your blood. And something whispers now where Irenicus used to. It wants you to swing. Don't.",
  },
  {
    id: 'lore-29-the-kind-womans-smile',
    speaker: 'imoen',
    context: 'rest',
    minChapters: 13,
    text: "The kind woman guiding us — Melissan — she set the Five to murdering each other. I've watched her smile a long while now, and I've started to dread it. She wants them all dead, and she wants your hand to do it. I just can't yet see what she means to take once the last of them falls.",
  },
  {
    id: 'lore-30-choose-it-as-yourself',
    speaker: 'imoen',
    context: 'boss-approach',
    minChapters: 14,
    text: "I have the whole shape of it now. Melissan — Amelyssan — was Bhaal's own priestess, and the harvest was always hers: every death, every drop, gathered to wake HER as the god of Murder reborn. One door left, an empty throne behind it. End her. Then the seat is yours — to take, or to turn from. Choose it as yourself. I'll be with you at the wheel.",
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
 * Irenicus IS the Chapter-11 boss ({@link BASE_GAME_CHAPTERS}); felling him is
 * his death. Once the soul has climbed past his chapter — into the Throne-of-
 * Bhaal stretch (Ch12-14) — he is gone and must not speak again. His arc is
 * authored entirely at minChapters <= 11, but a single beat per descent lets the
 * queue lag behind a fast climb, so an unseen Irenicus beat could otherwise
 * surface on a later descent after he is already dead. Those stranded beats are
 * SKIPPED (see {@link nextLoreBeat}), not blocked, so Imoen's later beats — and
 * the Throne-of-Bhaal arc that hands off to the ending — still flow past them.
 * (A Melissan voice to fill the ToB silence is a separate future lane.)
 */
function isSilencedAfterDeath(beat: LoreBeat, meta: LoreBeatMeta): boolean {
  return beat.speaker === 'irenicus' && meta.chaptersCleared > BASE_GAME_CHAPTERS;
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
    // A dead antagonist's stranded beats are skipped, never returned — and never
    // block the beats behind them (strict order is relaxed only for these).
    if (isSilencedAfterDeath(beat, meta)) continue;
    return isEligible(beat, meta) ? beat : null;
  }
  return null;
}
