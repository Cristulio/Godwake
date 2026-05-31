import type { RoomMonster } from '../../types/delve';

/**
 * Chapter 9 · "The Court of Masks" encounter pools. Mirrors chapter8Pools —
 * pooled compositions for each combat slot in the ruined court the road passes
 * through deeper on the descent toward the captor: a fallen hall of liars and
 * illusions where nothing wears its true face, the captor's own old seat of
 * power, where deception calcified into the architecture and outlived everyone
 * who practised it.
 *
 * Theme: the lie that outlived the liar. The court ruled by being whatever each
 * room needed to believe, and when it fell the masks kept the form of it — shades
 * in borrowed faces, mirror-doubles peeled off the cracked glass, a masquerade
 * that refuses to admit it is over, presided over by a usurper with nothing
 * beneath the last mask. Mechanically the chapter leans into illusion and
 * deception: frighten, blind, life-drain, and summoned copies. Continues the
 * curve a clear notch past Chapter 8: warmups CR 8, early-mid CR 9, mid CR 10,
 * elite CR 12, boss (The Hollow Pretender) CR 13.
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
    title: 'A Face You Almost Know',
    flavorText:
      'The ash gives out, and the road runs in under a fallen colonnade onto a marble floor cracked like old glaze. A single masque-wisp drifts the ruin toward you in slow procession, a painted porcelain face over a suggestion of a body, bowing as it comes. The face is one you nearly recognise. That is the first lie the Court tells, and the cheapest, and it still wants blood for it.',
    monsters: [{ defId: 'masque-wisp', count: 1 }],
    xpReward: 1090,
    goldReward: 90,
  },
  {
    title: 'Yourself, Stepping Off the Glass',
    flavorText:
      'A wall of cracked mirror runs the length of the hall, and as you pass it your reflection does not. It peels off the surface a half-step behind you, takes a guard you know intimately because it is your own, and turns the last stroke you threw back at you with a glass edge.',
    monsters: [{ defId: 'mirror-double', count: 1 }],
    xpReward: 1090,
    goldReward: 92,
  },
  {
    title: 'Two of the Lesser Masks',
    flavorText:
      'Two masque-wisps come up the hall in step, bowing in time to music a hundred years stopped, each wearing a borrowed face turned politely toward you. Neither remembers being given the thin blades they carry. Neither needs to remember, to use them.',
    monsters: [{ defId: 'masque-wisp', count: 2, displayPrefix: 'Masque' }],
    xpReward: 1110,
    goldReward: 88,
  },
  {
    title: 'The Courtier and the Copy',
    flavorText:
      'A masque-wisp glides in from the dais while your own reflection steps off the wall behind you — the false face ahead and the true habit at your back, the oldest trick of the Court worked by its meanest pieces. You will be busy with the one you can read and cut by the one you cannot.',
    monsters: [
      { defId: 'masque-wisp', count: 1 },
      { defId: 'mirror-double', count: 1 },
    ],
    xpReward: 1120,
    goldReward: 94,
  },
  {
    title: 'A Pair Off the Mirror',
    flavorText:
      'The cracked glass gives up two of you at once, both wearing your stance, both carrying your worst habits as a weapon. They do not coordinate. They do not have to. They only have to be exactly as good as you are, twice over, and more willing to die last.',
    monsters: [{ defId: 'mirror-double', count: 2, displayPrefix: 'Double' }],
    xpReward: 1110,
    goldReward: 90,
  },
  {
    title: 'A Receiving Line of Three',
    flavorText:
      'Three masque-wisps stand the hall in a receiving line, the way the household once greeted the arriving great, and turn their painted faces to you one after another as you cross — a bow, a bow, a bow, and three thin blades sliding free under the manners.',
    monsters: [{ defId: 'masque-wisp', count: 3, displayPrefix: 'Masque' }],
    xpReward: 1130,
    goldReward: 86,
  },
];

export const EARLY_MID_POOL: EncounterEntry[] = [
  {
    title: 'The Face You Wronged',
    flavorText:
      'A veilsworn courtier turns its mask to you with perfect manners, and the painted face is suddenly, exactly, the face of someone you left behind. Your whole body remembers being ashamed before your mind can name them — and while you cannot meet the eyes it does not have, the court-rapier finds the gap your flinching leaves.',
    monsters: [{ defId: 'veilsworn-courtier', count: 1 }],
    xpReward: 1570,
    goldReward: 120,
  },
  {
    title: 'Never Alone, Never Honest',
    flavorText:
      'A glasswright duelist salutes you with a blade of polished glass, taps it once to a cracked pane, and calls a second — your own reflection, drawn off the wall and armed against you. It was the court fencing-master once. It taught one rule above all: never meet anyone alone.',
    monsters: [{ defId: 'glasswright-duelist', count: 1 }],
    xpReward: 1580,
    goldReward: 124,
  },
  {
    title: 'The Courtier and Its Wisp',
    flavorText:
      'A veilsworn courtier comes on with a masque-wisp drifting at its shoulder, the high mask to root you in shame and the low one to work at you while you flinch. The etiquette of the Court was always a knife wrapped in a bow. Here it is two.',
    monsters: [
      { defId: 'veilsworn-courtier', count: 1 },
      { defId: 'masque-wisp', count: 1 },
    ],
    xpReward: 1620,
    goldReward: 128,
  },
  {
    title: 'The Duelist and Its Second',
    flavorText:
      'A glasswright duelist stands the floor with a mirror-double already at its side and more glass at its back to make others from. It fights you the way it fenced in life — never the same hand twice, always one more blade than there should be, always your own face on at least one of them.',
    monsters: [
      { defId: 'glasswright-duelist', count: 1 },
      { defId: 'mirror-double', count: 1 },
    ],
    xpReward: 1640,
    goldReward: 130,
  },
  {
    title: 'The Fencing-Master and the Hall',
    flavorText:
      'A glasswright duelist works the centre of the floor with two masque-wisps dressed in on its flanks — the seconds to keep you turning while it picks its line, the glass behind it to replace whatever you manage to break. Cut the duelist fast, or fence the whole ruined ballroom at once.',
    monsters: [
      { defId: 'glasswright-duelist', count: 1 },
      { defId: 'masque-wisp', count: 2, displayPrefix: 'Masque' },
    ],
    xpReward: 1660,
    goldReward: 126,
  },
  {
    title: 'The Bow and the Blade',
    flavorText:
      'A veilsworn courtier and a glasswright duelist work the floor together — the one to fix you with a face you owe something to, the other to run you through while you are too ashamed to look. The whole etiquette of the place, said twice: be still for your betters, and never see the blade.',
    monsters: [
      { defId: 'veilsworn-courtier', count: 1 },
      { defId: 'glasswright-duelist', count: 1 },
    ],
    xpReward: 1680,
    goldReward: 132,
  },
  {
    title: 'Two of the Accusing',
    flavorText:
      'Two veilsworn courtiers share the floor, each turning to you a different face you have something to answer for — a friend you failed on the left, a thing you betrayed on the right — so that wherever you turn, your own conscience holds you a half-beat too long for the rapier waiting there.',
    monsters: [{ defId: 'veilsworn-courtier', count: 2, displayPrefix: 'Courtier' }],
    xpReward: 1640,
    goldReward: 128,
  },
];

export const MID_POOL: EncounterEntry[] = [
  {
    title: 'The Darling That Feeds',
    flavorText:
      'A pale favourite crosses the dais toward you with its arms a little open, blank-masked and beautiful and starving. It takes your hand, or your throat, with the same fond familiarity — and something goes out of you the wrong way and surfaces a moment later on its empty face as the faint suggestion of your own.',
    monsters: [{ defId: 'pale-favourite', count: 1 }],
    xpReward: 1990,
    goldReward: 148,
  },
  {
    title: 'Call the Revel',
    flavorText:
      'A masquerade-warden claps its gloved hands once, calling to order a ball that ended an age ago, and the dead air fills with a whirling crowd of borrowed faces — laughing, bowing, sweeping past on every side — until you cannot say which dancer can be cut and which is only a face. Somewhere in the swirl a long cane is already lashing out.',
    monsters: [{ defId: 'masquerade-warden', count: 1 }],
    xpReward: 2000,
    goldReward: 150,
  },
  {
    title: 'The Favourite and the Copy',
    flavorText:
      'A pale favourite drifts in with your own reflection at its heel — the hollow thing to wear your warmth and the glass thing to keep you swinging while it does. By the time you shatter the double the favourite has had its hands on you long enough to be wearing your face back at you.',
    monsters: [
      { defId: 'pale-favourite', count: 1 },
      { defId: 'mirror-double', count: 1 },
    ],
    xpReward: 2010,
    goldReward: 152,
  },
  {
    title: 'The Revel and the Accuser',
    flavorText:
      'A masquerade-warden floods the hall with false faces while a veilsworn courtier waits in the crowd it makes, turning to you, whenever the blindness lifts, a face you cannot strike. One to make sure you cannot see, one to make sure you cannot bear to — and a cane and a rapier between them, out of a party that is not there.',
    monsters: [
      { defId: 'masquerade-warden', count: 1 },
      { defId: 'veilsworn-courtier', count: 1 },
    ],
    xpReward: 2040,
    goldReward: 156,
  },
  {
    title: 'The Revel and the Fencer',
    flavorText:
      'A masquerade-warden calls the crowd and a glasswright duelist fences inside it, calling your own reflection out of the swirl to fight you while you cannot tell it from the phantoms. Between the blindness and the copies there is meant to be no one left in the room you can be sure is real except the blades.',
    monsters: [
      { defId: 'masquerade-warden', count: 1 },
      { defId: 'glasswright-duelist', count: 1 },
    ],
    xpReward: 2040,
    goldReward: 154,
  },
  {
    title: 'The Darling and the Revelmaster',
    flavorText:
      'A pale favourite works the warmth out of you from up close while a masquerade-warden hides it in a crowd of faces that are not there. You cannot see the embrace coming and you feel it leaving with a piece of you each time. Find the revelmaster in the swirl, or be loved cold in the middle of a ball with no guests.',
    monsters: [
      { defId: 'pale-favourite', count: 1 },
      { defId: 'masquerade-warden', count: 1 },
    ],
    xpReward: 2060,
    goldReward: 158,
  },
  {
    title: 'The Darling and the Accuser',
    flavorText:
      'A pale favourite and a veilsworn courtier take you between them — the one wearing a face you must answer for to hold you still, the other folding around you to feed on the holding. Shame fixes you; the embrace empties you; and each makes the other land.',
    monsters: [
      { defId: 'pale-favourite', count: 1 },
      { defId: 'veilsworn-courtier', count: 1 },
    ],
    xpReward: 2060,
    goldReward: 156,
  },
];

export const ELITE_POOL: EncounterEntry[] = [
  {
    title: 'The Household Assembles',
    flavorText:
      'The hall is blocked by the one figure here that wears no mask of its own — a tall, grey, unhurried thing with a staff of office, the Court\'s chamberlain, who never needed a face because its power was in assigning the others. It raps the floor for order, and the cracked panes give up your reflections one by one to stand the room. An empty court, refusing on protocol to be empty.',
    monsters: [{ defId: 'mask-chamberlain', count: 1 }],
    xpReward: 2780,
    goldReward: 204,
  },
  {
    title: 'The Chamberlain and Its First Reflection',
    flavorText:
      'The mask-chamberlain already has one mirror-double standing the floor in front of it, the first of however many it decides the seating requires. The staff of office comes down on its slow ceremonial arc while your own reflection closes from the side. Two clocks, and only one you can stop by breaking the glass.',
    monsters: [
      { defId: 'mask-chamberlain', count: 1 },
      { defId: 'mirror-double', count: 1 },
    ],
    xpReward: 2820,
    goldReward: 210,
  },
  {
    title: 'The Chamberlain in the Revel',
    flavorText:
      'A mask-chamberlain presides while a masquerade-warden floods the floor around it, so the heavy ceremonial staff falls out of a swirl of faces you cannot read. You will not see the arc coming. You will only learn, once, where it lands, and try not to be standing there the second time.',
    monsters: [
      { defId: 'mask-chamberlain', count: 1 },
      { defId: 'masquerade-warden', count: 1 },
    ],
    xpReward: 2860,
    goldReward: 216,
  },
  {
    title: 'The Chamberlain and Its Fencer',
    flavorText:
      'A mask-chamberlain keeps the hall staffed out of the mirrors while a glasswright duelist works the front of it, the two of them refilling the room faster than you can empty it — doubles off the glass, doubles off the duelist, and a fresh mask laid on anything you manage to drop. Fell the chamberlain, or the court never adjourns.',
    monsters: [
      { defId: 'mask-chamberlain', count: 1 },
      { defId: 'glasswright-duelist', count: 1 },
    ],
    xpReward: 2900,
    goldReward: 220,
  },
  {
    title: 'Two That Wear Stolen Faces',
    flavorText:
      'A pale favourite and a masquerade-warden hold the dais together — the darling to take your warmth, the revelmaster to hide it doing so behind a hall full of faces. They do not coordinate, exactly. They only each make the other impossible to answer: you cannot find the one you must kill, and you cannot stop the one that is killing you.',
    monsters: [
      { defId: 'masquerade-warden', count: 1 },
      { defId: 'pale-favourite', count: 1 },
    ],
    xpReward: 2880,
    goldReward: 214,
  },
  {
    title: 'The Chamberlain and the Darling',
    flavorText:
      'A mask-chamberlain presides over the seating while a pale favourite works the warmth out of you from reach — the protocol that will not let the room empty, and the hunger that empties you. Spend too long on the staff and the favourite has had its fill; spend too long on the favourite and the household has filled the hall again.',
    monsters: [
      { defId: 'mask-chamberlain', count: 1 },
      { defId: 'pale-favourite', count: 1 },
    ],
    xpReward: 2920,
    goldReward: 220,
  },
];

/** Title + flavor for a non-combat Chapter 9 room (shrine / rest / shop). */
export interface ChapterRoomFlavor {
  title: string;
  flavorText: string;
}

