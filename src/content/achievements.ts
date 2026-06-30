/**
 * Achievements — the player's permanent record of what they have done in the
 * dark. Each is a stable, named milestone with English copy inline (the source
 * of truth) and a Spanish overlay in `i18n/locales/es/achievements.json`, keyed
 * by id. The four categories shape the Achievements screen's grouping.
 *
 * Steam-shaped on purpose: Godwake is a web build today, so nothing here calls
 * the Steam API — but the ids are stable and named, the difficulty spread is
 * real, and `hidden` flags mirror Steam's spoiler-hidden achievements, so a
 * future desktop/Steamworks wrapper can map each id 1:1 to a Steam achievement.
 * Never rename or reuse an id once shipped — it is the save key AND the Steam
 * key. Add new ones at the end of their category.
 *
 * `criteria` is a PURE predicate over an {@link AchievementContext} snapshot of
 * account-level progress (gathered from metaStore in
 * engine/achievements/check.ts). Keep it pure + cheap: it runs over every
 * not-yet-unlocked achievement at each evaluation moment.
 */
import { listClasses } from './classes';
import { listMonsters } from './monsters';
import { LEGENDARY_ORDER } from './legendaries';
import { GEAR_SETS } from './sets';
import { LORE_BEATS } from './loreBeats';

export type AchievementCategory =
  | 'progression'
  | 'challenge'
  | 'quirky'
  | 'completionist';

export interface Achievement {
  /** Stable id. The save key AND the future Steam key — never rename or reuse. */
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  /**
   * Spoiler-hidden until earned. The screen masks the name + description behind
   * "???" until it is unlocked (the toast on unlock reveals it). Steam maps this
   * to its hidden-achievement flag.
   */
  hidden?: boolean;
  /** Pure predicate: is this achievement satisfied by the given snapshot? */
  criteria: (ctx: AchievementContext) => boolean;
}

/**
 * The snapshot every criteria reads. A flat bundle of account-level progress
 * (survives reincarnation, resets only on save-delete) plus the lightweight
 * counters metaStore keeps for the trickier criteria. Built in
 * engine/achievements/check.ts from the live stores.
 */
export interface AchievementContext {
  chaptersCleared: number;
  deathCount: number;
  delveCount: number;
  hasReincarnated: boolean;
  ascensionUnlocked: number;
  throneCompleted: boolean;
  ownedLegendaries: readonly string[];
  /** SET ids the soul has UNLOCKED (find any piece → whole set unlocks). */
  unlockedSets: readonly string[];
  discoveredMonsters: readonly string[];
  seenDialogueBeats: readonly string[];
  monsterKilledBy: Readonly<Record<string, number>>;
  /** Deepest chapter ever cleared with each class id (high-water per class). */
  classDeepestChapter: Readonly<Record<string, number>>;
  /** Class ids the soul has ever descended as. */
  classesPlayed: readonly string[];
  /** Highest ascension at which any run beat its final boss. -1 if never. */
  highestClearAscension: number;
  /** Highest ascension at which the FULL chain (Maevra) fell. -1 if never. */
  highestThroneAscension: number;
  /** Battles won with exactly 1 HP remaining (cumulative). */
  lowHpWins: number;
  /** Elites felled in open battle (cumulative). */
  eliteFightWins: number;
  /** Times the elite's toll was paid to slip past (cumulative). */
  eliteGoldTaken: number;
  /** Campfire "Tempt the Dark" gambles won (cumulative). */
  darkGambleWins: number;
}

// The eight forged souls (cleric is an unimplemented enum value, so read the
// real list off the class registry). Casters lean on a spell stat; the rest are
// martial. Used by the "sword and spell" / "every soul" criteria.
const PLAYABLE_CLASS_IDS: readonly string[] = listClasses().map((c) => c.id);
const CASTER_CLASS_IDS: readonly string[] = ['wizard', 'druid', 'bard'];
const MARTIAL_CLASS_IDS: readonly string[] = PLAYABLE_CLASS_IDS.filter(
  (id) => !CASTER_CLASS_IDS.includes(id),
);

/** Velnaris is the Chapter-11 boss; the base chain is 11 chapters long. */
const IRENICUS_CHAPTER = 11;
/** The Throne of the Slain God chapters open at Chapter 12. */
const THRONE_CHAPTER = 12;
/** Slain-by flavour keys off the common goblin's bestiary def. */
const GOBLIN_DEF_ID = 'goblin';

