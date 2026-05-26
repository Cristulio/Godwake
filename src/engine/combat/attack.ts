import type { DiceRoller } from '../dice';
import { parseDiceExpression } from '../dice';
import type { Character } from '../../types/character';
import type {
  AttackEvent,
  Combatant,
  CombatState,
  CombatLogEntry,
  MonsterCombatant,
} from '../../types/combat';
import type { Weapon } from '../../schemas/item';
import { abilityModifier } from '../../types/abilities';
import {
  critRange,
  computeAC,
  effectiveAbilityScores,
  characterHasMechanic,
  proficiencyBonus,
} from '../character/derived';
import { characterQuirkMods } from '../character/quirks';
import { characterBlessingMods } from '../character/blessings';
import { getItem } from '../../content/items';
import { getMonster } from '../../content/monsters';
import { getRace } from '../../content/races';
import {
  applyParalyze,
  isPlayerParalyzed,
  rollPlayerSave,
} from './holdPerson';

export interface AttackContext {
  roller: DiceRoller;
  character: Character;
  state: CombatState;
}

function nextLogId(state: CombatState): number {
  return state.log.length + 1;
}

function findCombatant(state: CombatState, id: string): Combatant | undefined {
  return state.combatants.find((c) => c.id === id);
}

function displayName(c: Combatant, character: Character): string {
  return c.kind === 'player' ? character.name : c.instance.displayName;
}

function targetAC(target: Combatant, character: Character): number {
  return target.kind === 'player' ? computeAC(character) : target.instance.ac;
}

export function applyDamage(state: CombatState, targetId: string, amount: number, character: Character): CombatState {
  let next = { ...state, combatants: state.combatants.map((c) => ({ ...c })) };
  const target = next.combatants.find((c) => c.id === targetId);
  if (!target) return state;

  if (target.kind === 'monster') {
    const mc = target as MonsterCombatant;
    const remainingTemp = Math.max(0, mc.instance.hp.temp - amount);
    const overflow = Math.max(0, amount - mc.instance.hp.temp);
    mc.instance = {
      ...mc.instance,
      hp: {
        ...mc.instance.hp,
        temp: remainingTemp,
        current: Math.max(0, mc.instance.hp.current - overflow),
      },
    };
  } else {
    const remainingTemp = Math.max(0, character.hp.temp - amount);
    const overflow = Math.max(0, amount - character.hp.temp);
    const wouldFall =
      character.hp.current - overflow <= 0 && character.hp.current > 0;

    if (wouldFall && tryConsumeStabilise(character)) {
      character.hp = { ...character.hp, temp: remainingTemp, current: 1 };
      next = {
        ...next,
        log: [
          ...next.log,
          {
            id: next.log.length + 1,
            kind: 'system',
            text: `${character.name} is on death's door — Ilmater's grip holds. Stabilised at 1 HP.`,
          },
        ],
      };
    } else {
      character.hp = {
        ...character.hp,
        temp: remainingTemp,
        current: Math.max(0, character.hp.current - overflow),
      };
    }
  }
  return next;
}

/**
 * Spend a stabilise charge if any are available. Available = 1 (free per delve)
 * + extraStabiliseCharges (from Ilmater's Patience stacks) - stabilisesUsed.
 * Mutates character.delveBudgets when it consumes one. Returns whether a
 * charge was spent.
 */
function tryConsumeStabilise(character: Character): boolean {
  const extra = characterBlessingMods(character).extraStabiliseCharges ?? 0;
  const used = character.delveBudgets?.stabilisesUsed ?? 0;
  const available = 1 + extra - used;
  if (available <= 0) return false;
  character.delveBudgets = {
    ...character.delveBudgets,
    stabilisesUsed: used + 1,
  };
  return true;
}

function isDead(c: Combatant, character: Character): boolean {
  if (c.kind === 'player') return character.hp.current <= 0;
  return c.instance.hp.current <= 0;
}

