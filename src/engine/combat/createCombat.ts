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
import { abilityModifier } from '../../types/abilities';
import { initiativeModifier } from '../character/derived';
import { characterBlessingMods } from '../character/blessings';
import { getMonster } from '../../content/monsters';

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
  roller: DiceRoller;
  character: Character;
  monsters: Array<{ def: Monster; displayName?: string }>;
}

/**
 * Initialize a combat encounter: spawn monster instances, roll initiative
 * for everyone, set the turn order, log the opening line.
 */
export function createCombat(input: CreateCombatInput): CombatState {
  const { roller, character, monsters } = input;

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
    characterId: character.id,
  };

  const combatants: Combatant[] = [playerCombatant, ...monsterCombatants];

  // Roll initiative for each combatant.
  const initiativeRolls: Array<{ id: string; total: number; tiebreaker: number }> = [];
  for (const combatant of combatants) {
    if (combatant.kind === 'player') {
      const mod = initiativeModifier(character);
      const roll = roller.d20('normal', mod);
      initiativeRolls.push({
        id: combatant.id,
        total: roll.total,
        tiebreaker: mod,
      });
    } else {
      const monsterDef = monsterDefForCombatant(combatant);
      const dexMod = abilityModifier(monsterDef.abilityScores.dex ?? 10);
      const roll = roller.d20('normal', dexMod);
      initiativeRolls.push({
        id: combatant.id,
        total: roll.total,
        tiebreaker: dexMod,
      });
    }
  }

  // Sort descending by total, ties broken by DEX modifier, then by ID for stability.
  initiativeRolls.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    if (b.tiebreaker !== a.tiebreaker) return b.tiebreaker - a.tiebreaker;
    return a.id.localeCompare(b.id);
  });

  const initiativeOrder = initiativeRolls.map((r) => r.id);

  const log = [
    {
      id: 1,
      kind: 'system' as const,
      text: `Combat begins. Initiative: ${initiativeRolls
        .map((r) => `${nameFor(r.id, combatants, character)} (${r.total})`)
        .join(', ')}.`,
    },
  ];

  // Lathander's Dawn (and any future per-room temp-HP blessing): grant temp HP
  // at the start of combat. Temp HP doesn't stack — take the higher of current
  // and granted, RAW.
  const blessingMods = characterBlessingMods(character);
  const tempHpGrant = blessingMods.extraTempHpPerRoom ?? 0;
  if (tempHpGrant > 0) {
    const newTemp = Math.max(character.hp.temp, tempHpGrant);
    character.hp = { ...character.hp, temp: newTemp };
    log.push({
      id: log.length + 1,
      kind: 'system' as const,
      text: `${character.name} gains ${tempHpGrant} temporary HP from a blessing.`,
    });
  }

  return {
    combatants,
    initiativeOrder,
    currentTurnIndex: 0,
    round: 1,
    log,
    status: 'active',
    attackEventCounter: 0,
    playerHasAttacked: false,
    rerollMissesEncounterRemaining: blessingMods.rerollMissesPerEncounter ?? 0,
    playerAttacksThisTurn: 0,
  };
}

function monsterDefForCombatant(combatant: MonsterCombatant): Monster {
  return getMonster(combatant.instance.defId);
}

function nameFor(combatantId: string, combatants: Combatant[], character: Character): string {
  const c = combatants.find((x) => x.id === combatantId);
  if (!c) return combatantId;
  if (c.kind === 'player') return character.name;
  return c.instance.displayName;
}
