import type { DiceRoller } from '../dice';
import { parseDiceExpression } from '../dice';
import type { Character } from '../../types/character';
import type { CombatState, MonsterCombatant } from '../../types/combat';
import { abilityModifier } from '../../types/abilities';
import { effectiveAbilityScores } from '../character/derived';
import { getMonster } from '../../content/monsters';
import { getItem } from '../../content/items';
import { playerAttack } from './attack';
import { castSpell, slotsAt } from './spells';
import { useConsumable } from './useItem';
import { useSecondWind } from './secondWind';
import { useActionSurge } from './actionSurge';
import { useCunningAction, type CunningActionChoice } from './cunningAction';

/**
 * A single structured combat decision. Callers map it onto the real engine
 * entry points via {@link applyPlannedAction}. The policy returns ONE action
 * per call; callers loop (re-calling {@link chooseCombatAction} after each
 * dispatch) so the bonus action + action + reaction economy is spent across
 * successive calls until `end-turn` is returned.
 */
export type PlannedAction =
  | { kind: 'attack'; targetId: string }
  | { kind: 'cast'; spellId: string; targetId?: string }
  | { kind: 'item'; inventoryIndex: number }
  | { kind: 'second-wind' }
  | { kind: 'action-surge' }
  | { kind: 'cunning-action'; choice: CunningActionChoice }
  | { kind: 'end-turn' };

// ---- Tunables --------------------------------------------------------------

/** HP fraction at/below which we reach for a potion. */
const EMERGENCY_HP = 0.35;
/** HP fraction at/below which a Fighter spends Second Wind (renewable, so used freely). */
const SECOND_WIND_HP = 0.5;
/** Fighter Action Surge only when still hurt at/below this, or outnumbered. */
const SURGE_HP = 0.7;
/** Magic Missile guaranteed minimum (3 darts × min 1d4+1 = 6). A target at or
 *  below this dies for certain — no attack roll, no save. */
const MAGIC_MISSILE_MIN = 6;
/** Scorching Ray is worth a 2nd-level slot only on a target too beefy to fall
 *  to a cantrip / single Magic Missile. ~3 rays × 2d6 ≈ 21 average. */
const SCORCHING_RAY_WORTH_HP = 22;
/** A monster is "dangerous" enough to lock down (Hold Person) at/above this
 *  average per-attack damage. */
const HOLD_PERSON_THREAT = 8;
/** Hold Person only on a target too tanky to simply burst this turn. */
const HOLD_PERSON_MIN_HP = 25;

// ---- Battlefield reads -----------------------------------------------------

export function liveMonstersOf(state: CombatState): MonsterCombatant[] {
  return state.combatants.filter(
    (c): c is MonsterCombatant => c.kind === 'monster' && c.instance.hp.current > 0,
  );
}

function avgOfExpr(expr: string): number {
  const { count, die, modifier } = parseDiceExpression(expr);
  return count * ((die + 1) / 2) + modifier;
}

/** Best (highest-average-damage) single attack this monster can land, per swing. */
function monsterThreat(m: MonsterCombatant): number {
  const def = getMonster(m.instance.defId);
  const bonus = m.instance.bonusDamage ?? 0;
  let best = 0;
  for (const a of def.actions) {
    if (a.kind !== 'attack') continue;
    const avg = avgOfExpr(a.damage) + bonus;
    if (avg > best) best = avg;
  }
  return best;
}

function isMonsterParalyzed(m: MonsterCombatant): boolean {
  return m.instance.conditions.some((c) => c.name === 'paralyzed');
}

/** Focus-fire target: lowest current HP (fastest removal), ties to higher threat. */
function lowestHpTarget(live: MonsterCombatant[]): MonsterCombatant | undefined {
  if (live.length === 0) return undefined;
  return [...live].sort((a, b) => {
    const hp = a.instance.hp.current - b.instance.hp.current;
    if (hp !== 0) return hp;
    return monsterThreat(b) - monsterThreat(a);
  })[0];
}

