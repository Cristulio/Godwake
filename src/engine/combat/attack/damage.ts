import type { Character } from '../../../types/character';
import type {
  Combatant,
  CombatState,
  MonsterCombatant,
} from '../../../types/combat';
import { characterBlessingMods } from '../../character/blessings';
import { characterHasMechanic } from '../../character/derived';
import { getMonster } from '../../../content/monsters';
import { playSfx } from '../../audio';
import { appendLog } from '../log';
import { patchActionEconomy, patchDelveBudgets, patchHp } from '../types';
import { useMetaStore } from '../../../stores/metaStore';
import { wearsHeavierThanLight } from '../../character/equip';
import { t } from '../../../i18n';

const UNCANNY_DODGE_LEVEL = 5;

export function nextLogId(state: CombatState): number {
  return state.log.length + 1;
}

export interface DamageResult {
  state: CombatState;
  character: Character;
}

export function applyDamage(
  state: CombatState,
  targetId: string,
  amount: number,
  character: Readonly<Character>,
): DamageResult {
  let nextCharacter: Character = character;
  let next: CombatState = { ...state, combatants: state.combatants.map((c) => ({ ...c })) };
  const target = next.combatants.find((c) => c.id === targetId);
  if (!target) return { state, character: nextCharacter };

  if (target.kind === 'monster') {
    const mc = target as MonsterCombatant;
    const wasAlive = mc.instance.hp.current > 0;
    // boss-framework: a condition gate negates / heavily reduces incoming damage
    // while its linked add (a hidden heart, a statue, a weak-point) still lives.
    // The ward line tells the player WHY the blow glanced off — kill the add to
    // drop the gate, then damage lands in full. Single chokepoint, so it covers
    // weapon hits, spell damage and splash alike.
    let effectiveAmount = amount;
    const gate = getMonster(mc.instance.defId).gate;
    if (gate && amount > 0) {
      const addAlive = next.combatants.some(
        (c) =>
          c.kind === 'monster' &&
          c.instance.hp.current > 0 &&
          c.instance.defId === gate.whileAddAlive,
      );
      if (addAlive) {
        effectiveAmount = Math.floor(amount * (gate.damageTakenPct ?? 0));
        next = appendLog(next, {
          id: next.log.length + 1,
          kind: 'system',
          text:
            effectiveAmount <= 0
              ? t('combat.log.wardHold', { name: mc.instance.displayName, label: gate.wardLabel })
              : t('combat.log.wardPartial', {
                  name: mc.instance.displayName,
                  eff: effectiveAmount,
                  amount,
                  label: gate.wardLabel,
                }),
        });
      }
    }
    const remainingTemp = Math.max(0, mc.instance.hp.temp - effectiveAmount);
    const overflow = Math.max(0, effectiveAmount - mc.instance.hp.temp);
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
      // Codex: count one defeat per monster instance felled. Wrapped in
      // try/catch so engine tests that don't instantiate the meta store
      // (none today, but future ones may) don't fall over.
      try {
        useMetaStore.getState().recordMonsterDefeat(mc.instance.defId);
      } catch {
        /* meta store unavailable — non-fatal */
      }
    }
    return { state: next, character: nextCharacter };
  }

  // Player target.
  // Disengage: one-shot incoming damage reduction. Consumes on first hit
  // received, even if that hit was already going to be 0 — the rogue paid
  // a bonus action for it.
  const reduction = nextCharacter.incomingDamageReduction ?? 0;
  let workingAmount = amount;
  if (reduction > 0) {
    workingAmount = Math.max(0, workingAmount - reduction);
    nextCharacter = { ...nextCharacter, incomingDamageReduction: 0 };
    next = appendLog(next, {
      id: next.log.length + 1,
      kind: 'system',
      text: t('combat.log.disengage', { name: nextCharacter.name, reduction }),
    });
  }
  // Rogue Evasion (L10+): a boss's CHARGED special is telegraphed a full turn
  // ahead — the rogue reads the wind-up and rolls clear, taking only half. Fires
  // only inside the charged-special window (set in monsterAttack) and does NOT
  // spend the reaction, so it stacks with Uncanny Dodge answering an ordinary hit
  // the same round. When it fires it stands in for Uncanny Dodge on this blow (no
  // double-halving to a quarter).
  const evasionApplies =
    state.evasionWindowActive === true &&
    nextCharacter.classId === 'rogue' &&
    characterHasMechanic(nextCharacter, 'evasion') &&
    !wearsHeavierThanLight(nextCharacter) &&
    workingAmount > 0;
  if (evasionApplies) {
    const evaded = Math.floor(workingAmount / 2);
    next = appendLog(next, {
      id: next.log.length + 1,
      kind: 'system',
      text: t('combat.log.evasion', { name: nextCharacter.name, from: workingAmount, to: evaded }),
    });
    workingAmount = evaded;
  }
  if (
    !evasionApplies &&
    nextCharacter.classId === 'rogue' &&
    nextCharacter.level >= UNCANNY_DODGE_LEVEL &&
    !nextCharacter.actionEconomy.reactionUsed &&
    !wearsHeavierThanLight(nextCharacter) &&
    workingAmount > 0
  ) {
    const halved = Math.floor(workingAmount / 2);
    next = appendLog(next, {
      id: next.log.length + 1,
      kind: 'system',
      text: t('combat.log.uncannyDodge', { name: nextCharacter.name, from: workingAmount, to: halved }),
    });
    workingAmount = halved;
    nextCharacter = patchActionEconomy(nextCharacter, { reactionUsed: true });
  }
  const remainingTemp = Math.max(0, nextCharacter.hp.temp - workingAmount);
  const overflow = Math.max(0, workingAmount - nextCharacter.hp.temp);
  const wouldFall =
    nextCharacter.hp.current - overflow <= 0 && nextCharacter.hp.current > 0;

  if (wouldFall) {
    const stabilise = tryConsumeStabilise(nextCharacter);
    if (stabilise.spent) {
      nextCharacter = patchHp(stabilise.character, { temp: remainingTemp, current: 1 });
      next = appendLog(next, {
        id: next.log.length + 1,
        kind: 'system',
        text: t('combat.log.stabilise', { name: nextCharacter.name }),
      });
      return { state: next, character: nextCharacter };
    }
  }
  nextCharacter = patchHp(nextCharacter, {
    temp: remainingTemp,
    current: Math.max(0, nextCharacter.hp.current - overflow),
  });
  return { state: next, character: nextCharacter };
}

