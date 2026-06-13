import type { RoomMonster } from '../../types/delve';

/**
 * Stormhaven / Chapter 2 encounter pools. Mirrors the chapter1Pools layout but
 * raised in CR — slot 1 is the alley warmup, slot 3 the counting-house
 * mid-fight, slot 5 the cowled-patrol mid-elite, slot 7 the rooftop-chase
 * pre-boss. The fixed boss is The Magistrate in chapter2Rooms.
 */

export interface EncounterEntry {
  title: string;
  flavorText: string;
  monsters: RoomMonster[];
  /** XP awarded for clearing this specific composition. */
  xpReward: number;
  /** Optional gold bonus dropped on victory. */
  goldReward?: number;
}

export const WARMUP_POOL: EncounterEntry[] = [
  {
    title: 'A Back Alley off the Trade Road',
    flavorText:
      "Two figures break from a doorway, daggers already drawn — a robed fanatic with the cult-circle bloodied at his collar, and a kobold thug paid for the morning's work.",
    monsters: [{ defId: 'cult-fanatic', count: 1 }, { defId: 'kobold', count: 1 }],
    xpReward: 165,
    goldReward: 12,
  },
  {
    title: 'The Customs Gate',
    flavorText:
      "A cuirassier of one of the slaver houses bars the way, mace on his shoulder, half-bored. He doesn't even raise his voice. He doesn't have to.",
    monsters: [{ defId: 'slaver-cuirassier', count: 1 }],
    xpReward: 160,
    goldReward: 18,
  },
  {
    title: 'A Hobgoblin and His Knife',
    flavorText:
      "A hobgoblin mercenary in Stormhaven livery stands at the corner with a robed cult-knife at his elbow — paid by different masters, agreed about the morning. The hobgoblin nods once; the cultist moves first.",
    monsters: [
      { defId: 'hobgoblin', count: 1 },
      { defId: 'cult-fanatic', count: 1 },
    ],
    xpReward: 150,
  },
  {
    title: 'A Shadow Between Lanterns',
    flavorText:
      "Something tall and thin uncoils from the wall where no wall casts a shadow. The lamplight goes around it. A kobold at its heel has been paid a copper to make noise — it does not understand what it is running beside.",
    monsters: [{ defId: 'shadow', count: 1 }, { defId: 'kobold', count: 1 }],
    xpReward: 165,
    goldReward: 8,
  },
  {
    title: 'The Slaver Kennel',
    flavorText:
      "A shadow-hound slips its kobold handler's grip and pads down the alley. The handler scrambles after, knife out, furious that you've seen either of them.",
    monsters: [{ defId: 'shadow-hound', count: 1 }, { defId: 'kobold', count: 1 }],
    xpReward: 165,
    goldReward: 10,
  },
  {
    title: 'A Bandit Lookout',
    flavorText:
      "A bandit-captain in a black coat leans on a doorpost. He sees you at the same moment you see him. He does not call for help — he is the help, paid by the morning.",
    monsters: [{ defId: 'bandit-captain', count: 1 }],
    xpReward: 170,
    goldReward: 22,
  },
  {
    title: 'The Coffle-Road',
    flavorText:
      "A slaver-house lash-captain stands in the lane with ten feet of barbed leather already uncoiled. He cracks it once, a hand-span from your ear — not to strike, yet, but to remind you what you are to him.",
    monsters: [{ defId: 'lash-captain', count: 1 }],
    xpReward: 175,
    goldReward: 18,
  },
];

