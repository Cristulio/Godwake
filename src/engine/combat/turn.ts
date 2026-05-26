import type { Character } from '../../types/character';
import type { CombatState } from '../../types/combat';
import { getMonster } from '../../content/monsters';

function resetActionEconomyForCurrent(state: CombatState, character: Character): CombatState {
  const currentId = state.initiativeOrder[state.currentTurnIndex];
  if (currentId === 'player') {
    character.actionEconomy = {
      actionUsed: false,
      bonusActionUsed: false,
      reactionUsed: false,
      movementRemaining: 30, // TODO: pull from race.speed
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
export function endTurn(state: CombatState, character: Character): CombatState {
  if (state.status !== 'active') return state;

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

  const nextState: CombatState = {
    ...state,
    currentTurnIndex: nextIndex,
    round,
    playerAttacksThisTurn: 0,
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

  return resetActionEconomyForCurrent(nextState, character);
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
