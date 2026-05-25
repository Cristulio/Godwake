import type { Character } from '../../types/character';
import { createCharacter, STANDARD_ARRAY } from './initialize';

/**
 * MVP placeholder: builds a default Fighter (Champion) so the player can
 * start a delve without going through character creation yet. Once the
 * character creation screen is built, this becomes a quick-start template
 * rather than the only path.
 */
export function buildDefaultFighter(name: string = 'Sir Brick'): Character {
  return {
    ...createCharacter({
      id: 'player-1',
      name,
      raceId: 'human',
      classId: 'fighter',
      baseAbilityScores: {
        str: STANDARD_ARRAY[0], // 15
        con: STANDARD_ARRAY[1], // 14
        dex: STANDARD_ARRAY[2], // 13
        wis: STANDARD_ARRAY[3], // 12
        cha: STANDARD_ARRAY[4], // 10
        int: STANDARD_ARRAY[5], // 8
      },
      skillProficiencies: ['athletics', 'perception'],
    }),
    inventory: [
      { itemId: 'longsword' },
      { itemId: 'leather-armor' },
      { itemId: 'shield' },
      { itemId: 'dagger' },
    ],
    equipped: {
      mainHand: { itemId: 'longsword' },
      offHand: { itemId: 'shield' },
      armor: { itemId: 'leather-armor' },
    },
    goldInPocket: 25,
  };
}
