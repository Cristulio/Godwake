import type { Character } from '../../types/character';
import type { CombatState, CombatLogEntry, MonsterCombatant } from '../../types/combat';
import { characterHasMechanic } from '../character/derived';
import { rageBrokenByArmor } from '../character/equip';
import { RAGE_ROUNDS, isRageUnlimited } from '../character/actions';
import {
  combatResult,
  patchActionEconomy,
  patchHp,
  patchResources,
  type CombatActionResult,
} from './types';
import { appendLog } from './log';
import { attachCombatVfx } from './vfx';
import { t } from '../../i18n';

/** Rounds the Berserker's Intimidating Presence holds a foe in fear. */
const INTIMIDATING_PRESENCE_ROUNDS = 2;

/** The deadliest live foe on the field — the one with the most max HP (the boss
 *  or the heaviest hitter), ties broken by spawn order. Undefined if none live. */
function deadliestLiveMonster(state: CombatState): MonsterCombatant | undefined {
  let best: MonsterCombatant | undefined;
  for (const c of state.combatants) {
    if (c.kind !== 'monster' || c.instance.hp.current <= 0) continue;
    if (!best || c.instance.hp.max > best.instance.hp.max) best = c;
  }
  return best;
}

export interface RageContext {
  character: Character;
  state: CombatState;
}

/**
 * Barbarian Rage. Bonus action: drop into a battle-fury for {@link RAGE_ROUNDS}
 * rounds. Physical damage is halved (monsterAttack); melee hits land for bonus
 * damage (playerAttack). Fury locks out healing — draughts and lifesteal are
 * suppressed (useItem / playerAttack gate on isRaging).
 *
 * From L2 (the `reckless-attack` feature) the fury also fights recklessly:
 * entering Rage flips `recklessActive` on, so every melee swing rolls with
 * advantage and every attack against the barbarian does too — for the whole
 * Rage, no extra click. Rage's damage halving offsets the incoming risk.
 * Reckless tracks Rage 1:1 and is cleared when the fury fades (see `endTurn`).
 *
 * Rationed: entering spends one Rage charge (see `rageChargesRemaining` /
 * `rageChargesMax`), and with none left the barbarian can't rage — the bonus
 * action does nothing. The L20 capstone rages without spending. Charges come
 * back only at a rest, not per fight, so the long 5-round window and no-heal
 * tradeoff ride on a real choice about when to burn one. Re-entry while already
 * raging is a no-op so a second bonus action can't double-spend.
 */
export function useRage(ctx: RageContext): CombatActionResult {
  const { character, state } = ctx;
  if (character.classId !== 'barbarian') return combatResult(state, character);
  if (!characterHasMechanic(character, 'rage')) return combatResult(state, character);
  // Heavy armour smothers the fury — it can't take hold while plate is worn.
  // Spend nothing (no charge, no bonus action); just say why.
  if (rageBrokenByArmor(character)) {
    const log: CombatLogEntry = {
      id: state.log.length + 1,
      kind: 'narration',
      text: t('combat.log.rageBlockedArmor', { name: character.name }),
    };
    return combatResult(appendLog(state, log), character);
  }
  if (character.actionEconomy.bonusActionUsed) return combatResult(state, character);
  if ((character.resources.rageRoundsRemaining ?? 0) > 0) return combatResult(state, character);

  const unlimited = isRageUnlimited(character);
  const charges = character.resources.rageChargesRemaining ?? 0;
  if (!unlimited && charges <= 0) return combatResult(state, character);

  let nextCharacter: Character = patchResources(character, {
    rageRoundsRemaining: RAGE_ROUNDS,
    ...(unlimited ? {} : { rageChargesRemaining: charges - 1 }),
  });
  nextCharacter = patchActionEconomy(nextCharacter, { bonusActionUsed: true });
  // From L2 on, raging means fighting recklessly: advantage on melee swings and
  // advantage to attacks against you, for the whole fury (cleared on rage end).
  if (characterHasMechanic(nextCharacter, 'reckless-attack')) {
    nextCharacter = { ...nextCharacter, recklessActive: true };
  }

  const log: CombatLogEntry = {
    id: state.log.length + 1,
    kind: 'narration',
    text: t('combat.log.rageEnter', { name: nextCharacter.name, rounds: RAGE_ROUNDS }),
  };
  let nextState: CombatState = attachCombatVfx(appendLog(state, log), 'rage', 'player');

  // Totem (Bear) Aspect of the Bear (L10): the fury wraps a fresh hide each time
  // it takes hold — temporary HP equal to level (the elemental resistance rides
  // monsterAttack). Temp HP doesn't stack: take the larger of any pending pool.
  if (characterHasMechanic(nextCharacter, 'aspect-of-the-bear')) {
    const grant = nextCharacter.level;
    if (grant > nextCharacter.hp.temp) {
      nextCharacter = patchHp(nextCharacter, { temp: grant });
      nextState = appendLog(nextState, {
        id: nextState.log.length + 1,
        kind: 'system',
        text: t('combat.log.bearWard', { name: nextCharacter.name, n: grant }),
      });
    }
  }

  // Berserker Intimidating Presence (L10): entering Rage grips the deadliest live
  // foe with dread — frightened for two rounds (read as attack disadvantage and
  // ticked down in monsterAttack).
  if (characterHasMechanic(nextCharacter, 'intimidating-presence')) {
    const prey = deadliestLiveMonster(nextState);
    if (prey) {
      nextState = {
        ...nextState,
        combatants: nextState.combatants.map((c) => {
          if (c.kind !== 'monster' || c.id !== prey.id) return c;
          return {
            ...c,
            instance: {
              ...c.instance,
              conditions: [
                ...c.instance.conditions.filter((x) => x.name !== 'frightened'),
                {
                  name: 'frightened' as const,
                  duration: { kind: 'rounds' as const, value: INTIMIDATING_PRESENCE_ROUNDS },
                  source: 'player',
                },
              ],
            },
          };
        }),
      };
      nextState = appendLog(nextState, {
        id: nextState.log.length + 1,
        kind: 'system',
        text: t('combat.log.intimidate', { name: nextCharacter.name, target: prey.instance.displayName }),
      });
    }
  }

  return combatResult(nextState, nextCharacter);
}