/** The single most dangerous living enemy. */
function highestThreatTarget(live: MonsterCombatant[]): MonsterCombatant | undefined {
  if (live.length === 0) return undefined;
  return [...live].sort((a, b) => monsterThreat(b) - monsterThreat(a))[0];
}

/** True only when every living enemy resists OR is immune to this damage type —
 *  i.e. the AoE would be wasted. */
function aoeWasted(live: MonsterCombatant[], type: 'fire' | 'lightning'): boolean {
  return live.every((m) => {
    const def = getMonster(m.instance.defId);
    return (def.immunities ?? []).includes(type) || (def.resistances ?? []).includes(type);
  });
}

function knows(character: Character, spellId: string): boolean {
  return (character.resources.knownSpells ?? []).includes(spellId);
}

/** Index of the strongest healing consumable in inventory, or -1. */
function bestHealPotionIdx(character: Character): number {
  let bestIdx = -1;
  let bestHeal = 0;
  character.inventory.forEach((ref, idx) => {
    let item;
    try {
      item = getItem(ref.itemId);
    } catch {
      return;
    }
    if (item.kind !== 'consumable' || item.effect !== 'heal' || !item.healDice) return;
    const heal = avgOfExpr(item.healDice);
    if (heal > bestHeal) {
      bestHeal = heal;
      bestIdx = idx;
    }
  });
  return bestIdx;
}

function fireBoltFullAvg(character: Character): number {
  const intMod = abilityModifier(effectiveAbilityScores(character).int);
  return 5.5 + intMod; // 1d10 + INT, ignoring the half-on-save downside (an upper estimate)
}

// ---- The policy ------------------------------------------------------------

/**
 * Pick the single best combat action right now. PURE — reads state/character,
 * rolls no dice, mutates nothing. Designed to be called repeatedly within a
 * turn: each call commits the next slice of the action economy (a bonus-action
 * setup, then the main action, then a post-action surge) until it returns
 * `end-turn`.
 *
 * Used by both the player-facing Auto-Battle loop and the sim bots, so the AI a
 * player watches is exactly the AI the balance sims run.
 */
export function chooseCombatAction(state: CombatState, character: Character): PlannedAction {
  if (state.status !== 'active') return { kind: 'end-turn' };
  const live = liveMonstersOf(state);
  if (live.length === 0) return { kind: 'end-turn' };

  const actionFree = !character.actionEconomy.actionUsed;
  const bonusFree = !character.actionEconomy.bonusActionUsed;
  const hpPct = character.hp.current / character.hp.max;
  const isFighter = character.classId === 'fighter';
  const isRogue = character.classId === 'rogue';
  const isWizard = character.classId === 'wizard';

  const primary = lowestHpTarget(live);
  const threat = highestThreatTarget(live);

  // === Bonus action: survival + rogue setup ===============================
  if (bonusFree) {
    // Fighter Second Wind first — it refreshes every combat, so spend it before
    // burning a finite potion.
    const secondWindCharge =
      character.resources.secondWindAvailable === true ||
      (character.resources.secondWindBonusRemaining ?? 0) > 0;
    if (
      isFighter &&
      secondWindCharge &&
      character.hp.current < character.hp.max &&
      hpPct <= SECOND_WIND_HP
    ) {
      return { kind: 'second-wind' };
    }

    // Emergency potion (bonus action) for anyone genuinely low.
    if (hpPct <= EMERGENCY_HP) {
      const healIdx = bestHealPotionIdx(character);
      if (healIdx >= 0) return { kind: 'item', inventoryIndex: healIdx };
    }

    // Rogue Cunning Action: Hide → next attack lands with advantage → Sneak
    // Attack. Only worth the scarce charge when it actually enables Sneak this
    // turn: skip if the action is already spent (nothing to set up) or the
    // focus target is already bloodied (Sneak fires off the wound anyway).
    if (
      isRogue &&
      actionFree &&
      (character.resources.cunningActionUsesRemaining ?? 0) > 0 &&
      character.nextAttackAdvantage !== true &&
      primary &&
      primary.instance.hp.current > primary.instance.hp.max / 2
    ) {
      return { kind: 'cunning-action', choice: 'hide' };
    }

    // Wizard panic button: about to die, no potion left, Misty Step for +2 AC
    // and save advantage is better than nothing.
    if (
      isWizard &&
      hpPct <= EMERGENCY_HP &&
      knows(character, 'misty-step') &&
      slotsAt(character, 2) > 0 &&
      bestHealPotionIdx(character) < 0
    ) {
      return { kind: 'cast', spellId: 'misty-step' };
    }
  }

  // === Main action ========================================================
  const canAct = actionFree || (isRogue && character.bonusAttackAvailable === true);
  if (canAct) {
    if (isWizard) {
      const wizardAction = chooseWizardAction(state, character, live, primary, threat);
      if (wizardAction) return wizardAction;
    }
    // Weapon classes (and a wizard with no castable option) swing at the
    // focus-fire target.
    if (primary && character.equipped.mainHand) {
      return { kind: 'attack', targetId: primary.id };
    }
  }

  // === Post-action bonus: Fighter Action Surge ============================
  // Only after the action is spent and a target survived — and only when it
  // actually matters (outnumbered or still hurt). Saves the charge otherwise.
  if (
    isFighter &&
    character.actionEconomy.actionUsed &&
    (character.resources.actionSurgeRemaining ?? 0) > 0 &&
    (live.length >= 2 || hpPct <= SURGE_HP)
  ) {
    return { kind: 'action-surge' };
  }

  return { kind: 'end-turn' };
}

