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
import { critRange, computeAC, effectiveAbilityScores } from '../character/derived';
import { characterQuirkMods } from '../character/quirks';
import { characterBlessingMods } from '../character/blessings';
import { getItem } from '../../content/items';
import { getMonster } from '../../content/monsters';

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

function applyDamage(state: CombatState, targetId: string, amount: number, character: Character): CombatState {
  const next = { ...state, combatants: state.combatants.map((c) => ({ ...c })) };
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
    character.hp = {
      ...character.hp,
      temp: remainingTemp,
      current: Math.max(0, character.hp.current - overflow),
    };
  }
  return next;
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
  const profBonus = 2; // Lv 1-4. proficiencyBonus(character.level) -- TODO

  const quirkMods = characterQuirkMods(character);
  const blessingMods = characterBlessingMods(character);
  const isFirstAttack = !state.playerHasAttacked;
  const targetWounded =
    target.kind === 'monster' &&
    target.instance.hp.current > 0 &&
    target.instance.hp.current <= target.instance.hp.max / 2;
  const playerWounded = character.hp.current <= character.hp.max / 2;

  let attackBonus = abilMod + profBonus;
  if (isFirstAttack) {
    attackBonus += quirkMods.firstTurnAttackBonus ?? 0;
    attackBonus += quirkMods.firstAttackPenalty ?? 0;
  }
  if (targetWounded) attackBonus += quirkMods.woundedAttackBonus ?? 0;
  if (isFirstAttack && blessingMods.firstAttackBonus) {
    attackBonus += blessingMods.firstAttackBonus;
  }

  const ac = targetAC(target, character);
  const advantage =
    isFirstAttack && blessingMods.firstAttackAdvantage ? 'advantage' : 'normal';
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
  character.actionEconomy = { ...character.actionEconomy, actionUsed: true };
  return state;
}

/**
 * Monster attacks the player. Picks its first action (Multiattack handling deferred).
 */
export function monsterAttack(
  ctx: AttackContext,
  attackerId: string,
): CombatState {
  const { roller, character, state } = ctx;
  const attacker = findCombatant(state, attackerId);
  if (!attacker || attacker.kind !== 'monster') return state;

  const monsterDef = getMonster(attacker.instance.defId);
  const action = monsterDef.actions[0]; // MVP: always first action
  if (action.kind !== 'attack') return state;

  const ac = computeAC(character);
  const toHit = roller.d20('normal', action.attackBonus);
  // Monsters don't get the player's Improved Critical
  const crit = toHit.rolls[0] === 20;
  const hit = crit || (toHit.total >= ac && !toHit.natural1);

  const logEntries: CombatLogEntry[] = [];
  logEntries.push({
    id: nextLogId(state),
    kind: 'roll',
    text: `${attacker.instance.displayName} attacks ${character.name} with ${action.name}. d20${action.attackBonus >= 0 ? '+' : ''}${action.attackBonus} = ${toHit.total} vs AC ${ac} ${crit ? '— CRITICAL HIT' : hit ? '— hit' : '— miss'}.`,
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
    ...state,
    log: [...state.log, ...logEntries],
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
    const rawDamage = damageRoll.total + damageExpr.modifier;

    const quirkMods = characterQuirkMods(character);
    const immune =
      action.damageType === 'poison' && quirkMods.poisonImmune === true;
    const totalDamage = immune ? 0 : rawDamage;

    nextState = applyDamage(nextState, 'player', totalDamage, character);
    const damageLine = immune
      ? `Damage negated: ${character.name} is immune to ${action.damageType}.`
      : `Damage: ${damageRoll.rolls.join('+')}${damageExpr.modifier !== 0 ? ` ${damageExpr.modifier > 0 ? '+' : ''}${damageExpr.modifier}` : ''} = ${totalDamage} ${action.damageType}.`;
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