function clearedWith(ctx: AchievementContext, classId: string, min = 1): boolean {
  return (ctx.classDeepestChapter[classId] ?? 0) >= min;
}

function ownsAll(owned: readonly string[], full: readonly string[]): boolean {
  return full.every((id) => owned.includes(id));
}

/**
 * The platinum capstone's id. Its criteria is special-cased in
 * {@link evaluateAchievements} (it depends on every OTHER achievement being
 * unlocked, which a per-snapshot predicate can't see), so its inline `criteria`
 * is a placeholder that never fires on its own.
 */
export const PLATINUM_ID = 'godwake-eternal';

export const ACHIEVEMENTS: Achievement[] = [
  // ── Progression — the spine of a playthrough ──────────────────────────────
  {
    id: 'the-wheel-turns',
    name: 'The Wheel Turns',
    description: 'Fall in the dark and wake again — your first death, your first rebirth.',
    category: 'progression',
    criteria: (c) => c.hasReincarnated || c.deathCount >= 1,
  },
  {
    id: 'first-door',
    name: 'The First Door',
    description: "Fell a chapter's keeper and break through into the deeper dark.",
    category: 'progression',
    criteria: (c) => c.chaptersCleared >= 1,
  },
  {
    id: 'deeper-in',
    name: 'Deeper In',
    description: 'Clear three chapters of the long descent.',
    category: 'progression',
    criteria: (c) => c.chaptersCleared >= 3,
  },
  {
    id: 'the-long-road',
    name: 'The Long Road',
    description: 'Clear five chapters of the long descent.',
    category: 'progression',
    criteria: (c) => c.chaptersCleared >= 5,
  },
  {
    id: 'into-the-deep-dark',
    name: 'Into the Deep Dark',
    description: 'Clear eight chapters of the long descent.',
    category: 'progression',
    criteria: (c) => c.chaptersCleared >= 8,
  },
  {
    id: 'the-mage-unmade',
    name: 'The Mage Unmade',
    description: 'Climb to the heart of the work and cut down Velnaris himself.',
    category: 'progression',
    criteria: (c) => c.chaptersCleared >= IRENICUS_CHAPTER,
  },
  {
    id: 'beyond-the-cells',
    name: 'Beyond the Cells',
    description: 'Pass the mage who made you and ascend into the Throne of the Slain God.',
    category: 'progression',
    criteria: (c) => c.chaptersCleared >= THRONE_CHAPTER,
  },
  {
    id: 'godwake',
    name: 'Godwake',
    description: 'Unmake Maevra at the Throne and let the harvest spill back into the dark.',
    category: 'progression',
    criteria: (c) => c.throneCompleted,
  },
  {
    id: 'a-second-skin',
    name: 'A Second Skin',
    description: 'Carry a second class-soul down into the dark.',
    category: 'progression',
    criteria: (c) => c.classesPlayed.length >= 2,
  },
  {
    id: 'relic-bound',
    name: 'Relic-Bound',
    description: 'Earn your first legendary relic and bind it to the soul.',
    category: 'progression',
    criteria: (c) => c.ownedLegendaries.length >= 1,
  },
  {
    id: 'a-matched-thread',
    name: 'A Matched Thread',
    description: 'Recover your first piece of a great set and unlock it.',
    category: 'progression',
    criteria: (c) => c.unlockedSets.length >= 1,
  },
  {
    id: 'into-deeper-dark',
    name: 'Into Deeper Dark',
    description: 'Clear the chain and unlock the first rung of Ascension.',
    category: 'progression',
    criteria: (c) => c.ascensionUnlocked >= 1,
  },
  {
    id: 'bard-debut',
    name: 'Song in the Dark',
    description: 'Clear a chapter as a Bard, lute against the silence.',
    category: 'progression',
    criteria: (c) => clearedWith(c, 'bard', 1),
  },

  // ── Challenge — skill and the Ascension ladder ────────────────────────────
  {
    id: 'ascendant-i',
    name: 'Ascendant I',
    description: 'Beat a run at Ascension 1 or deeper.',
    category: 'challenge',
    criteria: (c) => c.highestClearAscension >= 1,
  },
  {
    id: 'ascendant-ii',
    name: 'Ascendant II',
    description: 'Beat a run at Ascension 2 or deeper.',
    category: 'challenge',
    criteria: (c) => c.highestClearAscension >= 2,
  },
  {
    id: 'ascendant-iii',
    name: 'Ascendant III',
    description: 'Beat a run at Ascension 3 or deeper.',
    category: 'challenge',
    criteria: (c) => c.highestClearAscension >= 3,
  },
  {
    id: 'ascendant-iv',
    name: 'Ascendant IV',
    description: 'Beat a run at Ascension 4 or deeper.',
    category: 'challenge',
    criteria: (c) => c.highestClearAscension >= 4,
  },
  {
    id: 'ascendant-v',
    name: 'Ascendant V',
    description: 'Beat a run at Ascension 5 or deeper.',
    category: 'challenge',
    criteria: (c) => c.highestClearAscension >= 5,
  },
  {
    id: 'ascendant-vi',
    name: 'Ascendant VI',
    description: 'Beat a run at Ascension 6, the deepest dark there is.',
    category: 'challenge',
    criteria: (c) => c.highestClearAscension >= 6,
  },
  {
    id: 'throne-of-the-deepest-dark',
    name: 'Throne of the Deepest Dark',
    description: 'Unmake Maevra at the Throne while bearing the weight of Ascension 6.',
    category: 'challenge',
    criteria: (c) => c.highestThroneAscension >= 6,
  },
  {
    id: 'a-single-heartbeat',
    name: 'A Single Heartbeat',
    description: 'Win a battle with exactly one hit point left in you.',
    category: 'challenge',
    criteria: (c) => c.lowHpWins >= 1,
  },
  {
    id: 'edge-walker',
    name: 'Edge-Walker',
    description: 'Win three battles, each ending on a single hit point.',
    category: 'challenge',
    criteria: (c) => c.lowHpWins >= 3,
  },
  {
    id: 'sword-and-spell',
    name: 'Sword and Spell',
    description: 'Clear a chapter with a caster soul and with a martial soul.',
    category: 'challenge',
    criteria: (c) =>
      CASTER_CLASS_IDS.some((id) => clearedWith(c, id)) &&
      MARTIAL_CLASS_IDS.some((id) => clearedWith(c, id)),
  },
  {
    id: 'toll-refused',
    name: 'Toll Refused',
    description: 'Stand and fell an elite in open battle instead of buying your way past.',
    category: 'challenge',
    criteria: (c) => c.eliteFightWins >= 1,
  },
  {
    id: 'elite-hunter',
    name: 'Elite-Hunter',
    description: 'Fell ten elites in open battle.',
    category: 'challenge',
    criteria: (c) => c.eliteFightWins >= 10,
  },
  {
    id: 'bard-last-verse',
    name: 'The Last Verse',
    description: 'Cut down Velnaris with nothing but a Bard and a song.',
    category: 'challenge',
    criteria: (c) => clearedWith(c, 'bard', IRENICUS_CHAPTER),
  },
  {
    id: 'bard-the-show-goes-on',
    name: 'The Show Goes On',
    description: 'Carry the Bard past Velnaris and into the Throne of the Slain God.',
    category: 'challenge',
    criteria: (c) => clearedWith(c, 'bard', THRONE_CHAPTER),
  },

  // ── Quirky / hidden — masked until earned ─────────────────────────────────
  {
    id: 'the-dark-answered',
    name: 'The Dark Answered',
    description: 'Throw the bones at the campfire and have the dark answer in your favour.',
    category: 'quirky',
    hidden: true,
    criteria: (c) => c.darkGambleWins >= 1,
  },
  {
    id: 'fortunes-fool',
    name: "Fortune's Fool",
    description: 'Win the campfire gamble five times. The dark always collects, eventually.',
    category: 'quirky',
    hidden: true,
    criteria: (c) => c.darkGambleWins >= 5,
  },
  {
    id: 'the-cowards-tithe',
    name: "The Coward's Tithe",
    description: 'Buy your way past an elite ten times. Discretion, repeatedly.',
    category: 'quirky',
    hidden: true,
    criteria: (c) => c.eliteGoldTaken >= 10,
  },
  {
    id: 'inglorious-end',
    name: 'Inglorious End',
    description: 'Be slain by a common goblin. The wheel does not care for dignity.',
    category: 'quirky',
    hidden: true,
    criteria: (c) => (c.monsterKilledBy[GOBLIN_DEF_ID] ?? 0) >= 1,
  },
  {
    id: 'matched',
    name: 'Matched',
    description: 'Unlock three great sets across your lives.',
    category: 'quirky',
    hidden: true,
    criteria: (c) => c.unlockedSets.length >= 3,
  },
  {
    id: 'the-wheel-grinds-on',
    name: 'The Wheel Grinds On',
    description: 'Die twenty-five times across all your lives.',
    category: 'quirky',
    hidden: true,
    criteria: (c) => c.deathCount >= 25,
  },
  {
    id: 'many-masks',
    name: 'Many Masks',
    description: 'Wear four different class-souls into the dark.',
    category: 'quirky',
    hidden: true,
    criteria: (c) => c.classesPlayed.length >= 4,
  },
  {
    id: 'tireless',
    name: 'Tireless',
    description: 'Begin fifty descents. The dark never runs short of doors.',
    category: 'quirky',
    hidden: true,
    criteria: (c) => c.delveCount >= 50,
  },

  // ── Completionist — the long grind to a full ledger ───────────────────────
  {
    id: 'the-whole-bestiary',
    name: 'The Whole Bestiary',
    description: 'Record every creature that walks, crawls, or festers in the dark.',
    category: 'completionist',
    criteria: (c) => ownsAll(c.discoveredMonsters, listMonsters().map((m) => m.id)),
  },
  {
    id: 'every-relic',
    name: 'Every Relic',
    description: 'Bind every legendary relic to the soul.',
    category: 'completionist',
    criteria: (c) => ownsAll(c.ownedLegendaries, LEGENDARY_ORDER),
  },
  {
    id: 'every-set',
    name: 'Every Set',
    description: 'Unlock every great set, thread for matching thread.',
    category: 'completionist',
    criteria: (c) => ownsAll(c.unlockedSets, GEAR_SETS.map((s) => s.id)),
  },
  {
    id: 'every-soul',
    name: 'Every Soul',
    description: 'Clear a chapter with all eight class-souls.',
    category: 'completionist',
    criteria: (c) => PLAYABLE_CLASS_IDS.every((id) => clearedWith(c, id)),
  },
  {
    id: 'eight-masters',
    name: 'Eight Masters',
    description: 'Cut down Velnaris with all eight class-souls in turn.',
    category: 'completionist',
    criteria: (c) => PLAYABLE_CLASS_IDS.every((id) => clearedWith(c, id, IRENICUS_CHAPTER)),
  },
  {
    id: 'the-whole-truth',
    name: 'The Whole Truth',
    description: 'Hear every whisper of the soul-bond, beginning to end.',
    category: 'completionist',
    criteria: (c) => ownsAll(c.seenDialogueBeats, LORE_BEATS.map((b) => b.id)),
  },
  {
    id: 'the-deepest-dark',
    name: 'The Deepest Dark',
    description: 'Open every rung of the Ascension ladder.',
    category: 'completionist',
    criteria: (c) => c.ascensionUnlocked >= 6,
  },
  {
    id: PLATINUM_ID,
    name: 'Godwake Eternal',
    description: 'Earn every other mark the wheel can give. There is nothing left to prove to the dark.',
    category: 'completionist',
    // Special-cased in evaluateAchievements (depends on all others); never fires
    // from this placeholder on its own.
    criteria: () => false,
  },
];

