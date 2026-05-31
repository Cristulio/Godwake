import type { DiceRoller } from '../dice';
import { parseDiceExpression } from '../dice';
import type { Character, SpellSlotLevel } from '../../types/character';
import type { CombatState, MonsterCombatant } from '../../types/combat';
import { abilityModifier } from '../../types/abilities';
import { getSpell } from '../../content/spells';
import { effectiveAbilityScores, characterHasMechanic, isRaging } from '../character/derived';
import { baneQuirkCount } from '../character/quirks';
import { isNonStackingBlessing, blessingSignature } from '../character/blessings';
import { getMonster } from '../../content/monsters';
import { getItem } from '../../content/items';
import { getBlessing } from '../../content/blessings';
import type { Blessing, BlessingModifiers } from '../../schemas/blessing';
import { playerAttack } from './attack';
import { castSpell, slotsAt } from './spells';
import { fireBoltDiceCount } from './spells/fireBolt';
import { useConsumable } from './useItem';
import { useSecondWind } from './secondWind';
import { useActionSurge } from './actionSurge';
import { useCunningAction, type CunningActionChoice } from './cunningAction';
import { useRage, useRecklessAttack } from './rage';
import { useHuntersMark } from './huntersMark';

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
  | { kind: 'rage' }
  | { kind: 'reckless-attack' }
  | { kind: 'hunters-mark'; targetId: string }
  | { kind: 'end-turn' };

// ---- Tunables --------------------------------------------------------------

/** HP fraction at/below which we reach for a potion. */
const EMERGENCY_HP = 0.35;
/** HP fraction at/below which a Fighter spends Second Wind (renewable, so used freely). */
const SECOND_WIND_HP = 0.5;
/** Fighter Action Surge only when still hurt at/below this, or outnumbered. */
const SURGE_HP = 0.7;
/** Barbarian fights recklessly only while healthy enough to wear the return blows. */
const RECKLESS_HP = 0.5;
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
/** A single target this beefy (a boss / heavy elite) is worth dropping the
 *  biggest slot on — Fireball/Lightning single-target CLOSES the fight instead
 *  of plinking it down with a cantrip (the "deep but never finishes" gap). */
const BOSS_NUKE_HP = 40;
/** HP fraction at/below which the wizard smears itself defensively (Blur /
 *  Mirror Image) once, to survive long enough to keep casting. */
const WIZARD_DEFENSIVE_HP = 0.5;

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

