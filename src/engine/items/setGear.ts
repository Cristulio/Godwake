import type { Character, EquipmentSlots } from '../../types/character';
import type { ItemRef } from '../../schemas/item';
import type { SetPiece } from '../../content/sets';
import { getItem } from '../../content/items';

/** The ItemRef a banked set piece materialises into when worn (rarity 'set'). */
export function setPieceRef(piece: SetPiece): ItemRef {
  return {
    itemId: piece.id,
    rolled: {
      baseId: piece.id,
      rarity: 'set',
      affixes: [],
      enhancement: piece.enhancement ?? 0,
      name: piece.name,
    },
  };
}

function isTwoHanded(itemId: string): boolean {
  const item = getItem(itemId);
  return item.kind === 'weapon' && item.properties.includes('two-handed');
}

/**
 * Overlay the soul's equipped SET pieces onto an already kit-reset character:
 * each piece REPLACES whatever sits in its slot (the rolled / starting item) and
 * is appended to the pack so the inventory + sell guard see it as worn. Rings
 * route to the first free band; a two-handed set weapon clears the off-hand.
 * Pure — `pieces` is the pre-validated set (owned, class-legal, slot unlocked);
 * validation lives in metaStore.applySetLoadout. The pieces' effect payloads are
 * baked separately onto `character.setEffects`; only their base stats / +N ride
 * the equipment placed here.
 */
export function materializeSetGear(character: Character, pieces: SetPiece[]): Character {
  if (pieces.length === 0) return character;
  const equipped: EquipmentSlots = { ...character.equipped };
  const inventory: ItemRef[] = [...character.inventory];
  for (const piece of pieces) {
    const ref = setPieceRef(piece);
    inventory.push(ref);
    if (piece.slot === 'mainHand') {
      equipped.mainHand = ref;
      if (isTwoHanded(piece.id)) equipped.offHand = null;
    } else if (piece.slot === 'ring1') {
      if (!equipped.ring1) equipped.ring1 = ref;
      else if (!equipped.ring2) equipped.ring2 = ref;
      else equipped.ring1 = ref;
    } else {
      equipped[piece.slot] = ref;
    }
  }
  return { ...character, equipped, inventory };
}

/** Whether a carried ref is a materialised SET piece (emerald, persistent). */
export function isSetPieceRef(ref: ItemRef | null | undefined): boolean {
  return ref?.rolled?.rarity === 'set';
}
