import { ArmorSchema, type Armor } from '../../schemas/item';

export const LEATHER_ARMOR: Armor = ArmorSchema.parse({
  id: 'leather-armor',
  kind: 'armor',
  name: 'Leather Armor',
  category: 'light',
  baseAC: 11,
  stealthDisadvantage: false,
  weight: 10,
  cost: 10,
  rarity: 'common',
  attunement: false,
});

export const CHAIN_MAIL: Armor = ArmorSchema.parse({
  id: 'chain-mail',
  kind: 'armor',
  name: 'Chain Mail',
  category: 'heavy',
  baseAC: 16,
  stealthDisadvantage: true,
  strRequirement: 13,
  weight: 55,
  cost: 75,
  rarity: 'common',
  attunement: false,
});

export const SHIELD: Armor = ArmorSchema.parse({
  id: 'shield',
  kind: 'armor',
  name: 'Shield',
  category: 'shield',
  baseAC: 2,
  stealthDisadvantage: false,
  weight: 6,
  cost: 10,
  rarity: 'common',
  attunement: false,
});

export const STUDDED_LEATHER: Armor = ArmorSchema.parse({
  id: 'studded-leather',
  kind: 'armor',
  name: 'Studded Leather',
  category: 'light',
  baseAC: 12,
  stealthDisadvantage: false,
  weight: 13,
  cost: 45,
  rarity: 'common',
  attunement: false,
});

export const HALF_PLATE: Armor = ArmorSchema.parse({
  id: 'half-plate',
  kind: 'armor',
  name: 'Half Plate',
  category: 'medium',
  baseAC: 15,
  stealthDisadvantage: true,
  weight: 40,
  cost: 750,
  rarity: 'common',
  attunement: false,
});

export const CLOAK_OF_FAERUN: Armor = ArmorSchema.parse({
  id: 'cloak-of-faerun',
  kind: 'armor',
  name: 'Cloak of Faerûn',
  category: 'light',
  baseAC: 13,
  stealthDisadvantage: false,
  weight: 2,
  cost: 420,
  rarity: 'uncommon',
  attunement: true,
  description:
    'A dark green travelling cloak woven with a long thread of silver around the hem. The silver does the work of armour without the weight — provided the wearer\'s soul has shaken hands with it first. Light armour: AC 13 + Dex. Soul-bound — claims an attunement slot.',
});

export const ALL_ARMOR: Armor[] = [
  LEATHER_ARMOR,
  CHAIN_MAIL,
  SHIELD,
  STUDDED_LEATHER,
  HALF_PLATE,
  CLOAK_OF_FAERUN,
];
