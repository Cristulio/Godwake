import type { RoomMonster } from '../../types/delve';

/**
 * Chapter 6 · "Beyond the Godwake" encounter pools. Mirrors chapter4Pools —
 * pooled compositions for each combat slot in the true-endgame chapter that
 * lies past the false god of the Godwake. This is the top difficulty band in
 * the game: rewards and stat blocks both sit a clear notch above Chapter 5.
 *
 * Theme: the Loom of Souls — the mechanism of the cycle itself, and the wheel
 * given a single will. The soul's last ascension: break the wheel, or become
 * it. Warmups CR 6, early-mid/mid CR 7-8, elites CR 9, boss (The Unmade) CR 10.
 *
 * WIRING DEFERRED: this file is content only. It is NOT yet imported by
 * createDelve.ts (the procedural-map lane is restructuring that file). The
 * chain-wiring is a separate orchestrator follow-up — {@link CHAPTER6_FLAVOR}
 * packages the non-combat room flavor so that follow-up can slot Chapter 6 in
 * without re-authoring anything.
 */

export interface EncounterEntry {
  title: string;
  flavorText: string;
  monsters: RoomMonster[];
  xpReward: number;
  goldReward?: number;
}

export const WARMUP_POOL: EncounterEntry[] = [
  {
    title: 'The First Worn Hand',
    flavorText:
      "The corridor past the false god's corpse is not a corridor — it is the rim of something too large to see the curve of, and you are standing on it. A single threadbare penitent rises out of the floor where the rim meets the dark, faceless, already reaching, already certain you belong in the line behind it.",
    monsters: [{ defId: 'threadbare-penitent', count: 1 }],
    xpReward: 680,
    goldReward: 56,
  },
  {
    title: 'A Face You Used to Wear',
    flavorText:
      'It comes up the rim toward you wearing a face you half-recognise, because it was yours, three deaths or thirty deaths ago. The cycle-revenant does not hurry. It has all the time there has ever been, and it only wants to take you back to where it was put.',
    monsters: [{ defId: 'cycle-revenant', count: 1 }],
    xpReward: 700,
    goldReward: 60,
  },
  {
    title: 'Chaff of the Wheel',
    flavorText:
      'Two threadbare penitents shuffle out of the grey in step, the way chaff falls in step off a mill-stone. Neither has a name left. Neither needs one to do what the Loom keeps them for.',
    monsters: [{ defId: 'threadbare-penitent', count: 2, displayPrefix: 'Penitent' }],
    xpReward: 720,
    goldReward: 58,
  },
  {
    title: 'The Old Self and the Chaff',
    flavorText:
      "A cycle-revenant walks the rim with a single penitent shambling at its heel — the old self to keep you talking, the worn one to keep you bleeding. They were both you, once, far enough back. They are the wheel's first argument: you have done this before; lie down and do it again.",
    monsters: [
      { defId: 'cycle-revenant', count: 1 },
      { defId: 'threadbare-penitent', count: 1 },
    ],
    xpReward: 700,
    goldReward: 62,
  },
  {
    title: 'Two of the Forgotten',
    flavorText:
      "Two cycle-revenants on the rim, side by side — different faces, both of them yours, both worn smooth by the turning. They confer with a glance, the way you would with yourself, and then they both come on at once.",
    monsters: [{ defId: 'cycle-revenant', count: 2, displayPrefix: 'Revenant' }],
    xpReward: 700,
    goldReward: 60,
  },
  {
    title: 'Penance in Threes',
    flavorText:
      'Three threadbare penitents this time — the Loom sweeps them up in handfuls this near the axle, where the chaff is thickest. None of them sees you. All of them reach for the place on the rim where a soul out of line is supposed to be put back.',
    monsters: [{ defId: 'threadbare-penitent', count: 3, displayPrefix: 'Penitent' }],
    xpReward: 720,
    goldReward: 54,
  },
];

