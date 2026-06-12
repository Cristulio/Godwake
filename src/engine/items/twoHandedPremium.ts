import type { Item, ItemRef } from '../../schemas/item';
import { getItem } from '../../content/items';

/**
 * The two-handed premium — THE knob. A true two-hander costs the wielder the
 * whole off-hand (the shield's +AC, or an off-hand arm), so its rolled bonuses
 * must out-run a one-hander's by at least a third (owner directive 2026-06-12):
 * rolled affix magnitudes scale by this factor (rounded up, never less than +1
 * over the one-hand value), and the rolled +N sits one step closer to the depth
 * cap (rollItem). Pricing reads the same scale, so the hotter roll costs more.
 * PROVISIONAL until the gear/economy sim pass.
 *
 * Applied at READ time from the base weapon's properties — never baked into the
 * saved item — so tuning this constant retunes every existing drop too.
 */
export const TWO_HANDED_AFFIX_SCALE = 1.35;

/**
 * Whether a base earns the premium: a weapon wielded ONLY two-handed. Versatile
 * weapons (1d8/1d10 grip) keep shield access, so they count as one-handed here
 * even if a future base ever carried both tags.
 */
export function isTwoHandedPremiumBase(item: Item): boolean {
  return (
    item.kind === 'weapon' &&
    item.properties.includes('two-handed') &&
    !item.properties.includes('versatile')
  );
}

/** The affix-magnitude scale a carried ref's rolled affixes read at (1 = no premium). */
export function affixScaleForRef(ref: ItemRef | null | undefined): number {
  if (!ref?.rolled) return 1;
  try {
    return isTwoHandedPremiumBase(getItem(ref.itemId)) ? TWO_HANDED_AFFIX_SCALE : 1;
  } catch {
    return 1;
  }
}

/**
 * Scale one rolled affix magnitude: ×scale rounded UP, and never less than +1
 * over the unscaled value — the floor holds even if the knob is ever tuned
 * close to 1.
 */
export function scaleAffixMagnitude(value: number, scale: number): number {
  if (scale <= 1 || value <= 0) return value;
  return Math.max(Math.ceil(value * scale), value + 1);
}
