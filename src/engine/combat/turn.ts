import type { Character } from '../../types/character';
import type { CombatState, MonsterCombatant } from '../../types/combat';
import { getActiveRoller } from '../dice';
import {
  combatResult,
  patchActionEconomy,
  patchResources,
  patchHp,
  type CombatActionResult,
} from './types';
import { appendLog } from './log';
import {
  decrementParalyzeDuration,
  getPlayerParalyzed,
  isPlayerParalyzed,
  lockOutActionEconomy,
  removeParalyze,
  rollPlayerSave,
} from './holdPerson';
import { tickPlayerConditions } from './playerConditions';
import { refreshMonsterIntents } from './attack/monsterIntent';
import type { ConditionName } from '../../types/conditions';
import { characterAffixMods } from '../items/affixMods';
import { evaluateCombatEnd } from './attack/damage';
import { isRaging } from '../character/derived';
import { isMartialClass, martialFlavor, regenMartialPoolForRound } from './martialResource';

function resetActionEconomyForCurrent(
  state: CombatState,
  character: Readonly<Character>,
): { state: CombatState; character: Character } {
  const currentId = state.turnOrder[state.currentTurnIndex];
  if (currentId === 'player') {
    const nextCharacter = patchActionEconomy(character, {
      actionUsed: false,
      bonusActionUsed: false,
      reactionUsed: false,
    });
    return { state, character: nextCharacter };
  }
  return {
    state: {
      ...state,
      combatants: state.combatants.map((c) => {
        if (c.id !== currentId || c.kind !== 'monster') return c;
        return {
          ...c,
          instance: {
            ...c.instance,
            actionEconomy: {
              actionUsed: false,
              bonusActionUsed: false,
              reactionUsed: false,
            },
          },
        };
      }),
    },
    character,
  };
}

/**
 * Compute the next live turn-holder. Skips dead combatants. Wraps from the
 * last index back to 0 and bumps the round counter.
 *
 * TODO: time-stop hook — if character.extraTurnsRemaining > 0, decrement and
 * re-trigger player turn instead of advancing. (Plug here so callers stay
 * agnostic to whether the player just bought another turn.)
 */
function advanceTurn(
  state: CombatState,
  character: Readonly<Character>,
): { nextIndex: number; round: number } {
  let nextIndex = state.currentTurnIndex;
  let round = state.round;
  const order = state.turnOrder;

  for (let i = 0; i < order.length; i++) {
    nextIndex = (nextIndex + 1) % order.length;
    if (nextIndex === 0) round += 1;

    const id = order[nextIndex];
    if (id === 'player') {
      if (character.hp.current > 0) break;
    } else {
      const combatant = state.combatants.find((c) => c.id === id);
      if (combatant?.kind === 'monster' && combatant.instance.hp.current > 0) break;
    }
  }

  return { nextIndex, round };
}

/**
 * Advance to the next combatant in turn order. Skip dead combatants.
 * Increment round when wrapping. Reset action economy for the new turn-holder.
 */
