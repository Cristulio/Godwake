import { WeaponSchema, ArmorSchema, AccessorySchema, type Item } from '../../schemas/item';
import type { Accessory } from '../../schemas/item';

/**
 * Base items for the persistent SET GEAR layer (content/sets.ts). A set piece is
 * a real equippable slot item — a weapon, a piece of armour, or an accessory —
 * that the soul banks and re-equips at the hub. These bases give the engine
 * everything the normal equip path needs (slot via slotForItem, base damage /
 * AC, proficiency category); the set-specific power (a guaranteed effect payload
 * + the `+N` enhancement that keeps a piece above the best rolled purple) is
 * layered on at materialisation time (engine/items/setGear.ts) and the set
 * bonuses bake from content/sets.ts.
 *
 * Class-bound weapon / armour pieces are deliberately chosen to sit inside their
 * gated class's proficiency (a Rogue's set blade is finesse; a Fighter's set
 * plate is heavy) so the piece always equips for the class it themes to.
 * Universal sets are accessories — every class can wear them with no proficiency
 * gate.
 */

function weapon(data: {
  id: string;
  name: string;
  category: 'simple' | 'martial';
  damage: string;
  damageType: string;
  properties: string[];
  versatileDamage?: string;
  affinity?: string;
  cost: number;
}): Item {
  return WeaponSchema.parse({ kind: 'weapon', rarity: 'rare', ...data });
}

function armor(data: {
  id: string;
  name: string;
  category: 'light' | 'medium' | 'heavy' | 'robe';
  baseAC: number;
  cost: number;
}): Item {
  return ArmorSchema.parse({ kind: 'armor', rarity: 'rare', ...data });
}

function accessory(data: {
  id: string;
  name: string;
  accessorySlot: Accessory['accessorySlot'];
  cost: number;
}): Item {
  return AccessorySchema.parse({ kind: 'accessory', rarity: 'rare', ...data });
}

export const SET_BASE_ITEMS: Item[] = [
  // --- Vigil (universal, accessories) --------------------------------------
  accessory({ id: 'vigil-helm', name: 'Vigil Helm', accessorySlot: 'helm', cost: 220 }),
  accessory({ id: 'vigil-mantle', name: 'Vigil Mantle', accessorySlot: 'amulet', cost: 220 }),
  accessory({ id: 'vigil-heart', name: 'Vigil Heart', accessorySlot: 'ring', cost: 220 }),

  // --- Warsong (fighter, accessories) --------------------------------------
  accessory({ id: 'warsong-gauntlet', name: 'Warsong Gauntlet', accessorySlot: 'belt', cost: 240 }),
  accessory({ id: 'warsong-crest', name: 'Warsong Crest', accessorySlot: 'helm', cost: 240 }),

  // --- Ironclad Vow (fighter) — weapon + armour + accessory ----------------
  weapon({
    id: 'ironclad-banner',
    name: 'Ironclad Banner',
    category: 'martial',
    damage: '1d8',
    damageType: 'piercing',
    properties: ['versatile'],
    versatileDamage: '1d10',
    affinity: 'fighter',
    cost: 320,
  }),
  armor({ id: 'ironclad-greaves', name: 'Ironclad Greaves', category: 'heavy', baseAC: 18, cost: 320 }),
  accessory({ id: 'ironclad-helm', name: 'Ironclad Helm', accessorySlot: 'helm', cost: 300 }),

  // --- Bloodrage Pelts (barbarian) — weapon + armour + accessory -----------
  weapon({
    id: 'bloodrage-fang',
    name: 'Bloodrage Fang',
    category: 'martial',
    damage: '1d8',
    damageType: 'slashing',
    properties: ['versatile'],
    versatileDamage: '1d10',
    affinity: 'barbarian',
    cost: 320,
  }),
  armor({ id: 'bloodrage-pelt', name: 'Bloodrage Pelt', category: 'medium', baseAC: 14, cost: 320 }),
  accessory({ id: 'bloodrage-totem', name: 'Bloodrage Totem', accessorySlot: 'amulet', cost: 300 }),

  // --- Wildstalker's Garb (ranger) — armour + accessories ------------------
  armor({ id: 'wildstalker-pelt', name: 'Wildstalker Pelt', category: 'light', baseAC: 12, cost: 320 }),
  accessory({ id: 'wildstalker-cowl', name: 'Wildstalker Cowl', accessorySlot: 'helm', cost: 300 }),
  accessory({ id: 'wildstalker-quiver', name: 'Wildstalker Quiver', accessorySlot: 'belt', cost: 300 }),

  // --- Vestments of the Archmagi (wizard) — robe + accessories -------------
  armor({ id: 'archmagi-vestments', name: 'Vestments of the Archmagi', category: 'robe', baseAC: 0, cost: 320 }),
  accessory({ id: 'archmagi-amulet', name: 'Amulet of the Archmagi', accessorySlot: 'amulet', cost: 300 }),
  accessory({ id: 'archmagi-orb', name: 'Orb of the Archmagi', accessorySlot: 'ring', cost: 300 }),

  // --- Greenwarden's Mantle (druid) — armour + accessories -----------------
  armor({ id: 'greenwarden-mantle', name: 'Greenwarden Mantle', category: 'light', baseAC: 12, cost: 320 }),
  accessory({ id: 'greenwarden-circlet', name: 'Greenwarden Circlet', accessorySlot: 'helm', cost: 300 }),
  accessory({ id: 'greenwarden-seed', name: 'Greenwarden Seed', accessorySlot: 'amulet', cost: 300 }),

  // --- Shadowdancer's Suite (rogue) — weapon + armour + accessory ----------
  weapon({
    id: 'shadowdancer-blade',
    name: 'Shadowdancer Blade',
    category: 'martial',
    damage: '1d6',
    damageType: 'piercing',
    properties: ['finesse', 'light'],
    affinity: 'rogue',
    cost: 320,
  }),
  armor({ id: 'shadowdancer-cloak', name: 'Shadowdancer Cloak', category: 'light', baseAC: 12, cost: 320 }),
  accessory({ id: 'shadowdancer-cowl', name: 'Shadowdancer Cowl', accessorySlot: 'helm', cost: 300 }),

  // --- Revenant's Resolve (universal, accessories) -------------------------
  accessory({ id: 'revenant-heart', name: 'Revenant Heart', accessorySlot: 'amulet', cost: 320 }),
  accessory({ id: 'revenant-shroud', name: 'Revenant Shroud', accessorySlot: 'boots', cost: 320 }),
  accessory({ id: 'revenant-chain', name: 'Revenant Chain', accessorySlot: 'ring', cost: 320 }),

  // --- Conqueror's Wake (universal, accessories) ---------------------------
  accessory({ id: 'conqueror-crown', name: 'Conqueror Crown', accessorySlot: 'helm', cost: 320 }),
  accessory({ id: 'conqueror-gauntlet', name: 'Conqueror Gauntlet', accessorySlot: 'ring', cost: 320 }),
  accessory({ id: 'conqueror-sigil', name: 'Conqueror Sigil', accessorySlot: 'amulet', cost: 320 }),
];
