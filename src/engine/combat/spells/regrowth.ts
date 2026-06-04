import type { Character } from '../../../types/character';
import type { CombatState } from '../../../types/combat';
import { spellcastingMod } from '../../character/derived';
import { appendLog } from '../log';
import { patchResources } from '../types';
import {
  type CastResult,
  type CastSpellContext,
  attachSpellEffect,
  consumeSlot,
  markActionUsed,
  nextLogId,
} from './helpers';

/** Player-turn-start heal ticks after the immediate one. With the cast's own
 *  heal that is three knits in all (now + the start of the next two turns). */
export const REGROWTH_TICKS = 2;

/**
 * Regrowth (2nd) — transmutation, self. The Druid's only sustain: a heal-over-
 * time the Wizard's book can't match. The cast knits 1d6 + the caster's Wisdom
 * modifier immediately, then the same amount again at the start of each of the
 * next {@link REGROWTH_TICKS} player turns (ticked in turn.ts off
 * `regrowthTurnsRemaining`). Conservative on purpose — real staying power
 * without out-healing a fight.
 */
export function castRegrowth(ctx: CastSpellContext): CastResult {
  const { state, roller } = ctx;
  let nextCharacter: Character = consumeSlot(ctx.character, 2);

  const roll = roller.roll({ count: 1, die: 6, modifier: 0 });
  const perTurn = Math.max(1, roll.total + spellcastingMod(nextCharacter));

  const before = nextCharacter.hp.current;
  const after = Math.min(nextCharacter.hp.max, before + perTurn);
  nextCharacter = { ...nextCharacter, hp: { ...nextCharacter.hp, current: after } };
  nextCharacter = patchResources(nextCharacter, {
    regrowthHealPerTurn: perTurn,
    regrowthTurnsRemaining: REGROWTH_TICKS,
  });

  let nextState: CombatState = appendLog(state, {
    id: nextLogId(state),
    kind: 'system',
    text: `Green life wells up through ${nextCharacter.name} — ${after - before} HP knit, and ${perTurn} more at the start of each of the next ${REGROWTH_TICKS} turns.`,
  });
  nextState = attachSpellEffect(nextState, 'regrowth', 'player');

  nextCharacter = markActionUsed(nextCharacter);
  return { state: nextState, character: nextCharacter, cast: true };
}