function evaluateCombatEnd(state: CombatState, character: Character): CombatState {
  const allMonstersDead = state.combatants
    .filter((c) => c.kind === 'monster')
    .every((c) => isDead(c, character));
  if (allMonstersDead) {
    return {
      ...state,
      status: 'player-victory',
      log: [
        ...state.log,
        { id: nextLogId(state), kind: 'system', text: 'Victory. The room falls silent.' },
      ],
    };
  }
  if (character.hp.current <= 0) {
    return {
      ...state,
      status: 'player-defeat',
      log: [
        ...state.log,
        { id: nextLogId(state), kind: 'system', text: 'You have fallen.' },
      ],
    };
  }
  return state;
}

/**
 * Player attacks a target with a weapon (must be the equipped main-hand).
 * Returns updated combat state (and mutates character.hp on damage taken — TODO).
 */
export function playerAttack(
  ctx: AttackContext,
  targetId: string,
  weaponItemId: string,
): CombatState {
  const { roller, character, state } = ctx;
  const target = findCombatant(state, targetId);
  if (!target) return state;
  if (target.kind !== 'monster') return state;

  const weapon = getItem(weaponItemId);
  if (weapon.kind !== 'weapon') return state;

  const scores = effectiveAbilityScores(character);
  const isFinesse = (weapon as Weapon).properties.includes('finesse');
  const attackAbility: 'str' | 'dex' = isFinesse
    ? (abilityModifier(scores.dex) >= abilityModifier(scores.str) ? 'dex' : 'str')
    : 'str'; // melee default; ranged would force dex; refine later
  const abilMod = abilityModifier(scores[attackAbility]);
  const profBonus = proficiencyBonus(character.level);

  const quirkMods = characterQuirkMods(character);
  const blessingMods = characterBlessingMods(character);
  const isFirstAttack = !state.playerHasAttacked;
  const targetWounded =
    target.kind === 'monster' &&
    target.instance.hp.current > 0 &&
    target.instance.hp.current <= target.instance.hp.max / 2;
  const playerWounded = character.hp.current <= character.hp.max / 2;

  let attackBonus = abilMod + profBonus;
  attackBonus += character.permanentAttackBonus ?? 0;
  attackBonus += character.delveAttackBonus ?? 0;
  if (isFirstAttack) {
    attackBonus += quirkMods.firstTurnAttackBonus ?? 0;
    attackBonus += quirkMods.firstAttackPenalty ?? 0;
  }
  if (targetWounded) attackBonus += quirkMods.woundedAttackBonus ?? 0;
  if (isFirstAttack && blessingMods.firstAttackBonus) {
    attackBonus += blessingMods.firstAttackBonus;
  }

  const ac = targetAC(target, character);
  const hideAdvantage = character.nextAttackAdvantage === true;
  const advantage: 'normal' | 'advantage' =
    (isFirstAttack && blessingMods.firstAttackAdvantage) || hideAdvantage
      ? 'advantage'
      : 'normal';
  // One-shot: consume Hide on the actual attack roll, hit or miss.
  if (hideAdvantage) character.nextAttackAdvantage = false;
  let toHit = roller.d20(advantage, attackBonus);
  let crit = critRange(character).includes(toHit.rolls[0]);
  let hit = crit || (toHit.total >= ac && !toHit.natural1);

  const logEntries: CombatLogEntry[] = [];
  const newLogId = nextLogId(state);
  logEntries.push({
    id: newLogId,
    kind: 'roll',
    text: `${character.name} attacks ${displayName(target, character)} with ${weapon.name}. d20${attackBonus >= 0 ? '+' : ''}${attackBonus} = ${toHit.total} vs AC ${ac} ${crit ? '— CRITICAL HIT' : hit ? '— hit' : '— miss'}.`,
  });

  // Auto-reroll a miss if a reroll budget is available. Prefer the
  // per-encounter budget (Tymora's Coin) before the per-delve one (Tymora's Eye).
  let usedEncounterReroll = 0;
  let usedDelveReroll = 0;
  if (!hit) {
    let source: 'encounter' | 'delve' | null = null;
    if (state.rerollMissesEncounterRemaining > 0) source = 'encounter';
    else if ((character.delveBudgets?.quirkRerollMissesRemaining ?? 0) > 0) source = 'delve';
    if (source) {
      if (source === 'encounter') usedEncounterReroll = 1;
      else usedDelveReroll = 1;
      toHit = roller.d20(advantage, attackBonus);
      crit = critRange(character).includes(toHit.rolls[0]);
      hit = crit || (toHit.total >= ac && !toHit.natural1);
      const sourceLabel = source === 'encounter' ? "Tymora's Coin" : "Tymora's Eye";
      logEntries.push({
        id: newLogId + 1,
        kind: 'roll',
        text: `${sourceLabel} — reroll. d20${attackBonus >= 0 ? '+' : ''}${attackBonus} = ${toHit.total} vs AC ${ac} ${crit ? '— CRITICAL HIT' : hit ? '— hit' : '— miss'}.`,
      });
    }
  }

  const attackEvent: AttackEvent = {
    id: state.attackEventCounter + 1,
    attackerName: character.name,
    targetName: displayName(target, character),
    attackerKind: 'player',
    weaponName: weapon.name,
    attackBonus,
    natural: toHit.rolls[0],
    total: toHit.total,
    targetAC: ac,
    hit,
    crit,
  };

  let nextState: CombatState = {
    ...state,
    // The player has now made an attack roll against this monster, so its AC
    // becomes "known" — UI can reveal it.
    combatants: state.combatants.map((c) => {
      if (c.kind !== 'monster' || c.id !== targetId) return c;
      if (c.instance.acRevealed) return c;
      return { ...c, instance: { ...c.instance, acRevealed: true } };
    }),
    log: [...state.log, ...logEntries],
    lastAttack: attackEvent,
    attackEventCounter: attackEvent.id,
  };

  let sneakAttackFiredFlag = false;
  if (hit) {
    const damageExpr = parseDiceExpression(weapon.damage);
    // On crit, double the dice (not the modifier).
    const damageRoll = roller.roll(
      {
        count: damageExpr.count * (crit ? 2 : 1),
        die: damageExpr.die,
        modifier: 0,
      },
    );

    let bonusDamage = 0;
    const bonusParts: string[] = [];
    const flatBonus = blessingMods.damageBonus ?? 0;
    if (flatBonus) {
      bonusDamage += flatBonus;
      bonusParts.push(`${flatBonus >= 0 ? '+' : ''}${flatBonus} blessing`);
    }
    const holyBonus = blessingMods.holyDamageBonus ?? 0;
    if (holyBonus) {
      bonusDamage += holyBonus;
      bonusParts.push(`+${holyBonus} radiant`);
    }
    if (playerWounded && quirkMods.hangryDamageBonus) {
      bonusDamage += quirkMods.hangryDamageBonus;
      bonusParts.push(`+${quirkMods.hangryDamageBonus} Hangry`);
    }
    if (isFirstAttack && blessingMods.firstAttackDamage) {
      bonusDamage += blessingMods.firstAttackDamage;
      bonusParts.push(`+${blessingMods.firstAttackDamage} first strike`);
    }

    // Rogue Sneak Attack: once per turn, when the strike has the angle —
    // either rolled with advantage, or the target is already bloodied
    // (HP at half or less). Engine substitute for 5e's "ally adjacent"
    // clause: there are no allies here, but a wounded foe is leaning.
    const sneakAlreadyUsed = state.sneakAttackUsedThisTurn === true;
    const isRogue = character.classId === 'rogue';
    const sneakTriggers = advantage === 'advantage' || targetWounded;
    if (isRogue && !sneakAlreadyUsed && sneakTriggers) {
      const sneakRoll = roller.roll({
        count: 1 * (crit ? 2 : 1),
        die: 6,
        modifier: 0,
      });
      bonusDamage += sneakRoll.total;
      bonusParts.push(`+${sneakRoll.total} Sneak Attack`);
      sneakAttackFiredFlag = true;
    }

    const totalDamage = damageRoll.total + abilMod + damageExpr.modifier + bonusDamage;

    nextState = applyDamage(nextState, targetId, totalDamage, character);

    const bonusSuffix = bonusParts.length > 0 ? ` (${bonusParts.join(', ')})` : '';
    nextState = {
      ...nextState,
      log: [
        ...nextState.log,
        {
          id: nextLogId(nextState),
          kind: 'damage',
          text: `Damage: ${damageRoll.rolls.join('+')}${abilMod !== 0 ? ` ${abilMod > 0 ? '+' : ''}${abilMod}` : ''}${damageExpr.modifier !== 0 ? ` ${damageExpr.modifier > 0 ? '+' : ''}${damageExpr.modifier}` : ''} = ${totalDamage} ${weapon.damageType}${bonusSuffix}.`,
        },
      ],
    };
  }

  // Mark action used for the player
  nextState = markPlayerActionUsed(nextState, character);
  nextState = {
    ...nextState,
    playerHasAttacked: true,
    rerollMissesEncounterRemaining:
      nextState.rerollMissesEncounterRemaining - usedEncounterReroll,
  };
  if (hit && sneakAttackFiredFlag) {
    nextState = { ...nextState, sneakAttackUsedThisTurn: true };
  }
  if (usedDelveReroll > 0 && character.delveBudgets) {
    character.delveBudgets = {
      ...character.delveBudgets,
      quirkRerollMissesRemaining:
        (character.delveBudgets.quirkRerollMissesRemaining ?? 0) - usedDelveReroll,
    };
  }

  return evaluateCombatEnd(nextState, character);
}

