import type { DiceRoller } from '../../dice';
import { parseDiceExpression } from '../../dice';
import type { Character } from '../../../types/character';
import type {
  AttackEvent,
  Combatant,
  CombatState,
  CombatLogEntry,
  MonsterCombatant,
  MonsterInstance,
  SaveEvent,
  SpellEffectKind,
} from '../../../types/combat';
import type {
  MonsterAttack,
  MonsterDebuff,
  MonsterSummon,
  MonsterSustain,
} from '../../../schemas/monster';
import type { ConditionName } from '../../../types/conditions';
import { computeAC, isRaging } from '../../character/derived';
import { characterQuirkMods } from '../../character/quirks';
import { characterAffixMods } from '../../items/affixMods';
import { getMonster } from '../../../content/monsters';
import { getRace } from '../../../content/races';
import {
  applyParalyze,
  isPlayerParalyzed,
  rollPlayerSave,
} from '../holdPerson';
import {
  applyPlayerCondition,
  playerConditionMods,
  DEFAULT_WEAKENED_AMOUNT,
} from '../playerConditions';
import { spawnMonsterInstance } from '../createCombat';
import {
  liveMonsters,
  pickAllyTarget,
  resolveIntentAction,
  selectMonsterIntent,
} from './monsterIntent';
import { tryShieldReaction } from '../spells/shield';
import { MIRROR_IMAGE_SEE_THROUGH_DC } from '../spells/mirrorImage';
import { combatResult, patchResources, type CombatActionResult } from '../types';
import { appendLog } from '../log';
import { applyDamage, evaluateCombatEnd, nextLogId } from './damage';
import type { AttackContext } from './playerAttack';

function findCombatant(state: CombatState, id: string): Combatant | undefined {
  return state.combatants.find((c) => c.id === id);
}

function patchMonsterInstance(
  state: CombatState,
  id: string,
  fn: (instance: MonsterInstance) => MonsterInstance,
): CombatState {
  return {
    ...state,
    combatants: state.combatants.map((c) =>
      c.id === id && c.kind === 'monster' ? { ...c, instance: fn(c.instance) } : c,
    ),
  };
}

/**
 * Push an enemy-side VFX event onto the combat bus (mirrors the player-side
 * `attachSpellEffect` in spells/helpers, kept local to avoid an import cycle
 * through the attack barrel). The SpellEffectLayer renders the matching
 * bespoke effect (see SpellEffect.tsx — enemy-vfx section).
 */
function attachEnemyEffect(
  state: CombatState,
  kind: SpellEffectKind,
  attackerId: string,
  targetId?: string,
): CombatState {
  const next = (state.spellEffectCounter ?? 0) + 1;
  return {
    ...state,
    spellEffectCounter: next,
    spellEffectEvent: { id: next, kind, attackerId, targetId },
  };
}

function debuffEffectKind(condition: ConditionName): SpellEffectKind | undefined {
  switch (condition) {
    case 'poisoned':
      return 'debuff-poison';
    case 'frightened':
      return 'debuff-frighten';
    case 'blinded':
      return 'debuff-blind';
    case 'weakened':
      return 'debuff-weaken';
    case 'restrained':
      return 'debuff-restrain';
    default:
      return undefined;
  }
}

/**
 * Monster takes its turn. Picks an action (the monster-side AI) and resolves
 * it, then centrally marks the action used and evaluates combat end. Half-pure:
 * returns new state + character, never mutates the inputs.
 */
