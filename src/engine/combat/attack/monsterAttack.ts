import type { DiceRoller } from '../../dice';
import { parseDiceExpression } from '../../dice';
import type { Character } from '../../../types/character';
import type {
  AttackEvent,
  Combatant,
  CombatState,
  CombatLogEntry,
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
  const hit = crit || (toHit.total >= ac && !toHit.natural1);

  const logEntries: CombatLogEntry[] = [];
  const advantageNote =
    attackAdvantage === 'advantage' ? ' (advantage — paralyzed)' : '';
  logEntries.push({
    id: nextLogId(workingState),
    kind: 'roll',
    text: `${attacker.instance.displayName} attacks ${nextCharacter.name} with ${action.name}. d20${action.attackBonus >= 0 ? '+' : ''}${action.attackBonus} = ${toHit.total} vs AC ${ac} ${crit ? '— CRITICAL HIT' : hit ? '— hit' : '— miss'}${advantageNote}.`,
  });

  const attackEvent: AttackEvent = {
    id: state.attackEventCounter + 1,
    attackerName: attacker.instance.displayName,
    targetName: nextCharacter.name,
    attackerKind: 'monster',
    weaponName: action.name,
    attackBonus: action.attackBonus,
    natural: toHit.rolls[0],
    total: toHit.total,
    targetAC: ac,
    hit,
    crit,
  };

  let nextState: CombatState = appendLog(
    {
      ...workingState,
      lastAttack: attackEvent,
      attackEventCounter: attackEvent.id,
    },
    ...logEntries,
  );

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
    const modifierSuffix =
      damageExpr.modifier !== 0
        ? ` ${damageExpr.modifier > 0 ? '+' : ''}${damageExpr.modifier}`
        : '';
    const rageSuffix = rageBonus > 0 ? ` +${rageBonus} rage` : '';
    const damageLine = immune
      ? `Damage negated: ${nextCharacter.name} is immune to ${action.damageType}.`
      : resisted
        ? `Damage: ${damageRoll.rolls.join('+')}${modifierSuffix}${rageSuffix} → halved (${action.damageType} resistance) = ${totalDamage} ${action.damageType}.`
        : `Damage: ${damageRoll.rolls.join('+')}${modifierSuffix}${rageSuffix} = ${totalDamage} ${action.damageType}.`;
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

  const logEntries: CombatLogEntry[] = [];
  logEntries.push({
    id: nextLogId(state),
    kind: 'roll',
    text: `${attackerName} casts ${action.name}. ${nextCharacter.name} ${action.saveAbility.toUpperCase()} save: d20${save.mod >= 0 ? '+' : ''}${save.mod} = ${save.total} vs DC ${action.saveDC} — ${save.success ? 'success' : 'fail'}.`,
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
  const spellEffectId = (nextState.spellEffectCounter ?? 0) + 1;
  nextState = {
    ...nextState,
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
