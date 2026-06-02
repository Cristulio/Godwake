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
  /**
   * Fraction of the hero's max HP the curse bites on the OPENING turn. Resolved
   * to an absolute chip in createCombat (proportional to the build, never HP-
   * agnostic) that then decays to nothing over {@link CURSED_GROUND_DECAY_TURNS}
   * turns — see that constant for why the drain is front-loaded and bounded
   * rather than a per-turn grind that compounds with fight length.
   */
  cursedGroundChipPct?: number;
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
 * The starter set. Magnitudes sit in the "noticeable but fair, endgame-only"
 * band (sim-tuned): a front-loaded curse bite that opens at 10% of max HP and
 * decays to nothing over the first few turns, a first-strike disadvantage
 * paired with a slight +1 enemy-damage edge in the dark, +2 enemy damage on top
 * of ascension's own bonus, blessings switched off, or the enemy moving first.
 */
export const DUNGEON_TWISTS: DungeonTwist[] = [
  {
    id: 'cursed-ground',
    name: 'Cursed Ground',
    flavorText:
      'The stone here is sown with old hate — it drinks deep of whoever first sets foot on it, then loses its thirst.',
    telegraph: 'The ground bleeds those who stand on it.',
    effect: { cursedGroundChipPct: 0.1 },
  },
  {
    id: 'gloom',
    name: 'Gloom',
    flavorText:
      'A thick dark hangs in this room that the eye never quite adjusts to. The first blow goes wide, and the ones you never see cut deeper.',
    telegraph: 'A blinding dark swallows the first blow.',
    effect: { firstAttackDisadvantage: true, enemyDamageBonus: 1 },
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

/**
 * Cursed Ground spends itself over this many of the hero's turns: the opening
 * chip (see {@link TwistCombatEffect.cursedGroundChipPct}) steps down by a fixed
 * amount each turn until it reaches zero. This is the whole point of the twist's
 * redesign — the old flat per-turn chip COMPOUNDED with fight length, so tanky/
 * defensive/slow builds and long elite/boss fights bled far more than fast ones
 * and got ground to 1 HP (the lone twist that dropped the win rate, four sim
 * passes running). Front-loading and bounding the total (opening + decay sums to
 * roughly a quarter of max HP, all in the first few rounds) keeps it the highest-
 * tension twist — a race to stabilize off the cursed stone — without taxing the
 * fights that simply run long.
 */
export const CURSED_GROUND_DECAY_TURNS = 4;

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
