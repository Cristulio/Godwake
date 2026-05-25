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

/** MVP short rest: regain hit dice up to (1d4 * level) HP — simplified. */
export function shortRestHeal(character: Character, healAmount: number): Character {
  const newHp = Math.min(character.hp.max, character.hp.current + healAmount);
  return {
    ...character,
    hp: { ...character.hp, current: newHp },
    resources: {
      ...character.resources,
      secondWindAvailable: true,
    },
  };
}

/** Full long rest: full HP + full resources. Used at hub between delves. */
export function longRest(character: Character): Character {
  return withResetActionEconomy({
    ...character,
    hp: { ...character.hp, current: character.hp.max, temp: 0 },
    hitDice: { ...character.hitDice, current: character.hitDice.max },
    resources: {
      ...character.resources,
      secondWindAvailable: true,
    },
  });
}
