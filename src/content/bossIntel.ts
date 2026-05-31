import { EventTemplateSchema, type EventTemplate } from '../schemas/event';

/**
 * Boss intel cards — the tactical edge a player can ready 1 room before each
 * chapter boss.
 *
 * The intel beat is a BG2-style preparatory room (the Twisted Rune door, the
 * approach to Bodhi's lair). Reading the room no longer dumps a stat sheet —
 * once a boss is memorised, raw numbers are worthless. Instead each choice
 * grants a *combat* edge consumed at the boss fight:
 *   1. Find the weak spot (free)   — `weak-spot`: advantage on your opening strike.
 *   2. Study the approach (coin)   — `battle-plan`: opening strike + advantage on
 *                                     your first save (the held-opener counter) +
 *                                     a chapter-scaled temp-HP gird.
 *   3. Walk past (free)            — no edge, but boss gold drop +10% on this boss.
 *
 * Buff magnitudes are defined here (`bossIntelBuffFor`) and applied at boss
 * combat start in `createCombat`. The intel beat is preparation, not narration.
 */
export interface BossIntelCard {
  /** Monster def id this card foreshadows. Matches the boss room's monster. */
  bossDefId: string;
  /** Chapter index (1-6). Scales the `battle-plan` temp-HP gird. */
  chapter: 1 | 2 | 3 | 4 | 5 | 6;
  /** Title shown on the intel event room. */
  roomTitle: string;
  /** Diegetic flavor text for the intel room — pre-boss BG2/FromSoft tone. */
  roomFlavor: string;
  /** Resolution text for the free "find the weak spot" choice. */
  weakSpotResolution: string;
  /** Resolution text for the paid "study the approach" choice. */
  battlePlanResolution: string;
  /** Walk-past resolution text (gods reward the bold). */
  walkPastResolution: string;
  /** Coin cost of the paid edge. Set via {@link bossIntelCoinCost}: 25 / 60 / 105 / 160. */
  coinCost: number;
}

/**
 * Paid-edge price for a chapter's intel. Scales super-linearly (5·ch² + 20·ch)
 * so it tracks the rising purse a player carries deeper in — boss drops and
 * elite/combat gold both climb by chapter, so a flat fee would be pocket change
 * by the endgame. This keeps "study the approach" a real gold sink and a genuine
 * trade against a potion or a piece of gear. Ch1-5: 25 / 60 / 105 / 160 / 225.
 */
export function bossIntelCoinCost(chapter: BossIntelCard['chapter']): number {
  return 5 * chapter * chapter + 20 * chapter;
}