export const EARLY_MID_POOL: EncounterEntry[] = [
  {
    title: 'The Measuring Hand',
    flavorText:
      'A fate-spinner sits where the threads come in, many-handed, sorting lives like net. It has measured your thread before — every death, here, on this rim. It looks up, finds you walking the wrong way up the line, and reaches for the skein to put you right.',
    monsters: [{ defId: 'fate-spinner', count: 1 }],
    xpReward: 1000,
    goldReward: 74,
  },
  {
    title: 'The Spinner and the Worn',
    flavorText:
      'A fate-spinner draws your thread taut while a threadbare penitent shuffles in under cover of the snare. One to bind you in place, one to grind you down while you are bound. The weave must be kept; you are a dropped stitch, and the Loom does not love dropped stitches.',
    monsters: [
      { defId: 'fate-spinner', count: 1 },
      { defId: 'threadbare-penitent', count: 1 },
    ],
    xpReward: 1060,
    goldReward: 80,
  },
  {
    title: 'The Apostle and Its Chaff',
    flavorText:
      "A hooded loom-apostle walks the rim with a penitent at its side, hands dyed to the wrist with the colour of a finished life. Every wound you open on the worn thing it closes again with a pass of bright thread. To the apostle your death was never an ending — only a knot, retied.",
    monsters: [
      { defId: 'loom-apostle', count: 1 },
      { defId: 'threadbare-penitent', count: 1 },
    ],
    xpReward: 1080,
    goldReward: 82,
  },
  {
    title: 'Two Old Selves',
    flavorText:
      'Two cycle-revenants share the rim, both wearing faces out of your own ledger, both reaching with the same grave-cold patience. The longer they hold you, the warmer they grow and the colder you do — the wheel taking back, by the touch, what it loaned you to live.',
    monsters: [{ defId: 'cycle-revenant', count: 2, displayPrefix: 'Revenant' }],
    xpReward: 980,
    goldReward: 76,
  },
  {
    title: 'The Spinner and the Old Self',
    flavorText:
      "A fate-spinner and a cycle-revenant work the rim together — the spinner to fix you in the weave, the old self to walk up at its leisure and finish what the thread began. Between them they are the whole of the cycle's first lie, said twice.",
    monsters: [
      { defId: 'fate-spinner', count: 1 },
      { defId: 'cycle-revenant', count: 1 },
    ],
    xpReward: 1080,
    goldReward: 84,
  },
  {
    title: 'The Apostle and the Old Self',
    flavorText:
      'A loom-apostle tends a cycle-revenant the way a verger tends a beloved machine, re-weaving it whole each time you cut it down. Drop the apostle, or the old self that used to be you simply never stops coming back.',
    monsters: [
      { defId: 'loom-apostle', count: 1 },
      { defId: 'cycle-revenant', count: 1 },
    ],
    xpReward: 1100,
    goldReward: 86,
  },
  {
    title: 'The Spinner and Its Brood',
    flavorText:
      'A fate-spinner with two penitents kept close in the weave, fed thread when they fray. It binds; they grind. The math only resolves the way it always does on this rim — cut the spinner, and the brood comes apart for want of a line to hang on.',
    monsters: [
      { defId: 'fate-spinner', count: 1 },
      { defId: 'threadbare-penitent', count: 2, displayPrefix: 'Penitent' },
    ],
    xpReward: 1100,
    goldReward: 80,
  },
];

