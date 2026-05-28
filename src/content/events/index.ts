import { EventTemplateSchema, type EventTemplate } from '../../schemas/event';
import { buildAllIntelEventTemplates } from '../bossIntel';

const POOL: EventTemplate[] = [
  // ─── Chapter 1: Iron Cells — simple, low-stakes choices ───────────────
  EventTemplateSchema.parse({
    id: 'pale-cleric-shrine',
    title: 'A Pale Cleric at a Roadside Shrine',
    flavor:
      "A woman in moth-eaten Ilmatari grey sits on the lip of a cracked basin, hands folded in her lap. She does not look up when you approach. \"Will you sit? The Crying God listens better when two hearts pause together.\"",
    minChapter: 1,
    choices: [
      {
        id: 'sit',
        label: 'Sit with her',
        hint: 'A coin in the basin, a breath shared.',
        requiresGold: 5,
        outcome: {
          resolution:
            'You drop a copper in the basin. She closes her eyes. Something in your chest goes quiet for the first time in a long walk.',
          effects: [
            { kind: 'gold_delta', amount: -5 },
            { kind: 'hp_delta', amount: 5 },
          ],
        },
      },
      {
        id: 'speak-gently',
        label: '[Charisma] Speak gently with her',
        hint: 'The Crying God listens to a kind word.',
        requiresCha: 1,
        outcome: {
          resolution:
            'You crouch and put words to the ache in her shoulders before she names it herself. She lifts her eyes for the first time and tells you a small story about her sister. When you stand, her thumb has marked Ilmater\'s tear on your brow, and her god rides a little of the road with you.',
          effects: [
            { kind: 'hp_delta', amount: 4 },
            { kind: 'grant_blessing', random: true },
          ],
        },
      },
      {
        id: 'refuse',
        label: 'Refuse and walk on',
        hint: 'The Crying God notices.',
        outcome: {
          resolution:
            'She does not call after you. But two steps down the road you stumble on a stone that was not there a moment ago, and your shin sings against it.',
          effects: [{ kind: 'hp_delta', amount: -1 }],
        },
      },
      {
        id: 'steal',
        label: 'Steal from the basin',
        hint: 'A handful of coppers, a god\'s mark.',
        outcome: {
          resolution:
            'You scoop the alms before she lifts her eyes. Her lips move but no sound comes. You walk faster than you mean to.',
          effects: [
            { kind: 'gold_delta', amount: 10 },
            {
              kind: 'grant_quirk_reroll',
              fallbackText: 'Ilmater finds no bane to shake from you — only a tear briefly cool on your brow.',
            },
          ],
        },
      },
    ],
  }),

  EventTemplateSchema.parse({
    id: 'cracked-mirror',
    title: 'A Cracked Mirror in the Dust',
    flavor:
      "Propped against a fallen beam, a hand-mirror with a single hairline crack splitting your face into two strangers. The left one is smiling. You are not.",
    minChapter: 1,
    choices: [
      {
        id: 'press',
        label: 'Press your palm to the glass',
        hint: 'Cut yourself; the reflection wakes up.',
        requiresHpAtLeast: 6,
        outcome: {
          resolution:
            "The crack bites the meat of your hand and the left-you blinks once, slow, then bows. You feel something sharpen — not the blade, the swing.",
          effects: [
            { kind: 'hp_delta', amount: -4 },
            { kind: 'apply_attack_bonus_run', amount: 1 },
          ],
        },
      },
      {
        id: 'leave',
        label: 'Cover it back over',
        hint: 'Some doors don\'t want opening.',
        outcome: {
          resolution: 'You drag a fold of cloth over the mirror and step past. The dust settles. You feel like yourself again — which is its own loss.',
          effects: [],
        },
      },
      {
        id: 'shatter',
        label: 'Shatter the glass',
        hint: 'Seven years\' bad luck — or a god\'s favour.',
        outcome: {
          random: [
            {
              weight: 60,
              outcome: {
                resolution:
                  'The glass crackles into seven shards. From under the largest, a thread of warm light reaches for your hand and folds itself into a sigil there.',
                effects: [{ kind: 'grant_blessing', random: true }],
              },
            },
            {
              weight: 40,
              outcome: {
                resolution:
                  'The shards bite back. A sliver opens your forearm before you catch yourself. The mirror is just glass now.',
                effects: [{ kind: 'hp_delta', amount: -3 }],
              },
            },
          ],
        },
      },
    ],
  }),

  EventTemplateSchema.parse({
    id: 'wounded-captain',
    title: 'A Wounded Captain',
    flavor:
      "A bandit deserter — captain's tabard, captain's split lip — propped against the wall with one hand pressed to his side. \"Coin in my purse for a wound that won't stop bleeding. Take a blow for me, walker. I'm done. The other lads won't be.\"",
    minChapter: 1,
    choices: [
      {
        id: 'take-the-blow',
        label: 'Take the blow for him',
        hint: 'A real wound, real coin.',
        outcome: {
          resolution:
            "He draws a dirk and opens you between two ribs with a craftsman's care. \"That'll satisfy them.\" He drops the purse and is gone before you can answer.",
          effects: [
            { kind: 'hp_delta', amount: -5 },
            { kind: 'gold_delta', amount: 30 },
          ],
        },
      },
      {
        id: 'walk-past',
        label: 'Walk past him',
        hint: "Not your war.",
        outcome: {
          resolution:
            'He spits after you but lacks the breath to follow. You leave him to whichever god he has bargained with this time.',
          effects: [],
        },
      },
      {
        id: 'loot-him',
        label: 'Loot him where he sits',
        hint: "He hasn't the strength to stop you — unless he does.",
        successChance: 0.65,
        outcome: {
          resolution:
            'His curses follow you down the corridor. You pocket a few silver and a folded letter you cannot read. The road will weigh on you for it.',
          effects: [
            { kind: 'gold_delta', amount: 5 },
            {
              kind: 'grant_quirk_reroll',
              fallbackText: 'The road finds no bane to shake from you. The captain\'s curses fade to coughing behind you.',
            },
          ],
        },
        failureOutcome: {
          resolution:
            'He finds one last knife as you bend over him. It bites your thigh before you can stand. By the time you wrench free he is laughing and bleeding both, and your hands are empty.',
          effects: [{ kind: 'hp_delta', amount: -4 }],
        },
      },
    ],
  }),

  EventTemplateSchema.parse({
    id: 'whispering-door',
    title: 'A Whispering Door',
    flavor:
      "A door of black wood set crookedly into the corridor, where no architect would have left one. The latch whispers to itself in a language that is almost yours.",
    minChapter: 1,
    choices: [
      {
        id: 'lift-latch',
        label: 'Lift the latch',
        hint: 'A god or a fang.',
        outcome: {
          random: [
            {
              weight: 50,
              outcome: {
                resolution:
                  'A breath of warm air, smelling of cedar and old wine. A sigil burns itself into your palm and is gone, leaving only the weight of grace.',
                effects: [{ kind: 'grant_blessing', random: true }],
              },
            },
            {
              weight: 50,
              outcome: {
                resolution:
                  'The door swings wide on a knot of small green shapes that have been waiting for it. Steel meets you before flavor does.',
                effects: [{ kind: 'spawn_ambush', monsterDefIds: ['goblin', 'goblin'] }],
              },
            },
          ],
        },
      },
      {
        id: 'walk-on',
        label: 'Walk on',
        hint: 'Some latches are not for lifting.',
        outcome: {
          resolution: 'You leave the whisper behind. Half a corridor on, it is gone — or you are.',
          effects: [],
        },
      },
    ],
  }),

  EventTemplateSchema.parse({
    id: 'bones-on-stake',
    title: 'Bones on a Stake',
    flavor:
      "Someone has driven an iron rod into the floor of the cell-block and crowned it with a knuckle, two ribs, and a jaw of something that died here in better light.",
    minChapter: 1,
    choices: [
      {
        id: 'take',
        label: 'Pluck the jaw from the stake',
        hint: 'A curse, but the dead keep walking faster.',
        outcome: {
          resolution: 'The jaw fits your pocket as though it has been waiting for it. You feel cold across the shoulders, and quicker on your feet.',
          effects: [
            { kind: 'hp_delta', amount: -1 },
            { kind: 'init_bonus_run', amount: 1 },
          ],
        },
      },
      {
        id: 'leave',
        label: 'Leave the dead their ornament',
        hint: 'No one ever steals from a corpse for free.',
        outcome: {
          resolution: 'You step around the stake and the corridor goes on. The bones do not turn to watch.',
          effects: [],
        },
      },
      {
        id: 'spit',
        label: 'Spit on it',
        hint: 'A copper from your boot for the affront.',
        outcome: {
          resolution: 'You spit, and a copper rattles out of your boot-cuff. You stoop, pocket it, and walk on with the dead\'s good opinion or its very bad one.',
          effects: [{ kind: 'gold_delta', amount: 1 }],
        },
      },
    ],
  }),

  EventTemplateSchema.parse({
    id: 'rats-in-the-grain',
    title: 'Rats in the Grain Sack',
    flavor:
      "A guard's mess-sack, half-eaten through. Two rats lift their heads at you with the calm of small things that have not been hunted in this corridor.",
    minChapter: 1,
    choices: [
      {
        id: 'cook',
        label: 'Drive them off and take the grain',
        hint: 'Sour bread, but bread.',
        outcome: {
          resolution: 'You stamp twice. The rats vanish into the wall. The bread is hard but honest. You feel a small steadiness return.',
          effects: [{ kind: 'temp_hp', amount: 3 }],
        },
      },
      {
        id: 'leave',
        label: 'Leave the rats their dinner',
        hint: 'No fight worth the bite of a sick rat.',
        outcome: {
          resolution: 'You step past. The smaller rat watches you the full length of the corridor.',
          effects: [],
        },
      },
    ],
  }),

  // ─── Chapter 2: Athkatla — coin-flavored choices ─────────────────────
  EventTemplateSchema.parse({
    id: 'beggar-at-the-gate',
    title: 'A Beggar at the Gate',
    flavor:
      "A bone-thin man in Waukeen's faded yellow squats by the customs post. \"A coin, walker. A coin and the merchant queen counts you fair on her scales.\"",
    minChapter: 2,
    choices: [
      {
        id: 'give',
        label: 'Drop a silver in his hand',
        hint: 'Waukeen marks the giver.',
        requiresGold: 5,
        outcome: {
          resolution:
            'He folds the coin into his sleeve without looking. "She sees you, walker. The scale tips true." Something warm settles between your shoulderblades.',
          effects: [
            { kind: 'gold_delta', amount: -5 },
            { kind: 'grant_blessing', random: true },
          ],
        },
      },
      {
        id: 'walk-past',
        label: 'Walk past him',
        hint: 'A coin saved is a coin.',
        outcome: {
          resolution: 'He says nothing. You feel his eyes on the back of your neck the full length of the alley.',
          effects: [],
        },
      },
      {
        id: 'kick-the-bowl',
        label: 'Kick his alms-bowl',
        hint: 'The coins are yours now — if the city does not see.',
        successChance: 0.7,
        outcome: {
          resolution: "The bowl skitters; coins roll to your boot. He does not cry out — Waukeen does not love a beggar's complaint. You scoop and walk, the city none the wiser.",
          effects: [
            { kind: 'gold_delta', amount: 8 },
            {
              kind: 'grant_quirk_reroll',
              fallbackText: 'Waukeen finds no bane to shake from you — her scale tips clean today.',
            },
          ],
        },
        failureOutcome: {
          resolution: "The bowl rings against the cobbles and a customs-man's whistle answers from the arch. Two hands take you by the shoulders and a third by the ribs before you can run. You leave bruised and lighter.",
          effects: [{ kind: 'hp_delta', amount: -4 }],
        },
      },
    ],
  }),

  EventTemplateSchema.parse({
    id: 'cowled-recruiter',
    title: 'A Cowled Recruiter in the Shadow of an Arch',
    flavor:
      "A figure in the grey-and-blue of the Cowled Wizards steps out of an arch as if from the stone itself. \"You walk loud, walker. The Cowl licenses talent. A small payment, and a small protection — name your wager.\"",
    minChapter: 2,
    choices: [
      {
        id: 'pay-the-cowl',
        label: 'Pay the Cowl their tax',
        hint: 'A heavy purse, a steady hand.',
        requiresGold: 25,
        outcome: {
          resolution:
            'They tuck the coin into a sleeve embroidered with mage-marks and press a chalk-sigil onto the back of your hand. Your grip on the blade feels surer for the rest of the road.',
          effects: [
            { kind: 'gold_delta', amount: -25 },
            { kind: 'apply_attack_bonus_run', amount: 1 },
          ],
        },
      },
      {
        id: 'wave-them-off',
        label: 'Wave them off',
        hint: 'The Cowl is a long memory.',
        outcome: {
          resolution: 'They step back into the arch. The stone closes seamless behind them. The street goes very quiet.',
          effects: [],
        },
      },
      {
        id: 'bluff-the-cowl',
        label: '[Charisma] Bluff the recruiter',
        hint: 'Name-drop a Cowled superior you have never met.',
        requiresCha: 2,
        outcome: {
          resolution:
            'You drop a name with the calm of a man who has stood in chambers above this one. The Cowl\'s eyes flicker — the briefest re-evaluation — and the chalk-sigil presses onto your hand without a coin asked. They step back into the arch, the stone sealing behind them, and you walk on with a wizard\'s mark and a wizard\'s purse intact.',
          effects: [{ kind: 'apply_attack_bonus_run', amount: 1 }],
        },
      },
      {
        id: 'draw-on-them',
        label: 'Draw on them',
        hint: 'A wizard is a wizard.',
        outcome: {
          resolution:
            "A snap of fingers, a smell of ozone, and you are on the cobbles with the wind kicked from your chest. They are gone before you can stand. \"Lesson one,\" the arch says, \"is paid in advance.\"",
          effects: [{ kind: 'hp_delta', amount: -6 }],
        },
      },
    ],
  }),

  EventTemplateSchema.parse({
    id: 'wine-merchant',
    title: 'A Wine-Merchant\'s Hospitality',
    flavor:
      "A man in a saffron coat leans across his counter with a cup already poured. \"On the house, walker. A taste of Amnian red. The cellar has more — for those with coin and the throat for it.\"",
    minChapter: 2,
    choices: [
      {
        id: 'free-cup',
        label: 'Accept the free cup',
        hint: 'Warmth and a small ache.',
        outcome: {
          resolution:
            'You drain it. It is better than it has any right to be. Your head goes loose; your arm goes long. You feel a half-step quicker but a half-step less guarded.',
          effects: [
            { kind: 'init_bonus_run', amount: 1 },
            { kind: 'hp_delta', amount: -2 },
          ],
        },
      },
      {
        id: 'buy-bottle',
        label: 'Buy a bottle for the road',
        hint: 'Coin for steadier sleep.',
        requiresGold: 15,
        outcome: {
          resolution:
            'He wraps the bottle in waxed cloth and slips it into your pack. The first swallow on the road tomorrow knits something the day broke.',
          effects: [
            { kind: 'gold_delta', amount: -15 },
            { kind: 'hp_delta', amount: 8 },
          ],
        },
      },
      {
        id: 'haggle',
        label: '[Charisma] Haggle for the bottle',
        hint: 'A smile, a story of the road, a price brought down.',
        requiresGold: 8,
        requiresCha: 1,
        outcome: {
          resolution:
            'You spin him a tale about Amnian summers and a sister who married a vintner. He laughs and waves a hand. "Half price for a walker who knows the country, then." The bottle goes into your pack at a thief\'s rate.',
          effects: [
            { kind: 'gold_delta', amount: -8 },
            { kind: 'hp_delta', amount: 8 },
          ],
        },
      },
      {
        id: 'decline',
        label: 'Decline with thanks',
        hint: 'The road is long and Athkatla wine is a long memory.',
        outcome: {
          resolution: 'He inclines his head, unhurt. "Another day, then." You leave with the smell of cedar and brandy following you down the lane.',
          effects: [],
        },
      },
    ],
  }),

  EventTemplateSchema.parse({
    id: 'street-orphan',
    title: 'A Street Orphan with a Knife',
    flavor:
      "A boy of perhaps ten steps out of an arch with a small knife held the wrong way. His coat is too thin for the season. \"Purse,\" he says, the word too big for him. \"Purse, walker.\"",
    minChapter: 2,
    choices: [
      {
        id: 'pay',
        label: 'Hand him a few coins',
        hint: 'Buy him a meal, buy yourself the road.',
        requiresGold: 3,
        outcome: {
          resolution:
            "He stares at the coins as if they might bite. Then he turns and is gone. You hope, against the city, that he eats them and not a knife in the dark for them.",
          effects: [{ kind: 'gold_delta', amount: -3 }],
        },
      },
      {
        id: 'disarm',
        label: 'Take the knife from him',
        hint: 'Gentle hands, hard lesson.',
        outcome: {
          resolution:
            'You catch his wrist and turn the blade. He stares at his empty hand for a long beat. \"Eat,\" you say, and press a coin into the palm. He runs. Something in your chest unclenches.',
          effects: [{ kind: 'temp_hp', amount: 4 }],
        },
      },
      {
        id: 'cuff-him',
        label: 'Cuff him aside and walk on',
        hint: 'Athkatla teaches its children — if the swing lands clean.',
        successChance: 0.7,
        outcome: {
          resolution: 'He sprawls in the gutter. The knife rings on the cobbles. A handful of silver spills from a torn lining you hadn\'t noticed; you pocket it without looking back.',
          effects: [
            { kind: 'gold_delta', amount: 5 },
            {
              kind: 'grant_quirk_reroll',
              fallbackText: 'Athkatla finds no bane to shake from you — the city marks its lesson and lets you walk.',
            },
          ],
        },
        failureOutcome: {
          resolution: 'He ducks under the cuff with the speed of a thing that has done it before, and the blade catches the back of your hand on the way past. He is into an alley before you can curse, and the knife goes with him.',
          effects: [{ kind: 'hp_delta', amount: -3 }],
        },
      },
    ],
  }),

  EventTemplateSchema.parse({
    id: 'oghma-scribe',
    title: 'A Scribe of Oghma',
    flavor:
      "A bald man in white linen squats in the lee of a wall with a folio open on his knees. He looks up as you pass. \"A line of your road, walker. The Binder pays for stories. A copper for a name, a silver for a why.\"",
    minChapter: 2,
    choices: [
      {
        id: 'sell-name',
        label: 'Give him your name',
        hint: 'A copper paid for a copper given.',
        outcome: {
          resolution:
            'He inks the name with quick, clean strokes. "The Binder remembers, walker." A coin rings on the cobble between your boots.',
          effects: [{ kind: 'gold_delta', amount: 1 }],
        },
      },
      {
        id: 'sell-story',
        label: 'Tell him the why',
        hint: 'A silver, and a heaviness lifted.',
        outcome: {
          resolution:
            'You give him a piece of yourself that you did not know you still carried. He writes it small. When he is done, the air feels less full of you. The silver in your hand is warm.',
          effects: [
            { kind: 'gold_delta', amount: 1 },
            { kind: 'temp_hp', amount: 3 },
          ],
        },
      },
      {
        id: 'walk-on',
        label: 'Tell him nothing',
        hint: 'A walker who is not in any book lasts longer.',
        outcome: {
          resolution: 'He inclines his head. "Another day." The folio closes without complaint.',
          effects: [],
        },
      },
    ],
  }),

  // ─── Chapter 3: Spellhold — deeper trade-offs ────────────────────────
  EventTemplateSchema.parse({
    id: 'mad-prisoner-bargain',
    title: 'A Mad Prisoner with a Bargain',
    flavor:
      "A man in a shredded asylum smock presses his cheek to the bars of his cell. \"Walker. Walker. Take it. Take it from me. I'll be lighter. You'll be richer. The Director won't notice — he never notices.\" His hand pushes through the bars holding a velvet purse far too heavy for it.",
    minChapter: 3,
    choices: [
      {
        id: 'take-the-purse',
        label: 'Take the purse',
        hint: 'He says it weighs on him. He may not be wrong.',
        outcome: {
          resolution:
            "The purse is heavier than it should be. Inside: coin, and something else that goes still in your pocket. The man laughs once and you cannot say what is funny.",
          effects: [
            { kind: 'gold_delta', amount: 40 },
            {
              kind: 'grant_quirk_reroll',
              fallbackText: 'The asylum finds no bane to shake from you — only a small laugh from the cell at your back.',
            },
          ],
        },
      },
      {
        id: 'talk-down',
        label: '[Charisma] Talk him down',
        hint: 'A calm voice between the bars; a name remembered for him.',
        requiresCha: 2,
        outcome: {
          resolution:
            'You crouch to his level and speak with the steadiness of a stranger who is not afraid of him. He blinks. Once. Twice. Then he hands the purse through the bars with both hands, like a child returning a borrowed thing. "Yours, walker. Yours. Not the Director\'s. Not anymore." The weight in your pocket is clean.',
          effects: [{ kind: 'gold_delta', amount: 40 }],
        },
      },
      {
        id: 'leave-him',
        label: 'Leave him to his weight',
        hint: 'Some mercies are not yours to give.',
        outcome: {
          resolution: 'He keens once when you turn away. The keen falls behind you, then below you, then is gone.',
          effects: [],
        },
      },
      {
        id: 'pry-the-bars',
        label: 'Pry the bars open',
        hint: 'A blade against iron. A back against the wall.',
        outcome: {
          random: [
            {
              weight: 35,
              outcome: {
                resolution:
                  "He goes still when the bar gives. \"Oh. Oh thank you, walker.\" He presses something cold into your hand and shows you which corridor the warden's keys hang on. A great weight comes off you both.",
                effects: [
                  { kind: 'grant_blessing', random: true },
                  { kind: 'gold_delta', amount: 15 },
                ],
              },
            },
            {
              weight: 65,
              outcome: {
                resolution:
                  "He is on you the moment the bar gives, hands at your throat with the strength of grief and starvation. You break loose. The bars are crooked behind you and the corridor is loud.",
                effects: [
                  { kind: 'hp_delta', amount: -7 },
                  { kind: 'spawn_ambush', monsterDefIds: ['mad-mage-prisoner'] },
                ],
              },
            },
          ],
        },
      },
    ],
  }),

  EventTemplateSchema.parse({
    id: 'hollow-library',
    title: 'A Hollow Library',
    flavor:
      "A reading-room behind a half-locked door — the shelves stripped, save for one folio left open on a lectern. The page is blank. As you watch, a single line of ink runs itself across the parchment.",
    minChapter: 3,
    choices: [
      {
        id: 'read-the-line',
        label: 'Read the line aloud',
        hint: 'Mystra hears.',
        outcome: {
          resolution:
            'You speak the syllables. The page goes warm. Something coils into your chest — a small thread of the Weave, willing to ride with you the rest of the road.',
          effects: [{ kind: 'grant_blessing_id', id: 'mystras-whisper' }],
        },
      },
      {
        id: 'tear-out-the-page',
        label: 'Tear out the page',
        hint: 'A folded prize, a debt unpaid.',
        outcome: {
          resolution:
            'The parchment tears like skin. You pocket it. Two corridors later your nose bleeds without warning and stops as suddenly. The page is gone from your pocket. Something in your purse rings.',
          effects: [
            { kind: 'hp_delta', amount: -3 },
            { kind: 'gold_delta', amount: 20 },
          ],
        },
      },
      {
        id: 'close-the-folio',
        label: 'Close the folio and walk on',
        hint: 'Some readings are debts.',
        outcome: {
          resolution: 'The cover settles. The line is gone. The room is just a room again, and quieter for it.',
          effects: [],
        },
      },
    ],
  }),

  EventTemplateSchema.parse({
    id: 'warden-deal',
    title: "A Warden's Quiet Deal",
    flavor:
      "A side-corridor; a warden in undyed grey leaning against a doorframe with a key on his palm. \"The Director keeps a strongbox three doors down. The key is short-lived — I'll be missing it inside the hour. Buy the hour from me, walker.\"",
    minChapter: 3,
    choices: [
      {
        id: 'buy-the-key',
        label: 'Buy the hour',
        hint: 'A heavy purse for a heavy chest.',
        requiresGold: 40,
        outcome: {
          resolution:
            'He folds the coin into a pouch under his cloak and tilts his head down the corridor. The strongbox gives without complaint. Whatever the Director was saving, you have it now.',
          effects: [
            { kind: 'gold_delta', amount: -40 },
            { kind: 'gold_delta', amount: 90 },
          ],
        },
      },
      {
        id: 'refuse',
        label: 'Refuse the deal',
        hint: "A warden's mercy is a wizard's leash.",
        outcome: {
          resolution: 'He shrugs and the key vanishes. \"Another walker, then. The Director keeps a long list.\"',
          effects: [],
        },
      },
      {
        id: 'take-by-force',
        label: 'Take the key by force',
        hint: 'One warden, one blade.',
        outcome: {
          resolution:
            'You catch his wrist before the key can vanish. He calls — short and surprised — and a second pair of boots arrives from the corridor behind.',
          effects: [{ kind: 'spawn_ambush', monsterDefIds: ['wardens-apprentice', 'slayer-hound'] }],
        },
      },
    ],
  }),

  // ─── Chapter 4: Ust Natha — drow stakes ──────────────────────────────
  EventTemplateSchema.parse({
    id: 'drow-priestess-test',
    title: "A Priestess's Test",
    flavor:
      "A drow in Lolth's red lace blocks the corridor with the calm of a woman who has not been moved in a hundred years. \"Walker. The Spider Queen tests her gifts. Cut yourself for her or pay her the weight of the cut. Both are an offering. Neither is a refusal.\"",
    minChapter: 4,
    choices: [
      {
        id: 'cut',
        label: 'Cut yourself for the Spider',
        hint: 'Blood is the cheaper currency in Ust Natha.',
        requiresHpAtLeast: 10,
        outcome: {
          resolution:
            'You draw your own blade across your forearm. She gathers the dripping into a thumb-vial and breathes a syllable over it. A coldness threads up your spine and steadies your stance.',
          effects: [
            { kind: 'hp_delta', amount: -8 },
            { kind: 'apply_attack_bonus_run', amount: 1 },
            { kind: 'init_bonus_run', amount: 1 },
          ],
        },
      },
      {
        id: 'pay',
        label: 'Pay her the weight in coin',
        hint: 'Heavy purse, lighter shoulders.',
        requiresGold: 60,
        outcome: {
          resolution:
            'She counts the coin without touching it. "The Spider notes the price." She steps aside; the corridor opens; the air thins.',
          effects: [
            { kind: 'gold_delta', amount: -60 },
            { kind: 'grant_blessing', random: true },
          ],
        },
      },
      {
        id: 'flatter-the-spider',
        label: '[Charisma] Flatter the Spider',
        hint: 'A courtier\'s tongue for Lolth\'s red lace.',
        requiresCha: 3,
        outcome: {
          resolution:
            'You bow as a noble of Ust Natha would bow, and put the priestess\'s own beauty into Lolth\'s mouth — the kind of compliment that is also a prayer. Her smile does not change, but her hand opens. "The Spider notes a tongue worth keeping." The corridor opens. No blood. No coin. The blessing she leaves is colder than the dark.',
          effects: [{ kind: 'grant_blessing', random: true }],
        },
      },
      {
        id: 'refuse-spider',
        label: 'Refuse her',
        hint: 'The Spider does not love a refusal.',
        outcome: {
          resolution:
            'She does not move; she does not draw. She only smiles. Behind you, two pairs of boots come up the corridor with the unhurried step of women who have time.',
          effects: [{ kind: 'spawn_ambush', monsterDefIds: ['drow-warrior', 'drow-crossbowman'] }],
        },
      },
    ],
  }),

  EventTemplateSchema.parse({
    id: 'eilistraee-shrine',
    title: 'A Hidden Shrine to Eilistraee',
    flavor:
      "A cleft in the rock barely wide enough for a shoulder. Inside: a tallow stub burning steadier than it should, and a small silver figure of a woman with a sword raised to a moon she cannot see. A drow has been hiding her here.",
    minChapter: 4,
    choices: [
      {
        id: 'leave-coin',
        label: 'Leave a coin for the keeper',
        hint: 'Whoever they are, they are paying for this.',
        requiresGold: 20,
        outcome: {
          resolution:
            'You set the coin at the figure\'s feet. The candle steadies further. A warmth that has nothing to do with the candle settles into your chest for the rest of the road.',
          effects: [
            { kind: 'gold_delta', amount: -20 },
            { kind: 'grant_blessing_id', id: 'selunes-tide' },
          ],
        },
      },
      {
        id: 'take-the-silver',
        label: 'Take the silver figure',
        hint: 'A handful of coin, a candle gone out.',
        outcome: {
          resolution:
            'The figure goes cold in your palm the moment it leaves the niche. You pocket it anyway. The candle gutters. Something small and silvered closes in the dark of the cleft, and your shoulders go heavy.',
          effects: [
            { kind: 'gold_delta', amount: 25 },
            {
              kind: 'grant_quirk_reroll',
              fallbackText: 'Eilistraee finds no bane to shake from you — her silver weighs only what you have given.',
            },
          ],
        },
      },
      {
        id: 'pass-by',
        label: 'Step past the cleft',
        hint: 'The shrine is not yours to disturb.',
        outcome: {
          resolution: 'You ease back into the corridor. The candle keeps its steady burn behind you. A small kindness goes on in the dark without you.',
          effects: [],
        },
      },
    ],
  }),
];

// Boss-intel templates are looked up by id (the pre-boss slot picks them
// deterministically — they must never appear in the random narrative pool).
const INTEL_POOL: EventTemplate[] = buildAllIntelEventTemplates();

const BY_ID: Map<string, EventTemplate> = new Map(
  [...POOL, ...INTEL_POOL].map((e) => [e.id, e]),
);

export function getEvent(id: string): EventTemplate {
  const e = BY_ID.get(id);
  if (!e) throw new Error(`Event template not found: ${id}`);
  return e;
}

export function listEvents(): EventTemplate[] {
  return POOL;
}

export function eventsForChapter(chapter: number): EventTemplate[] {
  return POOL.filter((e) => (e.minChapter ?? 1) <= chapter);
}
