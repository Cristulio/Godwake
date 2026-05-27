import type { DiceRoller } from '../../dice';
import { parseDiceExpression } from '../../dice';
import type { Character } from '../../../types/character';
import type {
  AttackEvent,
  Combatant,
  CombatState,
  CombatLogEntry,
} from '../../../types/combat';
import type { Weapon } from '../../../schemas/item';
import { abilityModifier } from '../../../types/abilities';
import {
  critRange,
  computeAC,
  effectiveAbilityScores,
  characterHasMechanic,
  proficiencyBonus,
} from '../../character/derived';
import { characterQuirkMods } from '../../character/quirks';
import { characterBlessingMods } from '../../character/blessings';
import { getItem } from '../../../content/items';
import { playSfx, swingSfxForWeapon } from '../../audio';
import { combatResult, type CombatActionResult } from '../types';
import { appendLog } from '../log';
import { applyDamage, evaluateCombatEnd, nextLogId } from './damage';

export interface AttackContext {
  roller: DiceRoller;
  character: Character;
  state: CombatState;
}

export function sneakAttackDiceForLevel(level: number): number {
  return Math.max(1, Math.ceil(level / 2));
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

/**
 * Player attacks a target with a weapon (must be the equipped main-hand).
 * Returns CombatActionResult: callers use result.state and result.character
 * directly. Internally still mutates ctx.character; the API surface gives
 * the caller a fresh reference via the combatResult helper, which is what
 * React.memo / Object.is comparators check. See dd-roguelite-mutation-
 * refactor-plan for the internal-purity cleanup that's still pending.
 */
export function playerAttack(
  ctx: AttackContext,
  targetId: string,
  weaponItemId: string,
): CombatActionResult {
  const { roller, character, state } = ctx;
  const target = findCombatant(state, targetId);
  if (!target) return combatResult(state, character);
  if (target.kind !== 'monster') return combatResult(state, character);

  const weapon = getItem(weaponItemId);
  if (weapon.kind !== 'weapon') return combatResult(state, character);
  playSfx(swingSfxForWeapon(weapon));

  const scores = effectiveAbilityScores(character);
  const w = weapon as Weapon;
  const isFinesse = w.properties.includes('finesse');
  // Ranged weapons (bows, crossbows) are flagged by the `ammunition` property.
  // Thrown daggers stay in the finesse branch — they're melee that can fly.
  const isRanged = w.properties.includes('ammunition');
  const attackAbility: 'str' | 'dex' = isRanged
    ? 'dex'
    : isFinesse
      ? (abilityModifier(scores.dex) >= abilityModifier(scores.str) ? 'dex' : 'str')
      : 'str';
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
  // One-shot flat-to-hit bonus consumed by the next attack roll (reserved
  // hook — Dash now grants a bonus swing instead of accuracy).
  const nextBonus = character.nextAttackBonus ?? 0;
  attackBonus += nextBonus;

  const ac = targetAC(target, character);
  const hideAdvantage = character.nextAttackAdvantage === true;
  const advantage: 'normal' | 'advantage' =
    (isFirstAttack && blessingMods.firstAttackAdvantage) || hideAdvantage
      ? 'advantage'
      : 'normal';
  // One-shot: consume Hide and any pending flat-to-hit bonus on the actual
  // attack roll, hit or miss.
  if (hideAdvantage) character.nextAttackAdvantage = false;
  if (nextBonus > 0) character.nextAttackBonus = 0;
  let toHit = roller.d20(advantage, attackBonus);
  let crit = critRange(character).includes(toHit.rolls[0]);
  let hit = crit || (toHit.total >= ac && !toHit.natural1);

  const logEntries: CombatLogEntry[] = [];
  const newLogId = nextLogId(state);
  const attackVerb = isRanged ? 'fires at' : 'attacks';
  logEntries.push({
    id: newLogId,
    kind: 'roll',
    text: `${character.name} ${attackVerb} ${displayName(target, character)} with ${weapon.name}. d20${attackBonus >= 0 ? '+' : ''}${attackBonus} = ${toHit.total} vs AC ${ac} ${crit ? '— CRITICAL HIT' : hit ? '— hit' : '— miss'}.`,
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

  let nextState: CombatState = appendLog(
    {
      ...state,
      // The player has now made an attack roll against this monster, so its AC
      // becomes "known" — UI can reveal it.
      combatants: state.combatants.map((c) => {
        if (c.kind !== 'monster' || c.id !== targetId) return c;
        if (c.instance.acRevealed) return c;
        return { ...c, instance: { ...c.instance, acRevealed: true } };
      }),
      lastAttack: attackEvent,
      attackEventCounter: attackEvent.id,
    },
    ...logEntries,
  );

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
    // Grove upgrades — permanent damage bonuses baked into the soul.
    const whetstone = character.permanentDamageBonus ?? 0;
    if (whetstone) {
      bonusDamage += whetstone;
      bonusParts.push(`+${whetstone} Whetstone`);
    }
    if (isFirstAttack && (character.permanentFirstAttackDamage ?? 0) > 0) {
      const fc = character.permanentFirstAttackDamage ?? 0;
      bonusDamage += fc;
      bonusParts.push(`+${fc} First Cut`);
    }
    if (targetWounded && (character.permanentWoundedTargetDamage ?? 0) > 0) {
      const bo = character.permanentWoundedTargetDamage ?? 0;
      bonusDamage += bo;
      bonusParts.push(`+${bo} Bleed-Out`);
    }
    if (crit && (character.permanentCritDamageBonus ?? 0) > 0) {
      const cd = character.permanentCritDamageBonus ?? 0;
      bonusDamage += cd;
      bonusParts.push(`+${cd} Fellfast`);
    }

    // Rogue Sneak Attack: once per turn, when the strike has the angle —
    // either rolled with advantage, or the target is already bloodied
    // (HP at half or less). Engine substitute for 5e's "ally adjacent"
    // clause: there are no allies here, but a wounded foe is leaning.
    const sneakAlreadyUsed = state.sneakAttackUsedThisTurn === true;
    const isRogue = character.classId === 'rogue';
    const sneakTriggers = advantage === 'advantage' || targetWounded;
    if (isRogue && !sneakAlreadyUsed && sneakTriggers) {
      const sneakDice =
        sneakAttackDiceForLevel(character.level) +
        (character.permanentSneakAttackDiceBonus ?? 0);
      const sneakRoll = roller.roll({
        count: sneakDice * (crit ? 2 : 1),
        die: 6,
        modifier: 0,
      });
      bonusDamage += sneakRoll.total;
      bonusParts.push(`+${sneakRoll.total} Sneak Attack (${sneakDice}d6)`);
      sneakAttackFiredFlag = true;
    }

    const totalDamage = damageRoll.total + abilMod + damageExpr.modifier + bonusDamage;

    nextState = applyDamage(nextState, targetId, totalDamage, character);

    const bonusSuffix = bonusParts.length > 0 ? ` (${bonusParts.join(', ')})` : '';
    // Build the visible equation so EVERY addend is shown and the math
    // matches the total. Previously the equation hid `bonusDamage`,
    // making it look like `2 +4 = 7` when the +1 radiant was off-screen.
    const equation: string[] = [damageRoll.rolls.join('+')];
    if (abilMod !== 0) equation.push(`${abilMod > 0 ? '+' : ''}${abilMod}`);
    if (damageExpr.modifier !== 0) {
      equation.push(`${damageExpr.modifier > 0 ? '+' : ''}${damageExpr.modifier}`);
    }
    if (bonusDamage !== 0) {
      equation.push(`${bonusDamage > 0 ? '+' : ''}${bonusDamage}`);
    }
    nextState = appendLog(nextState, {
      id: nextLogId(nextState),
      kind: 'damage',
      text: `Damage: ${equation.join(' ')} = ${totalDamage} ${weapon.damageType}${bonusSuffix}.`,
    });
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

  return combatResult(evaluateCombatEnd(nextState, character), character);
}

function markPlayerActionUsed(state: CombatState, character: Character): CombatState {
  // Cunning Action: Dash — if the Action is already spent, this swing is the
  // bonus one. Burn the flag, don't tick the per-Action attack counter.
  if (character.actionEconomy.actionUsed && character.bonusAttackAvailable) {
    character.bonusAttackAvailable = false;
    return state;
  }
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
