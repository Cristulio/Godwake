import { MonsterSchema, type Monster } from '../../schemas/monster';

export const SKELETON: Monster = MonsterSchema.parse({
  id: 'skeleton',
  name: 'Skeleton',
  cr: '1/4',
  size: 'medium',
  creatureType: 'undead',
  ac: 13,
  maxHp: 18,
  speed: 30,
  abilityScores: { str: 10, dex: 14, con: 15, int: 6, wis: 8, cha: 5 },
  passivePerception: 9,
  actions: [
    {
      kind: 'attack',
      name: 'Rusted Shortsword',
      attackBonus: 5,
      damage: '1d8+2',
      damageType: 'piercing',
      reach: 5,
      description: 'A pitted blade still wedged in the bones of one of the master\'s old subjects.',
    },
  ],
  vulnerabilities: ['bludgeoning'],
  immunities: ['poison'],
  flavorText:
    'A husk reanimated by the mage\'s work. The empty sockets fix on you and the jaw clicks open, as if testing a vowel it almost remembers.',
});
