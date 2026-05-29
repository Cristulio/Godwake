import { ClassSchema, type Class } from '../../schemas/class';

export const ROGUE: Class = ClassSchema.parse({
  id: 'rogue',
  name: 'Rogue',
  hitDie: 8,
  primaryAbility: ['dex'],
  savingThrowProficiencies: ['dex', 'int'],
  // Light, quick, and quiet: any simple weapon plus finesse/light blades and
  // sidearms — rapier, dagger, shortbow, hand-crossbow, the adamantine shortsword.
  weaponProficiency: { categories: ['simple'], properties: ['finesse', 'light'] },
  skillChoiceCount: 2,
  skillGrantsByLevel: { '3': 1, '5': 1, '7': 1 },
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
          'A bonus action each turn: Hide (advantage on your next attack), Dash (+2 to your next attack roll), or Disengage (2 damage reduction on the next incoming hit).',
        mechanicKey: 'cunning-action',
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
          'Once per round, when an attacker hits you, your reaction halves the damage (rounded down). Triggers automatically on the first hit each round.',
        mechanicKey: 'uncanny-dodge',
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
    characterName: 'Maelis Vell',
    recommendedRaceId: 'wood-elf',
    // DEX-first with a CON cushion so the back-rank archer doesn't fold on
    // the first stray hit. With Wood Elf's +2 DEX / +1 WIS the summary
    // reads DEX 16, CON 14, WIS 13, INT 12, CHA 10, STR 8.
    abilityScores: { str: 8, dex: 14, con: 14, int: 12, wis: 12, cha: 10 },
    recommendedSkills: ['insight'],
    flavorBlurb:
      'Quiet boots, quicker hands. Reads a room for exits before she reads it for friends.',
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
            name: 'Roguish Archetype: Thief',
            description:
              'Your path settles into the Thief’s — locks, ledges, and the quick exit. Your hands move faster than the room can follow: you gain a second Cunning Action each combat.',
            mechanicKey: 'fast-hands',
          },
        ],
      },
    },
  ],
});
