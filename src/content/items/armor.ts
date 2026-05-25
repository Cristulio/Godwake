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

export const ALL_ARMOR: Armor[] = [LEATHER_ARMOR, CHAIN_MAIL, SHIELD];
