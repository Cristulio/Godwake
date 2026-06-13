import { ClassSchema, type Class } from '../../schemas/class';

export const DRUID: Class = ClassSchema.parse({
  id: 'druid',
  name: 'Druid',
  hitDie: 8,
  primaryAbility: ['wis'],
  savingThrowProficiencies: ['int', 'wis'],
  // The old faith carries no edged steel into a fight it can help — sickle,
  // club, quarterstaff, sling. Simple arms only; the real weapons are word
  // and claw.
  weaponProficiency: { categories: ['simple'] },
  // Hide and leather, and a shield of living wood — nothing worked from metal,
  // by the oath of the Circle. Light armour keeps the squishy caster squishy;
  // Wild Shape is the survival lever, not plate. An orb (off-hand caster focus)
  // suits the druid's spell side too.
  armorProficiency: { categories: ['light', 'shield', 'orb'] },
  subclassLevel: 2,
  featuresByLevel: {
    '1': [
      {
        id: 'spellcasting',
        name: 'Spellcasting',
        description:
          'You draw the old power through prepared workings and a small pool of slots, keyed to your Wisdom. Produce Flame answers at will — d10 fire from a cupped hand, growing as you do. A long rest refills the well.',
        mechanicKey: 'spellcasting',
      },
      {
        id: 'druidic',
        name: 'Druidic',
        description:
          'You know Druidic, the secret tongue of the old faith — the speech of root and stormcloud, leaf-sign and weather-omen. The wild answers a voice it recognizes.',
      },
    ],
    '2': [
      {
        id: 'wild-shape',
        name: 'Wild Shape',
        description:
          'A bonus action sheds the body for a beast’s shape — you gain the beast’s vitality as temporary hit points and fight with tooth and claw until the form spends out or fades. Once each combat (the Circle of the Moon grants a second change and a sturdier beast). The vitality scales as you grow.',
        mechanicKey: 'wild-shape',
      },
    ],
    '3': [
      {
        id: 'second-circle-workings',
        name: 'Second-Circle Workings',
        description:
          'The book deepens — you can now anchor 2nd-circle workings such as Entangling Roots, which binds a foe fast where it stands.',
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
        id: 'third-circle-workings',
        name: 'Third-Circle Workings',
        description:
          'You can anchor 3rd-circle workings — Wildfire to sweep a room, Call Lightning to hammer down the one foe that matters. Produce Flame, too, burns brighter from here on.',
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
        id: 'fourth-circle-workings',
        name: 'Fourth-Circle Workings',
        description:
          'The deeper weather opens to you — 4th-circle workings such as Ice Storm, a squall of killing hail across the whole room.',
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
        id: 'fifth-circle-workings',
        name: 'Fifth-Circle Workings',
        description:
          'You can call down 5th-circle workings — Avalanche, the mountain itself answering your word.',
      },
    ],
    '11': [
      {
        id: 'sixth-circle-workings',
        name: 'Sixth-Circle Workings',
        description:
          'The greater storms come to your hand — 6th-circle workings such as Fire Storm.',
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
        id: 'seventh-circle-workings',
        name: 'Seventh-Circle Workings',
        description:
          'You can summon a tempest down indoors — 7th-circle workings, the sky falling where no sky should reach.',
      },
    ],
    '15': [
      {
        id: 'eighth-circle-workings',
        name: 'Eighth-Circle Workings',
        description:
          'The full Wrath of Silvanus is yours to spend — 8th-circle workings, the Oak Father’s ruin called down on a whole room.',
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
        id: 'ninth-circle-workings',
        name: 'Ninth-Circle Workings',
        description:
          'The deepest working of all: the Avatar of the Wilds. You let the wild pour through you whole and stand as something primeval — 30 temporary hit points, +2 AC, and every strike, claw or spell, biting far deeper.',
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
        id: 'archdruid',
        name: 'Archdruid',
        description:
          'You have become a keeper of the old faith entire. The wild never closes to you — you gain an additional Wild Shape each combat, and the beast’s vitality runs deepest of all. The capstone of the Circle’s long road.',
        mechanicKey: 'archdruid',
      },
    ],
  },
  preset: {
    characterName: 'Lureth Oakshadow',
    // WIS-first with a DEX cushion that carries AC and the finesse beast-claw.
    // With Wood Elf +2 DEX / +1 WIS the summary reads
    // WIS 16, DEX 15, CON 14, CHA 12, INT 10, STR 8.
    recommendedRaceId: 'wood-elf',
    abilityScores: { str: 8, dex: 13, con: 14, int: 10, wis: 15, cha: 12 },
    flavorBlurb:
      'Keeps the old faith where the new gods went to war. Speaks softly to the storm, and wears its teeth when soft words run out.',
  },
  subclasses: [
    {
      id: 'circle-of-the-moon',
      name: 'Circle of the Moon',
      description:
        'The Circle that walks into the fight wearing the beast. Best with a build that leans on Wild Shape — a sturdier form, a second change each combat, and the heavier Dire Claws.',
      bottomLine: {
        archetype: 'Shapeshifter',
        levers: [
          'Wild Shape twice per combat instead of once.',
          'The beast carries 8 + 3 per level temporary HP, not the circle-less 4 + 2.',
          'Dire Claws — a heavier strike ladder (1d10, then 2d6, then 2d8).',
          'Level 6: shapeshifted claws strike at +2 to hit and +2 damage (Primal Strike).',
        ],
      },
      featuresByLevel: {
        '2': [
          {
            id: 'circle-of-the-moon',
            name: 'Druid Circle: Circle of the Moon',
            description:
              'Combat Wild Shape: you can change a second time each combat, the beast you wear carries far deeper vitality, and you rend with the heavier Dire Claws. Rewards a front-line build that lives in the beast form.',
            mechanicKey: 'circle-of-the-moon',
          },
        ],
        '6': [
          {
            id: 'primal-strike',
            name: 'Primal Strike',
            description:
              'Your beast-form claws bite past hide and ward alike — nothing shrugs off the predator you have become. Every strike in the form lands surer and carves deeper.',
            mechanicKey: 'primal-strike',
          },
        ],
        '10': [
          {
            id: 'moonbound',
            name: 'Moonbound Vitality',
            description:
              'The forms you wear grow older and stronger still — the vitality of the beast deepens with every tier of your own power.',
          },
        ],
      },
    },
  ],
});
