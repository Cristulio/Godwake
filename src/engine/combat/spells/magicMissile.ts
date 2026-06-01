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

/**
 * Magic Missile gains darts as the caster grows, so the guaranteed-hit L1 slot
 * keeps pace with a scaling Fire Bolt instead of being left behind: 3 darts,
 * +1 every third level from 5th (4 @ L5, 5 @ L8, … 8 @ L17). Its niche is the
 * un-missable, un-savable hit — every dart lands, full, no roll.
 */
export function magicMissileDartCount(level: number): number {
  return 3 + Math.max(0, Math.floor((level - 2) / 3));
}

export function castMagicMissile(ctx: CastSpellContext): CastResult {
  const { character, state, roller } = ctx;
  let nextCharacter: Character = character;
  const targetId = ctx.targetId ?? firstLiveMonsterId(state);
  if (!targetId) return { state, character: nextCharacter, cast: false };
  const target = findMonster(state, targetId);
  if (!target) return { state, character: nextCharacter, cast: false };

  nextCharacter = consumeSlot(nextCharacter, 1);
  const darts = magicMissileDartCount(nextCharacter.level);
  const rolls: number[] = [];
  let total = 0;
  for (let i = 0; i < darts; i++) {
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
      text: `${nextCharacter.name} casts Magic Missile. ${darts} darts streak at ${target.instance.displayName} — ${rolls.join('+')}${bonus > 0 ? `+${bonus}` : ''} = ${total} force, auto-hit.`,
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
