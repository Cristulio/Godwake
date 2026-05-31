import type { Character } from '../../types/character';
import type { CombatState, MonsterCombatant } from '../../types/combat';
import { getMonster } from '../../content/monsters';
import { getRace } from '../../content/races';
import { getActiveRoller } from '../dice';
import {
  combatResult,
  patchActionEconomy,
  patchResources,
  patchHp,
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
import { tickPlayerConditions } from './playerConditions';
import { refreshMonsterIntents } from './attack/monsterIntent';
import type { ConditionName } from '../../types/conditions';
import { characterAffixMods } from '../items/affixMods';
import { evaluateCombatEnd } from './attack/damage';
import { isRaging } from '../character/derived';

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
      colossusSlayerUsedThisTurn: false,
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
  // Wizard: Blur ticks down one round each time the player's turn comes around.
  if (
    order[nextIndex] === 'player' &&
    (nextCharacter.resources.blurRoundsRemaining ?? 0) > 0
  ) {
    nextCharacter = patchResources(nextCharacter, {
      blurRoundsRemaining: (nextCharacter.resources.blurRoundsRemaining ?? 0) - 1,
    });
  }
  // Barbarian: the Reckless stance (and the advantage it hands enemies) clears
  // at the start of the barbarian's next turn; Rage burns down one round each
  // time that turn comes around.
  if (order[nextIndex] === 'player') {
    if (nextCharacter.recklessActive) {
      nextCharacter = { ...nextCharacter, recklessActive: false };
    }
    if ((nextCharacter.resources.rageRoundsRemaining ?? 0) > 0) {
      nextCharacter = patchResources(nextCharacter, {
        rageRoundsRemaining: (nextCharacter.resources.rageRoundsRemaining ?? 0) - 1,
      });
    }
  }

  // Tick down monster-debuff conditions (poisoned/frightened/blinded/restrained/
  // weakened) at the start of the player's turn, dropping any that expire.
  // Paralyzed is skipped here — its save-each-turn resolver below owns it.
  if (order[nextIndex] === 'player') {
    const ticked = tickPlayerConditions(nextCharacter);
    nextCharacter = ticked.character;
    for (const name of ticked.expired) {
      nextState = appendLog(nextState, {
        id: nextState.log.length + 1,
        kind: 'system',
        text: `${nextCharacter.name} ${conditionEndText(name)}.`,
      });
    }
  }

  if (order[nextIndex] === 'player' && isPlayerParalyzed(nextCharacter)) {
    const resolved = resolvePlayerParalyzedTurn(nextState, nextCharacter);
    nextState = resolved.state;
    nextCharacter = resolved.character;
  }

  // Regen (of Mending affix): tick one stack at the start of the player's
  // turn. Suppressed while raging (consistent with lifesteal).
  if (
    order[nextIndex] === 'player' &&
    (nextState.playerRegenStacks ?? 0) > 0 &&
    !isRaging(nextCharacter)
  ) {
    const regenAmount = characterAffixMods(nextCharacter).regenPerTurn;
    if (regenAmount > 0 && nextCharacter.hp.current < nextCharacter.hp.max) {
      const before = nextCharacter.hp.current;
      const after = Math.min(nextCharacter.hp.max, before + regenAmount);
      nextCharacter = patchHp(nextCharacter, { current: after });
      nextState = appendLog(nextState, {
        id: nextState.log.length + 1,
        kind: 'system',
        text: `${nextCharacter.name} mends — ${after - before} HP restored. (${(nextState.playerRegenStacks ?? 1) - 1} turns remaining)`,
      });
    }
    nextState = { ...nextState, playerRegenStacks: (nextState.playerRegenStacks ?? 1) - 1 };
  }

  // Bleed DOT: tick each bleeding monster at the start of the player's turn.
  if (order[nextIndex] === 'player') {
    for (const combatant of nextState.combatants) {
      if (combatant.kind !== 'monster') continue;
      const mc = combatant as MonsterCombatant;
      if (
        mc.instance.hp.current <= 0 ||
        !mc.instance.bleedTurnsRemaining ||
        mc.instance.bleedTurnsRemaining <= 0
      ) continue;

      const bleedDmg = mc.instance.bleedDamagePerTurn ?? 0;
      if (bleedDmg <= 0) continue;

      const remainingTemp = Math.max(0, mc.instance.hp.temp - bleedDmg);
      const overflow = Math.max(0, bleedDmg - mc.instance.hp.temp);
      const newHp = Math.max(0, mc.instance.hp.current - overflow);
      const newTurns = mc.instance.bleedTurnsRemaining - 1;

      nextState = {
        ...nextState,
        combatants: nextState.combatants.map((c) => {
          if (c.kind !== 'monster' || c.id !== mc.id) return c;
          return {
            ...c,
            instance: {
              ...c.instance,
              hp: { ...c.instance.hp, current: newHp, temp: remainingTemp },
              bleedTurnsRemaining: newTurns,
            },
          };
        }),
      };
      nextState = appendLog(nextState, {
        id: nextState.log.length + 1,
        kind: 'damage',
        text: `${mc.instance.displayName} bleeds for ${bleedDmg} damage.${newTurns > 0 ? ` (${newTurns} turns remaining)` : ''}`,
      });
    }
    // Evaluate if any monster died from bleed.
    const ended = evaluateCombatEnd(nextState, nextCharacter);
    nextState = ended.state;
    nextCharacter = ended.character;
  }

  // Burn DOT (Fireball ignite): tick at the start of the player's turn.
  if (order[nextIndex] === 'player' && nextState.status === 'active') {
    for (const combatant of nextState.combatants) {
      if (combatant.kind !== 'monster') continue;
      const mc = combatant as MonsterCombatant;
      if (
        mc.instance.hp.current <= 0 ||
        !mc.instance.burnTurnsRemaining ||
        mc.instance.burnTurnsRemaining <= 0
      ) continue;
      const burnDmg = mc.instance.burnDamagePerTurn ?? 0;
      if (burnDmg <= 0) continue;
      const remainingTemp = Math.max(0, mc.instance.hp.temp - burnDmg);
      const overflow = Math.max(0, burnDmg - mc.instance.hp.temp);
      const newHp = Math.max(0, mc.instance.hp.current - overflow);
      const newTurns = mc.instance.burnTurnsRemaining - 1;
      nextState = {
        ...nextState,
        combatants: nextState.combatants.map((c) => {
          if (c.kind !== 'monster' || c.id !== mc.id) return c;
          return {
            ...c,
            instance: {
              ...c.instance,
              hp: { ...c.instance.hp, current: newHp, temp: remainingTemp },
              burnTurnsRemaining: newTurns,
            },
          };
        }),
      };
      nextState = appendLog(nextState, {
        id: nextState.log.length + 1,
        kind: 'damage',
        text: `${mc.instance.displayName} burns for ${burnDmg} fire.`,
      });
    }
    const burnEnded = evaluateCombatEnd(nextState, nextCharacter);
    nextState = burnEnded.state;
    nextCharacter = burnEnded.character;
  }

  // enemy-telegraph: re-select every monster's intent at the top of the
  // player's turn, against the post-housekeeping state, so the badge reflects
  // exactly what the player is now deciding against.
  if (order[nextIndex] === 'player' && nextState.status === 'active') {
    nextState = refreshMonsterIntents(nextState, nextCharacter);
  }

  return combatResult(nextState, nextCharacter);
}

function conditionEndText(name: ConditionName): string {
  switch (name) {
    case 'poisoned':
      return 'shakes off the poison';
    case 'frightened':
      return 'steadies — the fear passes';
    case 'blinded':
      return 'blinks the dark away — sight returns';
    case 'restrained':
      return 'tears free';
    case 'weakened':
      return 'feels their strength return';
    default:
      return `is no longer ${name}`;
  }
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