export function endTurn(state: CombatState, character: Readonly<Character>): CombatActionResult {
  if (state.status !== 'active') return combatResult(state, character);
  let nextCharacter: Character = character;

  const { nextIndex, round } = advanceTurn(state, nextCharacter);
  const order = state.turnOrder;

  // Cunning Action: Dash is "burst" — burn it or lose it. If the rogue
  // queued a bonus swing and didn't fire it before End Turn, drop the flag
  // so it can't be banked into next round.
  if (nextCharacter.bonusAttackAvailable) {
    nextCharacter = { ...nextCharacter, bonusAttackAvailable: false };
  }

  // Monk Flurry of Blows: queued flurry strikes are "burst" — fire them this
  // turn or lose them. Drop any unspent strikes so they can't bank into next
  // round.
  if ((nextCharacter.flurryStrikesRemaining ?? 0) > 0) {
    nextCharacter = { ...nextCharacter, flurryStrikesRemaining: 0 };
  }

  let nextState: CombatState = appendLog(
    {
      ...state,
      currentTurnIndex: nextIndex,
      round,
      playerAttacksThisTurn: 0,
      sneakAttackUsedThisTurn: false,
      colossusSlayerUsedThisTurn: false,
    },
    {
      id: state.log.length + 1,
      kind: 'system',
      text:
        order[nextIndex] === 'player'
          ? `— Your turn (round ${round}). —`
          : `— ${combatantDisplayName(state, order[nextIndex])}'s turn (round ${round}). —`,
    },
  );

  const reset = resetActionEconomyForCurrent(nextState, nextCharacter);
  nextState = reset.state;
  nextCharacter = reset.character;

  // Wizard: Shield expires at the start of the player's next turn.
  if (order[nextIndex] === 'player' && nextCharacter.resources.shieldActive) {
    nextCharacter = patchResources(nextCharacter, { shieldActive: false });
  }
  // Wizard: Misty Step's displacement bonus expires at the start of the player's next turn.
  if (order[nextIndex] === 'player' && nextCharacter.resources.mistyStepActive) {
    nextCharacter = patchResources(nextCharacter, { mistyStepActive: false });
  }
  // Wizard: Blur ticks down one round each time the player's turn comes around.
  if (
    order[nextIndex] === 'player' &&
    (nextCharacter.resources.blurRoundsRemaining ?? 0) > 0
  ) {
    nextCharacter = patchResources(nextCharacter, {
      blurRoundsRemaining: (nextCharacter.resources.blurRoundsRemaining ?? 0) - 1,
    });
  }
  // Wizard: the Apotheosis transformation burns down one round per player turn.
  if (
    order[nextIndex] === 'player' &&
    (nextCharacter.resources.ascendantRoundsRemaining ?? 0) > 0
  ) {
    nextCharacter = patchResources(nextCharacter, {
      ascendantRoundsRemaining: (nextCharacter.resources.ascendantRoundsRemaining ?? 0) - 1,
    });
  }
  // Per-turn martial stances clear at the start of the hero's next turn: the
  // OFFENSE spike and the armed DISRUPT are single-turn declarations (DISRUPT's
  // point is spent on declaration but the stagger lands on the hit — see
  // playerAttack). The one-spend-per-turn gate also resets here.
  if (order[nextIndex] === 'player') {
    if (nextCharacter.martialOffenseActive) {
      nextCharacter = { ...nextCharacter, martialOffenseActive: false };
    }
    if (nextCharacter.martialDisruptActive) {
      nextCharacter = { ...nextCharacter, martialDisruptActive: false };
    }
    if (nextCharacter.martialSpentThisTurn) {
      nextCharacter = { ...nextCharacter, martialSpentThisTurn: false };
    }
    // Martial pool regen: top the well back up mid-fight (every other round for
    // all three martial classes), capped at the class max — so a lever stays
    // live across the whole fight, not just the opening. Reads `round`, which
    // has already advanced to this turn's value above.
    if (isMartialClass(nextCharacter)) {
      const regened = regenMartialPoolForRound(nextCharacter, round);
      if (regened !== nextCharacter) {
        nextCharacter = regened;
        const flavor = martialFlavor(nextCharacter);
        if (flavor) {
          nextState = appendLog(nextState, {
            id: nextState.log.length + 1,
            kind: 'narration',
            text: `${nextCharacter.name}'s ${flavor.pool} gathers — a point returns.`,
          });
        }
      }
    }
    // Monk: the Patient Defense guard (and the disadvantage it imposes) holds
    // through the enemy phase and lifts at the start of the monk's next turn;
    // an armed-but-unspent Stunning Strike also clears here.
    if (nextCharacter.patientDefenseActive) {
      nextCharacter = { ...nextCharacter, patientDefenseActive: false };
    }
    if (nextCharacter.stunningStrikeActive) {
      nextCharacter = { ...nextCharacter, stunningStrikeActive: false };
    }
  }

  // Barbarian: the Reckless stance (and the advantage it hands enemies) clears
  // at the start of the barbarian's next turn; Rage burns down one round each
  // time that turn comes around.
  if (order[nextIndex] === 'player') {
    if (nextCharacter.recklessActive) {
      nextCharacter = { ...nextCharacter, recklessActive: false };
    }
    if ((nextCharacter.resources.rageRoundsRemaining ?? 0) > 0) {
      nextCharacter = patchResources(nextCharacter, {
        rageRoundsRemaining: (nextCharacter.resources.rageRoundsRemaining ?? 0) - 1,
      });
    }
  }

  // Druid: the Wild Shape burns down one round each time the druid's turn comes
  // around, and reverts the moment the form runs out — either the duration ends
  // or the beast's vitality (temp HP) has been spent through.
  if (order[nextIndex] === 'player' && (nextCharacter.resources.wildShapeRoundsRemaining ?? 0) > 0) {
    const remaining = (nextCharacter.resources.wildShapeRoundsRemaining ?? 0) - 1;
    const vitalitySpent = nextCharacter.hp.temp <= 0;
    if (remaining <= 0 || vitalitySpent) {
      nextCharacter = patchResources(nextCharacter, { wildShapeRoundsRemaining: 0 });
      nextState = appendLog(nextState, {
        id: nextState.log.length + 1,
        kind: 'narration',
        text: `${nextCharacter.name} lets the beast's shape fall away.`,
      });
    } else {
      nextCharacter = patchResources(nextCharacter, { wildShapeRoundsRemaining: remaining });
    }
  }

  // Tick down monster-debuff conditions (poisoned/frightened/blinded/restrained/
  // weakened) at the start of the player's turn, dropping any that expire.
  // Paralyzed is skipped here — its save-each-turn resolver below owns it.
  if (order[nextIndex] === 'player') {
    const ticked = tickPlayerConditions(nextCharacter);
    nextCharacter = ticked.character;
    for (const name of ticked.expired) {
      nextState = appendLog(nextState, {
        id: nextState.log.length + 1,
        kind: 'system',
        text: `${nextCharacter.name} ${conditionEndText(name)}.`,
      });
    }
  }

  if (order[nextIndex] === 'player' && isPlayerParalyzed(nextCharacter)) {
    const resolved = resolvePlayerParalyzedTurn(nextState, nextCharacter);
    nextState = resolved.state;
    nextCharacter = resolved.character;
  }

  // Cursed Ground twist: the hero takes a flat chip at the start of each of
  // their turns. Damage at turn-start lands regardless of paralysis (5e), so it
  // sits after the save resolution above and can itself end the fight.
  if (order[nextIndex] === 'player') {
    const cursed = applyCursedGroundChip(nextState, nextCharacter);
    nextState = cursed.state;
    nextCharacter = cursed.character;
  }

  // Regen (of Mending affix): tick one stack at the start of the player's
  // turn. Suppressed while raging (consistent with lifesteal).
  if (
    order[nextIndex] === 'player' &&
    (nextState.playerRegenStacks ?? 0) > 0 &&
    !isRaging(nextCharacter)
  ) {
    const regenAmount = characterAffixMods(nextCharacter).regenPerTurn;
    if (regenAmount > 0 && nextCharacter.hp.current < nextCharacter.hp.max) {
      const before = nextCharacter.hp.current;
      const after = Math.min(nextCharacter.hp.max, before + regenAmount);
      nextCharacter = patchHp(nextCharacter, { current: after });
      nextState = appendLog(nextState, {
        id: nextState.log.length + 1,
        kind: 'system',
        text: `${nextCharacter.name} mends — ${after - before} HP restored. (${(nextState.playerRegenStacks ?? 1) - 1} turns remaining)`,
      });
    }
    nextState = { ...nextState, playerRegenStacks: (nextState.playerRegenStacks ?? 1) - 1 };
  }

  // Regrowth (Druid HOT): knit a fixed amount at the start of the player's turn
  // for the ticks the cast banked, then expire. The cast already healed once;
  // these are the follow-on turns. Decrement even at full HP so the effect runs
  // down on schedule.
  if (
    order[nextIndex] === 'player' &&
    (nextCharacter.resources.regrowthTurnsRemaining ?? 0) > 0
  ) {
    const heal = nextCharacter.resources.regrowthHealPerTurn ?? 0;
    const remaining = (nextCharacter.resources.regrowthTurnsRemaining ?? 0) - 1;
    if (heal > 0 && nextCharacter.hp.current > 0 && nextCharacter.hp.current < nextCharacter.hp.max) {
      const before = nextCharacter.hp.current;
      const after = Math.min(nextCharacter.hp.max, before + heal);
      nextCharacter = patchHp(nextCharacter, { current: after });
      nextState = appendLog(nextState, {
        id: nextState.log.length + 1,
        kind: 'system',
        text: `Regrowth knits ${after - before} HP into ${nextCharacter.name}.${remaining > 0 ? ` (${remaining} turns remaining)` : ''}`,
      });
    }
    nextCharacter = patchResources(nextCharacter, { regrowthTurnsRemaining: remaining });
  }

  // Bleed DOT: tick each bleeding monster at the start of the player's turn.
  if (order[nextIndex] === 'player') {
    for (const combatant of nextState.combatants) {
      if (combatant.kind !== 'monster') continue;
      const mc = combatant as MonsterCombatant;
      if (
        mc.instance.hp.current <= 0 ||
        !mc.instance.bleedTurnsRemaining ||
        mc.instance.bleedTurnsRemaining <= 0
      ) continue;

      const bleedDmg = mc.instance.bleedDamagePerTurn ?? 0;
      if (bleedDmg <= 0) continue;

      const remainingTemp = Math.max(0, mc.instance.hp.temp - bleedDmg);
      const overflow = Math.max(0, bleedDmg - mc.instance.hp.temp);
      const newHp = Math.max(0, mc.instance.hp.current - overflow);
      const newTurns = mc.instance.bleedTurnsRemaining - 1;

      nextState = {
        ...nextState,
        combatants: nextState.combatants.map((c) => {
          if (c.kind !== 'monster' || c.id !== mc.id) return c;
          return {
            ...c,
            instance: {
              ...c.instance,
              hp: { ...c.instance.hp, current: newHp, temp: remainingTemp },
              bleedTurnsRemaining: newTurns,
            },
          };
        }),
      };
      nextState = appendLog(nextState, {
        id: nextState.log.length + 1,
        kind: 'damage',
        text: `${mc.instance.displayName} bleeds for ${bleedDmg} damage.${newTurns > 0 ? ` (${newTurns} turns remaining)` : ''}`,
      });
    }
    // Evaluate if any monster died from bleed.
    const ended = evaluateCombatEnd(nextState, nextCharacter);
    nextState = ended.state;
    nextCharacter = ended.character;
  }

  // Burn DOT (Fireball ignite): tick at the start of the player's turn.
  if (order[nextIndex] === 'player' && nextState.status === 'active') {
    for (const combatant of nextState.combatants) {
      if (combatant.kind !== 'monster') continue;
      const mc = combatant as MonsterCombatant;
      if (
        mc.instance.hp.current <= 0 ||
        !mc.instance.burnTurnsRemaining ||
        mc.instance.burnTurnsRemaining <= 0
      ) continue;
      const burnDmg = mc.instance.burnDamagePerTurn ?? 0;
      if (burnDmg <= 0) continue;
      const remainingTemp = Math.max(0, mc.instance.hp.temp - burnDmg);
      const overflow = Math.max(0, burnDmg - mc.instance.hp.temp);
      const newHp = Math.max(0, mc.instance.hp.current - overflow);
      const newTurns = mc.instance.burnTurnsRemaining - 1;
      nextState = {
        ...nextState,
        combatants: nextState.combatants.map((c) => {
          if (c.kind !== 'monster' || c.id !== mc.id) return c;
          return {
            ...c,
            instance: {
              ...c.instance,
              hp: { ...c.instance.hp, current: newHp, temp: remainingTemp },
              burnTurnsRemaining: newTurns,
            },
          };
        }),
      };
      nextState = appendLog(nextState, {
        id: nextState.log.length + 1,
        kind: 'damage',
        text: `${mc.instance.displayName} burns for ${burnDmg} fire.`,
      });
    }
    const burnEnded = evaluateCombatEnd(nextState, nextCharacter);
    nextState = burnEnded.state;
    nextCharacter = burnEnded.character;
  }

  // Spirit Beast (Druid summon): the persistent companion mauls a foe at the
  // start of the player's turn for the ticks the cast banked. Re-targets the
  // lowest-HP living enemy each turn (focus-fire — finish the wounded), applies
  // typeless auto-damage like the burn/bleed DOTs, then expires.
  if (
    order[nextIndex] === 'player' &&
    nextState.status === 'active' &&
    (nextCharacter.resources.spiritBeastTurnsRemaining ?? 0) > 0
  ) {
    const dmg = nextCharacter.resources.spiritBeastDamagePerTurn ?? 0;
    const remaining = (nextCharacter.resources.spiritBeastTurnsRemaining ?? 0) - 1;
    const prey = nextState.combatants
      .filter((c): c is MonsterCombatant => c.kind === 'monster' && c.instance.hp.current > 0)
      .sort((a, b) => a.instance.hp.current - b.instance.hp.current)[0];
    if (dmg > 0 && prey) {
      const remainingTemp = Math.max(0, prey.instance.hp.temp - dmg);
      const overflow = Math.max(0, dmg - prey.instance.hp.temp);
      const newHp = Math.max(0, prey.instance.hp.current - overflow);
      nextState = {
        ...nextState,
        combatants: nextState.combatants.map((c) => {
          if (c.kind !== 'monster' || c.id !== prey.id) return c;
          return {
            ...c,
            instance: { ...c.instance, hp: { ...c.instance.hp, current: newHp, temp: remainingTemp } },
          };
        }),
      };
      nextState = appendLog(nextState, {
        id: nextState.log.length + 1,
        kind: 'damage',
        text: `The spirit beast savages ${prey.instance.displayName} for ${dmg}.${remaining > 0 ? ` (${remaining} turns remaining)` : ''}`,
      });
    }
    nextCharacter = patchResources(nextCharacter, { spiritBeastTurnsRemaining: remaining });
    const beastEnded = evaluateCombatEnd(nextState, nextCharacter);
    nextState = beastEnded.state;
    nextCharacter = beastEnded.character;
  }

  // enemy-telegraph: re-select every monster's intent at the top of the
  // player's turn, against the post-housekeeping state, so the badge reflects
  // exactly what the player is now deciding against.
  if (order[nextIndex] === 'player' && nextState.status === 'active') {
    nextState = refreshMonsterIntents(nextState, nextCharacter);
  }

  return combatResult(nextState, nextCharacter);
}

