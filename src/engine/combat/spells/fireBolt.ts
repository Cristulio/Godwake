import type { CombatState, CombatLogEntry } from '../../../types/combat';
import { critRange } from '../../character/derived';
import { applyDamage } from '../attack';
import { appendLog } from '../log';
import {
  type CastResult,
  type CastSpellContext,
  attachSpellEffect,
  evaluateCombatEnd,
  findMonster,
  firstLiveMonsterId,
  markActionUsed,
  nextLogId,
  spellAttackBonus,
  spellDamageBonus,
} from './helpers';

export function castFireBolt(ctx: CastSpellContext): CastResult {
  const { character, state, roller } = ctx;
  const targetId = ctx.targetId ?? firstLiveMonsterId(state);
  if (!targetId) return { state, character, cast: false };
  const target = findMonster(state, targetId);
  if (!target) return { state, character, cast: false };

  const attackBonus = spellAttackBonus(character);
  const toHit = roller.d20('normal', attackBonus);
  const crit = critRange(character).includes(toHit.rolls[0]);
  const hit = crit || (toHit.total >= target.instance.ac && !toHit.natural1);

  const logs: CombatLogEntry[] = [
    {
      id: nextLogId(state),
      kind: 'roll',
      text: `${character.name} hurls a Fire Bolt at ${target.instance.displayName}. d20${attackBonus >= 0 ? '+' : ''}${attackBonus} = ${toHit.total} vs AC ${target.instance.ac} ${crit ? '— CRITICAL HIT' : hit ? '— hit' : '— miss'}.`,
    },
  ];

  let nextState: CombatState = appendLog(
    {
      ...state,
      combatants: state.combatants.map((c) => {
        if (c.kind !== 'monster' || c.id !== targetId) return c;
        if (c.instance.acRevealed) return c;
        return { ...c, instance: { ...c.instance, acRevealed: true } };
      }),
    },
    ...logs,
  );
  nextState = attachSpellEffect(nextState, 'fire-bolt', 'player', targetId);

  if (hit) {
    const damageRoll = roller.roll({
      count: 1 * (crit ? 2 : 1),
      die: 10,
      modifier: 0,
    });
    const bonus = spellDamageBonus(character);
    const total = damageRoll.total + bonus;
    nextState = applyDamage(nextState, targetId, total, character);
    nextState = appendLog(nextState, {
      id: nextLogId(nextState),
      kind: 'damage',
      text: `Damage: ${damageRoll.rolls.join('+')}${bonus > 0 ? `+${bonus}` : ''} = ${total} fire.`,
    });
  }

  markActionUsed(character);
  return { state: evaluateCombatEnd(nextState, character), character, cast: true };
}
