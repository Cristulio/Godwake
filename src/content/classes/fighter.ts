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
      {
        id: 'power-attack',
        name: 'Power Attack',
        description:
          'Your Resolve — three points of grit that refresh each fight, spent at most one a turn on the blows that matter. Power Attack is the offense: set your feet and swing heavy, and every strike this turn bites deeper. Costs 2 Resolve and your bonus action — heave the heavy swing or steady yourself, not both.',
        mechanicKey: 'martial-offense',
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
        id: 'brace',
        name: 'Brace',
        description:
          'Read the incoming blow and set your guard against it — shield, blade, or braced haft. Spend 1 Resolve and your bonus action; the next hit you take is blunted by 4 plus half your level. Hold it for the swing you can see coming.',
        mechanicKey: 'martial-defense',
      },
    ],
    '3': [
      {
        id: 'shield-bash',
        name: 'Shield Bash',
        description:
          'Slam a foe mid-wind-up — shield boss, sword pommel, or staff-butt, whatever your off-hand holds. Spend 2 Resolve to arm a staggering strike — the next hit knocks the target down and costs it its next turn. (Dual-wielding, it reads as a Pommel Strike — same stagger.) Save it for the blow you least want answered.',
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
    '9': [
      {
        id: 'weapon-mastery',
        name: 'Weapon Mastery',
        description:
          'Years on the line sharpen every motion — your weapon attacks gain +1 damage. A flat edge that compounds with everything else you swing.',
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
    flavorBlurb:
      'A blunt instrument with a sword arm. Walks at the front, takes the first hit, lives to grumble about it.',
  },
  subclasses: [
    {
      id: 'champion',
      name: 'Champion',
      description:
        'Raw physical power honed to deadly perfection. Best with crit-range and big-die weapon gear that turns a widened crit window into reliable spikes.',
      bottomLine: {
        archetype: 'Striker',
        levers: [
          'Crits land on 19–20.',
          'L10: crits land on 18–20.',
        ],
      },
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
        '10': [
          {
            id: 'superior-critical',
            name: 'Superior Critical',
            description:
              'The killing eye opens wider still — your weapon attacks now score a critical hit on a roll of 18, 19, or 20. With a big-die weapon and any crit-range gear, the spikes come often enough to plan around.',
            mechanicKey: 'superior-critical',
          },
        ],
      },
    },
    {
      id: 'battle-master',
      name: 'Battle Master',
      description:
        'A student of maneuvers who opens fights with a measured, crippling strike. Best with on-hit and effect gear that compounds the wounds you start.',
      bottomLine: {
        archetype: 'Two-Blades',
        levers: [
          'Once per combat, your first hit adds your weapon dice + a bleed (3 damage a turn, 3 turns).',
          'A light blade may ride the shield hand — every Attack is followed by an off-hand swing.',
          'L10: +1 Resolve, recovered every round early in the fight.',
        ],
      },
      featuresByLevel: {
        '2': [
          {
            id: 'battle-master',
            name: 'Martial Archetype: Battle Master',
            description:
              'Once per combat, your first hit becomes a precise maneuver: bonus damage equal to your weapon dice and a bleeding wound (3 damage each turn for 3 turns). Rewards on-hit and bleed gear that builds on the opening cut.',
            mechanicKey: 'battle-master',
          },
          {
            id: 'paired-steel',
            name: 'Paired Steel',
            description:
              'You drill the second blade until it answers on its own. Your off-hand may carry a light weapon in a shield’s place; each turn your first strike is followed by a measured off-hand cut — its own attack roll, the weapon’s die plus your ability modifier, half its gear’s edge. The wall you give up answers in steel.',
            mechanicKey: 'dual-wielder',
          },
        ],
        '10': [
          {
            id: 'tactical-reserve',
            name: 'Tactical Reserve',
            description:
              'A deeper well of discipline: your Resolve pool grows by one, and you recover a point every round through the opening of a fight, not just every other round. More maneuvers, banked earlier, with less waiting between them.',
            mechanicKey: 'tactical-reserve',
          },
        ],
      },
    },
    {
      id: 'defender',
      name: 'Defender',
      description:
        'A bulwark who braces for the first blow of every fight. Best with high-HP, tank gear that deepens the cushion he walks in with.',
      bottomLine: {
        archetype: 'Tank',
        levers: [
          'Start every combat with 3 + level temporary HP.',
          'L10: the first drop below half HP grants temporary HP equal to your level.',
        ],
      },
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
        '10': [
          {
            id: 'hold-the-wall',
            name: 'Hold the Wall',
            description:
              'When the line bends, you set it. The first time you drop below half your hit points in a fight, you find a second wind of grit — temporary hit points equal to your level, soaking the blows that were about to land on bare flesh.',
            mechanicKey: 'hold-the-wall',
          },
        ],
      },
    },
  ],
});
