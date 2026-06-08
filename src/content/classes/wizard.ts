import { ClassSchema, type Class } from '../../schemas/class';

export const WIZARD: Class = ClassSchema.parse({
  id: 'wizard',
  name: 'Wizard',
  hitDie: 6,
  primaryAbility: ['int'],
  savingThrowProficiencies: ['int', 'wis'],
  // The scholar's hands know only simple arms — dagger, quarterstaff, mace.
  weaponProficiency: { categories: ['simple'] },
  // No true armour — the wizard's shell is Mage Armour. Robes are the lone
  // body-slot exception, and orbs the off-hand one: both are caster gear that
  // grants no AC, so Mage Armour holds. (Orbs are the spell-side of a shield.)
  armorProficiency: { categories: ['robe', 'orb'] },
  subclassLevel: 2,
  featuresByLevel: {
    '1': [
      {
        id: 'spellcasting',
        name: 'Spellcasting',
        description:
          'You channel arcane lore through prepared spells and a small pool of slots. Long rest refills the well.',
        mechanicKey: 'spellcasting',
      },
      {
        id: 'arcane-cantrips',
        name: 'Arcane Cantrips',
        description:
          'You wield Fire Bolt (1d10 fire, at-will) — a mote of flame flung from the fingertips, yours to throw as often as the fight demands. The bolt grows with you: 2d10 at level 5, 3d10 at level 7, 4d10 at level 8.',
        mechanicKey: 'arcane-cantrips',
      },
    ],
    '3': [
      {
        id: 'second-level-slots',
        name: 'Second-Level Slots',
        description:
          'Your spellbook deepens — you can now anchor 2nd-level workings such as Hold Person.',
        mechanicKey: 'second-level-slots',
      },
      {
        id: 'learn-second-level-spell',
        name: 'Second-Level Working',
        description:
          'A new 2nd-level working enters your book — choose one: Misty Step (blink askew), Scorching Ray (three fire rays), Blur (attackers strike at disadvantage), or Mirror Image (duplicates soak the blows).',
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
        id: 'third-level-slots',
        name: 'Third-Level Slots',
        description:
          'You can now anchor 3rd-level workings. The threshold of named spells widens.',
        mechanicKey: 'third-level-slots',
      },
      {
        id: 'learn-fireball',
        name: 'Fireball',
        description:
          'A bead of ember blooms into a roar — 8d6 fire to every enemy. DEX save halves. Enemies that fail ignite: 1d6 fire at the start of your next turn.',
      },
      {
        id: 'learn-lightning-bolt',
        name: 'Lightning Bolt',
        description:
          'A jagged arc sears the room — 6d6 lightning to every enemy. DEX save halves. Even on a successful save, targets take 1d6 lightning — the arc finds you.',
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
    '7': [
      {
        id: 'fourth-level-slots',
        name: 'Fourth-Level Slots',
        description:
          'Your spellbook opens to 4th-level workings — Rime Blast, Force Lance, and the deeper craft to come.',
        mechanicKey: 'fourth-level-slots',
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
        id: 'fifth-level-slots',
        name: 'Fifth-Level Slots',
        description:
          'You can now anchor 5th-level workings — the room-clearing cones and the ruinous single-target rays.',
        mechanicKey: 'fifth-level-slots',
      },
    ],
    '11': [
      {
        id: 'sixth-level-slots',
        name: 'Sixth-Level Slots',
        description:
          'The threshold of greater magic opens — you can hold 6th-level workings.',
        mechanicKey: 'sixth-level-slots',
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
    '13': [
      {
        id: 'seventh-level-slots',
        name: 'Seventh-Level Slots',
        description:
          'You can now anchor 7th-level workings — the storms that fall indoors.',
        mechanicKey: 'seventh-level-slots',
      },
    ],
    '15': [
      {
        id: 'eighth-level-slots',
        name: 'Eighth-Level Slots',
        description:
          'You can now anchor 8th-level workings — cataclysm and the unmaking of years.',
        mechanicKey: 'eighth-level-slots',
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
        id: 'ninth-level-slots',
        name: 'Ninth-Level Workings',
        description:
          'The deepest threshold of all opens to you — reality-warping 9th-level magic. You can remake a foe, or remake yourself.',
        mechanicKey: 'ninth-level-slots',
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
  },
  preset: {
    characterName: 'Cristulio',
    recommendedRaceId: 'tiefling',
    // Tuned for INT-first study with a passable DEX/CON cushion. With
    // Tiefling's +1 INT / +2 CHA the summary reads INT 16, DEX 14, CON 13,
    // WIS 12, CHA 10, STR 8.
    abilityScores: { str: 8, dex: 14, con: 13, int: 15, wis: 12, cha: 8 },
    flavorBlurb:
      'Scholar of the older pact. Reads grimoires the way most folk read warning signs — slowly, and then twice.',
  },
  subclasses: [
    {
      id: 'evocation',
      name: 'School of Evocation',
      description:
        'You bend raw arcane force into directed ruin. Best with spell-damage and spell-DC gear that sharpens every blast you throw.',
      featuresByLevel: {
        '2': [
          {
            id: 'sculpt-spells',
            name: 'Arcane Tradition: Evocation',
            description:
              'Every evocation you loose carries one extra die of harm — your Burning Hands roars for 4d6 where a lesser mage musters 3. The same bonus die rides every blast you learn after, Fireball and Lightning Bolt among them, and only bites deeper with spell-damage and spell-DC gear.',
            mechanicKey: 'sculpt-spells',
          },
        ],
      },
    },
    {
      id: 'abjuration',
      name: 'School of Abjuration',
      description:
        'You weave a ward that drinks the first blows of every fight. Best with survivability gear that buys the squishy caster more turns.',
      featuresByLevel: {
        '2': [
          {
            id: 'abjurer',
            name: 'Arcane Tradition: Abjuration',
            description:
              'An Arcane Ward forms at the start of each combat, granting temporary hit points equal to 2 + your level that soak damage before your own. Rewards survivability gear — every extra turn alive is another spell cast.',
            mechanicKey: 'abjurer',
          },
        ],
      },
    },
    {
      id: 'illusion',
      name: 'School of Illusion',
      description:
        'You step behind a veil of false images the moment steel is drawn. Best with an evasive build that turns near-misses into untouchability.',
      featuresByLevel: {
        '2': [
          {
            id: 'illusionist',
            name: 'Arcane Tradition: Illusion',
            description:
              'You begin every combat already blurred (attackers strike with disadvantage) and with one mirror image to soak a blow. Rewards an evasive build that leans on never being hit.',
            mechanicKey: 'illusionist',
          },
        ],
      },
    },
  ],
});