/** Default auto-stabilise charges granted per delve before bonuses stack. */
const BASE_STABILISE_CHARGES = 2;

/**
 * Spend a stabilise charge if any are available. Available =
 * BASE_STABILISE_CHARGES (free per delve) + extraStabiliseCharges (from
 * Ilmater's Patience stacks) + delveStabiliseBonus (Hardier Soul) -
 * stabilisesUsed. Returns the (possibly patched) character and a flag.
 */
function tryConsumeStabilise(
  character: Readonly<Character>,
): { spent: boolean; character: Character } {
  const blessingExtra = characterBlessingMods(character).extraStabiliseCharges ?? 0;
  const upgradeExtra = character.delveStabiliseBonus ?? 0;
  const used = character.delveBudgets?.stabilisesUsed ?? 0;
  const available = BASE_STABILISE_CHARGES + blessingExtra + upgradeExtra - used;
  if (available <= 0) return { spent: false, character };
  return {
    spent: true,
    character: patchDelveBudgets(character, { stabilisesUsed: used + 1 }),
  };
}

function isDead(c: Combatant, character: Readonly<Character>): boolean {
  if (c.kind === 'player') return character.hp.current <= 0;
  return c.instance.hp.current <= 0;
}

export interface CombatEndResult {
  state: CombatState;
  character: Character;
}

export function evaluateCombatEnd(
  state: CombatState,
  character: Readonly<Character>,
): CombatEndResult {
  let nextCharacter: Character = character;
  const allMonstersDead = state.combatants
    .filter((c) => c.kind === 'monster')
    .every((c) => isDead(c, nextCharacter));
  if (allMonstersDead) {
    if (nextCharacter.poisonImmuneEncounter) {
      nextCharacter = { ...nextCharacter, poisonImmuneEncounter: false };
    }
    return {
      state: appendLog(
        { ...state, status: 'player-victory' },
        { id: nextLogId(state), kind: 'system', text: t('combat.log.victory') },
      ),
      character: nextCharacter,
    };
  }
  if (nextCharacter.hp.current <= 0) {
    if (nextCharacter.poisonImmuneEncounter) {
      nextCharacter = { ...nextCharacter, poisonImmuneEncounter: false };
    }
    return {
      state: appendLog(
        { ...state, status: 'player-defeat' },
        { id: nextLogId(state), kind: 'system', text: t('combat.log.defeat') },
      ),
      character: nextCharacter,
    };
  }
  return { state, character: nextCharacter };
}
