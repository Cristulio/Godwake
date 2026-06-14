import type { Affix, AffixModifiers } from '../../schemas/item';
import type { Character } from '../../types/character';
import { getAffix } from '../../content/items';
import { combatLean, type CombatLean } from '../../engine/character/combatLean';
import { t } from '../../i18n';

/**
 * Which combat camp a single affix modifier serves. SPELL modifiers only help a
 * caster's spells; WEAPON modifiers only fire on a weapon hit; UNIVERSAL ones
 * (AC, temp HP, resist, sustain) help everyone regardless of how they fight.
 *
 * Keep the UNIVERSAL bucket generous on purpose — the dimming is a soft "this
 * won't help YOU" tell, not a hard gate, so anything ambiguous (lifesteal /
 * regen, which technically ride a weapon hit but read as sustain) stays bright.
 */
type ModifierCamp = 'spell' | 'weapon' | 'universal';

const MODIFIER_CAMP: Record<keyof AffixModifiers, ModifierCamp> = {
  // Spell-only — dead weight on a martial.
  spellDcBonus: 'spell',
  spellDamageBonus: 'spell',
  spellAttackBonus: 'spell',
  spellLifestealPct: 'spell',
  bonusSpellSlotsL1: 'spell',
  // Weapon-hit-only — dead weight on a pure caster.
  attackBonus: 'weapon',
  damageBonus: 'weapon',
  critRangeBonus: 'weapon',
  bleedDamage: 'weapon',
  rageDamageBonus: 'weapon',
  markDamageBonus: 'weapon',
  sneakDamageBonus: 'weapon',
  followupDamageBonus: 'weapon',
  offHandDamageBonus: 'weapon',
  // Universal — never dim. Defensive / sustain / utility.
  acBonus: 'universal',
  acBonusWhileFull: 'universal',
  acBonusWhileBloodied: 'universal',
  tempHpPerCombat: 'universal',
  resist: 'universal',
  lifestealPct: 'universal',
  regenPerTurn: 'universal',
};

function modifierCamps(affix: Affix): Set<ModifierCamp> {
  const camps = new Set<ModifierCamp>();
  for (const key of Object.keys(affix.modifiers) as (keyof AffixModifiers)[]) {
    if (affix.modifiers[key] === undefined) continue;
    camps.add(MODIFIER_CAMP[key]);
  }
  // A caster-gated focus affix (the spell-offense trio) is spell-coded even if a
  // future modifier slipped the table.
  if (affix.casterGearOnly) camps.add('spell');
  return camps;
}

export interface AffixRelevance {
  /** False when this affix does nothing for the viewing character — dim it. */
  relevant: boolean;
  /** Short inline tag for an off-archetype affix (e.g. "weapon only"), else null. */
  tag: string | null;
}

const RELEVANT: AffixRelevance = { relevant: true, tag: null };

/**
 * Whether an affix's effects can matter to THIS character, and a short tell when
 * they can't. An affix is off-archetype only when EVERY one of its modifiers is
 * in the camp this character doesn't use (all spell-only on a martial, or all
 * weapon-only on a caster). Any universal or in-camp modifier keeps it relevant
 * — be conservative: when in doubt, don't dim.
 *
 * Wording is honest about the soft edge: a caster CAN still swing a blade, so the
 * weapon tag says "your spells don't use this", not "zero effect".
 */
export function affixRelevanceFor(
  affix: Affix,
  character: Pick<Character, 'classId' | 'subclassId'> | null | undefined,
): AffixRelevance {
  if (!character) return RELEVANT;
  const camps = modifierCamps(affix);
  if (camps.size === 0) return RELEVANT;
  if (camps.has('universal')) return RELEVANT;
  const lean: CombatLean = combatLean(character);
  // camps is now purely {spell} | {weapon} | {spell,weapon}. Mixed = relevant
  // (it carries something for both); single-camp opposite to the lean = dim.
  if (camps.has('spell') && camps.has('weapon')) return RELEVANT;
  if (lean === 'caster' && camps.has('weapon')) {
    return { relevant: false, tag: t('screens.itemDisplay.relevance.weaponOnly') };
  }
  if (lean === 'martial' && camps.has('spell')) {
    return { relevant: false, tag: t('screens.itemDisplay.relevance.spellOnly') };
  }
  return RELEVANT;
}

/** As {@link affixRelevanceFor} but resolves the affix by id (display call sites hold ids). */
export function affixRelevanceById(
  affixId: string,
  character: Pick<Character, 'classId' | 'subclassId'> | null | undefined,
): AffixRelevance {
  try {
    return affixRelevanceFor(getAffix(affixId), character);
  } catch {
    return RELEVANT;
  }
}

/**
 * Relevance of the flat "+N" enhancement line (not an affix). A weapon's +N is
 * attack-and-damage on a hit → weapon-camp; armour's +N is AC → universal. Mirror
 * the affix rule so the enhancement line dims for a caster on a weapon too.
 */
export function enhancementRelevanceFor(
  itemKind: string,
  character: Pick<Character, 'classId' | 'subclassId'> | null | undefined,
): AffixRelevance {
  if (!character) return RELEVANT;
  if (itemKind !== 'weapon') return RELEVANT;
  if (combatLean(character) === 'caster') {
    return { relevant: false, tag: t('screens.itemDisplay.relevance.weaponOnly') };
  }
  return RELEVANT;
}
