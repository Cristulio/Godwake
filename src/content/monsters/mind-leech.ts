import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Mind Leech — Ch3 life-drainer. A palm-sized aberration that feeds on thought.
 * Demonstrates the `lifeDrain` rider on an attack: its psychic feed heals it for
 * half the damage it deals, so a long fight against one only gets longer. Low
 * HP — burst it down before it tops itself off on your skull.
 */
export const MIND_LEECH: Monster = MonsterSchema.parse({
  id: 'mind-leech',
  name: 'Mind Leech',
  cr: '3',
  size: 'small',
  creatureType: 'aberration',
  ac: 16,
  maxHp: 56,
  speed: 30,
  abilityScores: { str: 7, dex: 16, con: 13, int: 11, wis: 12, cha: 10 },
  passivePerception: 11,
  resistances: ['psychic'],
  actions: [
    {
      kind: 'attack',
      name: 'Psychic Feed',
      attackBonus: 7,
      damage: '2d8+5',
      damageType: 'psychic',
      reach: 5,
      lifeDrain: 0.5,
      description:
        'It fastens to the back of the neck and something behind your eyes goes thin and cold — and you watch the thing flush fuller as it drinks.',
    },
  ],
  flavorText:
    'A knot of grey muscle the size of a heart, all mouth on the underside. It does not eat flesh. It eats the part of you that decides to run, and it grows visibly fatter on every mouthful.',
});
