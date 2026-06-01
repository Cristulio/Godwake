/**
 * Dungeon twists — per-room combat modifiers that ride only at high ascension
 * (gated by {@link ascensionDungeonTwists}, true at Ascension >= 4). A twisted
 * room is telegraphed BEFORE the fight (the route-map node preview and the
 * combat room header) and never lies: the omen the player reads on the door is
 * exactly the effect that lands in the fight.
 *
 * Data-driven on purpose: a twist is a small effect descriptor the combat
 * engine reads at fight start (createCombat) and at the start of each player
 * turn (endTurn) — extend the list, don't scatter conditionals. The whole set
 * is bounded (five starter twists) so the surface stays small and shippable.
 */

export type TwistId =
  | 'cursed-ground'
  | 'gloom'
  | 'bloodscent'
  | 'sealed-wards'
  | 'quickening';

/**
 * The mechanical knobs a twist can pull, all resolved by the combat engine.
 * Every field is neutral when absent, so an empty object is "no twist".
 */
export interface TwistCombatEffect {
  /** Flat damage the hero takes at the start of each of their turns this fight. */
  cursedGroundChip?: number;
  /** The hero's first attack of the fight is rolled at disadvantage. */
  firstAttackDisadvantage?: boolean;
  /** Flat damage added to every enemy attack that lands (stacks with ascension). */
  enemyDamageBonus?: number;
  /** Blessing modifiers are inert in this room — none of their combat effects apply. */
  suppressBlessings?: boolean;
  /** Enemies win initiative: they take the first turn instead of the hero. */
  enemiesActFirst?: boolean;
}

export interface DungeonTwist {
  id: TwistId;
  /** Short in-world name shown on the telegraph chip. */
  name: string;
  /** One-line in-world omen surfaced on the door preview / combat header. */
  flavorText: string;
  /** Very short tag for the map node + combat log opener. */
  telegraph: string;
  effect: TwistCombatEffect;
}

/**
 * The starter set. First-pass magnitudes sit in the "noticeable but fair,
 * endgame-only" band (sim-checkable later): a 4-HP chip per turn, a single
 * first-strike disadvantage, +2 enemy damage on top of ascension's own bonus,
 * blessings switched off, or the enemy moving first.
 */
export const DUNGEON_TWISTS: DungeonTwist[] = [
  {
    id: 'cursed-ground',
    name: 'Cursed Ground',
    flavorText:
      'The stone here is sown with old hate — it drinks a little of whoever stands on it.',
    telegraph: 'The ground bleeds those who stand on it.',
    effect: { cursedGroundChip: 4 },
  },
  {
    id: 'gloom',
    name: 'Gloom',
    flavorText:
      'A thick dark hangs in this room that the eye never quite adjusts to. The first blow goes wide.',
    telegraph: 'A blinding dark swallows the first blow.',
    effect: { firstAttackDisadvantage: true },
  },
  {
    id: 'bloodscent',
    name: 'Bloodscent',
    flavorText:
      'Something in the air has the things here worked into a frenzy. They strike to kill.',
    telegraph: 'The dwellers here are whipped to a killing frenzy.',
    effect: { enemyDamageBonus: 2 },
  },
  {
    id: 'sealed-wards',
    name: 'Sealed Wards',
    flavorText:
      'Old wards seal this chamber against the divine. No god can reach you while you stand in it.',
    telegraph: 'No blessing reaches you within these wards.',
    effect: { suppressBlessings: true },
  },
  {
    id: 'quickening',
    name: 'Quickening',
    flavorText:
      'Time runs crooked here. The dwellers move first, and faster than they have any right to.',
    telegraph: 'The dwellers here move first.',
    effect: { enemiesActFirst: true },
  },
];

const TWIST_BY_ID: Record<string, DungeonTwist> = Object.fromEntries(
  DUNGEON_TWISTS.map((t) => [t.id, t]),
);

/** Resolve a twist by id, or undefined for an unknown/absent id. */
export function getTwist(id: string | undefined): DungeonTwist | undefined {
  return id ? TWIST_BY_ID[id] : undefined;
}

/** The combat-effect knobs for a twist id; an empty (all-neutral) object when none. */
export function twistCombatEffect(id: string | undefined): TwistCombatEffect {
  return getTwist(id)?.effect ?? {};
}

/**
 * Fraction of eligible combat rooms that carry a twist when twists are live.
 * Sparse on purpose — a chapter should hold a few twisted fights, not turn
 * every room into a hazard.
 */
export const TWIST_ROOM_FRACTION = 0.3;

/**
 * Roll a twist for one eligible combat room off the seeded delve RNG. Returns
 * the twist id, or undefined when the room rolls clean. Caller gates on
 * {@link ascensionDungeonTwists} — below Ascension 4 this is never called.
 */
export function rollRoomTwist(rng: { next(): number }): TwistId | undefined {
  if (rng.next() >= TWIST_ROOM_FRACTION) return undefined;
  return DUNGEON_TWISTS[Math.floor(rng.next() * DUNGEON_TWISTS.length)].id;
}
