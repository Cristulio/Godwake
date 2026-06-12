import { ConsumableSchema, type Consumable } from '../../schemas/item';

export const POTION_OF_HEALING: Consumable = ConsumableSchema.parse({
  id: 'potion-of-healing',
  kind: 'consumable',
  name: 'Potion of Healing',
  effect: 'heal',
  healDice: '2d4+2',
  cost: 50,
  rarity: 'common',
  actionCost: 'bonus',
  description:
    'A small glass vial of red-gold liquid. Restores 2d4+2 hit points. Smells faintly of cinnamon and iron. Quaffed in a heartbeat — a bonus action.',
});

export const POTION_OF_GREATER_HEALING: Consumable = ConsumableSchema.parse({
  id: 'potion-of-greater-healing',
  kind: 'consumable',
  name: 'Potion of Greater Healing',
  effect: 'heal',
  healDice: '4d4+4',
  cost: 150,
  rarity: 'uncommon',
  actionCost: 'bonus',
  description:
    'A larger vial than the common draught — the red is deeper, almost black, and it carries the faint scent of cloves. Restores 4d4+4 hit points. A swift draught — a bonus action.',
});

export const ANTITOXIN: Consumable = ConsumableSchema.parse({
  id: 'antitoxin',
  kind: 'consumable',
  name: 'Antitoxin',
  effect: 'utility',
  cost: 50,
  rarity: 'common',
  actionCost: 'bonus',
  description:
    'A flat-tasting tincture in a clay phial. Drink to shrug off poison damage for the rest of this combat. Tastes of chalk and bitterness. Downed in a heartbeat — a bonus action.',
});

export const POTION_OF_HEROISM: Consumable = ConsumableSchema.parse({
  id: 'potion-of-heroism',
  kind: 'consumable',
  name: 'Potion of Vitality',
  effect: 'heal',
  healDice: '1d4+2',
  regenPerTurnDice: '1d6+3',
  regenTurns: 2,
  cost: 180,
  rarity: 'uncommon',
  actionCost: 'bonus',
  description:
    'A pale gold tonic that smells of beaten copper and pipe-smoke. It mends slow — a first thin warmth as it goes down, then the blood keeps knitting on its own over the moments that follow as the draught settles deep. Sipped, not slammed — a bonus action.',
});

// ---------------------------------------------------------------------------
// The deep ladder — late-game consumables (the designed gold sink). ALL prices
// and magnitudes below are PROVISIONAL seeds: no sim has touched them yet; the
// economy/usage sim pass tunes them.
// ---------------------------------------------------------------------------

export const POTION_OF_SUPERIOR_HEALING: Consumable = ConsumableSchema.parse({
  id: 'potion-of-superior-healing',
  kind: 'consumable',
  name: 'Potion of Superior Healing',
  effect: 'heal',
  healPercent: 50,
  cost: 400,
  rarity: 'rare',
  actionCost: 'bonus',
  description:
    'A heavy crystal flask, its red so dark it drinks the light. Restores half of your maximum hit points, however mighty you have grown. Down in one burning swallow — a bonus action.',
});

export const POTION_OF_VIGOR: Consumable = ConsumableSchema.parse({
  id: 'potion-of-vigor',
  kind: 'consumable',
  name: 'Potion of Vigor',
  effect: 'heal',
  healPercent: 50,
  tempHpPercent: 25,
  cost: 800,
  rarity: 'very-rare',
  actionCost: 'bonus',
  description:
    'Gold-shot crimson that hums against the glass like a held breath. Restores half of your maximum hit points and girds you past whole — a quarter again as temporary vigor. The deep-delve answer when the dark closes in. One swallow — a bonus action.',
});

export const ELIXIR_OF_IRON: Consumable = ConsumableSchema.parse({
  id: 'elixir-of-iron',
  kind: 'consumable',
  name: 'Elixir of Iron',
  effect: 'buff',
  encounterDamageReduction: 3,
  cost: 500,
  rarity: 'rare',
  actionCost: 'bonus',
  description:
    'Grey metal suspended in oil, cold all the way down. Your skin takes the temper of forged iron: every blow that lands this combat strikes 3 lighter. Swallowed in a heartbeat — a bonus action.',
});

export const OIL_OF_SHARPNESS: Consumable = ConsumableSchema.parse({
  id: 'oil-of-sharpness',
  kind: 'consumable',
  name: 'Oil of Sharpness',
  effect: 'buff',
  encounterAttackBonus: 2,
  encounterDamageBonus: 2,
  cost: 600,
  rarity: 'rare',
  actionCost: 'bonus',
  description:
    'A thin black oil that beads off the edge without ever quite falling. Worked along the wielded weapon it bites surer and deeper — +2 to hit and +2 damage for the rest of this combat. Applied in a practiced stroke — a bonus action.',
});

export const ALL_CONSUMABLES: Consumable[] = [
  POTION_OF_HEALING,
  POTION_OF_GREATER_HEALING,
  ANTITOXIN,
  POTION_OF_HEROISM,
  POTION_OF_SUPERIOR_HEALING,
  POTION_OF_VIGOR,
  ELIXIR_OF_IRON,
  OIL_OF_SHARPNESS,
];

/**
 * The chapter each consumable ENTERS shop stock (and the depth-tiered potion
 * drop pool) — the single gating knob: adding or re-gating any consumable later
 * is one line here. Existing rungs keep their pre-ladder placement (basic +
 * antitoxin from the gate, Greater at the old tier-2 depth, Vitality at tier-3);
 * antitoxin's always-stocked placement is deliberately untouched — the owner has
 * an open decision on it, and this map is now where that decision lands.
 * Chapter thresholds are PROVISIONAL pending the economy sim pass.
 */
export const CONSUMABLE_MIN_CHAPTER: Record<string, number> = {
  'potion-of-healing': 1,
  antitoxin: 1,
  'potion-of-greater-healing': 2,
  'potion-of-heroism': 3,
  'potion-of-superior-healing': 8,
  'elixir-of-iron': 8,
  'oil-of-sharpness': 8,
  'potion-of-vigor': 11,
};

/** Every consumable id legal at `chapter`, cheapest first (the shop-rack and
 *  drop-pool read). Unlisted ids never stock — the map is the gate. */
export function consumableIdsForChapter(chapter: number): string[] {
  return ALL_CONSUMABLES.filter(
    (c) => (CONSUMABLE_MIN_CHAPTER[c.id] ?? Infinity) <= chapter,
  )
    .sort((a, b) => a.cost - b.cost)
    .map((c) => c.id);
}
