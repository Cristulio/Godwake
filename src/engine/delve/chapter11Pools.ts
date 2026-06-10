import type { RoomMonster } from '../../types/delve';
import type { BossIntelCard } from '../../content/bossIntel';

/**
 * Chapter 11 · "The Trials of the Pit" encounter pools. The climax of the whole
 * soul-theft arc: at the Tree of Life the captor finished the theft, struck you
 * down, and you both fell into Hell — his pocket of the Abyss. Here the Slainkin
 * nature is put to the five trials — Fear, Pride, Wrath, Greed, Selfishness — each
 * with a moral fork and a guardian-manifestation, before the Tear of the Slain God and the
 * final battle with Velnaris himself, the Voice that has narrated the descent.
 *
 * Theme: the pit measures your father's blood. Each trial-altar poses a question
 * about what a child of Murder is willing to be, and the sin you would answer it
 * with rises as a guardian — the dread you flee, the vanity you keep, the rage you
 * lash out in, the wealth you grasp, the self you will not spend. Between the
 * trials, Hell's own vermin (abishai) and the Slayer-echoes the burning ground
 * pries out of you. Mechanically the apex of the chapters: paralysis, fear, blind,
 * life-drain, hoard-wards, summoned reflections, and a final boss gorged on a
 * stolen god. Continues the curve a band past Chapter 9: warmups CR 10, early-mid
 * CR 11, mid CR 12, elite CR 14, boss (Jon Velnaris) CR 16.
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
    title: 'The First Step Into the Burning',
    flavorText:
      'The Tree falls away above you and the ground that catches you is not ground — it is the floor of his pocket of Hell, red-lit, faintly warm, breathing. A single spined abishai uncoils from a vent of flame and comes at you sidelong, wings half-spread, more curious than hostile, the way vermin are curious about a thing that has not yet learned it is prey here.',
    monsters: [{ defId: 'spined-abishai', count: 1 }],
    xpReward: 1420,
    goldReward: 110,
  },
  {
    title: 'A Thread of You, Walking',
    flavorText:
      'The burning ground reaches up into you as you cross it and draws a thread loose, and the thread stands up grey and swift a half-step behind you, wearing the start of your own face. The pit has shown you the Slayer you carry by letting it walk. It comes for the warmth it is missing, which is to say, for the rest of you.',
    monsters: [{ defId: 'slayer-shade', count: 1 }],
    xpReward: 1430,
    goldReward: 112,
  },
  {
    title: 'Two of the Pit\'s Vermin',
    flavorText:
      'Two spined abishai drop from the smoke-vaults together, jostling each other for the angle on you, barbs already wet. They have no part in their master\'s great design except to be near the pain of it, and you are the nearest pain to hand.',
    monsters: [{ defId: 'spined-abishai', count: 2, displayPrefix: 'Abishai' }],
    xpReward: 1440,
    goldReward: 108,
  },
  {
    title: 'The Devil and the Echo',
    flavorText:
      'A spined abishai stalks the gallery ahead while behind you the floor sheds another Slayer-shade off your own shadow — the pit\'s vermin in front and your own murder at your back, the burning ground working both ends of you at once.',
    monsters: [
      { defId: 'spined-abishai', count: 1 },
      { defId: 'slayer-shade', count: 1 },
    ],
    xpReward: 1460,
    goldReward: 116,
  },
  {
    title: 'A Pair Off Your Shadow',
    flavorText:
      'The ground gives up two Slayer-shades at once, both grey, both swift, both wearing the same first suggestion of your features — and they do not coordinate so much as agree, the way two halves of one appetite agree, that the thing in the middle wearing the original face has warmth they are owed.',
    monsters: [{ defId: 'slayer-shade', count: 2, displayPrefix: 'Shade' }],
    xpReward: 1450,
    goldReward: 114,
  },
  {
    title: 'A Welcome of Three',
    flavorText:
      'Three spined abishai hold the mouth of the first trial-gallery in a loose, hissing line, the way Hell receives anything that has business deeper in: not as guards, exactly, but as a toll, a first taste taken from everything the pit lets pass toward its master.',
    monsters: [{ defId: 'spined-abishai', count: 3, displayPrefix: 'Abishai' }],
    xpReward: 1470,
    goldReward: 106,
  },
];

export const EARLY_MID_POOL: EncounterEntry[] = [
  {
    title: 'The Trial of Fear',
    flavorText:
      'The first altar stands in a cold pocket of the burning, and the question is plain: there is a death you have fled through every life, and you may face it here or run. The dread rises to enforce the asking — a tall hooded absence that turns toward you and becomes, when you make yourself look, the very end you cannot look at squarely.',
    monsters: [{ defId: 'wraith-of-fear', count: 1 }],
    xpReward: 1920,
    goldReward: 142,
  },
  {
    title: 'The Trial of Wrath',
    flavorText:
      'The third altar offers the most and asks the cruelest: a helpless thing, and the strength you would gain by striking it down in anger and calling it just. The anger stands up out of the floor wearing your father\'s fire — broad, burning, joyful — and does not wait for your answer to begin.',
    monsters: [{ defId: 'avatar-of-wrath', count: 1 }],
    xpReward: 1930,
    goldReward: 144,
  },
  {
    title: 'Fear, and the Vermin That Feed On It',
    flavorText:
      'The Wraith of Fear holds its cold altar with a spined abishai circling the edge of the dread, darting in for the bites the fear leaves open. The pit is efficient: one guardian to root you in the worst thing you carry, one piece of vermin to make you pay for every flinch.',
    monsters: [
      { defId: 'wraith-of-fear', count: 1 },
      { defId: 'spined-abishai', count: 1 },
    ],
    xpReward: 1960,
    goldReward: 148,
  },
  {
    title: 'Wrath, and a Thread of the Slayer',
    flavorText:
      'The Avatar of Wrath comes forward with a Slayer-shade loping at its flank — the rage and the murder, the two halves of your father\'s gift, working you together. One wants you angry; the other only wants you opened. Both get easier to give in to the longer you let them stand.',
    monsters: [
      { defId: 'avatar-of-wrath', count: 1 },
      { defId: 'slayer-shade', count: 1 },
    ],
    xpReward: 1970,
    goldReward: 150,
  },
  {
    title: 'The Dread and the Fury',
    flavorText:
      'Two of the trial-guardians share the burning floor — the Wraith of Fear to root you with the end you flee, the Avatar of Wrath to fall on you the instant you cannot move. Be still for the one and you are meat for the other; the pit has set its two oldest hooks in you at once.',
    monsters: [
      { defId: 'wraith-of-fear', count: 1 },
      { defId: 'avatar-of-wrath', count: 1 },
    ],
    xpReward: 2000,
    goldReward: 146,
  },
  {
    title: 'The Fury and Two Echoes',
    flavorText:
      'The Avatar of Wrath holds the centre while two Slayer-shades peel off the floor to either side of it, your own murder doubled and set to keep you turning while the rage picks its moment. Cut the avatar down fast, or fight three versions of your worst inheritance at once.',
    monsters: [
      { defId: 'avatar-of-wrath', count: 1 },
      { defId: 'slayer-shade', count: 2, displayPrefix: 'Shade' },
    ],
    xpReward: 1990,
    goldReward: 148,
  },
  {
    title: 'The Dread Among the Vermin',
    flavorText:
      'The Wraith of Fear works its dread from the back of a knot of two spined abishai, so the bites come out of a flinch you cannot help and the cold reaches you from a quarter you cannot make yourself face. Break the wraith, or spend the whole fight unable to look where you are being killed from.',
    monsters: [
      { defId: 'wraith-of-fear', count: 1 },
      { defId: 'spined-abishai', count: 2, displayPrefix: 'Abishai' },
    ],
    xpReward: 1980,
    goldReward: 150,
  },
];

export const MID_POOL: EncounterEntry[] = [
  {
    title: 'The Trial of Pride',
    flavorText:
      'The second altar holds a trinket worth nothing except that keeping it tells you that you are exceptional, owed, above the climb. Your vanity rises as a standing sheet of black glass that has never once shown you a flaw, and it reaches into you for the part that wants to believe it — and hands that part back out, armed.',
    monsters: [{ defId: 'mirror-of-pride', count: 1 }],
    xpReward: 2460,
    goldReward: 176,
  },
  {
    title: 'The Trial of Greed',
    flavorText:
      'The fourth altar heaps the floor with more than any soul could carry and tells you to help yourself. The grasping rises as a bloated, gold-scabbed fiend that took the trove\'s offer to its limit and became the taking — and now stands between you and the only clean answer, which was always to take only your due and walk on.',
    monsters: [{ defId: 'hoarding-fiend-of-greed', count: 1 }],
    xpReward: 2470,
    goldReward: 178,
  },
  {
    title: 'Pride, Wearing Your Face',
    flavorText:
      'The Mirror of Pride opens the fight already feeding a Slayer-shade out of its surface — a taller, surer you, certain it is the better self — and presses from reach with a shard of flattering glass while the copy keeps you turning. Break the mirror, or fight the version of you that never doubts, forever.',
    monsters: [
      { defId: 'mirror-of-pride', count: 1 },
      { defId: 'slayer-shade', count: 1 },
    ],
    xpReward: 2500,
    goldReward: 182,
  },
  {
    title: 'Greed and the Echo It Hoards',
    flavorText:
      'The Hoarding Fiend of Greed clutches its trove with a Slayer-shade chained to its side like one more thing it has taken and will not give up. It stands on stolen reserves past all reason while the echo keeps you off it. Spend too long on the hoard and the shade has worn your warmth; spend too long on the shade and the fiend will not go down.',
    monsters: [
      { defId: 'hoarding-fiend-of-greed', count: 1 },
      { defId: 'slayer-shade', count: 1 },
    ],
    xpReward: 2510,
    goldReward: 184,
  },
  {
    title: 'The Vanity and the Hoard',
    flavorText:
      'Two trial-guardians hold the burning gallery together — the Mirror of Pride to set your better self on you, the Hoarding Fiend of Greed to soak everything you have past the point it should fall. The vanity keeps making more of you to fight; the greed will not let you finish either of them. The pit\'s two patient sins, refusing in concert to end.',
    monsters: [
      { defId: 'mirror-of-pride', count: 1 },
      { defId: 'hoarding-fiend-of-greed', count: 1 },
    ],
    xpReward: 2560,
    goldReward: 180,
  },
  {
    title: 'Pride and the Lingering Fury',
    flavorText:
      'The Mirror of Pride works its surface while an Avatar of Wrath rages in front of it — the cold sin and the hot one, the self that thinks too well of you and the self that cannot stop swinging. One makes copies of your worst light; the other only gets stronger the more you bleed it. Find the glass and shatter it, or drown in flattering reflections.',
    monsters: [
      { defId: 'mirror-of-pride', count: 1 },
      { defId: 'avatar-of-wrath', count: 1 },
    ],
    xpReward: 2540,
    goldReward: 182,
  },
  {
    title: 'Greed and the Dread Behind It',
    flavorText:
      'The Hoarding Fiend of Greed stands over its trove with a Wraith of Fear at its shoulder, the dread rooting you where the fiend can grasp you and the fiend clutching its reserves where the dread keeps you from reaching it. Be still and the hoard takes you; press in and the fear holds you for the fist of fused treasure.',
    monsters: [
      { defId: 'hoarding-fiend-of-greed', count: 1 },
      { defId: 'wraith-of-fear', count: 1 },
    ],
    xpReward: 2550,
    goldReward: 184,
  },
];

export const ELITE_POOL: EncounterEntry[] = [
  {
    title: 'The Trial of Selfishness',
    flavorText:
      'The fifth and last altar wears no flattering shape. A thing here will die without a piece of you — your strength, your blood, the warmth you were saving — and the only question is whether you give it. The part of you that would let it die rises vast and faceless, a hunger that exists only to keep itself whole, and folds its whole attention onto you like a hand closing over a coin.',
    monsters: [{ defId: 'devourer-of-selfishness', count: 1 }],
    xpReward: 3340,
    goldReward: 236,
  },
  {
    title: 'The Hunger and a Thread of the Slayer',
    flavorText:
      'The Devourer of Selfishness folds the gallery around itself with a Slayer-shade darting at its edge — the great inward hunger that means to keep all of you, and the small swift one that means to wear your face. One holds you still to decide what of you to take; the other takes while you are held. Spend yourself, or be spent.',
    monsters: [
      { defId: 'devourer-of-selfishness', count: 1 },
      { defId: 'slayer-shade', count: 1 },
    ],
    xpReward: 3380,
    goldReward: 240,
  },
  {
    title: 'The Hunger and the Dread',
    flavorText:
      'The Devourer of Selfishness shares the last burning hall with a Wraith of Fear, so the dread roots you where the hunger can fold over you and the hunger holds you where the dread can finish reaching in. To be still before either is to belong to it; the two worst trials, set to grind you between them.',
    monsters: [
      { defId: 'devourer-of-selfishness', count: 1 },
      { defId: 'wraith-of-fear', count: 1 },
    ],
    xpReward: 3400,
    goldReward: 242,
  },
  {
    title: 'The Hunger Behind the Glass',
    flavorText:
      'A Devourer of Selfishness looms behind a Mirror of Pride, the hunger feeding on whatever the vanity makes of you — every flattering reflection the glass sets on you is one more thing the maw can take when it falls. Shatter the mirror to stop the copies, or the devourer never runs short of pieces of you to swallow.',
    monsters: [
      { defId: 'devourer-of-selfishness', count: 1 },
      { defId: 'mirror-of-pride', count: 1 },
    ],
    xpReward: 3420,
    goldReward: 244,
  },
  {
    title: 'The Hunger and the Hoard',
    flavorText:
      'The Devourer of Selfishness and the Hoarding Fiend of Greed hold the threshold of the Tear together — the two sins of keeping, the one that takes you into itself and the one that will not give itself up. Between the hunger\'s maw and the hoard\'s ward there is meant to be nothing of you left to carry to the last altar, and nothing left of them you can make fall.',
    monsters: [
      { defId: 'devourer-of-selfishness', count: 1 },
      { defId: 'hoarding-fiend-of-greed', count: 1 },
    ],
    xpReward: 3460,
    goldReward: 240,
  },
  {
    title: 'The Hunger and the Fury at the Gate',
    flavorText:
      'The Devourer of Selfishness folds itself across the last gallery before the Tear with an Avatar of Wrath burning at its side — the cold hunger that holds you and the hot rage that falls on the held. The pit\'s final pairing before its master: be spent slow by the one, or fast by the other, and either way arrive at the Tear with less of yourself than you came in with.',
    monsters: [
      { defId: 'devourer-of-selfishness', count: 1 },
      { defId: 'avatar-of-wrath', count: 1 },
    ],
    xpReward: 3440,
    goldReward: 242,
  },
];

/** Title + flavor for a non-combat Chapter 11 room (shrine / rest / shop). */
export interface ChapterRoomFlavor {
  title: string;
  flavorText: string;
}