export const MID_POOL: EncounterEntry[] = [
  {
    title: 'The Weight of Every Life',
    flavorText:
      'A karmic echo stands where the rim turns inward, and standing near it your whole ledger arrives at once — every grave, every turning, all true together. It is the sum of a soul that would not lie still, risen up to press one back down. It is, exactly, your own past, trying to keep you.',
    monsters: [{ defId: 'karmic-echo', count: 1 }],
    xpReward: 1240,
    goldReward: 96,
  },
  {
    title: 'The Thing That Came Apart',
    flavorText:
      "It got what you want — off the wheel, free of the turning — and it did not ascend; it unwound. What is left runs the rim at random, hating the wholeness it cannot remember having. The Unwound does not see you as prey. It sees you as something that still holds together, and it cannot bear that.",
    monsters: [{ defId: 'the-unwound', count: 1 }],
    xpReward: 1280,
    goldReward: 100,
  },
  {
    title: 'The Echo and the Chaff',
    flavorText:
      'A karmic echo with a threadbare penitent shuffling at its edge — the echo to still you under the weight of your own dead, the worn one to work at you while you cannot move. The Loom is economical, this deep. It spends what is to hand.',
    monsters: [
      { defId: 'karmic-echo', count: 1 },
      { defId: 'threadbare-penitent', count: 1 },
    ],
    xpReward: 1280,
    goldReward: 98,
  },
  {
    title: 'The Unwound and the Old Self',
    flavorText:
      'A cycle-revenant walks the rim ahead of something that used to be a soul like it and is now only a direction. The old self drives you; the Unwound arrives. When the unwound thing drops past half it stops pretending to aim and simply commits — all its lost momentum, all at once.',
    monsters: [
      { defId: 'the-unwound', count: 1 },
      { defId: 'cycle-revenant', count: 1 },
    ],
    xpReward: 1320,
    goldReward: 104,
  },
  {
    title: 'The Spinner and the Apostle',
    flavorText:
      'A fate-spinner binds while a loom-apostle mends — the two crafts of the Loom working in concert, the snare and the re-weaving, each covering the other. Neither tires. Neither hurries. The whole machine of the cycle, in two pairs of hands, with you in the middle of it.',
    monsters: [
      { defId: 'fate-spinner', count: 1 },
      { defId: 'loom-apostle', count: 1 },
    ],
    xpReward: 1320,
    goldReward: 102,
  },
  {
    title: 'The Echo and the Spinner',
    flavorText:
      'A karmic echo holds the turn of the rim and a fate-spinner works the line beside it — the echo to drown you in your own past, the spinner to make sure you cannot step out of it. Between the weight and the thread there is meant to be no room left to climb.',
    monsters: [
      { defId: 'karmic-echo', count: 1 },
      { defId: 'fate-spinner', count: 1 },
    ],
    xpReward: 1340,
    goldReward: 106,
  },
  {
    title: 'The Unwound and the Apostle',
    flavorText:
      "A loom-apostle shadows an unwound thing along the rim, re-weaving its ruin as fast as you can open it — pouring bright thread into a shape that no longer holds any. Fell the apostle, or watch the wheel mend its own madness back together and send it at you again.",
    monsters: [
      { defId: 'the-unwound', count: 1 },
      { defId: 'loom-apostle', count: 1 },
    ],
    xpReward: 1340,
    goldReward: 104,
  },
];

export const ELITE_POOL: EncounterEntry[] = [
  {
    title: 'The Axle-Warden',
    flavorText:
      'It fills the turn of the rim where the wheel meets the floor — vast, slow, built before the first death for one task: keep the wheel turning, no matter what climbs onto it. With each quarter-turn it hauls, a worn soul slides off the rim already reaching. Race the brood it spins out, or be ground back into the line.',
    monsters: [{ defId: 'axle-warden', count: 1 }],
    xpReward: 1760,
    goldReward: 132,
  },
  {
    title: 'The Warden and the First Worn Hand',
    flavorText:
      'The axle-warden stands at the axle with a single penitent already off the rim at its foot — the brood it has not yet finished spinning out. The maul comes on the long arc while the chaff closes from the side. Two clocks, and only one of them you can stop by hitting it.',
    monsters: [
      { defId: 'axle-warden', count: 1 },
      { defId: 'threadbare-penitent', count: 1 },
    ],
    xpReward: 1820,
    goldReward: 140,
  },
  {
    title: 'The Warden and the Spinner',
    flavorText:
      'An axle-warden turns the wheel while a fate-spinner fixes you in front of it — bound in your own thread, held precisely where the maul is already arcing to. The warden does not aim for you. It aims for the place on the rim the wheel says you should be put back to, and the spinner has put you there.',
    monsters: [
      { defId: 'axle-warden', count: 1 },
      { defId: 'fate-spinner', count: 1 },
    ],
    xpReward: 1860,
    goldReward: 146,
  },
  {
    title: 'Two That Came Apart',
    flavorText:
      'Two unwound things share the rim, each a soul that won its freedom and was ruined by it, each striking anything still whole. They do not coordinate — they cannot — but at half they both commit at once, and the rim becomes a place where two directions arrive on you together.',
    monsters: [{ defId: 'the-unwound', count: 2, displayPrefix: 'The Unwound' }],
    xpReward: 1840,
    goldReward: 138,
  },
  {
    title: 'The Echo and the Unwound',
    flavorText:
      'A karmic echo to fix you under the weight of every life you have lived, and an unwound thing to spend its whole lost momentum on you while you cannot move. The wheel sets the two halves of its mercy against you at once: the past that will not let go, and the freedom that destroys.',
    monsters: [
      { defId: 'karmic-echo', count: 1 },
      { defId: 'the-unwound', count: 1 },
    ],
    xpReward: 1880,
    goldReward: 148,
  },
  {
    title: 'The Warden and the Apostle',
    flavorText:
      "The axle-warden turns the wheel and a loom-apostle keeps it whole — mending the warden, warding it, re-weaving the brood it spins off the rim. The machine of the cycle, tending itself. Cut the apostle first, or the warden never wears down and the line never stops.",
    monsters: [
      { defId: 'axle-warden', count: 1 },
      { defId: 'loom-apostle', count: 1 },
    ],
    xpReward: 1880,
    goldReward: 150,
  },
];

