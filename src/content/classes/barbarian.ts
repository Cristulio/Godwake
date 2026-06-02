import { ClassSchema, type Class } from '../../schemas/class';

export const BARBARIAN: Class = ClassSchema.parse({
  id: 'barbarian',
  name: 'Barbarian',
  hitDie: 12,
  primaryAbility: ['str'],
  savingThrowProficiencies: ['str', 'con'],
  // A warrior who needs no smith — every simple and martial arm, swung bare.
  weaponProficiency: { categories: ['simple', 'martial'] },
  // No heavy plate — Unarmored Defense is the brute's guard; light/medium + shield only.
  armorProficiency: { categories: ['light', 'medium', 'shield'] },
  skillChoiceCount: 2,
  skillGrantsByLevel: { '3': 1, '5': 1 },
  skillChoiceFrom: [
    'animal-handling',
    'athletics',
    'intimidation',
    'nature',
    'perception',
    'survival',
  ],
  subclassLevel: 3,
  featuresByLevel: {
    '1': [
      {
        id: 'rage',
        name: 'Rage',
        description:
          'A bonus action drops you into a battle-fury for several rounds: physical blows against you are halved, and your melee hits land for extra damage. One rage per fight at first, more as you harden.',
        mechanicKey: 'rage',
      },
      {
        id: 'unarmored-defense',
        name: 'Unarmored Defense',
        description:
          'You wear no armor and need none — your guard is bone and instinct. While unarmored, your Armor Class is 10 + your Dexterity and Constitution both.',
        mechanicKey: 'unarmored-defense',
      },
      {
        id: 'savage-cleave',
        name: 'Savage Cleave',
        description:
          'Your Fury — three points of bloodlust that refresh each fight, spent at most one a turn. Savage Cleave is the offense: a wide swing that bites harder and spills clean through into a second foe beside your mark. Costs 2 Fury.',
        mechanicKey: 'martial-offense',
      },
    ],
    '2': [
      {
        id: 'reckless-attack',
        name: 'Reckless Attack',
        description:
          'You can fight with abandon: your melee attacks this turn roll with advantage, but every attack against you has advantage until your next turn. Throw the guard away to make the kill.',
        mechanicKey: 'reckless-attack',
      },
      {
        id: 'bloodied-guard',
        name: 'Bloodied Guard',
        description:
          'Take the blow on a braced shoulder and let it bounce. Spend 1 Fury to blunt the next hit you take by 4 plus half your level — the staying power the fury alone never gave you.',
        mechanicKey: 'martial-defense',
      },
    ],
    '3': [
      {
        id: 'knockdown',
        name: 'Knockdown',
        description:
          'A shoulder behind the blade puts a foe on the ground. Spend 1 Fury to arm a staggering strike — when it lands, the target loses its next turn. Save it for the thing you least want to act.',
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
        id: 'brutal-critical',
        name: 'Brutal Critical',
        description:
          'When you land a critical hit, you roll one extra weapon die on top of the doubled dice — the savage spike that ends fights early.',
        mechanicKey: 'brutal-critical',
      },
    ],
    '11': [
      {
        id: 'relentless-rage',
        name: 'Relentless Rage',
        description:
          'The fury no longer burns out fast — your Rage now holds for two rounds longer, carrying through the long fights that used to outlast it.',
        mechanicKey: 'relentless-rage',
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
    '15': [
      {
        id: 'persistent-rage',
        name: 'Persistent Rage',
        description:
          'The wells of your anger run deeper than ever — while raging, every melee hit lands for an additional +2 damage.',
        mechanicKey: 'persistent-rage',
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
        id: 'primal-champion',
        name: 'Primal Champion',
        description:
          'You become the apex of the primal path — while raging, your melee hits land for a further +3 damage. The fury is no longer a state you enter; it is what you are.',
        mechanicKey: 'primal-champion',
      },
    ],
  },
  preset: {
    characterName: 'Korrek Bloodmane',
    recommendedRaceId: 'hill-dwarf',
    // STR-first with a heavy CON cushion — Unarmored Defense leans on both DEX
    // and CON, and a d12 hull wants every point of CON it can hold. With Hill
    // Dwarf's +2 CON / +1 WIS the summary reads CON 16, STR 15, DEX 13,
    // CHA 12, WIS 11, INT 8.
    abilityScores: { str: 15, dex: 13, con: 14, int: 8, wis: 10, cha: 12 },
    recommendedSkills: ['athletics', 'intimidation'],
    flavorBlurb:
      'Carries no shield and wants none. Walks into the worst of it, lets the fury take the wheel, and is still standing when the dust drops.',
  },
  subclasses: [
    {
      id: 'berserker',
      name: 'Path of the Berserker',
      description:
        'Rage as a means to an end — that end being violence. Best with lifesteal and aggressive gear that turns extra damage into staying power.',
      featuresByLevel: {
        '3': [
          {
            id: 'frenzy',
            name: 'Primal Path: Berserker',
            description:
              'While you are raging, every melee hit lands an extra 1d6. Rewards lifesteal and on-hit gear: the more you swing, the more the fury pays back.',
            mechanicKey: 'frenzy',
          },
        ],
      },
    },
    {
      id: 'totem-warrior',
      name: 'Path of the Totem Warrior (Bear)',
      description:
        'The bear-spirit lends its hide to those who walk into the worst of it. Best with tank gear that stacks atop the hardened guard.',
      featuresByLevel: {
        '3': [
          {
            id: 'totem-warrior',
            name: 'Primal Path: Totem Warrior',
            description:
              'The bear’s endurance is yours: you begin every combat with temporary hit points equal to 2 + your level, soaking the first blows. Rewards CON and max-HP tank gear — the bear out-lasts what the Berserker out-hits.',
            mechanicKey: 'totem-warrior',
          },
        ],
      },
    },
  ],
});
