import { EventTemplateSchema, type EventTemplate } from '../../schemas/event';
import { buildAllIntelEventTemplates } from '../bossIntel';

const POOL: EventTemplate[] = [
  // ─── Chapter 1: Iron Cells — simple, low-stakes choices ───────────────
  EventTemplateSchema.parse({
    id: 'pale-cleric-shrine',
    eventType: 'shrine',
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
        label: '[Persuasion] Speak gently with her',
        hint: 'Find the words for her ache. Fumble them and the moment closes.',
        skillCheck: { skill: 'persuasion', dc: 12 },
        outcome: {
          resolution:
            'You crouch and put words to the ache in her shoulders before she names it herself. She lifts her eyes for the first time and tells you a small story about her sister. When you stand, her thumb has marked Ilmater\'s tear on your brow, and her god rides a little of the road with you.',
          effects: [
            { kind: 'hp_delta', amount: 4 },
            { kind: 'grant_blessing', random: true },
          ],
        },
        failureOutcome: {
          resolution:
            'The words come out too eager, too rehearsed. She hears the want in them and folds back into herself, hands in her lap, eyes down. The basin between you stays cold. You walk on with nothing but the echo of your own voice.',
          effects: [],
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
    eventType: 'omen',
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
        id: 'read-the-reflection',
        label: '[Arcana] Read the enchantment in the glass',
        hint: 'Name the working before you touch it — get it right and take its gift clean; guess wrong and the reflection bites.',
        skillCheck: { skill: 'arcana', dc: 11 },
        outcome: {
          resolution:
            'You trace the fracture with your eyes and you know what it is — a reflection-binding, half-made, looking for a willing caster. You offer it only the safe clauses and it folds a thread of cold light into your palm without teeth.',
          effects: [{ kind: 'grant_blessing', random: true }],
        },
        failureOutcome: {
          resolution:
            'The working is too strange, too half-made to parse. You reach for it anyway and the reflection lunges — a cold hand through the glass that finds your chest before you step back. It does not follow past the frame.',
          effects: [{ kind: 'hp_delta', amount: -4 }],
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
    eventType: 'stranger',
    title: 'A Wounded Captain',
    flavor:
      "A bandit deserter — captain's tabard, captain's split lip — propped against the wall with one hand pressed to his side. \"My old crew's hunting me, walker, and they want to see a body bleed. Let me cut you — once, somewhere they'll spot it — and they'll call the debt settled and let me crawl off. There's a purse in it. Your blood, my freedom.\"",
    minChapter: 1,
    choices: [
      {
        id: 'take-the-blow',
        label: 'Let him cut you for coin',
        hint: 'He buys the wound; you keep the purse. You bleed, he walks.',
        outcome: {
          resolution:
            "He draws a dirk and opens you between two ribs with a craftsman's care — deep enough to convince, shallow enough to survive. \"That'll satisfy them.\" He presses the purse into your red hand and limps off down the corridor, free.",
          effects: [
            { kind: 'hp_delta', amount: -5 },
            { kind: 'gold_delta', amount: 30 },
          ],
        },
      },
      {
        id: 'tend-him',
        label: '[Medicine] Bind his wound instead',
        hint: 'Save the deserter and he pays the surgeon gladly — botch it and he bleeds you a pittance to be rid of you.',
        skillCheck: { skill: 'medicine', dc: 12 },
        outcome: {
          resolution:
            "You kneel, pack the wound with a strip of his own tabard, and bind it tight and true. The bleeding slows under your hands. He stares at you like you are a thing he has no word for, then presses his whole purse into your palm. \"Didn't ask for that. Won't forget it.\" He limps off, alive and owing.",
          effects: [{ kind: 'gold_delta', amount: 25 }],
        },
        failureOutcome: {
          resolution:
            "You pack the wound wrong and the bleeding finds a way around your fingers. He shoves you off with a curse, knots the binding himself, and flicks a few coins at your feet for the trouble. \"Should've let a real chirurgeon at it.\" He crawls off greyer than he was.",
          effects: [{ kind: 'gold_delta', amount: 5 }],
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
    eventType: 'omen',
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
        id: 'listen-first',
        label: '[Perception] Listen at the seam first',
        hint: 'Read the door before you open it — hear grace, take it clean; miss the waiting steel and it takes you.',
        skillCheck: { skill: 'perception', dc: 12 },
        outcome: {
          resolution:
            'You set your ear to the gap and let the corridor go quiet. No breath. No shifting weight. Only the cedar-warm pull of something kind on the other side. You lift the latch knowing what waits, and the sigil folds into your palm without a fight.',
          effects: [{ kind: 'grant_blessing', random: true }],
        },
        failureOutcome: {
          resolution:
            'You listen, hear nothing, and trust the nothing. The latch lifts onto a knot of small green shapes that were holding their breath better than you were listening. Steel meets you before flavor does.',
          effects: [{ kind: 'spawn_ambush', monsterDefIds: ['goblin', 'goblin'] }],
        },
      },
      {
        id: 'shoulder-the-door',
        label: '[Athletics] Put your shoulder to it',
        hint: 'Force the latch before whatever waits can use it. Muscle it clear and the road is yours.',
        skillCheck: { skill: 'athletics', dc: 12 },
        outcome: {
          resolution:
            'You take two steps and drive your shoulder into the grain. The frame shrieks and the latch snaps cold off the wood. The corridor beyond is empty and yours. The effort hardens something in your chest.',
          effects: [{ kind: 'apply_attack_bonus_run', amount: 1 }],
        },
        failureOutcome: {
          resolution:
            'The door does not move — the wood is harder than stone and the latch holds. When you stagger back, the corridor turns cold and a knot of small green shapes tumbles out of the gap at the seam.',
          effects: [{ kind: 'spawn_ambush', monsterDefIds: ['goblin', 'goblin'] }],
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
    eventType: 'ruin',
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
          resolution: 'The jaw fits your pocket as though it has been waiting for it. You feel cold across the shoulders, and your hand truer on the grip.',
          effects: [
            { kind: 'hp_delta', amount: -1 },
            { kind: 'apply_attack_bonus_run', amount: 1 },
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
        id: 'name-the-dead',
        label: '[History] Name the dead and honour them',
        hint: 'Recall whose bones these are and why they were staked. Get it right and the dead steady you; get it wrong and you wake an old grudge.',
        skillCheck: { skill: 'history', dc: 12 },
        outcome: {
          resolution: 'You know this rite — a jailer\'s bones, staked by his own so the cells would remember a cruelty and never repeat it. You speak the old debtors\' words over the jaw and set it straight on the rod. Something in the corridor exhales. You walk on with the dead at your back instead of your throat, steadier for the knowing.',
          effects: [{ kind: 'temp_hp', amount: 6 }],
        },
        failureOutcome: {
          resolution: 'You reach for the rite and bring up the wrong one — wrong god, wrong dead, wrong words. The jaw seems to tilt. A cold draught finds the back of your neck and sinks its teeth in, and the corridor ahead is longer and meaner than it was.',
          effects: [{ kind: 'hp_delta', amount: -3 }],
        },
      },
      {
        id: 'spit',
        label: 'Spit on it and defy the dead',
        hint: 'A stiff spine, or a cold curse — the dead reward defiance as often as they punish it.',
        outcome: {
          random: [
            {
              weight: 55,
              outcome: {
                resolution: 'You spit, square your shoulders, and dare the thing to answer. It does not. Something in you hardens at the daring of it — you walk on with steel in your spine that was not there before.',
                effects: [{ kind: 'temp_hp', amount: 6 }],
              },
            },
            {
              weight: 45,
              outcome: {
                resolution: 'You spit. The jaw seems to grin wider. A cold draught finds the back of your neck and sinks its teeth in, and the corridor ahead is longer and meaner than it was.',
                effects: [{ kind: 'hp_delta', amount: -4 }],
              },
            },
          ],
        },
      },
    ],
  }),

  EventTemplateSchema.parse({
    id: 'rats-in-the-grain',
    eventType: 'beast',
    title: 'Rats in the Grain Sack',
    flavor:
      "A guard's mess-sack, half-eaten through. Two rats lift their heads at you with the calm of small things that have not been hunted in this corridor.",
    minChapter: 1,
    choices: [
      {
        id: 'cook',
        label: 'Drive them off and take the grain',
        hint: 'Sour bread, but bread — if the sick one does not bite first.',
        successChance: 0.65,
        outcome: {
          resolution: 'You stamp twice. The rats scatter into the wall before they can turn. The bread is hard but honest, and a small steadiness returns to your legs.',
          effects: [{ kind: 'temp_hp', amount: 3 }],
        },
        failureOutcome: {
          resolution: 'The larger rat is slow with sickness and bold with it — it fastens yellow teeth into the meat of your hand before it bolts. The bite throbs hot and wrong the length of the corridor.',
          effects: [{ kind: 'hp_delta', amount: -3 }],
        },
      },
      {
        id: 'forage',
        label: '[Survival] Sort the good grain from the fouled',
        hint: 'Know which handful the rats spoiled and you eat clean — guess wrong and it gripes you.',
        skillCheck: { skill: 'survival', dc: 12 },
        outcome: {
          resolution: 'You wave the rats off without hurry and read the sack the way you would read a field — this corner sound, that one fouled and stinking. You eat only what is good. The bread is hard but honest, and steadier in you for the care you took.',
          effects: [{ kind: 'temp_hp', amount: 4 }],
        },
        failureOutcome: {
          resolution: 'You pick what looks sound, but the rats hid their work well. Two corridors on, your gut twists around the wrong mouthful and will not let go for a long while.',
          effects: [{ kind: 'hp_delta', amount: -2 }],
        },
      },
      {
        id: 'scan-the-mess',
        label: '[Perception] Scan the area for something else useful',
        hint: "A guard's sack is never just a sack.",
        skillCheck: { skill: 'perception', dc: 11 },
        outcome: {
          resolution:
            'The sack drew your eye but not your attention. A second look catches a coin wedged in a floor crack and a wrapped heel of bread jammed behind a loose stone — the guard\'s private cache, forgotten in a hurry.',
          effects: [{ kind: 'gold_delta', amount: 8 }, { kind: 'temp_hp', amount: 3 }],
        },
        failureOutcome: {
          resolution: 'You turn once, see what you expected, and stop looking. The corridor holds its secrets.',
          effects: [],
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

  EventTemplateSchema.parse({
    id: 'dead-mans-steel',
    eventType: 'treasure',
    title: "A Dead Man's Steel",
    flavor:
      "A sellsword slumped against the cell-block wall, a sevenday dead by the smell. His weapon is still locked in his fist — good steel, better than the jailers carry — and a flat pack sags at his hip, the buckles half-worried by someone who left in a hurry before they finished.",
    minChapter: 1,
    choices: [
      {
        id: 'take-blade',
        label: 'Pry the weapon from his grip',
        hint: 'Good steel asks no questions. Yours now.',
        outcome: {
          resolution:
            'Rigor has set his fingers and they give one at a time, dry as old rope. The weapon comes free and sits true in your hand — whoever he was, he kept his edge. You leave him the wall and take his road.',
          effects: [
            {
              kind: 'grant_item',
              randomFrom: ['greatsword', 'warhammer', 'rapier', 'longsword', 'shortbow'],
            },
          ],
        },
      },
      {
        id: 'search-pack',
        label: 'Cut the pack from his hip',
        hint: "Coin over steel — if the buckle is all that's waiting.",
        successChance: 0.6,
        outcome: {
          resolution:
            'The pack comes away heavy. Coin, a whetstone, a twist of jerky gone to leather. You pocket the silver and leave the rest to the dark.',
          effects: [{ kind: 'gold_delta', amount: 18 }],
        },
        failureOutcome: {
          resolution:
            "Your knife parts the strap — and the spring-blade some thief rigged under the flap parts the back of your hand. You jerk away cursing, the pack still on his hip and your own blood on the dead man's coat.",
          effects: [{ kind: 'hp_delta', amount: -4 }],
        },
      },
      {
        id: 'examine-pack',
        label: '[Investigation] Study the buckle before you cut',
        hint: 'Read the flap for a trap before your knife finds one. Spot the rig and the coin is clean; miss it and the blade still bites.',
        skillCheck: { skill: 'investigation', dc: 12 },
        outcome: {
          resolution:
            'You leave the knife sheathed and look first. The buckle sits a hair too proud — a thief\'s spring-blade waiting under the flap. You ease the catch the long way round, the steel folds harmless into your palm, and the purse comes free without a drop of your own blood in it.',
          effects: [{ kind: 'gold_delta', amount: 18 }],
        },
        failureOutcome: {
          resolution:
            'You turn the flap over twice and read it sound. It is not. The spring-blade finds the back of your hand the moment the strap gives, and you come away cursing with a thin red line for your trouble and the pack still on his hip.',
          effects: [{ kind: 'hp_delta', amount: -4 }],
        },
      },
      {
        id: 'leave',
        label: 'Leave him his steel',
        hint: 'The dead earned their rest the hard way.',
        outcome: {
          resolution:
            'You straighten his fist over the grip and step past. The corridor takes you on, and the smell does not follow far.',
          effects: [],
        },
      },
    ],
  }),

  // ─── Chapter 2: Athkatla — coin-flavored choices ─────────────────────
  EventTemplateSchema.parse({
    id: 'beggar-at-the-gate',
    eventType: 'stranger',
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
        id: 'recall-waukeens-prayer',
        label: "[History] Speak Waukeen's prayer of passage",
        hint: 'Know the old words — the ones a true supplicant of the merchant queen gives before crossing a threshold.',
        skillCheck: { skill: 'history', dc: 11 },
        outcome: {
          resolution:
            "You pause and find the old Waukeen passage-prayer — the seven-syllable one the gate-merchants still use in Calimshan. His eyes open. He murmurs the response and presses his own blessing into your hand. \"A walker who knows the road before the last road — she marks you herself.\"",
          effects: [{ kind: 'grant_blessing', random: true }],
        },
        failureOutcome: {
          resolution:
            'You reach for the prayer and come up empty. He watches you quietly and folds his hands. You leave him to his bowl.',
          effects: [],
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
        id: 'palm-the-takings',
        label: '[Sleight of Hand] Palm the coins as you pass',
        hint: 'Lift his takings without a ripple. Clean hands keep the city blind; clumsy ones bring the customs-man running.',
        skillCheck: { skill: 'sleight-of-hand', dc: 13 },
        outcome: {
          resolution: 'You stoop as if to drop a coin and rise with three of his instead, the bowl never knowing it was lighter. He blesses you for the kindness he thinks you gave. You are half down the alley before the warmth of the theft fades.',
          effects: [{ kind: 'gold_delta', amount: 15 }],
        },
        failureOutcome: {
          resolution: "Your fingers brush the rim a half-beat too slow and the bowl rings against the cobbles. A customs-man's whistle answers from the arch — two hands take you by the shoulders and a third by the ribs before you can run. You leave bruised and no richer.",
          effects: [{ kind: 'hp_delta', amount: -4 }],
        },
      },
    ],
  }),

  EventTemplateSchema.parse({
    id: 'cowled-recruiter',
    eventType: 'stranger',
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
        label: '[Deception] Name-drop a Cowled superior',
        hint: 'Claim a rank you have never held. Sell it and walk free — slip and the Cowl corrects you.',
        skillCheck: { skill: 'deception', dc: 13 },
        outcome: {
          resolution:
            'You drop a name with the calm of a man who has stood in chambers above this one. The Cowl\'s eyes flicker — the briefest re-evaluation — and the chalk-sigil presses onto your hand without a coin asked. They step back into the arch, the stone sealing behind them, and you walk on with a wizard\'s mark and a wizard\'s purse intact.',
          effects: [{ kind: 'apply_attack_bonus_run', amount: 1 }],
        },
        failureOutcome: {
          resolution:
            'The name leaves your mouth a half-beat too smooth. The Cowl tilts their head. "That one died in the purges, walker. Try the truth next life." A snap of fingers, a smell of ozone, and the cobbles come up to meet you. They are gone before the ringing stops.',
          effects: [{ kind: 'hp_delta', amount: -5 }],
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
    eventType: 'bargain',
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
            'You drain it. It is better than it has any right to be. Your head goes loose; your arm goes long. You feel a half-step truer with the blade, but a half-step less guarded.',
          effects: [
            { kind: 'apply_attack_bonus_run', amount: 1 },
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
        label: '[Persuasion] Haggle for the bottle',
        hint: 'Charm the price down — the better the telling, the lighter the bill. Fall flat and the price holds.',
        requiresGold: 8,
        skillCheck: { skill: 'persuasion', dc: 13 },
        outcome: {
          resolution:
            'You spin him a tale about Amnian summers and a sister who married a vintner. He laughs and waves a hand. "Half price for a walker who knows the country, then" — and the longer you keep him laughing, the more coppers he counts back into your palm. The bottle goes into your pack at a thief\'s rate.',
          effects: [
            { kind: 'gold_delta', amount: -8 },
            { kind: 'gold_delta', amount: 6 },
            { kind: 'hp_delta', amount: 8 },
          ],
        },
        failureOutcome: {
          resolution:
            'Your tale wanders and his smile thins to courtesy. "Charming, walker. But my children eat Amnian red same as you." The price stays full and you have no stomach to pay it. You leave with the cork still in the bottle and your purse intact.',
          effects: [],
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
    eventType: 'stranger',
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
        label: '[Insight] Take the knife from him',
        hint: 'Read him right — scared, not vicious — and disarm him gently. Misjudge it and his panic finds your hand.',
        skillCheck: { skill: 'insight', dc: 13 },
        outcome: {
          resolution:
            'You see it in his eyes before his hand moves — terror, not malice. You catch his wrist soft and turn the blade aside. He stares at his empty hand for a long beat. "Eat," you say, and press a coin into the palm. He runs. Something in your chest unclenches.',
          effects: [
            { kind: 'gold_delta', amount: -2 },
            { kind: 'temp_hp', amount: 4 },
          ],
        },
        failureOutcome: {
          resolution:
            'You read him as frightened and reach in slow. You read him wrong. The blade is already moving — it opens the back of your hand before you close on his wrist, and he is gone into the dark with the knife and your blood on it.',
          effects: [{ kind: 'hp_delta', amount: -3 }],
        },
      },
      {
        id: 'tend-the-cut',
        label: '[Medicine] Tend the cut on his hand',
        hint: "The knife nicked him too. Treat it and he remembers what a stranger's kindness costs.",
        skillCheck: { skill: 'medicine', dc: 12 },
        outcome: {
          resolution:
            'You stop moving. He does too — surprised by the stillness. You take his hand and close the cut with a strip from your sleeve, quick and sure. He does not run. When you let go he presses something cold into your palm and is gone before you can speak. A thin ring, probably stolen. Probably the most he had.',
          effects: [{ kind: 'temp_hp', amount: 5 }, { kind: 'gold_delta', amount: 6 }],
        },
        failureOutcome: {
          resolution:
            'You reach for his hand and he flinches back hard. Whatever trust the moment held is gone. He bolts, and the knife catches your forearm on its way past.',
          effects: [{ kind: 'hp_delta', amount: -2 }],
        },
      },
      {
        id: 'intimidate',
        label: '[Intimidation] Snarl him into the gutter',
        hint: 'Cow the boy and he drops everything and runs — but a child of Athkatla has been threatened by worse.',
        skillCheck: { skill: 'intimidation', dc: 13 },
        outcome: {
          resolution:
            'You take one step and put the whole of the corridor into your voice. The knife clatters from his hand; he bolts so fast a torn lining spills silver across the cobbles behind him. You pocket the coins without looking up.',
          effects: [{ kind: 'gold_delta', amount: 12 }],
        },
        failureOutcome: {
          resolution:
            'He has heard worse from larger men in darker alleys. He spits, slashes once at the air between you, and is gone down a crack too narrow to follow — but the blade caught your forearm on its way past.',
          effects: [{ kind: 'hp_delta', amount: -2 }],
        },
      },
    ],
  }),

  EventTemplateSchema.parse({
    id: 'oghma-scribe',
    eventType: 'lore',
    title: 'A Scribe of Oghma',
    flavor:
      "A bald man in white linen squats in the lee of a wall with a folio open on his knees. He looks up as you pass. \"A line of your road, walker. The Binder pays a coin for a story — your name, or the why beneath it. The name is easy. The why will cost you more than coin, and pay you back in kind.\"",
    minChapter: 2,
    choices: [
      {
        id: 'sell-name',
        label: 'Give him your name',
        hint: 'A coin for a name freely given.',
        outcome: {
          resolution:
            'He inks the name with quick, clean strokes. "The Binder remembers, walker." A coin rings on the cobble between your boots.',
          effects: [{ kind: 'gold_delta', amount: 1 }],
        },
      },
      {
        id: 'sell-truth',
        label: 'Tell him the why',
        hint: 'Dredging up the real thing costs you — but the Binder pays a true story in kind, and you walk lighter for it.',
        outcome: {
          resolution:
            'You give him a piece of yourself that you did not know you still carried, and the giving of it opens an old wound to the air — it stings the whole way out. He writes it small, reverent. When he is done you are lighter where it counts, and there is a coin in it after all: "The Binder pays best for the true ones."',
          effects: [
            { kind: 'hp_delta', amount: -2 },
            { kind: 'temp_hp', amount: 6 },
            { kind: 'gold_delta', amount: 3 },
          ],
        },
      },
      {
        id: 'sell-lie',
        label: '[Deception] Sell him a better story',
        hint: 'Spin a tale grander than your own. Sell it whole and the coin is good — but the Binder knows a false road when he hears one.',
        skillCheck: { skill: 'deception', dc: 13 },
        outcome: {
          resolution:
            'You give him a war you never fought and a love you never lost, and you give it well — the cadence, the catch in the voice at the right line. His pen flies. "A road worth the ink, walker." He pays for the telling, never the truth, and the purse he counts out is heavier for the craft of the lie.',
          effects: [{ kind: 'gold_delta', amount: 25 }],
        },
        failureOutcome: {
          resolution:
            'You reach for grand and land on hollow. He sets the pen down halfway through. "That is not your road, walker. I have inked ten thousand — I know the false ones by the weight." The folio closes. No coin for a liar caught.',
          effects: [],
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

  EventTemplateSchema.parse({
    id: 'pilgrim-road-smith',
    eventType: 'bargain',
    title: 'A Smith on the Pilgrim Road',
    flavor:
      "A travelling smith has set his portable anvil in the lee of a milestone, a rack of finished blades cooling on a leather roll beside him. \"Bound for the dark, walker? You'll want steel that bites back. Fifty for the rapier on the roll — she crits on a nineteen and opens wounds that don't close. Talk me round and she's cheaper.\"",
    minChapter: 2,
    choices: [
      {
        id: 'buy-blade',
        label: 'Buy the rapier off the roll',
        hint: 'A keen blade that crits on 19 and bleeds the target for 3 turns.',
        requiresGold: 50,
        outcome: {
          resolution:
            'He sights down the blade, then lays it across your palms hilt-first. "Waukeen keep your edge keen, walker." The balance is clean and the edge is hungry. It goes to your hip like it has always lived there.',
          effects: [
            { kind: 'gold_delta', amount: -50 },
            { kind: 'grant_item', itemId: 'rapier', affixIds: ['keen', 'bloodletting'] },
          ],
        },
      },
      {
        id: 'haggle-smith',
        label: '[Persuasion] Talk him round',
        hint: 'Same blade, lighter bill — if the tongue is sharp enough.',
        requiresGold: 30,
        skillCheck: { skill: 'persuasion', dc: 13 },
        outcome: {
          resolution:
            'You name three smiths you have never met and a war you were never in, and somewhere in the telling his price softens like hot iron. "Aye — for a walker who knows the trade." The rapier goes to your hip at a friend\'s rate.',
          effects: [
            { kind: 'gold_delta', amount: -30 },
            { kind: 'gold_delta', amount: 9 },
            { kind: 'grant_item', itemId: 'rapier', affixIds: ['keen', 'bloodletting'] },
          ],
        },
        failureOutcome: {
          resolution:
            'He lets you talk yourself out, then sights down the blade and shakes his head. "Fair words, walker. But fifty\'s the price and fifty stays." He lays the rapier back on the roll and turns to the anvil. You keep your coin and your old steel both.',
          effects: [],
        },
      },
      {
        id: 'pocket-tools',
        label: "[Sleight of Hand] Pocket a tool from the rack while he's talking",
        hint: "His eyes are on the blade, not the rack. A quick hand finds something the road will use.",
        skillCheck: { skill: 'sleight-of-hand', dc: 12 },
        outcome: {
          resolution:
            "He extols the rapier's reach and you let him. Your hand moves once, unhurried, and a small punch-chisel vanishes into your pack before he turns back. He never notices. You walk on with a little more than you arrived with.",
          effects: [{ kind: 'gold_delta', amount: 14 }],
        },
        failureOutcome: {
          resolution:
            "He turns mid-sentence and your hand is still in the wrong place. He picks up the hammer without hurrying. \"Off my rack, walker.\" The steel catches your knuckles on the way past, and he watches until you've cleared the milestone.",
          effects: [{ kind: 'hp_delta', amount: -4 }],
        },
      },
      {
        id: 'walk-on-smith',
        label: 'Walk on',
        hint: 'Your steel will do. It has so far.',
        outcome: {
          resolution: 'He shrugs and turns back to the anvil. "The dark keeps no refunds, walker." The ring of his hammer follows you down the road.',
          effects: [],
        },
      },
    ],
  }),

  // ─── Chapter 3: Spellhold — deeper trade-offs ────────────────────────
  EventTemplateSchema.parse({
    id: 'mad-prisoner-bargain',
    eventType: 'bargain',
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
        label: '[Persuasion] Talk him down',
        hint: 'A steady voice between the bars — calm him and he hands it over gladly. Spook him and he clutches it tighter.',
        skillCheck: { skill: 'persuasion', dc: 14 },
        outcome: {
          resolution:
            'You crouch to his level and speak with the steadiness of a stranger who is not afraid of him. He blinks. Once. Twice. Then he hands the purse through the bars with both hands, like a child returning a borrowed thing — and digs the loose coin from his smock to press after it, the more for how unafraid you were. "Yours, walker. Yours. Not the Director\'s. Not anymore." The weight in your pocket is clean.',
          effects: [
            { kind: 'gold_delta', amount: 40 },
            { kind: 'gold_delta', amount: 18 },
          ],
        },
        failureOutcome: {
          resolution:
            'Something in your voice catches wrong and his eyes go wide and white. He snatches the purse back through the bars and folds himself around it in the corner. "No. No — the Director\'s. The Director\'s. You\'re one of his." He will not look at you again, and the purse goes with him into the dark of the cell.',
          effects: [],
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
        label: '[Athletics] Pry the bars open',
        hint: 'Iron against your shoulder — force it clean and he is grateful; lose the strain and he comes through the gap at you.',
        skillCheck: { skill: 'athletics', dc: 14 },
        outcome: {
          resolution:
            "You set your shoulder and your heel and the old iron gives all at once. He goes still. \"Oh. Oh thank you, walker.\" He presses something cold into your hand and shows you which corridor the warden's keys hang on. A great weight comes off you both.",
          effects: [
            { kind: 'grant_blessing', random: true },
            { kind: 'gold_delta', amount: 15 },
          ],
        },
        failureOutcome: {
          resolution:
            "The bar bends, sticks, and your strength runs out before its does. In the half-gap you tore he comes at you — hands at your throat with the strength of grief and starvation. You break loose. The bars are crooked behind you and the corridor is loud.",
          effects: [
            { kind: 'hp_delta', amount: -7 },
            { kind: 'spawn_ambush', monsterDefIds: ['mad-mage-prisoner'] },
          ],
        },
      },
    ],
  }),

  EventTemplateSchema.parse({
    id: 'hollow-library',
    eventType: 'lore',
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
          effects: [{ kind: 'grant_blessing', random: true }],
        },
      },
      {
        id: 'parse-the-script',
        label: '[Arcana] Parse the script before you speak it',
        hint: 'Read what the ink is doing before you give it your voice. Name the working and the Weave answers kindly; misread it and it answers anyway.',
        skillCheck: { skill: 'arcana', dc: 14 },
        outcome: {
          resolution:
            'You trace the line as it writes itself and you know its grammar — a binding-script, half a prayer, hungry for a careless tongue. You speak only the safe clauses and leave the snare unspoken. The page goes warm without teeth, and a clean thread of the Weave folds itself into your chest for the road.',
          effects: [{ kind: 'grant_blessing', random: true }],
        },
        failureOutcome: {
          resolution:
            'The syntax slips through your fingers — too old, too strange. You guess at the join and guess wrong. The ink flares, the lectern cracks, and a backlash of raw Weave snaps across your hands before the folio falls dark and ordinary.',
          effects: [{ kind: 'hp_delta', amount: -4 }],
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
    eventType: 'treasure',
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
          resolution: 'He shrugs and the key vanishes. "Another walker, then. The Director keeps a long list."',
          effects: [],
        },
      },
      {
        id: 'slip-past-warden',
        label: '[Stealth] Slip past him to the strongbox',
        hint: 'Take the hour without buying it — three doors down, unseen. Move clean and the chest is yours; trip a board and his shout brings worse.',
        skillCheck: { skill: 'stealth', dc: 14 },
        outcome: {
          resolution:
            'You let him keep his key and his hour both. While he watches the wrong end of the corridor you are already past him, counting doors — one, two, three — and the strongbox gives under your hands in the dark. You are gone before he turns, his coin still his and the Director\'s gold now yours.',
          effects: [{ kind: 'gold_delta', amount: 90 }],
        },
        failureOutcome: {
          resolution:
            'A board you did not see cants under your heel and sings. The warden does not chase — he only calls, short and sharp, and a second pair of boots answers from the dark ahead of you, between you and the box.',
          effects: [{ kind: 'spawn_ambush', monsterDefIds: ['wardens-apprentice', 'slayer-hound'] }],
        },
      },
      {
        id: 'lean-on-him',
        label: '[Intimidation] Lean on him for the key',
        hint: 'Make him surrender the hour for nothing — if you can make him fear you more than the Director.',
        skillCheck: { skill: 'intimidation', dc: 14 },
        outcome: {
          resolution:
            'You close the distance and let him read what is in your face. The key is in your palm before he has finished deciding to be brave. "Three doors down," he says, very quietly, and finds somewhere else to be. The strongbox gives without complaint, and you kept your purse for it.',
          effects: [{ kind: 'gold_delta', amount: 90 }],
        },
        failureOutcome: {
          resolution:
            'He has stood in this corridor for the Director a long time, and you are not the worst thing it has shown him. He calls — short and sharp — and a second pair of boots answers from the dark behind you.',
          effects: [{ kind: 'spawn_ambush', monsterDefIds: ['wardens-apprentice', 'slayer-hound'] }],
        },
      },
    ],
  }),

  // ─── Chapter 4: Ust Natha — drow stakes ──────────────────────────────
  EventTemplateSchema.parse({
    id: 'drow-priestess-test',
    eventType: 'shrine',
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
            { kind: 'apply_attack_bonus_run', amount: 2 },
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
        label: '[Deception] Flatter the Spider',
        hint: 'A courtier\'s lie for Lolth\'s red lace. Sell the false praise in a court built on it — or be named for what you are.',
        skillCheck: { skill: 'deception', dc: 15 },
        outcome: {
          resolution:
            'You bow as a noble of Ust Natha would bow, and put the priestess\'s own beauty into Lolth\'s mouth — the kind of compliment that is also a prayer. Her smile does not change, but her hand opens. "The Spider notes a tongue worth keeping." The corridor opens. No blood. No coin. The blessing she leaves is colder than the dark.',
          effects: [{ kind: 'grant_blessing', random: true }],
        },
        failureOutcome: {
          resolution:
            'The flattery is a half-shade too thick, and a priestess of Lolth has heard every shade of it for a hundred years. Her smile does not change. "A clumsy tongue lies to a goddess of liars." She does not move. Behind you, a single set of boots comes up the corridor without hurry.',
          effects: [{ kind: 'spawn_ambush', monsterDefIds: ['drow-warrior'] }],
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
    eventType: 'shrine',
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
            { kind: 'grant_blessing_id', id: 'selunes-veil' },
          ],
        },
      },
      {
        id: 'observe-the-rite',
        label: '[Religion] Keep the moon-rite yourself',
        hint: "Honour Eilistraee the way her hidden faithful do — no coin, only the rite done right. Perform it true and she answers; fumble her secret liturgy and the dark closes cold.",
        skillCheck: { skill: 'religion', dc: 15 },
        outcome: {
          resolution:
            "You know this faith, outlawed above and below — the sword raised to the unseen moon, the silent step, the words sung under the breath. You give the rite its due without a coin to your name, and the tallow steadies to a clean silver burn. A warmth that has nothing to do with the candle settles into your chest for the rest of the road.",
          effects: [{ kind: 'grant_blessing_id', id: 'selunes-veil' }],
        },
        failureOutcome: {
          resolution:
            "You reach for the rite and find only the shape of it — a half-remembered hymn, a gesture turned wrong. The candle gutters as if a breath disapproved. Something silvered closes in the dark of the cleft, and your shoulders go heavy with a grace you reached for and did not earn.",
          effects: [{ kind: 'hp_delta', amount: -3 }],
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
  // ─── Chapter 1 additions ──────────────────────────────────────────────
  EventTemplateSchema.parse({
    id: 'soldier-left-to-die',
    eventType: 'stranger',
    title: 'A Soldier Left to Die',
    flavor:
      'A footsoldier in a blue-and-grey tabard leans against the wall at a fork, a hand pressed to a wound in his side. His colours match nobody here. He does not reach for his weapon when he hears you. "They left me," he says, without explaining who or why.',
    minChapter: 1,
    choices: [
      {
        id: 'assess-his-state',
        label: '[Survival] Assess how long he has',
        hint: "Read him the way you'd read a field — what's left, what's done, where the line is.",
        skillCheck: { skill: 'survival', dc: 11 },
        outcome: {
          resolution:
            "You take one look and understand the shape of it — hours, not minutes, if he keeps still. He reads your face and knows you read his. \"Then sit with me a moment.\" He empties his kit between you, calm as a man doing inventory, and you take what will do you more good on the road than in the dark.",
          effects: [{ kind: 'temp_hp', amount: 6 }, { kind: 'gold_delta', amount: 12 }],
        },
        failureOutcome: {
          resolution:
            "You misread the colour of it — reach to close the wound wrong. His hand finds your wrist. \"That's not — stop.\" A moment of sharp hands before you both go still. You leave the way you came.",
          effects: [{ kind: 'hp_delta', amount: -2 }],
        },
      },
      {
        id: 'notice-what-hes-holding',
        label: "[Perception] Notice what he's still clutching",
        hint: 'The hand pressed to the wound is not empty.',
        skillCheck: { skill: 'perception', dc: 11 },
        outcome: {
          resolution:
            "The light catches it — a purse under the pressing hand, tucked there long before you arrived. He reads your eyes and sighs. \"Take it. The wall's not going to spend it.\" You press a coin back into his palm and pocket the rest.",
          effects: [{ kind: 'gold_delta', amount: 16 }],
        },
        failureOutcome: {
          resolution:
            "You look, find nothing you didn't already know, and walk on. He does not call after you.",
          effects: [],
        },
      },
      {
        id: 'bind-the-wound',
        label: '[Medicine] Bind the wound',
        hint: 'Stop the bleeding and he has time to be grateful.',
        skillCheck: { skill: 'medicine', dc: 12 },
        outcome: {
          resolution:
            "You pack the wound the right way — not tight enough to seize, not loose enough to slide. He breathes through his teeth, then easier. \"Better. That's — better.\" He reaches into his tabard and hands you a small purse and a flask.",
          effects: [{ kind: 'gold_delta', amount: 22 }, { kind: 'temp_hp', amount: 5 }],
        },
        failureOutcome: {
          resolution:
            'You pack the wound but it finds a way around. He takes over with his own hands, patient, and you step back. He does not offer what he has. Some things you have to earn.',
          effects: [],
        },
      },
      {
        id: 'take-his-kit',
        label: 'Take his kit',
        hint: "He won't need it where this road leads.",
        outcome: {
          resolution:
            "He watches you go through the pack without stopping you. \"At least someone gets the road out of it.\" You pocket the coin and the hard bread and leave him the wall.",
          effects: [{ kind: 'gold_delta', amount: 8 }],
        },
      },
    ],
  }),

  // ─── Chapter 2 additions ──────────────────────────────────────────────
  EventTemplateSchema.parse({
    id: 'dropped-ledger',
    eventType: 'treasure',
    title: "A Dropped Merchant's Ledger",
    flavor:
      "A leather-bound folio, flat in the gutter, its pages swollen with coin-columns and a line of cipher where the names should be. Someone dropped this in a hurry — or threw it down to run faster.",
    minChapter: 2,
    choices: [
      {
        id: 'decode-the-cipher',
        label: '[Investigation] Break the cipher',
        hint: 'A coded column is a hiding place with a lock on it. Find the key.',
        skillCheck: { skill: 'investigation', dc: 12 },
        outcome: {
          resolution:
            "The cipher yields on the third attempt — a basic shift with a Calimshite salt the last column gives away. Behind it: a supplier address and a debt that was never settled. You fold the ledger back in the gutter and walk with the address on a loose page in your pocket.",
          effects: [{ kind: 'gold_delta', amount: 28 }],
        },
        failureOutcome: {
          resolution:
            "The cipher is tighter than you took it for. You reach in and pull a thread that was load-bearing, and the folio goes warm in your hands before you drop it — a contact ward, tripped.",
          effects: [{ kind: 'hp_delta', amount: -3 }],
        },
      },
      {
        id: 'identify-the-house',
        label: '[History] Name the merchant house',
        hint: 'The crest on the cover is old money. Someone in the city still honours it.',
        skillCheck: { skill: 'history', dc: 12 },
        outcome: {
          resolution:
            "The seal is a nine-pointed star on ochre — Yhaunn salt-merchant guild, third tier. They pay a bounty for any ledger recovered in Athkatla: not coin but favour, and favour in the right hands pays faster. You present it at a side-door three alleys over and the factor counts out the standing rate without blinking.",
          effects: [{ kind: 'grant_blessing', random: true }],
        },
        failureOutcome: {
          resolution:
            'The crest is familiar the way a word mispronounced once becomes unfamiliar — you reach for it and find nothing solid. You leave the folio where it fell.',
          effects: [],
        },
      },
      {
        id: 'read-the-margins',
        label: '[Insight] Read between the columns',
        hint: 'Ledgers show what happened. The margins show what the writer thought of it.',
        skillCheck: { skill: 'insight', dc: 12 },
        outcome: {
          resolution:
            "The numbers are clean but the margin notes are not — blotted words, second thoughts, a name crossed out and written in again two pages later, more carefully. Someone owed someone something they could not name in a column. A name is a key, and a key can be sold.",
          effects: [{ kind: 'gold_delta', amount: 22 }],
        },
        failureOutcome: {
          resolution:
            'The marginal scrawl is just scrawl — a tired clerk who hated the job. You read three pages of it and put the folio down none the richer.',
          effects: [],
        },
      },
      {
        id: 'sell-it-outright',
        label: 'Sell it to the nearest paper-buyer',
        hint: "Cipher or not, a folio has weight and paper has a price.",
        outcome: {
          resolution:
            "The paper-merchant barely glances before counting out small coins. \"Cipher on the names — never good. But the binding's fine and the vellum's usable.\" You leave with the modest proceeds of someone else's misfortune.",
          effects: [{ kind: 'gold_delta', amount: 12 }],
        },
      },
    ],
  }),

  // ─── Chapter 3 additions ──────────────────────────────────────────────
  EventTemplateSchema.parse({
    id: 'forgotten-offering-table',
    eventType: 'ruin',
    title: 'A Forgotten Offering Table',
    flavor:
      "A side-chamber behind a slipped stone door, not on any Spellhold record you have heard of. Inside: a low table of old black granite, still bearing trinkets — a carved bowl, a copper figure, dead flowers pressed flat. Whatever god this was, the keepers have been gone a long time.",
    minChapter: 3,
    choices: [
      {
        id: 'honour-the-god',
        label: '[Religion] Identify the god and honour them properly',
        hint: 'A forgotten altar is not an abandoned one. Know whose it is and give it the right words.',
        skillCheck: { skill: 'religion', dc: 13 },
        outcome: {
          resolution:
            'The copper figure is Shaundakul — the Rider of the East Wind, patron of explorers and those who vanish on purpose. The rite is three words and a breath turned south-east. The dead flowers stand straight for a moment. A warmth, road-warm, settles between your shoulder-blades and stays.',
          effects: [{ kind: 'grant_blessing', random: true }],
        },
        failureOutcome: {
          resolution:
            'You reach for the rite and mistake the figure — give it a Lathander dawn-prayer instead. The flowers do not move. Something small and patient in the room folds away from you. The corridor ahead sits heavier.',
          effects: [{ kind: 'hp_delta', amount: -3 }],
        },
      },
      {
        id: 'read-the-weave',
        label: '[Arcana] Read the residual enchantment',
        hint: 'Old offerings draw old magic. Read the Weave in the room before it fades.',
        skillCheck: { skill: 'arcana', dc: 13 },
        outcome: {
          resolution:
            'The room is still breathing — faint, but there. You trace the channels in the granite and find a thread of old blessing-magic, spent but not gone, the kind that settles into stone over decades of faithful use. You cup it carefully and draw it in. Your hands will remember this for a while.',
          effects: [{ kind: 'apply_attack_bonus_run', amount: 1 }, { kind: 'temp_hp', amount: 8 }],
        },
        failureOutcome: {
          resolution:
            'The Weave here is layered too deep — old magic folded over older magic, each one reading as noise to the next. You pull a thread that was load-bearing and the room goes cold all at once, a breath of raw backlash up both arms.',
          effects: [{ kind: 'hp_delta', amount: -5 }],
        },
      },
      {
        id: 'pocket-the-trinkets',
        label: '[Stealth] Pocket the trinkets without disturbing the offering',
        hint: 'The room is quiet and the god is old. Move like the room is still watched.',
        skillCheck: { skill: 'stealth', dc: 13 },
        outcome: {
          resolution:
            "You take each piece with two fingers, set nothing down, reset the dead flowers to their exact angle. The room does not stir. You leave with copper in your pack and the god none the wiser — or too old to argue.",
          effects: [{ kind: 'gold_delta', amount: 35 }],
        },
        failureOutcome: {
          resolution:
            'The carved bowl catches your sleeve and rings once against the granite floor, sharp and final. The room goes cold. From the chamber door, two pairs of boots come at a flat run.',
          effects: [{ kind: 'spawn_ambush', monsterDefIds: ['wardens-apprentice', 'slayer-hound'] }],
        },
      },
      {
        id: 'take-the-offerings',
        label: 'Take the obvious offerings',
        hint: "Whatever bargain the last keeper made is not yours to keep.",
        outcome: {
          resolution:
            "You pocket the copper figure and the bowl and step back into the corridor. Two alleys later your boot catches a stone that was flush with the floor a moment ago, and your shin rings hard. The figure is lighter than it should be.",
          effects: [
            { kind: 'gold_delta', amount: 20 },
            { kind: 'grant_quirk_reroll', fallbackText: "Shaundakul finds no bane to shake from you — only the wind at your back for a moment." },
          ],
        },
      },
    ],
  }),

  // ─── Chapter 5–9: The Godwake descent — cycle, loom, drowned archive,
  //     ashfall, court of masks. The world bleaches out of the mortal and into
  //     the machinery of reincarnation as the climb goes down. ──────────────

  // Ch5 · The Godwake — Aurelach's fixed dawn, the wheel that turns souls back.
  EventTemplateSchema.parse({
    id: 'pilgrim-turned-back',
    eventType: 'stranger',
    title: 'A Pilgrim the Morning Turned Back',
    flavor:
      "A figure in sun-bleached pilgrim's grey sits on a step the dawn has scoured white, climbing nowhere. \"I reached the top,\" it says, without looking up. \"Aurelach said my name and broke the morning on me, and I woke at the bottom again, climbing. You'll do the same. Sit. Or take what I no longer need — I won't carry it round another turn.\"",
    minChapter: 5,
    choices: [
      {
        id: 'hear-the-climb',
        label: '[Insight] Read what the climb has left of it',
        hint: 'Some part of this pilgrim still remembers the road up. Find it and it gives the road freely.',
        skillCheck: { skill: 'insight', dc: 15 },
        outcome: {
          resolution:
            "You hold its gaze and find, under the bleaching, a person who climbed this exact stair before it was scoured. It tells you where the light thins and where the choir loses the tune. The knowing settles into your hands like a second blade.",
          effects: [{ kind: 'apply_attack_bonus_run', amount: 1 }, { kind: 'temp_hp', amount: 12 }],
        },
        failureOutcome: {
          resolution:
            "You search its face and find nothing climbing behind the eyes — only the habit of climbing, worn smooth. It keeps talking past you, to a stair you cannot see, and the words are no road at all.",
          effects: [],
        },
      },
      {
        id: 'take-the-castoffs',
        label: 'Take what it sets down',
        hint: 'A dead pilgrim carries dead pilgrim coin. It will not turn the wheel for it.',
        outcome: {
          resolution:
            "You gather the cast-offs heaped at its feet — coin gone soft at the edges, a phial of light long cold. It watches without grief. \"Lighter,\" it says, almost grateful. \"Lighter for the next turn.\"",
          effects: [{ kind: 'gold_delta', amount: 70 }],
        },
      },
      {
        id: 'name-the-god',
        label: '[Religion] Name the dawn-god and refuse its mercy',
        hint: "Speak Aurelach's name as a curse, not a prayer — claim a surface god's stay against the cycle. Get the rite right and the small mercy holds; get it wrong and the choir hears you.",
        skillCheck: { skill: 'religion', dc: 16 },
        outcome: {
          resolution:
            "You name Aurelach the way you would name a thief, and over it you set the sign of one of the small surface gods who let the dead stay dead. The bleaching light flinches off you for a moment. You climb on wearing a mercy the morning cannot reach.",
          effects: [{ kind: 'grant_blessing', random: true }],
        },
        failureOutcome: {
          resolution:
            "You reach for the surface god's sign and your hand makes the dawn's instead. The choir turns its tune toward the sound of you, and something risen unfolds from the white stair to carry you back down the easy way.",
          effects: [{ kind: 'spawn_ambush', monsterDefIds: ['cycle-revenant', 'reborn-husk'] }],
        },
      },
      {
        id: 'climb-past',
        label: 'Climb past it',
        hint: 'Its turn is not yours. Not yet.',
        outcome: {
          resolution: 'You step around it and climb. It does not mark you go. Two steps up, the stair behind you is empty and white, and you cannot say it was ever there.',
          effects: [],
        },
      },
    ],
  }),

  EventTemplateSchema.parse({
    id: 'choir-of-first-light',
    eventType: 'omen',
    title: 'The Choir of First Light',
    flavor:
      "The corridor opens on a gallery of hollow seraphs frozen mid-hymn, mouths wide, throats full of the first light there ever was. The song is not sound — it is a tune trying to find the shape of you, to fit you back into the wheel where you came loose.",
    minChapter: 5,
    choices: [
      {
        id: 'hold-the-tune',
        label: '[Religion] Answer the hymn with a truer one',
        hint: "Set a surface god's hymn against the cycle's chord — the small gods who let their dead lie still. Hold the counter-rite and the tune loses you; falter and the chord swallows the prayer.",
        skillCheck: { skill: 'religion', dc: 16 },
        outcome: {
          resolution:
            "You raise the plain hymn of one of the small gods who let the dead stay dead, and you hold it against the choir's endless chord. The tune cannot make a verse of you while you sing another's. You walk the gallery wearing a song that is only yours, and it steadies your hand the length of the road.",
          effects: [{ kind: 'apply_attack_bonus_run', amount: 1 }],
        },
        failureOutcome: {
          resolution:
            "You reach for a note outside the chord and the chord swallows it whole. For a breath you forget which death was yours and which the song's. The forgetting costs you something on the way out.",
          effects: [{ kind: 'hp_delta', amount: -10 }],
        },
      },
      {
        id: 'study-the-throats',
        label: '[Arcana] Read how the light is bound in their throats',
        hint: 'The seraphs are reliquaries of held dawn. Parse the binding and a thread of it is yours; misread it and it spends itself on you.',
        skillCheck: { skill: 'arcana', dc: 16 },
        outcome: {
          resolution:
            "You trace the working that holds the first light caged in dead throats — old, vast, and for all its scale, simple at the join. You draw a clean thread of it off into your palm. The grace of it rides with you, unasked-for and unrepentant.",
          effects: [{ kind: 'grant_blessing', random: true }],
        },
        failureOutcome: {
          resolution:
            "You pull at the binding and it is older than your reading of it. The light in the nearest throat lets go all at once, a soundless white blow across your eyes, and the gallery is just statues when you can see again.",
          effects: [{ kind: 'hp_delta', amount: -9 }],
        },
      },
      {
        id: 'walk-the-gallery',
        label: 'Walk the gallery with your ears stopped',
        hint: 'Some hymns are only dangerous to those who listen.',
        outcome: {
          resolution: 'You press the heels of your hands to your ears and walk the long gallery looking at the floor. The tune frays against the silence you keep. You come out the far end still yourself, which is the whole of the prize.',
          effects: [],
        },
      },
    ],
  }),

  // Ch6 · Beyond the Godwake — the Loom of Souls, the wheel itself.
  EventTemplateSchema.parse({
    id: 'loose-thread-on-the-loom',
    eventType: 'omen',
    title: 'A Loose Thread on the Loom',
    flavor:
      "The walls here are not walls — they are warp and weft, every thread a life being woven back into the world. One thread near you hangs loose from the pattern, frayed at the end, your own colour. The Loom has not yet decided what to do with you.",
    minChapter: 6,
    choices: [
      {
        id: 'tie-it-off',
        label: '[Sleight of Hand] Tie your thread off yourself',
        hint: 'Finish the weave on your own terms before the Loom does it for you. A sure hand binds it clean; a clumsy one snarls the whole row.',
        skillCheck: { skill: 'sleight-of-hand', dc: 16 },
        outcome: {
          resolution:
            "You take your own loose thread between two fingers and tie it off in a knot the Loom did not plan — small, stubborn, yours. The pattern accepts it without unpicking the rest. You walk on woven by your own hand, which is a kind of armour.",
          effects: [{ kind: 'temp_hp', amount: 16 }],
        },
        failureOutcome: {
          resolution:
            "Your fingers fumble the knot and the snarl spreads up the row before you can stop it. The Loom corrects the error the only way it knows — a sharp tug that runs the length of you, fraying something it cannot quite replace.",
          effects: [{ kind: 'hp_delta', amount: -11 }],
        },
      },
      {
        id: 'pull-the-thread',
        label: 'Pull the thread and see what unravels',
        hint: "A whole life's weave is a great deal of thread — and the Loom does not forgive a thief of its work.",
        outcome: {
          random: [
            {
              weight: 55,
              outcome: {
                resolution: 'You pull, and a life not yet woven comes loose into your hand as bright coin and brighter grace — a soul the wheel will simply have to spin again. You pocket what unravels and walk on richer than the dead.',
                effects: [{ kind: 'gold_delta', amount: 80 }, { kind: 'grant_blessing', random: true }],
              },
            },
            {
              weight: 45,
              outcome: {
                resolution: 'You pull, and the thread pulls back — it is fastened to you further up than you knew. The Loom snaps the slack taut and something behind the weave steps through the gap you tore to mend it.',
                effects: [{ kind: 'spawn_ambush', monsterDefIds: ['loom-apostle', 'threadbare-penitent'] }],
              },
            },
          ],
        },
      },
      {
        id: 'read-the-pattern',
        label: '[Investigation] Read where the pattern wants you',
        hint: 'The weave is a map of every life it has rewoven. Find your own row in it and you find a way through.',
        skillCheck: { skill: 'investigation', dc: 16 },
        outcome: {
          resolution:
            "You step back and read the whole field of it — the repeats, the rhymes, the place your colour keeps returning. You find the row that leads out instead of round, and you take it. The knowing of the way pays better than any coin.",
          effects: [{ kind: 'apply_attack_bonus_run', amount: 1 }, { kind: 'temp_hp', amount: 10 }],
        },
        failureOutcome: {
          resolution:
            'The pattern is too vast and too patient to read at the pace you have. You trace a false row, lose it, and step back none the wiser, the loose thread still hanging, the Loom still deciding.',
          effects: [],
        },
      },
      {
        id: 'leave-it-loose',
        label: 'Leave the thread loose and walk on',
        hint: 'An undecided fate is still a free one.',
        outcome: {
          resolution: 'You leave your thread hanging and walk past the loom of it. Better undecided than rewoven. The corridor takes you on, and your colour stays out of the pattern a little longer.',
          effects: [],
        },
      },
    ],
  }),

  EventTemplateSchema.parse({
    id: 'the-unwound-soul',
    eventType: 'ruin',
    title: 'A Soul Cut from the Wheel',
    flavor:
      "Something hangs in the air where the threads thin — a person unwound, a life pulled out of the weave and left to drift, neither dead nor dying nor anything the wheel still has a use for. It turns toward you with the slow attention of a thing that has nothing left but time.",
    minChapter: 6,
    choices: [
      {
        id: 'speak-to-it',
        label: '[Persuasion] Speak it back toward itself',
        hint: 'There is still a person in the drift, if you can call them up. Reach them and they thank you in the only coin the unwound keep.',
        skillCheck: { skill: 'persuasion', dc: 16 },
        outcome: {
          resolution:
            "You speak to it the way you would speak to someone half-woken from drowning — slow, by name it does not have, by the shape of a life it almost remembers. For a moment it gathers, grateful, and presses into your hands the one thing the unwound still hold: the memory of how to refuse the wheel.",
          effects: [{ kind: 'grant_blessing', random: true }],
        },
        failureOutcome: {
          resolution:
            "Your words find nothing to land on. The drift takes them, and takes the warmth out of the air, and the cold of an unmade thing settles into your chest before you step back out of its reach.",
          effects: [{ kind: 'hp_delta', amount: -8 }],
        },
      },
      {
        id: 'gather-the-drift',
        label: '[Arcana] Gather what spills off it',
        hint: 'An unwound soul sheds power it can no longer hold. Catch it clean, or let it earth itself through you.',
        skillCheck: { skill: 'arcana', dc: 15 },
        outcome: {
          resolution:
            "You cup your hands under the drift the way you would catch rain and let what spills off it pool in your palms — raw, unwoven potency the wheel has no further claim on. It is yours now, for as long as the road lasts.",
          effects: [{ kind: 'apply_attack_bonus_run', amount: 2 }],
        },
        failureOutcome: {
          resolution:
            "You misjudge the gathering and the power finds the shortest road to the ground, which is through you. It earths itself out of your boots and leaves you scorched and emptier than you came.",
          effects: [{ kind: 'hp_delta', amount: -10 }],
        },
      },
      {
        id: 'let-it-drift',
        label: 'Let it drift and pass',
        hint: 'Some unmakings are not yours to undo.',
        outcome: {
          resolution: 'You lower your eyes and pass beneath the drift of it. It does not follow — it has nowhere to follow to. Behind you the air stays cold and the person who was never quite there goes on not-being.',
          effects: [],
        },
      },
    ],
  }),

  // Ch7 · The Drowned Archive — the flooded vault of forbidden knowledge.
  EventTemplateSchema.parse({
    id: 'page-that-will-not-drown',
    eventType: 'lore',
    title: 'A Page That Will Not Drown',
    flavor:
      "The water in the stacks stands black and still to your chest. One page floats on its surface, dry — impossibly dry, repelling the flood like oil, ink crawling across it in a hand that writes faster the longer you watch. The Archive drowned everything but this.",
    minChapter: 7,
    choices: [
      {
        id: 'read-before-touch',
        label: '[Arcana] Parse the script before you lift it',
        hint: 'A page the flood will not take is a page that wants taking. Read what it is doing before you give it your hands.',
        skillCheck: { skill: 'arcana', dc: 16 },
        outcome: {
          resolution:
            "You read it where it floats, never touching — and you see the hook in it, the clause that drowns the reader in the writer's place. You take only the clean knowledge and leave the hook unswallowed. The page goes blank and sinks, its work undone, its gift kept.",
          effects: [{ kind: 'grant_blessing', random: true }],
        },
        failureOutcome: {
          resolution:
            "The hand writes faster than you can read and the meaning slips its leash. You reach to steady the page and the flood that spared it remembers you instead — black water closes over your head for a heartbeat that lasts too long, and lets you go heavier.",
          effects: [{ kind: 'hp_delta', amount: -10 }],
        },
      },
      {
        id: 'name-the-author',
        label: '[History] Name the hand that writes it',
        hint: 'Forbidden things were forbidden by someone. Know whose hand this is and you know what it is worth.',
        skillCheck: { skill: 'history', dc: 16 },
        outcome: {
          resolution:
            "You know the cramped, hurried hand — a custodian who sealed this knowledge by drowning the room around it, and kept on writing after the water took everything else. A page in that hand, surfaced, is worth a small fortune to those who still hunt the Archive's leavings. You fold it dry into your coat.",
          effects: [{ kind: 'gold_delta', amount: 90 }],
        },
        failureOutcome: {
          resolution:
            'The hand is familiar the way a drowned face is familiar — close enough to ache, too far gone to name. You watch it write three more lines and recognise none of them, and you leave the page to its endless sentence.',
          effects: [],
        },
      },
      {
        id: 'snatch-it',
        label: 'Snatch the page and run',
        hint: 'Dry paper in a drowned room is a prize. The room may disagree.',
        outcome: {
          resolution:
            "You close your fist on the page and turn for the door. The water, which spared it, does not spare the taking — it rises at your back in a single black wall, and shapes that were custodians come surfacing out of the stacks between you and the dry corridor.",
          effects: [{ kind: 'spawn_ambush', monsterDefIds: ['drowned-acolyte', 'drowned-mnemonic'] }],
        },
      },
      {
        id: 'leave-it-floating',
        label: 'Leave the page to its endless sentence',
        hint: 'Some things were drowned on purpose.',
        outcome: {
          resolution: 'You wade past, the black water lapping cold at your ribs, and leave the page writing itself out across the flood. Whatever it had to say, the Archive already decided no one should hear it. You climb out the far stair dry of its ink.',
          effects: [],
        },
      },
    ],
  }),

  EventTemplateSchema.parse({
    id: 'flooded-reliquary-dive',
    eventType: 'treasure',
    title: 'A Reliquary Below the Black Water',
    flavor:
      "Through the standing flood you can make out a sunken reliquary on the drowned floor, its lid sprung, something inside it catching what little light there is and throwing it back gold. The water above it is deep, and cold, and very still.",
    minChapter: 7,
    choices: [
      {
        id: 'dive-clean',
        label: '[Athletics] Dive for it on one breath',
        hint: 'Down, open, up, before the cold and the dark close in. Strong lungs win the prize; tired ones pay the water.',
        skillCheck: { skill: 'athletics', dc: 16 },
        outcome: {
          resolution:
            "You fill your lungs and go down into the black in three hard strokes, get a hand into the reliquary, and come up streaming before the cold can argue. What you surface clutching was worth the dark — a custodian's hoard, gone to no one for a long time.",
          effects: [{ kind: 'gold_delta', amount: 110 }],
        },
        failureOutcome: {
          resolution:
            "You go down too slow and the cold gets its hands on you first — locks your chest, turns the dark around. You come up where you went down with nothing but a chestful of black water you cough out for a long time after.",
          effects: [{ kind: 'hp_delta', amount: -12 }],
        },
      },
      {
        id: 'read-the-current',
        label: '[Survival] Read the water before you go in',
        hint: 'Still water is rarely only still. Find the cold drag under the surface and you can ride it down and back.',
        skillCheck: { skill: 'survival', dc: 15 },
        outcome: {
          resolution:
            "You read the flood the way you would read a winter river — find the slow cold current circling the reliquary, let it carry you down and hand you back. You break the surface unhurried, the hoard in your fist and your breath barely spent.",
          effects: [{ kind: 'gold_delta', amount: 95 }, { kind: 'temp_hp', amount: 10 }],
        },
        failureOutcome: {
          resolution:
            'You read the water still and safe. It is neither. Something cold turns under the surface as you wade in, and you back out fast, the reliquary still glinting on the floor below, untaken.',
          effects: [],
        },
      },
      {
        id: 'leave-it-sunk',
        label: 'Leave it on the drowned floor',
        hint: 'Gold is no use to the drowned, and the drowned guard it best.',
        outcome: {
          resolution: 'You weigh the cold and the dark against the gold and find the gold wanting. You wade on past, and the reliquary keeps throwing its small light up through the black, for no one.',
          effects: [],
        },
      },
    ],
  }),

  // Ch8 · The Ashfall March — the war-burnt waste.
  EventTemplateSchema.parse({
    id: 'soldier-in-the-ash',
    eventType: 'stranger',
    title: 'A Soldier Who Will Not Fall',
    flavor:
      "A figure stands in the grey fall of ash where a battle-line once was, still at attention, still holding a spear at the guard, burnt past the point a body keeps standing. It does not attack. It is waiting for an order that the war that made it will never give again.",
    minChapter: 8,
    choices: [
      {
        id: 'give-the-order',
        label: '[Intimidation] Give it the order to stand down',
        hint: 'A soldier waits for a voice with the weight of command. Carry it and the war lets one of its dead rest; falter and it takes you for the enemy.',
        skillCheck: { skill: 'intimidation', dc: 16 },
        outcome: {
          resolution:
            "You put the whole of a captain's authority into two words — at ease — and mean them down to the bone. The spear lowers. The burnt thing sags, finally, gratefully, out of its long attention, and presses its kit into your hands as a soldier hands off to relief.",
          effects: [{ kind: 'gold_delta', amount: 60 }, { kind: 'apply_attack_bonus_run', amount: 1 }],
        },
        failureOutcome: {
          resolution:
            "Your command comes out a half-beat unsure, and a soldier knows the sound of a voice that does not believe itself. The spear comes up. It has waited a long time for an enemy, and you will do.",
          effects: [{ kind: 'spawn_ambush', monsterDefIds: ['ember-conscript', 'gravesmoke-revenant'] }],
        },
      },
      {
        id: 'tend-the-burns',
        label: '[Medicine] Tend what the fire left of it',
        hint: 'There may be enough soldier left under the char to ease. Treat it gently and it remembers a kindness; hurt it and it remembers an attack.',
        skillCheck: { skill: 'medicine', dc: 15 },
        outcome: {
          resolution:
            "You work salve into the cracked char with a field-surgeon's care, asking nothing, naming the wounds aloud the way the dying like to hear. Something behind the burns eases. It cannot heal, but it can be grateful, and it points you down the ash-lane to where its company's stores still lie buried.",
          effects: [{ kind: 'temp_hp', amount: 14 }, { kind: 'gold_delta', amount: 40 }],
        },
        failureOutcome: {
          resolution:
            'Your hands find a wound too deep and it flinches the whole burnt length of itself. The spear-butt catches you across the ribs before it settles back to its endless guard. You leave it to its war.',
          effects: [{ kind: 'hp_delta', amount: -7 }],
        },
      },
      {
        id: 'take-the-kit',
        label: 'Strip its kit and leave it standing',
        hint: "It will not stop you. It is waiting for a different enemy.",
        outcome: {
          resolution:
            "You work the field-kit and coin-pouch off the burnt frame while it holds its guard, eyes fixed on a charge that will never come. It lets you. You walk off down the ash-lane with the dead soldier's pay and the dead soldier still standing.",
          effects: [{ kind: 'gold_delta', amount: 45 }],
        },
      },
      {
        id: 'march-past',
        label: 'March past it',
        hint: 'Leave the dead their post.',
        outcome: {
          resolution: 'You give it the wide berth you would give a sentry of your own side and march on through the falling grey. It does not turn to watch. It is watching for someone else, forever.',
          effects: [],
        },
      },
    ],
  }),

  EventTemplateSchema.parse({
    id: 'altar-under-ash',
    eventType: 'shrine',
    title: 'An Altar Half-Drowned in Ash',
    flavor:
      "A war-shrine stands hip-deep in the grey fall, its god's name burned off the lintel, its offering-bowl heaped with ash instead of coin. Someone knelt here once before the fire came. The kneeling-stone is still worn smooth, still waiting.",
    minChapter: 8,
    choices: [
      {
        id: 'clear-the-bowl',
        label: '[Religion] Clear the bowl and guess the god',
        hint: "A war-god burned out of its own shrine still answers a soldier's prayer. Name it right and it girds you; name it wrong and the ash takes the offering and gives nothing.",
        skillCheck: { skill: 'religion', dc: 16 },
        outcome: {
          resolution:
            "You sweep the ash from the bowl and read the shrine by its bones — a frontier war-god, the kind soldiers pray to in the half-hour before a charge. You give it the soldier's prayer, blunt and true, and it answers the way it always did: not with comfort, but with an edge.",
          effects: [{ kind: 'apply_attack_bonus_run', amount: 1 }, { kind: 'temp_hp', amount: 12 }],
        },
        failureOutcome: {
          resolution:
            "You clear the bowl and offer up the wrong god's words. The ash drifts back over the stone as you speak, slow and final, burying the offering and the asking both. The shrine keeps its silence and its god keeps its name.",
          effects: [],
        },
      },
      {
        id: 'sift-the-ash',
        label: '[Investigation] Sift the offering-ash for what the fire spared',
        hint: 'Soldiers leave coin and steel at a war-altar. Fire takes the flesh first and the metal last. Find what is left.',
        skillCheck: { skill: 'investigation', dc: 15 },
        outcome: {
          resolution:
            "You sink your fingers into the cold ash and sift it slow. The fire took the prayers and the offerers; it could not take the brass and silver they left. You come up with a fistful of war-shrine coin, fused and blackened but spendable, and the ash gives it up without complaint.",
          effects: [{ kind: 'gold_delta', amount: 75 }],
        },
        failureOutcome: {
          resolution:
            'You dig too deep too fast and your hand closes on a coal that never went out under the ash-blanket. The burn runs up your wrist before you snatch back, and the bowl keeps the rest of its secrets.',
          effects: [{ kind: 'hp_delta', amount: -8 }],
        },
      },
      {
        id: 'kneel',
        label: 'Kneel a moment, god or no god',
        hint: 'Someone should, before the ash buries it for good.',
        outcome: {
          resolution: 'You put a knee on the worn stone and bow your head to a god whose name the fire ate. No grace answers. But the quiet does, and you rise out of it steadier than you knelt, for having stopped at all.',
          effects: [{ kind: 'temp_hp', amount: 8 }],
        },
      },
    ],
  }),

  // Ch9 · The Court of Masks — the captor's seat of liars where nothing wears
  //     its true face.
  EventTemplateSchema.parse({
    id: 'face-that-is-not-yours',
    eventType: 'omen',
    title: 'A Face That Is Not Yours',
    flavor:
      "A tall glass in a gilt frame stands at a turn of the ruined court, and the figure it shows is wearing your clothes, your wounds, your tired walk — and a stranger's face above the collar, smiling at you with a courtier's ease. \"There you are,\" it says, through the glass. \"I've kept your seat warm at the table.\"",
    minChapter: 9,
    choices: [
      {
        id: 'name-the-lie',
        label: '[Insight] Name which of you is the lie',
        hint: 'The court runs on stolen faces. See through the swap and the reflection forfeits what it stole; miss it and you trade more than a glance.',
        skillCheck: { skill: 'insight', dc: 16 },
        outcome: {
          resolution:
            "You hold its eyes and find the seam in the performance — the half-beat where the smile arrives before the feeling. \"You,\" you tell it, \"are the lie.\" The glass cracks down its smiling middle, and what it stole from you to wear comes back across the break and settles, rightfully, into your hands.",
          effects: [{ kind: 'apply_attack_bonus_run', amount: 1 }, { kind: 'grant_blessing', random: true }],
        },
        failureOutcome: {
          resolution:
            "You search for the seam and the seam is in you — you blink first, and a blink is all it needs. It wears a little more of you out of the glass than it did before, and you walk on feeling the lighter for a theft you cannot name.",
          effects: [{ kind: 'hp_delta', amount: -9 }],
        },
      },
      {
        id: 'lie-better',
        label: '[Deception] Out-lie it for its place at the table',
        hint: 'In a court of masks the better liar keeps the seat. Sell it a face it believes and the table is yours; slip and the host notices a fraud at its board.',
        skillCheck: { skill: 'deception', dc: 17 },
        outcome: {
          resolution:
            "You meet its smile with a wider one and a name grander than the one it stole, and you sell the whole counterfeit so well the glass itself believes you. The reflection bows to a better fraud and steps aside. You take the warm seat, and what sits at the court's table eats well.",
          effects: [{ kind: 'gold_delta', amount: 85 }, { kind: 'temp_hp', amount: 12 }],
        },
        failureOutcome: {
          resolution:
            "Your lie is good. The court has heard better. The host of masks notices a fraud at its board who is not one of its own, and the courtiers turn their borrowed faces toward you all at once.",
          effects: [{ kind: 'spawn_ambush', monsterDefIds: ['veilsworn-courtier', 'mask-chamberlain'] }],
        },
      },
      {
        id: 'shatter-the-glass',
        label: 'Shatter the glass and refuse the seat',
        hint: 'No reflection, no theft. No table, no trap.',
        outcome: {
          resolution: 'You drive your fist through the smiling face before it can finish its courtesy. The glass comes down in a gilt rain and the stranger-face with it. The stolen wounds are yours again, the smile is no one\'s, and the court is one liar quieter.',
          effects: [{ kind: 'hp_delta', amount: -4 }, { kind: 'temp_hp', amount: 10 }],
        },
      },
    ],
  }),

  EventTemplateSchema.parse({
    id: 'masked-hosts-invitation',
    eventType: 'bargain',
    title: "The Masked Host's Invitation",
    flavor:
      "A courtier in a mask of beaten silver bars the gallery with a bow so deep it is almost mockery. \"The court is at table, walker, and a place is open. Wear a face of ours and dine as one of us — we ask only the small thing beneath your own. A name, a memory, a death you're done with. Surely you've a spare.\"",
    minChapter: 9,
    choices: [
      {
        id: 'haggle-the-price',
        label: '[Persuasion] Haggle the toll down to nothing',
        hint: 'Everything at this table is negotiable, even the price of sitting. Talk it down and you dine free; misjudge the room and the host names its own price.',
        skillCheck: { skill: 'persuasion', dc: 16 },
        outcome: {
          resolution:
            "You meet the bow with a courtier's own logic — that a walker who has died as often as you carries more spare deaths than the whole court combined, and so should be paid to sit, not charged. The silver mask tilts, delighted by the cheek of it, and waves you to the board for free. The court's wine is realer than it has any right to be.",
          effects: [{ kind: 'temp_hp', amount: 16 }, { kind: 'gold_delta', amount: 50 }],
        },
        failureOutcome: {
          resolution:
            "Your argument is clever and the host is cleverer. \"A walker who counts his deaths so closely,\" it murmurs, \"must value the last one most.\" It reaches past your guard and takes a measure of you for the seat anyway, and you sit down poorer in a way you cannot count.",
          effects: [{ kind: 'hp_delta', amount: -10 }],
        },
      },
      {
        id: 'pay-a-memory',
        label: 'Pay it a death you are done with',
        hint: 'You have died often. One more spent buys a seat at a warm table.',
        outcome: {
          resolution:
            'You give it one of your deaths — an old one, worn smooth, that you will not miss. The silver mask folds it away like a calling-card and seats you with every courtesy. The food is a lie and the warmth is a lie, but lies in this place still fill a belly, and you rise from the table fed.',
          effects: [{ kind: 'temp_hp', amount: 18 }],
        },
      },
      {
        id: 'unmask-it',
        label: '[Perception] Look under the silver before you answer',
        hint: 'A host who hides its face is hiding its terms. See what wears the mask and you see the trap whole.',
        skillCheck: { skill: 'perception', dc: 16 },
        outcome: {
          resolution:
            "You let your eyes slide past the silver to the join at the jaw, and you see there is no face under the mask at all — only the offer, hungry and hollow, that would have worn yours by the soup course. You step back out of the bow's reach, and the host does not press a guest who has seen the kitchen.",
          effects: [{ kind: 'apply_attack_bonus_run', amount: 1 }],
        },
        failureOutcome: {
          resolution:
            'You look and see only your own reflection in the beaten silver, smiling back with someone else\'s ease. By the time you understand the mask was showing you the price, the bow has straightened and the gallery is colder by a degree you paid for.',
          effects: [{ kind: 'hp_delta', amount: -6 }],
        },
      },
      {
        id: 'decline-the-seat',
        label: 'Decline the seat and walk the gallery',
        hint: 'A meal in this court is never only a meal.',
        outcome: {
          resolution: 'You return the bow exactly as deep and step around it down the gallery. The host does not stop you — a guest who will not sit is no use to the table. The smell of a feast that does not exist follows you to the stair.',
          effects: [],
        },
      },
    ],
  }),

  // ─── Chapter 10: Suldanessellar — the elven city stormed and burning,
  //     climbed toward the Tree of Life. ─────────────────────────────────────
  EventTemplateSchema.parse({
    id: 'burning-bough',
    eventType: 'ruin',
    title: 'A Burning Bough of the Tree',
    flavor:
      "A limb of the Tree of Life has come down across the golden stair, still alight with a fire that does not consume — it burns the way grief burns, slow and without end. Sap runs from the broken wood like blood, and where it pools, the gold of the city is going black.",
    minChapter: 10,
    choices: [
      {
        id: 'tend-the-tree',
        label: '[Medicine] Splint the broken limb',
        hint: "The Tree is dying by inches and the city with it. Dress the wound right and it spares you a leaf's worth of its old strength; do it wrong and the grief-fire finds you.",
        skillCheck: { skill: 'medicine', dc: 16 },
        outcome: {
          resolution:
            "You pack the broken wood with its own fallen leaves and bind it with a strip of your own cloth, the way you would splint a living thing — because it is one. The slow fire gutters where you work. The Tree cannot thank you, but a single leaf falls into your open hand still green, and green things from this Tree do not easily die.",
          effects: [{ kind: 'grant_blessing', random: true }, { kind: 'temp_hp', amount: 12 }],
        },
        failureOutcome: {
          resolution:
            "You reach into the broken wood and the grief-fire reaches back — it is not heat but loss, and it pours up your arms and takes from you something you did not know you still had. You stagger back from the bough lighter and colder, the limb still burning.",
          effects: [{ kind: 'hp_delta', amount: -12 }],
        },
      },
      {
        id: 'gather-the-sap',
        label: '[Survival] Gather the running sap',
        hint: "The Tree's blood is worth more than the city's gold to those who know it. Catch it clean before the black takes it.",
        skillCheck: { skill: 'survival', dc: 15 },
        outcome: {
          resolution:
            "You read which runnels of sap still run gold and which have gone to rot, and you catch the living amber in a flask before it blackens. A vial of the Tree's own blood is a fortune above and a medicine below. You stopper it and climb.",
          effects: [{ kind: 'gold_delta', amount: 100 }, { kind: 'temp_hp', amount: 8 }],
        },
        failureOutcome: {
          resolution:
            'You gather too slow and the sap you catch has already turned — it eats through the flask and stings your palm black before you fling it down. You climb on past the bough empty-handed and smarting.',
          effects: [{ kind: 'hp_delta', amount: -7 }],
        },
      },
      {
        id: 'climb-the-bough',
        label: 'Climb over the burning limb and go on',
        hint: 'The Tree is not your war. The stair is.',
        outcome: {
          resolution: 'You pick your way over the fallen bough, quick where the slow fire licks closest, and gain the golden stair above. Behind you the limb burns on, grieving in the only language a Tree has left. You do not look back.',
          effects: [],
        },
      },
    ],
  }),

  EventTemplateSchema.parse({
    id: 'elf-at-the-last-stair',
    eventType: 'stranger',
    title: 'An Elf at the Last Stair',
    flavor:
      "A bladesinger of Suldanessellar sits with her back to a shattered column, sword across her knees, watching the smoke climb. She does not rise. \"You're going up,\" she says. \"To the Tree. To him.\" Her city burns below the both of you. \"Then you'll want to know how the dragon at the top likes to open. Or you can walk past, and learn it the way I learned it.\"",
    minChapter: 10,
    choices: [
      {
        id: 'win-her-trust',
        label: '[Persuasion] Convince her you can finish it',
        hint: 'She will spend her last knowledge on someone she believes can use it. Earn that belief and she arms you; fail and she keeps her counsel for the smoke.',
        skillCheck: { skill: 'persuasion', dc: 16 },
        outcome: {
          resolution:
            "You tell her, without grandeur, exactly what you mean to do to the thing that did this to her city — and she hears in it the flatness of a promise that will be kept. She nods once, and gives you the dragon's tells: the wing-set before the breath, the half-second its guard opens after. Knowing the opening is half of taking it.",
          effects: [{ kind: 'apply_attack_bonus_run', amount: 2 }],
        },
        failureOutcome: {
          resolution:
            "She listens, and somewhere in your words hears only another walker climbing to die at the top of her stair. \"Go on then,\" she says, and turns back to the smoke. You climb with nothing she could have told you.",
          effects: [],
        },
      },
      {
        id: 'tend-her-wounds',
        label: '[Medicine] Tend the wounds she is hiding',
        hint: 'She holds the sword still to keep from showing how she bleeds. Treat it and she has the breath to give you more than tells.',
        skillCheck: { skill: 'medicine', dc: 15 },
        outcome: {
          resolution:
            "You see past the steady sword to the dark spreading under her gambeson and kneel without asking. She lets you — too tired to refuse, too proud to ask. When the bleeding slows she presses her own warpriest's charm into your hand. \"It kept me alive to this column. Let it get you to the Tree.\"",
          effects: [{ kind: 'grant_blessing', random: true }, { kind: 'temp_hp', amount: 10 }],
        },
        failureOutcome: {
          resolution:
            'You reach for the wound and she catches your wrist with the old reflex of a duelist. "Leave it. It is the only thing holding me up." You take your hand back. She keeps her wound and her counsel both, and you climb.',
          effects: [],
        },
      },
      {
        id: 'sit-with-her',
        label: 'Sit a moment and watch the smoke with her',
        hint: 'She has held this stair alone. Hold it with her, even for a breath.',
        outcome: {
          resolution: 'You sit, and say nothing, and watch her city burn beside her. After a while she names a few of the dead, quietly, so that someone else has heard them. When you rise she touches two fingers to your brow in the old way, and the climb feels less like dying.',
          effects: [{ kind: 'temp_hp', amount: 10 }],
        },
      },
    ],
  }),

  // ─── Chapter 11: The Trials of the Pit — Irenicus's hells, each trial a sin
  //     made flesh. ──────────────────────────────────────────────────────────
  EventTemplateSchema.parse({
    id: 'trial-of-pride',
    eventType: 'omen',
    title: 'The Trial of Pride',
    flavor:
      "The hell arranges itself into a simple test: a figure of cold flame in your own shape stands across a narrow span, and a voice with the captor's cadence says, \"Bow your head to me and cross freely. Or keep your pride, and carry it across yourself — every ounce of it, the whole weight you've never set down.\"",
    minChapter: 11,
    choices: [
      {
        id: 'refuse-to-bow',
        label: '[Athletics] Carry your pride across unbowed',
        hint: "The trial weighs what you will not put down. Bear the whole of it over the span and the hell concedes the strength; let it break your stride and the fall is real.",
        skillCheck: { skill: 'athletics', dc: 17 },
        outcome: {
          resolution:
            "You do not bow. You take the full weight the trial heaps on you — every cruelty survived, every death walked off — and you carry it across the span one grinding step at a time, and you do not kneel. The figure of cold flame goes out. The hell, which feeds on the bending, finds you unbent, and the refusing of it leaves you harder than before.",
          effects: [{ kind: 'apply_attack_bonus_run', amount: 2 }, { kind: 'temp_hp', amount: 12 }],
        },
        failureOutcome: {
          resolution:
            "You take the weight and your knees take it for you — halfway across, your stride breaks and the load drives you down to one knee on the span. Not a bow, but the hell counts it close enough, and the span drops you the rest of the way before you can rise.",
          effects: [{ kind: 'hp_delta', amount: -14 }],
        },
      },
      {
        id: 'see-the-trick',
        label: '[Insight] See what the trial is really asking',
        hint: "A test of pride is rarely about pride. Read the captor's hand behind it and you find the third door.",
        skillCheck: { skill: 'insight', dc: 17 },
        outcome: {
          resolution:
            "You look past the figure and the span and the offered bow, and you see the trial for the captor's small cruelty it is — a thing that only has power if you agree it is a test at all. You do not bow and you do not strain. You simply stop believing the span is there, and walk the ground that was always under it.",
          effects: [{ kind: 'grant_blessing', random: true }],
        },
        failureOutcome: {
          resolution:
            'You hunt for the trick and the trial lets you hunt, patient, while the cold-flame figure mirrors your every searching turn. There is a third door and you do not find it, and the hell takes a measure of your certainty as the price of looking.',
          effects: [{ kind: 'hp_delta', amount: -8 }],
        },
      },
      {
        id: 'bow-and-cross',
        label: 'Bow your head and cross freely',
        hint: 'Pride is a heavy thing to carry through a hell. Set it down and walk.',
        outcome: {
          resolution: 'You bow — to a hell, to a dead man\'s cadence, to nothing that deserves it — and the span lets you across without a fight. The crossing is easy. The taste it leaves is not. You walk on lighter by exactly what you set down.',
          effects: [],
        },
      },
    ],
  }),

  EventTemplateSchema.parse({
    id: 'trial-of-greed',
    eventType: 'bargain',
    title: 'The Trial of Greed',
    flavor:
      "The hell shows you a vault: more gold than the surface holds, relics that would make a god jealous, every want you ever swallowed, heaped to the burning ceiling. \"Take all you can carry,\" the captor's voice offers. \"The trial is only this — that what you take, you carry out on your own back, and the back has a limit you will find.\"",
    minChapter: 11,
    choices: [
      {
        id: 'take-only-what-you-need',
        label: '[Insight] Take only what you can truly bear',
        hint: 'The trial of greed is won by the one who knows their own limit. Judge it right and you walk out laden and whole; misjudge it and the weight stays in the hell with you.',
        skillCheck: { skill: 'insight', dc: 16 },
        outcome: {
          resolution:
            "You read your own back honestly — what it will carry to the far door and no more — and you load exactly that and not a coin past it. The hell, which fattens on the last greedy handful, gets none from you. You walk out under a fair weight of someone else's want, and the door holds open for a measured man.",
          effects: [{ kind: 'gold_delta', amount: 120 }],
        },
        failureOutcome: {
          resolution:
            "You misjudge the heap and the back both — pile on a fortune and find, three steps from the door, that the trial set no limit on the gold and every limit on you. You shed it all just to reach the exit, and stagger out with nothing but the lesson.",
          effects: [{ kind: 'hp_delta', amount: -10 }],
        },
      },
      {
        id: 'leave-the-vault',
        label: 'Walk out of the vault with empty hands',
        hint: 'The only sure way past a trial of greed is to want nothing it offers.',
        outcome: {
          resolution:
            'You look at more than you could spend in ten lives and you turn your back on it and walk to the door empty-handed. The captor\'s voice has nothing to say to that. The hell cannot weigh a man who carries nothing, and it lets you go almost insulted, and you go lighter for wanting less.',
          effects: [{ kind: 'temp_hp', amount: 16 }],
        },
      },
      {
        id: 'grab-everything',
        label: 'Take all of it',
        hint: 'It is right there. What is a trial to a soul that has died this often?',
        outcome: {
          resolution:
            "You load your arms and your back and your fists until you cannot see the door for the gold, and you make it three heaving steps before the hoard's own keepers peel up out of the heap to collect the toll on a greed that overreached.",
          effects: [{ kind: 'spawn_ambush', monsterDefIds: ['hoarding-fiend-of-greed', 'spined-abishai'] }],
        },
      },
    ],
  }),

  // ─── Chapter 12: The Siege of Saradush — the besieged city, Yaga-Shura's
  //     fire giants at the walls. ────────────────────────────────────────────
  EventTemplateSchema.parse({
    id: 'breach-in-the-wall',
    eventType: 'ruin',
    title: 'A Breach in the Saradush Wall',
    flavor:
      "A fire-giant's boulder has stove a hole clean through the curtain wall, and through it the siege glares orange — Yaga-Shura's host moving in the smoke. Two of the city's defenders are trying to shore the breach with rubble and dead men's shields, and losing. One of them sees you. \"Walker — hands, or get clear.\"",
    minChapter: 12,
    choices: [
      {
        id: 'shore-the-breach',
        label: '[Athletics] Put your back into the breach',
        hint: 'The wall holds if enough strong arms hold it. Set the keystone right and the defenders owe you; let it slip and the rubble takes a price in fingers.',
        skillCheck: { skill: 'athletics', dc: 17 },
        outcome: {
          resolution:
            "You get your shoulder under the fallen lintel-stone the defenders cannot lift between them and walk it up into the gap by main force, holding it the long, screaming moment it takes them to wedge it true. The breach holds. The defenders, who expected to die in it, share out what their dead no longer need, and call you by a soldier's name.",
          effects: [{ kind: 'gold_delta', amount: 70 }, { kind: 'apply_attack_bonus_run', amount: 1 }],
        },
        failureOutcome: {
          resolution:
            "You take the lintel's weight and your grip is a hair short of it — the stone twists, catches your hand against the rubble, and the breach sloughs the half-built shore back into the gap. You drag your hand free torn, and the defenders fall back from a wall that will not hold.",
          effects: [{ kind: 'hp_delta', amount: -13 }],
        },
      },
      {
        id: 'read-the-siege',
        label: '[Investigation] Read the siege-lines through the breach',
        hint: "A hole in the wall is also a window. Map the giant host's order through it and you climb knowing where it is thin.",
        skillCheck: { skill: 'investigation', dc: 16 },
        outcome: {
          resolution:
            "You hold at the breach and read the host moving in the smoke — where the fire-giants mass, where the conscripts are only meant to look like a line, where the warlord keeps his flank lazy because nothing has ever turned it. The knowing of the ground is worth more than a held wall. You climb with the siege mapped behind your eyes.",
          effects: [{ kind: 'apply_attack_bonus_run', amount: 2 }],
        },
        failureOutcome: {
          resolution:
            'You linger at the gap too long, reading smoke as if it were order, and the host reads you back. A fire-giant\'s sling answers the silhouette in the breach, and you throw yourself clear of a stone that takes the wall where your head was.',
          effects: [{ kind: 'hp_delta', amount: -9 }],
        },
      },
      {
        id: 'loot-the-fallen',
        label: 'Strip the fallen at the breach and go',
        hint: 'The dead in the gap are past needing it. The defenders are too busy dying to stop you.',
        outcome: {
          resolution:
            "You work fast among the bodies wedged in the rubble while the two defenders strain at the breach they cannot hold — coin, a fire-blackened ring, a captain's purse. The living are too spent to curse you properly. You climb away from a wall that falls behind you.",
          effects: [{ kind: 'gold_delta', amount: 55 }],
        },
      },
      {
        id: 'get-clear',
        label: 'Get clear of the breach',
        hint: 'The wall is the city\'s war, not yours. The stair is yours.',
        outcome: {
          resolution: 'You take the defender at his word and get clear, leaving the breach to the men holding it and the giants who will take it anyway. The orange glare follows you up the inner stair. Somewhere below, the wall gives.',
          effects: [],
        },
      },
    ],
  }),

  EventTemplateSchema.parse({
    id: 'marauders-bargain',
    eventType: 'stranger',
    title: "A Marauder's Bargain",
    flavor:
      "A Saradush marauder leans in a doorway off the burning street, not fighting anyone, a sack at his feet and a half-giant's mace propped easy on his shoulder. \"City's lost, walker. Yaga-Shura's heart's somewhere it can't be killed, so the wall's coming down whatever the fools at the breach think. I've a sack of what the dead won't miss. Trade, or move along — I'm done bleeding for Saradush.\"",
    minChapter: 12,
    choices: [
      {
        id: 'haggle-the-sack',
        label: '[Persuasion] Talk him out of the better half',
        hint: "He is a deserter, not a merchant — his prices are pure nerve. Out-talk the nerve and the sack is yours cheap; lose the exchange and the mace remembers what it's for.",
        skillCheck: { skill: 'persuasion', dc: 16 },
        outcome: {
          resolution:
            "You point out, reasonably, that loot is worth nothing to a dead deserter and that you are the only buyer who is not currently on fire. He weighs it, weighs you, and decides a friend on the stair beats a sack on his back. He hands over the good half and a tip on where the warlord's outriders cached their pay.",
          effects: [{ kind: 'gold_delta', amount: 90 }],
        },
        failureOutcome: {
          resolution:
            "You push the bargain a shade too hard and he decides he liked the sack better than your company. The half-giant's mace comes off his shoulder. \"Should've just moved along, walker.\"",
          effects: [{ kind: 'spawn_ambush', monsterDefIds: ['saradush-marauder', 'half-giant-siegebreaker'] }],
        },
      },
      {
        id: 'read-the-deserter',
        label: '[Insight] Read whether he means to deal straight',
        hint: 'A man who has stopped bleeding for his city may have stopped bleeding for anything. See if the trade is a trade or a trap.',
        skillCheck: { skill: 'insight', dc: 15 },
        outcome: {
          resolution:
            "You watch his free hand, not his mouth — and his free hand is open, tired, done. He means the trade. You take the sack at his asking price without flinching at the dark doorway behind him, because you have already seen there is no one in it. Honest loot from an honest coward.",
          effects: [{ kind: 'gold_delta', amount: 65 }],
        },
        failureOutcome: {
          resolution:
            'You misjudge the tiredness for honesty and reach for the sack — and the second marauder you did not clock steps out of the dark doorway as the first one grins. You break off the deal fast and poorer, a blade having found you in the bad light.',
          effects: [{ kind: 'hp_delta', amount: -8 }],
        },
      },
      {
        id: 'move-along',
        label: 'Move along',
        hint: 'A looter in a burning city is a fight you can decline.',
        outcome: {
          resolution: 'You leave him his sack and his doorway and his certainty that the city is lost. He watches you to the corner, then goes back to waiting out the end of Saradush in the shade. The mace never leaves his shoulder.',
          effects: [],
        },
      },
    ],
  }),

  // ─── Chapter 13–14: The last Bhaalspawn lords and the Throne of Bhaal —
  //     the taint, the essence, the choice at the wheel's true centre. ────────
  EventTemplateSchema.parse({
    id: 'bhaalspawn-shrine',
    eventType: 'shrine',
    title: 'A Shrine Built of Bhaalspawn Bone',
    flavor:
      "One of the Five raised this before you killed your way to it — an altar of fused bone and old blood, every fragment a sibling of yours, a child of the Lord of Murder rendered down to its essence and stacked toward a god that is dead and will not stay dead. The taint in your own blood leans toward it like iron to a lodestone.",
    minChapter: 13,
    choices: [
      {
        id: 'master-the-taint',
        label: '[Religion] Take the essence on your own terms',
        hint: "Bhaal's blood in you answers the altar whether you will it or not. Master the calling and the essence is fuel; lose to it and it burns through you toward the dead god.",
        skillCheck: { skill: 'religion', dc: 17 },
        outcome: {
          resolution:
            "You let the taint reach for the altar and then you take hold of it — name it yours, not the dead god's, and draw the rendered essence of your siblings up your own arm on your own terms. It is a terrible inheritance and you spend it like coin. The Lord of Murder gets nothing. You get the edge of every death stacked here.",
          effects: [{ kind: 'apply_attack_bonus_run', amount: 2 }, { kind: 'temp_hp', amount: 14 }],
        },
        failureOutcome: {
          resolution:
            "The taint slips your grip and the altar takes the slack — it pulls the essence through you toward the god-shaped hole at its centre, and for a roaring moment you are only a conduit, only a fragment among the fragments. You wrench free before it stacks you on the pile, but it keeps a piece on the way out.",
          effects: [{ kind: 'hp_delta', amount: -14 }],
        },
      },
      {
        id: 'read-the-essence',
        label: '[Arcana] Read the working that binds the bone',
        hint: 'One of the Five thought this would raise a dead god. Parse the spell and you parse their plan; misread it and the binding spends its backlash on the nearest heir.',
        skillCheck: { skill: 'arcana', dc: 17 },
        outcome: {
          resolution:
            "You trace the binding through the stacked bone — an ascension-engine, crude and enormous, meant to pour a thousand siblings into one risen throat. You read its flaw, and in reading it you understand the whole shape of what waits at the top of this climb. Knowing the engine is knowing how to break it.",
          effects: [{ kind: 'grant_blessing', random: true }],
        },
        failureOutcome: {
          resolution:
            'The working is layered past your reading — sibling-essence folded over sibling-essence, each a different death. You pull a thread that was load-bearing and the altar discharges its surplus through the nearest source of Bhaal\'s blood, which is you.',
          effects: [{ kind: 'hp_delta', amount: -11 }],
        },
      },
      {
        id: 'break-the-altar',
        label: 'Break the altar and scatter the bone',
        hint: 'Whatever it was raising, it should not rise. Let your siblings rest.',
        outcome: {
          resolution:
            'You take the altar apart with your hands and your heel — unstack the rendered dead, scatter the fused bone, break the lodestone pull of it. The taint in your blood quiets, almost grateful. Whatever the Five meant to raise here will have to be raised somewhere else, by someone with fewer dead siblings on the pile.',
          effects: [{ kind: 'temp_hp', amount: 12 }],
        },
      },
    ],
  }),

  EventTemplateSchema.parse({
    id: 'dragons-hoard-toll',
    eventType: 'bargain',
    title: "A Dragon's Hoard-Toll",
    flavor:
      "The half-dragon steward of the last lord's hoard coils across the only stair up, a treasure of conquered cities heaped at its back. \"Bhaalspawn,\" it says, tasting the word. \"My master will have your essence soon enough. Until then — the hoard takes a toll of all who climb. Pay it in coin, or pay it in the old way, in blood, and I'll let the doomed amuse me a while longer.\"",
    minChapter: 13,
    choices: [
      {
        id: 'riddle-the-dragon',
        label: '[Deception] Convince it you are already promised elsewhere',
        hint: "Dragons hoard, but they also fear a rival claim. Sell it that your essence is spoken for by something it dares not cross, and the toll waives itself. Slip, and it tastes the lie.",
        skillCheck: { skill: 'deception', dc: 17 },
        outcome: {
          resolution:
            "You tell it, with a heir's weary certainty, exactly which greater power has already laid claim to what runs in your blood — and you name something even a half-dragon flatters before it crosses. The great head draws back a fraction. \"...Then climb. I'll not spend my master's quarrel for a toll.\" It uncoils from the stair, and you keep your blood and your coin both.",
          effects: [{ kind: 'apply_attack_bonus_run', amount: 1 }, { kind: 'temp_hp', amount: 10 }],
        },
        failureOutcome: {
          resolution:
            "The lie is bold and the dragon is old, and old things taste a fresh lie the way you taste salt. \"No one has claimed you, little heir. I'll take the toll in the old way, and the lie as interest.\" It comes off the hoard in a rush of scale and fury.",
          effects: [{ kind: 'spawn_ambush', monsterDefIds: ['half-dragon-reaver', 'stormscale-drake'] }],
        },
      },
      {
        id: 'pay-the-toll',
        label: 'Pay the toll in coin',
        hint: 'A hoard the size of cities can be bought past. You have climbed too far to bleed for a stair.',
        requiresGold: 80,
        outcome: {
          resolution:
            'You count the toll out onto the bottom stair, coin by coin, and the half-dragon watches each one fall onto its own heap with a miser\'s satisfaction. "Sensible, for the doomed." It draws aside its coils. You climb past a fortune you will never see again, your blood still your own.',
          effects: [{ kind: 'gold_delta', amount: -80 }],
        },
      },
      {
        id: 'spot-the-hoard',
        label: '[Perception] Spot the prize the steward overlooks',
        hint: "A hoard this vast has corners even its keeper forgets. Find the one piece worth the climb while it postures, and pay the toll out of its own gold.",
        skillCheck: { skill: 'perception', dc: 16 },
        outcome: {
          resolution:
            "You let it monologue and let your eye travel the heap behind it — and there, half-buried where a careless steward let it slide, something older and finer than the rest. While it savours the word doomed, your hand is already closing on the overlooked piece. You pay its toll, when it remembers to ask, out of its own forgotten gold.",
          effects: [{ kind: 'gold_delta', amount: 95 }],
        },
        failureOutcome: {
          resolution:
            'You search the hoard with your eyes and the steward catches the searching. "Counting my gold, little heir?" The tail sweeps the stair and catches you across the chest, and you reel back from a treasure that is very well guarded after all.',
          effects: [{ kind: 'hp_delta', amount: -10 }],
        },
      },
    ],
  }),

  // Ch14 · The Throne of Bhaal — the Pocket Plane, the dead god's seat, the
  //     choice at the centre of the wheel.
  EventTemplateSchema.parse({
    id: 'throne-that-waits',
    eventType: 'omen',
    title: 'The Throne That Waits',
    flavor:
      "The Pocket Plane folds open on it: the Throne of Bhaal, vast and empty and patient, the seat of the dead Lord of Murder waiting for an heir to fill it. The taint in your blood roars toward the empty chair. To sit is to become a god of slaughter. The Throne does not command. It only waits, as it has waited through every life you have spent climbing to it.",
    minChapter: 14,
    choices: [
      {
        id: 'refuse-the-throne',
        label: '[Insight] See the Throne for the trap it is',
        hint: 'Everything in you that the taint built wants to sit. See clearly what sitting makes of you and you walk past it harder than any god; let the blood decide and the seat takes what it is owed.',
        skillCheck: { skill: 'insight', dc: 18 },
        outcome: {
          resolution:
            "You look at the empty seat and, under the roar of the blood, you see plainly what it is: not a reward at the top of the climb but the climb's whole purpose, a god-shaped hunger that would wear your face and call it ascension. You turn your back on the inheritance of every murder in your line. The refusing of it is the strongest thing you have ever done, and it leaves you stronger.",
          effects: [{ kind: 'apply_attack_bonus_run', amount: 2 }, { kind: 'temp_hp', amount: 18 }],
        },
        failureOutcome: {
          resolution:
            "You mean to refuse and the blood means otherwise — for one long, roaring moment you are halfway to the seat before you understand your feet have moved. You wrench yourself back from the edge of becoming, and the Throne takes its small toll for the closeness of it, a tithe of you left on the steps.",
          effects: [{ kind: 'hp_delta', amount: -15 }],
        },
      },
      {
        id: 'commune-with-the-dead-god',
        label: '[Religion] Take the measure of the dead god',
        hint: 'A throne is a god rendered into furniture. Read what is left of Bhaal in it and you read what truly waits at the climb\'s end; misjudge the dead god and its remnant answers.',
        skillCheck: { skill: 'religion', dc: 18 },
        outcome: {
          resolution:
            "You kneel — not to the Throne but at it, the way a physician kneels at a body — and take the measure of what murder made and death unmade. You learn the shape of the dead god's last hunger, and the learning of it girds you for the thing wearing borrowed divinity that waits beyond. Knowledge of a god is half a weapon against one.",
          effects: [{ kind: 'grant_blessing', random: true }],
        },
        failureOutcome: {
          resolution:
            'You reach for the measure of it and the dead god is not so dead as that — the remnant in the seat turns its last attention on the heir who came reading, and the weight of a slain god\'s regard drives you back off the steps, scoured by the touch of it.',
          effects: [{ kind: 'hp_delta', amount: -13 }],
        },
      },
      {
        id: 'leave-the-throne-empty',
        label: 'Leave the Throne empty and walk on',
        hint: 'Some seats are best left cold. The climb does not end here, whatever the blood says.',
        outcome: {
          resolution: 'You set your eyes on the far door and walk the length of the Pocket Plane without once looking at the empty seat, though the blood screams it the whole way. Behind you the Throne goes on waiting, patient as the wheel, for an heir who will not be you. Not this life.',
          effects: [{ kind: 'temp_hp', amount: 10 }],
        },
      },
    ],
  }),

  EventTemplateSchema.parse({
    id: 'voice-in-the-pocket-plane',
    eventType: 'stranger',
    title: 'A Voice in the Pocket Plane',
    flavor:
      "The folded space gives up a figure of hard, clean light — a solar, or the memory of one, standing between you and the last door. \"Child of murder,\" it says, and there is no contempt in it, which is worse. \"You have climbed to the place where the lie at the centre of all this waits in a borrowed crown. Before the door — answer me one thing, and answer it true. What will you do with what you are?\"",
    minChapter: 14,
    choices: [
      {
        id: 'answer-true',
        label: '[Persuasion] Answer it with the truth of your road',
        hint: 'The solar weighs heirs and finds most of them wanting. Give it the true measure of why you climb and it arms you for the last door; give it a flinch and it lets you pass unblessed.',
        skillCheck: { skill: 'persuasion', dc: 17 },
        outcome: {
          resolution:
            "You give it no grand vow and no plea — only the flat, hard truth of every life you have spent climbing to unmake the thing at the top, and what you mean to do when you reach it. The light does not soften, but it inclines, and lays a blessing on you that weighs like a verdict. \"Then go and finish it, child. I will hold the door behind you.\"",
          effects: [{ kind: 'grant_blessing', random: true }, { kind: 'temp_hp', amount: 16 }],
        },
        failureOutcome: {
          resolution:
            'You reach for the truth and find a flinch where it should be — some last reluctance the solar reads in the half-second before you speak. It steps aside without judgement and without grace. "Pass, then. We will both learn what you are at the door." You go on unblessed.',
          effects: [],
        },
      },
      {
        id: 'read-the-light',
        label: '[Arcana] Read what the solar truly is',
        hint: 'A figure of light in the dead god\'s plane is not nothing, and may not be what it seems. Parse it and you parse the last ground before the door; misread it and the reading costs you.',
        skillCheck: { skill: 'arcana', dc: 17 },
        outcome: {
          resolution:
            "You read the working that holds the figure together and find it true — a real fragment of something that still cares whether you fall, snagged in the folds of the Plane to wait for you. You take the measure of its grace and the lay of the ground it guards, and step toward the door knowing the last room before you enter it.",
          effects: [{ kind: 'apply_attack_bonus_run', amount: 2 }],
        },
        failureOutcome: {
          resolution:
            'You parse the light and the light is brighter than your reading — it flares as you trace it, a clean blaze that is not unkind but is far too much, and you blink the Plane back into focus a step further from the door than you stood, scoured and slower.',
          effects: [{ kind: 'hp_delta', amount: -11 }],
        },
      },
      {
        id: 'pass-in-silence',
        label: 'Pass it in silence',
        hint: 'You owe the last question no answer but the door.',
        outcome: {
          resolution: 'You meet the clean light\'s gaze and give it nothing — no vow, no truth, no flinch it can read. After a long moment it steps aside. "Some answer with the doing," it allows, almost to itself. You walk to the last door carrying only what you brought.',
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
