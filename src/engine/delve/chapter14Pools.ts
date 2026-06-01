import type { RoomMonster } from '../../types/delve';

/**
 * Chapter 14 · "The Throne of Bhaal" encounter pools — the game's final chapter
 * and L20 finale. Mirrors chapter9Pools: pooled compositions for each combat slot
 * on the last climb, across the Pocket Plane and up the steps of the dead god's
 * empty seat to Amelyssan the Blackhearted, who engineered the whole Bhaalspawn
 * crisis to harvest the Children's essence and ascend as the new God of Murder.
 *
 * Theme: the harvest at the altar. The hall is hung with pools of Bhaal rendered
 * down, and the murder in them buds — motes, blood-fiends, fiendish wardens up
 * from the Hells to keep the seat, priest-heralds singing the harvest along, and,
 * this close to the Throne, the player's own Bhaal taint walking out of their
 * shadow as the Slayer. The fiercest, heaviest bestiary in the game, capped by the
 * biggest statblock there is. Bands escalate a clear tier past every prior
 * chapter: warmups CR 12, early-mid CR 13, mid CR 14, elite (the Marilith of the
 * Throne) CR 16, boss (Melissan) CR 18.
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
    title: 'A Clot Stands Up',
    flavorText:
      'The Pocket Plane gives out onto the first of the pools, and the surface of it is not still. A single Bhaal-essence mote skims up off the red and finds the shape of a person and the want of one, and crosses the floor toward you with the patience of a tide. It has no face and remembers no name, not even the god it was rendered from. It only knows there should be less of you.',
    monsters: [{ defId: 'bhaal-essence-mote', count: 1 }],
    xpReward: 1930,
    goldReward: 136,
  },
  {
    title: 'The Door Is Kept',
    flavorText:
      'A throne abishai spreads its wings across the gap in the hall, unhurried, and lets you feel the long arithmetic of its patience — the centuries it has stood this door, the claimants it has folded into the floor. It does not hate you. It will simply not let you past, the way it did not let the last one past, or the thousand before.',
    monsters: [{ defId: 'throne-abishai', count: 1 }],
    xpReward: 1950,
    goldReward: 142,
  },
  {
    title: 'Two Off the Surface',
    flavorText:
      'The pool to either side buds at once, and two motes haul themselves up out of the red and come on in slow procession, reaching with limbs that are only blood deciding to be hands. Neither coordinates. Neither has to. They only have to thicken on the wounds they open, and there are two of them to open twice as many.',
    monsters: [{ defId: 'bhaal-essence-mote', count: 2, displayPrefix: 'Mote' }],
    xpReward: 1960,
    goldReward: 138,
  },
  {
    title: 'The Warden and Its Skimming',
    flavorText:
      'A throne abishai holds the threshold while a mote rises behind it off the nearest pool — the devil to fix you with the pit-dread, the clot to work at you while you cannot meet its gaze. The oldest arrangement at this door: one to make you flinch, one to make the flinch cost.',
    monsters: [
      { defId: 'throne-abishai', count: 1 },
      { defId: 'bhaal-essence-mote', count: 1 },
    ],
    xpReward: 1980,
    goldReward: 146,
  },
  {
    title: 'A Pair of the Pit',
    flavorText:
      'Two throne abishai stand the hall together, wings half-spread, scourges already swinging in slow lazy arcs that have dressed a thousand trespassers off this floor. They have kept this watch since before the god was a corpse, and the boredom of it has worn all the malice down to procedure. To them you are the next entry, and they intend to be thorough.',
    monsters: [{ defId: 'throne-abishai', count: 2, displayPrefix: 'Abishai' }],
    xpReward: 1985,
    goldReward: 144,
  },
  {
    title: 'Three the Pool Spat Up',
    flavorText:
      'The red heaves and gives up three motes at once, a clutch of standing murder shouldering up out of the surface in a rough line across the hall. They are the least of what the pools can make and there are three of them, and the floor behind them is already trembling with the want to make more.',
    monsters: [{ defId: 'bhaal-essence-mote', count: 3, displayPrefix: 'Mote' }],
    xpReward: 1995,
    goldReward: 140,
  },
];

export const EARLY_MID_POOL: EncounterEntry[] = [
  {
    title: 'The Murder That Walks',
    flavorText:
      'A blood-fiend hauls itself up the full height of a person and keeps going — tall, asymmetrical, faintly steaming, with too many arms because the murder it is made of was always reaching. It crosses the ground toward you with the certainty, in the marrow it does not have, that there is room in it for one more soul, and that the room is exactly your size.',
    monsters: [{ defId: 'blood-fiend', count: 1 }],
    xpReward: 2480,
    goldReward: 170,
  },
  {
    title: 'The Cantor at Its Office',
    flavorText:
      'A herald of the Bhaalspawn stands over a pool with a censer of black iron, and it does not so much fight as work — dipping the chain, drawing it up trailing, shaking more murder into being one clot at a time. It greets you the way a sexton greets a latecomer to a funeral that will, it is quietly certain, soon enough be yours.',
    monsters: [{ defId: 'murder-herald', count: 1 }],
    xpReward: 2500,
    goldReward: 174,
  },
  {
    title: 'The Herald and Its Skimming',
    flavorText:
      'A herald works a pool with its censer while a mote it has already raised stands the floor in front of it — the priest to keep the hall populated, the clot to keep you busy while it fills the rest. Silence the herald fast, or fence the whole rising floor at once.',
    monsters: [
      { defId: 'murder-herald', count: 1 },
      { defId: 'bhaal-essence-mote', count: 1 },
    ],
    xpReward: 2520,
    goldReward: 178,
  },
  {
    title: 'The Fiend and the Watch',
    flavorText:
      'A blood-fiend wades up out of the red with a throne abishai keeping the line beside it — the standing murder to close and open you, the devil to root you with the pit-dread so the closing lands. One to make you afraid to move, one to make sure the not-moving empties you.',
    monsters: [
      { defId: 'blood-fiend', count: 1 },
      { defId: 'throne-abishai', count: 1 },
    ],
    xpReward: 2540,
    goldReward: 182,
  },
  {
    title: 'The Herald and Its Fiend',
    flavorText:
      'A herald sings the harvest along at the back of the hall while a blood-fiend it has nursed past the mote stage holds the front of it, the two refilling the floor faster than you can empty it — clots off the chain, a fiend that thickens on every wound. Fell the cantor, or the verse never ends.',
    monsters: [
      { defId: 'murder-herald', count: 1 },
      { defId: 'blood-fiend', count: 1 },
    ],
    xpReward: 2560,
    goldReward: 180,
  },
  {
    title: 'Two That Wade the Red',
    flavorText:
      'Two blood-fiends come up out of the pools together, four-armed and steaming, and cross the hall from two lines at once. They do not coordinate, exactly. They only each make the other impossible to answer — wherever you turn to open one, the other is already reaching, already certain there is room.',
    monsters: [{ defId: 'blood-fiend', count: 2, displayPrefix: 'Fiend' }],
    xpReward: 2545,
    goldReward: 176,
  },
  {
    title: 'The Cantor and the Watch',
    flavorText:
      'A herald keeps a pool populated while a throne abishai stands the door it feeds into, so the dread that roots you and the clots that work you come out of the same red mouth. Spend too long on the devil and the floor has filled; spend too long on the floor and the devil has had its measure of you.',
    monsters: [
      { defId: 'murder-herald', count: 1 },
      { defId: 'throne-abishai', count: 1 },
    ],
    xpReward: 2565,
    goldReward: 184,
  },
];

export const MID_POOL: EncounterEntry[] = [
  {
    title: 'The Thing You Would Be',
    flavorText:
      'This close to the Throne the taint in your own blood answers the pools, and it stands up out of your shadow and turns around. The Slayer — the god\'s murder-shape, the thing your blood would make of you if you ever once stopped holding it back — wears your reach and your timing exactly, because they are yours. It does not speak. It has only ever wanted the one thing, and it has always been willing to be you to get it.',
    monsters: [{ defId: 'slayer-echo', count: 1 }],
    xpReward: 3080,
    goldReward: 206,
  },
  {
    title: 'The Keeper of Vessels',
    flavorText:
      'A warden of the pools tends the vats with a sacristan\'s terrible care — skimming, topping up, sluicing essence back into anything useful — and when you intrude it treats you as a leak. It cracks a sheet of ichor across your eyes and brings the gavel down without heat, without haste, certain the floor will be clean again once you are done dripping.',
    monsters: [{ defId: 'essence-warden', count: 1 }],
    xpReward: 3100,
    goldReward: 210,
  },
  {
    title: 'The Slayer and a Clot',
    flavorText:
      'The Slayer rises out of you with a mote standing at its heel — your own worst shape to fix you with the horror of it, the clot to keep you swinging while it does. By the time you break the mote the thing wearing your habits has had a frenzy\'s worth of openings, every one of them a cut you would have taken.',
    monsters: [
      { defId: 'slayer-echo', count: 1 },
      { defId: 'bhaal-essence-mote', count: 1 },
    ],
    xpReward: 3110,
    goldReward: 212,
  },
  {
    title: 'The Warden and Its Fiend',
    flavorText:
      'A warden of the pools keeps a blood-fiend topped up out of the red while it works at your eyes with the ichor — the leak-stopper that will not let the fiend stay down, the fiend that will not let you reach the leak-stopper. Leave the warden standing and nothing you down stays down.',
    monsters: [
      { defId: 'essence-warden', count: 1 },
      { defId: 'blood-fiend', count: 1 },
    ],
    xpReward: 3130,
    goldReward: 216,
  },
  {
    title: 'The Warden and the Slayer',
    flavorText:
      'A warden of the pools sluices the floor whole while the Slayer works the front of it in your own reach — the keeper to undo everything you manage, your own taint to make sure you bleed for the managing. Blind and frenzied at once, in the middle of a hall that refills behind every cut.',
    monsters: [
      { defId: 'essence-warden', count: 1 },
      { defId: 'slayer-echo', count: 1 },
    ],
    xpReward: 3150,
    goldReward: 220,
  },
  {
    title: 'The Slayer and the Herald',
    flavorText:
      'A herald sings clots up off a pool while the Slayer holds the floor in front of it, your own worst shape fronting a tide of standing murder the cantor keeps renewing. One to make sure the hall is never empty, one to make sure the thing in it you cannot bear to face is exactly the thing you fight.',
    monsters: [
      { defId: 'slayer-echo', count: 1 },
      { defId: 'murder-herald', count: 1 },
    ],
    xpReward: 3155,
    goldReward: 218,
  },
  {
    title: 'The Warden and Its Cantor',
    flavorText:
      'A warden of the pools and a herald of the Bhaalspawn keep the hall between them — the one sluicing the fallen whole, the other skimming new murder up to replace whatever you break through. The whole liturgy of the harvest said twice: nothing here is allowed to stay dead but you.',
    monsters: [
      { defId: 'essence-warden', count: 1 },
      { defId: 'murder-herald', count: 1 },
    ],
    xpReward: 3160,
    goldReward: 222,
  },
];

export const ELITE_POOL: EncounterEntry[] = [
  {
    title: 'The Captain on the Steps',
    flavorText:
      'The inner approach is held by the one thing the lower planes did not trust to clerks — a marilith, six-armed and six-bladed, that has kept these steps since before the God of Murder was a corpse. It does not get bored; it gets ready. It regards you with a flicker of something almost like courtesy, six blades already lifting, the serpent-coil already unhurriedly closing the distance you thought you had.',
    monsters: [{ defId: 'marilith-warden', count: 1 }],
    xpReward: 4180,
    goldReward: 274,
  },
  {
    title: 'The Marilith and Its Watch',
    flavorText:
      'The marilith holds the steps with a throne abishai already standing the floor before it, the first of whatever the seating requires. The serpent-coil draws unhurried for your legs while the devil\'s scourge sets its barbs in your guard. Two clocks, and the slower one cuts six times at once.',
    monsters: [
      { defId: 'marilith-warden', count: 1 },
      { defId: 'throne-abishai', count: 1 },
    ],
    xpReward: 4220,
    goldReward: 280,
  },
  {
    title: 'The Captain in the Tide',
    flavorText:
      'A marilith works the steps while a herald keeps the floor around it flooded with skimmed murder, so the six-bladed storm falls out of a crowd of clots you cannot clear fast enough. You will not read the blades coming. You will only learn, once, how many there are, and try to be elsewhere the second time.',
    monsters: [
      { defId: 'marilith-warden', count: 1 },
      { defId: 'murder-herald', count: 1 },
    ],
    xpReward: 4260,
    goldReward: 286,
  },
  {
    title: 'The Captain and the Keeper',
    flavorText:
      'A marilith holds the inner steps while a warden of the pools keeps it whole behind the coils — the deadliest blade in the hall short of Amelyssan, and the one thing that will not let it stay wounded. Break the warden first or fence a thing with six swords and no honest way to make it bleed.',
    monsters: [
      { defId: 'marilith-warden', count: 1 },
      { defId: 'essence-warden', count: 1 },
    ],
    xpReward: 4300,
    goldReward: 292,
  },
  {
    title: 'The Captain and Your Shadow',
    flavorText:
      'A marilith keeps the steps and the Slayer rises beside it out of you, so the demon\'s drilled six-bladed school and your own untaught frenzy come at you from the same moment — the most patient killer in the hall and the most personal one, holding the last approach together while the Throne glows behind them.',
    monsters: [
      { defId: 'marilith-warden', count: 1 },
      { defId: 'slayer-echo', count: 1 },
    ],
    xpReward: 4320,
    goldReward: 290,
  },
  {
    title: 'Two Off the Red, Below the Steps',
    flavorText:
      'A warden of the pools and the Slayer hold the foot of the steps together — the keeper to undo your every gain, your own taint to make you pay for each one in your own reach. They do not coordinate. They only each make the other impossible to answer: you cannot find the seam that lets you climb, and you cannot stop the thing that wears your face from opening you while you look.',
    monsters: [
      { defId: 'essence-warden', count: 1 },
      { defId: 'slayer-echo', count: 1 },
    ],
    xpReward: 4290,
    goldReward: 284,
  },
];

/** Title + flavor for a non-combat Chapter 14 room (shrine / rest / shop). */
export interface ChapterRoomFlavor {
  title: string;
  flavorText: string;
}