/**
 * Cursed Ground twist (Ascension >= 4): bleed the current turn's chip from the
 * player, draining temp HP first, then real HP, then step the chip down by its
 * decay so the curse spends itself over the opening few turns. Front-loaded and
 * bounded on purpose — the old flat per-turn chip COMPOUNDED with fight length,
 * so tanky/defensive/slow builds and long elite/boss fights bled far more and
 * got ground to 1 HP (the lone twist that dropped the win rate, four sim passes
 * running). A front-loaded spike that decays to nothing keeps the tension — a
 * race to stabilize off the cursed stone — without taxing fights that run long.
 *
 * Non-lethal by design — the curse can drain a hero to 1 HP but never delivers
 * the killing blow itself (an enemy has to finish them). No-op when the curse is
 * absent or spent (state.cursedGroundChip falsy), the fight is over, or the
 * player is already down. Shared by createCombat (the hero's turn-0, which never
 * travels through endTurn) and the start-of-player-turn block above.
 */
export function applyCursedGroundChip(
  state: CombatState,
  character: Readonly<Character>,
): { state: CombatState; character: Character } {
  const chip = state.cursedGroundChip ?? 0;
  if (chip <= 0 || state.status !== 'active' || character.hp.current <= 0) {
    return { state, character: character as Character };
  }
  const fromTemp = Math.min(character.hp.temp, chip);
  const overflow = chip - fromTemp;
  const nextCharacter = patchHp(character, {
    temp: character.hp.temp - fromTemp,
    current: Math.max(1, character.hp.current - overflow),
  });
  const logged = appendLog(
    { ...state, cursedGroundChip: Math.max(0, chip - (state.cursedGroundChipDecay ?? chip)) },
    {
      id: state.log.length + 1,
      kind: 'damage',
      text: `The cursed ground bites ${nextCharacter.name} for ${chip} damage.`,
    },
  );
  return { state: logged, character: nextCharacter };
}

