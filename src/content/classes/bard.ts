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
          'You weave magic through music and the spoken word, keyed to your Charisma — a College repertoire of control, mind-rending sound, and a little self-mending, drawn through a small pool of slots. Vicious Mockery answers at will: a withering insult that lances psychic damage, rattles its mark, and grows crueller with you — more dice as the campaigns deepen, and sharper still while your music plays. A long rest refills the well.',
        mechanicKey: 'spellcasting',
      },
      {
        id: 'bardic-inspiration',
        name: 'Battle Songs',
        description:
          'You are never not performing. From your first breath in the fight one Song is always playing — an aura that beats out its power on its own, every round, no urging needed. Turning the music to a different Song is a bonus action and spends one die of your inspiration well (Charisma-many, refreshed each fight; the die itself grows d6 → d8 → d10 → d12 as you do, and every Song rings louder with it). Two tunes open the book: the SONG OF SPITE, a jeering air that gnaws every foe with psychic hurt each round — and the SONG OF STEEL, a fortifying march that dulls every blow that lands on you.',
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
          'The well runs deeper and the music rings louder — your song die grows to a d8. Every Song pulses harder for it, and your Vicious Mockery gains a second barb.',
      },
    ],
    '6': [
      {
        id: 'leaden-dirge',
        name: 'The Leaden Dirge',
        description:
          'A third Song joins the book: a dragging, grave-slow march that hangs on enemy limbs like wet rope. While the Dirge plays, every blade raised against you swings heavy and late — their attack rolls suffer for it. Play it when the foes that remain hit hardest.',
        mechanicKey: 'leaden-dirge',
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
          'You steal the deeper workings of the wider art — the repertoire opens past the College’s own, and your song die grows to a d10. The bard who borrows everything answers anything.',
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
      {
        id: 'quickstep-reel',
        name: 'The Quickstep Reel',
        description:
          'A fourth Song joins the book: a whirling reel that puts lightning in your heels. Each round it plays, your first strike comes quickened — the blow rolls with advantage, faster than any guard can settle.',
        mechanicKey: 'quickstep-reel',
      },
    ],
    '15': [
      {
        id: 'superior-inspiration',
        name: 'Superior Inspiration',
        description:
          'The song never runs dry at the worst moment — your song die grows to a d12, the loudest the music rings. Every aura you play beats at its full depth now.',
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
          'You are the song entire — the inspiration well runs two dice deeper than ever, an endless reserve to turn the music and cut the blows that dare interrupt it. The capstone of the College’s long road.',
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
        'The true caster — a bard whose music amplifies the working. Best with caster gear (the War Lute, a spell-focus orb, spell-DC affixes); the playing Song hardens every curse and sharpens every nuke, and Cutting Words keeps the squishy support standing.',
      bottomLine: {
        archetype: 'Caster',
        levers: [
          'While your Song plays (it always plays): spell save DC +1, every spell +2 damage, growing to +5.',
          'Cutting Words: spend an Inspiration die to subtract it from an enemy hit.',
          'L10: TWO Songs at once, +1 Inspiration die.',
        ],
      },
      featuresByLevel: {
        '3': [
          {
            id: 'cutting-words',
            name: 'Bard College: College of Lore',
            description:
              'You learn to lance the gap in a foe’s confidence at the worst instant for it. When an enemy’s blow would land, spend a Bardic Inspiration die as a reaction to subtract it from the attack — enough, and the strike whistles past. The squishy caster’s guard, paid for from the same well that turns the music.',
            mechanicKey: 'cutting-words',
          },
          {
            id: 'resonant-lore',
            name: 'Resonant Lore',
            description:
              'Your workings ride the music. While a Song plays — and yours never stops — the save DC of your craft rises by 1 and every spell strikes harder, the song-die’s depth poured into each working. Hold Person, Vicious Mockery, the focused nukes: all of it bites crueller set to music.',
            mechanicKey: 'resonant-lore',
          },
        ],
        '10': [
          {
            id: 'the-duet',
            name: 'The Duet',
            description:
              'The music deepens until one throat cannot hold it — TWO Songs play at once now, their auras layered (steel under spite, the dirge under either). The inspiration well also runs one die deeper, more music to turn and more Cutting Words to spend.',
            mechanicKey: 'the-duet',
          },
        ],
      },
    },
    {
      id: 'valor',
      name: 'College of Valor',
      description:
        'The true martial — a bard who fights in the front rank and lets the music drive the blade. Best with weapon gear (a rapier or finer martial arm, medium armour); every swing under a playing Song carries the song die, the war-song girds you round on round, and you swing twice from L6.',
      bottomLine: {
        archetype: 'Striker',
        levers: [
          'Medium armour, shields, and the full martial weapon rack.',
          'Every weapon hit adds the song die (d6, growing to d12) — and the song pulses fresh temporary HP each round.',
          'L6: attack twice per Attack action.',
        ],
      },
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
            id: 'war-song',
            name: 'The War-Song',
            description:
              'In your hands every tune is a war-song. While any Song plays, each weapon blow you land carries the song die as extra hurt — no banking, no thought, the music IS the edge. And the war-song guards its singer: every round it pulses fresh temporary vigor into you, the staying power the front rank demands.',
            mechanicKey: 'war-song',
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
              'Hardened in the front rank, your war-song runs deeper — the inspiration well gains a die, more music to turn as the tide demands.',
            mechanicKey: 'combat-superiority',
          },
        ],
      },
    },
  ],
});
