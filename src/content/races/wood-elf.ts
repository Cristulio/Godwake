import { RaceSchema, type Race } from '../../schemas/race';

export const WOOD_ELF: Race = RaceSchema.parse({
  id: 'wood-elf',
  name: 'Wood Elf',
  abilityScoreBonuses: {
    str: 0,
    dex: 2,
    con: 0,
    int: 0,
    wis: 1,
    cha: 0,
  },
  speed: 35,
  validClasses: ['fighter', 'wizard', 'rogue', 'barbarian', 'ranger', 'druid'],
  bonusHpPerLevel: 1,
  features: [
    {
      id: 'wood-elf-fey-vigor',
      name: 'Fey-Touched Vigor',
      description:
        'Long-lived archers of the high forest — quick to mend, slow to fall. Your hit point maximum increases by 1 for every character level.',
    },
  ],
});
