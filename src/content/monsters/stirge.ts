import { MonsterSchema, type Monster } from '../../schemas/monster';

export const STIRGE: Monster = MonsterSchema.parse({
  id: 'stirge',
  name: 'Stirge',
  cr: '1/8',
  size: 'tiny',
  creatureType: 'beast',
  ac: 14,
  maxHp: 5,
  speed: 10,
  abilityScores: { str: 4, dex: 16, con: 11, int: 2, wis: 8, cha: 6 },
  passivePerception: 9,
  actions: [
    {
      kind: 'attack',
      name: 'Blood Drain',
      attackBonus: 5,
      damage: '1d4+3',
      damageType: 'piercing',
      reach: 5,
      description:
        'The stirge fixes its proboscis to soft flesh and drinks. The puncture is shallow but it will not let go.',
    },
  ],
  flavorText:
    'A bat-bodied insect the size of a goose, with a needle proboscis longer than its torso. The dungeon\'s ceilings are thick with them — silent until they drop.',
});
