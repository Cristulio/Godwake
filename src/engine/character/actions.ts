import type { Character } from '../../types/character';
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

/** MVP short rest: regain hit dice up to (1d4 * level) HP — simplified. */
export function shortRestHeal(character: Character, healAmount: number): Character {
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
    },
  };
}

/** Full long rest: full HP + full resources + conditions cleared. Used at hub between delves. */
export function longRest(character: Character): Character {
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
    },
  });
}
