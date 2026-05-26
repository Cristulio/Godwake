import type { RoomMonster } from '../../types/delve';

/**
 * Athkatla / Chapter 2 encounter pools. Mirrors the chapter1Pools layout but
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
    title: 'A Back Alley off the Trade Way',
    flavorText:
      "Two figures break from a doorway, daggers already drawn — a robed fanatic with the cult-circle bloodied at his collar, and a thug paid for the morning's work.",
    monsters: [{ defId: 'cult-fanatic', count: 1 }],
    xpReward: 140,
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
    title: 'Hobgoblin Outriders',
    flavorText:
      "Two hobgoblin mercenaries in Athkatlan livery stand at the corner, watching the street. They turn together — disciplined, professional, contracted.",
    monsters: [{ defId: 'hobgoblin', count: 2, displayPrefix: 'Hobgoblin' }],
    xpReward: 150,
  },
  {
    title: 'A Shadow Between Lanterns',
    flavorText:
      "Something tall and thin uncoils from the wall where no wall casts a shadow. It does not blot out the lamplight — the lamplight goes around it.",
    monsters: [{ defId: 'shadow', count: 1 }],
    xpReward: 130,
  },
];

export const EARLY_MID_POOL: EncounterEntry[] = [
  {
    title: 'The Counting House Foyer',
    flavorText:
      "Two slaver cuirassiers stand at the desk like they own it — and they do today. The ledgers behind them have your master's hand at the bottom of a page you weren't supposed to see.",
    monsters: [{ defId: 'slaver-cuirassier', count: 2, displayPrefix: 'Cuirassier' }],
    xpReward: 280,
    goldReward: 22,
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
      "A hobgoblin in scavenged Athkatlan colors stands with a cuirassier, professional and unhurried. The hobgoblin gives the order; the slaver moves.",
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
      "Two fanatics chant over a kneeling third — a hobgoblin sergeant bound at the wrist. The chant stops the second you cross the doorway. The sergeant gets up.",
    monsters: [
      { defId: 'cult-fanatic', count: 2, displayPrefix: 'Fanatic' },
      { defId: 'hobgoblin', count: 1 },
    ],
    xpReward: 380,
    goldReward: 18,
  },
  {
    title: 'The Stockade Run',
    flavorText:
      "Two cuirassiers and a robed knife-bearer come through the gate at a controlled jog — the kind of formation a guild captain drills into a squad weekly.",
    monsters: [
      { defId: 'slaver-cuirassier', count: 2, displayPrefix: 'Cuirassier' },
      { defId: 'cult-fanatic', count: 1 },
    ],
    xpReward: 380,
    goldReward: 26,
  },
];

export const ELITE_POOL: EncounterEntry[] = [
  {
    title: 'A Cowled Audit',
    flavorText:
      "A senior Cowled enforcer has been waiting for you — robe trim a shade lighter than the rest, mask polished to a mirror. A pair of cuirassiers flank her like clerks.",
    monsters: [
      { defId: 'cowled-enforcer', count: 1 },
      { defId: 'slaver-cuirassier', count: 2, displayPrefix: 'Cuirassier' },
    ],
    xpReward: 500,
    goldReward: 32,
  },
  {
    title: 'The Twin Cowls',
    flavorText:
      "Two Cowled Wizards have come down the lane in unison. They do not speak. They do not need to. Where one looks, the other does not.",
    monsters: [{ defId: 'cowled-enforcer', count: 2, displayPrefix: 'Enforcer' }],
    xpReward: 480,
    goldReward: 24,
  },
  {
    title: 'The Black Carriage',
    flavorText:
      "The carriage has stopped in the middle of the street and disgorged a robed cultist, a slaver cuirassier, and something that may once have been a man, tall and thin and silent.",
    monsters: [
      { defId: 'cult-fanatic', count: 1 },
      { defId: 'slaver-cuirassier', count: 1 },
      { defId: 'shadow', count: 1 },
    ],
    xpReward: 520,
    goldReward: 28,
  },
  {
    title: 'The Rooftop Chase',
    flavorText:
      "You catch them on the tiled roof above the Trade Way — a Cowled Wizard in a hurry, a hobgoblin lieutenant holding the line. The wizard does not turn. The hobgoblin smiles.",
    monsters: [
      { defId: 'cowled-enforcer', count: 1 },
      { defId: 'hobgoblin', count: 1 },
    ],
    xpReward: 500,
    goldReward: 30,
  },
];
