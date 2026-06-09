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
  Monster,
  MonsterAction,
  MonsterAttack,
  MonsterDebuff,
  MonsterSummon,
  MonsterSustain,
} from '../../../schemas/monster';
import type { ConditionName } from '../../../types/conditions';
import { computeAC, isRaging, characterHasMechanic } from '../../character/derived';
import { wearsHeavierThanLight, rageBrokenByArmor } from '../../character/equip';
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
import { applyAscensionToMonster } from '../../delve/ascension';
import {
  effectiveActionsPerTurn,
  effectiveMonsterActions,
  liveMonsters,
  pickAllyTarget,
  pickMonsterAction,
  resolveIntentAction,
  selectMonsterIntent,
} from './monsterIntent';
import { tryShieldReaction } from '../spells/shield';
import { MIRROR_IMAGE_SEE_THROUGH_DC } from '../spells/mirrorImage';
import {
  combatResult,
  patchActionEconomy,
  patchResources,
  type CombatActionResult,
} from '../types';
import { appendLog } from '../log';
import { applyDamage, evaluateCombatEnd, nextLogId } from './damage';
import { sneakAttackDiceForLevel } from './playerAttack';
import { t, getLocalized, getLocalizedMonsterActionName } from '../../../i18n';
import type { AttackContext } from './playerAttack';

// Nimble Dodge: a low-level Rogue reads the first strike of the round and slips
// it, imposing disadvantage. Fades at level 5 when the real Uncanny Dodge (a
// damage halve) comes online — see attack/damage.ts (UNCANNY_DODGE_LEVEL = 5).
const NIMBLE_DODGE_MAX_LEVEL = 4;

/** Rogue Opportunist (L12): a foe that swings and misses opens itself to a
 *  reaction Sneak-Attack jab — half the rogue's Sneak dice (a conservative
 *  second burst, not a full Sneak), once per round. */
function opportunistRiposteDice(level: number): number {
  return Math.max(1, Math.ceil(sneakAttackDiceForLevel(level) / 2));
}

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

function monsterInstanceOf(state: CombatState, id: string): MonsterInstance | undefined {
  const c = state.combatants.find(
    (x): x is MonsterCombatant => x.id === id && x.kind === 'monster',
  );
  return c?.instance;
}

/**
 * The DISPLAY name for a monster action, localized through the attacker's def.
 * The English `action.name` stays the stable engine key (charge refs,
 * kill-tracking); only the text shown in the log is localized here.
 */
