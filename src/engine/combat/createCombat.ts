import type { DiceRoller } from '../dice';
import type { Character } from '../../types/character';
import type {
  Combatant,
  CombatState,
  MonsterInstance,
  PlayerCombatant,
  MonsterCombatant,
} from '../../types/combat';
import type { Monster } from '../../schemas/monster';
import { characterBlessingMods } from '../character/blessings';
import { characterCampBoonMods } from '../character/campBoons';
import { rogueCunningActionMax } from '../character/actions';
import {
  combatResult,
  patchHp,
  patchResources,
  type CombatActionResult,
} from './types';
import { isPlayerParalyzed } from './holdPerson';
import { resolvePlayerParalyzedTurn } from './turn';

/**
 * Max entries retained in CombatState.log. The renderer (CombatLog.tsx) tails
 * the last 80 for display; this cap protects engine memory and the persisted
 * save blob during long fights where hundreds of entries could accumulate.
 */
export const MAX_COMBAT_LOG = 200;

let monsterInstanceCounter = 0;

function nextMonsterInstanceId(defId: string): string {
  monsterInstanceCounter += 1;
  return `${defId}-${monsterInstanceCounter}`;
}

/** Reset the instance id counter. Useful for tests. */
export function _resetMonsterInstanceCounter(): void {
  monsterInstanceCounter = 0;
}

export function spawnMonsterInstance(def: Monster, displayName?: string): MonsterInstance {
  return {
    id: nextMonsterInstanceId(def.id),
    defId: def.id,
    displayName: displayName ?? def.name,
    hp: { current: def.maxHp, max: def.maxHp, temp: 0 },
    ac: def.ac,
    acRevealed: false,
    conditions: [],
    actionEconomy: {
      actionUsed: false,
      bonusActionUsed: false,
      reactionUsed: false,
      movementRemaining: def.speed,
    },
  };
}

export interface CreateCombatInput {
  /**
   * Roller is unused by turn ordering (player always goes first), but kept on
   * the input so callers can pass a deterministic roller through to downstream
   * combat actions started in this same flow (rare; mostly tests).
   */
  roller?: DiceRoller;
  character: Character;
  monsters: Array<{ def: Monster; displayName?: string }>;
}

/**
 * Initialize a combat encounter: spawn monster instances, set the turn order
 * (player first, then monsters in spawn order — no initiative rolls), log
 * the opening line. Also applies per-class start-of-combat patches to the
 * character (Rogue refreshes Cunning Action; Wizard activates passive Mage
 * Armor; Lathander's Dawn grants temp HP). Returns BOTH the combat state
 * and the patched character.
 *
 * Callers (production + tests) consume `{ state, character }` — internals are
 * fully pure, so the input `character` is untouched.
 */
export function createCombat(input: CreateCombatInput): CombatActionResult {
  const { monsters } = input;
  let nextCharacter: Character = input.character;

  // Clear one-shot save advantage from any prior fight. nextAttackAdvantage
  // is cleared per-class below (only Rogue can leave one armed); save-advantage
  // can come from both Rogue (Steel Yourself) and Wizard (Misty Step), so wipe
  // it here for everyone.
  if (nextCharacter.nextSaveAdvantage) {
    nextCharacter = { ...nextCharacter, nextSaveAdvantage: false };
  }

  const monsterCombatants: MonsterCombatant[] = monsters.map(({ def, displayName }) => {
    const instance = spawnMonsterInstance(def, displayName);
    return {
      kind: 'monster' as const,
      id: instance.id,
      instance,
    };
  });

  const playerCombatant: PlayerCombatant = {
    kind: 'player',
    id: 'player',
    characterId: nextCharacter.id,
  };

  const combatants: Combatant[] = [playerCombatant, ...monsterCombatants];

  // Deterministic turn order: player first, then monsters in spawn order.
  // Initiative was removed — sims (PR #105) showed it was a noise-level lever
  // and the per-combat "who rolled higher" coin-flip just hid the decisions
  // the player was actually making. Future "extra turn" mechanics (time-stop)
  // hook into endTurn(), not this list.
  const turnOrder = combatants.map((c) => c.id);

  const log = [
    {
      id: 1,
      kind: 'system' as const,
      text: 'Combat begins.',
    },
  ];

  // Rogue: refresh per-combat resources. Stale Hide from before combat is
  // dropped; Cunning Action pool refills.
  if (nextCharacter.classId === 'rogue') {
    nextCharacter = {
      ...nextCharacter,
      nextAttackAdvantage: false,
      bonusAttackAvailable: false,
    };
    nextCharacter = patchResources(nextCharacter, {
      sneakAttackUsedThisTurn: false,
      cunningActionUsesRemaining: rogueCunningActionMax(nextCharacter),
    });
  }

  // Fighter: Second Wind refreshes at the start of every combat encounter.
  // RAW it's once per short rest, but sim showed the Fighter dying at boss
  // rooms (Magistrate, Director) with one stale Second Wind that couldn't
  // close the gap on attrition fights. Per-encounter refresh mirrors the
  // Rogue's Cunning Action cadence and gives the Fighter a real clutch heal
  // in every fight. Action Surge stays on short-rest (still a "burst" button).
  if (nextCharacter.classId === 'fighter') {
    nextCharacter = patchResources(nextCharacter, {
      secondWindAvailable: true,
    });
  }

  // Wizards walk into every fight already wrapped in Mage Armor (passive class
  // baseline — no slot cost, no action cost). Shield is per-combat reaction-
  // only, so clear stale state.
  if (nextCharacter.classId === 'wizard') {
    nextCharacter = patchResources(nextCharacter, {
      mageArmorActive: true,
      shieldActive: false,
      mistyStepActive: false,
      blurRoundsRemaining: 0,
      mirrorImages: 0,
    });
  }

  // Lathander's Dawn (and any future per-room temp-HP blessing): grant temp HP
  // at the start of combat. Temp HP doesn't stack — take the higher of current
  // and granted, RAW.
  const blessingMods = characterBlessingMods(nextCharacter);
  const tempHpGrant = blessingMods.extraTempHpPerRoom ?? 0;
  if (tempHpGrant > 0) {
    const newTemp = Math.max(nextCharacter.hp.temp, tempHpGrant);
    nextCharacter = patchHp(nextCharacter, { temp: newTemp });
    log.push({
      id: log.length + 1,
      kind: 'system' as const,
      text: `${nextCharacter.name} gains ${tempHpGrant} temporary HP from a blessing.`,
    });
  }

  const boonMods = characterCampBoonMods(nextCharacter);
  let state: CombatState = {
    combatants,
    turnOrder,
    currentTurnIndex: 0,
    round: 1,
    log,
    status: 'active',
    attackEventCounter: 0,
    playerHasAttacked: false,
    rerollMissesEncounterRemaining: blessingMods.rerollMissesPerEncounter ?? 0,
    playerAttacksThisTurn: 0,
    bladeOfVowRerollsRemaining: boonMods.weaponDamageRerollPerCombat ?? 0,
  };

  // Player goes first. If they walk in already paralyzed (Magistrate held
  // them through the prior encounter's tail), resolve the save up-front —
  // endTurn would otherwise never see turn 0 and the player would get a
  // free action while held. Same resolver the round-trip path uses.
  if (isPlayerParalyzed(nextCharacter)) {
    const resolved = resolvePlayerParalyzedTurn(state, nextCharacter);
    state = resolved.state;
    nextCharacter = resolved.character;
  }

  return combatResult(state, nextCharacter);
}
