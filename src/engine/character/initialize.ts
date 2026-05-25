import type { AbilityScores } from '../../types/abilities';
import type { Character } from '../../types/character';
import type { ClassId, RaceId } from '../../schemas/ids';
import type { SkillName } from '../../types/skills';
import { getRace } from '../../content/races';
import { getClass } from '../../content/classes';
import { effectiveAbilityScores } from './derived';
import { abilityModifier } from '../../types/abilities';

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8] as const;

export interface CreateCharacterInput {
  id: string;
  name: string;
  raceId: RaceId;
  classId: ClassId;
  /** The standard array assigned to the six abilities by the player. */
  baseAbilityScores: AbilityScores;
  /** Skills picked from the class's skillChoiceFrom list. */
  skillProficiencies: SkillName[];
  /** Subclass picked. Many classes choose at lv1 (cleric), some at lv3 (fighter). */
  subclassId?: string;
}

export function createCharacter(input: CreateCharacterInput): Character {
  const race = getRace(input.raceId);
  const cls = getClass(input.classId);

  if (!race.validClasses.includes(cls.id)) {
    throw new Error(`Race ${race.id} cannot be class ${cls.id}.`);
  }

  // Lv1 max HP = max hit die + CON mod (standard 5e rule for taking max at lv1)
  // Effective ability scores need race bonuses applied.
  const seedCharacter: Character = {
    id: input.id,
    name: input.name,
    raceId: input.raceId,
    classId: input.classId,
    subclassId: input.subclassId ?? null,
    baseAbilityScores: input.baseAbilityScores,
    level: 1,
    xp: 0,
    skillProficiencies: input.skillProficiencies,
    expertSkills: [],
    hp: { current: 1, max: 1, temp: 0 }, // will be set below
    hitDice: { current: 1, max: 1, die: cls.hitDie },
    conditions: [],
    inventory: [],
    equipped: { mainHand: null, offHand: null, armor: null },
    attunedItems: [],
    attunementSlotsMax: 3,
    resources: classStartingResources(input.classId),
    actionEconomy: {
      actionUsed: false,
      bonusActionUsed: false,
      reactionUsed: false,
      movementRemaining: race.speed,
    },
    quirks: [],
    blessings: [],
    goldInBank: 0,
    goldInPocket: 0,
    renown: 0,
  };

  const scores = effectiveAbilityScores(seedCharacter);
  const conMod = abilityModifier(scores.con);
  const maxHp = cls.hitDie + conMod;
  seedCharacter.hp = { current: maxHp, max: maxHp, temp: 0 };

  return seedCharacter;
}

function classStartingResources(classId: ClassId) {
  switch (classId) {
    case 'fighter':
      return {
        secondWindAvailable: true,
        actionSurgeRemaining: 0, // 1 at lv2, 2 at lv17
      };
    default:
      return {};
  }
}
