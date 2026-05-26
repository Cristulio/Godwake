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

export const ALL_CONSUMABLES: Consumable[] = [POTION_OF_HEALING];
