import type { FeatureId } from '../engine/progression/unlocks';
import type { ClassId } from '../schemas/ids';

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
    title: "The Druid Grove",
    body: [
      "Gold rots in the dirt and steel stays with the corpse, but Renown clings to the soul — the one thing the wheel cannot pry loose when it turns you under and sends you down again. Carry enough of it home and the druids who keep the Grove will take it in trade.",
      "What they give does not wash off at the next death: thicker blood, a surer arm, tricks the dark has no answer for. Hoarded Renown is wasted Renown. The wheel respects only a soul that spends.",
    ],
    key: "Renown outlasts death — spend it at the Grove for upgrades no death can undo.",
  },
  "affixes-rare": {
    title: "Blued Steel",
    body: [
      "The dark has begun parting with better spoils. A Rare find — its edge gone cold and blue, its weight wrong in the hand — carries two enchantments where plain iron carries none.",
      "Read them, for they are not merely larger numbers. One blade drinks the wound it opens; one ring turns a glancing blow into a killing one; one plate shrugs off the strike that should have ended you. The enchantment is the prize, not the colour.",
    ],
    key: "Rare (blue) gear bears two enchantments — what they DO matters more than the numbers.",
  },
  "elite-nodes": {
    title: "The Marked Ones",
    body: [
      "Some things in the deep are set apart from the rabble around them — larger, crueller, slower to die. The road shows you where one waits before you ever reach it, and whether you walk into its teeth is yours to decide.",
      "It will cost you more blood than a common fight. It pays more, too: heavier gold, finer spoils, and the only chance the dark will lay a Legendary relic in a living hand.",
    ],
    key: "Elites are the map's hardest fights — richer rewards, and the only source of Legendary drops.",
  },
  "boss-intel": {
    title: "A Study in Dread",
    body: [
      "A keeper waits behind a chapter's last seal, and for once you may learn it before you bleed for the lesson. Lay down gold and what is known of the thing becomes yours — how it opens, what it hungers for, where it is slow.",
      "Knowing costs coin you might rather spend on steel, and the deeper the keeper waits, the dearer the telling. But a soul that walks in blind seldom walks back out.",
    ],
    key: "Pay gold to study a chapter's boss before the fight, and learn how it kills.",
  },
  legendaries: {
    title: "Legendary Relics",
    body: [
      "A relic has come up out of the deep — older and stranger than anything else you carry. The gear in your pack belongs to the run and burns away with it; a relic belongs to the soul. It rides through every death and every fresh descent, and you fit it at the hub before you go down.",
      "It hangs no armour on you and puts no blade in your hand. What it changes is how the soul itself fights. Some answer to only one kind of soul, and lie cold and dead in the wrong grip.",
    ],
    key: "Relics belong to the soul, not the run — they survive every death, and are bound at the hub.",
  },
  "affixes-epic": {
    title: "Purpled Steel",
    body: [
      "Now the deep gives up its real secrets. An Epic find — marked in purple, all but shaking with the power crowded into it — bears three or four enchantments where a Rare bore two.",
      "With so many effects on one thing, the danger is failing to see how they answer each other. Find the piece whose enchantments all pull the way your soul already leans, and a single find can carry a whole descent.",
    ],
    key: "Epic (purple) gear bears three or four enchantments — chase the ones that compound.",
  },
  "class-roster": {
    title: "A New Soul",
    body: [
      "More than one body waits at the hub now. Between descents you may set down the soul you wore and take up another — a wholly different way of meeting the dark. The Renown you have bled for follows you across; it answers to you, not to any one skin.",
      "But the Grove keeps its ledgers by soul. What you bought for one body buys nothing for the next. Pick the soul you mean to carry deep, and pour your Renown into that one.",
    ],
    key: "Swap to another soul at the hub between descents — Renown carries, but Grove upgrades are per-soul.",
  },
  sets: {
    title: "Kindred Relics",
    body: [
      "Some relics were forged as kin, and they remember it. Wear two or more from the same set and the stones begin to answer one another — powers stir that none of them holds alone.",
      "You need not gather the whole set first; a partial bond already counts, and each kindred piece you add deepens it. A set worth chasing is worth chasing across many runs.",
    ],
    key: "Equip two or more relics of one set for shared powers — partial sets already count.",
  },
  "grove-deep": {
    title: "The Grove's Hidden Roots",
    body: [
      "The druids have unbarred a chamber that was shut to you before — older tiers of the Grove, kept back from souls that had not yet proven their depth. The power there is of another grade: heavier, dearer, the kind that lets a seasoned soul push through walls a fresh one only breaks against.",
      "It was always down there. The Grove was only waiting to see which souls earned the right to ask.",
    ],
    key: "Deeper Grove tiers open to a proven soul — stronger upgrades, earned by reaching new depths.",
  },
};

/**
 * Per-class "a new soul has surfaced" reveals, fired when a class crosses its
 * chapter unlock (engine/progression CLASS_UNLOCK_CHAPTER). Keyed by ClassId,
 * which doubles as the seenTutorials key. In-world flavor + the soul's hallmark.
 * Wizard is the starting soul and cleric isn't playable yet — neither gets one.
 */
export const CLASS_TUTORIALS: Partial<Record<ClassId, TutorialContent>> = {
  fighter: {
    title: 'A Soul of Sword and Shield',
    body: [
      'Another body has surfaced from the wheel. A soldier’s soul — scarred, steady, hard to put down. It will answer at the hub when you next change skins.',
      'No spells, no tricks. Just steel that does not tire and a will that refuses the killing blow.',
    ],
    key: 'The Fighter: Second Wind to heal, Action Surge for a second strike, crits on 19–20.',
  },
  barbarian: {
    title: 'A Soul That Will Not Fall',
    body: [
      'Something older and angrier has clawed its way up. It feels no fear and little pain — it simply keeps swinging until one of you is gone.',
      'It wears no armor and needs none. The rage is the armor.',
    ],
    key: 'The Barbarian: Rage halves the harm done to you, Reckless Attack trades safety for blood.',
  },
  ranger: {
    title: 'A Soul That Hunts',
    body: [
      'A quiet soul has stepped to the wheel’s edge — patient, far-eyed, deadliest before the enemy ever closes the distance.',
      'It marks its quarry and does not miss twice.',
    ],
    key: "The Ranger: Hunter's Mark stacks bonus damage on a target, Archery sharpens every shot.",
  },
  rogue: {
    title: 'A Soul in the Dark',
    body: [
      'The last of the sealed souls has slipped free — a knife-hand that prefers the wound nobody saw coming. The hardest body to wear, and the cruelest in the right hands.',
      'Strike from the shadow and one cut does the work of three.',
    ],
    key: 'The Rogue: Sneak Attack rewards the unseen strike, Cunning Action keeps you slippery.',
  },
};

/**
 * Look up reveal copy by id — a FeatureId card (feature ladder) or a ClassId card
 * (soul unlock). Both share the seenTutorials key namespace; they never collide.
 */
export function getTutorial(id: string): TutorialContent | undefined {
  return TUTORIALS[id as FeatureId] ?? CLASS_TUTORIALS[id as ClassId];
}
