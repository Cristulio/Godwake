import { WeaponSchema, ArmorSchema, AccessorySchema, type Item } from '../../schemas/item';
import type { Accessory } from '../../schemas/item';

/**
 * Base items for the persistent SET GEAR layer (content/sets.ts). A set piece is
 * a real equippable slot item — a weapon, a piece of armour, an off-hand orb, or
 * an accessory — that the soul banks cross-life and re-equips through the NORMAL
 * inventory (the pieces live in the backpack, not a hub reliquary screen). These
 * bases give the engine everything the normal equip path needs (slot via
 * slotForItem, base damage / AC, proficiency category); the set-specific power (a
 * guaranteed effect payload + the `+N` enhancement that keeps a piece above the
 * best rolled purple) is layered on at materialisation time
 * (engine/items/setGear.ts) and the escalating set bonuses bake from
 * content/sets.ts.
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
  category: 'light' | 'medium' | 'heavy' | 'shield' | 'robe' | 'orb';
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

/**
 * Generic ORB bases — the caster off-hand the drop pool offers (rollItem.ts).
 * `armor` kind, `orb` category: no AC, slots into the off-hand, casters only.
 * Plain bases (no set membership) — the affix roll makes them loot.
 */
export const ORB_BASE_IDS = ['crystal-orb', 'runed-orb', 'astral-orb'] as const;

const GENERIC_ORBS: Item[] = [
  armor({ id: 'crystal-orb', name: 'Crystal Orb', category: 'orb', baseAC: 0, cost: 90 }),
  armor({ id: 'runed-orb', name: 'Runed Orb', category: 'orb', baseAC: 0, cost: 140 }),
  armor({ id: 'astral-orb', name: 'Astral Orb', category: 'orb', baseAC: 0, cost: 210 }),
];