export const BOSS_INTEL_CARDS: BossIntelCard[] = [
  // ─── Ch1 · Ilyich ─────────────────────────────────────────────────────
  {
    bossDefId: 'duergar-ilyich',
    chapter: 1,
    roomTitle: 'A Duergar Shrine in the Wall',
    roomFlavor:
      "A side-niche carved into the corridor wall — duergar hammers hung crossed above a small mound of bone-meal idols, the meal still loose enough to take a thumbprint. He prays here before each kill, by the look of the worn place on the floor. The smell is iron and old sweat. A scrap of grey hide pinned to the wall reads, in Undercommon, only this: when the iron breaks, the iron does not stop.",
    weakSpotResolution:
      "You read the shrine the way a tracker reads a footprint. He fights right-handed and guards his off-side late — the iron does not stop, but it starts honest and slow. You will know where to put the first cut.",
    battlePlanResolution:
      "You read the shrine and then the worn place on the floor, and you map the whole approach. He opens patient, swings two-handed, and only breaks into the rage once the wound is honest. You walk in with the first cut planned and your guard already set for the turn.",
    walkPastResolution:
      "You step past the shrine without breaking stride. Somewhere in the rock the dust shifts as if a god noted the going. The gods reward the bold — Ilyich's purse will weigh a touch heavier when it falls.",
    coinCost: bossIntelCoinCost(1),
  },
  // ─── Ch2 · The Magistrate ─────────────────────────────────────────────
  {
    bossDefId: 'athkatla-magistrate',
    chapter: 2,
    roomTitle: "A Court-Crier's Recess",
    roomFlavor:
      "A side-arch off the main avenue where a court-crier has tacked the day's dockets on a board. Among the warrants is the Magistrate's own sentencing notice for last sevenday — twelve names, twelve crossed-out hands, the ink still glossy on three of them. Beneath the board, scratched into the marble by some defendant's last act before the bench, two crooked letters in Common: STAND STILL.",
    weakSpotResolution:
      'You read the board the way a defendant reads it. He does not raise his voice — he raises his hand, and the cold-silver light comes after. Knowing the gesture is coming, your first blow finds the gap before he can lift it.',
    battlePlanResolution:
      'You read the board, then the order the names were crossed in. The opener is always the will-clamp; the sentence is read after. You time your guard to the gesture — your mind braced against the clamp — and put your first strike in before it lands.',
    walkPastResolution:
      'You leave the docket-board unread and the warrant un-named. The merchant queen counts the bold among her takers — the Magistrate\'s purse will weigh a touch heavier when the sentence reverses.',
    coinCost: bossIntelCoinCost(2),
  },
  // ─── Ch3 · The Asylum Director ────────────────────────────────────────
  {
    bossDefId: 'asylum-director',
    chapter: 3,
    roomTitle: "A Vivisector's Tray",
    roomFlavor:
      "A side-room the wardens have not stripped yet. A folding table, oilcloth, a tray of implements laid out in a precise hand: clamps, retractors, two blades of unfamiliar length. On the wall, a chart with twelve named subjects in a small clean script, every name crossed through but the freshest two. A glaive of greater reach than the wardens carry leans in the corner — the Director's, by the silver-and-grey trim of the haft. He sharpens it here.",
    weakSpotResolution:
      'You read the chart the way a subject reads it. He stills the subject first, then works the long blade. Knowing the order, you set your opening blow for the half-beat before the clamp closes.',
    battlePlanResolution:
      "You read the chart and the routine both: the will-clamp first, then the glaive at reach, and a second wind when the work is half-done. You walk in with your mind braced against the clamp and your first strike already aimed at the gap his routine leaves open.",
    walkPastResolution:
      'You leave the tray as you found it and the chart un-named. The Crying God notes the going. The Director\'s strongbox will weigh a touch heavier when the chart breaks.',
    coinCost: bossIntelCoinCost(3),
  },
  // ─── Ch4 · The Matron Mother ──────────────────────────────────────────
  {
    bossDefId: 'drow-matron-mother',
    chapter: 4,
    roomTitle: 'A Devotional Antechamber',
    roomFlavor:
      "A small antechamber set into the temple corridor — a low basalt slab as an altar, a cup of priestess-cured venom evaporating slow in the air, a thumb-vial of fresh blood crusted around the rim. On the wall in arterial red, the eight-legged sigil of Lolth, and beneath it a litany scratched in drow script: BE STILL FOR THE SPIDER · BE STILL FOR THE PRIESTESS · BE STILL FOR THE TURN OF THE FANG. The stone has been knelt on. The kneel has been deep.",
    weakSpotResolution:
      "You read the litany the way a sacrifice reads it. The prayer comes first — be still — and the venom-edge after. Knowing the stilling is the opener, you set your first cut to land before she finishes the words.",
    battlePlanResolution:
      "You read the litany and the whole devotional pattern: the temple-prayer to still you, the venomed dagger turning on each stroke, the spider-glyph at distance, the second wind halfway down the prayer. You walk in with your mind set against the stilling and your opening strike already aimed past her guard.",
    walkPastResolution:
      "You leave the antechamber as you found it and the litany unread. Eilistraee's hidden moon notes the going. The Matron's tribute-purse will weigh a touch heavier when the prayer is broken.",
    coinCost: bossIntelCoinCost(4),
  },
  // ─── Ch5 · The Hollow Dawn ────────────────────────────────────────────
  {
    bossDefId: 'hollow-dawn',
    chapter: 5,
    roomTitle: 'A Reliquary of First Mornings',
    roomFlavor:
      "A side-shrine off the long climb into the light — a slab of pale stone, and on it the relics the dead god kept of its own dawns: a phial of the first light there ever was, gone still and cold; a sword-form scratched into the stone in a hand that drilled it ten thousand times; a litany in a script older than letters, glowing faint. You can read it anyway, the way you can read a thing in a dream: BE STILL · YOU HAVE RUN THE WHOLE CYCLE · REST NOW · LET THE MORNING BREAK ON YOU AS IT HAS BROKEN ON ALL THE OTHERS. The slab has been knelt at. The kneeling has worn the stone to fit a shape you recognise, with a cold turn in your chest, as your own.",
    weakSpotResolution:
      "You read the relics the way one of its turned souls reads them — and you have been one, more times than you have lived. The command comes first, your own forgotten name and then 'be still'; the dawn-blade after. Knowing the prayer is the opener, you set your first cut to land before the morning breaks.",
    battlePlanResolution:
      "You read the relics and the whole shape of the climb: the command to still you with the name you wore before your first death, the dawn-blade falling twice where it has fallen on every soul before you, and the long patience that curdles to rage once the wound runs honest. You walk in with your mind set against your own name and your opening strike already aimed past the first light.",
    walkPastResolution:
      "You leave the reliquary as you found it and the litany unread. Somewhere far up the climb, a vast and tired thing marks the going, almost glad. The Hollow Dawn's hoard — the coin of every pilgrim it ever turned and sent back — will weigh a touch heavier when the morning finally ends.",
    coinCost: bossIntelCoinCost(5),
  },
  // ─── Ch6 · The Unmade (Beyond the Godwake) ────────────────────────────
  {
    bossDefId: 'the-unmade',
    chapter: 6,
    roomTitle: 'A Worn Place on the Rim',
    roomFlavor:
      "A hand's breadth of the rim where the wheel turns slow enough to read. The thread comes off the axle here and you can see, for once, the pattern of the turning: the long still beat where nothing moves, and then the hand coming round. Scored into the rim by something that climbed this far before you and got no further, two words in a hand worn almost smooth: BE SOMETHING. Below them, where the same hand pressed too hard at the end: the still point does not move — STAND IN IT.",
    weakSpotResolution:
      "You read the rim the way a thing reads a millrace it means to walk against. The Unmade does not strike first — it withdraws first, and the unmaking comes in the still beat before the hand. Knowing where the beat falls, your opening blow lands in the gap it leaves while it is not yet looking at you.",
    battlePlanResolution:
      "You read the whole turning: the unmaking first, in the still beat, to empty you out — then the hand of the wheel, round and round, twice to the stroke — and the moment past half when it stops turning the wheel by habit and turns it by will. You walk into the still centre with your mind braced against the unmaking and your first strike already set for the gap before the hand comes round.",
    walkPastResolution:
      "You leave the worn place unread and the warning un-heeded. Whatever climbed this far before you scored its last thought into the rim and you step over it without stopping. The thing at the centre marks the going — the bold take the still point on their own terms, and what the wheel sheds for you will weigh a touch heavier when the hand stops.",
    coinCost: bossIntelCoinCost(6),
  },
];

