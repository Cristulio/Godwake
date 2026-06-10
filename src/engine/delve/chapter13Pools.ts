import type { RoomMonster } from '../../types/delve';

/**
 * Chapter 13 · "The Last of the Five" encounter pools. Mirrors chapter9Pools —
 * pooled compositions for each combat slot in the hunt for the last of the Five,
 * the rival Slainkin whose deaths feed the survivor. The road runs through two
 * canonical strongholds at once: Szendra's Enclave, the drow city carved in rock
 * and riddled with her petrified kin posed mid-ambush, and the storm-charged deep
 * caverns of Korvazel's Lair, filled end to end with the half-blue-dragon's brood.
 *
 * Theme: the held ambush and the breeding storm. Szendra keeps her halls by
 * patience — statuary that wakes, faithful that mend, a matron certain the rock
 * will take you before you reach her seat. Korvazel keeps his by force — wyrmlings
 * and drakes and half-dragon reavers, lightning in every throat, all of it sired
 * by the great cobalt wyrm at the bottom. Mechanically the chapter leans on hold,
 * blind, lightning, and reach, escalating a clear band past Chapter 9: warmups
 * CR 11, early-mid CR 12, mid CR 13, elite CR 15 (Szendra), boss (Korvazel) CR 16.
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
    title: 'The Statue That Was Waiting',
    flavorText:
      'The carved gallery runs grey and silent, drow figures posed mid-stride along its length like the ornament of a vain house. You pass one too close and feel the stone go warm under your shadow — and the crust sheds in sheets as the petrified ambusher finishes, a hundred years late and entirely unhurried, the lunge Szendra froze it halfway through.',
    monsters: [{ defId: 'petrified-ambusher', count: 1 }],
    xpReward: 1680,
    goldReward: 128,
  },
  {
    title: 'A Croak in the Wet Dark',
    flavorText:
      'The floor slopes down to standing water and the air turns to brine and rot. A kuo-toa deepguard rises out of the shallows with a barbed harpoon already drawn back, croaking a drowned name that means Korvazel and means god and means the same thing to the fish-folk. It casts the net first. It always casts the net first.',
    monsters: [{ defId: 'kuo-toa-deepguard', count: 1 }],
    xpReward: 1690,
    goldReward: 130,
  },
  {
    title: 'Two Off Their Pedestals',
    flavorText:
      'Two of the grey figures crack at once, a pace apart, the stone falling off them in the same breath — Szendra sets her ambushers in pairs where the gallery narrows, so that the one you turn from sets its hands on you for the one you turn toward. Neither hurries. Neither has to.',
    monsters: [{ defId: 'petrified-ambusher', count: 2, displayPrefix: 'Ambusher' }],
    xpReward: 1700,
    goldReward: 126,
  },
  {
    title: 'The Stone and the Net',
    flavorText:
      'A petrified ambusher wakes off the wall while a kuo-toa deepguard wades up from the water behind you — the enclave and the lair meeting here at the seam, stone hands to pin you and a sticky net to foul you, each of them buying the other the half-beat it needs.',
    monsters: [
      { defId: 'petrified-ambusher', count: 1 },
      { defId: 'kuo-toa-deepguard', count: 1 },
    ],
    xpReward: 1720,
    goldReward: 132,
  },
  {
    title: 'A Brace of the Deepguard',
    flavorText:
      'Two kuo-toa deepguards rise together out of the flooded gallery, harpoons crossed, croaking their god-name in ragged unison. They fight the way the fish-folk pray — all at once, past argument, dragging on the lines the moment the barbs set to haul you down to the water where they are sure of you.',
    monsters: [{ defId: 'kuo-toa-deepguard', count: 2, displayPrefix: 'Deepguard' }],
    xpReward: 1710,
    goldReward: 130,
  },
  {
    title: 'The Gallery Wakes',
    flavorText:
      'Three of the grey figures crack along the gallery at once, a slow rolling collapse of stone down the length of the hall as the matron, somewhere ahead, decides you are worth more than one. Three lunges finishing a century late, three pairs of half-stone hands reaching to hold you for the next of them.',
    monsters: [{ defId: 'petrified-ambusher', count: 3, displayPrefix: 'Ambusher' }],
    xpReward: 1730,
    goldReward: 124,
  },
];

export const EARLY_MID_POOL: EncounterEntry[] = [
  {
    title: 'Something Small and Charged',
    flavorText:
      'The dark up ahead is crackling faintly, and the crackle has teeth. A blue wyrmling uncoils off a warm ledge, Korvazel\'s own young, the static already arcing blue along its jaws before it strikes — small enough to call young, and lightning enough that the smallness does not help you.',
    monsters: [{ defId: 'blue-wyrmling', count: 1 }],
    xpReward: 2220,
    goldReward: 162,
  },
  {
    title: 'The Light Goes Out',
    flavorText:
      'A drow voice speaks one word ahead of you and the gallery drops into a darkness no torch will answer. Out of it comes Szendra\'s handmaiden, war-priestess of the Spider Queen, the venom-scourge wet and writhing in a hand you cannot see — dousing the light so the next lash arrives out of nothing.',
    monsters: [{ defId: 'sendai-handmaiden', count: 1 }],
    xpReward: 2230,
    goldReward: 166,
  },
  {
    title: 'The Brood and the Light-Killer',
    flavorText:
      'A blue wyrmling snaps down the gallery while a handmaiden works the dark behind it — the young dragon to keep you turning with its charged jaws, the priestess to put out the light and mend whatever you manage to wound. The lair\'s storm and the enclave\'s faith, hunting the same intruder.',
    monsters: [
      { defId: 'blue-wyrmling', count: 1 },
      { defId: 'sendai-handmaiden', count: 1 },
    ],
    xpReward: 2270,
    goldReward: 170,
  },
  {
    title: 'A Clutch of Wyrmlings',
    flavorText:
      'Two of Korvazel\'s young come down the warm dark together, jaws crackling, too quick and too eager to bother with cunning. They do not coordinate. They do not need to. They are lightning with teeth, twice over, and they have been hungry in the dark a long time.',
    monsters: [{ defId: 'blue-wyrmling', count: 2, displayPrefix: 'Wyrmling' }],
    xpReward: 2250,
    goldReward: 164,
  },
  {
    title: 'The Handmaiden and Her Statues',
    flavorText:
      'A handmaiden holds the gallery with a petrified ambusher already cracking awake at her side, and more grey figures behind her to call on — she douses the light, the stone hands close out of the dark, and the Spider Queen\'s favour knits shut whatever you land on either. Kill the priestess, or the hall keeps refilling around you.',
    monsters: [
      { defId: 'sendai-handmaiden', count: 1 },
      { defId: 'petrified-ambusher', count: 1 },
    ],
    xpReward: 2290,
    goldReward: 172,
  },
  {
    title: 'The Wyrmling and the Deepguard',
    flavorText:
      'A blue wyrmling and a kuo-toa deepguard work the flooded gallery together — the net to foul you in place and the charged jaws to close while you are fouled. The fish-folk croak their god-name as the young dragon strikes, certain they are watching divinity feed.',
    monsters: [
      { defId: 'blue-wyrmling', count: 1 },
      { defId: 'kuo-toa-deepguard', count: 1 },
    ],
    xpReward: 2280,
    goldReward: 168,
  },
];

export const MID_POOL: EncounterEntry[] = [
  {
    title: 'A Tongue of Lightning',
    flavorText:
      'Something the size of a warhorse fills the middle gallery, scaled blue-black and humming. The stormscale drake lashes before you have the measure of it, a forked tongue snapping out longer than any tongue should, crackling, the current arcing to the nearest steel you carry. There is no cunning in it. There does not need to be.',
    monsters: [{ defId: 'stormscale-drake', count: 1 }],
    xpReward: 2820,
    goldReward: 198,
  },
  {
    title: 'A Son of the Brood-Sire',
    flavorText:
      'A half-dragon reaver stands the heart-gallery like a household guard, broad and blue-scaled, a greataxe edged in cobalt scale-metal already swinging in a measured two-stroke. It carries its father\'s storm in its veins and a drilled soldier\'s discipline in its hands, and it means to be at Korvazel\'s side when he becomes a god.',
    monsters: [{ defId: 'half-dragon-reaver', count: 1 }],
    xpReward: 2840,
    goldReward: 202,
  },
  {
    title: 'The Reaver and Its Hound',
    flavorText:
      'A half-dragon reaver works the front of the gallery with a stormscale drake loosed at its flank — the son to fix you in a soldier\'s cadence, the drake to lash out of reach while you are busy with the axe. The discipline and the dumb lightning, set against you together.',
    monsters: [
      { defId: 'half-dragon-reaver', count: 1 },
      { defId: 'stormscale-drake', count: 1 },
    ],
    xpReward: 2880,
    goldReward: 206,
  },
  {
    title: 'A Pair of Drakes',
    flavorText:
      'Two stormscale drakes prowl the gallery, big and dim and humming with charge, and the moment they catch your scent they answer with a paired thunderclap roar that scatters the nerve. They will chase a fleeing thing to exhaustion out of pure instinct. The only way past them is through.',
    monsters: [{ defId: 'stormscale-drake', count: 2, displayPrefix: 'Drake' }],
    xpReward: 2860,
    goldReward: 200,
  },
  {
    title: 'The Reaver and the Wyrmling',
    flavorText:
      'A half-dragon reaver holds the gallery with one of its father\'s wyrmlings darting at its side — the measured greataxe to break your guard and the charged young jaws to dart in through the break. The brood guards its lord the way a household guards its lord, in ranks, by blood.',
    monsters: [
      { defId: 'half-dragon-reaver', count: 1 },
      { defId: 'blue-wyrmling', count: 1 },
    ],
    xpReward: 2870,
    goldReward: 204,
  },
  {
    title: 'The Drake and the Light-Killer',
    flavorText:
      'A stormscale drake lashes out of reach while a handmaiden douses the gallery to a darkness it does not need eyes to fight in — the storm and the enclave folding around you at once, the current arcing from a place you cannot see while the priestess mends the drake from the dark. Find the killer you cannot see, or be lashed blind.',
    monsters: [
      { defId: 'stormscale-drake', count: 1 },
      { defId: 'sendai-handmaiden', count: 1 },
    ],
    xpReward: 2890,
    goldReward: 208,
  },
  {
    title: 'Two Reavers',
    flavorText:
      'Two half-dragon reavers take the heart-gallery together, greataxes coming in the same disciplined cadence from two sides, the storm in their veins riding down both edges. They are Korvazel\'s sons and they fight like it — no wasted motion, no fear, and no intention of letting you reach their father.',
    monsters: [{ defId: 'half-dragon-reaver', count: 2, displayPrefix: 'Reaver' }],
    xpReward: 2880,
    goldReward: 204,
  },
];

export const ELITE_POOL: EncounterEntry[] = [
  {
    title: 'The Matron on Her Throne of Kin',
    flavorText:
      'The galleries open onto a great seat carved from petrified drow, and on it sits Szendra — one of the last of the Five, a Slainkin matron who has ruled by patience where her siblings ruled by force. She does not rise at once. She watches you cross the floor with the certainty of a woman whose whole stronghold is one held ambush, and when she lifts a ringed hand the nearest of her statues begins to crack.',
    monsters: [{ defId: 'sendai', count: 1 }],
    xpReward: 3780,
    goldReward: 258,
  },
  {
    title: 'Szendra and Her First Waking',
    flavorText:
      'Szendra already has one of her stone-set kin cracking awake at the foot of the throne, the first of however many she decides you are worth. The venom-mace comes in its cold two-stroke while the petrified ambusher steps down off its pedestal to take you from the side. Two clocks, and the one you cannot stop by breaking the matron.',
    monsters: [
      { defId: 'sendai', count: 1 },
      { defId: 'petrified-ambusher', count: 1 },
    ],
    xpReward: 3820,
    goldReward: 264,
  },
  {
    title: 'Szendra and Her Handmaiden',
    flavorText:
      'Szendra keeps her throne while a handmaiden works the dark around it, dousing the light so the matron\'s mace falls out of a blackness you cannot read, and calling the Spider Queen\'s favour down on the matron each time you draw blood. Fell the priestess and fight Szendra in the light, or fight them both in the dark and lose her in it.',
    monsters: [
      { defId: 'sendai', count: 1 },
      { defId: 'sendai-handmaiden', count: 1 },
    ],
    xpReward: 3860,
    goldReward: 270,
  },
  {
    title: 'Szendra and the Reaver',
    flavorText:
      'The seam between the two strongholds runs right up to the throne: a half-dragon reaver out of Korvazel\'s brood stands the floor for Szendra, greataxe in its disciplined cadence, while the matron holds you with a word and wakes the stone behind you. The enclave\'s patience and the lair\'s storm, refilling the room faster than you can empty it.',
    monsters: [
      { defId: 'sendai', count: 1 },
      { defId: 'half-dragon-reaver', count: 1 },
    ],
    xpReward: 3900,
    goldReward: 274,
  },
  {
    title: 'The Matron in the Dark',
    flavorText:
      'A handmaiden floods the throne-hall with conjured darkness while a stormscale drake lashes blind through it and Szendra works the centre, untroubled, fighting in a blackness her kind were born to see through. You cannot find the matron, you cannot answer the drake, and the priestess mends them both from somewhere in the dark.',
    monsters: [
      { defId: 'sendai-handmaiden', count: 1 },
      { defId: 'stormscale-drake', count: 1 },
    ],
    xpReward: 3840,
    goldReward: 266,
  },
  {
    title: 'Szendra and the Deep-Faithful',
    flavorText:
      'Two kuo-toa deepguards have dragged themselves up from the flooded roads to keep the matron\'s floor, croaking their god-name even here, while Szendra holds her throne and wakes the gallery. The nets foul you, the stone closes, and the matron takes her time, certain the rock will have you long before her own hand needs to.',
    monsters: [
      { defId: 'sendai', count: 1 },
      { defId: 'kuo-toa-deepguard', count: 2, displayPrefix: 'Deepguard' },
    ],
    xpReward: 3920,
    goldReward: 276,
  },
];

/** Title + flavor for a non-combat Chapter 13 room (shrine / rest / shop). */
export interface ChapterRoomFlavor {
  title: string;
  flavorText: string;
}

