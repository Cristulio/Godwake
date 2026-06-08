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
  /**
   * The thing unlocked, named plainly and prominently — the big in-world banner
   * at the top of the card so WHAT opened is never buried in flavor. For souls
   * this is the class ("The Rogue"); for features the system ("Legendary
   * Relics"). Kept short — it is rendered large.
   */
  unlocked: string;
  /** The card's flavor title — an evocative phrase under the headline. */
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
    unlocked: "The Druid Grove",
    title: "Permanence, Bought in Blood",
    body: [
      "Every descent scores a mark on the soul — Renown, the one thing the wheel cannot burn away when it hauls you back to be born again. Past the hub, on older ground, the druids keep a grove that will trade it for something rarer than steel: permanence.",
      "More blood to spill before you fall, a truer arm, tricks the dark does not know how to take from you. Hoarded, Renown only sits there. Spent, it makes every life after this one harder to put down.",
    ],
    key: "Renown outlives death — trade it at the Grove for gains to body, blade, and art that never reset.",
  },
  "elite-nodes": {
    unlocked: "Elite Foes",
    title: "The Marked",
    body: [
      "Some things in the dark stand apart from their kin — larger, older, wrong in ways that make the rest give them room. The route ahead will show you where such a one waits. Whether you walk its way is yours to choose.",
      "It costs more than a common kill: more blood, more cunning, more luck held. It pays more in turn — heavier gold, finer spoils, and the only door through which a Legendary relic ever falls into a living hand.",
    ],
    key: "Elites are the route's hardest fights — and the only kills that ever yield a Legendary relic.",
  },
  "boss-intel": {
    unlocked: "Warden Study",
    title: "A Study in Dread",
    body: [
      "At the last seal of a chapter, gold buys something keener than another blade — it buys foreknowledge. Lay the coin down and you may study the thing coiled behind that door before you face it: how it opens, what it hungers for, the trick it saves for the moment you believe you've won.",
      "The deeper the chapter, the steeper the asking price. Weigh it against the iron that coin would buy instead. But a soul that walks in already knowing the shape of the horror walks back out far more often.",
    ],
    key: "Pay gold at the chapter's seal to study its warden — learn its patterns before the door opens.",
  },
  legendaries: {
    unlocked: "Legendary Relics",
    title: "Bound to the Soul",
    body: [
      "A relic has surfaced from somewhere far beneath the reach of common plunder — older than the chapters, stranger than anything the dark gives up willingly. Where the gear you carry rots away with each fallen body, a relic binds to the soul beneath it. It endures every death, every emptied run, every new skin you wear. Set it at the hub before you descend.",
      "It hangs no armor on you and puts no edge in your hand. What it does is bend the way a soul fights — quietly, and whole. Some relics answer to one kind of soul alone; in the wrong hands they stay dead stone.",
    ],
    key: "Relics bind to the soul, not the body — they outlast every death and are set at the hub.",
  },
  sets: {
    unlocked: "Set Gear",
    title: "Forged in Company",
    body: [
      "Gear has surfaced that does not rot away with the body that wore it. A set piece — blade, armor, or trinket — binds to the soul and outlasts every death; set it into your gear at the hub and it descends with you, life after life, stronger than any plunder the dark gives up by chance.",
      "And these were not forged alone. Wear two or more pieces of one kindred set and they answer one another — powers stir that no single piece holds. You need not gather the whole set; a partial binding already counts, and each matching piece presses the bond deeper. A set is worth building toward across many runs.",
    ],
    key: "Set pieces bind to the soul and equip into your gear slots — wear two of a set to wake shared powers.",
  },
  "grove-deep": {
    unlocked: "Deeper Grove Tiers",
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
 * RENOWN-SPENT bar at the Grove (engine/progression classUnlockRenown), from the
 * purchase path (gameStore queueClassUnlockReveals). Keyed by ClassId, which
 * doubles as the seenTutorials key. In-world flavor + the soul's hallmark. Every
 * roster soul gets one (the card is suppressed for the body already worn). These
 * per-soul reveals are the ONLY soul-swap onboarding now — there is no separate
 * generic "you can swap souls" explainer. cleric isn't playable yet, so it has none.
 */
export const CLASS_TUTORIALS: Partial<Record<ClassId, TutorialContent>> = {
  fighter: {
    unlocked: 'The Fighter — a new soul',
    title: 'A Soul of Sword and Shield',
    body: [
      'Another body has surfaced from the wheel. A soldier’s soul — scarred, steady, hard to put down. It will answer at the hub when you next change skins.',
      'No spells, no tricks. Just steel that does not tire and a will that refuses the killing blow.',
    ],
    key: 'The Fighter: Second Wind to heal, Action Surge for a second strike, crits on 19–20.',
  },
  barbarian: {
    unlocked: 'The Barbarian — a new soul',
    title: 'A Soul That Will Not Fall',
    body: [
      'Something older and angrier has clawed its way up. It feels no fear and little pain — it simply keeps swinging until one of you is gone.',
      'It wears no armor and needs none. The rage is the armor.',
    ],
    key: 'The Barbarian: Rage halves the harm done to you, Reckless Attack trades safety for blood.',
  },
  ranger: {
    unlocked: 'The Ranger — a new soul',
    title: 'A Soul That Hunts',
    body: [
      'A quiet soul has stepped to the wheel’s edge — patient, far-eyed, deadliest before the enemy ever closes the distance.',
      'It marks its quarry and does not miss twice.',
    ],
    key: "The Ranger: Hunter's Mark stacks bonus damage on a target, Archery sharpens every shot.",
  },
  wizard: {
    unlocked: 'The Wizard — a new soul',
    title: 'A Soul of the Art',
    body: [
      'A frailer soul has risen to the wheel — thin-skinned, soft-boned, a single bad step from the dark. Worn too early it breaks; worn by a walker who has banked the keepers’ gifts, it bends whole fights with a word.',
      'It carries no real steel. What it carries is fire, and force, and the patience to spend them well.',
    ],
    key: 'The Wizard: Fire Bolt and Magic Missile to open, Fireball at L5 — and almost no armor to hide behind.',
  },
  druid: {
    unlocked: 'The Druid — a new soul',
    title: 'A Soul of the Old Faith',
    body: [
      'A soul older than the new gods’ war has surfaced — one that kept the groves while the rest knelt to thrones. Thin-skinned in its own shape, a single bad step from the dark, like the Art-souls before it.',
      'But it does not always keep its own shape. When the spells run dry it sheds the body and wears the beast, and the beast does not bleed so easily.',
    ],
    key: 'The Druid: Produce Flame and the storm to open, Wild Shape into a beast’s vitality and claws when the fight closes in.',
  },
  monk: {
    unlocked: 'The Monk — a new soul',
    title: 'A Soul of the Empty Hand',
    body: [
      'A soul honed on a long discipline has stepped to the wheel — swift, certain, carrying no blade because it learned long ago it is the blade. Thin-skinned for all that: it lives or dies on the read, not the guard.',
      'It pours its inner force into a storm of fists, faster than a foe can answer — and the right blow drops a thing where it stands.',
    ],
    key: 'The Monk: Martial Arts strikes ride your fists, Flurry of Blows spends Ki for extra strikes, Stunning Strike steals a foe’s turn.',
  },
  rogue: {
    unlocked: 'The Rogue — a new soul',
    title: 'A Soul in the Dark',
    body: [
      'The last of the sealed souls has slipped free — a knife-hand that prefers the wound nobody saw coming. The hardest body to wear, and the cruelest in the right hands.',
      'Strike from the shadow and one cut does the work of three.',
    ],
    key: 'The Rogue: Sneak Attack rewards the unseen strike, Cunning Action keeps you slippery.',
  },
};

/**
 * The seenTutorials key for the first-gear reveal — fired once, the first time
 * any weapon/armour/accessory enters the pack (a road drop or a shop buy), to
 * point a green soul at the Pack where gear is read and worn. Not on the feature
 * ladder (no FeatureId), so it lives in its own keyspace alongside the others.
 */
export const FIRST_GEAR_TUTORIAL_ID = 'first-gear';

/**
 * The seenTutorials key for the first-combat coach — the spotlight/coachmark
 * onboarding shown ONCE, on a brand-new soul's very first combat (see
 * CombatCoach). Shares the seenTutorials keyspace so a single markTutorialSeen
 * call makes it never repeat (across reincarnations and class swaps). It drives
 * an in-combat overlay, not a queued reveal card, so it has no TutorialContent
 * entry — the id is only ever used as the seen-once gate.
 */
export const COMBAT_INTRO_TUTORIAL_ID = 'combat-intro';

/**
 * The seenTutorials key for the first-elite coach — the spotlight/coachmark shown
 * ONCE, the first time a brand-new soul has a SELECTABLE elite node on the route
 * map (see EliteCoach). Like the combat coach it drives an overlay rather than a
 * queued reveal card, so it has no TutorialContent entry — the id is only ever
 * the seen-once gate, written the moment the coach activates so it is strictly
 * one-time and never reappears on a later map. Distinct from the 'elite-nodes'
 * ladder card (the now-sentinel feature unlock): this is the in-map onboarding.
 */
export const ELITE_INTRO_TUTORIAL_ID = 'elite-intro';

/**
 * One-off reveals not tied to the feature ladder or a soul unlock, keyed by a
 * bare seenTutorials id. Shares the same queue + seen-once machinery as the
 * ladder cards; resolved by getTutorial after the typed registries.
 */
export const STANDALONE_TUTORIALS: Record<string, TutorialContent> = {
  [FIRST_GEAR_TUTORIAL_ID]: {
    unlocked: 'Spoils of the Dark',
    title: 'A Find Worth Carrying',
    body: [
      'The dark has parted with something you can use — a piece of war-gear, claimed and stowed. It has not vanished; it has gone into the Pack, where everything you scavenge is kept until you decide its worth.',
      'Open the Pack and the find waits there to be read and worn. A blade does nothing slung over your shoulder; gear earns its keep only once it is on your body. Weigh each piece against what you already carry, then equip what serves the descent.',
    ],
    key: 'Found gear goes to the Pack — open it to read each piece and equip what you mean to use.',
  },
};

/**
 * Look up reveal copy by id — a FeatureId card (feature ladder), a ClassId card
 * (soul unlock), or a standalone one-off. All share the seenTutorials key
 * namespace; they never collide.
 */
export function getTutorial(id: string): TutorialContent | undefined {
  return (
    TUTORIALS[id as FeatureId] ??
    CLASS_TUTORIALS[id as ClassId] ??
    STANDALONE_TUTORIALS[id]
  );
}