export function monsterAttack(
  ctx: AttackContext,
  attackerId: string,
): CombatActionResult {
  const { roller, character, state } = ctx;
  const attacker = findCombatant(state, attackerId);
  if (!attacker || attacker.kind !== 'monster') return combatResult(state, character);

  // Paralyzed monster: tick down its own duration and lose the action. No save
  // (Wizard spends a 2nd-level slot for a guaranteed shutdown).
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
        patchMonsterInstance(state, attackerId, (inst) => ({
          ...inst,
          conditions: updatedConditions,
          actionEconomy: { ...inst.actionEconomy, actionUsed: true },
        })),
        {
          id: nextLogId(state),
          kind: 'system',
          text: expired
            ? `${attacker.instance.displayName} shakes off the binding.`
            : `${attacker.instance.displayName} is paralyzed — the turn is lost.`,
        },
      ),
      character,
    );
  }

  const monsterDef = getMonster(attacker.instance.defId);
  // Resolve the telegraphed action (selected ahead of the player's turn), so
  // what happens equals the intent the player saw. Falls back to a fresh pick
  // for an add summoned mid-round that has no intent yet.
  const action = resolveIntentAction(monsterDef, attacker.instance, state, character);

  let result: { state: CombatState; character: Character };
  switch (action.kind) {
    case 'paralyze':
      result = monsterCastParalyze(
        state,
        attackerId,
        attacker.instance.displayName,
        character,
        roller,
        action,
      );
      break;
    case 'debuff':
      result = monsterCastDebuff(
        state,
        attackerId,
        attacker.instance.displayName,
        character,
        roller,
        action,
      );
      break;
    case 'summon':
      result = monsterSummon(state, attackerId, character, action);
      break;
    case 'sustain':
      result = monsterSustain(state, attackerId, character, roller, action);
      break;
    case 'multiattack':
      result = monsterMultiattack(state, attackerId, character, roller);
      break;
    case 'attack':
      result = resolveSingleAttack(state, character, attackerId, action, roller);
      break;
    default:
      result = { state, character };
  }

  const marked = markMonsterActionUsed(result.state, attackerId);
  // Re-pick this monster's intent now that the turn's action is spent (the
  // next player-turn refresh re-plans all of them, but this keeps the badge
  // honest during the rest of the monster phase). Clear it if it just died.
  const repicked = repickActingIntent(marked, attackerId, result.character);
  const ended = evaluateCombatEnd(repicked, result.character);
  return combatResult(ended.state, ended.character);
}

/** Re-select the just-acted monster's intent (or clear it if it's now dead). */
function repickActingIntent(
  state: CombatState,
  attackerId: string,
  character: Readonly<Character>,
): CombatState {
  const live = state.combatants.find(
    (c): c is MonsterCombatant => c.id === attackerId && c.kind === 'monster',
  );
  if (!live) return state;
  if (live.instance.hp.current <= 0) {
    return live.instance.intent
      ? patchMonsterInstance(state, attackerId, (inst) => ({ ...inst, intent: undefined }))
      : state;
  }
  const intent = selectMonsterIntent(live.instance, state, character);
  return patchMonsterInstance(state, attackerId, (inst) => ({ ...inst, intent }));
}

function bumpActionState(
  instance: MonsterInstance,
  name: string,
  round: number,
): MonsterInstance['actionState'] {
  const prev = instance.actionState?.[name];
  return {
    ...(instance.actionState ?? {}),
    [name]: { uses: (prev?.uses ?? 0) + 1, lastRound: round },
  };
}

function markMonsterActionUsed(state: CombatState, attackerId: string): CombatState {
  return patchMonsterInstance(state, attackerId, (inst) => ({
    ...inst,
    actionEconomy: { ...inst.actionEconomy, actionUsed: true },
  }));
}

/**
 * Resolve ONE monster attack against the player. Does NOT mark the action used
 * or evaluate combat end — the caller (monsterAttack / monsterMultiattack)
 * centralizes that so a multiattack only spends one action and ends combat once.
 */