/**
 * Ready-to-wire non-combat flavor for Chapter 11. Shaped to drop straight into the
 * `GODWAKE_CHAPTERS` `ChapterContent` entry in createDelve.ts (shrines / rests /
 * shop / boss + bossDefId), beside the pools, so the wiring re-authors nothing.
 *
 * NOTE: there are no clean gods to pray to in the captor's pocket of Hell — the
 * "shrines" here are the trial-altars themselves, the moments of moral fork where
 * passing the test leaves you steadier; the "rests" are the rare still pockets of
 * the pit, and the calm of the Tear of the Slain God once it is claimed.
 */
export const CHAPTER11_FLAVOR = {
  chapter: 11 as const,
  prefix: 'c11',
  title: 'The Trials of the Pit',
  shrines: [
    {
      title: 'A Trial-Altar, Passed',
      flavorText:
        "One of the five altars stands cooling, its question answered the hard right way — you faced the thing, set down the trinket, stayed your hand, spent yourself. There is no god in the stone to thank. But a soul that has just refused its own worst self stands a little straighter, and the burning ground does not press quite so close to a thing that has, for once, declined to be what the pit hoped. Stand at the answered altar a moment, and remember that the captor does not own all of you yet.",
    },
    {
      title: 'The Tear of the Slain God',
      flavorText:
        "Where the five trials meet, a single drop of your father's essence hangs in the air, red-black and slow-turning, wept from a god as he died and kept here against this exact hour. It is the proof you came through the trials with something of yourself intact — and it is a weapon, the one thing in all of Hell the captor cannot have, because it answers only to the blood. Close your hand on the Tear. It is cold, and it is yours, and for the first time on the long climb down the Voice goes quiet.",
    },
  ] as ChapterRoomFlavor[],
  rests: [
    {
      title: 'A Still Pocket of the Pit',
      flavorText:
        "Even Hell has its dead corners — a fold of the burning where the flame has guttered to embers and nothing comes, because there is nothing here for the vermin to feed on and nothing for the trials to test. The heat is almost kind. The Voice is, for the length of this pocket, too far off to reach you. Sit in the ember-warmth and gather what the trials have left you; the captor is patient, and so, for a few breaths, can you afford to be.",
    },
    {
      title: 'In the Lee of the Tear',
      flavorText:
        "Close by the Tear of the Slain God the pit cannot quite hold its shape — the burning leans away from your father's essence as if it remembers being made by something this drop once belonged to. In that lee there is a coldness that passes, briefly, for peace. Whatever you are about to walk into wearing this calm, it is the last quiet there will be before the face at the end of the Voice. Take it. You have earned the breath, and you will need it.",
    },
  ] as ChapterRoomFlavor[],
  shop: {
    title: 'A Cambion at the Crossing',
    flavorText:
      "A lesser fiend keeps a cold reach of the gallery where the trial-roads cross, and it has learned the one trade Hell respects: it deals. Spread on a slab of fused bone are the leavings of every soul that came this far and got no further — good steel gone unclaimed, charms pried off the damned, draughts the dead no longer need. It does not serve its master and it does not serve you; it serves the bargain, because a fiend that brokers is a fiend the great ones leave alone. It wants coin. In Hell, coin is just one more thing a soul can be made to give up.",
  } as ChapterRoomFlavor,
  bossDefId: 'irenicus',
  boss: {
    title: 'The Face at the End of the Voice',
    flavorText:
      "The trials end and the burning opens into a vault at the heart of the pit, and the Voice that has walked you down the whole descent finally has a face. Jon Velnaris stands at the centre of his stolen Hell with the Tree of Life's power lit under his skin and your divinity gripped in him like a swallowed coal, and he turns to you with the unhurried fondness of a man regarding good work. \"You came all this way down,\" he says, and the old Voice from the cage fits the face exactly. \"After everything I took — you climbed back up to me. I am almost moved. But you have always misunderstood what you are. You are not the one who survives this story. You are the soil, child of Murder, and I have such things to grow.\" The Tear of the Slain God is cold in your hand. It is the one thing here he cannot have. Make him answer for the Voice.",
    xpReward: 5400,
    goldReward: 750,
  },
} as const;

