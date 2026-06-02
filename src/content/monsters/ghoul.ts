import { MonsterSchema, type Monster } from '../../schemas/monster';

export const GHOUL: Monster = MonsterSchema.parse({
  id: 'ghoul',
  name: 'Ghoul',
  cr: '1',
  size: 'medium',
  creatureType: 'undead',
  ac: 12,
  maxHp: 26,
  speed: 30,
  abilityScores: { str: 13, dex: 15, con: 10, int: 7, wis: 10, cha: 6 },
  passivePerception: 10,
  immunities: ['poison'],
  actions: [
    {
      kind: 'attack',
      name: 'Filthy Claws',
      attackBonus: 5,
      damage: '1d8+3',
      damageType: 'slashing',
      reach: 5,
      description:
        'The ghoul rakes with split nails caked in something the dungeon would rather not name. Each scrape stings long after the cut closes.',
    },
  ],
  flavorText:
    'It was a person once. The skin is grey and rope-tight over the bones; the jaw is unhinged from too many bites. It smells of rotted apples and old grease.',
});
