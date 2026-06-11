import type { Character } from '../../types/character';
import type { ClassId } from '../../schemas/ids';
import { ascensionUpgradeCostMult } from '../../engine/delve/ascension';
import { t } from '../../i18n';

/**
 * Localized effect text for an upgrade rank. The numbers are computed by each
 * upgrade's `effectAtRank` (the single source of truth for the maths) and handed
 * to the `upgrades.<id>.effect` template, which carries the English source and
 * the Spanish overlay (with `{ one, other }` plural forms where a count appears).
 * Pass `count` for the countable-noun upgrades so the right plural form is picked.
 */
function fx(id: string, params?: Record<string, string | number>): string {
  return t(`upgrades.${id}.effect`, params);
}

/**
 * Druid Grove upgrades. The Wellspring of Mielikki blesses the soul, not the
 * flesh — purchases persist across reincarnations.
 *
 * Each upgrade is ranked. Buying rank N at cost `costForRank(N)` unlocks rank
 * N+1. Effects compound. Two kinds:
 *  - `permanent` upgrades: applied once at purchase time via
 *    `applyPermanentUpgrade` — the new rank's effect is the DELTA from the
 *    previous rank, baked into character stats and surviving reincarnation.
 *  - `delveStart` upgrades: applied at the top of every delve via
 *    `applyDelveStartUpgrades` — the apply function takes the current rank
 *    and seeds the character's per-delve fields.
 *
 * Nodes are grouped two ways for the Grove UI:
 *  - `category` buckets the SHARED (class-agnostic) nodes into the functional
 *    tabs every soul sees: survival / offense / economy / fortune / soul.
 *  - `classId`, when set, moves the node into that class's own tab instead — a
 *    player only ever sees their active class's tab plus the shared ones.
 */
export type UpgradeKind = 'delveStart' | 'permanent';
export type UpgradeCategory = 'survival' | 'offense' | 'economy' | 'fortune' | 'soul';

export interface Upgrade {
  id: string;
  category: UpgradeCategory;
  /**
   * When set, this is a class-specific node: it lives in that class's Grove tab
   * and is only shown/buyable for that class. Absent = shared (all classes).
   */
  classId?: ClassId;
  name: string;
  flavor: string;
  /** Human-facing description of the effect AT the given rank. rank 0 means "not yet owned". */
  effectAtRank: (rank: number) => string;
  /** Renown cost to BUY rank N (where N = 1..maxRank). cost(1) === base. */
  costForRank: (rank: number) => number;
  maxRank: number;
  /**
   * Apply this upgrade at the given rank to the character. For `permanent`
   * upgrades this is called once at purchase with the new rank; the function
   * applies the DELTA from rank-1 (i.e. only the new rank's effect). For
   * `delveStart` upgrades this is called at delve start with the owned rank;
   * the function applies the FULL effect at that rank.
   */
  apply: (character: Character, rank: number) => Character;
  kind: UpgradeKind;
  /**
   * Progression gate for deeper Grove tiers. Absent = always available.
   * `ascension` is the minimum `metaStore.ascensionUnlocked` required to buy
   * (1 = "clear the chain once"). Until met the Grove shows the upgrade as
   * "clear to unlock" (same category as the existing druidGroveUnlocked gate —
   * a real, reachable upgrade, never a phantom no-op) and purchase is refused.
   */
  unlock?: { ascension: number; label: string };
}

/** Standard cost curve: base * rank^1.3, rounded. cost(1) === base; the exponent keeps the top ranks of multi-rank trees reachable in a normal play schedule. */
export function rankCost(base: number, rank: number): number {
  return Math.round(base * Math.pow(rank, 1.3));
}

type PermanentBonusKey = keyof NonNullable<Character['permanentBonuses']>;

