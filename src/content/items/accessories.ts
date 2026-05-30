import { AccessorySchema, type Accessory } from '../../schemas/item';

/**
 * Accessory bases — Wave-2 affix carriers. They have no combat stats of their
 * own (a ring IS its rolled affixes), are class-agnostic (every class can wear
 * them), and never appear in a starting kit: they only enter the game as rolled
 * drops/shop stock. The roll engine pulls bases from `ACCESSORY_BASE_IDS`.
 */

function accessory(data: {
  id: string;
  name: string;
  accessorySlot: Accessory['accessorySlot'];
  weight: number;
  cost: number;
}): Accessory {
  return AccessorySchema.parse({
    kind: 'accessory',
    rarity: 'common',
    attunement: false,
    ...data,
  });
}

export const ALL_ACCESSORIES: Accessory[] = [
  accessory({ id: 'iron-ring', name: 'Iron Ring', accessorySlot: 'ring', weight: 0, cost: 30 }),
  accessory({ id: 'silver-ring', name: 'Silver Ring', accessorySlot: 'ring', weight: 0, cost: 35 }),
  accessory({ id: 'jade-amulet', name: 'Jade Amulet', accessorySlot: 'amulet', weight: 1, cost: 50 }),
  accessory({ id: 'worn-belt', name: 'Worn Belt', accessorySlot: 'belt', weight: 1, cost: 25 }),
  accessory({ id: 'traveler-boots', name: "Traveler's Boots", accessorySlot: 'boots', weight: 1, cost: 25 }),
  accessory({ id: 'iron-helm', name: 'Iron Helm', accessorySlot: 'helm', weight: 3, cost: 40 }),
];