export const EARLY_MID_POOL: EncounterEntry[] = [
  {
    title: 'The Counting House Foyer',
    flavorText:
      "A slaver cuirassier stands at the desk like he owns it — and he does today. A robed cult-knife behind him keeps one hand on the ledger your master signed at a page you weren't supposed to see.",
    monsters: [
      { defId: 'slaver-cuirassier', count: 1 },
      { defId: 'cult-fanatic', count: 1 },
    ],
    xpReward: 260,
    goldReward: 20,
  },
  {
    title: 'The Cult Cell',
    flavorText:
      "Three robed figures circle in a low chamber, knife-points already wet. Whatever they were doing here, they're glad to put it down to greet you instead.",
    monsters: [{ defId: 'cult-fanatic', count: 2, displayPrefix: 'Fanatic' }],
    xpReward: 250,
    goldReward: 14,
  },
  {
    title: 'A Hobgoblin Picket',
    flavorText:
      "A hobgoblin in scavenged Stormhaven colors stands with a cuirassier, professional and unhurried. The hobgoblin gives the order; the slaver moves.",
    monsters: [
      { defId: 'hobgoblin', count: 1 },
      { defId: 'slaver-cuirassier', count: 1 },
    ],
    xpReward: 260,
    goldReward: 16,
  },
  {
    title: 'The Lamp-Yard',
    flavorText:
      "A shadow detaches from the wall above the courtyard lanterns. A cult-knife steps out of the dark to keep it company. The two of them move like they've worked together before.",
    monsters: [
      { defId: 'shadow', count: 1 },
      { defId: 'cult-fanatic', count: 1 },
    ],
    xpReward: 240,
  },
  {
    title: 'The Bandit Captain\'s Hold',
    flavorText:
      "A black-coated captain stands in the middle of the lane with his rapier already drawn. The two cultists at his shoulders look like the kind of help you hire for an afternoon and never pay.",
    monsters: [
      { defId: 'bandit-captain', count: 1 },
      { defId: 'cult-fanatic', count: 1 },
    ],
    xpReward: 270,
    goldReward: 24,
  },
  {
    title: 'The Kennel-Gate',
    flavorText:
      "Two of the slaver-houses' nightwalkers slip the leash and come up the lane in silence. Their handler stays back in the doorway with the second leash still in his hand.",
    monsters: [
      { defId: 'shadow-hound', count: 1 },
      { defId: 'slaver-cuirassier', count: 1 },
    ],
    xpReward: 260,
    goldReward: 14,
  },
  {
    title: 'The Driving-Line',
    flavorText:
      "A lash-captain works the front of the line and a robed cult-knife the back. The whip-crack frightens the prey forward; the knife is waiting where the prey ends up.",
    monsters: [
      { defId: 'lash-captain', count: 1 },
      { defId: 'cult-fanatic', count: 1 },
    ],
    xpReward: 270,
    goldReward: 18,
  },
];

export const MID_POOL: EncounterEntry[] = [
  {
    title: 'The Cowled Patrol',
    flavorText:
      "A silver-masked Cowled enforcer walks the lane with two cuirassiers a step behind. He raises one gloved hand without looking at you — a polite warning, the only one you'll get.",
    monsters: [
      { defId: 'cowled-enforcer', count: 1 },
      { defId: 'slaver-cuirassier', count: 1 },
    ],
    xpReward: 360,
    goldReward: 22,
  },
  {
    title: 'The Graveyard Wall',
    flavorText:
      "Two shadows uncoil along the broken stone, hunger between them sharpened by something that has been dead longer than memory. They have been waiting for someone like you.",
    monsters: [{ defId: 'shadow', count: 2, displayPrefix: 'Shadow' }],
    xpReward: 320,
  },
  {
    title: 'The Cult Vigil',
    flavorText:
      "A fanatic chants over a kneeling hobgoblin sergeant bound at the wrist. The chant stops the second you cross the doorway. The sergeant gets up.",
    monsters: [
      { defId: 'cult-fanatic', count: 1 },
      { defId: 'hobgoblin', count: 1 },
    ],
    xpReward: 340,
    goldReward: 16,
  },
  {
    title: 'The Stockade Run',
    flavorText:
      "A cuirassier and a robed knife-bearer come through the gate at a controlled jog — paired up by a guild captain who drills the formation weekly.",
    monsters: [
      { defId: 'slaver-cuirassier', count: 1 },
      { defId: 'cult-fanatic', count: 1 },
    ],
    xpReward: 340,
    goldReward: 22,
  },
  {
    title: 'The Captain and the Hound',
    flavorText:
      "A black-coated bandit-captain stands in the lane with a shadow-hound straining at a chain in his other hand. He lets it go when he sees you. He does not draw — yet.",
    monsters: [
      { defId: 'bandit-captain', count: 1 },
      { defId: 'shadow-hound', count: 1 },
    ],
    xpReward: 370,
    goldReward: 28,
  },
  {
    title: 'The Lantern-Yard Patrol',
    flavorText:
      "A shadow and a slaver-cuirassier work the same yard in silence — the slaver in front to drive prey, the shadow behind to take whatever the slaver leaves alive.",
    monsters: [
      { defId: 'shadow', count: 1 },
      { defId: 'slaver-cuirassier', count: 1 },
    ],
    xpReward: 350,
    goldReward: 18,
  },
  {
    title: 'The Conjurer in the Counting-House',
    flavorText:
      "A Veiled Magus waits behind the desk and does not stand. A circle of cold fire opens at his shoulder, and something with wings folds itself out of it, already grinning. He will not duel you. He delegates.",
    monsters: [{ defId: 'cowled-conjurer', count: 1 }],
    xpReward: 360,
    goldReward: 24,
  },
  {
    title: 'The Warded Escort',
    flavorText:
      "A slaver-cuirassier stands a pace in front of a robed wardpriest. Every blow you land on the slaver sinks into a skin of grey light a half-second before it hits. The light is coming from her.",
    monsters: [
      { defId: 'cowled-wardpriest', count: 1 },
      { defId: 'slaver-cuirassier', count: 1 },
    ],
    xpReward: 360,
    goldReward: 20,
  },
];

