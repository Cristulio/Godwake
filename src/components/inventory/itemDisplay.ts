import type { Item, ItemRef, RolledItem } from '../../schemas/item';
import type { GearRarity } from '../../schemas/item';
import type { Rarity } from '../../schemas/ids';
import { t, getLocalized } from '../../i18n';
import { getItem, getAffix } from '../../content/items';
import { affixDominance } from '../../engine/items/rollItem';
import { isTwoHandedPremiumBase, TWO_HANDED_AFFIX_SCALE, scaleAffixMagnitude } from '../../engine/items/twoHandedPremium';

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** Localized damage-type word (reads the shared combat namespace, owned elsewhere). */
export function localizedDamageType(type: string): string {
  const key = `combat.dmg.${type}`;
  const v = t(key);
  return v === key ? type : v;
}

/** Localized loot-rarity word (white/green/blue/purple/legendary/set). */
export function gearRarityLabel(rarity: GearRarity): string {
  return t(`screens.rarity.gear.${rarity}`);
}

/** Localized D&D base-item rarity word (common…artifact). */
export function dndRarityLabel(rarity: Rarity): string {
  return t(`screens.rarity.dnd.${rarity}`);
}

/** Localized weapon-property word (finesse, heavy, …), falling back to the raw id. */
export function weaponPropertyLabel(prop: string): string {
  const key = `screens.itemTooltip.property.${prop}`;
  const v = t(key);
  return v === key ? prop : v;
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
      // Always state handedness — a two-hander blocks a shield/orb off-hand, and
      // players couldn't tell 1H from 2H at a glance.
      const hands = item.properties.includes('two-handed')
        ? t('screens.itemDisplay.twoHanded')
        : item.versatileDamage
          ? t('screens.itemDisplay.versatileHands', { dice: item.versatileDamage })
          : t('screens.itemDisplay.oneHanded');
      return `${item.damage} ${localizedDamageType(item.damageType)} · ${hands}`;
    }
    case 'armor':
      if (item.category === 'shield') return t('screens.itemDisplay.acShield', { n: item.baseAC });
      if (item.category === 'robe') return t('screens.itemDisplay.robeNoAc');
      if (item.category === 'orb') return t('screens.itemDisplay.orbNoAc');
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
 * The two-handed premium disclosure under a true two-hander's affix list. The
 * affix effect lines print their one-hand numbers (static copy), so the item
 * states its amplification once. Null off-premium or with nothing to amplify.
 */
export function twoHandedPremiumLine(item: Item, rolled?: RolledItem): string | null {
  if (!rolled || rolled.affixes.length === 0) return null;
  if (!isTwoHandedPremiumBase(item)) return null;
  return t('screens.itemDisplay.twoHandedPremium', {
    pct: Math.round((TWO_HANDED_AFFIX_SCALE - 1) * 100),
  });
}

// How each scaled affix modifier renders as the "→ X" tag: a leading "+", a bare
// number (the prose already reads "deal N" / "heal N"), a percent, or — for crit
// range — the widened floor (critRangeBonus 2 → "18–20").
const SCALED_TAG_FMT: Record<string, 'plus' | 'bare' | 'pct' | 'crit'> = {
  damageBonus: 'plus', attackBonus: 'plus', spellDamageBonus: 'plus',
  spellAttackBonus: 'plus', spellDcBonus: 'plus', rageDamageBonus: 'plus',
  markDamageBonus: 'plus', sneakDamageBonus: 'plus', followupDamageBonus: 'plus',
  offHandDamageBonus: 'plus', bonusSpellSlotsL1: 'plus',
  bleedDamage: 'bare', regenPerTurn: 'bare',
  lifestealPct: 'pct', spellLifestealPct: 'pct',
  critRangeBonus: 'crit',
};

/**
 * The amplified value a single affix actually strikes for on a true two-hander —
 * the "→ X" tag rendered after its effect line so the displayed (one-hand) number
 * isn't the lie. Reads the affix's dominant numeric modifier, scales it the way
 * combat does ({@link scaleAffixMagnitude} × {@link TWO_HANDED_AFFIX_SCALE}), and
 * formats per channel. Null off a two-hander, or when the scale changes nothing.
 */
export function twoHandedScaledTag(affixId: string, item: Item): string | null {
  if (!isTwoHandedPremiumBase(item)) return null;
  let mods: Record<string, number | undefined>;
  try {
    mods = getAffix(affixId).modifiers as Record<string, number | undefined>;
  } catch {
    return null;
  }
  for (const key of Object.keys(SCALED_TAG_FMT)) {
    const base = mods[key];
    if (!base || base <= 0) continue;
    const scaled = scaleAffixMagnitude(base, TWO_HANDED_AFFIX_SCALE);
    if (scaled <= base) return null;
    switch (SCALED_TAG_FMT[key]) {
      case 'pct': return `${scaled}%`;
      case 'crit': return `${20 - scaled}–20`;
      case 'bare': return `${scaled}`;
      default: return `+${scaled}`;
    }
  }
  return null;
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
      return item.category === 'robe' || item.category === 'orb'
        ? null
        : t('screens.itemDisplay.enhanceArmor', { n: enhancement });
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
      if (item.category === 'orb') return t('screens.itemDisplay.orbLabel');
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
      if (item.category === 'orb') return t('screens.itemDisplay.orbLabel');
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
