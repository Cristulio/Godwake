import { MonsterSchema, type Monster } from '../../schemas/monster';

export const GOBLIN: Monster = MonsterSchema.parse({
  id: 'goblin',
  name: 'Goblin',
  cr: '1/4',
  size: 'small',
  creatureType: 'humanoid (goblinoid)',
  ac: 15,
  maxHp: 7,
  speed: 30,
  abilityScores: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
  passivePerception: 9,
  actions: [
    {
      kind: 'attack',
      name: 'Scimitar',
      attackBonus: 4,
      damage: '1d6+2',
      damageType: 'slashing',
      reach: 5,
      description: 'A short curved blade, kept sharp.',
    },
    {
      kind: 'attack',
      name: 'Shortbow',
      attackBonus: 4,
      damage: '1d6+2',
      damageType: 'piercing',
      range: [80, 320],
      description: 'Stringy and ill-maintained but lethal at distance.',
    },
  ],
  flavorText:
    'Small, vicious, and clever in packs. Most that work the Mage\'s Cells were dragged here in the dark and kept on by the bargain of a full belly.',
});
