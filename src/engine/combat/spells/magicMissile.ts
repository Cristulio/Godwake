import type { Character } from '../../../types/character';
import type { CombatState } from '../../../types/combat';
import { applyDamage } from '../attack';
import { appendLog } from '../log';
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
  spellDamageBonus,
} from './helpers';

export function castMagicMissile(ctx: CastSpellContext): CastResult {
  const { character, state, roller } = ctx;
  let nextCharacter: Character = character;
  const targetId = ctx.targetId ?? firstLiveMonsterId(state);
  if (!targetId) return { state, character: nextCharacter, cast: false };
  const target = findMonster(state, targetId);
  if (!target) return { state, character: nextCharacter, cast: false };

  nextCharacter = consumeSlot(nextCharacter, 1);
  const rolls: number[] = [];
  let total = 0;
  for (let i = 0; i < 3; i++) {
    const r = roller.roll({ count: 1, die: 4, modifier: 1 });
    rolls.push(r.total);
    total += r.total;
  }
  const bonus = spellDamageBonus(nextCharacter);
  total += bonus;

  let nextState: CombatState = appendLog(
    {
      ...state,
      combatants: state.combatants.map((c) => {
        if (c.kind !== 'monster' || c.id !== targetId) return c;
        if (c.instance.acRevealed) return c;
        return { ...c, instance: { ...c.instance, acRevealed: true } };
      }),
    },
    {
      id: nextLogId(state),
      kind: 'roll',
      text: `${nextCharacter.name} casts Magic Missile. Three darts streak at ${target.instance.displayName} — ${rolls.join('+')}${bonus > 0 ? `+${bonus}` : ''} = ${total} force, auto-hit.`,
    },
  );

  const damaged = applyDamage(nextState, targetId, total, nextCharacter);
  nextState = damaged.state;
  nextCharacter = damaged.character;
  nextState = attachSpellEffect(nextState, 'magic-missile', 'player', targetId);
  nextCharacter = markActionUsed(nextCharacter);
  const ended = evaluateCombatEndFull(nextState, nextCharacter);
  return { state: ended.state, character: ended.character, cast: true };
}
