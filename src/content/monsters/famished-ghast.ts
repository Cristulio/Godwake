import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Famished Ghast — Ch1 frenzied striker demonstrating the `multiattack` kind
 * (two claw rakes in a turn). A fast, fragile glass-cannon pack predator — kill
 * it fast or it kills faster.
 */
export const FAMISHED_GHAST: Monster = MonsterSchema.parse({
  id: 'famished-ghast',
  name: 'Famished Ghast',
  cr: '1',
  size: 'medium',
  creatureType: 'undead',
  ac: 13,
  maxHp: 20,
  speed: 30,
  abilityScores: { str: 14, dex: 15, con: 12, int: 7, wis: 10, cha: 6 },
  passivePerception: 10,
  immunities: ['poison'],
  actions: [
    {
      kind: 'multiattack',
      name: 'Frenzied Rake',
      attacks: 2,
      description:
        'It comes apart into pure hunger — both clawed hands working at once, faster than a dead thing has any right to move.',
    },
    {
      kind: 'attack',
      name: 'Ravening Claws',
      attackBonus: 5,
      damage: '1d6+3',
      damageType: 'slashing',
      reach: 5,
      description: 'Split nails, caked black, opening you in long shallow lines.',
    },
  ],
  flavorText:
    'Starved past the point a ghoul stops being patient. The ribs show through the grey skin and the jaw has unhinged itself from too many bites. When it smells you bleeding it stops pretending to stalk.',
});
