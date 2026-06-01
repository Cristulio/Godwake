import { RaceSchema, type Race } from '../../schemas/race';

export const HUMAN: Race = RaceSchema.parse({
  id: 'human',
  name: 'Human',
  abilityScoreBonuses: {
    str: 1,
    dex: 1,
    con: 1,
    int: 1,
    wis: 1,
    cha: 1,
  },
  speed: 30,
  validClasses: ['fighter', 'wizard', 'rogue', 'barbarian', 'ranger', 'druid'],
  features: [
    {
      id: 'human-versatility',
      name: 'Versatility',
      description:
        'Humans are the wanderers and adventurers of the Sword Coast. You gain a +1 to every ability score.',
    },
  ],
});
