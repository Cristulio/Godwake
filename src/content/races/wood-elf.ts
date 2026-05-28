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
  size: 'medium',
  validClasses: ['fighter', 'wizard', 'cleric', 'rogue', 'barbarian'],
  features: [
    {
      id: 'wood-elf-fleetfoot',
      name: 'Fleet of Foot',
      description:
        'Long-lived archers of the high forest. Tread quiet on Faerûnian leaf-loam — your base walking speed is 35 feet.',
    },
  ],
});
