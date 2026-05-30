import type { AbilityName, AbilityScores } from '../../types/abilities';
import type { Character } from '../../types/character';
import type { ClassId, RaceId } from '../../schemas/ids';
import type { SkillName } from '../../types/skills';
import type { Class } from '../../schemas/class';
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

  // Half-Elf 5e gets a free +1/+1 picker. Until char-creation has a UI step
  // for it, route the bonuses to the class's primary ability + a secondary
  // (DEX for martials, CON for casters) so wizard half-elves don't ship
  // with a -1 INT vs other race picks.
  const baseAbilityScores: AbilityScores =
    input.raceId === 'half-elf'
      ? applyHalfElfAutoRoute(input.baseAbilityScores, cls)
      : input.baseAbilityScores;

  // Lv1 max HP = max hit die + CON mod (standard 5e rule for taking max at lv1)
  // Effective ability scores need race bonuses applied.
  const seedCharacter: Character = {
    id: input.id,
    name: input.name,
    raceId: input.raceId,
    classId: input.classId,
    subclassId: input.subclassId ?? null,
    baseAbilityScores,
    level: 1,
    xp: 0,
    skillProficiencies: input.skillProficiencies,
    expertSkills: [],
    hp: { current: 1, max: 1, temp: 0 }, // will be set below
    hitDice: { current: 1, max: 1, die: cls.hitDie },
    conditions: [],
    inventory: [],
    equipped: { mainHand: null, offHand: null, armor: null },
    resources: classStartingResources(input.classId),
    actionEconomy: {
      actionUsed: false,
      bonusActionUsed: false,
      reactionUsed: false,
      movementRemaining: race.speed,
    },
    quirks: [],
    blessings: [],
    goldInPocket: 0,
    renown: 0,
  };

  const scores = effectiveAbilityScores(seedCharacter);
  const conMod = abilityModifier(scores.con);
  const bonusHp = race.bonusHpPerLevel ?? 0;
  // Wizards get +1 HP/level baseline so a d6 hit die survives an opening
  // 3-mob room without burning a slot on Mage Armor first.
  const classBonusHp = input.classId === 'wizard' ? 1 : 0;
  const maxHp = cls.hitDie + conMod + bonusHp + classBonusHp;
  seedCharacter.hp = { current: maxHp, max: maxHp, temp: 0 };

  return seedCharacter;
}

/**
 * Half-Elf's 5e "+1 to two other abilities" picker, auto-resolved by class.
 * Primary ability gets +1; the secondary is DEX for martial classes and CON
 * for casters. If the primary already is DEX (rogue) or CON, the secondary
 * falls through to the other so the +1 always lands somewhere useful.
 */
function applyHalfElfAutoRoute(
  base: AbilityScores,
  cls: Class,
): AbilityScores {
  const primary: AbilityName = (cls.primaryAbility[0] ?? 'str') as AbilityName;
  const isCaster = primary === 'int' || primary === 'wis' || primary === 'cha';
  let secondary: AbilityName = isCaster ? 'con' : 'dex';
  if (secondary === primary) secondary = primary === 'dex' ? 'con' : 'dex';
  return {
    ...base,
    [primary]: base[primary] + 1,
    [secondary]: base[secondary] + 1,
  };
}

export function classStartingResources(classId: ClassId) {
  switch (classId) {
    case 'fighter':
      return {
        secondWindAvailable: true,
        actionSurgeRemaining: 0, // 1 at lv2, 2 at lv17
      };
    case 'rogue':
      return {
        sneakAttackUsedThisTurn: false,
        cunningActionUsesRemaining: 1, // 2 once Thief subclass is picked at L3
      };
    case 'barbarian':
      return {
        rageRoundsRemaining: 0,
        rageUsesRemaining: 2,
      };
    case 'wizard':
      return {
        spellSlots: { 1: 2, 2: 0, 3: 0, 4: 0 },
        knownSpells: [
          'fire-bolt',
          'magic-missile',
          'shield',
          'burning-hands',
          // Hold Person is in the wizard's book from L1 but uncastable until a
          // 2nd-level slot arrives at L3 — canCastSpell gates on slot, not on
          // a separate "prepared at level X" flag.
          'hold-person',
        ],
        // Mage Armor is a passive class baseline — auto-applied at combat
        // start by createCombat. Not in knownSpells (no manual cast).
        mageArmorActive: false,
        shieldActive: false,
        mistyStepActive: false,
      };
    default:
      return {};
  }
}
