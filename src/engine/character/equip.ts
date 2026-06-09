import type { Character, EquipmentSlots } from '../../types/character';
import type { Armor, ItemRef, Weapon } from '../../schemas/item';
import type { ClassId } from '../../schemas/ids';
import { getItem } from '../../content/items';
import { getClass } from '../../content/classes';
import { getSetPiece } from '../../content/sets';
import { effectiveAbilityScores, characterHasMechanic } from './derived';
import { t, getLocalized } from '../../i18n';

/** Class display name through the content overlay (Spanish when active, else English). */
function localizedClassName(classId: ClassId): string {
  return getLocalized('classes', classId, 'name', getClass(classId).name);
}

export type EquipSlot = keyof EquipmentSlots;

/** Every equipment slot, in display order. */
export const EQUIP_SLOTS: EquipSlot[] = [
  'mainHand',
  'offHand',
  'armor',
  'helm',
  'amulet',
  'ring1',
  'ring2',
  'belt',
  'boots',
];

/**
 * Which slot, if any, an item kind can occupy. Consumables aren't equippable —
 * they're used directly from the inventory list.
 */
export function slotForItem(itemId: string): EquipSlot | null {
  const item = getItem(itemId);
  if (item.kind === 'weapon') return 'mainHand';
  if (item.kind === 'armor') {
    // Shields and caster orbs are the two off-hand armour kinds; everything else
    // (light/medium/heavy/robe) fills the body slot.
    return item.category === 'shield' || item.category === 'orb' ? 'offHand' : 'armor';
  }
  if (item.kind === 'accessory') {
    // Rings report ring1 as their canonical slot; `equipItem` routes to the
    // first free ring. `canEquipToSlot` accepts either ring slot for drag-drop.
    return item.accessorySlot === 'ring' ? 'ring1' : item.accessorySlot;
  }
  return null;
}

/**
 * Whether an item may be dropped onto the given slot. Mirrors `slotForItem`
 * except a ring matches BOTH ring slots, so the inventory UI lets the player
 * drag a ring onto either band.
 */
export function canEquipToSlot(itemId: string, slot: EquipSlot): boolean {
  const item = getItem(itemId);
  if (item.kind === 'accessory' && item.accessorySlot === 'ring') {
    return slot === 'ring1' || slot === 'ring2';
  }
  return slotForItem(itemId) === slot;
}

function isTwoHanded(itemId: string): boolean {
  const item = getItem(itemId);
  if (item.kind !== 'weapon') return false;
  return item.properties.includes('two-handed');
}

/**
 * A weapon that strikes from a distance — bows and crossbows, flagged by the
 * `ammunition` property. This is the same notion `playerAttack` uses to roll
 * off DEX, and the gate for the non-spatial ranged payoff (opening volley +
 * early evasion). Thrown melee weapons (a dagger, a javelin in hand) are NOT
 * ranged here: the engine resolves them as melee, so they grant no distance.
 */
export function isRangedWeapon(weapon: Weapon): boolean {
  return weapon.properties.includes('ammunition');
}

/** True when the character's main hand is a ranged weapon (bow / crossbow). */
export function wieldsRangedWeapon(character: Character): boolean {
  const ref = character.equipped.mainHand;
  if (!ref) return false;
  const item = getItem(ref.itemId);
  return item.kind === 'weapon' && isRangedWeapon(item);
}

/**
 * True when the character is wearing armor heavier than light (medium or heavy
 * category) in the body slot. Shields and robes are excluded.
 *
 * Used to gate agile-class perks: a Ranger or Rogue in medium/heavy armor
 * trades protection for agility — Opening Volley, Ranged Evasion, Cunning
 * Action, and Uncanny Dodge are all suppressed while the heavier armor is worn.
 * Swap back to light and they return.
 */
export function wearsHeavierThanLight(character: Character): boolean {
  const armorRef = character.equipped.armor;
  if (!armorRef) return false;
  const item = getItem(armorRef.itemId);
  if (item.kind !== 'armor') return false;
  return item.category === 'medium' || item.category === 'heavy';
}

/** True when the body slot holds heavy-category armour (plate). */
export function wearsHeavyArmor(character: Character): boolean {
  const armorRef = character.equipped.armor;
  if (!armorRef) return false;
  const item = getItem(armorRef.itemId);
  return item.kind === 'armor' && item.category === 'heavy';
}

/**
 * BG3 rule: a Barbarian's Rage cannot coexist with heavy armour. While plate is
 * worn the fury gives nothing — no bonus melee damage and no halved physical
 * damage — and donning it ends an active Rage outright (see `equipItem`,
 * `useRage`, and the playerAttack/monsterAttack benefit gates). The brute's
 * power rides an unburdened body.
 */
export function rageBrokenByArmor(character: Character): boolean {
  return character.classId === 'barbarian' && wearsHeavyArmor(character);
}

/**
 * BG3 rule: a Barbarian may physically DON heavy armour despite lacking
 * proficiency — it's a deliberate trade that costs them their Rage rather than
 * being hard-blocked at the equip gate (see `rageBrokenByArmor`). No other class
 * may wear armour it isn't trained in.
 */
