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
  subclassLevel: 2,
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
      {
        id: 'martial-archetype',
        name: 'Martial Archetype',
        description: 'You choose a Martial Archetype that shapes the practice of your martial training.',
      },
    ],
    '4': [
      {
        id: 'asi-4',
        name: 'Ability Score Improvement',
        description:
          'You can increase one ability score by 2, or two ability scores by 1 each.',
        mechanicKey: 'asi',
      },
    ],
    '5': [
      {
        id: 'extra-attack',
        name: 'Extra Attack',
        description:
          'You can attack twice, instead of once, whenever you take the Attack action on your turn.',
        mechanicKey: 'extra-attack',
      },
    ],
    '6': [
      {
        id: 'asi-6',
        name: 'Ability Score Improvement',
        description:
          'You can increase one ability score by 2, or two ability scores by 1 each.',
        mechanicKey: 'asi',
      },
    ],
    '8': [
      {
        id: 'asi-8',
        name: 'Ability Score Improvement',
        description:
          'You can increase one ability score by 2, or two ability scores by 1 each.',
        mechanicKey: 'asi',
      },
    ],
  },
  preset: {
    characterName: 'Sir Brick',
    recommendedRaceId: 'human',
    // Standard array (15/14/13/12/10/8) tilted into STR/CON. With Human's
    // +1-across the table reads 16/15/14/13/11/9 in the summary.
    abilityScores: { str: 15, dex: 13, con: 14, int: 8, wis: 12, cha: 10 },
    recommendedSkills: ['athletics', 'perception'],
    flavorBlurb:
      'A blunt instrument with a sword arm. Walks at the front, takes the first hit, lives to grumble about it.',
  },
  subclasses: [
    {
      id: 'champion',
      name: 'Champion',
      description: 'A martial archetype focused on the raw physical power honed to deadly perfection.',
      featuresByLevel: {
        '2': [
          {
            id: 'improved-critical',
            name: 'Improved Critical',
            description: 'Your weapon attacks score a critical hit on a roll of 19 or 20.',
            mechanicKey: 'improved-critical',
          },
        ],
        '5': [
          {
            id: 'remarkable-athlete',
            name: 'Remarkable Athlete',
            description:
              'Your reflexes outpace the fight. You gain a permanent +2 bonus to initiative.',
            mechanicKey: 'remarkable-athlete',
          },
        ],
      },
    },
  ],
});
