import type { Character } from '../../types/character';
import type { AbilityScores } from '../../types/abilities';
import type { ClassId, RaceId } from '../../schemas/ids';
import type { ItemRef } from '../../schemas/item';
import type { EquipmentSlots } from '../../types/character';
import { getClass } from '../../content/classes';
import { createCharacter, STANDARD_ARRAY } from './initialize';
import { getLocalized } from '../../i18n';

export interface CharacterCreationInput {
  name: string;
  raceId: RaceId;
  classId: ClassId;
  baseAbilityScores: AbilityScores;
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
        // The glass-cannon caster opens with a deep cushion — three draughts.
        inventory: [
          dagger,
          { itemId: 'potion-of-healing' },
          { itemId: 'potion-of-healing' },
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
    case 'barbarian': {
      // No armor — Unarmored Defense does the work.
      const greataxe: ItemRef = { itemId: 'greataxe' };
      return {
        inventory: [
          greataxe,
          { itemId: 'potion-of-healing' },
          { itemId: 'potion-of-healing' },
        ],
        equipped: {
          mainHand: greataxe,
          offHand: null,
          armor: null,
        },
        goldInPocket: 20,
      };
    }
    case 'druid': {
      // A sickle for when something gets close before a spell can answer, and
      // hide leather to keep a little skin on. Produce Flame opens at range;
      // Wild Shape is the real melee answer. Three potions — the squishy caster
      // wants a deep cushion.
      const sickle: ItemRef = { itemId: 'sickle' };
      const leatherArmor: ItemRef = { itemId: 'leather-armor' };
      return {
        inventory: [
          sickle,
          leatherArmor,
          { itemId: 'potion-of-healing' },
          { itemId: 'potion-of-healing' },
          { itemId: 'potion-of-healing' },
        ],
        equipped: {
          mainHand: sickle,
          offHand: null,
          armor: leatherArmor,
        },
        goldInPocket: 20,
      };
    }
    case 'monk': {
      // No armour — Unarmored Defense (DEX + WIS) does the work, and steel would
      // only cost the stance. The fists are the weapon; the shortsword is the one
      // martial arm the schools permit, kept for reach. Two potions for the
      // squishy striker's cushion.
      const fists: ItemRef = { itemId: 'monk-fists' };
      return {
        inventory: [
          fists,
          { itemId: 'shortsword' },
          { itemId: 'potion-of-healing' },
          { itemId: 'potion-of-healing' },
        ],
        equipped: {
          mainHand: fists,
          offHand: null,
          armor: null,
        },
        goldInPocket: 15,
      };
    }
    case 'ranger': {
      // Longbow opens the room; the shortsword is for when something closes.
      // Light armor keeps the archer mobile. (Ammunition isn't tracked — the
      // bow is self-supplied, same as the rogue's shortbow.)
      const longbow: ItemRef = { itemId: 'longbow' };
      const leatherArmor: ItemRef = { itemId: 'leather-armor' };
      return {
        inventory: [
          longbow,
          { itemId: 'shortsword' },
          leatherArmor,
          { itemId: 'potion-of-healing' },
          { itemId: 'potion-of-healing' },
        ],
        equipped: {
          mainHand: longbow,
          offHand: null,
          armor: leatherArmor,
        },
        goldInPocket: 15,
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
    }),
    inventory: kit.inventory,
    equipped: kit.equipped,
    goldInPocket: kit.goldInPocket,
    quirks: [],
  };
}

/**
 * The fixed, pre-made character for a class. Selection model (Slay-the-Spire
 * "pick a character"): name, race, and ability block come straight from the
 * class preset — no point-buy, no assignment. Picking a class IS choosing this
 * character.
 */
export function presetCreationInput(classId: ClassId): CharacterCreationInput {
  const preset = getClass(classId).preset;
  if (!preset) {
    throw new Error(`Class ${classId} has no character preset to select.`);
  }
  return {
    // Bake the locale-correct hero name (es players get e.g. "Sir Ladrillo").
    // No-op in English / under sims, where it falls back to the preset name.
    name: getLocalized('classes', classId, 'characterName', preset.characterName),
    raceId: preset.recommendedRaceId,
    classId,
    baseAbilityScores: { ...preset.abilityScores },
  };
}

/**
 * Overlay the soul/account-level progress that survives a hub character swap
 * onto a freshly-built vessel. Renown is the only persistent currency; the
 * rest are Druid Grove permanent-upgrade payloads baked onto the character at
 * purchase. Quirks are soul marks and ride along — a swap is not a death, so
 * they are not rerolled. The Grove ledger + renown gates live in metaStore and
 * are untouched; only these baked character fields move to the new body. HP is
 * recomputed to the fresh L1 ceiling plus the permanent HP bonus so the hub
 * reads the same number `startDelve` will rebuild on descent.
 */
export function carrySoulProgress(fresh: Character, soul: Character): Character {
  const permanentHp = soul.permanentBonuses?.hp ?? 0;
  const max = fresh.hp.max + permanentHp;
  return {
    ...fresh,
    renown: soul.renown,
    quirks: soul.quirks,
    permanentBonuses: soul.permanentBonuses,
    legendaryEffects: soul.legendaryEffects,
    permanentFirstAttackDamage: soul.permanentFirstAttackDamage,
    permanentWoundedTargetDamage: soul.permanentWoundedTargetDamage,
    permanentCritDamageBonus: soul.permanentCritDamageBonus,
    permanentRenownBonusPerBane: soul.permanentRenownBonusPerBane,
    wheelturnerUnlocked: soul.wheelturnerUnlocked,
    hp: { current: max, max, temp: 0 },
  };
}

/** The Sir Brick preset — kept for the archived v1 creation flow. */
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
};
