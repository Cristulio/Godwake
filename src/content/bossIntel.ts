import { EventTemplateSchema, type EventTemplate } from '../schemas/event';

/**
 * Boss intel cards — what the player can learn 1 room before each chapter boss.
 *
 * The intel beat is a BG2-style preparatory room (the Twisted Rune door, the
 * approach to Bodhi's lair). Three options:
 *   1. Read the omens (free)        — partial reveal: name, HP range, signature ability + DC
 *   2. Pay for the scout (chapter-scaling gold) — full reveal: HP, AC, all actions with DCs
 *   3. Walk past (free)             — no intel, but boss gold drop +5% on this boss
 *
 * Source of truth: the boss monster definitions. Numbers here mirror the stat
 * blocks so the player who pays the scout is reading the same sheet the engine
 * will roll against. Signature text is diegetic, not stat-sheet narration.
 */
export interface BossIntelCard {
  /** Monster def id this card foreshadows. Matches the boss room's monster. */
  bossDefId: string;
  /** Display name shown on the intel badge during combat. */
  bossName: string;
  /** Partial reveal HP text (banded, not exact — "around 30 HP", "60-80 HP"). */
  hpRangeText: string;
  /** Exact HP, AC, signature DC — revealed in full when the scout is paid. */
  exactHp: number;
  ac: number;
  /** One-line summary of the signature ability (the one to plan around). */
  signature: string;
  /** Per-action stat lines for the scout's full reveal. */
  fullActions: string[];
  /** Title shown on the intel event room. */
  roomTitle: string;
  /** Diegetic flavor text for the intel room — pre-boss BG2/FromSoft tone. */
  roomFlavor: string;
  /** Read-the-omens resolution text (partial reveal). */
  omenResolution: string;
  /** Pay-the-scout resolution text (full reveal). */
  scoutResolution: string;
  /** Walk-past resolution text (gods reward the bold). */
  walkPastResolution: string;
  /** Scout fee in gold. Scales by chapter: 15 / 30 / 50 / 75. */
  scoutPrice: number;
}