const BY_BOSS_DEF: Map<string, BossIntelCard> = new Map(
  BOSS_INTEL_CARDS.map((c) => [c.bossDefId, c]),
);

export function getBossIntelCard(bossDefId: string): BossIntelCard | null {
  return BY_BOSS_DEF.get(bossDefId) ?? null;
}

export type BossIntelBuffTier = 'weak-spot' | 'battle-plan';

/**
 * The mechanical edge a readied intel choice grants at the boss fight. All
 * levers are combat-scoped (consumed in/by the fight), so the buff never leaks
 * into later chapters of the same delve.
 */
export interface BossIntelBuff {
  tier: BossIntelBuffTier;
  /** Short label for the resolution / rewards line. */
  label: string;
  /** Player-facing one-liner describing the edge. */
  description: string;
  /** Temp-HP gird applied at boss-combat start (non-stacking with blessings). */
  tempHp: number;
  /** Advantage on the opening attack roll against the boss. */
  firstStrikeAdvantage: boolean;
  /** Advantage on the first saving throw vs the boss — the held-opener counter. */
  bracedSave: boolean;
}

/** Battle-plan gird scales with chapter: 6 / 9 / 12 / 15 / 18 temp HP. */
function battlePlanTempHp(chapter: BossIntelCard['chapter']): number {
  return 3 * (chapter + 1);
}