/** Add `delta` to `character.permanentBonuses[key]`, treating undefined as 0. */
function addPermanentBonus(
  c: Character,
  key: PermanentBonusKey,
  delta: number,
): Character {
  const current = c.permanentBonuses?.[key] ?? 0;
  return {
    ...c,
    permanentBonuses: { ...c.permanentBonuses, [key]: current + delta },
  };
}

/** Set an absolute rank value on `permanentBonuses[key]` (for delveStart upgrades). */
function setPermanentBonus(
  c: Character,
  key: PermanentBonusKey,
  value: number,
): Character {
  return {
    ...c,
    permanentBonuses: { ...c.permanentBonuses, [key]: value },
  };
}

const RAW: Upgrade[] = [
  // ─── SURVIVAL (shared) — flesh that endures ──────────────────────────────
  {
    id: 'pilgrims-boots',
    category: 'survival',
    name: "Pilgrim's Boots",
    flavor:
      'The druids gift the wakened soul a pair of hide-leather boots before the road. The first mile teaches the back. The hundredth thickens it.',
    effectAtRank: (r) => fx('pilgrims-boots', { n: r * 2 }),
    costForRank: () => 25,
    maxRank: 1,
    apply: (c) => addPermanentBonus(c, 'hp', 2),
    kind: 'permanent',
  },
  {
    id: 'iron-will',
    category: 'survival',
    name: 'Iron Will',
    flavor:
      'The Wellspring pulls deeper this time. You wake with breath you did not have before. Whatever the master takes, the soul keeps a little more.',
    effectAtRank: () => fx('iron-will'),
    costForRank: () => 60,
    maxRank: 1,
    apply: (c) => addPermanentBonus(c, 'hp', 5),
    kind: 'permanent',
  },
  {
    id: 'mantle-of-the-wakened',
    category: 'survival',
    name: 'Mantle of the Wakened',
    flavor:
      'The Wellspring keeps something back — a fistful of the old life sewn into the seam of the new. The flesh remembers wounds it has not taken yet.',
    effectAtRank: (r) => fx('mantle-of-the-wakened', { n: r * 5 }),
    costForRank: (r) => rankCost(80, r),
    maxRank: 5,
    apply: (c) => addPermanentBonus(c, 'hp', 5),
    kind: 'permanent',
  },
  {
    id: 'hardier-soul',
    category: 'survival',
    name: 'Hardier Soul',
    flavor:
      "Atlas's mark pressed beneath the heart. When the body breaks, the soul remembers it can still stand once more.",
    effectAtRank: (r) => fx('hardier-soul', { count: r, n: r }),
    costForRank: (r) => rankCost(80, r),
    maxRank: 3,
    apply: (c, rank) => ({
      ...c,
      delveStabiliseBonus: rank,
    }),
    kind: 'delveStart',
  },
  {
    id: 'cloak-of-the-grove',
    category: 'survival',
    name: 'Cloak of the Grove',
    flavor:
      "Spider-silk shot through with fern fronds and the cinder of last winter's fire. It moves when no wind touches it.",
    effectAtRank: (r) => fx('cloak-of-the-grove', { n: r }),
    costForRank: (r) => rankCost(150, r),
    maxRank: 3,
    apply: (c) => addPermanentBonus(c, 'ac', 1),
    kind: 'permanent',
  },
  {
    // Deeper Grove tier — sealed until the soul has walked the whole chain and
    // returned. Raises the HP ceiling past what the base trees reach.
    id: 'wellspring-depths',
    category: 'survival',
    name: "Wellspring's Depth",
    flavor:
      "The pool only shows its floor to a soul that has walked the whole road and come back. What it gives now, it could not give before.",
    effectAtRank: (r) => fx('wellspring-depths', { n: r * 10 }),
    costForRank: (r) => rankCost(200, r),
    maxRank: 3,
    apply: (c) => addPermanentBonus(c, 'hp', 10),
    kind: 'permanent',
    unlock: { ascension: 1, label: 'Clear the chain to unlock.' },
  },

  // ─── OFFENSE (shared) — steel that strikes truer ─────────────────────────
  {
    id: 'first-cut',
    category: 'offense',
    name: 'First Cut',
    flavor:
      'A length of red thread tied to the wrist. The hand it guides moves a half-breath earlier than the others.',
    effectAtRank: (r) => fx('first-cut', { n: r }),
    costForRank: (r) => rankCost(90, r),
    maxRank: 3,
    apply: (c) => ({
      ...c,
      permanentFirstAttackDamage: (c.permanentFirstAttackDamage ?? 0) + 1,
    }),
    kind: 'permanent',
  },
  {
    id: 'bleed-out',
    category: 'offense',
    name: 'Bleed-Out',
    flavor:
      "An owl's feather pressed against your collar by a child who would not speak. Wounded things lean toward you, and you toward them.",
    effectAtRank: (r) => fx('bleed-out', { n: r }),
    costForRank: (r) => rankCost(110, r),
    maxRank: 2,
    apply: (c) => ({
      ...c,
      permanentWoundedTargetDamage: (c.permanentWoundedTargetDamage ?? 0) + 1,
    }),
    kind: 'permanent',
  },
  {
    id: 'fellfast-strike',
    category: 'offense',
    name: 'Fellfast Strike',
    flavor:
      'A hawk-bone splinter set into the pommel. When the strike lands true, the bone hums and the wound runs deeper than steel should reach.',
    effectAtRank: (r) => fx('fellfast-strike', { n: r }),
    costForRank: (r) => rankCost(140, r),
    maxRank: 3,
    apply: (c) => ({
      ...c,
      permanentCritDamageBonus: (c.permanentCritDamageBonus ?? 0) + 1,
    }),
    kind: 'permanent',
  },
  {
    id: 'whetstone-resolve',
    category: 'offense',
    name: 'Whetstone Resolve',
    flavor:
      "A stone the size of your thumb, oily with old grease and older blood. The edge it gives you doesn't dull.",
    effectAtRank: (r) => fx('whetstone-resolve', { n: r }),
    costForRank: (r) => rankCost(150, r),
    maxRank: 4,
    apply: (c) => addPermanentBonus(c, 'damage', 1),
    kind: 'permanent',
  },
  {
    id: 'heirloom-blade',
    category: 'offense',
    name: 'Heirloom Blade',
    flavor:
      'A blade laid on the Wellspring stones the night of your last death. The grip has been worn smooth by another hand.',
    effectAtRank: (r) => fx('heirloom-blade', { n: r }),
    costForRank: (r) => rankCost(180, r),
    maxRank: 4,
    apply: (c) => addPermanentBonus(c, 'attack', 1),
    kind: 'permanent',
  },
  {
    id: 'killers-eye',
    category: 'offense',
    name: "Killer's Eye",
    flavor:
      'A wolf-tooth necklace. The druids will not say which of the Wellspring children lost it. Your eye sharpens before you know why.',
    effectAtRank: (r) => fx('killers-eye', { lo: 20 - r, n: r }),
    costForRank: (r) => rankCost(200, r),
    maxRank: 2,
    apply: (c) => addPermanentBonus(c, 'critRange', 1),
    kind: 'permanent',
  },
  {
    // Deeper Grove tier — sealed until the soul has cleared the chain at
    // Ascension 3. A mixed offensive crown for both martials and casters.
    id: 'crown-of-the-returned',
    category: 'offense',
    name: 'Crown of the Returned',
    flavor:
      'Beaten from the ash of cleared chains. Only a soul the wheel has carried back again and again may wear it without burning.',
    effectAtRank: (r) => fx('crown-of-the-returned', { n: r }),
    costForRank: (r) => rankCost(350, r),
    maxRank: 2,
    apply: (c) => addPermanentBonus(addPermanentBonus(c, 'attack', 1), 'spellAttack', 1),
    kind: 'permanent',
    unlock: { ascension: 3, label: 'Reach Ascension 3 to unlock.' },
  },

  // ─── ECONOMY (shared) — pockets never quite empty ────────────────────────
  {
    id: 'quartermasters-stipend',
    category: 'economy',
    name: "Quartermaster's Stipend",
    flavor:
      'A folded chit, sealed with green wax. The deeper the chapter it is presented at, the more the Grove reimburses — by some accounting only they keep.',
    effectAtRank: (r) => fx('quartermasters-stipend', { n: 10 * r }),
    costForRank: (r) => rankCost(70, r),
    maxRank: 3,
    apply: (c, rank) => ({ ...c, chapterClearGoldBonus: 10 * rank }),
    kind: 'delveStart',
  },
  {
    id: 'shrine-tithe',
    category: 'economy',
    name: 'Shrine Tithe',
    flavor:
      "The Grove circles a tithe back to you at each altar — coin for coin, blood for blood. It is not generosity. It is bookkeeping.",
    effectAtRank: (r) => fx('shrine-tithe', { n: 20 * r }),
    costForRank: (r) => rankCost(80, r),
    maxRank: 2,
    apply: (c, rank) => ({ ...c, shrineTitheGold: 20 * rank }),
    kind: 'delveStart',
  },
  {
    id: 'coin-in-pocket',
    category: 'economy',
    name: 'Coin in the Pocket',
    flavor:
      'The Grove keepers tuck a few coppers into the hem of your coat each time the Wellspring releases you — and slip another purse to the quartermaster against the chapters you clear.',
    effectAtRank: (r) => fx('coin-in-pocket', { n1: r * 25, n2: r * 5 }),
    costForRank: (r) => rankCost(90, r),
    maxRank: 3,
    apply: (c) => {
      const withStart = addPermanentBonus(c, 'startingGold', 25);
      return addPermanentBonus(withStart, 'chapterClearGold', 5);
    },
    kind: 'permanent',
  },
  {
    id: 'mielikki-cache',
    category: 'economy',
    name: "Mielikki's Cache",
    flavor: "A flask stoppered with wax and the Lady's sigil. It tastes of pine sap and summer rain.",
    effectAtRank: (r) => fx('mielikki-cache', { count: r, n: r }),
    costForRank: (r) => rankCost(100, r),
    maxRank: 4,
    apply: (c, rank) => ({
      ...c,
      inventory: [
        ...c.inventory,
        ...Array.from({ length: rank }, () => ({ itemId: 'potion-of-healing' })),
      ],
    }),
    kind: 'delveStart',
  },

  // ─── FORTUNE (shared) — gods and luck lean closer ────────────────────────
  {
    id: 'wider-pantheon',
    category: 'fortune',
    name: 'Wider Pantheon',
    flavor:
      "Mielikki nods at her cousins, and they listen. At each altar, more voices speak — and a wider choice is laid before you.",
    effectAtRank: (r) => fx('wider-pantheon', { n: 3 + r }),
    costForRank: (r) => rankCost(40, r),
    maxRank: 2,
    apply: (c, rank) => ({ ...c, shrineOptionBonus: rank }),
    kind: 'delveStart',
  },
  {
    id: 'pilgrims-step',
    category: 'fortune',
    name: "Pilgrim's Step",
    flavor:
      'You wake from the Wellspring with a god already murmuring at your shoulder. The road begins blessed.',
    effectAtRank: (r) => fx('pilgrims-step', { count: r, n: r }),
    costForRank: (r) => rankCost(60, r),
    maxRank: 2,
    // Pilgrim's Step blessings are rolled in gameStore.startDelve (needs the
    // active roller). The apply function is a no-op marker — the store reads
    // the rank directly.
    apply: (c) => c,
    kind: 'delveStart',
  },
  {
    id: 'tymoras-wager',
    category: 'fortune',
    name: "Tyche's Wager",
    flavor:
      "A copper coin pressed into your palm by a laughing priestess. Heads, you live. Tails, you live again. She never lets you see the result.",
    effectAtRank: (r) => fx('tymoras-wager', { count: r, n: r }),
    costForRank: (r) => rankCost(80, r),
    maxRank: 3,
    apply: (c, rank) => ({
      ...c,
      delveBudgets: {
        ...c.delveBudgets,
        quirkRerollMissesRemaining:
          (c.delveBudgets?.quirkRerollMissesRemaining ?? 0) + rank,
      },
    }),
    kind: 'delveStart',
  },

  // ─── SOUL (shared) — the thread the wheel cannot cut ─────────────────────
  {
    id: 'soul-marrow',
    category: 'soul',
    name: 'Soul Marrow',
    flavor:
      'The bane-marks bite deeper now, and the Wellspring drinks deeper with them. What hurts your soul makes its return larger.',
    effectAtRank: (r) => fx('soul-marrow', { n: 5 * r }),
    costForRank: (r) => rankCost(200, r),
    maxRank: 3,
    apply: (c, rank) => ({ ...c, permanentRenownBonusPerBane: 0.05 * rank }),
    kind: 'permanent',
  },
  {
    id: 'wheelturner',
    category: 'soul',
    name: 'Wheelturner',
    flavor:
      "An old druid lays her hand on your chest and says only, 'One bright thread the wheel will not cut.' The first blessing on your soul survives the turn — the curses she leaves to the wheel.",
    effectAtRank: () => fx('wheelturner'),
    costForRank: () => 300,
    maxRank: 1,
    apply: (c) => ({ ...c, wheelturnerUnlocked: true }),
    kind: 'permanent',
  },
  {
    // Game-speed gates: ×2 / ×4 are renown unlocks, not free toggles. Cheap
    // first-buy traction with a real, felt payoff (owner directive 2026-06-10).
    // The mechanic lives UI-side: the speed controls read maxUnlockedSpeed()
    // below, so `apply` is identity — the upgrade's whole effect is the unlock.
    id: 'wheel-quickened',
    category: 'soul',
    name: 'The Wheel, Quickened',
    flavor:
      'The Grove teaches your soul to lean into the turn. The world is willing to hurry — for those who have paid the road its toll.',
    effectAtRank: () => fx('wheel-quickened'),
    costForRank: () => 15,
    maxRank: 1,
    apply: (c) => c,
    kind: 'permanent',
  },
  {
    id: 'wheel-unbound',
    category: 'soul',
    name: 'The Wheel, Unbound',
    flavor:
      'The old druid unhooks something behind the hours, and the road blurs. Walk it at a sprint — the wheel keeps the count either way.',
    effectAtRank: () => fx('wheel-unbound'),
    costForRank: () => 90,
    maxRank: 1,
    apply: (c) => c,
    kind: 'permanent',
  },

  // ─── CLASS: FIGHTER ──────────────────────────────────────────────────────
  {
    id: 'wellspring-vigil',
    category: 'survival',
    classId: 'fighter',
    name: 'Wellspring Vigil',
    flavor:
      "Mielikki's circle keeps a vigil while you sleep. You step into the dark with the second breath already drawn — and a third, and a fourth.",
    effectAtRank: (r) => fx('wellspring-vigil', { count: r, n: r }),
    costForRank: (r) => rankCost(100, r),
    maxRank: 3,
    apply: (c, rank) => {
      if (c.classId !== 'fighter') return c;
      return {
        ...c,
        resources: {
          ...c.resources,
          secondWindAvailable: true,
          secondWindBonusRemaining: rank,
        },
      };
    },
    kind: 'delveStart',
  },

  // ─── CLASS: ROGUE ────────────────────────────────────────────────────────
  {
    id: 'shadowstep',
    category: 'offense',
    classId: 'rogue',
    name: 'Shadowstep',
    flavor:
      "The Wakeful Mother's blessing — the shadow learns your step before you take it.",
    effectAtRank: (r) => fx('shadowstep', { count: r, n: r }),
    costForRank: (r) => rankCost(100, r),
    maxRank: 3,
    apply: (c, rank) => {
      if (c.classId !== 'rogue') return c;
      return setPermanentBonus(c, 'cunningAction', rank);
    },
    kind: 'delveStart',
  },
  {
    id: 'knife-in-the-dark',
    category: 'offense',
    classId: 'rogue',
    name: 'Knife in the Dark',
    flavor:
      "Selene's other face — the wound finds its way home.",
    effectAtRank: (r) => fx('knife-in-the-dark', { n: r }),
    costForRank: (r) => rankCost(150, r),
    maxRank: 3,
    apply: (c, rank) => {
      if (c.classId !== 'rogue') return c;
      return setPermanentBonus(c, 'sneakAttackDice', rank);
    },
    kind: 'permanent',
  },

  // ─── CLASS: WIZARD ───────────────────────────────────────────────────────
  {
    id: 'arcane-focus',
    category: 'offense',
    classId: 'wizard',
    name: 'Arcane Focus',
    flavor:
      'A node of the Wellspring set behind your sternum. Spells take aim a little surer.',
    effectAtRank: (r) => fx('arcane-focus', { n: r }),
    costForRank: (r) => rankCost(100, r),
    maxRank: 3,
    apply: (c) => addPermanentBonus(c, 'spellAttack', 1),
    kind: 'permanent',
  },
  {
    id: 'burning-tongue',
    category: 'offense',
    classId: 'wizard',
    name: 'Burning Tongue',
    flavor:
      'Mielikki burns a word into the back of your throat. Every spell tastes hotter on the way out.',
    effectAtRank: (r) => fx('burning-tongue', { n: r }),
    costForRank: (r) => rankCost(140, r),
    maxRank: 5,
    apply: (c) => addPermanentBonus(c, 'spellDamage', 1),
    kind: 'permanent',
  },
  {
    id: 'sigil-of-the-wakened-mind',
    category: 'offense',
    classId: 'wizard',
    name: 'Sigil of the Wakened Mind',
    flavor:
      'An old druid traces a rune over your eyes. The world hears your words louder.',
    effectAtRank: (r) => fx('sigil-of-the-wakened-mind', { n: r }),
    costForRank: (r) => rankCost(180, r),
    maxRank: 3,
    apply: (c) => addPermanentBonus(c, 'spellDc', 1),
    kind: 'permanent',
  },

  // ─── CLASS: BARBARIAN ────────────────────────────────────────────────────
  {
    id: 'brutal-scars',
    category: 'offense',
    classId: 'barbarian',
    name: 'Brutal Scars',
    flavor:
      'Every wound the master gave you healed crooked, into a harder thing. When you land a true blow, the old scars open with it.',
    effectAtRank: (r) => fx('brutal-scars', { n: r }),
    costForRank: (r) => rankCost(140, r),
    maxRank: 3,
    apply: (c) => {
      if (c.classId !== 'barbarian') return c;
      return { ...c, permanentCritDamageBonus: (c.permanentCritDamageBonus ?? 0) + 1 };
    },
    kind: 'permanent',
  },
  {
    id: 'reckless-eye',
    category: 'offense',
    classId: 'barbarian',
    name: 'Reckless Eye',
    flavor:
      'You stopped guarding the openings. Throwing the body wide, you see the kill the careful never will.',
    effectAtRank: (r) => fx('reckless-eye', { lo: 20 - r, n: r }),
    costForRank: (r) => rankCost(180, r),
    maxRank: 2,
    apply: (c) => {
      if (c.classId !== 'barbarian') return c;
      return addPermanentBonus(c, 'critRange', 1);
    },
    kind: 'permanent',
  },

  // ─── CLASS: RANGER ───────────────────────────────────────────────────────
  {
    id: 'first-arrow',
    category: 'offense',
    classId: 'ranger',
    name: 'First Arrow',
    flavor:
      'The arrow is loosed before the foe has a name. The Wellspring keeps your draw-hand sure across every life.',
    effectAtRank: (r) => fx('first-arrow', { n: r }),
    costForRank: (r) => rankCost(120, r),
    maxRank: 3,
    apply: (c) => {
      if (c.classId !== 'ranger') return c;
      return { ...c, permanentFirstAttackDamage: (c.permanentFirstAttackDamage ?? 0) + 1 };
    },
    kind: 'permanent',
  },
  {
    id: 'colossus-slayer',
    category: 'offense',
    classId: 'ranger',
    name: 'Colossus Slayer',
    flavor:
      'You learned which thread, pulled, unmakes the whole tapestry. The bleeding ones never last long under your eye.',
    effectAtRank: (r) => fx('colossus-slayer', { n: r }),
    costForRank: (r) => rankCost(140, r),
    maxRank: 2,
    apply: (c) => {
      if (c.classId !== 'ranger') return c;
      return { ...c, permanentWoundedTargetDamage: (c.permanentWoundedTargetDamage ?? 0) + 1 };
    },
    kind: 'permanent',
  },

  // ─── CLASS: DRUID ────────────────────────────────────────────────────────
  {
    id: 'primal-reservoir',
    category: 'survival',
    classId: 'druid',
    name: 'Primal Reservoir',
    flavor:
      'The Wellspring pools deeper in a soul that has already worn fur and feather. The beast within answers more readily now — and more often.',
    effectAtRank: (r) => fx('primal-reservoir', { count: r, n: r }),
    costForRank: (r) => rankCost(120, r),
    maxRank: 2,
    apply: (c, rank) => {
      if (c.classId !== 'druid') return c;
      return setPermanentBonus(c, 'wildShapeUses', rank);
    },
    kind: 'delveStart',
  },
  {
    id: 'verdant-wrath',
    category: 'offense',
    classId: 'druid',
    name: 'Verdant Wrath',
    flavor:
      "Mielikki's anger is the forest's — slow to wake, and ruinous once roused. Your spells carry a little of that old green fury into every life.",
    effectAtRank: (r) => fx('verdant-wrath', { n: r }),
    costForRank: (r) => rankCost(140, r),
    maxRank: 4,
    apply: (c) => {
      if (c.classId !== 'druid') return c;
      return addPermanentBonus(c, 'spellDamage', 1);
    },
    kind: 'permanent',
  },
  {
    id: 'deep-roots',
    category: 'offense',
    classId: 'druid',
    name: 'Deep Roots',
    flavor:
      "Your soul sends roots past the Wellspring's floor, into the still water beneath. From it you draw one more breath of the Weft than the body was given.",
    effectAtRank: (r) => fx('deep-roots', { count: r, n: r }),
    costForRank: (r) => rankCost(160, r),
    maxRank: 2,
    apply: (c) => {
      if (c.classId !== 'druid') return c;
      return addPermanentBonus(c, 'bonusSpellSlotsL1', 1);
    },
    kind: 'permanent',
  },

  // ─── CLASS: MONK ─────────────────────────────────────────────────────────
  {
    id: 'brimming-well',
    category: 'survival',
    classId: 'monk',
    name: 'Brimming Well',
    flavor:
      'The masters taught the body to hold its breath. The Wellspring teaches the soul to hold more. Your Ki brims past the old measure.',
    effectAtRank: (r) => fx('brimming-well', { count: r, n: r }),
    costForRank: (r) => rankCost(110, r),
    maxRank: 2,
    apply: (c, rank) => {
      if (c.classId !== 'monk') return c;
      return setPermanentBonus(c, 'kiPoints', rank);
    },
    kind: 'delveStart',
  },
  {
    id: 'pressure-points',
    category: 'offense',
    classId: 'monk',
    name: 'Pressure Points',
    flavor:
      'An old hand guides yours to the places where life runs thin beneath the skin. When the strike lands true, the body forgets for a moment how to stand.',
    effectAtRank: (r) => fx('pressure-points', { n: r }),
    costForRank: (r) => rankCost(140, r),
    maxRank: 3,
    apply: (c) => {
      if (c.classId !== 'monk') return c;
      return { ...c, permanentCritDamageBonus: (c.permanentCritDamageBonus ?? 0) + 1 };
    },
    kind: 'permanent',
  },

  // ─── CLASS: WIZARD (caster slot) ─────────────────────────────────────────
  {
    id: 'wellspring-of-mysteries',
    category: 'offense',
    classId: 'wizard',
    name: 'Wellspring of Mysteries',
    flavor:
      'The Wellspring keeps a page the masters never wrote — a fold of the Weft sewn into the soul, yours to spend and find waiting again.',
    effectAtRank: (r) => fx('wellspring-of-mysteries', { count: r, n: r }),
    costForRank: (r) => rankCost(160, r),
    maxRank: 2,
    apply: (c) => {
      if (c.classId !== 'wizard') return c;
      return addPermanentBonus(c, 'bonusSpellSlotsL1', 1);
    },
    kind: 'permanent',
  },
];