export const BOSS_INTEL_CARDS: BossIntelCard[] = [
  // ─── Ch1 · Ilyich ─────────────────────────────────────────────────────
  {
    bossDefId: 'duergar-ilyich',
    bossName: 'Ilyich the Duergar',
    hpRangeText: 'about 30 HP',
    exactHp: 32,
    ac: 16,
    signature: 'Battle-rage at half HP (advantage + 2 damage, rest of fight)',
    fullActions: [
      'Heavy War Pick — +5 to hit · 1d10+3 piercing · reach 5',
      'Battle-rage trigger — at half HP, gains advantage on attacks and +2 damage for the rest of the fight',
    ],
    roomTitle: 'A Duergar Shrine in the Wall',
    roomFlavor:
      "A side-niche carved into the corridor wall — duergar hammers hung crossed above a small mound of bone-meal idols, the meal still loose enough to take a thumbprint. He prays here before each kill, by the look of the worn place on the floor. The smell is iron and old sweat. A scrap of grey hide pinned to the wall reads, in Undercommon, only this: when the iron breaks, the iron does not stop.",
    omenResolution:
      "You read the shrine the way a tracker reads a footprint. Stone-blood fury. The iron does not stop — the duergar phrase for a berserk that starts when the wound is honest. He will be patient until you cut him. Then he will not be patient at all.",
    scoutResolution:
      'The scout was a half-elf with a goblin\'s tongue and a thief\'s memory. She came back with the chalk-mark of the duergar\'s name on her cuff and a clean tally: pick the size of his forearm, two-handed swing, a curse in Undercommon every third stroke. She does not stay for the fight.',
    walkPastResolution:
      "You step past the shrine without breaking stride. Somewhere in the rock the dust shifts as if a god noted the going. The gods reward the bold — Ilyich's purse will weigh a touch heavier when it falls.",
    scoutPrice: 15,
  },
  // ─── Ch2 · The Magistrate ─────────────────────────────────────────────
  {
    bossDefId: 'athkatla-magistrate',
    bossName: 'The Magistrate',
    hpRangeText: 'about 50 HP',
    exactHp: 52,
    ac: 14,
    signature: 'Hold Person — WIS save, DC 12, 3 rounds paralysed',
    fullActions: [
      'Hold Person — WIS save DC 12 · 3 rounds paralysed · opener of choice',
      'Mind Spike — +7 to hit · 3d6+4 psychic · range 60/120 · auto-crit while target is paralysed',
      'Resists psychic damage',
    ],
    roomTitle: "A Court-Crier's Recess",
    roomFlavor:
      "A side-arch off the main avenue where a court-crier has tacked the day's dockets on a board. Among the warrants is the Magistrate's own sentencing notice for last sevenday — twelve names, twelve crossed-out hands, the ink still glossy on three of them. Beneath the board, scratched into the marble by some defendant's last act before the bench, two crooked letters in Common: STAND STILL.",
    omenResolution:
      'You read the board the way a defendant reads it. He does not raise his voice. He raises his hand. Whoever stands still longest is whoever the Magistrate cares to be still — the cold-silver light comes after.',
    scoutResolution:
      'The scout was a Cowled stipendiary who owed someone in Phandalin a favour. She brings a court clerk\'s memorandum: opener is always the same — a gloved hand, a will-clamp — and the sentence is read in Mind Spike afterwards. Three names died standing this month. She has been told to leave you the page and not to be seen leaving.',
    walkPastResolution:
      'You leave the docket-board unread and the warrant un-named. The merchant queen counts the bold among her takers — the Magistrate\'s purse will weigh a touch heavier when the sentence reverses.',
    scoutPrice: 30,
  },
  // ─── Ch3 · The Asylum Director ────────────────────────────────────────
  {
    bossDefId: 'asylum-director',
    bossName: 'The Asylum Director',
    hpRangeText: '70–80 HP',
    exactHp: 78,
    ac: 15,
    signature: 'Hold Person — WIS save, DC 15 (hard) — opens with it',
    fullActions: [
      'Hold Person — WIS save DC 15 · 3 rounds paralysed · the opener',
      "Director's Glaive — +8 to hit · 2d8+4 slashing · reach 10 (auto-crit while you are paralysed and out of reach)",
      'Battle-rage trigger — at half HP, gains advantage and +2 damage for the rest of the fight',
      'Resists psychic damage',
    ],
    roomTitle: "A Vivisector's Tray",
    roomFlavor:
      "A side-room the wardens have not stripped yet. A folding table, oilcloth, a tray of implements laid out in a precise hand: clamps, retractors, two blades of unfamiliar length. On the wall, a chart with twelve named subjects in a small clean script, every name crossed through but the freshest two. A glaive of greater reach than the wardens carry leans in the corner — the Director's, by the silver-and-grey trim of the haft. He sharpens it here.",
    omenResolution:
      'You read the chart the way a subject reads it. He stills the subject first. Then he works at reach. By the time the subject names what is happening, the subject is not on the chart any more — only the cross-stroke is. The glaive in the corner is for when the will-clamp will not be enough.',
    scoutResolution:
      'The scout was a warden\'s apprentice who hates her master enough to bring the ledger. She lays out the routine: a will-clamp first, hard enough that a strong mind still folds half the time; then the glaive at long reach while you cannot close; then, when the work is half-done, a second wind on him you cannot read coming. The page is dated. The page is recent. She does not wait for thanks.',
    walkPastResolution:
      'You leave the tray as you found it and the chart un-named. The Crying God notes the going. The Director\'s strongbox will weigh a touch heavier when the chart breaks.',
    scoutPrice: 50,
  },
  // ─── Ch4 · The Matron Mother ──────────────────────────────────────────
  {
    bossDefId: 'drow-matron-mother',
    bossName: 'The Matron Mother',
    hpRangeText: '90–100 HP',
    exactHp: 96,
    ac: 17,
    signature: "Lolth's Stilling — WIS save, DC 16 (drow priestess-grade)",
    fullActions: [
      "Lolth's Stilling — WIS save DC 16 · 3 rounds paralysed · the temple prayer",
      'Venomed Ritual Dagger — +8 to hit · 2d8+5 poison · reach 5',
      "Spider's Curse — +7 to hit · 1d8 fire · range 60/120",
      'Battle-rage trigger — at half HP, gains advantage and +2 damage for the rest of the fight',
      'Resists poison and psychic damage',
    ],
    roomTitle: 'A Devotional Antechamber',
    roomFlavor:
      "A small antechamber set into the temple corridor — a low basalt slab as an altar, a cup of priestess-cured venom evaporating slow in the air, a thumb-vial of fresh blood crusted around the rim. On the wall in arterial red, the eight-legged sigil of Lolth, and beneath it a litany scratched in drow script: BE STILL FOR THE SPIDER · BE STILL FOR THE PRIESTESS · BE STILL FOR THE TURN OF THE FANG. The stone has been knelt on. The kneel has been deep.",
    omenResolution:
      "You read the litany the way a sacrifice reads it. Three stillings. The priestess does not bargain. She prays you flat and then she opens you with the venom-edge, and the dagger does not draw back between strokes. The vial of blood is from a previous walker. The vial is empty. You will not be still long.",
    scoutResolution:
      "The scout was an Eilistraee-cult drow who has been waiting for a surface-walker worth the risk. She brings the priestess's full devotional pattern: a temple-prayer to still you, then the venomed ritual dagger at close reach turning the wrist on each stroke, and a spider-glyph at distance when you press her. Halfway down the prayer she takes a second wind no surface-priest she has ever seen would survive. The cup of venom on the altar is not for you. The cup of venom is for her.",
    walkPastResolution:
      "You leave the antechamber as you found it and the litany unread. Eilistraee's hidden moon notes the going. The Matron's tribute-purse will weigh a touch heavier when the prayer is broken.",
    scoutPrice: 75,
  },
];

