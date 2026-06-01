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
      "Every descent scores a mark on the soul — Renown, the one thing the wheel cannot burn away when it hauls you back to be born again. Past the hub, on older ground, the druids keep a grove that will trade it for something rarer than steel: permanence.",
      "More blood to spill before you fall, a truer arm, tricks the dark does not know how to take from you. Hoarded, Renown only sits there. Spent, it makes every life after this one harder to put down.",
    ],
    key: "Renown outlives death — trade it at the Grove for gains to body, blade, and art that never reset.",
  },
  "affixes-rare": {
    title: "Rare Spoils",
    body: [
      "The deep dark has started parting with better things. A Rare find — its edge lit cold and blue — wakes with two enchantments worked into it, where common iron carries only one.",
      "And these are not tallies of plus-this and plus-that. They are deeds the metal performs: a blade that opens a wound which will not close, mail that turns the one blow meant to end you, a band that makes each killing strike crueler still. Read what a piece does, not what it weighs.",
    ],
    key: "Rare gear wakes with two affixes — and an affix is a deed the gear performs, not a number it adds.",
  },
  "elite-nodes": {
    title: "The Marked",
    body: [
      "Some things in the dark stand apart from their kin — larger, older, wrong in ways that make the rest give them room. The route ahead will show you where such a one waits. Whether you walk its way is yours to choose.",
      "It costs more than a common kill: more blood, more cunning, more luck held. It pays more in turn — heavier gold, finer spoils, and the only door through which a Legendary relic ever falls into a living hand.",
    ],
    key: "Elites are the route's hardest fights — and the only kills that ever yield a Legendary relic.",
  },
  "boss-intel": {
    title: "A Study in Dread",
    body: [
      "At the last seal of a chapter, gold buys something keener than another blade — it buys foreknowledge. Lay the coin down and you may study the thing coiled behind that door before you face it: how it opens, what it hungers for, the trick it saves for the moment you believe you've won.",
      "The deeper the chapter, the steeper the asking price. Weigh it against the iron that coin would buy instead. But a soul that walks in already knowing the shape of the horror walks back out far more often.",
    ],
    key: "Pay gold at the chapter's seal to study its warden — learn its patterns before the door opens.",
  },
  legendaries: {
    title: "Legendary Relics",
    body: [
      "A relic has surfaced from somewhere far beneath the reach of common plunder — older than the chapters, stranger than anything the dark gives up willingly. Where the gear you carry rots away with each fallen body, a relic binds to the soul beneath it. It endures every death, every emptied run, every new skin you wear. Set it at the hub before you descend.",
      "It hangs no armor on you and puts no edge in your hand. What it does is bend the way a soul fights — quietly, and whole. Some relics answer to one kind of soul alone; in the wrong hands they stay dead stone.",
    ],
    key: "Relics bind to the soul, not the body — they outlast every death and are set at the hub.",
  },
  "affixes-epic": {
    title: "Epic Spoils",
    body: [
      "The dark is giving up its deeper secrets now. An Epic find — marked in restless purple, layered with enchantment that will not lie still — carries three, sometimes four deeds where a Rare carries two.",
      "With that many effects crowded onto a single piece, the waste lies in failing to see how they answer one another. Find the one whose every deed pulls the way your soul already fights, and a lone drop can carry an entire descent.",
    ],
    key: "Epic gear carries three or four affixes — seek the piece whose deeds answer one another and your soul.",
  },
  "class-roster": {
    title: "A New Soul",
    body: [
      "Another body waits unworn at the hub, and the wheel will let you step into it before the next descent — a wholly different soul, a different way of cutting through the dark. The Renown you have gathered comes with you whichever skin you choose; it answers to the account, not the flesh.",
      "But the Grove keeps its ledgers by soul. What you bought for one body buys nothing for another — its blood, its art, its tricks all stay behind with it. Pick the soul you mean to carry deep, and pour your Renown into that one.",
    ],
    key: "Renown follows you across every soul; Grove gains are kept per soul — commit your spending to one.",
  },
  sets: {
    title: "Relic Sets",
    body: [
      "Not every relic was forged alone. Some were made in company, and when two or more of a kindred set rest on the same soul, the stones begin to answer one another — powers stir that no single piece holds by itself.",
      "You need not gather the whole set for it to wake; a partial binding already counts, and each matching piece you add presses the bond deeper. A set is a thing worth building toward across many runs.",
    ],
    key: "Wear two or more relics of one set and they wake shared powers — partial sets already count.",
  },
  "grove-deep": {
    title: "Deeper Roots",
    body: [
      "The druids have unsealed a chamber that stays shut to untried souls — tiers of the Grove that root far below the ones you know. The power waiting there is of another order entirely: mastery-shaped, dearly bought, the kind that carries a veteran past the walls that stop a green soul cold.",
      "It lay beneath your feet the whole time. The Grove simply opens its lower roots only to a soul that has shown it can use them.",
    ],
    key: "Deeper Grove tiers have opened — costlier, stronger gains for a soul that has proven itself.",
  },
};

/**
 * Per-class "a new soul has surfaced" reveals, fired when a class crosses its
 * chapter unlock (engine/progression CLASS_UNLOCK_CHAPTER). Keyed by ClassId,
 * which doubles as the seenTutorials key. In-world flavor + the soul's hallmark.
 * Every roster soul gets one (the card is suppressed for the body already worn);
 * cleric isn't playable yet, so it has none.
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
  wizard: {
    title: 'A Soul of the Art',
    body: [
      'A frailer soul has risen to the wheel — thin-skinned, soft-boned, a single bad step from the dark. Worn too early it breaks; worn by a walker who has banked the keepers’ gifts, it bends whole fights with a word.',
      'It carries no real steel. What it carries is fire, and force, and the patience to spend them well.',
    ],
    key: 'The Wizard: Fire Bolt and Magic Missile to open, Fireball at L5 — and almost no armor to hide behind.',
  },
  druid: {
    title: 'A Soul of the Old Faith',
    body: [
      'A soul older than the new gods’ war has surfaced — one that kept the groves while the rest knelt to thrones. Thin-skinned in its own shape, a single bad step from the dark, like the Art-souls before it.',
      'But it does not always keep its own shape. When the spells run dry it sheds the body and wears the beast, and the beast does not bleed so easily.',
    ],
    key: 'The Druid: Produce Flame and the storm to open, Wild Shape into a beast’s vitality and claws when the fight closes in.',
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
