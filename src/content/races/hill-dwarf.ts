import { RaceSchema, type Race } from '../../schemas/race';

export const HILL_DWARF: Race = RaceSchema.parse({
  id: 'hill-dwarf',
  name: 'Hill Dwarf',
  abilityScoreBonuses: {
    str: 0,
    dex: 0,
    con: 2,
    int: 0,
    wis: 1,
    cha: 0,
  },
  speed: 25,
  validClasses: ['fighter', 'wizard', 'rogue', 'barbarian', 'ranger', 'druid'],
  bonusHpPerLevel: 1,
  features: [
    {
      id: 'hill-dwarf-toughness',
      name: 'Dwarven Toughness',
      description:
        'Stone-blooded, axe-handed, suspicious of magic and salt-water alike. Your hit point maximum increases by 1 for every character level.',
    },
  ],
});
