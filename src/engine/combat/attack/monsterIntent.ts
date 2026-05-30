import type { Character } from '../../../types/character';
import type {
  CombatState,
  MonsterCombatant,
  MonsterInstance,
  MonsterIntent,
} from '../../../types/combat';
import type {
  Monster,
  MonsterAction,
  MonsterAttack,
  MonsterSummon,
  MonsterSustain,
} from '../../../schemas/monster';
import { parseDiceExpression } from '../../dice';
import { getMonster } from '../../../content/monsters';
import { isPlayerParalyzed } from '../holdPerson';
import { playerHasCondition } from '../playerConditions';

/**
 * enemy-telegraph: monster action selection + the intent telegraph derived from
 * it. Lives in its own module (rather than monsterAttack.ts) because both
 * createCombat.ts and turn.ts need to (re)select intents, and monsterAttack.ts
 * imports createCombat — keeping the picker here breaks that cycle.
 *
 * Pick-then-resolve: `selectMonsterIntent` chooses the next action ahead of the
 * player's turn; `resolveIntentAction` re-derives that exact action from the
 * canonical content def on the monster's turn, so the telegraph never lies.
 */

export function liveMonsters(state: CombatState): MonsterCombatant[] {
  return state.combatants.filter(
    (c): c is MonsterCombatant => c.kind === 'monster' && c.instance.hp.current > 0,
  );
}

function specialOnCooldown(
  instance: MonsterInstance,
  name: string,
  once: boolean | undefined,
  cooldownRounds: number | undefined,
  round: number,
): boolean {
  const st = instance.actionState?.[name];
  if (once && (st?.uses ?? 0) >= 1) return true;
  const cd = cooldownRounds ?? 2;
  if (st && round - st.lastRound < cd) return true;
  return false;
}

function summonAvailable(
  action: MonsterSummon,
  instance: MonsterInstance,
  state: CombatState,
): boolean {
  if (specialOnCooldown(instance, action.name, action.once, action.cooldownRounds, state.round)) {
    return false;
  }
  if (action.maxActive !== undefined) {
    const alive = liveMonsters(state).filter(
      (c) => c.instance.defId === action.summonDefId,
    ).length;
    if (alive >= action.maxActive) return false;
  }
  return true;
}

export function pickAllyTarget(
  state: CombatState,
  selfId: string,
  action: MonsterSustain,
): MonsterCombatant | undefined {
  const allies = liveMonsters(state).filter((c) => c.id !== selfId);
  if (allies.length === 0) return undefined;
  const mostWounded = (list: MonsterCombatant[]) =>
    [...list].sort(
      (a, b) =>
        a.instance.hp.current / a.instance.hp.max -
        b.instance.hp.current / b.instance.hp.max,
    )[0];
  if (action.heal) {
    const wounded = allies.filter((c) => c.instance.hp.current < c.instance.hp.max);
    if (wounded.length) return mostWounded(wounded);
  }
  if (action.wardTempHp !== undefined) {
    const unwarded = allies.filter((c) => c.instance.hp.temp < action.wardTempHp!);
    if (unwarded.length) return mostWounded(unwarded);
  }
  return undefined;
}

function sustainAvailable(
  action: MonsterSustain,
  instance: MonsterInstance,
  state: CombatState,
): boolean {
  if (specialOnCooldown(instance, action.name, action.once, action.cooldownRounds, state.round)) {
    return false;
  }
  const target = action.target ?? 'self';
  if (target === 'self') {
    return instance.hp.current > 0 && instance.hp.current * 2 <= instance.hp.max;
  }
  return pickAllyTarget(state, instance.id, action) !== undefined;
}

/**
 * Monster-side action picker. Walks the def's actions in author order and takes
 * the first "gated special" that is live this turn (signature ability first),
 * otherwise falls back to multiattack, then a plain attack. Bosses keep their
 * round-1 paralyze opener; regular monsters drive their own toolkit.
 */
export function pickMonsterAction(
  actions: MonsterAction[],
  instance: MonsterInstance,
  state: CombatState,
  character: Readonly<Character>,
): MonsterAction {
  const playerParalyzed = isPlayerParalyzed(character);
  for (const a of actions) {
    if (a.kind === 'paralyze' && !playerParalyzed && state.round === 1) return a;
    if (a.kind === 'debuff' && !playerHasCondition(character, a.condition)) return a;
    if (a.kind === 'summon' && summonAvailable(a, instance, state)) return a;
    if (a.kind === 'sustain' && sustainAvailable(a, instance, state)) return a;
  }
  const multi = actions.find((a) => a.kind === 'multiattack');
  if (multi) return multi;
  const attack = actions.find((a) => a.kind === 'attack');
  if (attack) return attack;
  return actions[0];
}

