import { RaceSchema, type Race } from '../../schemas/race';

export const HALF_ELF: Race = RaceSchema.parse({
  id: 'half-elf',
  name: 'Half-Elf',
  abilityScoreBonuses: {
    str: 0,
    dex: 1,
    con: 1,
    int: 0,
    wis: 0,
    cha: 2,
  },
  speed: 30,
  size: 'medium',
  validClasses: ['fighter', 'wizard', 'cleric', 'rogue', 'barbarian'],
  features: [
    {
      id: 'half-elf-versatility',
      name: 'Two-World Walker',
      description:
        'Walkers between two worlds. Charisma-tilted and resilient — fixed +1 Dexterity and +1 Constitution alongside the Half-Elf charm (the 5e free picker is collapsed to a useful default while a creation-time picker UI is still pending).',
    },
  ],
});