function resolveSingleAttack(
  state: CombatState,
  character: Readonly<Character>,
  attackerId: string,
  action: MonsterAttack,
  roller: DiceRoller,
): { state: CombatState; character: Character } {
  let nextCharacter: Character = character;
  const attacker = findCombatant(state, attackerId);
  if (!attacker || attacker.kind !== 'monster') return { state, character: nextCharacter };
  const monsterDef = getMonster(attacker.instance.defId);

  // Ranged "kept at range" payoff: the first enemy attack of the fight resolves
  // at disadvantage while the player wields a bow. Read the flag here and spend
  // it on this swing (whether it lands or not) by carrying the cleared value
  // forward in workingState — so a multiattack only gets the one disadvantaged
  // strike.
  const rangedEvasion = (state.rangedEvasionRemaining ?? 0) > 0;

  // Battle Rage transition: any monster carrying the mechanic flips to rage the
  // first turn it is at/below half HP. Subsequent swings read the flag.
  let workingState: CombatState = rangedEvasion
    ? { ...state, rangedEvasionRemaining: 0 }
    : state;
  const bloodied = attacker.instance.hp.current * 2 <= attacker.instance.hp.max;
  const hasBattleRage = monsterDef.bossMechanic === 'battle-rage';
  const enteringRage = hasBattleRage && bloodied && !attacker.instance.bossRageActive;
  if (enteringRage) {
    workingState = patchMonsterInstance(workingState, attackerId, (inst) => ({
      ...inst,
      bossRageActive: true,
    }));
    workingState = appendLog(workingState, {
      id: nextLogId(workingState),
      kind: 'system',
      text: `${attacker.instance.displayName} enters Battle Rage — +2 damage per hit.`,
    });
    workingState = attachEnemyEffect(workingState, 'enemy-frenzy', attackerId);
  }
  const raging =
    hasBattleRage && (enteringRage || attacker.instance.bossRageActive === true);

  const playerParalyzed = isPlayerParalyzed(nextCharacter);
  const condMods = playerConditionMods(nextCharacter);
  const playerVulnerable = playerParalyzed || condMods.grantsAttackerAdvantage;

  const ac = computeAC(nextCharacter);
  // Advantage/disadvantage sources net per 5e cancellation: any advantage plus
  // any disadvantage is a straight roll. Advantage comes from a vulnerable
  // player (paralyzed / blinded / restrained) or a Barbarian fighting
  // recklessly; disadvantage from Blur smearing the player's outline.
  const blurActive = (nextCharacter.resources.blurRoundsRemaining ?? 0) > 0;
  const recklessPlayer = nextCharacter.recklessActive === true;
  const hasAdvantage = playerVulnerable || recklessPlayer;
  const hasDisadvantage = blurActive || rangedEvasion;
  const attackAdvantage: 'normal' | 'advantage' | 'disadvantage' =
    hasAdvantage && hasDisadvantage
      ? 'normal'
      : hasAdvantage
        ? 'advantage'
        : hasDisadvantage
          ? 'disadvantage'
          : 'normal';
  const toHit = roller.d20(attackAdvantage, action.attackBonus);
  const crit = toHit.rolls[0] === 20;
  let hit = crit || (toHit.total >= ac && !toHit.natural1);

  const advantageNote =
    attackAdvantage === 'advantage'
      ? playerParalyzed
        ? ' (advantage — paralyzed)'
        : recklessPlayer
          ? ' (advantage — reckless)'
          : ' (advantage — player exposed)'
      : attackAdvantage === 'disadvantage'
        ? blurActive
          ? ' (disadvantage — Blur)'
          : ' (disadvantage — kept at range)'
        : '';
  workingState = appendLog(workingState, {
    id: nextLogId(workingState),
    kind: 'roll',
    text: `${attacker.instance.displayName} attacks ${nextCharacter.name} with ${action.name}. d20${action.attackBonus >= 0 ? '+' : ''}${action.attackBonus} = ${toHit.total} vs AC ${ac} ${crit ? '— CRITICAL HIT' : hit ? '— hit' : '— miss'}${advantageNote}.`,
  });

  // Shield reaction (wizard): a non-crit hit that Shield would flip to a miss
  // burns a level-1 slot + reaction. Crits bypass Shield.
  if (hit && !crit) {
    const triggered = tryShieldReaction(nextCharacter, workingState, ac, toHit.total);
    if (triggered) {
      workingState = triggered.state;
      nextCharacter = triggered.character;
      hit = false;
    }
  }

  // Mirror Image: a landing blow meets the duplicates. The attacker first rolls
  // to see through one illusion (flat illusion DC). On a success it picks out the
  // real wizard — a duplicate still collapses, but the blow lands. On a failure
  // the blow is wasted on a harmless afterimage (full soak, as before). Either
  // way one image is spent, so the screen erodes instead of granting immunity.
  if (hit && (nextCharacter.resources.mirrorImages ?? 0) > 0) {
    const remaining = (nextCharacter.resources.mirrorImages ?? 0) - 1;
    nextCharacter = patchResources(nextCharacter, { mirrorImages: remaining });
    const sawThrough = roller.d20().total >= MIRROR_IMAGE_SEE_THROUGH_DC;
    const remainNote =
      remaining > 0
        ? ` ${remaining} image${remaining === 1 ? '' : 's'} remain.`
        : ' No images remain.';
    if (sawThrough) {
      workingState = appendLog(workingState, {
        id: nextLogId(workingState),
        kind: 'system',
        text: `${attacker.instance.displayName} sees past the flicker and strikes the true ${nextCharacter.name} — a duplicate collapses all the same.${remainNote}`,
      });
    } else {
      hit = false;
      workingState = appendLog(workingState, {
        id: nextLogId(workingState),
        kind: 'system',
        text: `A flickering duplicate shatters — the blow finds only afterimage.${remainNote}`,
      });
    }
  }

  const attackEvent: AttackEvent = {
    id: state.attackEventCounter + 1,
    attackerName: attacker.instance.displayName,
    targetName: nextCharacter.name,
    attackerKind: 'monster',
    attackerId,
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
    const ascensionBonus = attacker.instance.bonusDamage ?? 0;
    // Wither (8th wizard) leaves a monster 'weakened' — a flat cut to its OWN
    // outgoing damage (the one self-debuff the monster turn reads against
    // itself). A landed hit still grazes for at least 1.
    const selfWeakened = attacker.instance.conditions
      .filter((c) => c.name === 'weakened')
      .reduce((sum, c) => sum + (c.level ?? DEFAULT_WEAKENED_AMOUNT), 0);
    const rawBeforeWeaken =
      damageRoll.total + damageExpr.modifier + rageBonus + ascensionBonus;
    const rawDamage =
      selfWeakened > 0 ? Math.max(1, rawBeforeWeaken - selfWeakened) : rawBeforeWeaken;

    const quirkMods = characterQuirkMods(nextCharacter);
    const immune =
      action.damageType === 'poison' &&
      (quirkMods.poisonImmune === true || nextCharacter.poisonImmuneEncounter === true);
    const race = getRace(nextCharacter.raceId);
    const raceResists = race.damageResistances?.includes(action.damageType) ?? false;
    // Barbarian Rage halves physical damage (bludgeoning / piercing / slashing).
    // Resistance doesn't stack (5e), so rage and a racial resist both just halve.
    const physical =
      action.damageType === 'bludgeoning' ||
      action.damageType === 'piercing' ||
      action.damageType === 'slashing';
    const rageResists = isRaging(nextCharacter) && physical;
    // Armour resist affix (Salamander / Frostward): halve a matching type.
    const affixResists = characterAffixMods(nextCharacter).resists.includes(action.damageType);
    const resisted = !immune && (raceResists || rageResists || affixResists);
    const totalDamage = immune
      ? 0
      : resisted
        ? Math.floor(rawDamage / 2)
        : rawDamage;

    const damaged = applyDamage(nextState, 'player', totalDamage, nextCharacter);
    nextState = damaged.state;
    nextCharacter = damaged.character;
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
    if (ascensionBonus > 0) breakdown.push(`+ ${ascensionBonus} ascension`);
    const resistSuffix = resisted
      ? rageResists && !raceResists
        ? ' (rage — physical halved)'
        : ` (${action.damageType} resistance, halved)`
      : '';
    const damageLine = immune
      ? `Damage negated: ${nextCharacter.name} is immune to ${action.damageType}.`
      : `Damage: ${totalDamage} ${action.damageType} (${breakdown.join(' ')})${resistSuffix}.`;
    nextState = appendLog(nextState, {
      id: nextLogId(nextState),
      kind: 'damage',
      text: damageLine,
    });

    // Life-drain: the attacker heals for a fraction of damage dealt, capped at
    // its max HP. Reads the live instance from state (HP may already be patched).
    if (action.lifeDrain && totalDamage > 0) {
      const healed = Math.floor(totalDamage * action.lifeDrain);
      if (healed > 0) {
        const live = nextState.combatants.find(
          (c): c is MonsterCombatant => c.id === attackerId && c.kind === 'monster',
        );
        if (live && live.instance.hp.current > 0) {
          const before = live.instance.hp.current;
          const after = Math.min(live.instance.hp.max, before + healed);
          if (after > before) {
            nextState = patchMonsterInstance(nextState, attackerId, (inst) => ({
              ...inst,
              hp: { ...inst.hp, current: after },
            }));
            nextState = appendLog(nextState, {
              id: nextLogId(nextState),
              kind: 'system',
              text: `${live.instance.displayName} drains ${after - before} HP from the wound.`,
            });
            nextState = attachEnemyEffect(nextState, 'sustain-drain', attackerId, 'player');
          }
        }
      }
    }
  }

  return { state: nextState, character: nextCharacter };
}

