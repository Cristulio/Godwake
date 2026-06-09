import { ClassSchema, type Class } from '../../schemas/class';

export const BARD: Class = ClassSchema.parse({
  id: 'bard',
  name: 'Bard',
  hitDie: 8,
  primaryAbility: ['cha'],
  savingThrowProficiencies: ['dex', 'cha'],
  // The lyric craft, not the smith's: every simple arm, plus the finesse blades
  // (rapier, shortsword, dagger), the hand crossbow, and the War Lute — a CHA
  // caster-weapon. The College of Valor opens the full martial rack on top.
  weaponProficiency: {
    categories: ['simple'],
    properties: ['finesse'],
    ids: ['war-lute', 'hand-crossbow'],
  },
  // Light leathers and a caster orb off-hand — the support stays nimble. Valor's
  // Martial Training adds medium armour + shields atop this (enforced in equip).
  armorProficiency: { categories: ['light', 'orb'] },
  subclassLevel: 3,
  featuresByLevel: {
    '1': [
      {
        id: 'spellcasting',
        name: 'Spellcasting',
        description:
          'You weave magic through music and the spoken word, keyed to your Charisma — a College repertoire of control, mind-rending sound, and a little self-mending, drawn through a small pool of slots. Vicious Mockery answers at will, a withering insult that lances psychic damage and rattles its mark. A long rest refills the well.',
        mechanicKey: 'spellcasting',
      },
      {
        id: 'bardic-inspiration',
        name: 'Bardic Inspiration',
        description:
          'A pool of inspiration dice — Charisma-many, refreshed each fight — you spend on your OWN rolls. A bonus action banks a die onto your next attack roll (it grows d6 → d8 → d10 → d12 as you do), the lift that lands your War Lute or blade. The College reshapes how the die is spent: Valor pours it into weapon damage, Lore spends it to unmake an enemy’s strike.',
        mechanicKey: 'bardic-inspiration',
      },
    ],
    '2': [
      {
        id: 'jack-of-all-trades',
        name: 'Jack of All Trades',
        description:
          'A little of everything sticks. You add half your proficiency bonus to any check you are not already trained in — the breadth that makes you a dangerous generalist whenever the road tests wit, nerve, or a silver tongue.',
        mechanicKey: 'jack-of-all-trades',
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
        id: 'font-of-inspiration',
        name: 'Font of Inspiration',
        description:
          'The well runs deeper and the dice ring louder — your Bardic Inspiration die grows to a d8. The lift you lend your own rolls bites harder from here on.',
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
    '10': [
      {
        id: 'magical-secrets',
        name: 'Magical Secrets',
        description:
          'You steal the deeper workings of the wider art — the repertoire opens past the College’s own, and your Bardic Inspiration die grows to a d10. The bard who borrows everything answers anything.',
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
        id: 'superior-inspiration',
        name: 'Superior Inspiration',
        description:
          'The song never runs dry at the worst moment — your Bardic Inspiration die grows to a d12, the loudest the well rings.',
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
        id: 'peerless-performer',
        name: 'Peerless Performer',
        description:
          'You are the song entire — the inspiration well runs two dice deeper than ever, an endless reserve of lift to spend on your own art. The capstone of the College’s long road.',
        mechanicKey: 'peerless-performer',
      },
    ],
  },
  preset: {
    characterName: 'Sylvaine Mourncaller',
    recommendedRaceId: 'tiefling',
    // CHA-first (spells + Bardic Inspiration), DEX second for finesse blades and
    // AC, with a CON cushion so the support doesn't fold. With Tiefling's +2 CHA
    // / +1 INT the summary reads CHA 18, DEX 14, CON 14, WIS 12, INT 11, STR 8.
    abilityScores: { str: 8, dex: 14, con: 14, int: 10, wis: 12, cha: 16 },
    flavorBlurb:
      'Talks her way past most of it and sings down what’s left. Stands alone where she has to, and is rarely the one who falls.',
  },
  subclasses: [
    {
      id: 'lore',
      name: 'College of Lore',
      description:
        'The true caster — a bard who turns the whole fight with word and working. Best with caster gear (the War Lute, a spell-focus orb, spell-DC affixes); leans on Cutting Words to keep the squishy support standing.',
      featuresByLevel: {
        '3': [
          {
            id: 'cutting-words',
            name: 'Bard College: College of Lore',
            description:
              'You learn to lance the gap in a foe’s confidence at the worst instant for it. When an enemy’s blow would land, spend a Bardic Inspiration die as a reaction to subtract it from the attack — enough, and the strike whistles past. The squishy caster’s guard, paid for from the same well it inspires with.',
            mechanicKey: 'cutting-words',
          },
          {
            id: 'lore-savant',
            name: 'Lore Savant',
            description:
              'Your command of the lyric craft hardens every binding and curse — the save DC of your workings rises by 1. Hold Person, Power Word, Vicious Mockery: all that bit harder to shrug.',
            mechanicKey: 'lore-savant',
          },
        ],
        '10': [
          {
            id: 'peerless-skill',
            name: 'Peerless Skill',
            description:
              'Additional Magical Secrets, and a well that never empties when it counts — your inspiration pool runs one die deeper, more Cutting Words to turn aside, more lift to spend on your own strikes.',
            mechanicKey: 'peerless-skill',
          },
        ],
      },
    },
    {
      id: 'valor',
      name: 'College of Valor',
      description:
        'The true martial — a bard who fights in the front rank and sings between the blows. Best with weapon gear (a rapier or finer martial arm, medium armour); pours Bardic Inspiration into damage and swings twice from L6.',
      featuresByLevel: {
        '3': [
          {
            id: 'martial-training',
            name: 'Bard College: College of Valor',
            description:
              'The war-skald’s training: you take up medium armour, shields, and the full martial weapon rack — the front-line kit the caster-bard goes without. You walk into the worst of it now, not around it.',
            mechanicKey: 'martial-training',
          },
          {
            id: 'combat-inspiration',
            name: 'Combat Inspiration',
            description:
              'Your inspiration no longer steadies the aim — it drives the blow. A banked Bardic Inspiration die pours into your weapon hit’s DAMAGE instead of the attack roll, the war-song made edge.',
            mechanicKey: 'combat-inspiration',
          },
        ],
        '6': [
          {
            id: 'extra-attack',
            name: 'Extra Attack',
            description:
              'The blade keeps time with the song — you can attack twice, instead of once, whenever you take the Attack action on your turn.',
            mechanicKey: 'extra-attack',
          },
        ],
        '10': [
          {
            id: 'combat-superiority',
            name: 'Battle Magic',
            description:
              'Hardened in the front rank, your war-song runs deeper — the inspiration pool gains a die, more Combat Inspiration to drive into every swing.',
            mechanicKey: 'combat-superiority',
          },
        ],
      },
    },
  ],
});