/**
 * Ready-to-wire non-combat flavor for Chapter 14. Shaped to drop straight into
 * the `GODWAKE_CHAPTERS` `ChapterContent` entry in createDelve.ts (shrines /
 * rests / shop / boss + bossDefId), beside the pools, so the wiring re-authors
 * nothing.
 *
 * NOTE: there are no clean gods to pray to at the Throne of a dead one — the
 * "shrines" here are the few places on the Pocket Plane where the harvest has not
 * yet reached: a still pool that has not learned to bud, and the worn altar where
 * the dead god once received what is now being made of you.
 */
export const CHAPTER14_FLAVOR = {
  chapter: 14 as const,
  prefix: 'c14',
  title: 'The Throne of Bhaal',
  shrines: [
    {
      title: 'A Pool That Has Not Woken',
      flavorText:
        "One basin of the essence lies utterly still, too far from the Throne for the hunger to have reached it yet — a flat black mirror of the rendered god, holding no want of its own. Kneel at the lip of it and the surface shows you your own face, just yours, no taint risen over it, no Slayer behind the eyes. In a hall built to make you forget which murder is the god's and which is yours, the plain sight of your own held self is a kind of armour. Hold it a moment, and remember whose you are.",
    },
    {
      title: "The God's Worn Altar",
      flavorText:
        "Off the long approach stands the altar Bhaal kept in his own house — a slab of black stone worn smooth in the centre by ten thousand years of offerings laid down and taken up, the channels at its edge still dark. It is the only honest thing in the hall: it never pretended to be anything but what it is. The murder that drowns this place was always meant to end on a stone like this, and it has not forgotten the shape of a soul that comes to it standing instead of carried. Rest a hand on the cold slab. For as long as you touch it, the harvest cannot quite find you.",
    },
  ] as ChapterRoomFlavor[],
  rests: [
    {
      title: 'A Fold in the Pocket Plane',
      flavorText:
        "The Pocket Plane is your own — a scrap of reality the god's blood folded around you at your first death, and it answers to you here as it always has. You step sideways into a quiet pleat of it, out of the red hall and the singing and the steaming pools, into a grey stillness that is the closest thing to home a Child of Bhaal is ever given. Nothing follows you in. For a little while the harvest is somewhere else, and you are only tired, and allowed to be.",
    },
    {
      title: 'Behind the Throne, in Its Shadow',
      flavorText:
        "There is a blind place at the back of the great seat where the light of the pools does not fall — the one spot in the hall the rising god cannot see from her own altar, because it lies in the shadow of the very chair she means to take. The dead and the half-made do not gather where the Throne itself cuts off the light. Sit in the cold of it a while, with the empty seat at your back and nothing performing, and let the long climb leave your shoulders.",
    },
  ] as ChapterRoomFlavor[],
  shop: {
    title: 'The Last Quartermaster',
    flavorText:
      "Something that was a person once keeps a stall in the lee of the approach — a Child of Bhaal that climbed this far in some life before yours and chose, at the end, neither to ascend nor to die but to stay, to keep the gear of everyone who fell short laid out in neat rows for whoever comes next. It does not want coin to spend; there is nothing to spend it on at the foot of a god. It wants coin because counting the stock is the one mortal habit it has left, and it would rather take your measure across a trestle of dead climbers' steel than admit it has been here, alone, for longer than it can any longer feel.",
  } as ChapterRoomFlavor,
  bossDefId: 'melissan',
  boss: {
    title: 'The Throne of Bhaal',
    flavorText:
      "The hall ends at the Throne, and the Throne is empty, and the kind woman who walked beside you through every chapter of the nightmare is standing at the foot of it with the mask finally set down. Amelyssan the Blackhearted was Bhaal's highest priestess before he died, and she did not mourn her god so much as inventory him — a divinity rendered into a hundred-odd mortal vessels and scattered across the world to be reaped at leisure. The whole crisis was her harvest. Every death you died was a measure taken. Now, with the last of the essence steaming in pools around her, she turns to you with no anger at all, only the serene patience of a priestess at the final rite. \"You were always the largest of the offerings,\" she says, and the empty seat behind her begins, faintly, to fill. \"Thank you for carrying yourself all this way to the altar. Be still now. There is a god to make of all of you, and I have waited so very long to be Him.\"",
    xpReward: 6800,
    goldReward: 950,
  },
} as const;

