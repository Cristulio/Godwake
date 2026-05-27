import type { Character } from '../../types/character';
import type { CombatState } from '../../types/combat';
import { getMonster } from '../../content/monsters';
import { getRace } from '../../content/races';
import { getActiveRoller } from '../dice';
import { combatResult, type CombatActionResult } from './types';
import {
  decrementParalyzeDuration,
  getPlayerParalyzed,
  isPlayerParalyzed,
  lockOutActionEconomy,
  removeParalyze,
  rollPlayerSave,
} from './holdPerson';

function resetActionEconomyForCurrent(state: CombatState, character: Character): CombatState {
  const currentId = state.initiativeOrder[state.currentTurnIndex];
  if (currentId === 'player') {
    character.actionEconomy = {
      actionUsed: false,
      bonusActionUsed: false,
      reactionUsed: false,
      movementRemaining: getRace(character.raceId).speed,
    };
    return state;
  }
  return {
    ...state,
    combatants: state.combatants.map((c) => {
      if (c.id !== currentId || c.kind !== 'monster') return c;
      const def = getMonster(c.instance.defId);
      return {
        ...c,
        instance: {
          ...c.instance,
          actionEconomy: {
            actionUsed: false,
            bonusActionUsed: false,
            reactionUsed: false,
            movementRemaining: def.speed,
          },
        },
      };
    }),
  };
}

/**
 * Advance to the next combatant in the initiative order. Skip dead combatants.
 * Increment round when wrapping. Reset action economy for the new turn-holder.
 */
export function endTurn(state: CombatState, character: Character): CombatActionResult {
  if (state.status !== 'active') return combatResult(state, character);

  let nextIndex = state.currentTurnIndex;
  let round = state.round;
  const order = state.initiativeOrder;

  for (let i = 0; i < order.length; i++) {
    nextIndex = (nextIndex + 1) % order.length;
    if (nextIndex === 0) round += 1;

    const id = order[nextIndex];
    if (id === 'player') {
      if (character.hp.current > 0) break;
    } else {
      const combatant = state.combatants.find((c) => c.id === id);
      if (combatant?.kind === 'monster' && combatant.instance.hp.current > 0) break;
    }
  }

  let nextState: CombatState = {
    ...state,
    currentTurnIndex: nextIndex,
    round,
    playerAttacksThisTurn: 0,
    sneakAttackUsedThisTurn: false,
    log: [
      ...state.log,
      {
        id: state.log.length + 1,
        kind: 'system',
        text:
          order[nextIndex] === 'player'
            ? `— Your turn (round ${round}). —`
            : `— ${combatantDisplayName(state, order[nextIndex])}'s turn (round ${round}). —`,
      },
    ],
  };

  nextState = resetActionEconomyForCurrent(nextState, character);

  // Wizard: Shield expires at the start of the player's next turn.
  if (order[nextIndex] === 'player' && character.resources.shieldActive) {
    character.resources = { ...character.resources, shieldActive: false };
  }

  if (order[nextIndex] === 'player' && isPlayerParalyzed(character)) {
    nextState = resolvePlayerParalyzedTurn(nextState, character);
  }

  return combatResult(nextState, character);
}

/**
 * Player wakes a turn already paralyzed: roll a save against the active
 * condition's DC at turn start. Success removes the condition; the player
 * gets a normal turn. Failure ticks the duration; if it hits zero the
 * condition expires anyway, otherwise the player loses the turn.
 */
function resolvePlayerParalyzedTurn(state: CombatState, character: Character): CombatState {
  const cond = getPlayerParalyzed(character);
  if (!cond || !cond.saveDC || !cond.saveAbility) return state;
  const roller = getActiveRoller();
  const save = rollPlayerSave(roller, character, cond.saveAbility, cond.saveDC);
  const logEntries = [];

  logEntries.push({
    id: state.log.length + 1,
    kind: 'roll' as const,
    text: `${character.name} struggles against paralysis. ${cond.saveAbility.toUpperCase()} save: d20${save.mod >= 0 ? '+' : ''}${save.mod} = ${save.total} vs DC ${cond.saveDC} — ${save.success ? 'success' : 'fail'}.`,
  });

  if (save.success) {
    removeParalyze(character);
    logEntries.push({
      id: state.log.length + 2,
      kind: 'system' as const,
      text: `${character.name} breaks free. The Magistrate's hold falls away.`,
    });
    return { ...state, log: [...state.log, ...logEntries] };
  }

  const expired = decrementParalyzeDuration(character);
  if (expired) {
    logEntries.push({
      id: state.log.length + 2,
      kind: 'system' as const,
      text: `The binding wears thin and snaps. ${character.name} can move again.`,
    });
    return { ...state, log: [...state.log, ...logEntries] };
  }

  lockOutActionEconomy(character);
  logEntries.push({
    id: state.log.length + 2,
    kind: 'system' as const,
    text: `${character.name} cannot move. The turn is lost.`,
  });
  return { ...state, log: [...state.log, ...logEntries] };
}

function combatantDisplayName(state: CombatState, id: string): string {
  const c = state.combatants.find((x) => x.id === id);
  if (!c) return id;
  if (c.kind === 'player') return 'Player';
  return c.instance.displayName;
}

export function currentCombatantId(state: CombatState): string {
  return state.initiativeOrder[state.currentTurnIndex];
}

export function isPlayerTurn(state: CombatState): boolean {
  return currentCombatantId(state) === 'player';
}
