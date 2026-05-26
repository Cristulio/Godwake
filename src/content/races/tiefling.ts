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
  size: 'medium',
  validClasses: ['fighter', 'wizard', 'cleric', 'rogue', 'barbarian'],
  damageResistances: ['fire'],
  features: [
    {
      id: 'tiefling-hellish-resistance',
      name: 'Hellish Resistance',
      description:
        'Bloodlines marked by a pact older than memory. Horns and smoke and a long résumé — you take half damage from fire.',
    },
  ],
});
