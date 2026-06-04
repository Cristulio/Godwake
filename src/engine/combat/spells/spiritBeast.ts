import type { Character } from '../../../types/character';
import type { CombatState } from '../../../types/combat';
import { applyDamage } from '../attack';
import { appendLog } from '../log';
import { patchResources } from '../types';
import {
  type CastResult,
  type CastSpellContext,
  attachSpellEffect,
  consumeSlot,
  evaluateCombatEndFull,
  findMonster,
  firstLiveMonsterId,
  markActionUsed,
  nextLogId,
} from './helpers';
import { scaleSpellDamage } from './scaling';

/** Player-turn-start maulings after the immediate one. With the cast's own
 *  strike that is three hits in all (now + the start of the next two turns). */
export const SPIRIT_BEAST_TICKS = 2;

/** Base dice the beast deals per strike (2d8), before the shared level + casting-
 *  mod scaling (scaling.ts) grows it like every other damage spell. */
const SPIRIT_BEAST_DICE = 2;

/**
 * Spirit Beast (7th) — conjuration. A persistent COMPANION, not an ally
 * combatant: the engine has no player-side ally entity, so the summon is modelled
 * as an auto-damage effect. The beast savages a foe for 2d8 immediately, then the
 * same amount again at the start of each of the next {@link SPIRIT_BEAST_TICKS}
 * player turns (ticked in turn.ts off `spiritBeastTurnsRemaining`, re-targeting
 * the lowest-HP live foe each time). Roughly a 7th-level slot's worth of damage,
 * spread over the duration and guaranteed (no attack roll, no save).
 */
export function castSpiritBeast(ctx: CastSpellContext): CastResult {
  const { state, roller } = ctx;
  const targetId = ctx.targetId ?? firstLiveMonsterId(state);
  if (!targetId) return { state, character: ctx.character, cast: false };
  const target = findMonster(state, targetId);
  if (!target) return { state, character: ctx.character, cast: false };

  let nextCharacter: Character = consumeSlot(ctx.character, 7);
  const roll = roller.roll({ count: SPIRIT_BEAST_DICE, die: 8, modifier: 0 });
  const perTurn = Math.max(1, scaleSpellDamage(roll.total, nextCharacter, 7));
  nextCharacter = patchResources(nextCharacter, {
    spiritBeastDamagePerTurn: perTurn,
    spiritBeastTurnsRemaining: SPIRIT_BEAST_TICKS,
  });

  let nextState: CombatState = appendLog(state, {
    id: nextLogId(state),
    kind: 'system',
    text: `${nextCharacter.name} calls a spirit beast to their side — fang and claw given form. It will maul a foe at the start of each of the next ${SPIRIT_BEAST_TICKS} turns.`,
  });
  nextState = attachSpellEffect(nextState, 'summon-beast', 'player', targetId);

  const damaged = applyDamage(nextState, targetId, perTurn, nextCharacter);
  nextState = damaged.state;
  nextCharacter = damaged.character;
  nextState = appendLog(nextState, {
    id: nextLogId(nextState),
    kind: 'damage',
    text: `The spirit beast savages ${target.instance.displayName} for ${perTurn}.`,
  });

  nextCharacter = markActionUsed(nextCharacter);
  const ended = evaluateCombatEndFull(nextState, nextCharacter);
  return { state: ended.state, character: ended.character, cast: true };
}