/**
 * Ready-to-wire non-combat flavor for Chapter 13. Shaped to drop straight into
 * the `GODWAKE_CHAPTERS` `ChapterContent` entry in createDelve.ts (shrines /
 * rests / shop / boss + bossDefId), beside the pools, so the wiring re-authors
 * nothing.
 *
 * NOTE: there are no clean gods this deep into the hunt for the Five — the
 * "shrines" here are the unsettled places where the divine essence of the slain
 * Slainkin pools thick enough to touch: a seam where Szendra's frozen kin lie
 * thickest, and a scorched hollow where Korvazel's storm has burned the rock to
 * glass.
 */
export const CHAPTER13_FLAVOR = {
  chapter: 13 as const,
  prefix: 'c13',
  title: 'The Last of the Five',
  shrines: [
    {
      title: 'The Seam of Held Kin',
      flavorText:
        "A side-gallery where Szendra's petrified dead lie thickest, packed shoulder to shoulder and never woken — drow she froze and forgot, a whole century of them standing patient in the dark. The divine essence in the slain of the Five gathers in still places like this one, and here it is thick enough to lean into. Stand a moment among the unmoving and let the cold weight of what flows to the survivor settle into you. It is not comfort. It is a claim, being staked early.",
    },
    {
      title: 'Where the Storm Burned Through',
      flavorText:
        "A scorched hollow off the deep road where one of Korvazel's breaths once struck the wall and never stopped — the rock fused to black glass, the sand at its foot melted to lightning-trees that branch up the stone and crackle faintly still. The half-dragon's storm is the half-dragon's blood, and a little of it lingers here, loose and ownerless. Set your hand to the warm glass. Something of the wyrm's own charge runs into you, and for a while the lightning ahead will know you as kin.",
    },
  ] as ChapterRoomFlavor[],
  rests: [
    {
      title: 'A Drow Watch-Niche',
      flavorText:
        "A carved recess off the gallery where Szendra's living sentries once kept watch on the road in — a stone bench, a slit to the dark, a cold-lamp long burned out. The matron pulled her breathing guards back toward the throne an age ago and trusted the statues to the rest, so no one watches this niche now but the dead, and the dead do not report. Sit out of the gallery's line a while. The held ambush cannot spring on what it cannot see.",
    },
    {
      title: 'The Lair\'s Warm Lee',
      flavorText:
        "A pocket of the deep caverns the brood does not bother — too small for a drake to turn in, too far from the warm nests for a wyrmling to wander, the rock holding a low steady heat off Korvazel's own body somewhere below. The storm-charge that hums everywhere else in the lair goes quiet here, and the only sound is the great slow breathing of the thing you have come to kill, far down and not yet awake to you. Rest in the warm dark. It will not last.",
    },
  ] as ChapterRoomFlavor[],
  shop: {
    title: 'A Hoarder Among the Brood',
    flavorText:
      "Not every thing in Korvazel's lair worships him. In a side-cavern hung with stolen lamplight something keeps a hoard the way dragons are said to — a hunched, scaled, half-bred thing, too small to be a reaver and too clever to be a drake, that has spent the long years of the breeding pulling the good steel and the forgotten charms off everything the brood killed and never claimed. It does not love its sire. It loves the count of its pile, and it will trade from it for coin, because coin is one more kind of shining thing to keep.",
  } as ChapterRoomFlavor,
  bossDefId: 'abazigal',
  boss: {
    title: 'The Wyrm at the Bottom of the Dark',
    flavorText:
      "The caverns end in a vault that breathes. Coiled across the whole floor of it, scaled cobalt and crackling, is the last and the strongest of the Five — Korvazel, who claimed dragon blood and proved it by taking the half-dragon form and never once setting it down, until the man was gone and only the great storm-blooded wyrm remained. He is immune to the lightning that is the whole of his blood, and he means to be immune to death the same way: he knows, as you do, that the essence of the slain Five flows to the survivor, and he intends to be the one left standing. \"So,\" he says, and the word is thunder in the close rock, \"the runt of the Slain God's litter comes down to be a stepping-stone. Come closer, little kin. I have room in me for one more god.\"",
    xpReward: 5400,
    goldReward: 720,
  },
} as const;

