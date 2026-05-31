import { ClassSchema, type Class } from '../../schemas/class';

export const ROGUE: Class = ClassSchema.parse({
  id: 'rogue',
  name: 'Rogue',
  hitDie: 8,
  primaryAbility: ['dex'],
  savingThrowProficiencies: ['dex', 'int'],
  // Light, quick, and quiet: any simple weapon plus finesse/light blades and
  // sidearms — rapier, dagger, shortbow, hand-crossbow.
  weaponProficiency: { categories: ['simple'], properties: ['finesse', 'light'] },
  // Stays light to stay quiet — leather and studded leather only, no shield.
  armorProficiency: { categories: ['light'] },
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
          'Once per turn, your first strike of each combat always finds the gap. After the opener, advantage (from Hide) or a bloodied target (HP ≤ half) keeps the knife working. Damage scales: +1d6 at L1, +2d6 at L3, +3d6 at L5, +4d6 at L7.',
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
    recommendedRaceId: 'half-elf',
    // DEX-first with a CON cushion so the back-rank archer doesn't fold on
    // the first stray hit. With Half-Elf's +2 CHA / +1 DEX (auto-routed
    // primary) / +1 CON (fallback secondary) the summary reads
    // DEX 15, CON 15, WIS 12, INT 12, CHA 12, STR 8.
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
        'A specialist of locks, ledges, and the quick exit. Best with tempo and utility gear that turns extra Cunning Actions into board control.',
      featuresByLevel: {
        '3': [
          {
            id: 'fast-hands',
            name: 'Roguish Archetype: Thief',
            description:
              'Your hands move faster than the room can follow: you gain a second Cunning Action each combat. Rewards tempo and utility gear that wants more bonus actions to spend.',
            mechanicKey: 'fast-hands',
          },
        ],
      },
    },
    {
      id: 'assassin',
      name: 'Assassin',
      description:
        'A killer who ends fights on the opening breath. Best with burst and first-strike gear that front-loads everything into the first cut.',
      featuresByLevel: {
        '3': [
          {
            id: 'assassin',
            name: 'Roguish Archetype: Assassin',
            description:
              'Against a foe still at full health your strike always finds the gap — it lands Sneak Attack and an extra 2d6. Rewards burst and first-strike gear: kill them before they bleed.',
            mechanicKey: 'assassin',
          },
        ],
      },
    },
    {
      id: 'swashbuckler',
      name: 'Swashbuckler',
      description:
        'A duelist who needs no shadow to find the gap. Best with consistent flat-damage gear that pays out every single turn.',
      featuresByLevel: {
        '3': [
          {
            id: 'swashbuckler',
            name: 'Roguish Archetype: Swashbuckler',
            description:
              'Your Sneak Attack triggers every turn with no advantage or bloodied target required. Rewards steady, consistent-damage gear — the bonus is always online.',
            mechanicKey: 'swashbuckler',
          },
        ],
      },
    },
  ],
});
