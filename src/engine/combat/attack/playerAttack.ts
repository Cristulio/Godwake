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
import {
  combatResult,
  patchActionEconomy,
  patchDelveBudgets,
  type CombatActionResult,
} from '../types';
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

function displayName(c: Combatant, character: Readonly<Character>): string {
  return c.kind === 'player' ? character.name : c.instance.displayName;
}

function targetAC(target: Combatant, character: Readonly<Character>): number {
  return target.kind === 'player' ? computeAC(character) : target.instance.ac;
}

/**
 * Player attacks a target with a weapon (must be the equipped main-hand).
 * Returns CombatActionResult: callers use result.state and result.character
 * directly. Internals thread a local `nextCharacter` accumulator — no in-place
 * mutation of `ctx.character` anywhere.
 */
export function playerAttack(
  ctx: AttackContext,
  targetId: string,
  weaponItemId: string,
): CombatActionResult {
  const { roller, character, state } = ctx;
  let nextCharacter: Character = character;
  const target = findCombatant(state, targetId);
  if (!target) return combatResult(state, nextCharacter);
  if (target.kind !== 'monster') return combatResult(state, nextCharacter);

  const weapon = getItem(weaponItemId);
  if (weapon.kind !== 'weapon') return combatResult(state, nextCharacter);
  playSfx(swingSfxForWeapon(weapon));

  const scores = effectiveAbilityScores(nextCharacter);
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
  const profBonus = proficiencyBonus(nextCharacter.level);

  const quirkMods = characterQuirkMods(nextCharacter);
  const blessingMods = characterBlessingMods(nextCharacter);
  const isFirstAttack = !state.playerHasAttacked;
  const targetWounded =
    target.kind === 'monster' &&
    target.instance.hp.current > 0 &&
    target.instance.hp.current <= target.instance.hp.max / 2;
  const playerWounded = nextCharacter.hp.current <= nextCharacter.hp.max / 2;

  let attackBonus = abilMod + profBonus;
  attackBonus += nextCharacter.permanentBonuses?.attack ?? 0;
  attackBonus += nextCharacter.delveAttackBonus ?? 0;
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
  const nextBonus = nextCharacter.nextAttackBonus ?? 0;
  attackBonus += nextBonus;

  const ac = targetAC(target, nextCharacter);
  const hideAdvantage = nextCharacter.nextAttackAdvantage === true;
  const advantage: 'normal' | 'advantage' =
    (isFirstAttack && blessingMods.firstAttackAdvantage) || hideAdvantage
      ? 'advantage'
      : 'normal';
  // One-shot: consume Hide and any pending flat-to-hit bonus on the actual
  // attack roll, hit or miss.
  if (hideAdvantage) nextCharacter = { ...nextCharacter, nextAttackAdvantage: false };
  if (nextBonus > 0) nextCharacter = { ...nextCharacter, nextAttackBonus: 0 };
  let toHit = roller.d20(advantage, attackBonus);
  let crit = critRange(nextCharacter).includes(toHit.rolls[0]);
  let hit = crit || (toHit.total >= ac && !toHit.natural1);

  const logEntries: CombatLogEntry[] = [];
  const newLogId = nextLogId(state);
  const attackVerb = isRanged ? 'fires at' : 'attacks';
  logEntries.push({
    id: newLogId,
    kind: 'roll',
    text: `${nextCharacter.name} ${attackVerb} ${displayName(target, nextCharacter)} with ${weapon.name}. d20${attackBonus >= 0 ? '+' : ''}${attackBonus} = ${toHit.total} vs AC ${ac} ${crit ? '— CRITICAL HIT' : hit ? '— hit' : '— miss'}.`,
  });

  // Auto-reroll a miss if a reroll budget is available. Prefer the
  // per-encounter budget (Tymora's Coin) before the per-delve one (Tymora's Eye).
  let usedEncounterReroll = 0;
  let usedDelveReroll = 0;
  if (!hit) {
    let source: 'encounter' | 'delve' | null = null;
    if (state.rerollMissesEncounterRemaining > 0) source = 'encounter';
    else if ((nextCharacter.delveBudgets?.quirkRerollMissesRemaining ?? 0) > 0) source = 'delve';
    if (source) {
      if (source === 'encounter') usedEncounterReroll = 1;
      else usedDelveReroll = 1;
      toHit = roller.d20(advantage, attackBonus);
      crit = critRange(nextCharacter).includes(toHit.rolls[0]);
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
    attackerName: nextCharacter.name,
    targetName: displayName(target, nextCharacter),
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
    let sneakDamage = 0;
    let sneakDice = 0;
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
    const whetstone = nextCharacter.permanentBonuses?.damage ?? 0;
    if (whetstone) {
      bonusDamage += whetstone;
      bonusParts.push(`+${whetstone} Whetstone`);
    }
    if (isFirstAttack && (nextCharacter.permanentFirstAttackDamage ?? 0) > 0) {
      const fc = nextCharacter.permanentFirstAttackDamage ?? 0;
      bonusDamage += fc;
      bonusParts.push(`+${fc} First Cut`);
    }
    if (targetWounded && (nextCharacter.permanentWoundedTargetDamage ?? 0) > 0) {
      const bo = nextCharacter.permanentWoundedTargetDamage ?? 0;
      bonusDamage += bo;
      bonusParts.push(`+${bo} Bleed-Out`);
    }
    if (crit && (nextCharacter.permanentCritDamageBonus ?? 0) > 0) {
      const cd = nextCharacter.permanentCritDamageBonus ?? 0;
      bonusDamage += cd;
      bonusParts.push(`+${cd} Fellfast`);
    }

    // Rogue Sneak Attack: once per turn, when the strike has the angle —
    // either rolled with advantage, or the target is already bloodied
    // (HP at half or less). Engine substitute for 5e's "ally adjacent"
    // clause: there are no allies here, but a wounded foe is leaning.
    const sneakAlreadyUsed = state.sneakAttackUsedThisTurn === true;
    const isRogue = nextCharacter.classId === 'rogue';
    const sneakTriggers = advantage === 'advantage' || targetWounded;
    if (isRogue && !sneakAlreadyUsed && sneakTriggers) {
      sneakDice =
        sneakAttackDiceForLevel(nextCharacter.level) +
        (nextCharacter.permanentBonuses?.sneakAttackDice ?? 0);
      const sneakRoll = roller.roll({
        count: sneakDice * (crit ? 2 : 1),
        die: 6,
        modifier: 0,
      });
      sneakDamage = sneakRoll.total;
      bonusDamage += sneakDamage;
      sneakAttackFiredFlag = true;
    }

    const totalDamage = damageRoll.total + abilMod + damageExpr.modifier + bonusDamage;

    const damaged = applyDamage(nextState, targetId, totalDamage, nextCharacter);
    nextState = damaged.state;
    nextCharacter = damaged.character;

    const breakdown: string[] = [`${damageRoll.total} dice`];
    const pushPart = (val: number, label: string) => {
      if (val === 0) return;
      breakdown.push(val > 0 ? `+ ${val} ${label}` : `- ${Math.abs(val)} ${label}`);
    };
    pushPart(abilMod, 'STR');
    pushPart(damageExpr.modifier, 'magic');
    if (sneakDamage > 0) pushPart(sneakDamage, `sneak (${sneakDice}d6)`);
    const flavorSuffix = bonusParts.length > 0 ? ` (${bonusParts.join(', ')})` : '';
    nextState = appendLog(nextState, {
      id: nextLogId(nextState),
      kind: 'damage',
      text: `Damage: ${totalDamage} ${weapon.damageType} (${breakdown.join(' ')})${flavorSuffix}.`,
    });
  }

  // Mark action used for the player
  const markResult = markPlayerActionUsed(nextState, nextCharacter);
  nextState = markResult.state;
  nextCharacter = markResult.character;
  nextState = {
    ...nextState,
    playerHasAttacked: true,
    rerollMissesEncounterRemaining:
      nextState.rerollMissesEncounterRemaining - usedEncounterReroll,
  };
  if (hit && sneakAttackFiredFlag) {
    nextState = { ...nextState, sneakAttackUsedThisTurn: true };
  }
  if (usedDelveReroll > 0 && nextCharacter.delveBudgets) {
    nextCharacter = patchDelveBudgets(nextCharacter, {
      quirkRerollMissesRemaining:
        (nextCharacter.delveBudgets.quirkRerollMissesRemaining ?? 0) - usedDelveReroll,
    });
  }

  const ended = evaluateCombatEnd(nextState, nextCharacter);
  return combatResult(ended.state, ended.character);
}

function markPlayerActionUsed(
  state: CombatState,
  character: Readonly<Character>,
): { state: CombatState; character: Character } {
  // Cunning Action: Dash — if the Action is already spent, this swing is the
  // bonus one. Burn the flag, don't tick the per-Action attack counter.
  if (character.actionEconomy.actionUsed && character.bonusAttackAvailable) {
    return { state, character: { ...character, bonusAttackAvailable: false } };
  }
  const attacksMade = (state.playerAttacksThisTurn ?? 0) + 1;
  const maxAttacks = maxAttacksPerAction(character);
  if (attacksMade < maxAttacks) {
    return {
      state: { ...state, playerAttacksThisTurn: attacksMade },
      character,
    };
  }
  return {
    state: { ...state, playerAttacksThisTurn: attacksMade },
    character: patchActionEconomy(character, { actionUsed: true }),
  };
}

/** Fighter L5 Extra Attack grants 2 attacks per Attack action. */
function maxAttacksPerAction(character: Readonly<Character>): number {
  return characterHasMechanic(character, 'extra-attack') ? 2 : 1;
}
