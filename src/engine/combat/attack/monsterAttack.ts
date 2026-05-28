import type { DiceRoller } from '../../dice';
import { parseDiceExpression } from '../../dice';
import type { Character } from '../../../types/character';
import type {
  AttackEvent,
  Combatant,
  CombatState,
  CombatLogEntry,
  SaveEvent,
} from '../../../types/combat';
import { computeAC } from '../../character/derived';
import { characterQuirkMods } from '../../character/quirks';
import { getMonster } from '../../../content/monsters';
import { getRace } from '../../../content/races';
import {
  applyParalyze,
  isPlayerParalyzed,
  rollPlayerSave,
} from '../holdPerson';
import { tryShieldReaction } from '../spells/shield';
import { combatResult, type CombatActionResult } from '../types';
import { appendLog } from '../log';
import { applyDamage, evaluateCombatEnd, nextLogId } from './damage';
import type { AttackContext } from './playerAttack';

function findCombatant(state: CombatState, id: string): Combatant | undefined {
  return state.combatants.find((c) => c.id === id);
}

/**
 * Monster attacks the player. Boss-AI picker: if the monster has a paralyze
 * action and the player isn't already paralyzed, that takes priority over an
 * attack action. Otherwise picks the first attack action.
 */
export function monsterAttack(
  ctx: AttackContext,
  attackerId: string,
): CombatActionResult {
  const { roller, character, state } = ctx;
  let nextCharacter: Character = character;
  const attacker = findCombatant(state, attackerId);
  if (!attacker || attacker.kind !== 'monster') return combatResult(state, nextCharacter);

  // Monster Hold Person handling: paralyzed monsters tick down their duration
  // on their own turn and lose the action. No save (simplified per gameplay
  // rules — Wizard spends a 2nd-level slot for guaranteed 2-round shutdown).
  const paralyzed = attacker.instance.conditions.find((c) => c.name === 'paralyzed');
  if (paralyzed && paralyzed.duration.kind === 'rounds') {
    const next = paralyzed.duration.value - 1;
    const expired = next <= 0;
    const updatedConditions = expired
      ? attacker.instance.conditions.filter((c) => c.name !== 'paralyzed')
      : attacker.instance.conditions.map((c) =>
          c.name === 'paralyzed'
            ? { ...c, duration: { kind: 'rounds' as const, value: next } }
            : c,
        );
    return combatResult(
      appendLog(
        {
          ...state,
          combatants: state.combatants.map((c) => {
            if (c.id !== attackerId || c.kind !== 'monster') return c;
            return {
              ...c,
              instance: {
                ...c.instance,
                conditions: updatedConditions,
                actionEconomy: { ...c.instance.actionEconomy, actionUsed: true },
              },
            };
          }),
        },
        {
          id: nextLogId(state),
          kind: 'system',
          text: expired
            ? `${attacker.instance.displayName} shakes off the binding.`
            : `${attacker.instance.displayName} is paralyzed — the turn is lost.`,
        },
      ),
      nextCharacter,
    );
  }

  const monsterDef = getMonster(attacker.instance.defId);
  const playerParalyzed = isPlayerParalyzed(nextCharacter);
  const paralyzeAction = monsterDef.actions.find((a) => a.kind === 'paralyze');
  const attackAction = monsterDef.actions.find((a) => a.kind === 'attack');

  let action = monsterDef.actions[0];
  // Boss gimmick: a paralyze spell fires once on round 1, then the fight is
  // a normal brawl regardless of whether it landed. Caps the snowball.
  if (paralyzeAction && !playerParalyzed && state.round === 1) {
    action = paralyzeAction;
  } else if (attackAction) {
    action = attackAction;
  }

  if (action.kind === 'paralyze') {
    const result = monsterCastParalyze(
      state,
      attackerId,
      attacker.instance.displayName,
      nextCharacter,
      roller,
      action,
    );
    return combatResult(result.state, result.character);
  }
  if (action.kind !== 'attack') return combatResult(state, nextCharacter);

  // Battle Rage transition: if this monster has the rage mechanic and is now
  // at or below half HP and hasn't entered rage yet, flip the flag and
  // announce. Subsequent attacks read the flag to apply the buffs.
  let workingState = state;
  const bloodied =
    attacker.instance.hp.current * 2 <= attacker.instance.hp.max;
  const hasBattleRage = monsterDef.bossMechanic === 'battle-rage';
  const enteringRage =
    hasBattleRage && bloodied && !attacker.instance.bossRageActive;
  if (enteringRage) {
    workingState = setBossRageActive(workingState, attackerId);
    workingState = appendLog(workingState, {
      id: nextLogId(workingState),
      kind: 'system',
      text: `${attacker.instance.displayName} enters Battle Rage — +2 damage per hit.`,
    });
  }
  const raging =
    hasBattleRage && (enteringRage || attacker.instance.bossRageActive === true);

  const ac = computeAC(nextCharacter);
  const attackAdvantage: 'normal' | 'advantage' =
    playerParalyzed ? 'advantage' : 'normal';
  const toHit = roller.d20(attackAdvantage, action.attackBonus);
  // Monsters don't get the player's Improved Critical
  const crit = toHit.rolls[0] === 20;
  let hit = crit || (toHit.total >= ac && !toHit.natural1);

  const advantageNote =
    attackAdvantage === 'advantage' ? ' (advantage — paralyzed)' : '';
  workingState = appendLog(workingState, {
    id: nextLogId(workingState),
    kind: 'roll',
    text: `${attacker.instance.displayName} attacks ${nextCharacter.name} with ${action.name}. d20${action.attackBonus >= 0 ? '+' : ''}${action.attackBonus} = ${toHit.total} vs AC ${ac} ${crit ? '— CRITICAL HIT' : hit ? '— hit' : '— miss'}${advantageNote}.`,
  });

  // Shield reaction (wizard): if a non-crit hit lands and Shield would flip it
  // to a miss, the wizard auto-burns a level-1 slot + her reaction. Crits
  // (nat 20) bypass Shield — Shield only raises AC, and a nat 20 hits anything.
  if (hit && !crit) {
    const triggered = tryShieldReaction(nextCharacter, workingState, ac, toHit.total);
    if (triggered) {
      workingState = triggered.state;
      nextCharacter = triggered.character;
      hit = false;
    }
  }

  const attackEvent: AttackEvent = {
    id: state.attackEventCounter + 1,
    attackerName: attacker.instance.displayName,
    targetName: nextCharacter.name,
    attackerKind: 'monster',
    attackerId: attackerId,
    attackerDefId: attacker.instance.defId,
    weaponName: action.name,
    attackBonus: action.attackBonus,
    natural: toHit.rolls[0],
    total: toHit.total,
    targetAC: ac,
    hit,
    crit,
    damageType: action.damageType,
  };

  let nextState: CombatState = {
    ...workingState,
    lastAttack: attackEvent,
    attackEventCounter: attackEvent.id,
  };

  if (hit) {
    const damageExpr = parseDiceExpression(action.damage);
    const damageRoll = roller.roll({
      count: damageExpr.count * (crit ? 2 : 1),
      die: damageExpr.die,
      modifier: 0,
    });
    const rageBonus = raging ? 2 : 0;
    const rawDamage = damageRoll.total + damageExpr.modifier + rageBonus;

    const quirkMods = characterQuirkMods(nextCharacter);
    const immune =
      action.damageType === 'poison' &&
      (quirkMods.poisonImmune === true || nextCharacter.poisonImmuneEncounter === true);
    const race = getRace(nextCharacter.raceId);
    const resisted =
      !immune &&
      (race.damageResistances?.includes(action.damageType) ?? false);
    const totalDamage = immune
      ? 0
      : resisted
        ? Math.floor(rawDamage / 2)
        : rawDamage;

    const damaged = applyDamage(nextState, 'player', totalDamage, nextCharacter);
    nextState = damaged.state;
    nextCharacter = damaged.character;
    // Stamp the actual damage delivered onto lastAttack so the postmortem can
    // quote the killing blow's number (raw damage is misleading on resists).
    if (nextState.lastAttack && nextState.lastAttack.id === attackEvent.id) {
      nextState = {
        ...nextState,
        lastAttack: { ...nextState.lastAttack, damageDealt: totalDamage },
      };
    }
    const breakdown: string[] = [`${damageRoll.total} dice`];
    if (damageExpr.modifier !== 0) {
      breakdown.push(
        damageExpr.modifier > 0
          ? `+ ${damageExpr.modifier} bonus`
          : `- ${Math.abs(damageExpr.modifier)} bonus`,
      );
    }
    if (rageBonus > 0) breakdown.push(`+ ${rageBonus} rage`);
    const resistSuffix = resisted ? ` (${action.damageType} resistance, halved)` : '';
    const damageLine = immune
      ? `Damage negated: ${nextCharacter.name} is immune to ${action.damageType}.`
      : `Damage: ${totalDamage} ${action.damageType} (${breakdown.join(' ')})${resistSuffix}.`;
    nextState = appendLog(nextState, {
      id: nextLogId(nextState),
      kind: 'damage',
      text: damageLine,
    });
  }

  // Mark monster's action used
  nextState = markMonsterActionUsed(nextState, attackerId);
  const ended = evaluateCombatEnd(nextState, nextCharacter);
  return combatResult(ended.state, ended.character);
}

