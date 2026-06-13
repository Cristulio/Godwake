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
import { paladinAuraDamageReduction, reconcileVow } from '../paladin';
import { bardSteelReduction, dreadTerrorBonus } from '../bard';
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
    // College of Whispers — Mantle of Dread (L10): the bard's blows + workings
    // bite a frightened foe deeper. At the single damage chokepoint, so it rides
    // spells, Vicious Mockery and the Spite pulse alike — only when damage is
    // already landing, so a full boss ward-hold stays held. No-op for any build
    // without the L10 beat or against an unfrightened foe.
    if (effectiveAmount > 0) {
      const terror = dreadTerrorBonus(nextCharacter);
      if (terror > 0 && mc.instance.conditions.some((c) => c.name === 'frightened')) {
        effectiveAmount += terror;
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
      // Paladin Oath of Vengeance — Relentless Avenger (L10): the single death
      // chokepoint for player-dealt damage, so a kill by any source (weapon,
      // smite, splash/cleave, spell) leaps the vow the same turn to the next-
      // deadliest living foe. The just-felled monster is at 0 HP, so the scan
      // skips it; no-op for any build without the L10 mechanic.
      next = reconcileVow(next, nextCharacter);
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
  // Paladin Oath of the Bulwark — Unbreakable Aura: a flat cushion shaves every
  // incoming hit (a persistent passive, so it stays silent to keep the log clean,
  // unlike the one-shot braces above). Never below zero.
  const auraReduction = paladinAuraDamageReduction(nextCharacter);
  if (auraReduction > 0 && workingAmount > 0) {
    workingAmount = Math.max(0, workingAmount - auraReduction);
  }
  // Bard — Song of Steel: while the fortifying march plays, every incoming blow
  // is dulled by a flat amount (the answer to "mobs destroy me", L1, both
  // colleges). Logged per blow, unlike the silent paladin aura — hearing the
  // music work IS the redesign's point. Never below zero.
  const steelReduction = bardSteelReduction(nextCharacter);
  if (steelReduction > 0 && workingAmount > 0) {
    const dulled = Math.max(0, workingAmount - steelReduction);
    next = appendLog(next, {
      id: next.log.length + 1,
      kind: 'system',
      text: t('combat.log.songSteelDull', { n: workingAmount - dulled }),
    });
    workingAmount = dulled;
  }
  // Elixir of Iron: iron-tempered skin shaves every blow for the rest of this
  // combat. Logged per blow like the Song of Steel — the player paid gold for
  // this fight's hide and should see it hold. Stacks with the shaves above;
  // never below zero. Cleared in combat resolution (evaluateCombatEnd).
  const ironReduction = nextCharacter.damageReductionEncounter ?? 0;
  if (ironReduction > 0 && workingAmount > 0) {
    const blunted = Math.max(0, workingAmount - ironReduction);
    next = appendLog(next, {
      id: next.log.length + 1,
      kind: 'system',
      text: t('combat.log.elixirIronDull', { n: workingAmount - blunted }),
    });
    workingAmount = blunted;
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

  // Defender Hold the Wall (L10): the first time this fight the fighter is driven
  // below half HP (and is still standing), a second wind of grit girds them with
  // temp HP equal to their level. One-shot per combat (CombatState flag). Temp HP
  // doesn't stack — take the larger of any pool already up.
  const halfMax = nextCharacter.hp.max / 2;
  const droppedBelowHalf =
    character.hp.current > halfMax &&
    nextCharacter.hp.current > 0 &&
    nextCharacter.hp.current <= halfMax;
  if (
    droppedBelowHalf &&
    !next.holdTheWallUsed &&
    characterHasMechanic(nextCharacter, 'hold-the-wall')
  ) {
    const grant = nextCharacter.level;
    if (grant > nextCharacter.hp.temp) {
      nextCharacter = patchHp(nextCharacter, { temp: grant });
    }
    next = { ...next, holdTheWallUsed: true };
    next = appendLog(next, {
      id: next.log.length + 1,
      kind: 'system',
      text: t('combat.log.holdTheWall', { name: nextCharacter.name, n: grant }),
    });
  }
  return { state: next, character: nextCharacter };
}

/** Default auto-stabilise charges granted per delve before bonuses stack. */
const BASE_STABILISE_CHARGES = 2;

/**
 * Spend a stabilise charge if any are available. Available =
 * BASE_STABILISE_CHARGES (free per delve) + extraStabiliseCharges (from
 * Atlas's Patience stacks) + delveStabiliseBonus (Hardier Soul) -
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

/**
 * Strip every per-combat consumable effect (Antitoxin's immunity, Elixir of
 * Iron's hide, Oil of Sharpness's edge) — called from both resolution paths so
 * a drink never leaks into the next fight. No-op when nothing is active.
 */
export function clearEncounterConsumables(character: Readonly<Character>): Character {
  if (
    !character.poisonImmuneEncounter &&
    !character.damageReductionEncounter &&
    !character.attackBonusEncounter &&
    !character.damageBonusEncounter
  ) {
    return character;
  }
  return {
    ...character,
    poisonImmuneEncounter: false,
    damageReductionEncounter: 0,
    attackBonusEncounter: 0,
    damageBonusEncounter: 0,
  };
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
    nextCharacter = clearEncounterConsumables(nextCharacter);
    return {
      state: appendLog(
        { ...state, status: 'player-victory' },
        { id: nextLogId(state), kind: 'system', text: t('combat.log.victory') },
      ),
      character: nextCharacter,
    };
  }
  if (nextCharacter.hp.current <= 0) {
    nextCharacter = clearEncounterConsumables(nextCharacter);
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
