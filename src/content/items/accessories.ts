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
  cost: number;
}): Accessory {
  return AccessorySchema.parse({
    kind: 'accessory',
    rarity: 'common',
    ...data,
  });
}

export const ALL_ACCESSORIES: Accessory[] = [
  accessory({ id: 'iron-ring', name: 'Iron Ring', accessorySlot: 'ring', cost: 30 }),
  accessory({ id: 'silver-ring', name: 'Silver Ring', accessorySlot: 'ring', cost: 35 }),
  accessory({ id: 'gold-ring', name: 'Gold Ring', accessorySlot: 'ring', cost: 45 }),
  accessory({ id: 'jade-amulet', name: 'Jade Amulet', accessorySlot: 'amulet', cost: 50 }),
  accessory({ id: 'bone-charm', name: 'Bone Charm', accessorySlot: 'amulet', cost: 45 }),
  accessory({ id: 'worn-belt', name: 'Worn Belt', accessorySlot: 'belt', cost: 25 }),
  accessory({ id: 'studded-girdle', name: 'Studded Girdle', accessorySlot: 'belt', cost: 35 }),
  accessory({ id: 'traveler-boots', name: "Traveler's Boots", accessorySlot: 'boots', cost: 25 }),
  accessory({ id: 'soft-boots', name: 'Soft Boots', accessorySlot: 'boots', cost: 35 }),
  accessory({ id: 'iron-helm', name: 'Iron Helm', accessorySlot: 'helm', cost: 40 }),
  accessory({ id: 'leather-cap', name: 'Leather Cap', accessorySlot: 'helm', cost: 25 }),
];