/** True when the Ranger's Hunter's Mark is set and still riding a living enemy. */
function markIsOnLiveTarget(state: CombatState, live: MonsterCombatant[]): boolean {
  const id = state.huntersMarkTargetId;
  if (!id) return false;
  return live.some((m) => m.id === id);
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

/** The toughest living enemy by current HP — the one a fight stalls on. */
function highestHpTarget(live: MonsterCombatant[]): MonsterCombatant | undefined {
  if (live.length === 0) return undefined;
  return [...live].sort((a, b) => b.instance.hp.current - a.instance.hp.current)[0];
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

/**
 * First spell in the ranked list the wizard both knows and can pay for right now
 * (a free slot at its tier). Used to reach for the biggest affordable working —
 * the highest AoE for a crowd, the heaviest nuke for a boss — before falling
 * back to the cap-8 kit.
 */
function bestAffordable(character: Character, ids: readonly string[]): string | null {
  for (const id of ids) {
    if (!knows(character, id)) continue;
    const lvl = getSpell(id).level;
    if (lvl === 0 || slotsAt(character, lvl as SpellSlotLevel) > 0) return id;
  }
  return null;
}

/** AoE blasts, biggest dice first. */
const HIGH_AOE_PRIORITY = [
  'cataclysm',
  'stormcrash',
  'sunfire-burst',
  'glacial-cone',
  'rime-blast',
] as const;

/** Single-target nukes, biggest first. */
const HIGH_NUKE_PRIORITY = ['wither', 'dissolution', 'void-ray', 'force-lance'] as const;

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
  // Track Fire Bolt's level-scaled dice so the bot keeps choosing cantrip vs
  // slot accurately as the cantrip grows. Ignores the half-on-save downside (an upper estimate).
  return fireBoltDiceCount(character.level) * 5.5 + intMod;
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
  const isBarbarian = character.classId === 'barbarian';
  const isRanger = character.classId === 'ranger';

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

    // Barbarian Rage: open every fight in a fury — available every combat.
    if (isBarbarian && !isRaging(character) && characterHasMechanic(character, 'rage')) {
      return { kind: 'rage' };
    }

    // Ranger Hunter's Mark: brand the focus target so every swing bites deeper;
    // re-brand once the quarry falls (the mark no longer rides a live enemy).
    if (
      isRanger &&
      characterHasMechanic(character, 'hunters-mark') &&
      primary &&
      !markIsOnLiveTarget(state, live)
    ) {
      return { kind: 'hunters-mark', targetId: primary.id };
    }

    // Emergency potion (bonus action) for anyone genuinely low. Rage locks out
    // healing, so a raging barbarian can't reach for it — keep swinging instead.
    if (hpPct <= EMERGENCY_HP && !isRaging(character)) {
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
      const wizardAction = chooseWizardAction(character, live, primary, threat);
      if (wizardAction) return wizardAction;
    }
    // Barbarian Reckless Attack: declare it before swinging while healthy
    // enough to eat the return blows. Free stance — costs no action — so it
    // resolves, then the same turn proceeds to the attack.
    if (
      isBarbarian &&
      actionFree &&
      character.recklessActive !== true &&
      characterHasMechanic(character, 'reckless-attack') &&
      hpPct > RECKLESS_HP &&
      primary
    ) {
      return { kind: 'reckless-attack' };
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

/**
 * Wizard spell selection: smear-to-survive when hurt, AoE for groups, control to
 * deny the scariest foe a turn, then ASSEMBLE BURST to actually close the fight —
 * a beefy boss eats the biggest slot instead of being plinked with a cantrip.
 * A level-1 slot is kept in reserve so the Shield reaction can still fire.
 */
function chooseWizardAction(
  character: Character,
  live: MonsterCombatant[],
  primary: MonsterCombatant | undefined,
  threat: MonsterCombatant | undefined,
): PlannedAction | null {
  const enemyCount = live.length;
  const anchor = threat?.id ?? primary?.id;
  const hpPct = character.hp.current / character.hp.max;
  const actionFree = !character.actionEconomy.actionUsed;
  const beefy = highestHpTarget(live);

  // Defensive smear when genuinely hurt: Blur (sustained) or Mirror Image, once,
  // if nothing already shields us. Surviving to keep casting beats one cantrip.
  if (
    actionFree &&
    hpPct <= WIZARD_DEFENSIVE_HP &&
    (character.resources.blurRoundsRemaining ?? 0) === 0 &&
    (character.resources.mirrorImages ?? 0) === 0 &&
    slotsAt(character, 2) > 0
  ) {
    if (knows(character, 'blur')) return { kind: 'cast', spellId: 'blur' };
    if (knows(character, 'mirror-image')) return { kind: 'cast', spellId: 'mirror-image' };
  }

  // Boss finisher: against a genuinely beefy single threat, reach for the
  // deepest working first — transform to grind it down, unmake to nuke-and-lock
  // it, or the biggest affordable single-target nuke. Spending the high slots on
  // the room's real threat is the correct slot economy.
  if (beefy && beefy.instance.hp.current >= BOSS_NUKE_HP) {
    if (
      actionFree &&
      knows(character, 'apotheosis') &&
      slotsAt(character, 9) > 0 &&
      (character.resources.ascendantRoundsRemaining ?? 0) === 0
    ) {
      return { kind: 'cast', spellId: 'apotheosis' };
    }
    if (knows(character, 'unmake') && slotsAt(character, 9) > 0) {
      return { kind: 'cast', spellId: 'unmake', targetId: beefy.id };
    }
    const nuke = bestAffordable(character, HIGH_NUKE_PRIORITY);
    if (nuke) return { kind: 'cast', spellId: nuke, targetId: beefy.id };
  }

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
    // Fall back to a higher-tier blast when the 3rd-level slots are spent.
    const aoe = bestAffordable(character, HIGH_AOE_PRIORITY);
    if (aoe) return { kind: 'cast', spellId: aoe, targetId: anchor };
  }
  if (
    enemyCount >= 2 &&
    knows(character, 'burning-hands') &&
    slotsAt(character, 1) > 0 &&
    !aoeWasted(live, 'fire')
  ) {
    return { kind: 'cast', spellId: 'burning-hands', targetId: anchor };
  }

  // Control: deny the scariest live foe its turn — worth it on a lone boss too
  // (its whole turn vanishes while we assemble the kill), not just a crowd.
  if (
    knows(character, 'hold-person') &&
    slotsAt(character, 2) > 0 &&
    threat &&
    !isMonsterParalyzed(threat) &&
    monsterThreat(threat) >= HOLD_PERSON_THREAT &&
    threat.instance.hp.current > HOLD_PERSON_MIN_HP
  ) {
    return { kind: 'cast', spellId: 'hold-person', targetId: threat.id };
  }

  // Guaranteed finish: Magic Missile auto-hits, so a low target dies for sure —
  // worth even the last slot, since removing a foe is also defense.
  if (knows(character, 'magic-missile') && slotsAt(character, 1) > 0 && primary && primary.instance.hp.current <= MAGIC_MISSILE_MIN) {
    return { kind: 'cast', spellId: 'magic-missile', targetId: primary.id };
  }

  // CLOSE a beefy single target: drop the biggest slot rather than plinking a
  // boss to death with cantrips. This is the core "deep but never finishes" fix.
  if (enemyCount <= 2 && beefy && beefy.instance.hp.current >= BOSS_NUKE_HP) {
    if (knows(character, 'fireball') && slotsAt(character, 3) > 0 && !aoeWasted(live, 'fire')) {
      return { kind: 'cast', spellId: 'fireball', targetId: beefy.id };
    }
    if (
      knows(character, 'lightning-bolt') &&
      slotsAt(character, 3) > 0 &&
      !aoeWasted(live, 'lightning')
    ) {
      return { kind: 'cast', spellId: 'lightning-bolt', targetId: beefy.id };
    }
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

  // Spend a level-1 slot (Magic Missile) when a cantrip is too weak to matter —
  // but keep one slot back for the Shield reaction (it negates a killing blow).
  const reserveForShield = knows(character, 'shield') ? 1 : 0;
  if (
    knows(character, 'magic-missile') &&
    slotsAt(character, 1) > reserveForShield &&
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
    case 'rage': {
      const r = useRage({ character, state });
      return { state: r.state, character: r.character };
    }
    case 'reckless-attack': {
      const r = useRecklessAttack({ character, state });
      return { state: r.state, character: r.character };
    }
    case 'hunters-mark': {
      const r = useHuntersMark({ character, state, targetId: action.targetId });
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

// ---- Shrine blessing policy ------------------------------------------------

/**
 * Per-combat temp HP a blessing's temp-HP family would grant, mirroring the
 * `Math.max` fold in {@link createCombat}. Delve-level scaling reads
 * `character.level` — the exact value the engine multiplies by — so the score
 * tracks the real grant. Boss-only temp HP is excluded here (most rooms aren't
 * bosses); it's credited separately, discounted.
 */
function blessingTempHpGrant(m: BlessingModifiers, character: Character, banes: number): number {
  return Math.max(
    m.extraTempHpPerRoom ?? 0,
    (m.tempHpPerDelveLevel ?? 0) * character.level,
    (m.tempHpPerBaneQuirk ?? 0) * banes,
  );
}

/**
 * Score a single offered blessing for THIS build, in a shared "value" unit so
 * survival, offense, and synergy levers compare on one scale. Higher = better.
 *
 * The weights are calibrated to rank picks the way a careful player would, not
 * to predict exact win-rate (the sims measure the real lift). Three rules shape
 * them:
 *
 *  - **Defensive levers are renewable** (they fire every combat), so a point of
 *    AC / temp HP / regen is worth real value; a free death-save (stabilise
 *    charge) is worth the most of all.
 *  - **Offensive levers scale with how often they fire** — flat damage / crit
 *    range multiply by attacks-per-round (Fighter Extra Attack = ×2), while
 *    first-attack-only tricks are credited once. They're worth ~nothing to a
 *    Wizard, whose spells save-for-half or auto-hit (PR #105), so the whole
 *    offense block is gated to weapon classes.
 *  - **Synergy levers** (`*PerBaneQuirk`, `tempHpPerDelveLevel`) are scored at
 *    the soul's ACTUAL bane count / level, so a bare soul doesn't overvalue a
 *    card that needs curses it doesn't carry.
 *
 * A purely non-stacking lever the soul already owns folds with `Math.max`/OR in
 * {@link aggregateBlessingModifiers}, so a duplicate is a dead pick — scored
 * below "take nothing". The temp-HP family also doesn't stack, so only the
 * MARGINAL temp HP over the best source already held is credited.
 */
export function scoreBlessing(blessingId: string, character: Character): number {
  let b: Blessing;
  try {
    b = getBlessing(blessingId);
  } catch {
    return -1;
  }

  // A non-stacking lever already owned adds nothing — dead pick.
  if (isNonStackingBlessing(b)) {
    const sig = blessingSignature(b);
    const dup = character.blessings.some((id) => {
      try {
        return blessingSignature(getBlessing(id)) === sig;
      } catch {
        return false;
      }
    });
    if (dup) return -1;
  }

  const m = b.modifiers ?? {};
  const isFighter = character.classId === 'fighter';
  const isRogue = character.classId === 'rogue';
  const weaponClass =
    isFighter ||
    isRogue ||
    character.classId === 'barbarian' ||
    character.classId === 'ranger';
  const banes = baneQuirkCount(character);
  const attacks = characterHasMechanic(character, 'extra-attack') ? 2 : 1;

  let s = 0;

  // --- Survival (all classes) ---
  if (m.acBonus) s += m.acBonus * 7;
  if (m.acBonusWhileFull) s += m.acBonusWhileFull * 4; // you open every combat full
  if (m.acBonusWhileBloodied) s += m.acBonusWhileBloodied * 4; // clutch exactly when low
  if (m.acBonusPerBaneQuirk) s += m.acBonusPerBaneQuirk * banes * 6;

  // Temp-HP family is max-of (doesn't stack) — credit the marginal gain only.
  const candTempHp = blessingTempHpGrant(m, character, banes);
  if (candTempHp > 0) {
    let ownedTempHp = 0;
    for (const id of character.blessings) {
      try {
        ownedTempHp = Math.max(
          ownedTempHp,
          blessingTempHpGrant(getBlessing(id).modifiers ?? {}, character, banes),
        );
      } catch {
        /* unknown id — ignore */
      }
    }
    s += Math.max(0, candTempHp - ownedTempHp) * 2.5;
  }
  if (m.bossTempHp) s += m.bossTempHp * 1; // boss-only gird, discounted

  if (m.regenPerCombat) s += m.regenPerCombat * 3;
  if (m.regenPctPerCombat) s += (m.regenPctPerCombat / 100) * character.hp.max * 3;
  if (m.extraStabiliseCharges) s += m.extraStabiliseCharges * 12; // a free "don't die"

  // --- Offense (weapon classes only; inert for the wizard's save/auto-hit kit) ---
  if (weaponClass) {
    if (m.damageBonus) s += m.damageBonus * attacks * 4;
    if (m.holyDamageBonus) s += m.holyDamageBonus * attacks * 3.5;
    if (m.firstAttackDamage) s += m.firstAttackDamage * 2;
    if (m.firstAttackBonus) s += m.firstAttackBonus * 2;
    if (m.firstAttackAdvantage) s += isRogue ? 8 : 5; // rogue: reliably enables Sneak Attack
    if (m.critRangeBonus) s += m.critRangeBonus * 6;
    if (m.critRangeBonusWhileFull) s += m.critRangeBonusWhileFull * 4;
    if (m.critRangeBonusWhileBloodied) s += m.critRangeBonusWhileBloodied * 3;
    if (m.rerollMissesPerEncounter) s += m.rerollMissesPerEncounter * 3;
  }

  return s;
}

/**
 * Pick the best blessing from a shrine offer for this build. PURE — reads
 * `character`, mutates nothing. Returns the chosen id, or `undefined` for an
 * empty offer. Used by the sim bots (so balance data reflects a player who
 * actually takes shrine buffs) and available to the in-game Auto path.
 */
export function chooseBlessing(offer: string[], character: Character): string | undefined {
  if (offer.length === 0) return undefined;
  let best = offer[0];
  let bestScore = scoreBlessing(best, character);
  for (const id of offer.slice(1)) {
    const sc = scoreBlessing(id, character);
    if (sc > bestScore) {
      bestScore = sc;
      best = id;
    }
  }
  return best;
}
