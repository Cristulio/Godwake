import { RaceSchema, type Race } from '../../schemas/race';

export const TIEFLING: Race = RaceSchema.parse({
  id: 'tiefling',
  name: 'Tiefling',
  abilityScoreBonuses: {
    str: 0,
    dex: 0,
    con: 0,
    int: 1,
    wis: 0,
    cha: 2,
  },
  speed: 30,
  validClasses: ['fighter', 'wizard', 'rogue', 'barbarian', 'ranger', 'monk'],
  damageResistances: ['fire', 'poison'],
  bonusHpPerLevel: 1,
  features: [
    {
      id: 'tiefling-hellish-resistance',
      name: 'Infernal Constitution',
      description:
        'Bloodlines marked by a pact older than memory. Horns, smoke, and a hellbound liver — you take half damage from fire and poison, and the infernal blood thickens the soul: +1 HP at every level.',
    },
  ],
});
