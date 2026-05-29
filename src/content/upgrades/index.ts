import type { Character } from '../../types/character';

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
 */
export type UpgradeKind = 'delveStart' | 'permanent';
export type UpgradeCategory = 'body' | 'edge' | 'coin' | 'spirit' | 'soul';

export interface Upgrade {
  id: string;
  category: UpgradeCategory;
  name: string;
  flavor: string;
  /** Human-facing description of the effect AT the given rank. rank 0 means "not yet owned". */
  effectAtRank: (rank: number) => string;
  /** Renown cost to BUY rank N (where N = 1..maxRank). Roughly base * rank^1.6. */
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

/** Standard cost curve: base * rank^1.3, rounded. Flattened from 1.6 so the top ranks of multi-rank trees remain reachable in a normal play schedule. */
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
  // ─── BODY ──────────────────────────────────────────────────────────────
  {
    // Reflavor: prior version granted +5 ft movement, but the combat engine
    // never reads movement (rooms aren't positional). Per the no-flavor-only
    // rule, the cheap starter slot now grants +2 maximum HP — same renown
    // cost, mechanically real, fits the "road-toughened" flavor.
    id: 'pilgrims-boots',
    category: 'body',
    name: "Pilgrim's Boots",
    flavor:
      'The druids gift the wakened soul a pair of hide-leather boots before the road. The first mile teaches the back. The hundredth thickens it.',
    effectAtRank: (r) => `+${r * 2} maximum HP, permanent.`,
    costForRank: () => 25,
    maxRank: 1,
    apply: (c) => addPermanentBonus(c, 'hp', 2),
    kind: 'permanent',
  },
  {
    id: 'mantle-of-the-wakened',
    category: 'body',
    name: 'Mantle of the Wakened',
    flavor:
      'The Wellspring keeps something back — a fistful of the old life sewn into the seam of the new. The flesh remembers wounds it has not taken yet.',
    effectAtRank: (r) => `+${r * 5} maximum HP, permanent across reincarnations.`,
    costForRank: (r) => rankCost(80, r),
    maxRank: 5,
    apply: (c) => addPermanentBonus(c, 'hp', 5),
    kind: 'permanent',
  },
  {
    id: 'cloak-of-the-grove',
    category: 'body',
    name: 'Cloak of the Grove',
    flavor:
      "Spider-silk shot through with fern fronds and the cinder of last winter's fire. It moves when no wind touches it.",
    effectAtRank: (r) => `+${r} AC, permanent.`,
    costForRank: (r) => rankCost(150, r),
    maxRank: 3,
    apply: (c) => addPermanentBonus(c, 'ac', 1),
    kind: 'permanent',
  },
  {
    id: 'wellspring-vigil',
    category: 'body',
    name: 'Wellspring Vigil',
    flavor:
      "Mielikki's circle keeps a vigil while you sleep. You step into the dark with the second breath already drawn — and a third, and a fourth.",
    effectAtRank: (r) => `Fighter: +${r} Second Wind charge${r === 1 ? '' : 's'} per delve.`,
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
  {
    id: 'hardier-soul',
    category: 'body',
    name: 'Hardier Soul',
    flavor:
      "Ilmater's mark pressed beneath the heart. When the body breaks, the soul remembers it can still stand once more.",
    effectAtRank: (r) => `+${r} stabilise charge${r === 1 ? '' : 's'} per delve.`,
    costForRank: (r) => rankCost(120, r),
    maxRank: 3,
    apply: (c, rank) => ({
      ...c,
      delveStabiliseBonus: rank,
    }),
    kind: 'delveStart',
  },
  {
    // Deeper Grove tier — sealed until the soul has walked the whole chain and
    // returned. Raises the HP ceiling past what the base trees reach.
    id: 'wellspring-depths',
    category: 'body',
    name: "Wellspring's Depth",
    flavor:
      "The pool only shows its floor to a soul that has walked the whole road and come back from the spider's hall. What it gives now, it could not give before.",
    effectAtRank: (r) => `+${r * 10} maximum HP, permanent across reincarnations.`,
    costForRank: (r) => rankCost(200, r),
    maxRank: 3,
    apply: (c) => addPermanentBonus(c, 'hp', 10),
    kind: 'permanent',
    unlock: { ascension: 1, label: 'Clear the chain to unlock.' },
  },

  // ─── EDGE ──────────────────────────────────────────────────────────────
  {
    id: 'heirloom-blade',
    category: 'edge',
    name: 'Heirloom Blade',
    flavor:
      'A blade laid on the Wellspring stones the night of your last death. The grip has been worn smooth by another hand.',
    effectAtRank: (r) => `+${r} to all attack rolls, permanent.`,
    costForRank: (r) => rankCost(180, r),
    maxRank: 4,
    apply: (c) => addPermanentBonus(c, 'attack', 1),
    kind: 'permanent',
  },
  {
    id: 'whetstone-resolve',
    category: 'edge',
    name: 'Whetstone Resolve',
    flavor:
      "A stone the size of your thumb, oily with old grease and older blood. The edge it gives you doesn't dull.",
    effectAtRank: (r) => `+${r} damage on all weapon hits, permanent.`,
    costForRank: (r) => rankCost(150, r),
    maxRank: 4,
    apply: (c) => addPermanentBonus(c, 'damage', 1),
    kind: 'permanent',
  },
  {
    id: 'killers-eye',
    category: 'edge',
    name: "Killer's Eye",
    flavor:
      'A wolf-tooth necklace. The druids will not say which of the Wellspring children lost it. Your eye sharpens before you know why.',
    effectAtRank: (r) => `Crit range widens by ${r} (rank ${r}: crit on ${20 - r}-20).`,
    costForRank: (r) => rankCost(200, r),
    maxRank: 2,
    apply: (c) => addPermanentBonus(c, 'critRange', 1),
    kind: 'permanent',
  },
  {
    id: 'first-cut',
    category: 'edge',
    name: 'First Cut',
    flavor:
      'A length of red thread tied to the wrist. The hand it guides moves a half-breath earlier than the others.',
    effectAtRank: (r) => `+${r} damage on the first attack of each combat, permanent.`,
    costForRank: (r) => rankCost(120, r),
    maxRank: 3,
    apply: (c) => ({
      ...c,
      permanentFirstAttackDamage: (c.permanentFirstAttackDamage ?? 0) + 1,
    }),
    kind: 'permanent',
  },
  {
    id: 'bleed-out',
    category: 'edge',
    name: 'Bleed-Out',
    flavor:
      "An owl's feather pressed against your collar by a child who would not speak. Wounded things lean toward you, and you toward them.",
    effectAtRank: (r) => `+${r} damage against wounded targets (HP at half or less), permanent.`,
    costForRank: (r) => rankCost(140, r),
    maxRank: 2,
    apply: (c) => ({
      ...c,
      permanentWoundedTargetDamage: (c.permanentWoundedTargetDamage ?? 0) + 1,
    }),
    kind: 'permanent',
  },
  {
    id: 'fellfast-strike',
    category: 'edge',
    name: 'Fellfast Strike',
    flavor:
      'A hawk-bone splinter set into the pommel. When the strike lands true, the bone hums and the wound runs deeper than steel should reach.',
    effectAtRank: (r) => `+${r} damage on critical hits, permanent.`,
    costForRank: (r) => rankCost(180, r),
    maxRank: 3,
    apply: (c) => ({
      ...c,
      permanentCritDamageBonus: (c.permanentCritDamageBonus ?? 0) + 1,
    }),
    kind: 'permanent',
  },
  {
    id: 'shadowstep',
    category: 'edge',
    name: 'Shadowstep',
    flavor:
      "The Wakeful Mother's blessing — the shadow learns your step before you take it.",
    effectAtRank: (r) => `+${r} Cunning Action use per combat (Rogue).`,
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
    category: 'edge',
    name: 'Knife in the Dark',
    flavor:
      "Selûne's other face — the wound finds its way home.",
    effectAtRank: (r) => `+${r}d6 Sneak Attack damage (Rogue).`,
    costForRank: (r) => rankCost(150, r),
    maxRank: 3,
    apply: (c, rank) => {
      if (c.classId !== 'rogue') return c;
      return setPermanentBonus(c, 'sneakAttackDice', rank);
    },
    kind: 'permanent',
  },
  {
    id: 'burning-tongue',
    category: 'edge',
    name: 'Burning Tongue',
    flavor:
      'Mielikki burns a word into the back of your throat. Every spell tastes hotter on the way out.',
    effectAtRank: (r) => `+${r} damage to spells, permanent.`,
    costForRank: (r) => rankCost(140, r),
    maxRank: 5,
    apply: (c) => addPermanentBonus(c, 'spellDamage', 1),
    kind: 'permanent',
  },
  {
    // Deeper Grove tier — sealed until the soul has cleared the chain at
    // Ascension 3. A mixed offensive crown for both martials and casters.
    id: 'crown-of-the-returned',
    category: 'edge',
    name: 'Crown of the Returned',
    flavor:
      'Beaten from the ash of cleared chains. Only a soul the wheel has carried back again and again may wear it without burning.',
    effectAtRank: (r) => `+${r} to all attack rolls and spell-attack rolls, permanent.`,
    costForRank: (r) => rankCost(350, r),
    maxRank: 2,
    apply: (c) => addPermanentBonus(addPermanentBonus(c, 'attack', 1), 'spellAttack', 1),
    kind: 'permanent',
    unlock: { ascension: 3, label: 'Reach Ascension 3 to unlock.' },
  },

  // ─── COIN ──────────────────────────────────────────────────────────────
  {
    id: 'coin-in-pocket',
    category: 'coin',
    name: 'Coin in the Pocket',
    flavor:
      'The Grove keepers tuck a few coppers into the hem of your coat each time the Wellspring releases you — and slip another purse to the quartermaster against the chapters you clear.',
    effectAtRank: (r) =>
      `Start each delve with +${r * 25} gold, and gain +${r * 5} gold each time a chapter boss falls.`,
    costForRank: (r) => rankCost(60, r),
    maxRank: 3,
    apply: (c) => {
      const withStart = addPermanentBonus(c, 'startingGold', 25);
      return addPermanentBonus(withStart, 'chapterClearGold', 5);
    },
    kind: 'permanent',
  },
  {
    id: 'mielikki-cache',
    category: 'coin',
    name: "Mielikki's Cache",
    flavor: "A flask stoppered with wax and the Lady's sigil. It tastes of pine sap and summer rain.",
    effectAtRank: (r) => `Start each delve with +${r} Potion${r === 1 ? '' : 's'} of Healing.`,
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
  {
    id: 'quartermasters-stipend',
    category: 'coin',
    name: "Quartermaster's Stipend",
    flavor:
      'A folded chit, sealed with green wax. Present it at a chapter cleared and the Grove will reimburse, by some accounting only they keep.',
    effectAtRank: (r) => `Gain +${10 * r} gold each time a chapter boss falls.`,
    costForRank: (r) => rankCost(120, r),
    maxRank: 3,
    apply: (c, rank) => ({ ...c, chapterClearGoldBonus: 10 * rank }),
    kind: 'delveStart',
  },

  // ─── SPIRIT ─────────────────────────────────────────────────────────────
  {
    id: 'wider-pantheon',
    category: 'spirit',
    name: 'Wider Pantheon',
    flavor:
      "Mielikki nods at her cousins, and they listen. At each altar, more voices speak — and a wider choice is laid before you.",
    effectAtRank: (r) => `Shrines offer ${3 + r} blessings (instead of 3).`,
    costForRank: (r) => rankCost(150, r),
    maxRank: 2,
    apply: (c, rank) => ({ ...c, shrineOptionBonus: rank }),
    kind: 'delveStart',
  },
  {
    id: 'pilgrims-step',
    category: 'spirit',
    name: "Pilgrim's Step",
    flavor:
      'You wake from the Wellspring with a god already murmuring at your shoulder. The road begins blessed.',
    effectAtRank: (r) =>
      `Start each delve with ${r} random shrine blessing${r === 1 ? '' : 's'} already in hand.`,
    costForRank: (r) => rankCost(200, r),
    maxRank: 2,
    // Pilgrim's Step blessings are rolled in gameStore.startDelve (needs the
    // active roller). The apply function is a no-op marker — the store reads
    // the rank directly.
    apply: (c) => c,
    kind: 'delveStart',
  },
  {
    id: 'tymoras-wager',
    category: 'spirit',
    name: "Tymora's Wager",
    flavor:
      "A copper coin pressed into your palm by a laughing priestess. Heads, you live. Tails, you live again. She never lets you see the result.",
    effectAtRank: (r) => `Start each delve with +${r} missed-attack reroll budget.`,
    costForRank: (r) => rankCost(100, r),
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
  {
    id: 'arcane-focus',
    category: 'spirit',
    name: 'Arcane Focus',
    flavor:
      'A node of the Wellspring set behind your sternum. Spells take aim a little surer.',
    effectAtRank: (r) => `+${r} to spell attack rolls, permanent.`,
    costForRank: (r) => rankCost(100, r),
    maxRank: 3,
    apply: (c) => addPermanentBonus(c, 'spellAttack', 1),
    kind: 'permanent',
  },
  {
    id: 'sigil-of-the-wakened-mind',
    category: 'spirit',
    name: 'Sigil of the Wakened Mind',
    flavor:
      'An old druid traces a rune over your eyes. The world hears your words louder.',
    effectAtRank: (r) => `+${r} spell save DC, permanent.`,
    costForRank: (r) => rankCost(180, r),
    maxRank: 3,
    apply: (c) => addPermanentBonus(c, 'spellDc', 1),
    kind: 'permanent',
  },
  {
    id: 'shrine-tithe',
    category: 'spirit',
    name: 'Shrine Tithe',
    flavor:
      "The Grove circles a tithe back to you at each altar — coin for coin, blood for blood. It is not generosity. It is bookkeeping.",
    effectAtRank: (r) => `Gain +${20 * r} gold at each shrine room visited.`,
    costForRank: (r) => rankCost(100, r),
    maxRank: 2,
    apply: (c, rank) => ({ ...c, shrineTitheGold: 20 * rank }),
    kind: 'delveStart',
  },

  // ─── SOUL ──────────────────────────────────────────────────────────────
  {
    id: 'iron-will',
    category: 'soul',
    name: 'Iron Will',
    flavor:
      'The Wellspring pulls deeper this time. You wake with breath you did not have before. Whatever the master takes, the soul keeps a little more.',
    effectAtRank: (r) => (r === 0 ? '+5 maximum HP, permanent.' : '+5 maximum HP, permanent.'),
    costForRank: (r) => rankCost(220, r),
    maxRank: 1,
    apply: (c) => addPermanentBonus(c, 'hp', 5),
    kind: 'permanent',
  },
  {
    id: 'sages-pact',
    category: 'soul',
    name: "Sage's Pact",
    flavor:
      "An old druid presses her thumb to your sternum and whispers a word from before the gods. The world makes a little more room for you.",
    effectAtRank: (r) => `+${r} Soul-bind slot${r === 1 ? '' : 's'}, permanent.`,
    costForRank: (r) => rankCost(150, r),
    maxRank: 2,
    apply: (c) => ({ ...c, attunementSlotsBonus: (c.attunementSlotsBonus ?? 0) + 1 }),
    kind: 'permanent',
  },
  {
    id: 'soul-marrow',
    category: 'soul',
    name: 'Soul Marrow',
    flavor:
      'The bane-marks bite deeper now, and the Wellspring drinks deeper with them. What hurts your soul makes its return larger.',
    effectAtRank: (r) =>
      `Each bane-quirk you carry grants an additional +${5 * r}% renown beyond the soul-mark.`,
    costForRank: (r) => rankCost(250, r),
    maxRank: 3,
    apply: (c, rank) => ({ ...c, permanentRenownBonusPerBane: 0.05 * rank }),
    kind: 'permanent',
  },
  {
    id: 'wheelturner',
    category: 'soul',
    name: 'Wheelturner',
    flavor:
      "An old druid lays her hand on your chest and says only, 'One thread the wheel will not cut.' Your first quirk survives the turn.",
    effectAtRank: () =>
      'On reincarnation, your first current quirk is carried into the new life (the second slot rerolls).',
    costForRank: (r) => rankCost(300, r),
    maxRank: 1,
    apply: (c) => ({ ...c, wheelturnerUnlocked: true }),
    kind: 'permanent',
  },
];

const BY_ID = new Map(RAW.map((u) => [u.id, u]));

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

export function listUpgradesByCategory(category: UpgradeCategory): Upgrade[] {
  return RAW.filter((u) => u.category === category);
}

export const UPGRADE_CATEGORIES: UpgradeCategory[] = [
  'body',
  'edge',
  'coin',
  'spirit',
  'soul',
];

export const CATEGORY_LABELS: Record<UpgradeCategory, string> = {
  body: 'Body',
  edge: 'Edge',
  coin: 'Coin',
  spirit: 'Spirit',
  soul: 'Soul',
};

export const CATEGORY_TAGLINES: Record<UpgradeCategory, string> = {
  body: 'Flesh that endures',
  edge: 'Steel that strikes truer',
  coin: 'Pockets that are never quite empty',
  spirit: 'Gods who lean closer',
  soul: 'The thread the wheel cannot cut',
};