function monsterMultiattack(
  state: CombatState,
  attackerId: string,
  character: Readonly<Character>,
  roller: DiceRoller,
): { state: CombatState; character: Character } {
  const attacker = findCombatant(state, attackerId);
  if (!attacker || attacker.kind !== 'monster') return { state, character: character as Character };
  const monsterDef = getMonster(attacker.instance.defId);
  const multi = monsterDef.actions.find((a) => a.kind === 'multiattack');
  const attack = monsterDef.actions.find((a): a is MonsterAttack => a.kind === 'attack');
  if (!multi || multi.kind !== 'multiattack' || !attack) {
    // Malformed (multiattack with no attack to repeat) — fall back to one swing.
    return attack
      ? resolveSingleAttack(state, character, attackerId, attack, roller)
      : { state, character: character as Character };
  }

  let workingState = attachEnemyEffect(state, 'multiattack-flurry', attackerId, 'player');
  let workingChar: Character = character as Character;
  for (let i = 0; i < multi.attacks; i++) {
    if (workingChar.hp.current <= 0) break;
    const r = resolveSingleAttack(workingState, workingChar, attackerId, attack, roller);
    workingState = r.state;
    workingChar = r.character;
  }
  return { state: workingState, character: workingChar };
}

function monsterSummon(
  state: CombatState,
  attackerId: string,
  character: Readonly<Character>,
  action: MonsterSummon,
): { state: CombatState; character: Character } {
  const attacker = state.combatants.find(
    (c): c is MonsterCombatant => c.id === attackerId && c.kind === 'monster',
  );
  if (!attacker) return { state, character: character as Character };
  const summonDef = getMonster(action.summonDefId);

  let count = action.count ?? 1;
  if (action.maxActive !== undefined) {
    const alive = liveMonsters(state).filter(
      (c) => c.instance.defId === action.summonDefId,
    ).length;
    count = Math.max(0, Math.min(count, action.maxActive - alive));
  }
  if (count <= 0) {
    // Nothing to summon (cap already met) — bump cooldown so the picker doesn't
    // spin on this action, but otherwise no-op.
    return {
      state: patchMonsterInstance(state, attackerId, (inst) => ({
        ...inst,
        actionState: bumpActionState(inst, action.name, state.round),
      })),
      character: character as Character,
    };
  }

  const existing = state.combatants.filter(
    (c) => c.kind === 'monster' && c.instance.defId === summonDef.id,
  ).length;
  const bonusDamage = attacker.instance.bonusDamage;

  const newCombatants: MonsterCombatant[] = [];
  for (let i = 0; i < count; i++) {
    const suffix = String.fromCharCode(65 + existing + i);
    const displayName = `${summonDef.name} ${suffix}`;
    const instance = spawnMonsterInstance(summonDef, displayName);
    newCombatants.push({
      kind: 'monster',
      id: instance.id,
      instance: bonusDamage ? { ...instance, bonusDamage } : instance,
    });
  }

  let nextState: CombatState = {
    ...state,
    combatants: [...state.combatants, ...newCombatants],
    turnOrder: [...state.turnOrder, ...newCombatants.map((c) => c.id)],
  };
  nextState = patchMonsterInstance(nextState, attackerId, (inst) => ({
    ...inst,
    actionState: bumpActionState(inst, action.name, state.round),
  }));
  nextState = appendLog(nextState, {
    id: nextLogId(nextState),
    kind: 'system',
    text: `${attacker.instance.displayName} calls ${count > 1 ? `${count} ${summonDef.name}s` : `a ${summonDef.name}`} into the fight.`,
  });
  // Anchor the rift on the first new add's slot (it's already in nextState's
  // combatants/turnOrder, so the layer resolves its battlefield position).
  nextState = attachEnemyEffect(nextState, 'enemy-summon', attackerId, newCombatants[0].id);
  return { state: nextState, character: character as Character };
}

