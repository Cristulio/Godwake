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
      {
        id: 'aimed-shot',
        name: 'Aimed Shot',
        description:
          'Your Focus — three points of steady aim that refresh each fight, spent at most one a turn. Aimed Shot is the offense: draw a breath and place the shot, and every strike this turn drives deeper. Costs 2 Focus.',
        mechanicKey: 'martial-offense',
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
      {
        id: 'set-stance',
        name: 'Set Stance',
        description:
          'Plant your feet and read the charge. Spend 1 Focus to blunt the next hit you take by 4 plus half your level — a moment of footing for when the quarry closes the distance.',
        mechanicKey: 'martial-defense',
      },
    ],
    '3': [
      {
        id: 'crippling-shot',
        name: 'Crippling Shot',
        description:
          'Put an arrow through a knee or a wing. Spend 1 Focus to arm a crippling shot — the next hit hamstrings its target and costs it its next turn. The hunt is patience, then a single ruinous moment.',
        mechanicKey: 'martial-disrupt',
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
    '11': [
      {
        id: 'improved-mark',
        name: 'Improved Mark',
        description:
          'The brand bites deeper — every hit you land on your Hunter\'s Mark quarry deals an extra die of damage on top of the mark.',
        mechanicKey: 'improved-mark',
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
    '16': [
      {
        id: 'asi-16',
        name: 'Ability Score Improvement',
        description:
          'You can increase one ability score by 2, or two ability scores by 1 each.',
        mechanicKey: 'asi',
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
        id: 'foe-slayer',
        name: 'Foe Slayer',
        description:
          'No quarry outlives your focus — your Hunter\'s Mark now drives two extra dice home on every hit against the marked foe. The hunt always ends one way.',
        mechanicKey: 'foe-slayer',
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
        '10': [
          {
            id: 'deeper-wound',
            name: 'Deeper Wound',
            description:
              'You have learned where the great ones bleed. Your Colossus Slayer strike now rolls two dice into the wound instead of one — once each turn a hurt foe takes 2d8 more, the kill on a single quarry coming that much faster.',
            mechanicKey: 'deeper-wound',
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
        '10': [
          {
            id: 'whirling-hunter',
            name: 'Whirling Hunter',
            description:
              'One shot, a whole rank answered. Your carrying strike now glances into as many as two further foes instead of one — against a packed room the single loosed arrow pays out three times over.',
            mechanicKey: 'whirling-hunter',
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
        '10': [
          {
            id: 'giantsbane',
            name: 'Giantsbane',
            description:
              'You have made a study of bringing down the towering things. Your bane against elites and bosses doubles — every hit on the room’s great threat drives 2d10 home instead of one, the named monster bleeding twice as fast.',
            mechanicKey: 'giantsbane',
          },
        ],
      },
    },
  ],
});
