import type { Character, SpellSlots } from '../../types/character';
import { characterHasMechanic, isFullCaster } from './derived';
import { characterAffixMods } from '../items/affixMods';

/** Returns a character object with fresh action economy for a new turn. */
export function withResetActionEconomy(character: Character): Character {
  return {
    ...character,
    actionEconomy: {
      actionUsed: false,
      bonusActionUsed: false,
      reactionUsed: false,
    },
  };
}

/** Action Surge charges available at a given Fighter level — 1 at L2, 2 at L17. */
function fighterActionSurgeMax(character: Character): number {
  if (character.classId !== 'fighter') return 0;
  if (character.level >= 17) return 2;
  if (character.level >= 2) return 1;
  return 0;
}

/** Rounds a Rage burst lasts once entered — a long window now that it's a rationed charge, not an always-on toggle. */
export const RAGE_ROUNDS = 5;

/**
 * Rounds the Rage holds for this barbarian. Relentless Rage (L11) deepens the
 * fury so it carries through longer fights.
 */
export function rageRoundsFor(character: Character): number {
  return RAGE_ROUNDS + (characterHasMechanic(character, 'relentless-rage') ? 2 : 0);
}

/**
 * Rage charges the barbarian holds before needing a rest. The fury is a
 * rationed resource: the pool widens as the soul deepens, and the L20 capstone
 * (Primal Champion) rages without limit. Charges refill ONLY at a rest (short
 * or long) — never per fight — so each rage spent is a real choice that has to
 * carry across the rooms until the next camp.
 *
 *   L1-4: 3 · L5-10: 4 · L11-16: 5 · L17-19: 6 · L20: unlimited
 *
 * L20 returns +Infinity; pair every read with {@link isRageUnlimited} so a
 * persisted-then-rehydrated Infinity (JSON renders it null) still rages freely.
 */
export function rageChargesMax(character: Character): number {
  if (character.classId !== 'barbarian') return 0;
  const level = character.level;
  if (level >= 20) return Number.POSITIVE_INFINITY;
  if (level >= 17) return 6;
  if (level >= 11) return 5;
  if (level >= 5) return 4;
  return 3;
}

/** Whether this barbarian's Rage is bottomless (L20 capstone — entering never spends a charge). */
export function isRageUnlimited(character: Character): boolean {
  return character.classId === 'barbarian' && character.level >= 20;
}

/**
 * Flat bonus damage on a melee hit while raging. Berserker's Frenzy, plus the
 * high-level Rage milestones (Persistent Rage L15, Primal Champion L20), each
 * deepen the cut — a raging capstone barbarian hits substantially harder.
 */
export function rageDamageBonus(character: Character): number {
  if (character.classId !== 'barbarian') return 0;
  const frenzy = characterHasMechanic(character, 'frenzy') ? 2 : 0;
  const persistent = characterHasMechanic(character, 'persistent-rage') ? 2 : 0;
  const primal = characterHasMechanic(character, 'primal-champion') ? 3 : 0;
  return 2 + frenzy + persistent + primal;
}

/** Rogue: Cunning Action uses per combat. Thief (L3+) gets a second use via Fast Hands; Cunning Mastery (L11) adds another. */
export function rogueCunningActionMax(character: Character): number {
  if (character.classId !== 'rogue') return 0;
  const base = character.subclassId === 'thief' && character.level >= 3 ? 2 : 1;
  const mastery = characterHasMechanic(character, 'cunning-mastery') ? 1 : 0;
  // Thief Deft Hands (L11): one more Cunning Action each combat.
  const deftHands = characterHasMechanic(character, 'deft-hands') ? 1 : 0;
  return base + mastery + deftHands + (character.permanentBonuses?.cunningAction ?? 0);
}

/**
 * Wizard slot table — the full-caster curve across the L1→20 climb. The L1-6
 * band is unchanged from the old cap-8 table (it already matched the standard
 * full-caster progression); from L7 the higher tiers open as the soul deepens,
 * carrying the wizard to 9th-level workings at L17. Each row is the refilled
 * pool at that level; missing tiers read as 0.
 *
 *   L1  2                     L11 4/3/3/3/2/1
 *   L2  3                     L12 4/3/3/3/2/1
 *   L3  4/2                   L13 4/3/3/3/2/1/1
 *   L4  4/3                   L14 4/3/3/3/2/1/1
 *   L5  4/3/2                 L15 4/3/3/3/2/1/1/1
 *   L6  4/3/3                 L16 4/3/3/3/2/1/1/1
 *   L7  4/3/3/1               L17 4/3/3/3/2/1/1/1/1
 *   L8  4/3/3/2               L18 4/3/3/3/3/1/1/1/1
 *   L9  4/3/3/3/1             L19 4/3/3/3/3/2/1/1/1
 *   L10 4/3/3/3/2             L20 4/3/3/3/3/2/2/1/1
 */