const BY_ID = new Map(RAW.map((u) => [u.id, u]));

/**
 * The renown price to buy `rank` of `upgrade`, scaled by the soul's ascension
 * STANDING (metaStore.ascensionUnlocked). The base curve is `costForRank`; a
 * higher standing soul earns more renown per run (ascension.renownMult) and the
 * Grove asks correspondingly more for the same depth. At Ascension 0 the
 * multiplier is 1, so a first-chain price is unchanged. This is the single source
 * of truth for the scaled price — both the purchase path (metaStore) and the
 * Grove display read it.
 */
export function groveUpgradeCost(upgrade: Upgrade, rank: number, ascensionLevel: number): number {
  return Math.round(upgrade.costForRank(rank) * ascensionUpgradeCostMult(ascensionLevel));
}

export function getUpgrade(id: string): Upgrade {
  const u = BY_ID.get(id);
  if (!u) throw new Error(`Upgrade not found: ${id}`);
  return u;
}

/** Safe variant: returns undefined for unknown ids (used by migrations). */
export function findUpgrade(id: string): Upgrade | undefined {
  return BY_ID.get(id);
}

export function listUpgrades(): Upgrade[] {
  return RAW;
}

/** Shared (class-agnostic) nodes in a functional category, for the shared tabs. */
export function listUpgradesByCategory(category: UpgradeCategory): Upgrade[] {
  return RAW.filter((u) => !u.classId && u.category === category);
}

/** Class-specific nodes for a given class, for that class's Grove tab. */
export function listClassUpgrades(classId: ClassId): Upgrade[] {
  return RAW.filter((u) => u.classId === classId);
}

export const UPGRADE_CATEGORIES: UpgradeCategory[] = [
  'survival',
  'offense',
  'economy',
  'fortune',
  'soul',
];

/**
 * Highest game-speed multiplier the account has unlocked at the Grove.
 * ×2 and ×4 are renown purchases (wheel-quickened / wheel-unbound); ×1 is
 * always available. ×4 implies nothing about ×2 — each is its own purchase —
 * but the clamp below naturally lets an owned ×4 stand alone. The speed
 * controls stay VISIBLE at every tier and render locked tiers greyed; the
 * single enforcement point is useGameSpeed(), which clamps the persisted
 * setting to this ceiling so a pre-gate save can't keep a speed it no longer
 * owns.
 */
export function maxUnlockedSpeed(unlocked: Record<string, number>): 1 | 2 | 4 {
  if ((unlocked['wheel-unbound'] ?? 0) >= 1) return 4;
  if ((unlocked['wheel-quickened'] ?? 0) >= 1) return 2;
  return 1;
}
