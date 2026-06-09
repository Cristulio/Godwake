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
        id: 'nimble-dodge',
        name: 'Nimble Dodge',
        description:
          'You read the opening strike before it lands. Once per round, the first attack against you is made at disadvantage. This early reflex sharpens into Uncanny Dodge at L5 and steps aside for it.',
        mechanicKey: 'nimble-dodge',
      },
      {
        id: 'cunning-action',
        name: 'Cunning Action',
        description:
          'A bonus action each turn: Hide (advantage on your next attack, which also lands Sneak), Quick Strike (a second weapon strike this turn — your answer to a fighter’s extra attack), Feint (guarantee Sneak on your next strike with no setup), or Steel Yourself (advantage on your next save).',
        mechanicKey: 'cunning-action',
      },
    ],
    '4': [
      {
        id: 'assassinate',
        name: 'Assassinate',
        description:
          'You open from the blind side. The first strike of every fight lands with advantage and drives an extra 2d6 of Sneak Attack home — front-load the kill before the mark can act.',
        mechanicKey: 'assassinate',
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
        id: 'envenom',
        name: 'Envenom',
        description:
          'You work a slow poison into the edge. A landed Sneak Attack leaves the wound festering for 2 damage a turn over the next two turns — sustained bleed that pays out beyond the once-a-turn burst.',
        mechanicKey: 'envenom',
      },
    ],
    '9': [
      {
        id: 'cunning-mastery',
        name: 'Cunning Mastery',
        description:
          'Your hands and feet outpace the room entirely — you gain an additional Cunning Action each combat (Hide, Quick Strike, Feint, or Steel Yourself).',
        mechanicKey: 'cunning-mastery',
      },
    ],
    '10': [
      {
        id: 'evasion',
        name: 'Evasion',
        description:
          'When a foe winds up a telegraphed special, you read it a full turn out and roll clear — the charged blast deals only half. Your footwork answers what your reaction can’t.',
        mechanicKey: 'evasion',
      },
    ],
    '12': [
      {
        id: 'opportunist',
        name: 'Opportunist',
        description:
          'A foe that swings and misses you has opened itself up. Once each round you answer with a reaction jab that finds the gap — a second Sneak Attack on top of your own turn’s. It costs you no reaction, so Uncanny Dodge still answers a blow that lands.',
        mechanicKey: 'opportunist',
      },
    ],
    '13': [
      {
        id: 'deadly-finesse',
        name: 'Deadly Finesse',
        description:
          'You read the gap before it opens — your weapon attacks score a critical hit on a roll of 19 or 20, and every point of Sneak Attack rides the wider window.',
        mechanicKey: 'deadly-finesse',
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
    '20': [
      {
        id: 'death-strike',
        name: 'Death Strike',
        description:
          'Your killing blow finds the artery every time — your Sneak Attack deals an extra 2d6 damage. The capstone of the assassin\'s art.',
        mechanicKey: 'death-strike',
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
        '11': [
          {
            id: 'deft-hands',
            name: 'Deft Hands',
            description:
              'The hands never stop moving. You gain one more Cunning Action each combat — another Hide, Quick Strike, Feint, or Steel Yourself to spend on the board state you want.',
            mechanicKey: 'deft-hands',
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
        '11': [
          {
            id: 'mortal-strike',
            name: 'Mortal Strike',
            description:
              'You have learned exactly where the life sits. Your opening strike of a fight against a foe still at full health is an automatic critical — the kill front-loaded before it can so much as raise a guard.',
            mechanicKey: 'mortal-strike',
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
        '11': [
          {
            id: 'rakish-duelist',
            name: 'Rakish Duelist',
            description:
              'One blade, one foe, and all the room you need. When only a single enemy still stands against you, you fight with a duelist’s edge — +2 to hit, and your Sneak Attack lands no matter what. The last one standing is the easiest to read.',
            mechanicKey: 'rakish-duelist',
          },
        ],
      },
    },
  ],
});
