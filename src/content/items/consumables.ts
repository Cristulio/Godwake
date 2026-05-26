import { ConsumableSchema, type Consumable } from '../../schemas/item';

export const POTION_OF_HEALING: Consumable = ConsumableSchema.parse({
  id: 'potion-of-healing',
  kind: 'consumable',
  name: 'Potion of Healing',
  effect: 'heal',
  healDice: '2d4+2',
  cost: 50,
  weight: 0.5,
  rarity: 'common',
  actionCost: 'action',
  description:
    'A small glass vial of red-gold liquid. Drinking it restores 2d4+2 hit points. Smells faintly of cinnamon and iron.',
});

export const POTION_OF_GREATER_HEALING: Consumable = ConsumableSchema.parse({
  id: 'potion-of-greater-healing',
  kind: 'consumable',
  name: 'Potion of Greater Healing',
  effect: 'heal',
  healDice: '4d4+4',
  cost: 150,
  weight: 0.5,
  rarity: 'uncommon',
  actionCost: 'action',
  description:
    'A larger vial than the common draught — the red is deeper, almost black, and it carries the faint scent of cloves. Restores 4d4+4 hit points.',
});

export const ANTITOXIN: Consumable = ConsumableSchema.parse({
  id: 'antitoxin',
  kind: 'consumable',
  name: 'Antitoxin',
  effect: 'utility',
  cost: 50,
  weight: 0.5,
  rarity: 'common',
  actionCost: 'action',
  description:
    'A flat-tasting tincture in a clay phial. Gives advantage on saves against poison for one hour. Tastes of chalk and bitterness.',
});

export const ALL_CONSUMABLES: Consumable[] = [POTION_OF_HEALING, POTION_OF_GREATER_HEALING, ANTITOXIN];