function locAction(state: CombatState, attackerId: string, englishName: string): string {
  const inst = monsterInstanceOf(state, attackerId);
  return inst ? getLocalizedMonsterActionName(inst.defId, englishName) : englishName;
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
 * boss-framework: evaluate HP-threshold phase transitions at the boss's turn
 * start. Each phase fires AT MOST once, the first turn the boss is at or below
 * its `atHpPctBelow` threshold; on entry it can raise actions-per-turn, enrage
 * (flat damage and/or an AC swing), and flip the `transformed` flag. Phase-added
 * actions are re-derived from the def via the entered-index list, so only the
 * indices are stored here. A monster with no `phases` is a no-op pass-through.
 */
function applyPhaseTransitions(
  state: CombatState,
  attackerId: string,
  def: Monster,
): CombatState {
  if (!def.phases?.length) return state;
  let s = state;
  for (let idx = 0; idx < def.phases.length; idx++) {
    const inst = monsterInstanceOf(s, attackerId);
    if (!inst || inst.hp.current <= 0) break;
    if (inst.phasesEntered?.includes(idx)) continue;
    const phase = def.phases[idx];
    // Enter when current HP is at or below the threshold percent of max.
    if (inst.hp.current * 100 > phase.atHpPctBelow * inst.hp.max) continue;
    s = patchMonsterInstance(s, attackerId, (i) => {
      const entered = [...(i.phasesEntered ?? []), idx];
      const apt = Math.max(
        i.actionsPerTurn ?? def.actionsPerTurn ?? 1,
        phase.actionsPerTurn ?? 1,
      );
      const phaseDamageBonus = (i.phaseDamageBonus ?? 0) + (phase.bonusDamage ?? 0);
      const ac = phase.acDelta ? Math.max(1, i.ac + phase.acDelta) : i.ac;
      return {
        ...i,
        phasesEntered: entered,
        actionsPerTurn: apt,
        ac,
        ...(phaseDamageBonus !== 0 ? { phaseDamageBonus } : {}),
        ...(phase.transform ? { transformed: true } : {}),
      };
    });
    const label = phase.name ? ` — ${phase.name}` : '';
    s = appendLog(s, {
      id: nextLogId(s),
      kind: 'system',
      text: phase.enterText ?? t('combat.log.phaseSurge', { name: inst.displayName, label }),
    });
    s = attachEnemyEffect(s, 'enemy-frenzy', attackerId);
  }
  return s;
}

/**
 * boss-framework: begin charging a telegraphed special. No effect lands this
 * turn — the monster winds up, the charge is logged + flashed, and a pending
 * marker is parked on the instance to resolve on its next turn. Winding up is
 * full focus, so the caller ends the monster's turn here.
 */
function beginTelegraphCharge(
  state: CombatState,
  attackerId: string,
  displayName: string,
  action: MonsterAction,
): CombatState {
  let s = patchMonsterInstance(state, attackerId, (i) => ({
    ...i,
    pendingTelegraph: {
      actionKind: action.kind,
      actionName: action.name,
      resolveOnRound: state.round + (action.telegraph?.windUpRounds ?? 1),
    },
  }));
  s = appendLog(s, {
    id: nextLogId(s),
    kind: 'system',
    text:
      action.telegraph?.chargeText ??
      t('combat.log.telegraphCharge', { name: displayName, action: locAction(state, attackerId, action.name) }),
  });
  return attachEnemyEffect(s, 'enemy-frenzy', attackerId);
}

/** boss-framework: clear the pending charge and announce the special as it lands. */
function clearTelegraphAndAnnounce(
  state: CombatState,
  attackerId: string,
  ref: NonNullable<MonsterInstance['pendingTelegraph']>,
): CombatState {
  const inst = monsterInstanceOf(state, attackerId);
  const s = patchMonsterInstance(state, attackerId, (i) => ({
    ...i,
    pendingTelegraph: undefined,
  }));
  return appendLog(s, {
    id: nextLogId(s),
    kind: 'system',
    text: t('combat.log.chargedUnleash', {
      name: inst?.displayName ?? t('combat.log.theEnemy'),
      action: inst ? getLocalizedMonsterActionName(inst.defId, ref.actionName) : ref.actionName,
    }),
  });
}

/**
 * boss-framework: cancel a charging special when the monster loses its turn to
 * hard control (paralyze / stun / knockdown). The wind-up collapses uncast — the
 * payoff for shutting the boss down in its reactive window.
 */
function cancelChargeIfAny(state: CombatState, attackerId: string): CombatState {
  const inst = monsterInstanceOf(state, attackerId);
  const pending = inst?.pendingTelegraph;
  if (!inst || !pending) return state;
  const cleared = patchMonsterInstance(state, attackerId, (i) => ({
    ...i,
    pendingTelegraph: undefined,
  }));
  return appendLog(cleared, {
    id: nextLogId(cleared),
    kind: 'system',
    text: t('combat.log.chargeCollapse', { name: inst.displayName, action: getLocalizedMonsterActionName(inst.defId, pending.actionName) }),
  });
}

/**
 * Monster takes its turn. Picks an action (the monster-side AI) and resolves
 * it, then centrally marks the action used and evaluates combat end. Half-pure:
 * returns new state + character, never mutates the inputs.
 *
 * boss-framework: a turn now resolves `actionsPerTurn` actions in sequence
 * (default 1 — identical to before); HP-threshold phases are evaluated up front;
 * a telegraphed action spends the turn charging and resolves on the next.
 */
export function monsterAttack(
  ctx: AttackContext,
  attackerId: string,
): CombatActionResult {
  const { roller, character, state } = ctx;
  const attacker = findCombatant(state, attackerId);
  if (!attacker || attacker.kind !== 'monster') return combatResult(state, character);

  // Staggered (Barbarian Knockdown): the foe is on the ground — tick the counter
  // and lose the action. No save; the fury put it down.
  if ((attacker.instance.staggeredTurns ?? 0) > 0) {
    const remaining = (attacker.instance.staggeredTurns ?? 0) - 1;
    let lostState = appendLog(
      patchMonsterInstance(state, attackerId, (inst) => ({
        ...inst,
        staggeredTurns: remaining,
        actionEconomy: { ...inst.actionEconomy, actionUsed: true },
      })),
      {
        id: nextLogId(state),
        kind: 'system',
        text: t('combat.log.knockedDown', { name: attacker.instance.displayName }),
      },
    );
    lostState = cancelChargeIfAny(lostState, attackerId);
    return combatResult(lostState, character);
  }

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
    let lostState = appendLog(
      patchMonsterInstance(state, attackerId, (inst) => ({
        ...inst,
        conditions: updatedConditions,
        actionEconomy: { ...inst.actionEconomy, actionUsed: true },
      })),
      {
        id: nextLogId(state),
        kind: 'system',
        text: expired
          ? t('combat.log.shakeOffBinding', { name: attacker.instance.displayName })
          : t('combat.log.paralyzedLost', { name: attacker.instance.displayName }),
      },
    );
    lostState = cancelChargeIfAny(lostState, attackerId);
    return combatResult(lostState, character);
  }

  // Restrained (Druid Entangle): grasping roots hold the foe fast — tick its own
  // duration and lose the action, just like paralyzed. At Entangle's 1-round
  // duration this is a single skipped turn: the foe wrenches free as it spends
  // the turn. No save (the slot already bought the root on a failed STR save).
  const restrained = attacker.instance.conditions.find((c) => c.name === 'restrained');
  if (restrained && restrained.duration.kind === 'rounds') {
    const next = restrained.duration.value - 1;
    const expired = next <= 0;
    const updatedConditions = expired
      ? attacker.instance.conditions.filter((c) => c.name !== 'restrained')
      : attacker.instance.conditions.map((c) =>
          c.name === 'restrained'
            ? { ...c, duration: { kind: 'rounds' as const, value: next } }
            : c,
        );
    let lostState = appendLog(
      patchMonsterInstance(state, attackerId, (inst) => ({
        ...inst,
        conditions: updatedConditions,
        actionEconomy: { ...inst.actionEconomy, actionUsed: true },
      })),
      {
        id: nextLogId(state),
        kind: 'system',
        text: expired
          ? t('combat.log.rootedFree', { name: attacker.instance.displayName })
          : t('combat.log.rootedHeld', { name: attacker.instance.displayName }),
      },
    );
    lostState = cancelChargeIfAny(lostState, attackerId);
    return combatResult(lostState, character);
  }

  const monsterDef = getMonster(attacker.instance.defId);

  // boss-framework: evaluate HP-threshold phases at turn start (each once) —
  // they may raise actions-per-turn, enrage, swing AC, or flip the transform.
  // Reset the per-turn attack-event batch here: this turn may resolve several
  // swings (multiattack / multi-action) inside one atomic commit, and the UI
  // drains this batch so every swing floats its own number, not just the last.
  const phasedState: CombatState = {
    ...applyPhaseTransitions(state, attackerId, monsterDef),
    attackEvents: [],
  };
  const startInstance = monsterInstanceOf(phasedState, attackerId);
  const actionsPerTurn = startInstance
    ? effectiveActionsPerTurn(monsterDef, startInstance)
    : 1;
  const startedWithPending = !!startInstance?.pendingTelegraph;

  let result: { state: CombatState; character: Character } = {
    state: phasedState,
    character: character as Character,
  };
  // The ascension extra-phase re-fires whatever the boss actually DID, so track
  // the last action that resolved (a charge resolves nothing — leaves this unset).
  let lastResolvedAction: MonsterAction | undefined;
  let pendingResolved = false;

  for (let slot = 0; slot < actionsPerTurn; slot++) {
    if (result.state.status !== 'active') break;
    if (result.character.hp.current <= 0) break;
    const inst = monsterInstanceOf(result.state, attackerId);
    if (!inst || inst.hp.current <= 0) break;

    // 1) A special charged on a prior turn resolves first — the wind-up the
    //    player has had a full turn to read and react to.
    if (startedWithPending && !pendingResolved && inst.pendingTelegraph) {
      const ref = inst.pendingTelegraph;
      pendingResolved = true;
      result = {
        state: clearTelegraphAndAnnounce(result.state, attackerId, ref),
        character: result.character,
      };
      const charged = effectiveMonsterActions(monsterDef, inst).find(
        (a) => a.kind === ref.actionKind && a.name === ref.actionName,
      );
      if (!charged) continue; // the action was phased out — the charge lapses
      // Open the Evasion window: a Rogue with Evasion halves this telegraphed
      // payoff (read in applyDamage). Closed again immediately after so ordinary
      // hits this turn aren't affected.
      const chargedResolved = resolveMonsterChosenAction(
        { ...result.state, evasionWindowActive: true },
        result.character,
        attackerId,
        inst.displayName,
        charged,
        roller,
      );
      result = {
        state: { ...chargedResolved.state, evasionWindowActive: false },
        character: chargedResolved.character,
      };
      lastResolvedAction = charged;
      continue;
    }

    // 2) Pick this slot's action. The first slot honors the telegraphed intent
    //    the player saw; later slots (multi-action bosses) pick fresh.
    const action =
      slot === 0
        ? resolveIntentAction(monsterDef, inst, result.state, result.character)
        : pickMonsterAction(
            effectiveMonsterActions(monsterDef, inst),
            inst,
            result.state,
            result.character,
          );

    // 3) A telegraphed action spends the whole turn CHARGING — it lands next
    //    turn instead, giving the player a window to race / mitigate / cancel it.
    if (action.telegraph) {
      result = {
        state: beginTelegraphCharge(result.state, attackerId, inst.displayName, action),
        character: result.character,
      };
      break;
    }

    result = resolveMonsterChosenAction(
      result.state,
      result.character,
      attackerId,
      inst.displayName,
      action,
      roller,
    );
    lastResolvedAction = action;
  }

  // Ascension extra-phase (Asc >= 3): the first time a boss takes its turn
  // while bloodied it draws on a second wind and re-fires its action once.
  // Skipped on a charge-only turn — there is nothing yet to re-fire.
  if (lastResolvedAction) {
    result = maybeBossExtraPhase(result, attackerId, lastResolvedAction, roller);
  }

  // Intimidating Presence: the dread ebbs one round now that the foe has acted.
  const feared = tickActingMonsterFear(result.state, attackerId);
  const marked = markMonsterActionUsed(feared, attackerId);
  // Re-pick this monster's intent now that the turn's action is spent (the
  // next player-turn refresh re-plans all of them, but this keeps the badge
  // honest during the rest of the monster phase). Clear it if it just died.
  const repicked = repickActingIntent(marked, attackerId, result.character);
  const ended = evaluateCombatEnd(repicked, result.character);
  return combatResult(ended.state, ended.character);
}

