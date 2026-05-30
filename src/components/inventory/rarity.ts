import type { GearRarity, ItemRef } from '../../schemas/item';

/** 8-bit-dark colour per loot rarity. White = the plain starting kit. */
export const GEAR_RARITY_COLOR: Record<GearRarity, string> = {
  white: 'var(--color-text-secondary)',
  green: 'var(--color-status-poison)',
  blue: 'var(--color-status-frost)',
  purple: 'var(--color-status-necrotic)',
  legendary: 'var(--color-accent-gold)',
};

export const GEAR_RARITY_LABEL: Record<GearRarity, string> = {
  white: 'Common',
  green: 'Uncommon',
  blue: 'Rare',
  purple: 'Epic',
  legendary: 'Legendary',
};

/** The gear rarity of a carried item ref, defaulting to white for plain bases. */
export function refRarity(ref: ItemRef | null | undefined): GearRarity {
  return ref?.rolled?.rarity ?? 'white';
}