/**
 * Ready-to-wire boss intel card for Chapter 11 (the pre-boss BG2 preparatory beat).
 * Integration appends this to `BOSS_INTEL_CARDS` in bossIntel.ts when it wires the
 * chapter; authored here so the wiring re-authors nothing. Typed against the
 * `BossIntelCard` shape but pinned to chapter 11 (the union in bossIntel.ts is
 * widened by the integration lane). `coinCost = 5·11² + 20·11 = 825`.
 */
export const CHAPTER11_BOSS_INTEL: Omit<BossIntelCard, 'chapter'> & { chapter: 11 } = {
  bossDefId: 'irenicus',
  chapter: 11,
  roomTitle: 'The Antechamber Where the Voice Waits',
  roomFlavor:
    "A last fold of the pit before the vault, where the burning thins and the Voice is suddenly close — not speaking, only present, the way a held breath is present. Someone who climbed this far ahead of you stopped here to think, and left it scored into the slag wall in a shaking hand: it opens with the word — the still word, the slab word — DON'T BE STILL FOR HIM. Below, smaller, where the hand pressed through: he fights like the work. patient. twice to the stroke. and past the half he stops being patient — the taint takes him — that is when he is yours, and when you are most his.",
  weakSpotResolution:
    "You read the wall the way the one who left it meant you to. He does not strike first — he speaks first, the binding word he taught you on the slab, and the stillness is the snare. Knowing the word is the opener, you set your first cut for the half-beat before he can say it, while the Voice still expects you to obey.",
  battlePlanResolution:
    "You read the whole patient procedure off the slag: the binding word first, to still you with the lesson he drilled into you a hundred lifetimes deep — then the studied two-stroke of a man finishing work he long since perfected, no anger in it to read — and the moment past half when god-taint he tore out of you turns in his hands and he stops being a scholar and becomes the very thing he stole. You walk into the vault with your mind set against the word, the Tear cold in your hand, and your first strike already aimed past his guard.",
  walkPastResolution:
    "You leave the warning unread and the word un-warded, and step into the vault without slowing. The Voice, almost fond, marks the boldness of it — you were always his best work. The bold take the last room on their own terms, and what the captor sheds when he falls will weigh a touch heavier for a soul that walked in unafraid of the one who made it.",
  coinCost: 5 * 11 * 11 + 20 * 11,
};