function conditionEndText(name: ConditionName): string {
  switch (name) {
    case 'poisoned':
      return 'shakes off the poison';
    case 'frightened':
      return 'steadies — the fear passes';
    case 'blinded':
      return 'blinks the dark away — sight returns';
    case 'restrained':
      return 'tears free';
    case 'weakened':
      return 'feels their strength return';
    default:
      return `is no longer ${name}`;
  }
}

/**
 * Player wakes a turn already paralyzed: roll a save against the active
 * condition's DC at turn start. Success removes the condition; the player
 * gets a normal turn. Failure ticks the duration; if it hits zero the
 * condition expires anyway, otherwise the player loses the turn.
 *
 * Exported so `createCombat` can run the same resolution on round-1 turn-0
 * (player goes first, so the "first player turn" never travels through
 * `endTurn`).
 */
export function resolvePlayerParalyzedTurn(
  state: CombatState,
  character: Readonly<Character>,
): { state: CombatState; character: Character } {
  let nextCharacter: Character = character;
  const cond = getPlayerParalyzed(nextCharacter);
  if (!cond || !cond.saveDC || !cond.saveAbility) return { state, character: nextCharacter };
  const roller = getActiveRoller();
  const save = rollPlayerSave(roller, nextCharacter, cond.saveAbility, cond.saveDC);
  nextCharacter = save.character;
  const logEntries = [];

  logEntries.push({
    id: state.log.length + 1,
    kind: 'roll' as const,
    text: `${nextCharacter.name} struggles against paralysis. ${cond.saveAbility.toUpperCase()} save${save.advantage ? ' (advantage)' : ''}: d20${save.mod >= 0 ? '+' : ''}${save.mod} = ${save.total} vs DC ${cond.saveDC} — ${save.success ? 'success' : 'fail'}.`,
  });

  if (save.success) {
    nextCharacter = removeParalyze(nextCharacter);
    logEntries.push({
      id: state.log.length + 2,
      kind: 'system' as const,
      text: `${nextCharacter.name} breaks free. The Magistrate's hold falls away.`,
    });
    return { state: appendLog(state, ...logEntries), character: nextCharacter };
  }

  const dec = decrementParalyzeDuration(nextCharacter);
  nextCharacter = dec.character;
  if (dec.expired) {
    logEntries.push({
      id: state.log.length + 2,
      kind: 'system' as const,
      text: `The binding wears thin and snaps. ${nextCharacter.name} can move again.`,
    });
    return { state: appendLog(state, ...logEntries), character: nextCharacter };
  }

  nextCharacter = lockOutActionEconomy(nextCharacter);
  logEntries.push({
    id: state.log.length + 2,
    kind: 'system' as const,
    text: `${nextCharacter.name} cannot move. The turn is lost.`,
  });
  return { state: appendLog(state, ...logEntries), character: nextCharacter };
}

function combatantDisplayName(state: CombatState, id: string): string {
  const c = state.combatants.find((x) => x.id === id);
  if (!c) return id;
  if (c.kind === 'player') return 'Player';
  return c.instance.displayName;
}

export function currentCombatantId(state: CombatState): string {
  return state.turnOrder[state.currentTurnIndex];
}

export function isPlayerTurn(state: CombatState): boolean {
  return currentCombatantId(state) === 'player';
}