function monsterSustain(
  state: CombatState,
  attackerId: string,
  character: Readonly<Character>,
  roller: DiceRoller,
  action: MonsterSustain,
): { state: CombatState; character: Character } {
  const attacker = state.combatants.find(
    (c): c is MonsterCombatant => c.id === attackerId && c.kind === 'monster',
  );
  if (!attacker) return { state, character: character as Character };

  const target =
    (action.target ?? 'self') === 'self'
      ? attacker
      : pickAllyTarget(state, attackerId, action);
  if (!target) {
    return {
      state: patchMonsterInstance(state, attackerId, (inst) => ({
        ...inst,
        actionState: bumpActionState(inst, action.name, state.round),
      })),
      character: character as Character,
    };
  }

  const healAmount = action.heal ? roller.roll(action.heal).total : 0;
  let nextState = patchMonsterInstance(state, target.id, (inst) => {
    const current = Math.min(inst.hp.max, inst.hp.current + healAmount);
    const temp =
      action.wardTempHp !== undefined ? Math.max(inst.hp.temp, action.wardTempHp) : inst.hp.temp;
    return { ...inst, hp: { ...inst.hp, current, temp } };
  });
  nextState = patchMonsterInstance(nextState, attackerId, (inst) => ({
    ...inst,
    actionState: bumpActionState(inst, action.name, state.round),
  }));

  const parts: string[] = [];
  if (healAmount > 0) {
    const subject = target.id === attackerId ? 'itself' : target.instance.displayName;
    parts.push(`heals ${subject} for ${healAmount}`);
  }
  if (action.wardTempHp !== undefined) {
    const subject = target.id === attackerId ? 'itself' : target.instance.displayName;
    parts.push(`shields ${subject} with ${action.wardTempHp} temp HP`);
  }
  nextState = appendLog(nextState, {
    id: nextLogId(nextState),
    kind: 'system',
    text: `${attacker.instance.displayName} uses ${action.name}${parts.length ? ` — ${parts.join(' and ')}` : ''}.`,
  });
  // Heal up-glow takes precedence; a ward-only action shows the bubble instead.
  if (healAmount > 0) {
    nextState = attachEnemyEffect(nextState, 'sustain-heal', attackerId, target.id);
  } else if (action.wardTempHp !== undefined) {
    nextState = attachEnemyEffect(nextState, 'sustain-ward', attackerId, target.id);
  }
  return { state: nextState, character: character as Character };
}

