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
            'You see it in his eyes before his hand moves — terror, not malice. You catch his wrist soft and turn the blade aside. He stares at his empty hand for a long beat. \"Eat,\" you say, and press a coin into the palm. He runs. Something in your chest unclenches.',
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
          resolution: 'He shrugs and the key vanishes. \"Another walker, then. The Director keeps a long list.\"',
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
