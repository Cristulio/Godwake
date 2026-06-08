import type { Item, ItemRef } from '../../schemas/item';
import { t, getLocalized } from '../../i18n';
import { getItem, getAffix } from '../../content/items';
import { affixDominance } from '../../engine/items/rollItem';

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** Localized damage-type word (reads the shared combat namespace, owned elsewhere). */
function damageType(type: string): string {
  return t(`combat.damageType.${type}`);
}

/**
 * The localized display name of a carried item. White / un-rolled items resolve
 * to the base name; rolled loot recomposes the Diablo-style [+N] [prefix] base
 * [suffix] name from its structured parts so each fragment is translated (the
 * baked `rolled.name` was English-only — built once at roll time). Set pieces
 * read the setGear namespace. Mirrors `rolledItemName`'s composition order.
 */
export function localizedItemName(ref: ItemRef): string {
  if (!ref?.itemId) return ref?.rolled?.name ?? '';
  const base = getItem(ref.itemId);
  if (ref.rolled?.rarity === 'set') {
    return getLocalized('setGear', ref.itemId, 'name', ref.rolled.name ?? base.name);
  }
  const baseName = getLocalized('items', base.id, 'name', base.name);
  if (!ref.rolled) return baseName;
  const affixes = ref.rolled.affixes.map(getAffix);
  const dominant = (kind: 'prefix' | 'suffix') =>
    affixes
      .filter((a) => a.namePart.kind === kind)
      .sort((a, b) => affixDominance(b) - affixDominance(a))[0];
  const prefix = dominant('prefix');
  const suffix = dominant('suffix');
  let name = baseName;
  if (prefix) name = `${getLocalized('items', prefix.id, 'word', prefix.namePart.word)} ${name}`;
  if (suffix) name = `${name} ${getLocalized('items', suffix.id, 'word', suffix.namePart.word)}`;
  const enh = ref.rolled.enhancement ?? 0;
  if (enh > 0) name = `+${enh} ${name}`;
  return name;
}

/** Localized one-line effect of an affix id (falls back to its English effect). */
export function localizedAffixEffect(affixId: string): string {
  try {
    return getLocalized('items', affixId, 'effect', getAffix(affixId).effect);
  } catch {
    return affixId;
  }
}

/**
 * The localized loot one-liner shown under a dropped item on the spoils screen:
 * affix effects joined with ·, or the base stat line for a plain (white) base.
 */
export function localizedItemDescription(ref: ItemRef): string {
  if (ref.rolled && ref.rolled.affixes.length > 0) {
    return ref.rolled.affixes.map(localizedAffixEffect).join(' · ');
  }
  try {
    return baseStatLine(getItem(ref.itemId));
  } catch {
    return '';
  }
}

/**
 * The base mechanical one-liner for an item, shown under its name in the pack
 * and on shop rows. Weapons read their base damage (so shop rows aren't just
 * "affixes only"), armour its AC, accessories the slot they fill (a bone charm
 * reads as "Amulet") — no redundant "affixes only" tag.
 */
export function baseStatLine(item: Item): string {
  switch (item.kind) {
    case 'weapon': {
      const versatile = item.versatileDamage
        ? ` (${item.versatileDamage} ${t('screens.itemDisplay.twoH')})`
        : '';
      return `${item.damage} ${damageType(item.damageType)}${versatile}`;
    }
    case 'armor':
      if (item.category === 'shield') return t('screens.itemDisplay.acShield', { n: item.baseAC });
      if (item.category === 'robe') return t('screens.itemDisplay.robeNoAc');
      return t('screens.itemDisplay.armorAc', { cat: categoryLabel(item.category), n: item.baseAC });
    case 'consumable':
      return item.healDice
        ? t('screens.itemDisplay.heal', { dice: item.healDice })
        : consumableEffectLabel(item.effect);
    case 'accessory':
      return slotLabel(item.accessorySlot);
  }
}

/**
 * The flat +N enhancement as a plain effect line — what the "+N" in the name
 * actually does. Weapons add it to attack and damage, armour/shields to AC.
 * Null when there's no enhancement (or the kind can't carry one).
 */
export function enhancementLine(item: Item, enhancement: number): string | null {
  if (enhancement <= 0) return null;
  switch (item.kind) {
    case 'weapon':
      return t('screens.itemDisplay.enhanceWeapon', { n: enhancement });
    case 'armor':
      return item.category === 'robe' ? null : t('screens.itemDisplay.enhanceArmor', { n: enhancement });
    default:
      return null;
  }
}

/** Short "what it is / what slot it fills" tag — the equip target in words. */
export function itemTypeLabel(item: Item): string {
  switch (item.kind) {
    case 'weapon':
      return t('screens.itemDisplay.weaponLabel');
    case 'armor':
      if (item.category === 'shield') return t('screens.itemDisplay.shieldLabel');
      if (item.category === 'robe') return t('screens.itemDisplay.robeLabel');
      return t('screens.itemDisplay.armorLabel', { cat: categoryLabel(item.category) });
    case 'consumable':
      return t('screens.itemDisplay.consumableLabel');
    case 'accessory':
      return slotLabel(item.accessorySlot);
  }
}

/** Tooltip kind line, e.g. "martial weapon" / "heavy armor" / "amulet · accessory". */
export function itemKindLabel(item: Item): string {
  switch (item.kind) {
    case 'weapon':
      return t('screens.itemDisplay.weaponKind', { cat: categoryLabel(item.category) });
    case 'armor':
      if (item.category === 'shield') return t('screens.itemDisplay.shieldLabel');
      if (item.category === 'robe') return t('screens.itemDisplay.robeLabel');
      return t('screens.itemDisplay.armorKind', { cat: categoryLabel(item.category) });
    case 'consumable':
      return t('screens.itemDisplay.consumableKind', { effect: consumableEffectLabel(item.effect) });
    case 'accessory':
      return t('screens.itemDisplay.accessoryKind', { slot: slotLabel(item.accessorySlot) });
  }
}

function categoryLabel(cat: string): string {
  const key = `screens.itemDisplay.category.${cat}`;
  const v = t(key);
  return v === key ? cap(cat) : v;
}

function slotLabel(slot: string): string {
  const key = `screens.itemDisplay.slot.${slot}`;
  const v = t(key);
  return v === key ? cap(slot) : v;
}

function consumableEffectLabel(effect: string): string {
  const key = `screens.itemDisplay.consumable.${effect}`;
  const v = t(key);
  return v === key ? effect : v;
}
