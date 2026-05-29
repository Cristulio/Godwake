import { RaceSchema, type Race } from '../../schemas/race';

export const HALF_ELF: Race = RaceSchema.parse({
  id: 'half-elf',
  name: 'Half-Elf',
  abilityScoreBonuses: {
    str: 0,
    dex: 0,
    con: 0,
    int: 0,
    wis: 0,
    cha: 2,
  },
  speed: 30,
  size: 'medium',
  validClasses: ['fighter', 'wizard', 'rogue', 'barbarian', 'ranger'],
  features: [
    {
      id: 'half-elf-versatility',
      name: 'Two-World Walker',
      description:
        "Walkers between two worlds. +2 Charisma, plus +1 to your class's primary ability and +1 to a secondary stat (Dexterity for martials, Constitution for casters) — the half-blood adapts to whatever calling claims it.",
    },
  ],
});
