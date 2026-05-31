import type { FeatureId } from '../engine/progression/unlocks';

/**
 * The teaching copy shown the first time a gated feature unlocks on the
 * progression ladder (engine/progression/unlocks.ts). One card per FeatureId,
 * fired once per soul by the delve-count trigger and tracked in
 * metaStore.seenTutorials. This is MECHANICAL teaching — what the feature is and
 * how to use it well — not story (the lore beats live elsewhere).
 */
export interface TutorialContent {
  /** The thing being unlocked, as a noun phrase ("Legendary Relics"). */
  title: string;
  /** Plain-English explanation, a paragraph or two — what it is, how it works. */
  body: string[];
  /** The single most important mechanic, called out so it can't be missed. */
  key: string;
}

/**
 * Authored content keyed by FeatureId. The `Record<FeatureId, …>` type forces
 * exactly one card per gated feature — add a feature to the ladder and the
 * compiler demands its tutorial here.
 */
export const TUTORIALS: Record<FeatureId, TutorialContent> = {
  grove: {
    title: 'The Druid Grove',
    body: [
      'Delving earns Renown — a soul-currency that survives death. Back at the hub you can now spend it at the Druid Grove on permanent upgrades: more health, sharper attacks, class tricks.',
      'Grove upgrades are forever. Every one you buy makes every future life a little stronger, so a soul that keeps dying still keeps climbing.',
    ],
    key: 'Renown buys permanent power at the Grove — it never resets on death.',
  },
  'affixes-rare': {
    title: 'Rare Gear',
    body: [
      'Loot now rolls up to Rare (blue). Where Uncommon gear carries one magical affix, a Rare piece carries two.',
      'Affixes are effects, not just bigger numbers — bleed on hit, bonus crit, resistances. Read what a drop actually does and equip the pieces that fit how you fight.',
    ],
    key: 'Rare = two affixes. Build around the effects, not the rarity colour.',
  },
  'elite-nodes': {
    title: 'Elite Encounters',
    body: [
      'The route map now offers Elite rooms — marked, optional fights against a tougher foe. You choose whether to take the path through one.',
      'Elites hit harder but pay better: more gold, better gear, and the chance at a Legendary relic. Skip them when you are hurt; take them when you are strong.',
    ],
    key: 'Elites are opt-in risk for the best loot in the chapter.',
  },
  'boss-intel': {
    title: 'Boss Intel',
    body: [
      'Before a chapter boss you can now spend gold to study its approach. The intel buys a concrete edge for that fight — a weakness exposed, an opener blunted.',
      'It is a real cost, and it scales up by chapter, so weigh the coin against the boss in front of you rather than buying it on reflex.',
    ],
    key: 'Pay gold before a boss to study it and enter with an advantage.',
  },
  legendaries: {
    title: 'Legendary Relics',
    body: [
      'Legendary relics now drop — earned at Elite encounters and offered in the shop reliquary. Unlike ordinary loot, relics are account-level: they persist through every death and every run.',
      'Equip them at the hub between delves. Their effects reshape how your class plays, not just its stats. Some are class-bound and only work in the right hands.',
    ],
    key: 'Relics are permanent and equipped at the hub — they carry across all your runs.',
  },
  'affixes-epic': {
    title: 'Epic Gear',
    body: [
      'Loot can now roll up to Epic (purple) — three or four affixes stacked on a single item.',
      'This is the strongest gear short of a Legendary. The payoff is in the combinations: an Epic that lines up several affixes with your class can carry a whole run.',
    ],
    key: 'Epic = three or four affixes. Hunt for pieces whose effects combo.',
  },
  'class-roster': {
    title: 'Change Your Class',
    body: [
      'You can now swap to a different class at the hub between runs. Your Renown comes with you to the new body.',
      'But Grove upgrades are tracked per class — Renown spent on a Fighter does nothing for a Wizard. Pick the class you mean to climb with and commit your spending to it.',
    ],
    key: 'Renown carries between classes; Grove upgrades do not — commit to one.',
  },
  sets: {
    title: 'Relic Sets',
    body: [
      'Some Legendary relics belong to a Set. Equip two or more pieces of the same set and you unlock bonus effects on top of what each relic already does.',
      'Partial sets count — every matching piece you add deepens the bonus. Building toward a set is a payoff worth chasing across runs.',
    ],
    key: 'Stack pieces of one set for bonuses beyond each relic alone.',
  },
  'grove-deep': {
    title: 'Deeper Grove Tiers',
    body: [
      'Your mastery has opened the Grove’s deeper tiers — stronger upgrades gated behind Ascension, for souls who have proven themselves.',
      'This is the serious, late-game power that lets a veteran soul push further up the Ascension ladder than a fresh one ever could.',
    ],
    key: 'The deepest Grove upgrades are how veterans climb the Ascension ladder.',
  },
};

/** Look up tutorial copy by id (the FeatureId, also the seenTutorials key). */
export function getTutorial(id: string): TutorialContent | undefined {
  return TUTORIALS[id as FeatureId];
}
