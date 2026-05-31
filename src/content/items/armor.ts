import { ArmorSchema, type Armor } from '../../schemas/item';

export const LEATHER_ARMOR: Armor = ArmorSchema.parse({
  id: 'leather-armor',
  kind: 'armor',
  name: 'Leather Armor',
  category: 'light',
  baseAC: 11,
  cost: 10,
  rarity: 'common',
});

export const CHAIN_MAIL: Armor = ArmorSchema.parse({
  id: 'chain-mail',
  kind: 'armor',
  name: 'Chain Mail',
  category: 'heavy',
  baseAC: 16,
  strRequirement: 13,
  cost: 75,
  rarity: 'common',
});

export const SHIELD: Armor = ArmorSchema.parse({
  id: 'shield',
  kind: 'armor',
  name: 'Shield',
  category: 'shield',
  baseAC: 2,
  cost: 10,
  rarity: 'common',
});

export const STUDDED_LEATHER: Armor = ArmorSchema.parse({
  id: 'studded-leather',
  kind: 'armor',
  name: 'Studded Leather',
  category: 'light',
  baseAC: 12,
  cost: 45,
  rarity: 'common',
});

export const HALF_PLATE: Armor = ArmorSchema.parse({
  id: 'half-plate',
  kind: 'armor',
  name: 'Half Plate',
  category: 'medium',
  baseAC: 15,
  cost: 750,
  rarity: 'common',
});

// --- Wave-3 armour breadth --------------------------------------------------
// More bases across light / medium / heavy so the armour pool isn't three
// items deep. Heavy plate/splint sit above chain mail but are fighter-only and
// expensive — the affix roll, not the base AC, is the real upgrade.

export const PADDED_ARMOR: Armor = ArmorSchema.parse({
  id: 'padded-armor',
  kind: 'armor',
  name: 'Padded Armor',
  category: 'light',
  baseAC: 11,
  cost: 5,
  rarity: 'common',
});

export const HIDE_ARMOR: Armor = ArmorSchema.parse({
  id: 'hide-armor',
  kind: 'armor',
  name: 'Hide Armor',
  category: 'medium',
  baseAC: 12,
  cost: 10,
  rarity: 'common',
});

export const SCALE_MAIL: Armor = ArmorSchema.parse({
  id: 'scale-mail',
  kind: 'armor',
  name: 'Scale Mail',
  category: 'medium',
  baseAC: 14,
  cost: 50,
  rarity: 'common',
});

export const BREASTPLATE: Armor = ArmorSchema.parse({
  id: 'breastplate',
  kind: 'armor',
  name: 'Breastplate',
  category: 'medium',
  baseAC: 14,
  cost: 400,
  rarity: 'common',
});

export const RING_MAIL: Armor = ArmorSchema.parse({
  id: 'ring-mail',
  kind: 'armor',
  name: 'Ring Mail',
  category: 'heavy',
  baseAC: 14,
  cost: 30,
  rarity: 'common',
});

export const SPLINT_ARMOR: Armor = ArmorSchema.parse({
  id: 'splint-armor',
  kind: 'armor',
  name: 'Splint Armor',
  category: 'heavy',
  baseAC: 17,
  strRequirement: 15,
  cost: 200,
  rarity: 'common',
});

export const PLATE_ARMOR: Armor = ArmorSchema.parse({
  id: 'plate-armor',
  kind: 'armor',
  name: 'Plate Armor',
  category: 'heavy',
  baseAC: 18,
  strRequirement: 15,
  cost: 1500,
  rarity: 'common',
});

export const ALL_ARMOR: Armor[] = [
  LEATHER_ARMOR,
  CHAIN_MAIL,
  SHIELD,
  STUDDED_LEATHER,
  HALF_PLATE,
  PADDED_ARMOR,
  HIDE_ARMOR,
  SCALE_MAIL,
  BREASTPLATE,
  RING_MAIL,
  SPLINT_ARMOR,
  PLATE_ARMOR,
];