/** Title + flavor for a non-combat Chapter 6 room (shrine / rest / shop). */
export interface ChapterRoomFlavor {
  title: string;
  flavorText: string;
}

/**
 * Ready-to-wire non-combat flavor for Chapter 6. Shaped to drop straight into
 * the `GODWAKE_CHAPTERS` `ChapterContent` entry the orchestrator follow-up will
 * add to createDelve.ts (shrines / rests / shop / boss + bossDefId). Kept here,
 * beside the pools, so the wiring step re-authors nothing.
 *
 * NOTE: this delve has no temples left to pray in — the shrines past the
 * Godwake are cracks in the wheel itself, where a soul can brace against the
 * turning for a moment.
 */
export const CHAPTER6_FLAVOR = {
  chapter: 6 as const,
  prefix: 'c6',
  title: 'Beyond the Godwake',
  shrines: [
    {
      title: 'A Crack in the Rim',
      flavorText:
        'Where the wheel has worn against itself a hairline has opened in the rim, and through it leaks a light older than any god — the light from before the first turning. Brace against it a moment, and some part of you that the cycle wore smooth remembers its own shape.',
    },
    {
      title: 'The Still Point',
      flavorText:
        "Every wheel turns on a place that does not move. You have found one — a hand's breadth of the rim where the turning cancels itself and, for as long as you stand in it, nothing of you is owed anywhere. The dead do not reach into the still point. They were never taught it exists.",
    },
  ] as ChapterRoomFlavor[],
  rests: [
    {
      title: 'The Lee of the Axle',
      flavorText:
        "In the shadow of the great axle the rim runs slow, and the chaff does not drift here — the Loom's own machinery throws too long a shadow for the dead to keep their footing in it. For a little while the turning forgets you. It is not safe. It is only slower.",
    },
    {
      title: 'A Severed Thread',
      flavorText:
        'A length of cut thread hangs loose off the rim, going nowhere, bound to no life — and where it falls it makes a small dead calm, a place the weave has already given up on. Sit in the slack a while. Nothing here is being measured.',
    },
  ] as ChapterRoomFlavor[],
  shop: {
    title: 'A Gleaner at the Rim',
    flavorText:
      "Something that was once a loom-apostle and has stopped believing keeps a hoard in the lee of the wheel — relics gleaned off souls the cycle finished, the dropped possessions of ten thousand finished lives. It does not want coin for itself. It wants coin because counting is the last habit it has left, and it would rather count than think about what it tends.",
  } as ChapterRoomFlavor,
  bossDefId: 'the-unmade',
  boss: {
    title: 'The Still Centre of the Wheel',
    flavorText:
      "There is no throne — a throne is a thing made, and what waits here was never made. Past the false god's corpse the rim curves in and in until it is only the axle, and at the still centre a shape resolves into attention the longer you fail to look away. The Unmade does not rise. It has no need. \"You climbed the whole wheel to reach the hand that turns it. Break me, and it stops for everyone, forever. Take my place, and it turns on, with your hand at the centre. There was never a third road off this floor — only the two you have always had, and never once chosen for yourself.\"",
    xpReward: 2400,
    goldReward: 320,
  },
} as const;
