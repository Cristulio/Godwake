import type { CombatState } from '../../../types/combat';
import { applyDamage } from '../attack';
import { appendLog } from '../log';
import {
  type CastResult,
  type CastSpellContext,
  attachSpellEffect,
  consumeSlot,
  evaluateCombatEnd,
  findMonster,
  firstLiveMonsterId,
  markActionUsed,
  nextLogId,
  spellDamageBonus,
} from './helpers';

export function castMagicMissile(ctx: CastSpellContext): CastResult {
  const { character, state, roller } = ctx;
  const targetId = ctx.targetId ?? firstLiveMonsterId(state);
  if (!targetId) return { state, character, cast: false };
  const target = findMonster(state, targetId);
  if (!target) return { state, character, cast: false };

  consumeSlot(character, 1);
  const rolls: number[] = [];
  let total = 0;
  for (let i = 0; i < 3; i++) {
    const r = roller.roll({ count: 1, die: 4, modifier: 1 });
    rolls.push(r.total);
    total += r.total;
  }
  const bonus = spellDamageBonus(character);
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
      text: `${character.name} casts Magic Missile. Three darts streak at ${target.instance.displayName} — ${rolls.join('+')}${bonus > 0 ? `+${bonus}` : ''} = ${total} force, auto-hit.`,
    },
  );

  nextState = applyDamage(nextState, targetId, total, character);
  nextState = attachSpellEffect(nextState, 'magic-missile', 'player', targetId);
  markActionUsed(character);
  return { state: evaluateCombatEnd(nextState, character), character, cast: true };
}
