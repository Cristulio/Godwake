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
      "Every soul that descends earns Renown — a weight the wheel cannot strip away. The druids who tend the roots beyond the hub will trade it for something rarer than steel: permanence. More blood in the body, a sharper hand, tricks the dark does not know to take from you.",
      "Spend it. A soul that spends its Renown between lives descends the next time a little harder to kill than the last.",
    ],
    key: "Renown is yours after death — spend it at the Grove for upgrades that never reset.",
  },
  "affixes-rare": {
    title: "Rare Finds",
    body: [
      "The deep dark gives up stranger things now. A Rare piece of gear — blue-edged, humming with old intent — carries two magical affixes where common iron carries one.",
      "These are not raw numbers. They are behaviours: a blade that drinks blood on every hit, a cuirass that shrugs the killing blow once, a ring that makes every crit a little more final. The affix is the point.",
    ],
    key: "Rare gear carries two affixes — the effects are what matters, not the metal.",
  },
  "elite-nodes": {
    title: "Elite Terrors",
    body: [
      "Something marked walks the route ahead — an Elite: a creature set apart from its kin by cruelty, power, or sheer refusal to die. It will be on the map. You choose whether to cross its path.",
      "The toll is heavier than a common fight. The prize is too: richer gold, finer spoils, and the only way a Legendary relic falls into living hands.",
    ],
    key: "Elite encounters are the hardest fights on the map — and the only source of Legendary drops.",
  },
  "boss-intel": {
    title: "A Study in Dread",
    body: [
      "Before you press the final seal of a chapter, gold can now buy something more useful than another sword: knowledge. Spend it to study the thing waiting beyond the door — its habits, its hungers, the opener it always throws.",
      "The cost climbs with the darkness. Weigh the coin carefully. But a soul that knows what it is walking into dies less often.",
    ],
    key: "Spend gold before a boss fight to learn its patterns and enter with an edge.",
  },
  legendaries: {
    title: "Legendary Relics",
    body: [
      "A relic has surfaced — something older and stranger than anything the dark usually gives up. Unlike the gear you carry into a run, relics belong to the soul itself. They endure every death, every wipe, every new descent. Equip them at the hub between delves.",
      "They lend no armor and swing no blade. What they do is reshape how the soul moves through a fight. Some answer only to a particular kind of soul — the wrong hands hold them cold.",
    ],
    key: "Relics are account-level and persist through every death — equip them at the hub.",
  },
  "affixes-epic": {
    title: "Epic Finds",
    body: [
      "The deep dark is yielding its better secrets. An Epic piece — purple-marked, restless with layered enchantment — carries three or four affixes where a Rare piece carries two.",
      "The danger of so many effects on one item is in missing how they speak to each other. Find the piece whose affixes all pull in the same direction as your soul, and a single drop can define a whole descent.",
    ],
    key: "Epic gear carries three or four affixes — hunt for pieces whose effects reinforce each other.",
  },
  "class-roster": {
    title: "A New Soul",
    body: [
      "Another body waits at the hub. You may step into it between descents — a different soul, a different way of moving through the dark. The Renown you have earned carries with you; it belongs to the account, not the skin.",
      "But the Grove remembers which soul did the work. Upgrades spent on one body do nothing for another. Choose the soul you mean to push and spend accordingly.",
    ],
    key: "Renown carries across all souls; Grove upgrades are tracked per class — spend wisely.",
  },
  sets: {
    title: "Relic Sets",
    body: [
      "Some relics were not made alone. Equip two or more pieces of the same set and the stones wake to each other — bonus effects that none of them carries on its own begin to stir.",
      "Partial sets already count. Each additional matching piece you wear deepens what the set does. Building toward one is a commitment worth making across runs.",
    ],
    key: "Equip matching set relics together for compounding bonuses beyond each piece alone.",
  },
  "grove-deep": {
    title: "The Grove’s Hidden Roots",
    body: [
      "The druids have opened a lower chamber — tiers of the Grove that were locked to untested souls. The power here is of a different order: mastery-shaped, hard-won, the kind that lets a veteran push past the walls that stop a fresh soul cold.",
      "It was always there. The Grove merely waits to see who earns the right to ask for it.",
    ],
    key: "Deeper Grove tiers are now open — stronger upgrades earned by souls who have proven themselves.",
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
