import type { Character } from '../../types/character';
import type { CombatState } from '../../types/combat';
import { getMonster } from '../../content/monsters';
import { getRace } from '../../content/races';
import { getActiveRoller } from '../dice';
import {
  combatResult,
  patchActionEconomy,
  patchResources,
  type CombatActionResult,
} from './types';
import { appendLog } from './log';
import {
  decrementParalyzeDuration,
  getPlayerParalyzed,
  isPlayerParalyzed,
  lockOutActionEconomy,
  removeParalyze,
  rollPlayerSave,
} from './holdPerson';

function resetActionEconomyForCurrent(
  state: CombatState,
  character: Readonly<Character>,
): { state: CombatState; character: Character } {
  const currentId = state.turnOrder[state.currentTurnIndex];
  if (currentId === 'player') {
    const nextCharacter = patchActionEconomy(character, {
      actionUsed: false,
      bonusActionUsed: false,
      reactionUsed: false,
      movementRemaining: getRace(character.raceId).speed,
    });
    return { state, character: nextCharacter };
  }
  return {
    state: {
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
    },
    character,
  };
}

/**
 * Compute the next live turn-holder. Skips dead combatants. Wraps from the
 * last index back to 0 and bumps the round counter.
 *
 * TODO: time-stop hook — if character.extraTurnsRemaining > 0, decrement and
 * re-trigger player turn instead of advancing. (Plug here so callers stay
 * agnostic to whether the player just bought another turn.)
 */
function advanceTurn(
  state: CombatState,
  character: Readonly<Character>,
): { nextIndex: number; round: number } {
  let nextIndex = state.currentTurnIndex;
  let round = state.round;
  const order = state.turnOrder;

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

  return { nextIndex, round };
}

/**
 * Advance to the next combatant in turn order. Skip dead combatants.
 * Increment round when wrapping. Reset action economy for the new turn-holder.
 */
export function endTurn(state: CombatState, character: Readonly<Character>): CombatActionResult {
  if (state.status !== 'active') return combatResult(state, character);
  let nextCharacter: Character = character;

  const { nextIndex, round } = advanceTurn(state, nextCharacter);
  const order = state.turnOrder;

  // Cunning Action: Dash is "burst" — burn it or lose it. If the rogue
  // queued a bonus swing and didn't fire it before End Turn, drop the flag
  // so it can't be banked into next round.
  if (nextCharacter.bonusAttackAvailable) {
    nextCharacter = { ...nextCharacter, bonusAttackAvailable: false };
  }

  let nextState: CombatState = appendLog(
    {
      ...state,
      currentTurnIndex: nextIndex,
      round,
      playerAttacksThisTurn: 0,
      sneakAttackUsedThisTurn: false,
    },
    {
      id: state.log.length + 1,
      kind: 'system',
      text:
        order[nextIndex] === 'player'
          ? `— Your turn (round ${round}). —`
          : `— ${combatantDisplayName(state, order[nextIndex])}'s turn (round ${round}). —`,
    },
  );

  const reset = resetActionEconomyForCurrent(nextState, nextCharacter);
  nextState = reset.state;
  nextCharacter = reset.character;

  // Wizard: Shield expires at the start of the player's next turn.
  if (order[nextIndex] === 'player' && nextCharacter.resources.shieldActive) {
    nextCharacter = patchResources(nextCharacter, { shieldActive: false });
  }
  // Wizard: Misty Step's displacement bonus expires at the start of the player's next turn.
  if (order[nextIndex] === 'player' && nextCharacter.resources.mistyStepActive) {
    nextCharacter = patchResources(nextCharacter, { mistyStepActive: false });
  }

  if (order[nextIndex] === 'player' && isPlayerParalyzed(nextCharacter)) {
    const resolved = resolvePlayerParalyzedTurn(nextState, nextCharacter);
    nextState = resolved.state;
    nextCharacter = resolved.character;
  }

  return combatResult(nextState, nextCharacter);
}

/**
 * Player wakes a turn already paralyzed: roll a save against the active
 * condition's DC at turn start. Success removes the condition; the player
 * gets a normal turn. Failure ticks the duration; if it hits zero the
 * condition expires anyway, otherwise the player loses the turn.
 *
 * Exported so `createCombat` can run the same resolution on round-1 turn-0
 * (player goes first, so the "first player turn" never travels through
 * `endTurn`).
 */
export function resolvePlayerParalyzedTurn(
  state: CombatState,
  character: Readonly<Character>,
): { state: CombatState; character: Character } {
  let nextCharacter: Character = character;
  const cond = getPlayerParalyzed(nextCharacter);
  if (!cond || !cond.saveDC || !cond.saveAbility) return { state, character: nextCharacter };
  const roller = getActiveRoller();
  const save = rollPlayerSave(roller, nextCharacter, cond.saveAbility, cond.saveDC);
  nextCharacter = save.character;
  const logEntries = [];

  logEntries.push({
    id: state.log.length + 1,
    kind: 'roll' as const,
    text: `${nextCharacter.name} struggles against paralysis. ${cond.saveAbility.toUpperCase()} save${save.advantage ? ' (advantage)' : ''}: d20${save.mod >= 0 ? '+' : ''}${save.mod} = ${save.total} vs DC ${cond.saveDC} — ${save.success ? 'success' : 'fail'}.`,
  });

  if (save.success) {
    nextCharacter = removeParalyze(nextCharacter);
    logEntries.push({
      id: state.log.length + 2,
      kind: 'system' as const,
      text: `${nextCharacter.name} breaks free. The Magistrate's hold falls away.`,
    });
    return { state: appendLog(state, ...logEntries), character: nextCharacter };
  }

  const dec = decrementParalyzeDuration(nextCharacter);
  nextCharacter = dec.character;
  if (dec.expired) {
    logEntries.push({
      id: state.log.length + 2,
      kind: 'system' as const,
      text: `The binding wears thin and snaps. ${nextCharacter.name} can move again.`,
    });
    return { state: appendLog(state, ...logEntries), character: nextCharacter };
  }

  nextCharacter = lockOutActionEconomy(nextCharacter);
  logEntries.push({
    id: state.log.length + 2,
    kind: 'system' as const,
    text: `${nextCharacter.name} cannot move. The turn is lost.`,
  });
  return { state: appendLog(state, ...logEntries), character: nextCharacter };
}

function combatantDisplayName(state: CombatState, id: string): string {
  const c = state.combatants.find((x) => x.id === id);
  if (!c) return id;
  if (c.kind === 'player') return 'Player';
  return c.instance.displayName;
}

export function currentCombatantId(state: CombatState): string {
  return state.turnOrder[state.currentTurnIndex];
}

export function isPlayerTurn(state: CombatState): boolean {
  return currentCombatantId(state) === 'player';
}
