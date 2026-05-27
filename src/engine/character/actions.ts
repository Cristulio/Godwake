import type { Character, SpellSlots } from '../../types/character';
import { getRace } from '../../content/races';

/** Returns a character object with fresh action economy for a new turn. */
export function withResetActionEconomy(character: Character): Character {
  const race = getRace(character.raceId);
  return {
    ...character,
    actionEconomy: {
      actionUsed: false,
      bonusActionUsed: false,
      reactionUsed: false,
      movementRemaining: race.speed,
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

/** Rogue: Cunning Action uses per combat. Thief (L3+) gets a second use via Fast Hands. */
export function rogueCunningActionMax(character: Character): number {
  if (character.classId !== 'rogue') return 0;
  if (character.subclassId === 'thief' && character.level >= 3) return 2;
  return 1;
}

/**
 * Wizard slot table. Scaled-down 5e curve so the L1-5 ramp lands cleanly
 * inside Godwake's 8-level cap. Levels past 5 add slowly — full RAW gets
 * silly at this scope.
 *
 *   L1: 2/0/0    L2: 3/0/0    L3: 4/2/0    L4: 4/3/0    L5: 4/3/2
 *   L6: 4/3/3    L7: 4/3/3    L8: 4/3/3
 */
export function wizardSpellSlotsForLevel(level: number): SpellSlots {
  if (level >= 5) return { 1: 4, 2: 3, 3: level >= 6 ? 3 : 2, 4: 0 };
  if (level === 4) return { 1: 4, 2: 3, 3: 0, 4: 0 };
  if (level === 3) return { 1: 4, 2: 2, 3: 0, 4: 0 };
  if (level === 2) return { 1: 3, 2: 0, 3: 0, 4: 0 };
  return { 1: 2, 2: 0, 3: 0, 4: 0 };
}

/** MVP short rest: regain hit dice up to (1d4 * level) HP — simplified.
 *  Also refreshes class resources, INCLUDING wizard spell slots. The chained
 *  delve is too long for slots to refill only at the hub — wizards would be
 *  cantripping by room 4. Camp rests + rest rooms are the wizard's recovery.
 */
export function shortRestHeal(character: Character, healAmount: number): Character {
  const isWizard = character.classId === 'wizard';
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
      spellSlots: isWizard
        ? wizardSpellSlotsForLevel(character.level)
        : character.resources.spellSlots,
    },
  };
}

/** Full long rest: full HP + full resources + conditions cleared. Used at hub between delves. */
export function longRest(character: Character): Character {
  const isWizard = character.classId === 'wizard';
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
      spellSlots: isWizard
        ? wizardSpellSlotsForLevel(character.level)
        : character.resources.spellSlots,
      mageArmorActive: isWizard ? false : character.resources.mageArmorActive,
      shieldActive: isWizard ? false : character.resources.shieldActive,
      mistyStepActive: isWizard ? false : character.resources.mistyStepActive,
    },
  });
}