/**
 * Pre-boss intel card for Korvazel, shaped to {@link BossIntelCard}. Chapter 13
 * sits past the typed 1-9 union the card currently widens to, so this is held
 * here beside the pools until integration widens the union and registers it in
 * bossIntel.ts. coinCost = 5·13² + 20·13 = 1105.
 */
export const CHAPTER13_BOSS_INTEL = {
  bossDefId: 'abazigal',
  chapter: 13,
  roomTitle: 'A Hoard-Thief\'s Scratched Tally',
  roomFlavor:
    "A niche off the deep road where some small scaled scavenger keeps its count, and among the coin and the stolen lamps it has scratched a tally into the wall — every thing of the brood it has watched go down the dark and not come back up, ranked by how long the screaming lasted. At the bottom, under a gouge meant for the sire himself, three lines pressed deep enough to crack the rock: he breathes the storm in a line, so do not stand in the line; he hits thrice for every once you do; and when you have hurt him enough that he forgets to be a dragon, that is when he is most a god — do not believe the fight is won because the wyrm is bleeding.",
  weakSpotResolution:
    "You read the thief's tally the way it was meant to be read. Korvazel leads with the bite-and-claws over the reach of any blade you carry, and the breath comes after, telegraphed by the light kindling under his scales. Knowing the order, you set your opening for the half-beat before his chest swells, while he still expects you to close.",
  battlePlanResolution:
    "You read the whole tally and map the wyrm off it: the reach-bite first, then the storm loosed in a single line you can step out of if you watch for the kindling, the threefold flurry that overwhelms rather than trades, and the moment past half when he sheds the dragon's patience and the god in his blood fights hardest. You walk into the breathing vault with your line of retreat already chosen and your first strike set for the gap before the storm.",
  walkPastResolution:
    "You leave the thief to its count and step past the tally without slowing. Far down in the dark the great slow breathing changes, just slightly, as something that thinks itself a god notes the bold coming on its own terms. The essence of the Five rewards the unflinching — what Korvazel sheds will weigh a touch heavier when the wyrm at the bottom of the dark finally stops breathing.",
  coinCost: 5 * 13 * 13 + 20 * 13,
} as const;
