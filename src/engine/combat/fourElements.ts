import type { Character } from '../../types/character';
import type { CombatState } from '../../types/combat';
import type { DiceRoller } from '../dice';
import { abilityModifier } from '../../types/abilities';
import { characterHasMechanic } from '../character/derived';
import { combatResult, patchActionEconomy, patchResources, type CombatActionResult } from './types';
import { appendLog } from './log';
import { attachCombatVfx } from './vfx';
import { applyDamage, evaluateCombatEnd } from './attack/damage';
import { getActiveRoller } from '../dice';
import { getMonster } from '../../content/monsters';
import {
  type MonkActionContext,
  ELEMENTAL_BURST_KI_COST,
  ELEMENTAL_BURN_TURNS,
  monkElementalBurstDice,
  monkElementalBurnPerTurn,
  monkKiSaveDC,
  monkKitActive,
} from './monk';
import { t } from '../../i18n';

// Lives apart from monk.ts on purpose: the burst calls applyDamage, which pulls
// the metaStore → characterStore → defaultCharacter chain. monk.ts sits IN that
// chain (the character factories read its predicates), so importing applyDamage
// there closed an init cycle (STANDARD_ARRAY undefined at module-eval). This
// module is pulled only by the action policy + the combat UI, never the store
// init — the same separation whispers.ts uses for the bard's dread.

/**
 * Way of the Four Elements — Elemental Burst. Bonus action,
 * {@link ELEMENTAL_BURST_KI_COST} Ki: loose a gout of elemental fire at EVERY foe
 * — each rolls a Dexterity save against the monk's Ki DC, taking
 * {@link monkElementalBurstDice}d6 fire, halved on a save. The monk's one true
 * AoE and its ranged "spell" — the answer to a crowd that Flurry (single-target)
 * and the fists cannot thin. Reads the active roller (the action carries none),
 * an injectable param keeping tests deterministic; the same fallback createCombat
 * leans on. No-op for a non-Four-Elements monk, a stilled kit, a spent bonus
 * action, or an empty well.
 */
export function useElementalBurst(
  ctx: MonkActionContext,
  roller: DiceRoller = getActiveRoller(),
): CombatActionResult {
  const { character, state } = ctx;
  if (character.classId !== 'monk') return combatResult(state, character);
  if (!monkKitActive(character)) return combatResult(state, character);
  if (!characterHasMechanic(character, 'elemental-burst')) return combatResult(state, character);
  if (character.actionEconomy.bonusActionUsed) return combatResult(state, character);
  const ki = character.resources.kiPointsRemaining ?? 0;
  if (ki < ELEMENTAL_BURST_KI_COST) return combatResult(state, character);

  const dc = monkKiSaveDC(character);
  const diceN = monkElementalBurstDice(character);
  const burnPerTurn = monkElementalBurnPerTurn(character);
  let nextCharacter: Character = character;
  // A room-wide gout of fire: the AoE BURST shape + fire element so it both sounds
  // (spell_fire crackle) and looks (fire palette) right — a lone 'spell-bolt' with
  // no element was silent and colourless (audio sweep P1).
  let nextState: CombatState = attachCombatVfx(state, 'spell-burst', 'player', undefined, 'fire');
  nextState = appendLog(nextState, {
    id: nextState.log.length + 1,
    kind: 'narration',
    text: t('combat.log.elementalBurst', { name: character.name }),
  });

  const living = nextState.combatants.filter(
    (c): c is typeof c & { kind: 'monster' } =>
      c.kind === 'monster' && c.instance.hp.current > 0,
  );
  for (const foe of living) {
    const dexMod = abilityModifier(getMonster(foe.instance.defId).abilityScores.dex ?? 10);
    const save = roller.d20('normal', dexMod);
    const roll = roller.roll({ count: diceN, die: 6, modifier: 0 });
    const saved = save.total >= dc;
    const dealt = saved ? Math.floor(roll.total / 2) : roll.total;
    const damaged = applyDamage(nextState, foe.id, dealt, nextCharacter);
    nextState = damaged.state;
    nextCharacter = damaged.character;
    nextState = appendLog(nextState, {
      id: nextState.log.length + 1,
      kind: 'damage',
      text: t('combat.log.elementalBurstHit', {
        target: foe.instance.displayName,
        dealt,
        halved: saved ? t('combat.log.halvedSuffix') : '',
      }),
    });

    // Lingering fire — the RIDER. Even a saved foe keeps burning: an
    // unconditional DOT for ELEMENTAL_BURN_TURNS, max-of so a fresh burst
    // refreshes but never downgrades a stronger burn (it shares Fireball's DOT).
    const stillAlive = nextState.combatants.some(
      (c) => c.kind === 'monster' && c.id === foe.id && c.instance.hp.current > 0,
    );
    if (stillAlive && burnPerTurn > 0) {
      nextState = {
        ...nextState,
        combatants: nextState.combatants.map((c) => {
          if (c.kind !== 'monster' || c.id !== foe.id) return c;
          return {
            ...c,
            instance: {
              ...c.instance,
              burnDamagePerTurn: Math.max(c.instance.burnDamagePerTurn ?? 0, burnPerTurn),
              burnTurnsRemaining: Math.max(c.instance.burnTurnsRemaining ?? 0, ELEMENTAL_BURN_TURNS),
            },
          };
        }),
      };
    }
  }

  nextCharacter = patchResources(nextCharacter, {
    kiPointsRemaining: ki - ELEMENTAL_BURST_KI_COST,
  });
  nextCharacter = patchActionEconomy(nextCharacter, { bonusActionUsed: true });
  const ended = evaluateCombatEnd(nextState, nextCharacter);
  return combatResult(ended.state, ended.character);
}