const ACHIEVEMENTS_BY_ID: Record<string, Achievement> = ACHIEVEMENTS.reduce(
  (acc, a) => {
    acc[a.id] = a;
    return acc;
  },
  {} as Record<string, Achievement>,
);

export function listAchievements(): Achievement[] {
  return ACHIEVEMENTS;
}

export function getAchievement(id: string): Achievement | undefined {
  return ACHIEVEMENTS_BY_ID[id];
}

/** Every achievement except the platinum capstone — what the platinum requires. */
const NON_PLATINUM_IDS: readonly string[] = ACHIEVEMENTS.filter(
  (a) => a.id !== PLATINUM_ID,
).map((a) => a.id);

/**
 * Pure evaluation: given a progress snapshot and the ids already unlocked,
 * return the ids NEWLY satisfied (never already-unlocked ones). The platinum
 * capstone is handled separately — it unlocks once every other achievement is
 * (already or newly) unlocked, so a single pass over the full set fixes it
 * without a second evaluation round.
 */
export function evaluateAchievements(
  ctx: AchievementContext,
  alreadyUnlocked: readonly string[],
): string[] {
  const have = new Set(alreadyUnlocked);
  const newly: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (a.id === PLATINUM_ID || have.has(a.id)) continue;
    if (a.criteria(ctx)) newly.push(a.id);
  }
  if (!have.has(PLATINUM_ID)) {
    const unlockedNonPlatinum = NON_PLATINUM_IDS.every(
      (id) => have.has(id) || newly.includes(id),
    );
    if (unlockedNonPlatinum) newly.push(PLATINUM_ID);
  }
  return newly;
}