/**
 * Resolve the combat edge for a boss + tier. Returns null for an unknown boss
 * (defensive — the room only ever offers cards that exist).
 *
 * Pass `classId` at runtime (createCombat) to get the class-appropriate
 * weak-spot: weapon classes get firstStrikeAdvantage, Wizard gets bracedSave
 * (advantage on the first save vs the boss's opener) since Wizard spells
 * either save-for-half or auto-hit and rarely lead with a spell attack roll.
 */
export function bossIntelBuffFor(
  bossDefId: string,
  tier: BossIntelBuffTier,
  classId?: string,
): BossIntelBuff | null {
  const card = getBossIntelCard(bossDefId);
  if (!card) return null;
  if (tier === 'weak-spot') {
    const isCaster = classId === 'wizard';
    return {
      tier,
      label: 'Weak Spot',
      description: isCaster
        ? "You have read the boss's opener — advantage on your first saving throw."
        : 'Advantage on your opening strike against the boss.',
      tempHp: 0,
      firstStrikeAdvantage: !isCaster,
      bracedSave: isCaster,
    };
  }
  const gird = battlePlanTempHp(card.chapter);
  return {
    tier,
    label: 'Battle Plan',
    description: `Advantage on your opening strike and first save vs the boss, plus ${gird} temporary HP.`,
    tempHp: gird,
    firstStrikeAdvantage: true,
    bracedSave: true,
  };
}

/**
 * Stable event template id for a given boss intel beat. Used both at room
 * placement time (so the chapter pool can deterministically slot the right
 * intel) and at lookup time (so the EventRoom UI can resolve the template).
 */
export function intelEventIdFor(bossDefId: string): string {
  return `boss-intel-${bossDefId}`;
}

/**
 * Build the EventTemplate for a boss intel card. Three choices: find the weak
 * spot (free, minor edge), study the approach (coin, bigger edge), walk past
 * (mark bold for +10% gold on that boss). Returned templates are registered
 * into the main event pool from `content/events/index.ts`.
 */
export function buildIntelEventTemplate(card: BossIntelCard): EventTemplate {
  const battlePlan = bossIntelBuffFor(card.bossDefId, 'battle-plan')!;
  return EventTemplateSchema.parse({
    id: intelEventIdFor(card.bossDefId),
    title: card.roomTitle,
    flavor: card.roomFlavor,
    choices: [
      {
        id: 'find-weak-spot',
        label: 'Find the weak spot',
        hint: `Free. Advantage on your opening attack (weapon) or first saving throw (caster).`,
        outcome: {
          resolution: card.weakSpotResolution,
          effects: [
            {
              kind: 'grant_boss_buff',
              bossDefId: card.bossDefId,
              tier: 'weak-spot',
            },
          ],
        },
      },
      {
        id: 'study-the-approach',
        label: 'Study the approach',
        hint: battlePlan.description,
        requiresGold: card.coinCost,
        outcome: {
          resolution: card.battlePlanResolution,
          effects: [
            { kind: 'gold_delta', amount: -card.coinCost },
            {
              kind: 'grant_boss_buff',
              bossDefId: card.bossDefId,
              tier: 'battle-plan',
            },
          ],
        },
      },
      {
        id: 'walk-past',
        label: 'Walk past',
        hint: 'Walk past. The bold take their road and ask no questions.',
        outcome: {
          resolution: card.walkPastResolution,
          effects: [{ kind: 'mark_bold_approach', bossDefId: card.bossDefId }],
        },
      },
    ],
  });
}

export function buildAllIntelEventTemplates(): EventTemplate[] {
  return BOSS_INTEL_CARDS.map(buildIntelEventTemplate);
}
