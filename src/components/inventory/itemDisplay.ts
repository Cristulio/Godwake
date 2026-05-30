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
      return item.category === 'shield'
        ? `+${item.baseAC} AC shield`
        : `${item.category} · AC ${item.baseAC}`;
    case 'consumable':
      return item.healDice ? `heal ${item.healDice}` : item.effect;
    case 'accessory':
      return cap(item.accessorySlot);
  }
}

/** Short "what it is / what slot it fills" tag — the equip target in words. */
export function itemTypeLabel(item: Item): string {
  switch (item.kind) {
    case 'weapon':
      return 'Weapon';
    case 'armor':
      return item.category === 'shield' ? 'Shield' : `${cap(item.category)} armor`;
    case 'consumable':
      return 'Consumable';
    case 'accessory':
      return cap(item.accessorySlot);
  }
}