/** Resolve a single chosen monster action through the per-kind handlers. */
function resolveMonsterChosenAction(
  state: CombatState,
  character: Readonly<Character>,
  attackerId: string,
  displayName: string,
  action: MonsterAction,
  roller: DiceRoller,
): { state: CombatState; character: Character } {
  switch (action.kind) {
    case 'paralyze':
      return monsterCastParalyze(state, attackerId, displayName, character, roller, action);
    case 'debuff':
      return monsterCastDebuff(state, attackerId, displayName, character, roller, action);
    case 'summon':
      return monsterSummon(state, attackerId, character, action);
    case 'sustain':
      return monsterSustain(state, attackerId, character, roller, action);
    case 'multiattack':
      return monsterMultiattack(state, attackerId, character, roller);
    case 'attack':
      return resolveSingleAttack(state, character, attackerId, action, roller);
    default:
      return { state, character: character as Character };
  }
}

/**
 * Ascension extra-phase second wind. When the primary boss of a high-ascension
 * room (armed at spawn — see createCombat) first acts while at or below half
 * HP, it spends one immediate extra action re-firing the move it just made,
 * then disarms so it triggers exactly once per fight. Skipped if the boss died
 * or the fight already ended on its main action. Generic: rides on whatever the
 * boss's signature action is, so it reads on any chapter boss with no per-boss
 * authoring.
 */