const WIZARD_SLOT_TABLE: Record<number, SpellSlots> = {
  1: { 1: 2 },
  2: { 1: 3 },
  3: { 1: 4, 2: 2 },
  4: { 1: 4, 2: 3 },
  5: { 1: 4, 2: 3, 3: 2 },
  6: { 1: 4, 2: 3, 3: 3 },
  7: { 1: 4, 2: 3, 3: 3, 4: 1 },
  8: { 1: 4, 2: 3, 3: 3, 4: 2 },
  9: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
  10: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
  11: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
  12: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
  13: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
  14: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
  15: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
  16: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
  17: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 },
  18: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 1, 8: 1, 9: 1 },
  19: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 1, 8: 1, 9: 1 },
  20: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 },
};

export function wizardSpellSlotsForLevel(level: number): SpellSlots {
  const clamped = Math.max(1, Math.min(20, Math.floor(level)));
  return { ...WIZARD_SLOT_TABLE[clamped] };
}

/**
 * The wizard's refilled slot pool, including any extra level-1 slots granted by
 * equipped gear ("Runic" caster affix). Used everywhere the well refills — rest,
 * long rest, level-up — so the bonus slot is felt on the next encounter. (Gear
 * equipped mid-delve only adds the slot at the next refill, which is fine: the
 * natural flow is equip-then-rest.)
 */
export function wizardSpellSlots(character: Readonly<Character>): SpellSlots {
  const slots = wizardSpellSlotsForLevel(character.level);
  // Gear "Runic" affix + the Grove caster slot upgrade (Wellspring of Mysteries /
  // Deep Roots) both widen the 1st-level well; they stack.
  const bonusL1 =
    characterAffixMods(character).bonusSpellSlotsL1 +
    (character.permanentBonuses?.bonusSpellSlotsL1 ?? 0);
  if (bonusL1 > 0) slots[1] = (slots[1] ?? 0) + bonusL1;
  return slots;
}

/** MVP short rest: regain hit dice up to (1d4 * level) HP — simplified.
 *  Also refreshes class resources, INCLUDING wizard spell slots. The chained
 *  delve is too long for slots to refill only at the hub — wizards would be
 *  cantripping by room 4. Camp rests + rest rooms are the wizard's recovery.
 */
export function shortRestHeal(character: Character, healAmount: number): Character {
  const isCaster = isFullCaster(character.classId);
  const newHp = Math.min(character.hp.max, character.hp.current + healAmount);
  return {
    ...character,
    hp: { ...character.hp, current: newHp },
    resources: {
      ...character.resources,
      secondWindAvailable: true,
      actionSurgeRemaining: fighterActionSurgeMax(character),
      sneakAttackUsedThisTurn: false,
      cunningActionUsesRemaining:
        character.classId === 'rogue'
          ? rogueCunningActionMax(character)
          : character.resources.cunningActionUsesRemaining,
      rageRoundsRemaining: 0,
      rageChargesRemaining:
        character.classId === 'barbarian'
          ? rageChargesMax(character)
          : character.resources.rageChargesRemaining,
      kiPointsRemaining:
        character.classId === 'monk'
          ? character.level + (character.level >= 20 ? 2 : 0)
          : character.resources.kiPointsRemaining,
      spellSlots: isCaster
        ? wizardSpellSlots(character)
        : character.resources.spellSlots,
    },
  };
}

/** Full long rest: full HP + full resources + conditions cleared. Used at hub between delves. */
export function longRest(character: Character): Character {
  const isWizard = character.classId === 'wizard';
  const isCaster = isFullCaster(character.classId);
  return withResetActionEconomy({
    ...character,
    hp: { ...character.hp, current: character.hp.max, temp: 0 },
    hitDice: { ...character.hitDice, current: character.hitDice.max },
    conditions: [],
    nextAttackAdvantage: false,
    resources: {
      ...character.resources,
      secondWindAvailable: true,
      actionSurgeRemaining: fighterActionSurgeMax(character),
      sneakAttackUsedThisTurn: false,
      cunningActionUsesRemaining:
        character.classId === 'rogue'
          ? rogueCunningActionMax(character)
          : character.resources.cunningActionUsesRemaining,
      rageRoundsRemaining: 0,
      rageChargesRemaining:
        character.classId === 'barbarian'
          ? rageChargesMax(character)
          : character.resources.rageChargesRemaining,
      kiPointsRemaining:
        character.classId === 'monk'
          ? character.level + (character.level >= 20 ? 2 : 0)
          : character.resources.kiPointsRemaining,
      spellSlots: isCaster
        ? wizardSpellSlots(character)
        : character.resources.spellSlots,
      mageArmorActive: isWizard ? false : character.resources.mageArmorActive,
      shieldActive: isWizard ? false : character.resources.shieldActive,
      mistyStepActive: isWizard ? false : character.resources.mistyStepActive,
    },
  });
}
