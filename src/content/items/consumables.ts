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
    'A flat-tasting tincture in a clay phial. Drink to shrug off poison damage for the rest of this combat. Tastes of chalk and bitterness.',
});

export const POTION_OF_HEROISM: Consumable = ConsumableSchema.parse({
  id: 'potion-of-heroism',
  kind: 'consumable',
  name: 'Potion of Heroism',
  effect: 'heal',
  healDice: '3d6+6',
  cost: 180,
  weight: 0.5,
  rarity: 'uncommon',
  actionCost: 'action',
  description:
    'A pale gold liquid that smells of beaten copper and pipe-smoke. The label, in a hand that has worn off in places, calls it a draught of valour — drink before the fight, walk straighter into it. Restores 3d6+6 hit points.',
});

export const SCROLL_OF_HEALING_WORD: Consumable = ConsumableSchema.parse({
  id: 'scroll-of-healing-word',
  kind: 'consumable',
  name: 'Scroll of Healing Word',
  effect: 'heal',
  healDice: '2d4+3',
  cost: 90,
  weight: 0.1,
  rarity: 'common',
  actionCost: 'bonus',
  description:
    'A strip of vellum copied in a hurried, priestly hand — a single word of Lathander\'s mercy, traced once and gone after the speaking. Quicker than a potion: a breath, not a swallow. Bonus action; restores 2d4+3 hit points.',
});

export const ALL_CONSUMABLES: Consumable[] = [
  POTION_OF_HEALING,
  POTION_OF_GREATER_HEALING,
  ANTITOXIN,
  POTION_OF_HEROISM,
  SCROLL_OF_HEALING_WORD,
];
