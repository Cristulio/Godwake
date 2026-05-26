import { ClassSchema, type Class } from '../../schemas/class';

export const WIZARD: Class = ClassSchema.parse({
  id: 'wizard',
  name: 'Wizard',
  hitDie: 6,
  primaryAbility: ['int'],
  savingThrowProficiencies: ['int', 'wis'],
  skillChoiceCount: 2,
  skillChoiceFrom: [
    'arcana',
    'history',
    'insight',
    'investigation',
    'medicine',
    'religion',
  ],
  subclassLevel: 2,
  featuresByLevel: {
    '1': [
      {
        id: 'spellcasting',
        name: 'Spellcasting',
        description:
          'You channel arcane lore through prepared spells and a small pool of slots. Long rest refills the well.',
        mechanicKey: 'spellcasting',
      },
      {
        id: 'arcane-cantrips',
        name: 'Arcane Cantrips',
        description:
          'You wield Fire Bolt (1d10 fire, at-will) and Mage Hand (a flicker of force at your fingertips).',
        mechanicKey: 'arcane-cantrips',
      },
    ],
    '2': [
      {
        id: 'arcane-tradition',
        name: 'Arcane Tradition',
        description:
          'You commit to a school of magic. Its discipline shapes the rest of your study.',
      },
    ],
    '3': [
      {
        id: 'second-level-slots',
        name: 'Second-Level Slots',
        description:
          'Your spellbook deepens — you can now anchor 2nd-level workings such as Hold Person.',
        mechanicKey: 'second-level-slots',
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
        id: 'third-level-slots',
        name: 'Third-Level Slots',
        description:
          'You can now anchor 3rd-level workings. The threshold of named spells widens.',
        mechanicKey: 'third-level-slots',
      },
    ],
    '6': [
      {
        id: 'arcane-recovery',
        name: 'Arcane Recovery',
        description:
          'Between fights, a moment of focused breath recovers a sliver of arcane reserve. (Flavor — engine support pending.)',
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
      id: 'evocation',
      name: 'School of Evocation',
      description:
        'You shape raw arcane force into directed harm. Your evocations bite a touch deeper than the page suggests.',
      featuresByLevel: {
        '2': [
          {
            id: 'sculpt-spells',
            name: 'Sculpt Spells',
            description:
              'Your evocations are honed past the page. Burning Hands burns one die hotter.',
            mechanicKey: 'sculpt-spells',
          },
        ],
      },
    },
  ],
});
