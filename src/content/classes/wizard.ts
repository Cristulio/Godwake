import { ClassSchema, type Class } from '../../schemas/class';

export const WIZARD: Class = ClassSchema.parse({
  id: 'wizard',
  name: 'Wizard',
  hitDie: 6,
  primaryAbility: ['int'],
  savingThrowProficiencies: ['int', 'wis'],
  // The scholar's hands know only simple arms — dagger, quarterstaff, mace.
  weaponProficiency: { categories: ['simple'] },
  // No armour at all — the wizard's only shell is Mage Armour.
  armorProficiency: { categories: [] },
  skillChoiceCount: 2,
  skillGrantsByLevel: { '3': 1, '5': 1 },
  skillChoiceFrom: [
    'arcana',
    'history',
    'insight',
    'investigation',
    'medicine',
    'religion',
  ],
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
          'You wield Fire Bolt (1d10 fire, at-will) — a mote of flame flung from the fingertips, yours to throw as often as the fight demands.',
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
          'A bead of ember from your fingertip blooms into a roar — 8d6 fire to every enemy in the room. A successful Dexterity save halves the burn.',
      },
      {
        id: 'learn-lightning-bolt',
        name: 'Lightning Bolt',
        description:
          'A jagged white arc carves the room — 8d6 lightning to every enemy. A successful Dexterity save halves the strike.',
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
    characterName: 'Veyra Ash',
    recommendedRaceId: 'tiefling',
    // Tuned for INT-first study with a passable DEX/CON cushion. With
    // Tiefling's +1 INT / +2 CHA the summary reads INT 16, DEX 14, CON 13,
    // WIS 12, CHA 10, STR 8.
    abilityScores: { str: 8, dex: 14, con: 13, int: 15, wis: 12, cha: 8 },
    recommendedSkills: ['insight', 'medicine'],
    flavorBlurb:
      'Scholar of the older pact. Reads grimoires the way most folk read warning signs — slowly, and then twice.',
  },
  subclasses: [
    {
      id: 'evocation',
      name: 'School of Evocation',
      description:
        'You shape raw arcane force into directed harm. Your evocations bite a touch deeper than the page suggests.',
      featuresByLevel: {
        '2': [
          {
            id: 'sculpt-spells',
            name: 'Arcane Tradition: Evocation',
            description:
              'Your study settles into the School of Evocation — raw arcane force, shaped past the page. Burning Hands, Fireball, and Lightning Bolt each burn one die hotter.',
            mechanicKey: 'sculpt-spells',
          },
        ],
      },
    },
  ],
});
