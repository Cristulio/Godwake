import type { Item } from '../../schemas/item';

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * The base mechanical one-liner for an item, shown under its name in the pack
 * and on shop rows. Weapons read their base damage (so shop rows aren't just
 * "affixes only"), armour its AC, accessories the slot they fill (a bone charm
 * reads as "Amulet") — no redundant "affixes only" tag.
 */
export function baseStatLine(item: Item): string {
  switch (item.kind) {
    case 'weapon':
      return `${item.damage} ${item.damageType}${item.versatileDamage ? ` (${item.versatileDamage} 2h)` : ''}`;
    case 'armor':
      if (item.category === 'shield') return `+${item.baseAC} AC shield`;
      if (item.category === 'robe') return 'robe · no AC';
      return `${item.category} · AC ${item.baseAC}`;
    case 'consumable':
      return item.healDice ? `heal ${item.healDice}` : item.effect;
    case 'accessory':
      return cap(item.accessorySlot);
  }
}

/**
 * The flat +N enhancement as a plain-English effect line — what the "+N" in the
 * name actually does. Weapons add it to attack and damage, armour/shields to AC.
 * Null when there's no enhancement (or the kind can't carry one).
 */
export function enhancementLine(item: Item, enhancement: number): string | null {
  if (enhancement <= 0) return null;
  switch (item.kind) {
    case 'weapon':
      return `+${enhancement} to attack and damage rolls`;
    case 'armor':
      return item.category === 'robe' ? null : `+${enhancement} Armor Class`;
    default:
      return null;
  }
}

/** Short "what it is / what slot it fills" tag — the equip target in words. */
export function itemTypeLabel(item: Item): string {
  switch (item.kind) {
    case 'weapon':
      return 'Weapon';
    case 'armor':
      if (item.category === 'shield') return 'Shield';
      if (item.category === 'robe') return 'Robe';
      return `${cap(item.category)} armor`;
    case 'consumable':
      return 'Consumable';
    case 'accessory':
      return cap(item.accessorySlot);
  }
}