function maybeBossExtraPhase(
  result: { state: CombatState; character: Character },
  attackerId: string,
  action: MonsterAction,
  roller: DiceRoller,
): { state: CombatState; character: Character } {
  if (result.state.status !== 'active') return result;
  if (result.character.hp.current <= 0) return result;
  const boss = result.state.combatants.find(
    (c): c is MonsterCombatant => c.id === attackerId && c.kind === 'monster',
  );
  if (!boss || !boss.instance.bossExtraPhaseArmed) return result;
  const inst = boss.instance;
  const bloodied = inst.hp.current * 2 <= inst.hp.max;
  if (inst.hp.current <= 0 || !bloodied) return result;

  let state = patchMonsterInstance(result.state, attackerId, (i) => ({
    ...i,
    bossExtraPhaseArmed: false,
  }));
  state = appendLog(state, {
    id: nextLogId(state),
    kind: 'system',
    text: t('combat.log.bossSecondWind', { name: inst.displayName }),
  });
  state = attachEnemyEffect(state, 'enemy-frenzy', attackerId);
  return resolveMonsterChosenAction(
    state,
    result.character,
    attackerId,
    inst.displayName,
    action,
    roller,
  );
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
 * Berserker Intimidating Presence: tick the acting monster's `frightened` down
 * one round at the END of its turn (it attacked at disadvantage this turn —
 * see resolveSingleAttack), dropping the condition and logging when it lapses. A
 * dead monster is left alone. Only round-duration fear is ticked.
 */
function tickActingMonsterFear(state: CombatState, attackerId: string): CombatState {
  const inst = monsterInstanceOf(state, attackerId);
  if (!inst || inst.hp.current <= 0) return state;
  const fear = inst.conditions.find(
    (c) => c.name === 'frightened' && c.duration.kind === 'rounds',
  );
  if (!fear || fear.duration.kind !== 'rounds') return state;
  const next = fear.duration.value - 1;
  const expired = next <= 0;
  const ticked = patchMonsterInstance(state, attackerId, (i) => ({
    ...i,
    conditions: expired
      ? i.conditions.filter((c) => c.name !== 'frightened')
      : i.conditions.map((c) =>
          c.name === 'frightened'
            ? { ...c, duration: { kind: 'rounds' as const, value: next } }
            : c,
        ),
  }));
  return expired
    ? appendLog(ticked, {
        id: nextLogId(ticked),
        kind: 'system',
        text: t('combat.log.fearLifts', { name: inst.displayName }),
      })
    : ticked;
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
      text: t('combat.log.battleRage', { name: attacker.instance.displayName }),
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
  // Monk Patient Defense: the flowing guard makes the monk hard to hit until its
  // next turn — incoming attacks roll at disadvantage.
  const patientDefense = nextCharacter.patientDefenseActive === true;
  const recklessPlayer = nextCharacter.recklessActive === true;
  // Berserker Intimidating Presence: a frightened foe throws its blows wild —
  // disadvantage on its attack rolls until the dread ticks out (monsterAttack).
  const frightenedAttacker = attacker.instance.conditions.some((c) => c.name === 'frightened');
  // Nimble Dodge (Rogue L1-4): the first incoming attack each round resolves at
  // disadvantage as the rogue slips aside. Spends the reaction, so a second
  // swing that round lands clean. Refreshes when the rogue's turn comes back.
  // Off while pinned (paralyzed / blinded / restrained) — no footwork to give,
  // and it must not cancel the advantage those conditions grant the attacker.
  const nimbleDodge =
    nextCharacter.classId === 'rogue' &&
    nextCharacter.level <= NIMBLE_DODGE_MAX_LEVEL &&
    !nextCharacter.actionEconomy.reactionUsed &&
    !playerVulnerable &&
    !wearsHeavierThanLight(nextCharacter);
  const hasAdvantage = playerVulnerable || recklessPlayer;
  const hasDisadvantage =
    blurActive || rangedEvasion || nimbleDodge || patientDefense || frightenedAttacker;
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
        ? t('combat.log.advParalyzed')
        : recklessPlayer
          ? t('combat.log.advReckless')
          : t('combat.log.advExposed')
      : attackAdvantage === 'disadvantage'
        ? blurActive
          ? t('combat.log.disBlur')
          : rangedEvasion
            ? t('combat.log.disRange')
            : patientDefense
              ? t('combat.log.disPatient')
              : frightenedAttacker
                ? t('combat.log.disFrightened')
                : t('combat.log.disNimble')
        : '';
  workingState = appendLog(workingState, {
    id: nextLogId(workingState),
    kind: 'roll',
    source: 'enemy',
    text: t('combat.log.monsterAttackRoll', {
      name: attacker.instance.displayName,
      target: nextCharacter.name,
      action: getLocalizedMonsterActionName(attacker.instance.defId, action.name),
      mod: `${action.attackBonus >= 0 ? '+' : ''}${action.attackBonus}`,
      total: toHit.total,
      ac,
      result: `— ${crit ? t('combat.f.resCrit') : hit ? t('combat.f.resHit') : t('combat.f.resMiss')}`,
      adv: advantageNote,
    }),
  });

  // Spend the reaction on the dodge whether or not the strike still lands — the
  // rogue reacted. Logged as in-world movement, not a mechanic readout.
  if (nimbleDodge) {
    nextCharacter = patchActionEconomy(nextCharacter, { reactionUsed: true });
    workingState = appendLog(workingState, {
      id: nextLogId(workingState),
      kind: 'system',
      text: t('combat.log.nimbleTwist', { name: nextCharacter.name }),
    });
  }

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
        ? remaining === 1
          ? t('combat.log.imagesRemainOne', { n: remaining })
          : t('combat.log.imagesRemainMany', { n: remaining })
        : t('combat.log.noImagesRemain');
    if (sawThrough) {
      workingState = appendLog(workingState, {
        id: nextLogId(workingState),
        kind: 'system',
        text: t('combat.log.mirrorSawThrough', {
          attacker: attacker.instance.displayName,
          name: nextCharacter.name,
          remain: remainNote,
        }),
      });
    } else {
      hit = false;
      workingState = appendLog(workingState, {
        id: nextLogId(workingState),
        kind: 'system',
        text: t('combat.log.mirrorShatter', { remain: remainNote }),
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
    weaponName: getLocalizedMonsterActionName(attacker.instance.defId, action.name),
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
    // Dungeon-twist flat surcharge (ascension difficulty rides damageMult below).
    const twistBonus = attacker.instance.bonusDamage ?? 0;
    // boss-framework: flat enrage damage granted by an entered HP phase.
    const phaseBonus = attacker.instance.phaseDamageBonus ?? 0;
    // Ascension difficulty: a percentage on the whole landed blow, so it scales
    // with the enemy's own damage and bites hardest in the endgame chapters.
    const damageMult = attacker.instance.damageMult ?? 1;
    // Wither (8th wizard) leaves a monster 'weakened' — a flat cut to its OWN
    // outgoing damage (the one self-debuff the monster turn reads against
    // itself). A landed hit still grazes for at least 1.
    const selfWeakened = attacker.instance.conditions
      .filter((c) => c.name === 'weakened')
      .reduce((sum, c) => sum + (c.level ?? DEFAULT_WEAKENED_AMOUNT), 0);
    const rawBlow = damageRoll.total + damageExpr.modifier + rageBonus + twistBonus + phaseBonus;
    const rawBeforeWeaken = damageMult !== 1 ? Math.round(rawBlow * damageMult) : rawBlow;
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
    // Heavy armour smothers Rage — plate gives no physical-damage halving
    // (defense-in-depth alongside the equip-time break and the entry guard).
    const rageResists = isRaging(nextCharacter) && physical && !rageBrokenByArmor(nextCharacter);
    // Totem (Bear) Aspect of the Bear (L10): while raging, fire/cold/lightning are
    // halved alongside the physical. Heavy armour smothers the fury here too.
    const elemental =
      action.damageType === 'fire' ||
      action.damageType === 'cold' ||
      action.damageType === 'lightning';
    const bearResists =
      isRaging(nextCharacter) &&
      elemental &&
      !rageBrokenByArmor(nextCharacter) &&
      characterHasMechanic(nextCharacter, 'aspect-of-the-bear');
    // Armour resist affix (Salamander / Frostward): halve a matching type.
    const affixResists = characterAffixMods(nextCharacter).resists.includes(action.damageType);
    const resisted = !immune && (raceResists || rageResists || bearResists || affixResists);
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
    const dmgWord = t(`combat.dmg.${action.damageType}`);
    const breakdown: string[] = [`${damageRoll.total} ${t('combat.part.dice')}`];
    if (damageExpr.modifier !== 0) {
      breakdown.push(
        damageExpr.modifier > 0
          ? `+ ${damageExpr.modifier} ${t('combat.part.bonus')}`
          : `- ${Math.abs(damageExpr.modifier)} ${t('combat.part.bonus')}`,
      );
    }
    if (rageBonus > 0) breakdown.push(`+ ${rageBonus} ${t('combat.part.rage')}`);
    if (twistBonus > 0) breakdown.push(`+ ${twistBonus} ${t('combat.part.ascension')}`);
    if (phaseBonus > 0) breakdown.push(`+ ${phaseBonus} ${t('combat.part.phase')}`);
    const resistSuffix = resisted
      ? rageResists && !raceResists
        ? t('combat.log.resistRagePhysical')
        : t('combat.log.resistType', { type: dmgWord })
      : '';
    const damageLine = immune
      ? t('combat.log.monsterImmune', { name: nextCharacter.name, type: dmgWord })
      : t('combat.log.monsterDamage', {
          dmg: totalDamage,
          type: dmgWord,
          breakdown: breakdown.join(' '),
          resist: resistSuffix,
        });
    nextState = appendLog(nextState, {
      id: nextLogId(nextState),
      kind: 'damage',
      source: 'enemy',
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
              text: t('combat.log.monsterDrain', { name: live.instance.displayName, amount: after - before }),
            });
            nextState = attachEnemyEffect(nextState, 'sustain-drain', attackerId, 'player');
          }
        }
      }
    }
  }

  // Rogue Opportunist (L12): a foe that swung and MISSED leaves itself open —
  // once per round the rogue answers with a reaction Sneak-Attack jab. Uses a
  // dedicated per-round flag (not the reaction), so Uncanny Dodge can still
  // answer a landed hit the same round, and it's separate from the once-per-turn
  // main-hand Sneak. A clean miss is the opening; on a hit the rogue is too busy
  // taking the blow to counter.
  if (
    !hit &&
    nextCharacter.classId === 'rogue' &&
    characterHasMechanic(nextCharacter, 'opportunist') &&
    nextCharacter.opportunistUsedThisRound !== true
  ) {
    const live = monsterInstanceOf(nextState, attackerId);
    if (live && live.hp.current > 0) {
      const diceN = opportunistRiposteDice(nextCharacter.level);
      const riposte = roller.roll({ count: diceN, die: 6, modifier: 0 });
      nextCharacter = { ...nextCharacter, opportunistUsedThisRound: true };
      const dealt = applyDamage(nextState, attackerId, riposte.total, nextCharacter);
      nextState = dealt.state;
      nextCharacter = dealt.character;
      nextState = appendLog(nextState, {
        id: nextLogId(nextState),
        kind: 'damage',
        text: t('combat.log.opportunistRiposte', {
          name: attacker.instance.displayName,
          player: nextCharacter.name,
          dmg: riposte.total,
          n: diceN,
        }),
      });
    }
  }

  // Record this swing in the per-turn batch (with its finalized damageDealt, so
  // the float shows true rolled damage). lastAttack already carries the same
  // event; the batch keeps EVERY swing of a multi-swing turn, not just the last.
  const resolvedEvent = nextState.lastAttack ?? attackEvent;
  nextState = {
    ...nextState,
    attackEvents: [...(nextState.attackEvents ?? []), resolvedEvent],
  };

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
  const actions = effectiveMonsterActions(monsterDef, attacker.instance);
  const multi = actions.find((a) => a.kind === 'multiattack');
  const attack = actions.find((a): a is MonsterAttack => a.kind === 'attack');
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
    // An Opportunist riposte (on a missed swing) can fell the attacker mid-flurry
    // — a dead monster doesn't keep swinging.
    const atkInst = monsterInstanceOf(workingState, attackerId);
    if (!atkInst || atkInst.hp.current <= 0) break;
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
  // Scale the summoned add to the encounter the SAME way createCombat scaled
  // the room's monsters — by the run's ascension level (HP) — so a late boss's
  // reinforcement isn't a raw early-game stat block. Summons are never the
  // primary foe, so they scale as non-boss (no boss HP multiplier). The flat
  // ascension damage bonus is carried separately below via `bonusDamage`.
  const summonDef = applyAscensionToMonster(
    getMonster(action.summonDefId),
    state.ascension ?? 0,
    false,
  );

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
  const summonName = getLocalized('monsters', summonDef.id, 'name', summonDef.name);
  nextState = appendLog(nextState, {
    id: nextLogId(nextState),
    kind: 'system',
    text:
      count > 1
        ? t('combat.log.summonMany', { name: attacker.instance.displayName, count, monster: summonName })
        : t('combat.log.summonOne', { name: attacker.instance.displayName, monster: summonName }),
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
    const subject = target.id === attackerId ? t('combat.log.sustainSelf') : target.instance.displayName;
    parts.push(t('combat.log.sustainHeal', { subject, n: healAmount }));
  }
  if (action.wardTempHp !== undefined) {
    const subject = target.id === attackerId ? t('combat.log.sustainSelf') : target.instance.displayName;
    parts.push(t('combat.log.sustainWard', { subject, n: action.wardTempHp }));
  }
  nextState = appendLog(nextState, {
    id: nextLogId(nextState),
    kind: 'system',
    text: t('combat.log.sustainLine', {
      name: attacker.instance.displayName,
      action: getLocalizedMonsterActionName(attacker.instance.defId, action.name),
      suffix: parts.length ? ` — ${parts.join(t('combat.log.sustainJoin'))}` : '',
    }),
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
    case 'frightened':
    case 'blinded':
    case 'restrained':
    case 'weakened':
      return t(`combat.cond.debuff.${condition}`);
    default:
      return t('combat.cond.debuff.default', { name: condition });
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
    text: t('combat.log.debuffCastRoll', {
      caster: attackerName,
      action: locAction(state, attackerId, action.name),
      name: nextCharacter.name,
      abil: t(`combat.abil.${action.saveAbility}`),
      adv: save.advantage ? t('combat.f.advParen') : '',
      mod: `${save.mod >= 0 ? '+' : ''}${save.mod}`,
      total: save.total,
      dc: action.saveDC,
      result: save.success ? t('combat.f.success') : t('combat.f.fail'),
    }),
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
      text: t('combat.log.debuffApplied', {
        name: nextCharacter.name,
        effect: debuffFlavor(action.condition),
      }),
    });
  } else {
    logEntries.push({
      id: nextLogId(state) + 1,
      kind: 'system',
      text: t('combat.log.debuffResisted', { name: nextCharacter.name, action: locAction(state, attackerId, action.name) }),
    });
  }

  let nextState: CombatState = appendLog(state, ...logEntries);
  const saveEventId = (nextState.saveEventCounter ?? 0) + 1;
  const saveEvent: SaveEvent = {
    id: saveEventId,
    sourceName: locAction(state, attackerId, action.name),
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
    text: t('combat.log.paralyzeCastRoll', {
      caster: attackerName,
      action: locAction(state, attackerId, action.name),
      name: nextCharacter.name,
      abil: t(`combat.abil.${action.saveAbility}`),
      adv: save.advantage ? t('combat.f.advParen') : '',
      mod: `${save.mod >= 0 ? '+' : ''}${save.mod}`,
      total: save.total,
      dc: action.saveDC,
      result: save.success ? t('combat.f.success') : t('combat.f.fail'),
    }),
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
      text: t('combat.log.paralyzeApplied', { name: nextCharacter.name }),
    });
  } else {
    logEntries.push({
      id: nextLogId(state) + 1,
      kind: 'system',
      text: t('combat.log.paralyzeResisted', { name: nextCharacter.name }),
    });
  }

  let nextState: CombatState = appendLog(state, ...logEntries);
  const saveEventId = (nextState.saveEventCounter ?? 0) + 1;
  const saveEvent: SaveEvent = {
    id: saveEventId,
    sourceName: locAction(state, attackerId, action.name),
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