export function barbarianMayDonHeavy(classId: ClassId, armor: Armor): boolean {
  return classId === 'barbarian' && armor.category === 'heavy';
}

/**
 * Warning text for the item tooltip when equipping an armor piece would
 * suppress a class's agile perks. Returns null when no suppression applies.
 */
export function agileTradeoffWarning(classId: ClassId, armor: { category: string }): string | null {
  if (armor.category !== 'medium' && armor.category !== 'heavy') return null;
  if (classId === 'ranger') return t('equip.agileRanger');
  if (classId === 'rogue') return t('equip.agileRogue');
  return null;
}

/**
 * The caveat to surface when {@link classId} inspects this armour — the cost of
 * donning it. A Barbarian sees that heavy plate ends their Rage; agile classes
 * see their suppressed perks. Mutually exclusive by class, so one line is enough.
 * Null when the piece carries no caveat for the class.
 */
export function armorEquipWarning(classId: ClassId, armor: { category: string }): string | null {
  if (classId === 'barbarian' && armor.category === 'heavy') {
    return t('equip.heavyRage');
  }
  return agileTradeoffWarning(classId, armor);
}

/**
 * Whether a class is trained to wield the given weapon. A weapon matches if its
 * category is in the class's proficient set, it carries one of the proficient
 * properties (a Rogue and any `finesse`/`light` blade), or its id is named
 * explicitly. Classes with no `weaponProficiency` are unrestricted. Keyed on
 * the class id so the roll engine can gate bases without a full Character.
 */
export function classWeaponProficient(classId: ClassId, weapon: Weapon): boolean {
  const prof = getClass(classId).weaponProficiency;
  if (!prof) return true;
  if (prof.categories.includes(weapon.category)) return true;
  if (prof.properties?.some((p) => weapon.properties.includes(p))) return true;
  if (prof.ids?.includes(weapon.id)) return true;
  return false;
}

export function isWeaponProficient(character: Character, weapon: Weapon): boolean {
  if (classWeaponProficient(character.classId, weapon)) return true;
  // College of Valor (Bard): Martial Training opens the full martial weapon rack
  // — the caster's base kit is simple + finesse, the martial fork adds the rest.
  if (weapon.category === 'martial' && characterHasMechanic(character, 'martial-training')) {
    return true;
  }
  return false;
}

export interface StatRequirement {
  ability: 'str' | 'dex';
  value: number;
}

/**
 * The ability gate to wield a weapon, derived from its properties (mirrors the
 * armour `strRequirement`). Heavy hafts demand STR; finesse blades and ranged
 * arms demand DEX — ranged wins when a weapon is both (the heavy longbow keys
 * off DEX). Thresholds bite a little — a low-STR wizard can't swing a greataxe
 * — without locking out the generalist one-handers (no req). The expansion's
 * ASIs let a soul grow into higher-req gear over a run. Null = no requirement.
 */
export function weaponStatRequirement(weapon: Weapon): StatRequirement | null {
  const props = weapon.properties;
  if (props.includes('ammunition') || props.includes('finesse')) {
    return { ability: 'dex', value: 13 };
  }
  if (props.includes('heavy')) {
    return { ability: 'str', value: 15 };
  }
  return null;
}

/**
 * Whether a class is trained to wear the given armour. Matches if the armour's
 * category is in the class's proficient set. Classes with no `armorProficiency`
 * are unrestricted; an empty `categories` (the Wizard) wears nothing. This is
 * the armour class-gate — a Ranger can't strap on heavy chain mail.
 */
export function classArmorProficient(classId: ClassId, armor: Armor): boolean {
  const prof = getClass(classId).armorProficiency;
  if (!prof) return true;
  return prof.categories.includes(armor.category);
}

export function isArmorProficient(character: Character, armor: Armor): boolean {
  if (classArmorProficient(character.classId, armor)) return true;
  // College of Valor (Bard): Martial Training adds medium armour + shields atop
  // the bard's base light/orb proficiency — the front-line fork.
  if (
    (armor.category === 'medium' || armor.category === 'shield') &&
    characterHasMechanic(character, 'martial-training')
  ) {
    return true;
  }
  return false;
}

/**
 * Why the given item can't be equipped right now, or `null` if it can.
 * `equipItem` is the authoritative enforcement point; this mirrors its gates
 * for pre-emptive UI.
 */
