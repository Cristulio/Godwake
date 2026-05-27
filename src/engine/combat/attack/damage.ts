import type { Character } from '../../../types/character';
import type {
  Combatant,
  CombatState,
  MonsterCombatant,
} from '../../../types/combat';
import { characterBlessingMods } from '../../character/blessings';
import { playSfx } from '../../audio';
import { appendLog } from '../log';

export function nextLogId(state: CombatState): number {
  return state.log.length + 1;
}

export function applyDamage(
  state: CombatState,
  targetId: string,
  amount: number,
  character: Character,
): CombatState {
  let next = { ...state, combatants: state.combatants.map((c) => ({ ...c })) };
  const target = next.combatants.find((c) => c.id === targetId);
  if (!target) return state;

  if (target.kind === 'monster') {
    const mc = target as MonsterCombatant;
    const wasAlive = mc.instance.hp.current > 0;
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
    if (wasAlive && mc.instance.hp.current === 0) {
      playSfx('monster_death');
    }
  } else {
    // Disengage: one-shot incoming damage reduction. Consumes on first hit
    // received, even if that hit was already going to be 0 — the rogue paid
    // a bonus action for it.
    const reduction = character.incomingDamageReduction ?? 0;
    if (reduction > 0) {
      amount = Math.max(0, amount - reduction);
      character.incomingDamageReduction = 0;
      next = appendLog(next, {
        id: next.log.length + 1,
        kind: 'system',
        text: `${character.name} twists with the blow — ${reduction} damage avoided.`,
      });
    }
    const remainingTemp = Math.max(0, character.hp.temp - amount);
    const overflow = Math.max(0, amount - character.hp.temp);
    const wouldFall =
      character.hp.current - overflow <= 0 && character.hp.current > 0;

    if (wouldFall && tryConsumeStabilise(character)) {
      character.hp = { ...character.hp, temp: remainingTemp, current: 1 };
      next = appendLog(next, {
        id: next.log.length + 1,
        kind: 'system',
        text: `${character.name} is on death's door — Ilmater's grip holds. Stabilised at 1 HP.`,
      });
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

/** Default auto-stabilise charges granted per delve before bonuses stack. */
const BASE_STABILISE_CHARGES = 2;

/**
 * Spend a stabilise charge if any are available. Available =
 * BASE_STABILISE_CHARGES (free per delve) + extraStabiliseCharges (from
 * Ilmater's Patience stacks) + delveStabiliseBonus (Hardier Soul) -
 * stabilisesUsed. Mutates character.delveBudgets when it consumes one.
 * Returns whether a charge was spent.
 */
function tryConsumeStabilise(character: Character): boolean {
  const blessingExtra = characterBlessingMods(character).extraStabiliseCharges ?? 0;
  const upgradeExtra = character.delveStabiliseBonus ?? 0;
  const used = character.delveBudgets?.stabilisesUsed ?? 0;
  const available = BASE_STABILISE_CHARGES + blessingExtra + upgradeExtra - used;
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

export function evaluateCombatEnd(
  state: CombatState,
  character: Character,
): CombatState {
  const allMonstersDead = state.combatants
    .filter((c) => c.kind === 'monster')
    .every((c) => isDead(c, character));
  if (allMonstersDead) {
    // Combat resolved — clear per-encounter flags so they don't bleed into
    // the next room.
    if (character.poisonImmuneEncounter) character.poisonImmuneEncounter = false;
    return appendLog(
      { ...state, status: 'player-victory' },
      { id: nextLogId(state), kind: 'system', text: 'Victory. The room falls silent.' },
    );
  }
  if (character.hp.current <= 0) {
    if (character.poisonImmuneEncounter) character.poisonImmuneEncounter = false;
    return appendLog(
      { ...state, status: 'player-defeat' },
      { id: nextLogId(state), kind: 'system', text: 'You have fallen.' },
    );
  }
  return state;
}
