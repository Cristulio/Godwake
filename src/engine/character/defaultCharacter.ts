import type { Character } from '../../types/character';
import type { AbilityScores } from '../../types/abilities';
import type { ClassId, RaceId } from '../../schemas/ids';
import type { SkillName } from '../../types/skills';
import type { ItemRef } from '../../schemas/item';
import type { EquipmentSlots } from '../../types/character';
import { createCharacter, STANDARD_ARRAY } from './initialize';

export interface CharacterCreationInput {
  name: string;
  raceId: RaceId;
  classId: ClassId;
  baseAbilityScores: AbilityScores;
  skillProficiencies: SkillName[];
}

interface StartingKit {
  inventory: ItemRef[];
  equipped: EquipmentSlots;
  goldInPocket: number;
}

function startingKitFor(classId: ClassId): StartingKit {
  switch (classId) {
    case 'fighter': {
      const longsword: ItemRef = { itemId: 'longsword' };
      const leatherArmor: ItemRef = { itemId: 'leather-armor' };
      const shield: ItemRef = { itemId: 'shield' };
      return {
        inventory: [
          longsword,
          leatherArmor,
          shield,
          { itemId: 'dagger' },
          { itemId: 'potion-of-healing' },
          { itemId: 'potion-of-healing' },
        ],
        equipped: {
          mainHand: longsword,
          offHand: shield,
          armor: leatherArmor,
        },
        goldInPocket: 25,
      };
    }
    case 'rogue': {
      const rapier: ItemRef = { itemId: 'rapier' };
      const leatherArmor: ItemRef = { itemId: 'leather-armor' };
      return {
        inventory: [
          rapier,
          { itemId: 'dagger' },
          { itemId: 'shortbow' },
          leatherArmor,
          { itemId: 'potion-of-healing' },
        ],
        equipped: {
          mainHand: rapier,
          offHand: null,
          armor: leatherArmor,
        },
        goldInPocket: 15,
      };
    }
    case 'wizard': {
      const dagger: ItemRef = { itemId: 'dagger' };
      return {
        inventory: [
          dagger,
          { itemId: 'potion-of-healing' },
        ],
        equipped: {
          mainHand: dagger,
          offHand: null,
          armor: null,
        },
        goldInPocket: 20,
      };
    }
    default:
      return {
        inventory: [],
        equipped: { mainHand: null, offHand: null, armor: null },
        goldInPocket: 10,
      };
  }
}

/**
 * Builds the character from the player's character-creation choices and
 * outfits them with their class's starting kit. New lives wear no quirks
 * until they fall — the soul earns no marks before its first death.
 */
export function buildPlayerCharacter(input: CharacterCreationInput): Character {
  const kit = startingKitFor(input.classId);
  return {
    ...createCharacter({
      id: 'player-1',
      name: input.name,
      raceId: input.raceId,
      classId: input.classId,
      baseAbilityScores: input.baseAbilityScores,
      skillProficiencies: input.skillProficiencies,
    }),
    inventory: kit.inventory,
    equipped: kit.equipped,
    goldInPocket: kit.goldInPocket,
    quirks: [],
  };
}

/** The Sir Brick preset — used as a "Recommended" quick-start in creation. */
export const SIR_BRICK_PRESET: CharacterCreationInput = {
  name: 'Sir Brick',
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
};
