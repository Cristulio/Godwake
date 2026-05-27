import { ClassSchema, type Class } from '../../schemas/class';

export const ROGUE: Class = ClassSchema.parse({
  id: 'rogue',
  name: 'Rogue',
  hitDie: 8,
  primaryAbility: ['dex'],
  savingThrowProficiencies: ['dex', 'int'],
  skillChoiceCount: 2,
  skillChoiceFrom: [
    'acrobatics',
    'athletics',
    'deception',
    'insight',
    'intimidation',
    'investigation',
    'perception',
    'persuasion',
    'sleight-of-hand',
    'stealth',
  ],
  subclassLevel: 3,
  featuresByLevel: {
    '1': [
      {
        id: 'sneak-attack',
        name: 'Sneak Attack',
        description:
          'Once per turn, when you hit a target with advantage — or when the target is already bloodied (HP at half or less) — your strike finds the gap. Damage scales: +1d6 at L1, +2d6 at L3, +3d6 at L5, +4d6 at L7.',
        mechanicKey: 'sneak-attack',
      },
      {
        id: 'cunning-action',
        name: 'Cunning Action',
        description:
          'A bonus action each turn: Dash (regroup), Disengage (slip the next blow), or Hide (your next attack rolls with advantage).',
        mechanicKey: 'cunning-action',
      },
    ],
    '3': [
      {
        id: 'roguish-archetype',
        name: 'Roguish Archetype',
        description:
          'You commit to a roguish archetype that shapes the way you cut a path through the world.',
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
        id: 'uncanny-dodge',
        name: 'Uncanny Dodge',
        description:
          'When an attacker you can see hits you, your reaction halves the damage. (Flavor — engine support pending.)',
      },
    ],
    '6': [
      {
        id: 'expertise-6',
        name: 'Expertise',
        description:
          'Your proficiency bonus is doubled for two of your skill proficiencies. (Flavor — engine support pending.)',
      },
    ],
    '7': [
      {
        id: 'evasion',
        name: 'Evasion',
        description:
          'When subject to an effect that allows a Dex save for half damage, a successful save takes no damage and a fail takes half. (Flavor — engine support pending.)',
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
  subclasses: [
    {
      id: 'thief',
      name: 'Thief',
      description:
        'A specialist of locks, ledges, and the quick exit. Fast hands turn the bonus action into a second use of Cunning Action.',
      featuresByLevel: {
        '3': [
          {
            id: 'fast-hands',
            name: 'Fast Hands',
            description:
              'Your hands are quicker than the room can follow. You gain a second Cunning Action per combat.',
            mechanicKey: 'fast-hands',
          },
        ],
      },
    },
  ],
});