/**
 * Ready-to-wire non-combat flavor for Chapter 9. Shaped to drop straight into
 * the `GODWAKE_CHAPTERS` `ChapterContent` entry in createDelve.ts (shrines /
 * rests / shop / boss + bossDefId), beside the pools, so the wiring re-authors
 * nothing.
 *
 * NOTE: there are no honest gods to pray to in a court of liars — the "shrines"
 * here are the few honest surfaces left in the hall: a mirror that, for a moment,
 * shows your true face, and a heap of discarded masks too plain to lie with.
 */
export const CHAPTER9_FLAVOR = {
  chapter: 9 as const,
  prefix: 'c9',
  title: 'The Court of Masks',
  shrines: [
    {
      title: 'A Mirror That Does Not Lie',
      flavorText:
        "One pane of the cracked glass is unsilvered through, and where the silver is gone the mirror has forgotten how to flatter — it shows you, just you, your own road-worn face with no borrowed grace laid over it. In a hall built to make you doubt which face is yours, the plain sight of it is a kind of armour. Stand in front of it a moment, and remember whose you are.",
    },
    {
      title: 'A Heap of Cast-Off Masks',
      flavorText:
        "Where the wardrobe spilled, a drift of discarded masks lies in the corner — not the great lying faces of the high court but the blank rehearsal masks, too plain to deceive anyone, thrown out for telling no story at all. The Court had no use for an honest face. You can. Take one up, hold a thing that was never meant to fool you, and the hall's whispering loses its grip for a while.",
    },
  ] as ChapterRoomFlavor[],
  rests: [
    {
      title: 'Behind the Arras',
      flavorText:
        "A gap behind a rotted tapestry opens on the dead space the servants used — a narrow run between the painted face the Court showed and the bare stone behind it. No mask was ever worn back here; there was no one to fool. The masquerade cannot follow you into the place it pretended did not exist. Sit in the bare stone a while. Nothing here is performing.",
    },
    {
      title: 'The Cold Green-Room',
      flavorText:
        "An ante-chamber off the ballroom where the maskers waited their turn to be announced — a long mirror, a cold brazier, a bench worn smooth by a hundred years of nerves. The revel has not been called in here in an age, and the dead do not gather where they are between faces. For a little while you are off-stage, and unwatched, and allowed to be tired.",
    },
  ] as ChapterRoomFlavor[],
  shop: {
    title: 'The Wardrobe-Keeper',
    flavorText:
      "Something that was once the keeper of the Court's wardrobe still tends its racks in the lee of the dressing-hall, sorting the leavings of ten thousand abandoned identities — the good steel a duellist-courtier left, harness off the masked dead, charms and draughts forgotten in stolen pockets. It does not want coin to spend. It wants coin because keeping the inventory is the last office it has left, and it would rather count the wardrobe than wonder why no one comes to be dressed.",
  } as ChapterRoomFlavor,
  bossDefId: 'the-hollow-pretender',
  boss: {
    title: 'The Throne That Wears No Face',
    flavorText:
      "The hall ends at a throne, and the throne is empty, and the thing that rules from it has never once sat down. A slender, courtly shape in layered finery rises to meet you and bows with the exact warmth of a host long expecting you — wearing the face of the Court's first king, and beneath that the second, and beneath that every face that ever held this hall, all the way down to nothing. It took the throne not by blood but by being, perfectly, whatever each room needed to crown. \"Welcome back,\" the Hollow Pretender says, in a voice you almost trust. \"You have worn so many faces, climbing down to me. Surely you can spare the last one — take off yours, I will keep it safe, and there will be a place for you here, where no one ever has to be anyone at all.\"",
    xpReward: 3800,
    goldReward: 540,
  },
} as const;
