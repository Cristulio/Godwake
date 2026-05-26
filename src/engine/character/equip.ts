import type { Character, EquipmentSlots } from '../../types/character';
import type { ItemRef } from '../../schemas/item';
import { getItem } from '../../content/items';

export type EquipSlot = keyof EquipmentSlots;

/**
 * Which slot, if any, an item kind can occupy. Consumables aren't equippable —
 * they're used directly from the inventory list.
 */
export function slotForItem(itemId: string): EquipSlot | null {
  const item = getItem(itemId);
  if (item.kind === 'weapon') return 'mainHand';
  if (item.kind === 'armor') {
    return item.category === 'shield' ? 'offHand' : 'armor';
  }
  return null;
}

function isTwoHanded(itemId: string): boolean {
  const item = getItem(itemId);
  if (item.kind !== 'weapon') return false;
  return item.properties.includes('two-handed');
}

/**
 * Equip the item at the given inventory index. Returns a new Character with
 * updated equipment. Two-handed weapons clear the off-hand. Shields go into
 * off-hand but can't coexist with a two-handed main-hand (the two-hander is
 * unequipped, but the item ref remains in inventory).
 *
 * Equipped slots reference items that remain in inventory — nothing is added
 * or removed from `inventory` here.
 */
export function equipItem(character: Character, inventoryIdx: number): Character {
  const ref = character.inventory[inventoryIdx];
  if (!ref) return character;
  const slot = slotForItem(ref.itemId);
  if (!slot) return character;

  const equipped: EquipmentSlots = { ...character.equipped };

  if (slot === 'mainHand') {
    equipped.mainHand = ref;
    if (isTwoHanded(ref.itemId)) {
      equipped.offHand = null;
    }
  } else if (slot === 'offHand') {
    if (equipped.mainHand && isTwoHanded(equipped.mainHand.itemId)) {
      equipped.mainHand = null;
    }
    equipped.offHand = ref;
  } else if (slot === 'armor') {
    equipped.armor = ref;
  }

  return { ...character, equipped };
}

/** Clear a single equipment slot. The item stays in inventory. */
export function unequipSlot(character: Character, slot: EquipSlot): Character {
  if (!character.equipped[slot]) return character;
  return {
    ...character,
    equipped: { ...character.equipped, [slot]: null as ItemRef | null },
  };
}
