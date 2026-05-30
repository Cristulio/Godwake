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
    ],
    '2': [
      {
        id: 'reckless-attack',
        name: 'Reckless Attack',
        description:
          'You can fight with abandon: your melee attacks this turn roll with advantage, but every attack against you has advantage until your next turn. Throw the guard away to make the kill.',
        mechanicKey: 'reckless-attack',
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
    characterName: 'Korrek Bloodmane',
    recommendedRaceId: 'human',
    // STR-first with a heavy CON cushion — Unarmored Defense leans on both DEX
    // and CON, and a d12 hull wants every point of CON it can hold. With the
    // Human +1-across, the summary reads STR 16, CON 15, DEX 14, CHA 13, WIS
    // 11, INT 9.
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
        'For some barbarians, rage is a means to an end — that end being violence. The Berserker channels the fury into a deeper, deadlier frenzy.',
      featuresByLevel: {
        '3': [
          {
            id: 'frenzy',
            name: 'Primal Path: Berserker',
            description:
              'Your rage settles into the Berserker’s frenzy — unchecked, joyless fury. While you are raging, every melee hit lands even harder.',
            mechanicKey: 'frenzy',
          },
        ],
      },
    },
  ],
});