export function equipDenialReason(character: Character, itemId: string): string | null {
  const item = getItem(itemId);

  // A class-bound SET piece only seats while playing its class (belt-and-
  // suspenders over the class-biased drop / inject paths).
  const setPiece = getSetPiece(itemId);
  if (setPiece?.classGate && setPiece.classGate !== character.classId) {
    return t('equip.boundToClass', { class: localizedClassName(setPiece.classGate) });
  }

  if (item.kind === 'weapon') {
    if (!isWeaponProficient(character, item)) {
      return t('equip.cantWield', { class: localizedClassName(character.classId) });
    }
    const req = weaponStatRequirement(item);
    if (req) {
      const score = effectiveAbilityScores(character)[req.ability] ?? 0;
      if (score < req.value) {
        return t('equip.requiresAbility', { ability: t(`combat.abil.${req.ability}`), value: req.value });
      }
    }
  }

  if (item.kind === 'armor') {
    if (!isArmorProficient(character, item) && !barbarianMayDonHeavy(character.classId, item)) {
      return t('equip.cantWear', { class: localizedClassName(character.classId) });
    }
    if (item.strRequirement !== undefined) {
      const str = effectiveAbilityScores(character).str ?? 0;
      if (str < item.strRequirement) {
        return t('equip.requiresStrength', { ability: t('combat.abil.str'), value: item.strRequirement });
      }
    }
  }

  return null;
}

/**
 * Whether the given item can be equipped right now. Thin wrapper over
 * `equipDenialReason` for call sites that only need the boolean.
 */
export function canEquip(character: Character, itemId: string): boolean {
  return equipDenialReason(character, itemId) === null;
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
  const item = getItem(ref.itemId);
  const setPiece = getSetPiece(ref.itemId);
  if (setPiece?.classGate && setPiece.classGate !== character.classId) return character;
  if (item.kind === 'weapon') {
    if (!isWeaponProficient(character, item)) return character;
    const req = weaponStatRequirement(item);
    if (req && (effectiveAbilityScores(character)[req.ability] ?? 0) < req.value) {
      return character;
    }
  }
  if (item.kind === 'armor') {
    if (!isArmorProficient(character, item) && !barbarianMayDonHeavy(character.classId, item)) {
      return character;
    }
    if (item.strRequirement !== undefined) {
      const str = effectiveAbilityScores(character).str ?? 0;
      if (str < item.strRequirement) return character;
    }
  }
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
  } else if (item.kind === 'accessory' && item.accessorySlot === 'ring') {
    // Fill the first empty ring; if both bands are full, the new ring takes
    // the first slot (the displaced one falls back to the bag).
    if (!equipped.ring1) equipped.ring1 = ref;
    else if (!equipped.ring2) equipped.ring2 = ref;
    else equipped.ring1 = ref;
  } else {
    // armor / helm / amulet / belt / boots — direct single-slot assignment.
    equipped[slot] = ref;
  }

  const next: Character = { ...character, equipped };
  // BG3: strapping into heavy plate ends a Barbarian's Rage on the spot — no
  // benefit rides plate, so the fury gutters out. Charges are NOT refunded.
  if (rageBrokenByArmor(next) && (next.resources.rageRoundsRemaining ?? 0) > 0) {
    return { ...next, resources: { ...next.resources, rageRoundsRemaining: 0 } };
  }
  return next;
}

/**
 * Equip the item at `inventoryIdx` aimed at a specific slot — the drag-drop
 * entry point. A ring honours the exact band it was dropped on, so ring1 and
 * ring2 stay independent (the playtest bug was a 2nd-ring drop overwriting the
 * 1st). Every other item AUTO-ROUTES to its natural slot, so dropping a helm
 * onto the boots well still equips the helm — the player needn't hit the exact
 * slot. Non-ring cases fall through to `equipItem` for its two-handed clearing
 * and first-free defaults.
 */
export function equipItemToSlot(
  character: Character,
  inventoryIdx: number,
  targetSlot: EquipSlot,
): Character {
  const ref = character.inventory[inventoryIdx];
  if (!ref) return character;
  const item = getItem(ref.itemId);
  const ringToBand =
    item.kind === 'accessory' &&
    item.accessorySlot === 'ring' &&
    (targetSlot === 'ring1' || targetSlot === 'ring2');
  if (!ringToBand) return equipItem(character, inventoryIdx);

  const equipped: EquipmentSlots = { ...character.equipped, [targetSlot]: ref };
  return { ...character, equipped };
}

/**
 * The set of inventory indices that are currently equipped. Object identity
 * between an equipped slot and its inventory entry breaks across a JSON
 * persist/rehydrate (a reload) AND for the starting kit (slots are separate
 * literals from the bag), so resolution falls back to matching `itemId` —
 * each slot claims a distinct unclaimed entry. This is the authoritative
 * "is this bag item worn" check for the inventory UI and the sell guard;
 * an identity-only test would let a worn item be sold after a reload.
 */
export function equippedInventoryIndices(character: Character): Set<number> {
  const indices = new Set<number>();
  for (const slot of EQUIP_SLOTS) {
    const ref = character.equipped[slot];
    if (!ref) continue;
    let idx = character.inventory.indexOf(ref);
    if (idx === -1) {
      idx = character.inventory.findIndex(
        (inv, i) => !indices.has(i) && inv.itemId === ref.itemId,
      );
    }
    if (idx !== -1) indices.add(idx);
  }
  return indices;
}

/** Clear a single equipment slot. The item stays in inventory. */
export function unequipSlot(character: Character, slot: EquipSlot): Character {
  if (!character.equipped[slot]) return character;
  return {
    ...character,
    equipped: { ...character.equipped, [slot]: null as ItemRef | null },
  };
}