/** Wizard spell selection: AoE for groups, control for a lone bruiser, burst /
 *  guaranteed-finish for single targets, cantrip to preserve slots on trash. */
function chooseWizardAction(
  state: CombatState,
  character: Character,
  live: MonsterCombatant[],
  primary: MonsterCombatant | undefined,
  threat: MonsterCombatant | undefined,
): PlannedAction | null {
  const enemyCount = live.length;
  const anchor = threat?.id ?? primary?.id;

  // AoE when the room is crowded.
  if (enemyCount >= 3) {
    if (knows(character, 'fireball') && slotsAt(character, 3) > 0 && !aoeWasted(live, 'fire')) {
      return { kind: 'cast', spellId: 'fireball', targetId: anchor };
    }
    if (
      knows(character, 'lightning-bolt') &&
      slotsAt(character, 3) > 0 &&
      !aoeWasted(live, 'lightning')
    ) {
      return { kind: 'cast', spellId: 'lightning-bolt', targetId: anchor };
    }
  }
  if (
    enemyCount >= 2 &&
    knows(character, 'burning-hands') &&
    slotsAt(character, 1) > 0 &&
    !aoeWasted(live, 'fire')
  ) {
    return { kind: 'cast', spellId: 'burning-hands', targetId: anchor };
  }

  // No AoE available against a crowd: open with a defensive smear if we have it.
  if (
    enemyCount >= 3 &&
    state.round === 1 &&
    !character.actionEconomy.actionUsed &&
    slotsAt(character, 2) > 0
  ) {
    if (knows(character, 'blur')) return { kind: 'cast', spellId: 'blur' };
    if (knows(character, 'mirror-image')) return { kind: 'cast', spellId: 'mirror-image' };
  }

  // Control: lock down the scariest enemy while we clear the rest.
  if (
    enemyCount >= 2 &&
    knows(character, 'hold-person') &&
    slotsAt(character, 2) > 0 &&
    threat &&
    !isMonsterParalyzed(threat) &&
    monsterThreat(threat) >= HOLD_PERSON_THREAT &&
    threat.instance.hp.current > HOLD_PERSON_MIN_HP
  ) {
    return { kind: 'cast', spellId: 'hold-person', targetId: threat.id };
  }

  // Guaranteed finish: Magic Missile auto-hits, so a low target dies for sure.
  if (knows(character, 'magic-missile') && slotsAt(character, 1) > 0 && primary && primary.instance.hp.current <= MAGIC_MISSILE_MIN) {
    return { kind: 'cast', spellId: 'magic-missile', targetId: primary.id };
  }

  // Burst a beefy single threat with Scorching Ray.
  if (
    enemyCount <= 2 &&
    knows(character, 'scorching-ray') &&
    slotsAt(character, 2) > 0 &&
    threat &&
    threat.instance.hp.current >= SCORCHING_RAY_WORTH_HP
  ) {
    return { kind: 'cast', spellId: 'scorching-ray', targetId: threat.id };
  }

  // Spend a level-1 slot (Magic Missile) when a cantrip is too weak to matter.
  if (
    knows(character, 'magic-missile') &&
    slotsAt(character, 1) > 0 &&
    primary &&
    primary.instance.hp.current > fireBoltFullAvg(character)
  ) {
    return { kind: 'cast', spellId: 'magic-missile', targetId: primary.id };
  }

  // Cantrip — trivial target, or out of slots.
  if (knows(character, 'fire-bolt') && primary) {
    return { kind: 'cast', spellId: 'fire-bolt', targetId: primary.id };
  }

  return null;
}