export const ELITE_POOL: EncounterEntry[] = [
  {
    title: 'A Cowled Audit',
    flavorText:
      "A senior Cowled magus has been waiting for you — robe trim a shade lighter than the rest, mask polished to a mirror. A cuirassier stands at his elbow like a clerk who knows where the ledgers are kept. The magus would rather have processed you; bleed him pale and he stops being careful, and the air in front of his hands begins to fold.",
    monsters: [
      { defId: 'cowled-magus', count: 1 },
      { defId: 'slaver-cuirassier', count: 1 },
    ],
    xpReward: 460,
    goldReward: 28,
  },
  {
    title: 'The Twin Cowls',
    flavorText:
      "Two Veiled Court have come down the lane in unison — a magus a step ahead, an enforcer at his shoulder. They do not speak. They do not need to. Where one looks, the other does not; and when the magus is hurt enough to stop economising, the lane-light starts to lean toward his hands.",
    monsters: [
      { defId: 'cowled-magus', count: 1 },
      { defId: 'cowled-enforcer', count: 1 },
    ],
    xpReward: 480,
    goldReward: 24,
  },
  {
    title: 'The Black Carriage',
    flavorText:
      "The carriage has stopped in the middle of the street and disgorged a slaver cuirassier and something that may once have been a man — tall and thin and silent, the air going around it where it shouldn't.",
    monsters: [
      { defId: 'slaver-cuirassier', count: 1 },
      { defId: 'shadow', count: 1 },
    ],
    xpReward: 460,
    goldReward: 24,
  },
  {
    title: 'The Rooftop Chase',
    flavorText:
      "You catch them on the tiled roof above the Trade Road — a Cowled magus in a hurry, a hobgoblin lieutenant holding the line. The magus does not turn; he keeps moving and lobbing grey force back over his shoulder, and when you finally cut him he stops running and turns to settle it in one cast. The hobgoblin smiles.",
    monsters: [
      { defId: 'cowled-magus', count: 1 },
      { defId: 'hobgoblin', count: 1 },
    ],
    xpReward: 500,
    goldReward: 30,
  },
  {
    title: "The Bandit Captain's Brace",
    flavorText:
      "A bandit-captain has set himself at the lane's mouth with a slaver-overseer at his shoulder, whip already loose in the overseer's hand. They are paid in different coin by different masters, but they have agreed about today: the captain finds the openings, and the crack of the lash makes sure you flinch into them.",
    monsters: [
      { defId: 'bandit-captain', count: 1 },
      { defId: 'slaver-overseer', count: 1 },
    ],
    xpReward: 480,
    goldReward: 32,
  },
  {
    title: 'The Cowled Kennel-Master',
    flavorText:
      "A Cowled houndmaster in silver-trim robes walks the lane with a shadow-hound at heel. The hound is not chained. He does not look at it — he only opens his hand when the first one falls, and another seam of the dark detaches and lands running. Put him down or the kennel never empties.",
    monsters: [
      { defId: 'cowled-houndmaster', count: 1 },
      { defId: 'shadow-hound', count: 1 },
    ],
    xpReward: 470,
    goldReward: 26,
  },
  {
    title: 'The Conjurer and His Brute',
    flavorText:
      "A Cowled conjurer keeps a cuirassier between himself and the door, and binds a winged servitor the moment you cross it. Kill the brute and the imp keeps coming; kill the conjurer and the bindings unravel mid-air.",
    monsters: [
      { defId: 'cowled-conjurer', count: 1 },
      { defId: 'slaver-cuirassier', count: 1 },
    ],
    xpReward: 490,
    goldReward: 28,
  },
  {
    title: "The Wardpriest's Line",
    flavorText:
      "A hobgoblin in Stormhaven livery holds the lane while a wardpriest stands a step behind, two fingers raised. The hobgoblin should have died a round ago. The grey light keeps deciding otherwise.",
    monsters: [
      { defId: 'cowled-wardpriest', count: 1 },
      { defId: 'hobgoblin', count: 1 },
    ],
    xpReward: 470,
    goldReward: 26,
  },
];
