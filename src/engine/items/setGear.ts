import type { Character } from '../../types/character';
import type { ItemRef, AffixModifiers } from '../../schemas/item';
import { aggregateSetEffects, type SetPiece } from '../../content/sets';
import { EQUIP_SLOTS } from '../character/equip';

/**
 * The ItemRef a set piece materialises into. It is a REAL loot instance
 * (rarity 'set'): its base stats resolve through `getItem(piece.id)`, it carries
 * the guaranteed `+N` enhancement, and it is tagged with `setId` so the engine can
 * count how many pieces of a set are worn. The piece's signature effect payload
 * folds separately (equippedSetMods) so it is never double-counted by the affix
 * roll. Set pieces live in the NORMAL backpack and equip through the normal slot
 * flow. They are RUN-scoped loot (found via a drop or bought in a shop, wiped each
 * descent like rolled gear); only the SET UNLOCK persists (metaStore.unlockedSets).
 */
export function setPieceRef(piece: SetPiece): ItemRef {
  return {
    itemId: piece.id,
    rolled: {
      baseId: piece.id,
      rarity: 'set',
      affixes: [],
      enhancement: piece.enhancement ?? 0,
      setId: piece.setId,
      name: piece.name,
    },
  };
}

/** Whether a carried ref is a SET piece (emerald, run-scoped loot). */
export function isSetPieceRef(ref: ItemRef | null | undefined): boolean {
  return ref?.rolled?.rarity === 'set';
}

/**
 * Append set pieces into the backpack as real, equippable loot (NOT auto-equipped
 * — the player equips them through the normal inventory). Pure; `pieces` is the
 * pre-filtered set the caller deems class-legal. Used to surface a JUST-FOUND
 * piece into the live run this life (delveStore.resolveRoomVictory) — set pieces
 * are run-scoped now, so nothing re-injects them at descent.
 */
export function injectSetPieces(character: Character, pieces: SetPiece[]): Character {
  if (pieces.length === 0) return character;
  return {
    ...character,
    inventory: [...character.inventory, ...pieces.map(setPieceRef)],
  };
}

/** The set-piece ids the character is currently WEARING (equipped slots). */
export function equippedSetIds(character: Character): string[] {
  const ids: string[] = [];
  for (const slot of EQUIP_SLOTS) {
    const ref = character.equipped[slot];
    if (ref?.rolled?.setId) ids.push(ref.itemId);
  }
  return ids;
}

/**
 * The effect payloads a character's WORN set pieces contribute: each equipped
 * piece's own signature effect PLUS every met set-bonus tier (2-piece, 3-piece, …
 * up to the full set). Computed live from the equipped slots — no baked field — so
 * the bonuses track the moment a piece is equipped or removed. The pieces' base
 * stats / `+N` / any rolled affixes ride the normal equipment path; only these
 * effects fold here (characterAffixMods).
 */
export function equippedSetMods(character: Character): AffixModifiers[] {
  return aggregateSetEffects(equippedSetIds(character));
}