// ---- Dispatch --------------------------------------------------------------

export interface ApplyActionContext {
  roller: DiceRoller;
  state: CombatState;
  character: Character;
}

/**
 * Execute a {@link PlannedAction} through the real combat engine entry points.
 * Returns the fresh `{ state, character }`. On an invalid/no-op action the
 * underlying engine returns the same references unchanged, which callers use
 * to detect "nothing happened" and stop looping.
 */
export function applyPlannedAction(
  ctx: ApplyActionContext,
  action: PlannedAction,
): { state: CombatState; character: Character } {
  const { roller, state, character } = ctx;
  switch (action.kind) {
    case 'attack': {
      const weaponId = character.equipped.mainHand?.itemId ?? 'dagger';
      const r = playerAttack({ roller, character, state }, action.targetId, weaponId);
      return { state: r.state, character: r.character };
    }
    case 'cast': {
      const r = castSpell({
        roller,
        character,
        state,
        spellId: action.spellId,
        targetId: action.targetId,
      });
      return { state: r.state, character: r.character };
    }
    case 'item': {
      const r = useConsumable({ roller, character, state }, action.inventoryIndex);
      return { state: r.state, character: r.character };
    }
    case 'second-wind': {
      const r = useSecondWind({ roller, character, state });
      return { state: r.state, character: r.character };
    }
    case 'action-surge': {
      const r = useActionSurge({ character, state });
      return { state: r.state, character: r.character };
    }
    case 'cunning-action': {
      const r = useCunningAction({ character, state, choice: action.choice });
      return { state: r.state, character: r.character };
    }
    case 'end-turn':
      return { state, character };
  }
}

/**
 * Drive a full player turn with the policy: repeatedly pick + dispatch actions
 * until the turn is spent, combat ends, or no progress is made. Does NOT call
 * `endTurn` — the caller advances the turn. Used by the sim bots; the UI runs
 * the same loop one timed step at a time so the player can watch (and bail).
 */
export function runAutoTurn(
  roller: DiceRoller,
  state: CombatState,
  character: Character,
): { state: CombatState; character: Character } {
  let s = state;
  let ch = character;
  for (let i = 0; i < 16; i++) {
    if (s.status !== 'active') break;
    const action = chooseCombatAction(s, ch);
    if (action.kind === 'end-turn') break;
    const r = applyPlannedAction({ roller, state: s, character: ch }, action);
    if (r.state === s && r.character === ch) break; // engine refused — stop
    s = r.state;
    ch = r.character;
  }
  return { state: s, character: ch };
}