function debuffFlavor(condition: ConditionName): string {
  switch (condition) {
    case 'poisoned':
      return 'is wracked with poison — attacks at disadvantage';
    case 'frightened':
      return 'is gripped by fear — attacks at disadvantage';
    case 'blinded':
      return 'is blinded — attacks at disadvantage, and is easier to hit';
    case 'restrained':
      return 'is caught fast — attacks at disadvantage, and is easier to hit';
    case 'weakened':
      return 'is weakened — their blows fall softer';
    default:
      return `is afflicted (${condition})`;
  }
}

function monsterCastDebuff(
  state: CombatState,
  attackerId: string,
  attackerName: string,
  character: Readonly<Character>,
  roller: DiceRoller,
  action: MonsterDebuff,
): { state: CombatState; character: Character } {
  let nextCharacter: Character = character;
  const save = rollPlayerSave(roller, nextCharacter, action.saveAbility, action.saveDC);
  nextCharacter = save.character;

  const logEntries: CombatLogEntry[] = [];
  logEntries.push({
    id: nextLogId(state),
    kind: 'roll',
    text: `${attackerName} uses ${action.name}. ${nextCharacter.name} ${action.saveAbility.toUpperCase()} save${save.advantage ? ' (advantage)' : ''}: d20${save.mod >= 0 ? '+' : ''}${save.mod} = ${save.total} vs DC ${action.saveDC} — ${save.success ? 'success' : 'fail'}.`,
  });

  if (!save.success) {
    nextCharacter = applyPlayerCondition(nextCharacter, {
      name: action.condition,
      rounds: action.durationRounds,
      saveDC: action.saveDC,
      saveAbility: action.saveAbility,
      source: attackerId,
      level:
        action.condition === 'weakened'
          ? (action.amount ?? DEFAULT_WEAKENED_AMOUNT)
          : undefined,
    });
    logEntries.push({
      id: nextLogId(state) + 1,
      kind: 'system',
      text: `${nextCharacter.name} ${debuffFlavor(action.condition)}.`,
    });
  } else {
    logEntries.push({
      id: nextLogId(state) + 1,
      kind: 'system',
      text: `${nextCharacter.name} resists ${action.name}.`,
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
  nextState = { ...nextState, saveEventCounter: saveEventId, lastSave: saveEvent };
  // Telegraph the affliction only when it actually lands (save failed).
  if (!save.success) {
    const effectKind = debuffEffectKind(action.condition);
    if (effectKind) {
      nextState = attachEnemyEffect(nextState, effectKind, attackerId, 'player');
    }
  }
  return { state: nextState, character: nextCharacter };
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
 * against the spell's DC; on a fail, applies the paralyzed condition. No damage.
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
  return { state: nextState, character: nextCharacter };
}
