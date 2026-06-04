import { ConsumableSchema, type Consumable } from '../../schemas/item';

export const POTION_OF_HEALING: Consumable = ConsumableSchema.parse({
  id: 'potion-of-healing',
  kind: 'consumable',
  name: 'Potion of Healing',
  effect: 'heal',
  healDice: '2d4+2',
  cost: 50,
  rarity: 'common',
  actionCost: 'bonus',
  description:
    'A small glass vial of red-gold liquid. Restores 2d4+2 hit points. Smells faintly of cinnamon and iron. Quaffed in a heartbeat — a bonus action.',
});

export const POTION_OF_GREATER_HEALING: Consumable = ConsumableSchema.parse({
  id: 'potion-of-greater-healing',
  kind: 'consumable',
  name: 'Potion of Greater Healing',
  effect: 'heal',
  healDice: '4d4+4',
  cost: 150,
  rarity: 'uncommon',
  actionCost: 'bonus',
  description:
    'A larger vial than the common draught — the red is deeper, almost black, and it carries the faint scent of cloves. Restores 4d4+4 hit points. A swift draught — a bonus action.',
});

export const ANTITOXIN: Consumable = ConsumableSchema.parse({
  id: 'antitoxin',
  kind: 'consumable',
  name: 'Antitoxin',
  effect: 'utility',
  cost: 50,
  rarity: 'common',
  actionCost: 'bonus',
  description:
    'A flat-tasting tincture in a clay phial. Drink to shrug off poison damage for the rest of this combat. Tastes of chalk and bitterness. Downed in a heartbeat — a bonus action.',
});

export const POTION_OF_HEROISM: Consumable = ConsumableSchema.parse({
  id: 'potion-of-heroism',
  kind: 'consumable',
  name: 'Potion of Vitality',
  effect: 'heal',
  healDice: '1d4+2',
  regenPerTurnDice: '1d6+3',
  regenTurns: 2,
  cost: 180,
  rarity: 'uncommon',
  actionCost: 'bonus',
  description:
    'A pale gold tonic that smells of beaten copper and pipe-smoke. It mends slow — a first thin warmth as it goes down, then the blood keeps knitting on its own over the moments that follow as the draught settles deep. Sipped, not slammed — a bonus action.',
});

export const ALL_CONSUMABLES: Consumable[] = [
  POTION_OF_HEALING,
  POTION_OF_GREATER_HEALING,
  ANTITOXIN,
  POTION_OF_HEROISM,
];
