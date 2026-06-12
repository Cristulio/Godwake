import { ClassSchema, type Class } from '../../schemas/class';

export const PALADIN: Class = ClassSchema.parse({
  id: 'paladin',
  name: 'Paladin',
  hitDie: 10,
  // A true hybrid: Strength swings the martial arm in plate, Charisma drives the
  // smites, the half-caster spells, Lay on Hands, and the auras. Both axes matter;
  // the Oath decides which leads.
  primaryAbility: ['str', 'cha'],
  savingThrowProficiencies: ['wis', 'cha'],
  // Every simple and martial arm — the holy warrior trains with the whole rack.
  weaponProficiency: {
    categories: ['simple', 'martial'],
  },
  // The second heavy-armour class (after the Fighter): light through heavy plate,
  // and a shield. STR 15 clears the heavy-armour requirement (the same gate that
  // keeps a STR-8 caster out of plate).
  armorProficiency: { categories: ['light', 'medium', 'heavy', 'shield'] },
  subclassLevel: 3,
  featuresByLevel: {
    '1': [
      {
        id: 'lay-on-hands',
        name: 'Lay on Hands',
        description:
          'A reservoir of healing grace you carry into every fight, renewed each encounter. As a bonus action you press the light into your own wounds and a chunk of the well knits them shut — the staying power that lets the holy warrior stand alone. The pool deepens as you grow and as your Charisma swells.',
        mechanicKey: 'lay-on-hands',
      },
      {
        id: 'aura-of-protection',
        name: 'Aura of Protection',
        description:
          'The oath girds you like a second skin. You add your Charisma modifier to every saving throw — the binding word, the paralyzing grip, the fear that breaks lesser wills all find you harder to hold.',
        mechanicKey: 'aura-of-protection',
      },
    ],
    '2': [
      {
        id: 'spellcasting',
        name: 'Spellcasting',
        description:
          'Your faith answers in workings — a small divine repertoire keyed to your Charisma, drawn through a shallow well of half-caster slots: Castigate to strike a foe too armoured to cut, Cure Wounds to mend, a binding word to hold a foe fast, and a lance of searing light. A long rest refills the well.',
        mechanicKey: 'spellcasting',
      },
      {
        id: 'divine-smite',
        name: 'Divine Smite',
        description:
          'You learn to pour a spell slot into a landing blow. Arm a smite as a free act; the next weapon hit that connects spends your cheapest slot to sear the target with radiant fire on top of the steel — and the higher the slot, the brighter it burns.',
        mechanicKey: 'divine-smite',
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
          'Your sword arm keeps pace with your faith — you can attack twice, instead of once, whenever you take the Attack action on your turn.',
        mechanicKey: 'extra-attack',
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
        id: 'improved-divine-smite',
        name: 'Improved Divine Smite',
        description:
          'The radiance comes easier now — every Divine Smite you loose carries an extra die of holy fire. The longer the oath holds, the heavier the light it answers with.',
        mechanicKey: 'improved-divine-smite',
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
        id: 'oathkeeper',
        name: 'Unyielding Oath',
        description:
          'The oath is whole and the well of mercy runs without bottom — your Lay on Hands pool deepens by a full measure of your own power, an endless reserve of grace to spend on your own standing. The capstone of the long road of faith.',
        mechanicKey: 'oathkeeper',
      },
    ],
  },
  preset: {
    characterName: 'Halvar (and Pip)',
    recommendedRaceId: 'human',
    // Hybrid STR + CHA. STR 15 clears the heavy-armour gate and swings the martial
    // arm; CHA 15 drives smites, spells, Lay on Hands and the auras; CON cushions
    // the front line. With Human's +1 to all the summary reads STR 16, CHA 16,
    // CON 15, WIS 12, DEX 11, INT 9.
    abilityScores: { str: 15, dex: 10, con: 14, int: 8, wis: 11, cha: 15 },
    flavorBlurb:
      'Butt-kicking for goodness, in full plate — by order of a hamster. Halvar mends his own wounds, sears what he strikes, and charges the wicked with a berserker\'s joy. Pip, riding his shoulder, sees all and has never once steered him wrong.',
  },
  subclasses: [
    {
      id: 'radiant',
      name: 'Oath of the Radiant',
      description:
        'The caster lean — a Paladin whose smites burn brightest and whose faith answers in searing light. Best with Charisma gear (spell-DC affixes, a caster off-hand) to drive its bigger smites and its binding word. Lighter on the weapon, heavier on the holy fire.',
      bottomLine: {
        archetype: 'Caster',
        levers: [
          'Every Divine Smite burns +1d8 hotter.',
          'L10: +2d8 — two dice hotter than any other oath.',
        ],
      },
      featuresByLevel: {
        '3': [
          {
            id: 'radiant-smite',
            name: 'Sacred Oath: Oath of the Radiant',
            description:
              'You swear the oath of the dawn, and your smites answer hotter — every Divine Smite carries an extra die of radiant fire. The Radiant Paladin spends its slots as light, not just steel.',
            mechanicKey: 'radiant-smite',
          },
        ],
        '10': [
          {
            id: 'sears-the-wicked',
            name: 'Searing Judgment',
            description:
              'The light you carry has grown into something that frightens the dark — every Divine Smite burns a further die hotter still. Few wicked things stand long against the full measure of your radiance.',
            mechanicKey: 'sears-the-wicked',
          },
        ],
      },
    },
    {
      id: 'bulwark',
      name: 'Oath of the Bulwark',
      description:
        'The martial lean — a Paladin who plants itself at the front and refuses to fall. Best with weapon and tank gear: its aura girds it with temporary hit points each fight, and its smites answer every crit free. The self-buffing wall the oath was built to be.',
      bottomLine: {
        archetype: 'Tank',
        levers: [
          'Start every fight wrapped in 4 + level temporary HP.',
          'Every crit you land triggers a free Divine Smite.',
          'L10: the wrap deepens to 6 + level, and every blow against you is shaved by 3.',
        ],
      },
      featuresByLevel: {
        '3': [
          {
            id: 'aura-of-the-bulwark',
            name: 'Sacred Oath: Oath of the Bulwark',
            description:
              'You swear the oath of the shield-wall, and the aura turns inward to gird you. At the start of every fight it wraps you in temporary hit points — a cushion of grace that soaks the first blows before your own blood is spent.',
            mechanicKey: 'aura-of-the-bulwark',
          },
          {
            id: 'crit-smite',
            name: 'Smite of the Crusader',
            description:
              'Your faith strikes hardest at the perfect opening — whenever a critical hit lands, a Divine Smite answers free of charge, spending a slot to sear the target even when you had armed nothing. The wall hits back.',
            mechanicKey: 'crit-smite',
          },
        ],
        '10': [
          {
            id: 'unbreakable-aura',
            name: 'Unbreakable Aura',
            description:
              'The shield-wall aura runs deeper than ever — its girding hit points swell, and a steady cushion now shaves something off every blow that lands on you. The longer you stand, the harder you are to bring down.',
            mechanicKey: 'unbreakable-aura',
          },
        ],
      },
    },
  ],
});
