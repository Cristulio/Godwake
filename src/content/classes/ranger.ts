import { ClassSchema, type Class } from '../../schemas/class';

export const RANGER: Class = ClassSchema.parse({
  id: 'ranger',
  name: 'Ranger',
  hitDie: 10,
  primaryAbility: ['dex'],
  savingThrowProficiencies: ['str', 'dex'],
  // A hunter trained on the bow and the long blade — every simple and martial arm.
  weaponProficiency: { categories: ['simple', 'martial'] },
  // Travels light to travel far — light/medium armour and a shield, no heavy plate.
  armorProficiency: { categories: ['light', 'medium', 'shield'] },
  skillChoiceCount: 2,
  skillGrantsByLevel: { '3': 1, '5': 1 },
  skillChoiceFrom: [
    'animal-handling',
    'athletics',
    'insight',
    'investigation',
    'nature',
    'perception',
    'stealth',
    'survival',
  ],
  subclassLevel: 3,
  featuresByLevel: {
    '1': [
      {
        id: 'hunters-mark',
        name: "Hunter's Mark",
        description:
          'A bonus action brands one enemy as your quarry. Every hit you land on a marked target bites deeper, until it falls — then you brand the next one.',
        mechanicKey: 'hunters-mark',
      },
    ],
    '2': [
      {
        id: 'archery',
        name: 'Fighting Style: Archery',
        description:
          'You have drilled the bow until the shot is second nature. You gain a +2 bonus to attack rolls you make with ranged weapons.',
        mechanicKey: 'archery',
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
    characterName: 'Faelar Quill',
    recommendedRaceId: 'wood-elf',
    // DEX-first archer with a CON cushion so the back-rank shot survives the
    // monster that closes. With the Wood Elf +2 DEX / +1 WIS, the summary reads
    // DEX 17, CON 14, WIS 13, STR 12, INT 10, CHA 8.
    abilityScores: { str: 12, dex: 15, con: 14, int: 10, wis: 12, cha: 8 },
    recommendedSkills: ['perception', 'survival'],
    flavorBlurb:
      'Opens every room from across it. Marks the most dangerous thing in sight and feeds it arrows until it stops moving.',
  },
  subclasses: [
    {
      id: 'hunter',
      name: 'Hunter — Colossus Slayer',
      description:
        'You learn the killing of larger quarry: finish what the mark begins. Best with single-target, high-crit gear that piles damage onto one wounded foe.',
      featuresByLevel: {
        '3': [
          {
            id: 'colossus-slayer',
            name: 'Hunter’s Prey: Colossus Slayer',
            description:
              'Once each turn, a hit on a wounded foe (below its full health) deals an extra 1d8 damage. Rewards a single-target, crit-leaning build that focuses one quarry down.',
            mechanicKey: 'colossus-slayer',
          },
        ],
      },
    },
    {
      id: 'horde-breaker',
      name: 'Hunter — Horde Breaker',
      description:
        'You learn to loose against a tide, not a single throat. Best with flat-damage and on-hit affix gear that pays out twice when your shot carries on.',
      featuresByLevel: {
        '3': [
          {
            id: 'horde-breaker',
            name: 'Hunter’s Prey: Horde Breaker',
            description:
              'Once each turn, after you hit, your shot carries into a second enemy — a glancing strike for your weapon dice plus your flat damage bonuses. Rewards flat-damage and on-hit gear that benefits from extra targets.',
            mechanicKey: 'horde-breaker',
          },
        ],
      },
    },
    {
      id: 'giant-killer',
      name: 'Hunter — Giant Killer',
      description:
        'You hunt the things that tower over lesser prey. Best with a boss-killer build geared for the elite and the named monster.',
      featuresByLevel: {
        '3': [
          {
            id: 'giant-killer',
            name: 'Hunter’s Prey: Giant Killer',
            description:
              'Your hits against elites and bosses bite an extra 1d10. Rewards a boss-killer build that lives or dies on the room’s biggest threat.',
            mechanicKey: 'giant-killer',
          },
        ],
      },
    },
  ],
});
