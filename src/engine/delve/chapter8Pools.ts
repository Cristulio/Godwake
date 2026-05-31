import type { RoomMonster } from '../../types/delve';

/**
 * Chapter 8 · "The Ashfall March" encounter pools. Mirrors chapter6Pools —
 * pooled compositions for each combat slot in the war-burnt waste the road
 * crosses on the long descent toward the captor. A ruined battlefield that
 * never stopped smouldering, walked forever by an army that was never stood
 * down.
 *
 * Theme: the march that will not halt. The fire came through the line and
 * killed everything but the order to hold; a dead host keeps the cadence still,
 * fused to its armour, herded by hounds of cinder and re-kindled by its own
 * chaplains. Continues the curve a clear notch past Chapter 6: warmups CR 7,
 * early-mid CR 8, mid CR 9, elites CR 10, boss (the Ashen Marshal) CR 11.
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
    title: 'A Soldier Still at His Post',
    flavorText:
      'The ash crusts ankle-deep where the road crosses the old line, and a single shape stands in it facing the way the enemy came a hundred years ago. The ember-conscript does not turn until you are nearly on it. Then it does, with the unhurried certainty of a thing that has been told to hold this ground and has never once been told to stop.',
    monsters: [{ defId: 'ember-conscript', count: 1 }],
    xpReward: 880,
    goldReward: 72,
  },
  {
    title: 'Something Runs the Flank',
    flavorText:
      'A streak of blown embers cuts across the grey ahead, circling wide the way a scout-pack runs a column. The cinderwake hound has your scent — or your warmth, which is the same thing to it now — and it drives in to herd you back toward the spears, and burns you for refusing.',
    monsters: [{ defId: 'cinderwake-hound', count: 1 }],
    xpReward: 880,
    goldReward: 74,
  },
  {
    title: 'Two of the Fallen Rank',
    flavorText:
      'Two ember-conscripts come up out of the drift in step, shields overlapping the way they were drilled, the old two-man frontage closing on the road. Neither has a face left under the helm. Neither needs one to keep the formation it died holding.',
    monsters: [{ defId: 'ember-conscript', count: 2, displayPrefix: 'Conscript' }],
    xpReward: 900,
    goldReward: 70,
  },
  {
    title: 'The Picket and the Spear',
    flavorText:
      'A cinderwake hound flushes you out of the open ash and an ember-conscript is already there to meet what the hound drives in — the oldest tactic there is, the dog and the line, worked by things that have forgotten everything about the war except how it was fought.',
    monsters: [
      { defId: 'cinderwake-hound', count: 1 },
      { defId: 'ember-conscript', count: 1 },
    ],
    xpReward: 910,
    goldReward: 76,
  },
  {
    title: 'The Pack on the Ashfield',
    flavorText:
      'Two cinderwake hounds quarter the open ground together, trailing sparks, cutting off the angles the way a brace of war-dogs works a fleeing man. They do not bark. The only sound is the crust of ash breaking under them and the low roar of what burns inside.',
    monsters: [{ defId: 'cinderwake-hound', count: 2, displayPrefix: 'Hound' }],
    xpReward: 900,
    goldReward: 72,
  },
  {
    title: 'A Frontage of Three',
    flavorText:
      'Three ember-conscripts this near the old line, shoulder to shoulder, the front rank of a regiment that has nothing behind it any more. The fire fused them mid-advance and the advance never stopped. They lean into a charge that already happened, and you are standing where it is still going.',
    monsters: [{ defId: 'ember-conscript', count: 3, displayPrefix: 'Conscript' }],
    xpReward: 920,
    goldReward: 68,
  },
];

export const EARLY_MID_POOL: EncounterEntry[] = [
  {
    title: 'The Wall That Walks',
    flavorText:
      'A slagbound legionary blocks the narrows where the road cuts through a drift of cooled iron — a man and his plate run together into one slow ingot, leaning forward into the fifty yards of ash it has marched for a century. It does not hurry to meet you. It has never once needed to.',
    monsters: [{ defId: 'slagbound-legionary', count: 1 }],
    xpReward: 1300,
    goldReward: 98,
  },
  {
    title: 'The Smoke Comes First',
    flavorText:
      "An ashchoke herald wades up the road ahead of its own column of smoke, crook held high where a banner used to be. The murk reaches you before it does — fine grey ash and the powdered dead, packing your eyes shut. Somewhere in the blur the long iron crook is already swinging.",
    monsters: [{ defId: 'ashchoke-herald', count: 1 }],
    xpReward: 1320,
    goldReward: 104,
  },
  {
    title: 'The Wall and Its Conscript',
    flavorText:
      'A slagbound legionary holds the road with a single ember-conscript dressed in beside it, the heavy and the light infantry as the drill demanded. One you cannot move and one you cannot ignore, and between them just enough room left on the road for exactly that problem.',
    monsters: [
      { defId: 'slagbound-legionary', count: 1 },
      { defId: 'ember-conscript', count: 1 },
    ],
    xpReward: 1360,
    goldReward: 108,
  },
  {
    title: 'Blind and Driven',
    flavorText:
      'An ashchoke herald rolls its smoke over you while a cinderwake hound runs the edges of the murk, driving you back whenever you grope for clear air. You cannot see the dog. You only feel where it has been, by the burns, and by the herald letting you wander exactly where it wants you.',
    monsters: [
      { defId: 'ashchoke-herald', count: 1 },
      { defId: 'cinderwake-hound', count: 1 },
    ],
    xpReward: 1380,
    goldReward: 110,
  },
  {
    title: 'The Herald and the Rank',
    flavorText:
      "An ashchoke herald comes on with two ember-conscripts holding the line ahead of it — the smoke to blind you, the rank to keep you from reaching the thing that raises it. Cut through the frontage fast, or fight the whole muster eyes-streaming while the column closes.",
    monsters: [
      { defId: 'ashchoke-herald', count: 1 },
      { defId: 'ember-conscript', count: 2, displayPrefix: 'Conscript' },
    ],
    xpReward: 1400,
    goldReward: 106,
  },
  {
    title: 'The Wall and the Pack',
    flavorText:
      'A slagbound legionary anchors the road and a cinderwake hound works around it, the immovable thing and the too-quick thing pinning you between a charge you cannot dodge and a wall you cannot pass. The legionary does not coordinate with the hound. It does not have to. It only has to stand there.',
    monsters: [
      { defId: 'slagbound-legionary', count: 1 },
      { defId: 'cinderwake-hound', count: 1 },
    ],
    xpReward: 1400,
    goldReward: 108,
  },
  {
    title: 'Two Held Walls',
    flavorText:
      'Two slagbound legionaries close the road shoulder to shoulder, a frontage of fused iron with no gap left to slip. There is no flanking it and no rushing it — only the slow, ugly work of breaking down two walking ingots while their fists come down on the same slow, certain arc.',
    monsters: [{ defId: 'slagbound-legionary', count: 2, displayPrefix: 'Legionary' }],
    xpReward: 1420,
    goldReward: 112,
  },
];

export const MID_POOL: EncounterEntry[] = [
  {
    title: 'The Cold That Wears a Man',
    flavorText:
      'A gravesmoke revenant uncoils out of the drift where the road dips — a man-shape of grey smoke that holds its edges only by what it can take from you. It reaches, and the warmth goes out of you the wrong way, and the thing thickens and darkens by exactly the measure you fail.',
    monsters: [{ defId: 'gravesmoke-revenant', count: 1 }],
    xpReward: 1620,
    goldReward: 122,
  },
  {
    title: 'The Office of the Pyres',
    flavorText:
      'A pyre-chaplain keeps its station where the dead lie thickest, swinging a censer of live coals over a field with no end to its burning. It does not look up at you. There is a rite to keep, and you are an interruption it expects to mend in a moment, the way it mends all its congregation.',
    monsters: [{ defId: 'pyre-chaplain', count: 1 }],
    xpReward: 1640,
    goldReward: 126,
  },
  {
    title: 'The Smoke and the Conscript',
    flavorText:
      'A gravesmoke revenant drifts up the road with an ember-conscript marching at its side — the cold thing to take your warmth, the worn thing to keep you busy while it does. By the time you fell the conscript the revenant is wearing enough of your heat to have edges you cannot smoke through.',
    monsters: [
      { defId: 'gravesmoke-revenant', count: 1 },
      { defId: 'ember-conscript', count: 1 },
    ],
    xpReward: 1660,
    goldReward: 128,
  },
  {
    title: 'The Chaplain and the Wall',
    flavorText:
      "A pyre-chaplain tends a slagbound legionary the way a smith tends a forge, re-kindling its embers faster than you can put them out. Every wound you grind into the wall, the chaplain breathes back to a crust of fresh coal. Drop the chaplain first, or fight the legionary forever.",
    monsters: [
      { defId: 'pyre-chaplain', count: 1 },
      { defId: 'slagbound-legionary', count: 1 },
    ],
    xpReward: 1700,
    goldReward: 134,
  },
  {
    title: 'The Chaplain and the Smoke',
    flavorText:
      'A pyre-chaplain works the rite beside an ashchoke herald — one to blind you, one to mend whatever the smoke lets reach you. Between the murk and the re-kindling there is meant to be no clean angle left and no wound that stays open. The office and the banner, keeping each other.',
    monsters: [
      { defId: 'pyre-chaplain', count: 1 },
      { defId: 'ashchoke-herald', count: 1 },
    ],
    xpReward: 1700,
    goldReward: 132,
  },
  {
    title: 'The Cold and the Pack',
    flavorText:
      'A gravesmoke revenant lets a cinderwake hound run you ragged across the open ash and then folds around whatever the hound brings to ground. The dog burns; the smoke steals. By the time you have killed the quick thing the slow one has had its hands on you long enough to matter.',
    monsters: [
      { defId: 'gravesmoke-revenant', count: 1 },
      { defId: 'cinderwake-hound', count: 1 },
    ],
    xpReward: 1700,
    goldReward: 130,
  },
  {
    title: 'The Herald and the Cold',
    flavorText:
      'An ashchoke herald packs your eyes with ash while a gravesmoke revenant reaches in through the blur to take your warmth. You cannot see the cold thing coming and you feel it leaving with a piece of you each time. Find the herald in the murk, or freeze in it.',
    monsters: [
      { defId: 'ashchoke-herald', count: 1 },
      { defId: 'gravesmoke-revenant', count: 1 },
    ],
    xpReward: 1720,
    goldReward: 134,
  },
];

export const ELITE_POOL: EncounterEntry[] = [
  {
    title: 'The Thing the March Drags Along',
    flavorText:
      'The road is blocked by a mountain that walks — a slag-colossus, a whole company set in one cooling pour of iron, faces and spear-points still half-visible in its surface. When it wants soldiers it lets some of itself stand up and fight, and it has wanted soldiers on this road for a hundred years.',
    monsters: [{ defId: 'slag-colossus', count: 1 }],
    xpReward: 2300,
    goldReward: 172,
  },
  {
    title: 'The Colossus and Its First Casting',
    flavorText:
      'The slag-colossus already has one ember-conscript peeled off its glowing flank and standing in front of it, the first of however many it decides to shed. The fist comes down the long slow arc while the conscript closes from the side. Two clocks, and only one you can stop by hitting it.',
    monsters: [
      { defId: 'slag-colossus', count: 1 },
      { defId: 'ember-conscript', count: 1 },
    ],
    xpReward: 2360,
    goldReward: 180,
  },
  {
    title: 'The Colossus in the Smoke',
    flavorText:
      'A slag-colossus holds the road while an ashchoke herald rolls its column down over the whole fight, so the wagon-sized fist falls out of a blur you cannot read. You will not see the arc coming. You will only learn, once, where it lands, and try not to be there the second time.',
    monsters: [
      { defId: 'slag-colossus', count: 1 },
      { defId: 'ashchoke-herald', count: 1 },
    ],
    xpReward: 2400,
    goldReward: 186,
  },
  {
    title: 'The Colossus and Its Chaplain',
    flavorText:
      'A pyre-chaplain keeps station at the foot of a slag-colossus, re-kindling the conscripts it sheds and breathing coal back into the colossus itself as fast as you crack it. The mountain never wears down and the ranks never thin. Fell the chaplain, or this road is where the march finally swallows you.',
    monsters: [
      { defId: 'slag-colossus', count: 1 },
      { defId: 'pyre-chaplain', count: 1 },
    ],
    xpReward: 2440,
    goldReward: 190,
  },
  {
    title: 'The Held Wall',
    flavorText:
      'A pyre-chaplain tends a slagbound legionary with an ember-conscript dressed in beside it — a single point of the line, mended and manned and absolutely immovable. It is a small encounter and a long one: nothing here is fast, and nothing here will stay down while the chaplain breathes.',
    monsters: [
      { defId: 'pyre-chaplain', count: 1 },
      { defId: 'slagbound-legionary', count: 1 },
      { defId: 'ember-conscript', count: 1 },
    ],
    xpReward: 2420,
    goldReward: 184,
  },
  {
    title: 'The Colossus and the Cold',
    flavorText:
      'A slag-colossus crushes the road from reach while a gravesmoke revenant works the warmth out of you from the side — the unstoppable thing and the patient thing, the fist you cannot dodge and the grip you cannot keep off. Spend too long on the mountain and the smoke has worn you cold; spend too long on the smoke and the fist arrives.',
    monsters: [
      { defId: 'slag-colossus', count: 1 },
      { defId: 'gravesmoke-revenant', count: 1 },
    ],
    xpReward: 2460,
    goldReward: 190,
  },
];

/** Title + flavor for a non-combat Chapter 8 room (shrine / rest / shop). */
export interface ChapterRoomFlavor {
  title: string;
  flavorText: string;
}

