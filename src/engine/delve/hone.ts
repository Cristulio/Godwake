import type { Character } from '../../types/character';
import type { ItemRef } from '../../schemas/item';
import type { EquipSlot } from '../character/equip';
import { EQUIP_SLOTS } from '../character/equip';
import { getItem } from '../../content/items';

/**
 * The whetstone path of a rest room: forgo the heal to permanently sharpen one
 * carried item, raising its flat +N enhancement for the rest of the run. It
 * rides the SAME enhancement axis a dropped +N item uses — read by playerAttack
 * (attack + damage), computeAC (armour / shield), and scaleSpellDamage (a
 * caster's main-hand). No new damage path is introduced; an item only becomes
 * honeable when its +N is something the engine actually reads.
 */

/**
 * Absolute ceiling on an item's +N — the deepest-chapter roll cap
 * (rollItem.depthEnhanceCap at depth 14). Honing never pushes past it.
 */
export const MAX_ENHANCEMENT = 5;

/** A single run can hone one item at most this many pips above its rolled baseline. */
export const MAX_HONE_PER_ITEM = 2;

/** The flat +N currently on a carried ref (rolled enhancement incl. prior hones); 0 for a plain base. */
function currentEnhancement(ref: ItemRef): number {
  return ref.rolled?.enhancement ?? 0;
}

/**
 * Whether the +N on the item in this slot is actually READ by the combat / AC /
 * spell pipeline — the only items worth honing. A main-hand weapon's +N rides
 * attack, damage, AND a caster's spell scaling (scaleSpellDamage reads the
 * main-hand); body armour's and a shield's +N ride AC (computeAC). A robe, a
 * caster ORB off-hand, and every accessory carry no +N the engine reads, so
 * honing them would be a flavour-only no-op — they never enter the picker.
 */
export function slotTakesEnhancement(character: Character, slot: EquipSlot): boolean {
  const ref = character.equipped[slot];
  if (!ref) return false;
  const item = getItem(ref.itemId);
  if (slot === 'mainHand') return item.kind === 'weapon';
  if (slot === 'armor') return item.kind === 'armor' && item.category !== 'robe';
  if (slot === 'offHand') return item.kind === 'armor' && item.category === 'shield';
  return false;
}

/** Whether the item in this slot can still take another hone (under both caps). */
export function canHoneSlot(character: Character, slot: EquipSlot): boolean {
  const ref = character.equipped[slot];
  if (!ref || !slotTakesEnhancement(character, slot)) return false;
  if ((ref.rolled?.honedThisRun ?? 0) >= MAX_HONE_PER_ITEM) return false;
  if (currentEnhancement(ref) >= MAX_ENHANCEMENT) return false;
  return true;
}

/** The equip slots whose +N the engine reads — the whetstone's candidate list (cap-blind; the UI greys out the maxed ones). */
export function honeableSlots(character: Character): EquipSlot[] {
  return EQUIP_SLOTS.filter((slot) => slotTakesEnhancement(character, slot));
}

/** Whether any carried item can still be honed right now (gates the disabled Hone card). */
export function hasHoneableItem(character: Character): boolean {
  return honeableSlots(character).some((slot) => canHoneSlot(character, slot));
}

/**
 * Forgo the rest's heal to sharpen one carried item: returns a copy of the
 * character with the equipped item at `slot` raised +1 enhancement and its run
 * hone-count bumped, respecting both caps. A no-op (returns the same character)
 * when the slot can't be honed. Pure — patches the ref immutably and keeps the
 * worn slot and its backpack entry pointing at the SAME honed ref, so the
 * inventory display and the sell-guard never drift from the equipped item.
 *
 * Run-scoped for free: the +N lives on the run character's ref. A banked set
 * piece is stored as an id and re-materialised fresh each descent (setPieceRef),
 * so honing an equipped set piece never leaks into the persistent collection.
 */
export function honeItem(character: Character, slot: EquipSlot): Character {
  if (!canHoneSlot(character, slot)) return character;
  const oldRef = character.equipped[slot];
  if (!oldRef) return character;

  const prev = oldRef.rolled;
  const honedRef: ItemRef = {
    ...oldRef,
    rolled: prev
      ? {
          ...prev,
          enhancement: (prev.enhancement ?? 0) + 1,
          honedThisRun: (prev.honedThisRun ?? 0) + 1,
        }
      : {
          baseId: oldRef.itemId,
          rarity: 'white',
          affixes: [],
          enhancement: 1,
          honedThisRun: 1,
          name: getItem(oldRef.itemId).name,
        },
  };

  const equipped = { ...character.equipped, [slot]: honedRef };

  // Re-point the backpack entry that backs this slot at the honed ref. Looted
  // gear shares object identity between the slot and its bag entry; the starting
  // kit (and a save reloaded mid-run) does not, so fall back to an itemId match
  // not already claimed by another worn slot — mirroring equippedInventoryIndices.
  let invIdx = character.inventory.indexOf(oldRef);
  if (invIdx === -1) {
    const claimedByOtherSlots = new Set(
      EQUIP_SLOTS.filter((s) => s !== slot)
        .map((s) => character.equipped[s])
        .filter((r): r is ItemRef => r != null),
    );
    invIdx = character.inventory.findIndex(
      (r) => r.itemId === oldRef.itemId && !claimedByOtherSlots.has(r),
    );
  }
  const inventory =
    invIdx === -1
      ? character.inventory
      : character.inventory.map((r, i) => (i === invIdx ? honedRef : r));

  return { ...character, equipped, inventory };
}
