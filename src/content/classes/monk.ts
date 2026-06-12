import { ClassSchema, type Class } from '../../schemas/class';

export const MONK: Class = ClassSchema.parse({
  id: 'monk',
  name: 'Monk',
  hitDie: 8,
  primaryAbility: ['dex'],
  savingThrowProficiencies: ['str', 'dex'],
  // The empty hand and a few simple arms — the body is the weapon, and the
  // discipline forbids leaning on a heavier blade. Shortsword is the one martial
  // exception the old schools permit.
  weaponProficiency: { categories: ['simple'], ids: ['shortsword'] },
  // No armour at all. The guard is breath, stance, and read — Unarmored Defense
  // does the work that plate would, and steel would only slow the flurry.
  armorProficiency: { categories: [] },
  subclassLevel: 3,
  featuresByLevel: {
    '1': [
      {
        id: 'martial-arts',
        name: 'Martial Arts',
        description:
          'Your fists are the weapon. Unarmed strikes fall as a d6 and ride your Dexterity, and the die grows as you do — d8 at 5th, d10 at 11th, d12 at 17th. The whole school is built to spend Ki and bury a foe in blows. Temple arms — staff, kama, glaive — flow with the forms: Ki keeps its footing while the weapon swings its own steel, but the growing die belongs to the empty hand alone.',
        mechanicKey: 'martial-arts',
      },
      {
        id: 'unarmored-defense-monk',
        name: 'Unarmored Defense',
        description:
          'Worn light and read close — with no armour your guard is breath and instinct: AC becomes 10 + your Dexterity + your Wisdom. Steel would only cost you the stance.',
        mechanicKey: 'unarmored-defense-wis',
      },
      {
        id: 'ki',
        name: 'Ki',
        description:
          'You carry a well of inner force — Ki points equal to your level, spent on Flurry of Blows, Patient Defense, and the strikes that follow. The well refills as each fight begins.',
        mechanicKey: 'ki',
      },
      {
        id: 'flurry-of-blows',
        name: 'Flurry of Blows',
        description:
          'A bonus action and 1 Ki rains two extra unarmed strikes this turn — the signature deluge that turns a single opening into a storm of fists.',
        mechanicKey: 'flurry-of-blows',
      },
    ],
    '2': [
      {
        id: 'patient-defense',
        name: 'Patient Defense',
        description:
          'A bonus action and 1 Ki settles you into a flowing guard — every attack against you until your next turn is rolled at disadvantage. The answer to a turn you expect to weather.',
        mechanicKey: 'patient-defense',
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
          'You can strike twice, instead of once, whenever you take the Attack action — and your Martial Arts die grows to a d8.',
        mechanicKey: 'extra-attack',
      },
      {
        id: 'stunning-strike',
        name: 'Stunning Strike',
        description:
          'Arm the blow with 2 Ki: the next unarmed hit that lands forces the target to save against your Ki or be staggered, losing its next turn. The tempo play that opens a window the flurry pours through.',
        mechanicKey: 'stunning-strike',
      },
    ],
    '6': [
      {
        id: 'ki-empowered-strikes',
        name: 'Ki-Empowered Strikes',
        description:
          'Your unarmed strikes carry the weight of channelled Ki — every fist lands for +1 damage from here on.',
        mechanicKey: 'ki-empowered',
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
        id: 'relentless-flurry',
        name: 'Relentless Flurry',
        description:
          'The deluge deepens — Flurry of Blows now throws three extra strikes for its single Ki instead of two. Few openings survive the full count.',
        mechanicKey: 'flurry-three',
      },
    ],
    '11': [
      {
        id: 'martial-arts-die-d10',
        name: 'Honed Fists',
        description:
          'Years of the form sharpen every motion — your Martial Arts die grows to a d10.',
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
    '17': [
      {
        id: 'martial-arts-die-d12',
        name: 'Iron Fists',
        description:
          'The body itself becomes the master weapon — your Martial Arts die grows to a d12.',
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
        id: 'perfect-self',
        name: 'Perfect Self',
        description:
          'The well never truly runs dry. Your Ki pool deepens, and Flurry of Blows throws a fourth strike — a whole turn of fists no single body weathers. The capstone of the long road of the empty hand.',
        mechanicKey: 'perfect-self',
      },
    ],
  },
  preset: {
    characterName: 'Shen Ironroot',
    // DEX-first with a WIS cushion that carries both Unarmored Defense AC and the
    // Ki save DC. With Wood Elf +2 DEX / +1 WIS the summary reads
    // DEX 17, WIS 15, CON 14, STR 12, INT 10, CHA 8.
    recommendedRaceId: 'wood-elf',
    abilityScores: { str: 12, dex: 15, con: 14, int: 10, wis: 14, cha: 8 },
    flavorBlurb:
      'Carries no blade and needs none. Reads the breath of a room, then fills it with fists faster than a foe can answer.',
  },
  subclasses: [
    {
      id: 'way-of-the-open-hand',
      name: 'Way of the Open Hand',
      description:
        'The pure striker’s tradition — every flurry can knock the wind from a foe. Best with a build that leans into the deluge of unarmed blows.',
      bottomLine: {
        archetype: 'Striker',
        levers: [
          'While a Flurry pours out, every unarmed strike hits +2 harder (L10: +4).',
          'L6: once per fight, steady with temporary HP equal to your level.',
          'L10: Stunning Strike arms for 2 Ki, down from 3.',
        ],
      },
      featuresByLevel: {
        '3': [
          {
            id: 'open-hand-technique',
            name: 'Monastic Tradition: Open Hand',
            description:
              'Your Flurry of Blows batters the guard open — while a flurry is in play your unarmed strikes bite for extra damage, turning the deluge into a finisher.',
            mechanicKey: 'open-hand-technique',
          },
        ],
        '10': [
          {
            id: 'ki-focus',
            name: 'Ki Focus',
            description:
              'The well runs closer to the surface. Stunning Strike now costs only a single point of Ki to arm, and the extra bite your Flurry already lands deepens further — every strike while a flurry pours out hits harder still.',
            mechanicKey: 'ki-focus',
          },
        ],
        '6': [
          {
            id: 'wholeness-of-body',
            name: 'Wholeness of Body',
            description:
              'Once each fight you can knit your own wounds — at the start of combat you steady with a cushion of temporary HP equal to your level.',
            mechanicKey: 'wholeness-of-body',
          },
        ],
      },
    },
    {
      id: 'way-of-shadow',
      name: 'Way of Shadow',
      description:
        'The shadow tradition — the first blow of a fight is always a killing one. Best with a build that wants its opener to land hardest.',
      bottomLine: {
        archetype: 'Ambusher',
        levers: [
          'The first unarmed strike of every fight lands with advantage, +3 damage.',
          'L10: the opener drives +6 home instead.',
        ],
      },
      featuresByLevel: {
        '3': [
          {
            id: 'shadow-strike',
            name: 'Monastic Tradition: Shadow',
            description:
              'You step from the dark unseen — the first unarmed strike of every fight lands with advantage and drives extra Ki-charged damage home.',
            mechanicKey: 'shadow-strike',
          },
        ],
        '10': [
          {
            id: 'cloak-of-shadows',
            name: 'Cloak of Shadows',
            description:
              'You wear the dark like a second skin. The opening strike you make from shadow drives even more Ki-charged ruin home — the unseen first blow of every fight hits harder than ever, the surest opener on the road of the empty hand.',
            mechanicKey: 'cloak-of-shadows',
          },
        ],
      },
    },
  ],
});