export const SET_BASE_ITEMS: Item[] = [
  ...GENERIC_ORBS,

  // --- Vigil (universal, accessories) --------------------------------------
  accessory({ id: 'vigil-helm', name: 'Vigil Helm', accessorySlot: 'helm', cost: 220 }),
  accessory({ id: 'vigil-mantle', name: 'Vigil Mantle', accessorySlot: 'amulet', cost: 220 }),
  accessory({ id: 'vigil-heart', name: 'Vigil Heart', accessorySlot: 'ring', cost: 220 }),

  // --- Wayfarer's Kit (universal, 3-piece) ---------------------------------
  accessory({ id: 'wayfarer-charm', name: 'Wayfarer Charm', accessorySlot: 'amulet', cost: 200 }),
  accessory({ id: 'wayfarer-belt', name: 'Wayfarer Belt', accessorySlot: 'belt', cost: 200 }),
  accessory({ id: 'wayfarer-treads', name: 'Wayfarer Treads', accessorySlot: 'boots', cost: 200 }),

  // --- Lanternkeeper's Watch (universal, 4-piece) --------------------------
  accessory({ id: 'lanternkeeper-helm', name: 'Lanternkeeper Helm', accessorySlot: 'helm', cost: 220 }),
  accessory({ id: 'lanternkeeper-charm', name: 'Lanternkeeper Charm', accessorySlot: 'amulet', cost: 220 }),
  accessory({ id: 'lanternkeeper-signet', name: 'Lanternkeeper Signet', accessorySlot: 'ring', cost: 220 }),
  accessory({ id: 'lanternkeeper-cord', name: 'Lanternkeeper Cord', accessorySlot: 'belt', cost: 220 }),

  // --- Gravewright's Due (universal, 4-piece) ------------------------------
  accessory({ id: 'gravewright-locket', name: 'Gravewright Locket', accessorySlot: 'amulet', cost: 220 }),
  accessory({ id: 'gravewright-band', name: 'Gravewright Band', accessorySlot: 'ring', cost: 220 }),
  accessory({ id: 'gravewright-seal', name: 'Gravewright Seal', accessorySlot: 'ring', cost: 220 }),
  accessory({ id: 'gravewright-girdle', name: 'Gravewright Girdle', accessorySlot: 'belt', cost: 220 }),

  // --- Pilgrim's Reliquary (universal, 6-piece) ----------------------------
  accessory({ id: 'pilgrim-circlet', name: 'Pilgrim Circlet', accessorySlot: 'helm', cost: 240 }),
  accessory({ id: 'pilgrim-reliquary', name: 'Pilgrim Reliquary', accessorySlot: 'amulet', cost: 240 }),
  accessory({ id: 'pilgrim-ring-road', name: 'Pilgrim Ring of the Road', accessorySlot: 'ring', cost: 240 }),
  accessory({ id: 'pilgrim-ring-vow', name: 'Pilgrim Ring of the Vow', accessorySlot: 'ring', cost: 240 }),
  accessory({ id: 'pilgrim-cincture', name: 'Pilgrim Cincture', accessorySlot: 'belt', cost: 240 }),
  accessory({ id: 'pilgrim-sandals', name: 'Pilgrim Sandals', accessorySlot: 'boots', cost: 240 }),

  // --- Warlord's Panoply (fighter, 9-piece) — weapon + shield + armour + 6 -
  weapon({
    id: 'warlord-blade',
    name: 'Warlord Blade',
    category: 'martial',
    damage: '1d8',
    damageType: 'slashing',
    properties: ['versatile'],
    versatileDamage: '1d10',
    affinity: 'fighter',
    cost: 340,
  }),
  armor({ id: 'warlord-bulwark', name: 'Warlord Bulwark', category: 'shield', baseAC: 2, cost: 320 }),
  armor({ id: 'warlord-plate', name: 'Warlord Plate', category: 'heavy', baseAC: 18, cost: 340 }),
  accessory({ id: 'warlord-greathelm', name: 'Warlord Greathelm', accessorySlot: 'helm', cost: 300 }),
  accessory({ id: 'warlord-torc', name: 'Warlord Torc', accessorySlot: 'amulet', cost: 300 }),
  accessory({ id: 'warlord-ring-command', name: 'Warlord Ring of Command', accessorySlot: 'ring', cost: 300 }),
  accessory({ id: 'warlord-ring-war', name: 'Warlord Ring of War', accessorySlot: 'ring', cost: 300 }),
  accessory({ id: 'warlord-warbelt', name: 'Warlord War-Belt', accessorySlot: 'belt', cost: 300 }),
  accessory({ id: 'warlord-sabatons', name: 'Warlord Sabatons', accessorySlot: 'boots', cost: 300 }),

  // --- Ruinhide (barbarian, 4-piece accessories) ---------------------------
  accessory({ id: 'ruinhide-fang', name: 'Ruinhide Fang', accessorySlot: 'amulet', cost: 220 }),
  accessory({ id: 'ruinhide-band', name: 'Ruinhide Band', accessorySlot: 'ring', cost: 220 }),
  accessory({ id: 'ruinhide-girdle', name: 'Ruinhide Girdle', accessorySlot: 'belt', cost: 220 }),
  accessory({ id: 'ruinhide-treads', name: 'Ruinhide Treads', accessorySlot: 'boots', cost: 220 }),

  // --- Nightveil (rogue, 4-piece accessories) ------------------------------
  accessory({ id: 'nightveil-cowl', name: 'Nightveil Cowl', accessorySlot: 'helm', cost: 220 }),
  accessory({ id: 'nightveil-pendant', name: 'Nightveil Pendant', accessorySlot: 'amulet', cost: 220 }),
  accessory({ id: 'nightveil-ring', name: 'Nightveil Ring', accessorySlot: 'ring', cost: 220 }),
  accessory({ id: 'nightveil-treads', name: 'Nightveil Treads', accessorySlot: 'boots', cost: 220 }),

  // --- Wolfpack Kit (ranger, 4-piece accessories) --------------------------
  accessory({ id: 'wolfpack-hood', name: 'Wolfpack Hood', accessorySlot: 'helm', cost: 220 }),
  accessory({ id: 'wolfpack-fang', name: 'Wolfpack Fang', accessorySlot: 'amulet', cost: 220 }),
  accessory({ id: 'wolfpack-band', name: 'Wolfpack Band', accessorySlot: 'ring', cost: 220 }),
  accessory({ id: 'wolfpack-quiver', name: 'Wolfpack Quiver', accessorySlot: 'belt', cost: 220 }),

  // --- Cloudstep (monk, 3-piece accessories) -------------------------------
  accessory({ id: 'cloudstep-band', name: 'Cloudstep Band', accessorySlot: 'amulet', cost: 220 }),
  accessory({ id: 'cloudstep-wraps', name: 'Cloudstep Wraps', accessorySlot: 'ring', cost: 220 }),
  accessory({ id: 'cloudstep-sash', name: 'Cloudstep Sash', accessorySlot: 'belt', cost: 220 }),

  // --- Oathbound (paladin, 5-piece accessories) ----------------------------
  accessory({ id: 'oathbound-helm', name: 'Oathbound Helm', accessorySlot: 'helm', cost: 240 }),
  accessory({ id: 'oathbound-amulet', name: 'Oathbound Amulet', accessorySlot: 'amulet', cost: 240 }),
  accessory({ id: 'oathbound-ring', name: 'Oathbound Ring', accessorySlot: 'ring', cost: 240 }),
  accessory({ id: 'oathbound-belt', name: 'Oathbound Belt', accessorySlot: 'belt', cost: 240 }),
  accessory({ id: 'oathbound-sabatons', name: 'Oathbound Sabatons', accessorySlot: 'boots', cost: 240 }),

  // --- Arcanist's Study (wizard, 4-piece accessories) ----------------------
  accessory({ id: 'arcanist-circlet', name: 'Arcanist Circlet', accessorySlot: 'helm', cost: 240 }),
  accessory({ id: 'arcanist-pendant', name: 'Arcanist Pendant', accessorySlot: 'amulet', cost: 240 }),
  accessory({ id: 'arcanist-ring', name: 'Arcanist Ring', accessorySlot: 'ring', cost: 240 }),
  accessory({ id: 'arcanist-sash', name: 'Arcanist Sash', accessorySlot: 'belt', cost: 240 }),

  // --- Greenmantle (druid, 5-piece accessories) ----------------------------
  accessory({ id: 'greenmantle-crown', name: 'Greenmantle Crown', accessorySlot: 'helm', cost: 240 }),
  accessory({ id: 'greenmantle-charm', name: 'Greenmantle Charm', accessorySlot: 'amulet', cost: 240 }),
  accessory({ id: 'greenmantle-ring', name: 'Greenmantle Ring', accessorySlot: 'ring', cost: 240 }),
  accessory({ id: 'greenmantle-cord', name: 'Greenmantle Cord', accessorySlot: 'belt', cost: 240 }),
  accessory({ id: 'greenmantle-boots', name: 'Greenmantle Boots', accessorySlot: 'boots', cost: 240 }),

  // --- Troubadour's Motley (bard, 3-piece accessories) ---------------------
  accessory({ id: 'troubadour-cap', name: 'Troubadour Cap', accessorySlot: 'helm', cost: 220 }),
  accessory({ id: 'troubadour-medallion', name: 'Troubadour Medallion', accessorySlot: 'amulet', cost: 220 }),
  accessory({ id: 'troubadour-ring', name: 'Troubadour Ring', accessorySlot: 'ring', cost: 220 }),

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

  // --- Bloodrage Wrath (barbarian, GRAND 8-piece) — 2H axe + armour + 6 ----
  weapon({
    id: 'bloodrage-fang',
    name: 'Bloodrage Greataxe',
    category: 'martial',
    damage: '1d12',
    damageType: 'slashing',
    properties: ['heavy', 'two-handed'],
    affinity: 'barbarian',
    cost: 360,
  }),
  armor({ id: 'bloodrage-pelt', name: 'Bloodrage Pelt', category: 'medium', baseAC: 14, cost: 320 }),
  accessory({ id: 'bloodrage-totem', name: 'Bloodrage Totem', accessorySlot: 'amulet', cost: 300 }),
  accessory({ id: 'bloodrage-helm', name: 'Bloodrage Skullhelm', accessorySlot: 'helm', cost: 300 }),
  accessory({ id: 'bloodrage-ring', name: 'Bloodrage Tusk-Ring', accessorySlot: 'ring', cost: 300 }),
  accessory({ id: 'bloodrage-band', name: 'Bloodrage Sinew-Band', accessorySlot: 'ring', cost: 300 }),
  accessory({ id: 'bloodrage-belt', name: 'Bloodrage Girdle', accessorySlot: 'belt', cost: 300 }),
  accessory({ id: 'bloodrage-boots', name: 'Bloodrage Treads', accessorySlot: 'boots', cost: 300 }),

  // --- Wildstalker's Garb (ranger) — armour + accessories ------------------
  armor({ id: 'wildstalker-pelt', name: 'Wildstalker Pelt', category: 'light', baseAC: 12, cost: 320 }),
  accessory({ id: 'wildstalker-cowl', name: 'Wildstalker Cowl', accessorySlot: 'helm', cost: 300 }),
  accessory({ id: 'wildstalker-quiver', name: 'Wildstalker Quiver', accessorySlot: 'belt', cost: 300 }),

  // --- Vestments of the Archmagi (wizard, GRAND 9-piece) — wand + orb + ----
  weapon({
    id: 'archmagi-wand',
    name: 'Wand of the Archmagi',
    category: 'simple',
    damage: '1d6',
    damageType: 'bludgeoning',
    properties: [],
    affinity: 'wizard',
    cost: 360,
  }),
  armor({ id: 'archmagi-orb', name: 'Orb of the Archmagi', category: 'orb', baseAC: 0, cost: 320 }),
  armor({ id: 'archmagi-vestments', name: 'Vestments of the Archmagi', category: 'robe', baseAC: 0, cost: 320 }),
  accessory({ id: 'archmagi-amulet', name: 'Amulet of the Archmagi', accessorySlot: 'amulet', cost: 300 }),
  accessory({ id: 'archmagi-helm', name: 'Crown of the Archmagi', accessorySlot: 'helm', cost: 300 }),
  accessory({ id: 'archmagi-ring', name: 'Ring of the Archmagi', accessorySlot: 'ring', cost: 300 }),
  accessory({ id: 'archmagi-band', name: 'Band of the Archmagi', accessorySlot: 'ring', cost: 300 }),
  accessory({ id: 'archmagi-girdle', name: 'Girdle of the Archmagi', accessorySlot: 'belt', cost: 300 }),
  accessory({ id: 'archmagi-slippers', name: 'Slippers of the Archmagi', accessorySlot: 'boots', cost: 300 }),

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