/**
 * Min–max damage the attack can deal, matching monsterAttack's resolution:
 * dice (min = count, max = count·die) + the flat modifier + ascension bonus +
 * rage. Pre-resistance, like the resolver's `rawDamage`.
 */
function attackDamageRange(
  action: MonsterAttack,
  instance: MonsterInstance,
): { min: number; max: number } {
  const expr = parseDiceExpression(action.damage);
  const rage = instance.bossRageActive ? 2 : 0;
  const flat = expr.modifier + (instance.bonusDamage ?? 0) + rage;
  return {
    min: Math.max(1, expr.count + flat),
    max: Math.max(1, expr.count * expr.die + flat),
  };
}

/** Build the display telegraph for an already-picked action. */
function buildMonsterIntent(
  action: MonsterAction,
  instance: MonsterInstance,
  def: Monster,
): MonsterIntent {
  const base = { actionKind: action.kind, actionName: action.name };
  switch (action.kind) {
    case 'attack': {
      const range = attackDamageRange(action, instance);
      return {
        ...base,
        kind: action.lifeDrain ? 'drain' : 'attack',
        damageMin: range.min,
        damageMax: range.max,
      };
    }
    case 'multiattack': {
      const swing = def.actions.find((a): a is MonsterAttack => a.kind === 'attack');
      const range = swing ? attackDamageRange(swing, instance) : undefined;
      return {
        ...base,
        kind: 'multiattack',
        damageMin: range?.min,
        damageMax: range?.max,
        hits: action.attacks,
      };
    }
    case 'paralyze':
      return { ...base, kind: 'paralyze' };
    case 'debuff':
      return { ...base, kind: 'debuff', condition: action.condition };
    case 'summon':
      return { ...base, kind: 'summon' };
    case 'sustain':
      return { ...base, kind: action.heal ? 'sustain-heal' : 'ward' };
  }
}

/** Choose the monster's next action and package it as a display intent. */
export function selectMonsterIntent(
  instance: MonsterInstance,
  state: CombatState,
  character: Readonly<Character>,
): MonsterIntent {
  const def = getMonster(instance.defId);
  const action = pickMonsterAction(def.actions, instance, state, character);
  return buildMonsterIntent(action, instance, def);
}

/**
 * Resolve the action a monster will actually take this turn. Re-derives the
 * stored intent's action from the canonical def (kind + name) so what resolves
 * equals what was telegraphed; falls back to a fresh pick when no intent is
 * stored (freshly summoned add, or a legacy save).
 */
export function resolveIntentAction(
  def: Monster,
  instance: MonsterInstance,
  state: CombatState,
  character: Readonly<Character>,
): MonsterAction {
  const intent = instance.intent;
  if (intent) {
    const found = def.actions.find(
      (a) => a.kind === intent.actionKind && a.name === intent.actionName,
    );
    if (found) return found;
  }
  return pickMonsterAction(def.actions, instance, state, character);
}

function intentsEqual(
  a: MonsterIntent | undefined,
  b: MonsterIntent | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.kind === b.kind &&
    a.actionKind === b.actionKind &&
    a.actionName === b.actionName &&
    a.damageMin === b.damageMin &&
    a.damageMax === b.damageMax &&
    a.hits === b.hits &&
    a.condition === b.condition
  );
}

/**
 * Recompute every live monster's intent against the current state — called at
 * the start of the player's turn (and combat start) so the telegraph reflects
 * what the player is deciding against. Paralyzed monsters carry no intent (they
 * lose the turn). Returns the same state reference when nothing changed, to
 * keep memoized sprites from re-rendering.
 */
export function refreshMonsterIntents(
  state: CombatState,
  character: Readonly<Character>,
): CombatState {
  let changed = false;
  const combatants = state.combatants.map((c) => {
    if (c.kind !== 'monster') return c;
    const inst = c.instance;
    if (inst.hp.current <= 0) return c;
    const paralyzed = inst.conditions.some((cond) => cond.name === 'paralyzed');
    const next = paralyzed ? undefined : selectMonsterIntent(inst, state, character);
    if (intentsEqual(inst.intent, next)) return c;
    changed = true;
    return { ...c, instance: { ...inst, intent: next } };
  });
  return changed ? { ...state, combatants } : state;
}