function markPlayerActionUsed(state: CombatState, character: Character): CombatState {
  const attacksMade = (state.playerAttacksThisTurn ?? 0) + 1;
  const maxAttacks = maxAttacksPerAction(character);
  if (attacksMade < maxAttacks) {
    return { ...state, playerAttacksThisTurn: attacksMade };
  }
  character.actionEconomy = { ...character.actionEconomy, actionUsed: true };
  return { ...state, playerAttacksThisTurn: attacksMade };
}

/** Fighter L5 Extra Attack grants 2 attacks per Attack action. */
function maxAttacksPerAction(character: Character): number {
  return characterHasMechanic(character, 'extra-attack') ? 2 : 1;
}

/**
 * Monster attacks the player. Boss-AI picker: if the monster has a paralyze
 * action and the player isn't already paralyzed, that takes priority over an
 * attack action. Otherwise picks the first attack action.
 */
export function monsterAttack(
  ctx: AttackContext,
  attackerId: string,
): CombatState {
  const { roller, character, state } = ctx;
  const attacker = findCombatant(state, attackerId);
  if (!attacker || attacker.kind !== 'monster') return state;

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
    return {
      ...state,
      log: [
        ...state.log,
        {
          id: nextLogId(state),
          kind: 'system',
          text: expired
            ? `${attacker.instance.displayName} shakes off the binding.`
            : `${attacker.instance.displayName} is paralyzed — the turn is lost.`,
        },
      ],
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
    };
  }

  const monsterDef = getMonster(attacker.instance.defId);
  const playerParalyzed = isPlayerParalyzed(character);
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
    return monsterCastParalyze(state, attackerId, attacker.instance.displayName, character, roller, action);
  }
  if (action.kind !== 'attack') return state;

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
    workingState = {
      ...workingState,
      log: [
        ...workingState.log,
        {
          id: nextLogId(workingState),
          kind: 'system',
          text: `${attacker.instance.displayName} enters Battle Rage — advantage on attacks, +2 damage.`,
        },
      ],
    };
  }
  const raging =
    hasBattleRage && (enteringRage || attacker.instance.bossRageActive === true);

  const ac = computeAC(character);
  const attackAdvantage: 'normal' | 'advantage' =
    playerParalyzed || raging ? 'advantage' : 'normal';
  const toHit = roller.d20(attackAdvantage, action.attackBonus);
  // Monsters don't get the player's Improved Critical
  const crit = toHit.rolls[0] === 20;
  const hit = crit || (toHit.total >= ac && !toHit.natural1);

  const logEntries: CombatLogEntry[] = [];
  const advantageNote =
    attackAdvantage === 'advantage'
      ? raging && !playerParalyzed
        ? ' (advantage — raging)'
        : ' (advantage — paralyzed)'
      : '';
  logEntries.push({
    id: nextLogId(workingState),
    kind: 'roll',
    text: `${attacker.instance.displayName} attacks ${character.name} with ${action.name}. d20${action.attackBonus >= 0 ? '+' : ''}${action.attackBonus} = ${toHit.total} vs AC ${ac} ${crit ? '— CRITICAL HIT' : hit ? '— hit' : '— miss'}${advantageNote}.`,
  });

  const attackEvent: AttackEvent = {
    id: state.attackEventCounter + 1,
    attackerName: attacker.instance.displayName,
    targetName: character.name,
    attackerKind: 'monster',
    weaponName: action.name,
    attackBonus: action.attackBonus,
    natural: toHit.rolls[0],
    total: toHit.total,
    targetAC: ac,
    hit,
    crit,
  };

  let nextState: CombatState = {
    ...workingState,
    log: [...workingState.log, ...logEntries],
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

    const quirkMods = characterQuirkMods(character);
    const immune =
      action.damageType === 'poison' && quirkMods.poisonImmune === true;
    const race = getRace(character.raceId);
    const resisted =
      !immune &&
      (race.damageResistances?.includes(action.damageType) ?? false);
    const totalDamage = immune
      ? 0
      : resisted
        ? Math.floor(rawDamage / 2)
        : rawDamage;

    nextState = applyDamage(nextState, 'player', totalDamage, character);
    const modifierSuffix =
      damageExpr.modifier !== 0
        ? ` ${damageExpr.modifier > 0 ? '+' : ''}${damageExpr.modifier}`
        : '';
    const rageSuffix = rageBonus > 0 ? ` +${rageBonus} rage` : '';
    const damageLine = immune
      ? `Damage negated: ${character.name} is immune to ${action.damageType}.`
      : resisted
        ? `Damage: ${damageRoll.rolls.join('+')}${modifierSuffix}${rageSuffix} → halved (${action.damageType} resistance) = ${totalDamage} ${action.damageType}.`
        : `Damage: ${damageRoll.rolls.join('+')}${modifierSuffix}${rageSuffix} = ${totalDamage} ${action.damageType}.`;
    nextState = {
      ...nextState,
      log: [
        ...nextState.log,
        {
          id: nextLogId(nextState),
          kind: 'damage',
          text: damageLine,
        },
      ],
    };
  }

  // Mark monster's action used
  nextState = markMonsterActionUsed(nextState, attackerId);
  return evaluateCombatEnd(nextState, character);
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
  character: Character,
  roller: DiceRoller,
  action: ParalyzeActionLike,
): CombatState {
  const save = rollPlayerSave(roller, character, action.saveAbility, action.saveDC);

  const logEntries: CombatLogEntry[] = [];
  logEntries.push({
    id: nextLogId(state),
    kind: 'roll',
    text: `${attackerName} casts ${action.name}. ${character.name} ${action.saveAbility.toUpperCase()} save: d20${save.mod >= 0 ? '+' : ''}${save.mod} = ${save.total} vs DC ${action.saveDC} — ${save.success ? 'success' : 'fail'}.`,
  });

  if (!save.success) {
    applyParalyze(character, {
      rounds: action.durationRounds,
      saveDC: action.saveDC,
      saveAbility: action.saveAbility,
      source: attackerId,
    });
    logEntries.push({
      id: nextLogId(state) + 1,
      kind: 'system',
      text: `${character.name} is paralyzed. The Magistrate's hold tightens.`,
    });
  } else {
    logEntries.push({
      id: nextLogId(state) + 1,
      kind: 'system',
      text: `${character.name} shrugs off the binding.`,
    });
  }

  let nextState: CombatState = {
    ...state,
    log: [...state.log, ...logEntries],
  };
  nextState = markMonsterActionUsed(nextState, attackerId);
  return nextState;
}
