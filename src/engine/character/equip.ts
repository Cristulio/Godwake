import type { Character, EquipmentSlots } from '../../types/character';
import type { ItemRef } from '../../schemas/item';
import { getItem } from '../../content/items';

export type EquipSlot = keyof EquipmentSlots;

/**
 * Default attunement cap. Set below the 3-slot equipment count on purpose:
 * the player has mainHand / offHand / armor (3 slots), so a default of 2 means
 * the gate actually bites when 3 attuned items are owned, and Sage's Pact
 * (which restores parity at 3) feels like a real unlock instead of a no-op.
 */
export const DEFAULT_ATTUNEMENT_SLOTS = 2;

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

function requiresAttunement(itemId: string): boolean {
  const item = getItem(itemId);
  return (item.kind === 'weapon' || item.kind === 'armor') && item.attunement;
}

/** Maximum number of attuned items the soul can bind at once. */
export function attunementSlotsCap(character: Character): number {
  return DEFAULT_ATTUNEMENT_SLOTS + (character.attunementSlotsBonus ?? 0);
}

/** Count of currently-equipped items that require attunement. */
export function attunementSlotsUsed(character: Character): number {
  let used = 0;
  for (const slot of ['mainHand', 'offHand', 'armor'] as const) {
    const ref = character.equipped[slot];
    if (ref && requiresAttunement(ref.itemId)) used += 1;
  }
  return used;
}

/**
 * Whether the given item can be equipped right now. Returns `false` only when
 * attunement would push the character over their cap. The shape allows callers
 * (UI) to gray out items pre-emptively, while `equipItem` is the authoritative
 * enforcement point.
 */
export function canEquip(character: Character, itemId: string): boolean {
  if (!requiresAttunement(itemId)) return true;
  // Would this attune a NEW item, or replace an already-attuned one?
  const targetSlot = slotForItem(itemId);
  if (!targetSlot) return true;
  const currentlyInSlot = character.equipped[targetSlot];
  const replacingAttuned =
    currentlyInSlot != null && requiresAttunement(currentlyInSlot.itemId);
  if (replacingAttuned) return true;
  return attunementSlotsUsed(character) < attunementSlotsCap(character);
}

/**
 * Equip the item at the given inventory index. Returns a new Character with
 * updated equipment. Two-handed weapons clear the off-hand. Shields go into
 * off-hand but can't coexist with a two-handed main-hand (the two-hander is
 * unequipped, but the item ref remains in inventory).
 *
 * Returns the original character (unchanged identity) when the equip is
 * blocked — UI uses identity to detect failure.
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

  // Attunement cap is checked against the resulting equipped set so that
  // two-handed swaps that *free* an off-hand (and any item swap that
  // replaces an attuned item with another attuned item) compute correctly.
  const usedAfter = countAttuned(equipped);
  if (usedAfter > attunementSlotsCap(character)) {
    return character;
  }

  return { ...character, equipped };
}

function countAttuned(equipped: EquipmentSlots): number {
  let n = 0;
  for (const slot of ['mainHand', 'offHand', 'armor'] as const) {
    const ref = equipped[slot];
    if (ref && requiresAttunement(ref.itemId)) n += 1;
  }
  return n;
}

/** Clear a single equipment slot. The item stays in inventory. */
export function unequipSlot(character: Character, slot: EquipSlot): Character {
  if (!character.equipped[slot]) return character;
  return {
    ...character,
    equipped: { ...character.equipped, [slot]: null as ItemRef | null },
  };
}
