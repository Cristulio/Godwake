import { ClassSchema, type Class } from '../../schemas/class';

export const FIGHTER: Class = ClassSchema.parse({
  id: 'fighter',
  name: 'Fighter',
  hitDie: 10,
  primaryAbility: ['str', 'dex'],
  savingThrowProficiencies: ['str', 'con'],
  // A trained soldier — every simple and martial arm.
  weaponProficiency: { categories: ['simple', 'martial'] },
  // The one heavy-armour class — a Fighter wears anything, chain mail included.
  armorProficiency: { categories: ['light', 'medium', 'heavy', 'shield'] },
  skillChoiceCount: 2,
  skillGrantsByLevel: { '3': 1, '5': 1 },
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
          'On your turn, you can use a bonus action to regain hit points equal to 1d10 + your fighter level. Refreshes at the start of every combat encounter.',
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
    '9': [
      {
        id: 'weapon-mastery',
        name: 'Weapon Mastery',
        description:
          'Years on the line sharpen every motion — your weapon attacks gain +1 to hit and +1 damage. A flat edge that compounds with everything else you swing.',
        mechanicKey: 'weapon-mastery',
      },
    ],
    '11': [
      {
        id: 'extra-attack-2',
        name: 'Relentless Assault',
        description:
          'Your Attack action now strikes three times instead of twice. The pressure never lets up.',
        mechanicKey: 'extra-attack-2',
      },
    ],
    '12': [
      {
        id: 'asi-12',
        name: 'Ability Score Improvement',
        description:
          'You can increase one ability score by 2, or two ability scores by 1 each.',
        mechanicKey: 'asi',
      },
    ],
    '14': [
      {
        id: 'asi-14',
        name: 'Ability Score Improvement',
        description:
          'You can increase one ability score by 2, or two ability scores by 1 each. A soldier\'s extra dedication to the craft.',
        mechanicKey: 'asi',
      },
    ],
    '16': [
      {
        id: 'asi-16',
        name: 'Ability Score Improvement',
        description:
          'You can increase one ability score by 2, or two ability scores by 1 each.',
        mechanicKey: 'asi',
      },
    ],
    '17': [
      {
        id: 'improved-action-surge',
        name: 'Improved Action Surge',
        description:
          'Your second wind of momentum runs deeper — you can call on Action Surge twice per combat instead of once.',
        mechanicKey: 'improved-action-surge',
      },
    ],
    '19': [
      {
        id: 'asi-19',
        name: 'Ability Score Improvement',
        description:
          'You can increase one ability score by 2, or two ability scores by 1 each.',
        mechanicKey: 'asi',
      },
    ],
    '20': [
      {
        id: 'extra-attack-3',
        name: 'Unstoppable',
        description:
          'The pinnacle of the soldier\'s craft: your Attack action strikes four times. Few things on two legs survive a full turn of it.',
        mechanicKey: 'extra-attack-3',
      },
    ],
  },
  preset: {
    characterName: 'Sir Brick',
    recommendedRaceId: 'human',
    // Standard array (15/14/13/12/10/8) tilted into STR/CON. With Human's
    // +1-across the table reads 16/15/14/13/11/9 in the summary.
    abilityScores: { str: 15, dex: 13, con: 14, int: 8, wis: 12, cha: 10 },
    recommendedSkills: ['insight'],
    flavorBlurb:
      'A blunt instrument with a sword arm. Walks at the front, takes the first hit, lives to grumble about it.',
  },
  subclasses: [
    {
      id: 'champion',
      name: 'Champion',
      description:
        'Raw physical power honed to deadly perfection. Best with crit-range and big-die weapon gear that turns a widened crit window into reliable spikes.',
      featuresByLevel: {
        '2': [
          {
            id: 'improved-critical',
            name: 'Martial Archetype: Champion',
            description:
              'Your weapon attacks score a critical hit on a roll of 19 or 20. Rewards crit-range and large-die weapons — every point of crit chance is worth more.',
            mechanicKey: 'improved-critical',
          },
        ],
      },
    },
    {
      id: 'battle-master',
      name: 'Battle Master',
      description:
        'A student of maneuvers who opens fights with a measured, crippling strike. Best with on-hit and effect gear that compounds the wounds you start.',
      featuresByLevel: {
        '2': [
          {
            id: 'battle-master',
            name: 'Martial Archetype: Battle Master',
            description:
              'Once per combat, your first hit becomes a precise maneuver: bonus damage equal to your weapon dice and a bleeding wound (3 damage each turn for 3 turns). Rewards on-hit and bleed gear that builds on the opening cut.',
            mechanicKey: 'battle-master',
          },
        ],
      },
    },
    {
      id: 'defender',
      name: 'Defender',
      description:
        'A bulwark who braces for the first blow of every fight. Best with high-HP, tank gear that deepens the cushion he walks in with.',
      featuresByLevel: {
        '2': [
          {
            id: 'defender',
            name: 'Martial Archetype: Defender',
            description:
              'You brace behind armour and shield: at the start of each combat you gain temporary hit points equal to 3 + your level, soaking damage before your own. Rewards max-HP and tank gear that wants a deeper cushion to work behind.',
            mechanicKey: 'defender',
          },
        ],
      },
    },
  ],
});