/**
 * Boss intel card for Chapter 14, shaped to {@link BossIntelCard} (the chapter
 * field is widened by the integration lane that wires this in; defined here as a
 * plain const so this file stays disjoint from bossIntel.ts). Coin cost follows
 * the super-linear `5·ch² + 20·ch` curve at ch 14: 5·196 + 20·14 = 1260.
 */
export const CHAPTER14_BOSS_INTEL = {
  bossDefId: 'melissan',
  chapter: 14,
  roomTitle: "A Climber's Last Camp",
  roomFlavor:
    "A worn pleat of the Pocket Plane where some Child of Bhaal stopped to think before the final steps, and never took them. Their gear is laid out with a strange care — a bedroll, a cold lamp, and pinned to the grey nothing of the wall a sheaf of notes in a hand that grew steadier the worse the truth got. The early pages are full of gratitude for a kind woman named Melissan. The middle pages cross her name out. The last page is only this, scored deep enough to tear the paper: SHE IS THE HARVEST. THE POOLS ARE US. AT THE THRONE YOUR OWN BLOOD STANDS UP — don't let the Slayer take the wheel. don't be still when she says be still. her heart is mortal until it isn't.",
  weakSpotResolution:
    "You read the dead climber's notes the way they were meant to be read. Amelyssan does not strike first — she stills first, lifting an open hand the way she must have lifted it over a thousand offerings, and the stilling is the snare. Knowing the verdict is the opener, you set your first cut for the half-beat before her hand comes up, while she still expects you, like all the rest, to be glad to be received.",
  battlePlanResolution:
    "You read the whole rite off the climber's pages: the murder that stops the heart first, to still you the way she has stilled every offering before you — then the pools drawn on to stand fresh fiends at her shoulder, and the god-scaled scepter in threes — and the moment past half when the mortal priestess is worn through and the thing she is becoming takes the field in her place. You climb the last steps with your mind braced against the stilling and your own name held close against the Slayer, your first strike already set for the gap before her hand lifts.",
  walkPastResolution:
    "You leave the climber's last camp as you found it and the warning unread, and step past the bedroll without slowing. Up at the Throne a kind, patient woman inclines her head, charmed, as though you have already agreed to be received. The bold take the altar on their own terms — and what the harvest sheds for you will weigh a touch heavier when the kind mask finally comes off and there is a god, or only a corpse, beneath it after all.",
  coinCost: 5 * 196 + 20 * 14,
} as const;