const BY_BOSS_DEF: Map<string, BossIntelCard> = new Map(
  BOSS_INTEL_CARDS.map((c) => [c.bossDefId, c]),
);

export function getBossIntelCard(bossDefId: string): BossIntelCard | null {
  return BY_BOSS_DEF.get(bossDefId) ?? null;
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
 * Build the EventTemplate for a boss intel card. Three choices: omens (free,
 * partial reveal), scout (gold cost, full reveal), walk past (mark bold for
 * +5% gold on that boss). Returned templates are registered into the main
 * event pool from `content/events/index.ts`.
 */
export function buildIntelEventTemplate(card: BossIntelCard): EventTemplate {
  return EventTemplateSchema.parse({
    id: intelEventIdFor(card.bossDefId),
    title: card.roomTitle,
    flavor: card.roomFlavor,
    choices: [
      {
        id: 'read-omens',
        label: 'Read the omens',
        hint: "Free. Reveals the boss's name, rough HP, and signature attack with its save DC.",
        outcome: {
          resolution: card.omenResolution,
          effects: [
            {
              kind: 'reveal_boss_intel',
              bossDefId: card.bossDefId,
              level: 'partial',
            },
          ],
        },
      },
      {
        id: 'pay-for-scout',
        label: 'Pay for the scout',
        hint: "Reveals the boss's exact HP, AC, and every attack with save DCs — kept on a badge during the boss fight.",
        requiresGold: card.scoutPrice,
        outcome: {
          resolution: card.scoutResolution,
          effects: [
            { kind: 'gold_delta', amount: -card.scoutPrice },
            {
              kind: 'reveal_boss_intel',
              bossDefId: card.bossDefId,
              level: 'full',
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