function markMonsterActionUsed(state: CombatState, attackerId: string): CombatState {
  return {
    ...state,
    combatants: state.combatants.map((c) => {
      if (c.id !== attackerId || c.kind !== 'monster') return c;
      return {
        ...c,
        instance: {
          ...c.instance,
          actionEconomy: { ...c.instance.actionEconomy, actionUsed: true },
        },
      };
    }),
  };
}

function setBossRageActive(state: CombatState, attackerId: string): CombatState {
  return {
    ...state,
    combatants: state.combatants.map((c) => {
      if (c.id !== attackerId || c.kind !== 'monster') return c;
      return {
        ...c,
        instance: { ...c.instance, bossRageActive: true },
      };
    }),
  };
}

interface ParalyzeActionLike {
  kind: 'paralyze';
  name: string;
  saveDC: number;
  saveAbility: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
  durationRounds: number;
}

/**
 * Monster casts a paralyze effect (e.g. Hold Person). Rolls the player's save
 * against the spell's DC; on a fail, applies the paralyzed condition for
 * `durationRounds` rounds. No damage. Marks the monster's action used.
 */
function monsterCastParalyze(
  state: CombatState,
  attackerId: string,
  attackerName: string,
  character: Readonly<Character>,
  roller: DiceRoller,
  action: ParalyzeActionLike,
): { state: CombatState; character: Character } {
  let nextCharacter: Character = character;
  const save = rollPlayerSave(roller, nextCharacter, action.saveAbility, action.saveDC);
  nextCharacter = save.character;

  const logEntries: CombatLogEntry[] = [];
  logEntries.push({
    id: nextLogId(state),
    kind: 'roll',
    text: `${attackerName} casts ${action.name}. ${nextCharacter.name} ${action.saveAbility.toUpperCase()} save${save.advantage ? ' (advantage)' : ''}: d20${save.mod >= 0 ? '+' : ''}${save.mod} = ${save.total} vs DC ${action.saveDC} — ${save.success ? 'success' : 'fail'}.`,
  });

  if (!save.success) {
    nextCharacter = applyParalyze(nextCharacter, {
      rounds: action.durationRounds,
      saveDC: action.saveDC,
      saveAbility: action.saveAbility,
      source: attackerId,
    });
    logEntries.push({
      id: nextLogId(state) + 1,
      kind: 'system',
      text: `${nextCharacter.name} is paralyzed. The Magistrate's hold tightens.`,
    });
  } else {
    logEntries.push({
      id: nextLogId(state) + 1,
      kind: 'system',
      text: `${nextCharacter.name} shrugs off the binding.`,
    });
  }

  let nextState: CombatState = appendLog(state, ...logEntries);
  const saveEventId = (nextState.saveEventCounter ?? 0) + 1;
  const saveEvent: SaveEvent = {
    id: saveEventId,
    sourceName: action.name,
    casterName: attackerName,
    ability: action.saveAbility,
    dc: action.saveDC,
    mod: save.mod,
    natural: save.natural,
    total: save.total,
    success: save.success,
    advantage: save.advantage,
  };
  const spellEffectId = (nextState.spellEffectCounter ?? 0) + 1;
  nextState = {
    ...nextState,
    saveEventCounter: saveEventId,
    lastSave: saveEvent,
    spellEffectCounter: spellEffectId,
    spellEffectEvent: {
      id: spellEffectId,
      kind: 'hold-person',
      attackerId,
      targetId: 'player',
    },
  };
  nextState = markMonsterActionUsed(nextState, attackerId);
  return { state: nextState, character: nextCharacter };
}
