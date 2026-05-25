import { ClassSchema, type Class } from '../../schemas/class';

export const FIGHTER: Class = ClassSchema.parse({
  id: 'fighter',
  name: 'Fighter',
  hitDie: 10,
  primaryAbility: ['str', 'dex'],
  savingThrowProficiencies: ['str', 'con'],
  skillChoiceCount: 2,
  skillChoiceFrom: [
    'acrobatics',
    'animal-handling',
    'athletics',
    'history',
    'insight',
    'intimidation',
    'perception',
    'survival',
  ],
  subclassLevel: 3,
  featuresByLevel: {
    '1': [
      {
        id: 'fighting-style-defense',
        name: 'Fighting Style: Defense',
        description: 'While wearing armor, you gain a +1 bonus to AC.',
        mechanicKey: 'fighting-style-defense',
      },
      {
        id: 'second-wind',
        name: 'Second Wind',
        description:
          'On your turn, you can use a bonus action to regain hit points equal to 1d10 + your fighter level. Once per short or long rest.',
        mechanicKey: 'second-wind',
      },
    ],
    '2': [
      {
        id: 'action-surge',
        name: 'Action Surge',
        description:
          'On your turn, you can take one additional action. Once per short or long rest.',
        mechanicKey: 'action-surge',
      },
    ],
    '3': [
      {
        id: 'martial-archetype',
        name: 'Martial Archetype',
        description: 'You choose a Martial Archetype that shapes the practice of your martial training.',
      },
    ],
  },
  subclasses: [
    {
      id: 'champion',
      name: 'Champion',
      description: 'A martial archetype focused on the raw physical power honed to deadly perfection.',
      featuresByLevel: {
        '3': [
          {
            id: 'improved-critical',
            name: 'Improved Critical',
            description: 'Your weapon attacks score a critical hit on a roll of 19 or 20.',
            mechanicKey: 'improved-critical',
          },
        ],
      },
    },
  ],
});