/**
 * Ready-to-wire non-combat flavor for Chapter 8. Shaped to drop straight into
 * the `GODWAKE_CHAPTERS` `ChapterContent` entry in createDelve.ts (shrines /
 * rests / shop / boss + bossDefId), beside the pools, so the wiring re-authors
 * nothing.
 *
 * NOTE: there are no gods left to pray to on the ashfields — the "shrines" here
 * are soldiers' cairns and cold forges, places a living thing can brace against
 * the march for a moment before the cadence finds it again.
 */
export const CHAPTER8_FLAVOR = {
  chapter: 8 as const,
  prefix: 'c8',
  title: 'The Ashfall March',
  shrines: [
    {
      title: "A Cairn the March Forgot",
      flavorText:
        "A heap of helms and broken spears someone raised over the dead before there were too many dead to count — and then the counting stopped, and the cairn stood, and the war went on around it without it. Nothing reborn is buried here. For as long as you stand in its small shadow, the cadence loses the beat of you.",
    },
    {
      title: 'A Cold Forge in the Ruin',
      flavorText:
        "The field-forge where they shod the warhorses and edged the blades, its fire a century out and its anvil cold under the ash. The smoke does not gather here — the old iron throws too long a memory of heat for the dead to keep their footing in it. Set your back to the cold anvil. The march cannot quite reach you across it.",
    },
  ] as ChapterRoomFlavor[],
  rests: [
    {
      title: 'The Lee of an Overturned Wagon',
      flavorText:
        "A foundry-wagon went over here when the iron in it ran, and where it fell it makes a windbreak the ashfall streams around instead of through. In the hollow behind it the air is almost clear and the roar of the burning is almost far away. It is not safe. It is only a place the march has to go around.",
    },
    {
      title: 'A Trench the Fire Skipped',
      flavorText:
        'A length of forward trench the firestorm jumped clean over, so the men in it never burned and never rose — they only stayed, and went quiet, and are quiet still. The dead who lie down for good make a small dead calm around themselves. Sit in it a while. Nothing here is going to be ordered to its feet.',
    },
  ] as ChapterRoomFlavor[],
  shop: {
    title: 'A Scavenger on the Field',
    flavorText:
      "Something that was once a camp-follower and is now only a habit picks over the dead where they fell thickest, sorting the good steel from the slag by a logic worn down to instinct. It keeps a tarp of gleanings in the lee of a gun-carriage — blades the fire did not ruin, harness off the fallen, a century of a battlefield's leavings. It does not want coin to spend. It wants coin because counting the take is the last of the trade it has left.",
  } as ChapterRoomFlavor,
  bossDefId: 'ashen-marshal',
  boss: {
    title: 'Where the Line Still Holds',
    flavorText:
      "The road opens onto the centre of the old line, and the march is all around you at once — ranks closing at your back, the smoke folding down, the dead of both sides dressed into one column that goes nowhere and never halts. At the heart of it a tall burnt shape turns, rank still legible under the char, and regards you with something that is almost courtesy. \"The order was to hold,\" says Dravok, the Ashen Marshal. \"No one came to stand the army down. So the army stands, and I stand with it, and I will keep standing it down this road until I find the enemy that did this to my field. I have decided that is you. Fall in — or fall.\"",
    xpReward: 3100,
    goldReward: 440,
  },
} as const;
