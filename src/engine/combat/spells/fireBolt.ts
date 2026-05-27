import type { Character } from '../../../types/character';
import type { CombatState, CombatLogEntry } from '../../../types/combat';
import { critRange, effectiveAbilityScores } from '../../character/derived';
import { abilityModifier } from '../../../types/abilities';
import { applyDamage } from '../attack';
import { appendLog } from '../log';
import {
  type CastResult,
  type CastSpellContext,
  attachSpellEffect,
  evaluateCombatEndFull,
  findMonster,
  firstLiveMonsterId,
  markActionUsed,
  nextLogId,
  spellAttackBonus,
  spellDamageBonus,
} from './helpers';

export function castFireBolt(ctx: CastSpellContext): CastResult {
  const { character, state, roller } = ctx;
  let nextCharacter: Character = character;
  const targetId = ctx.targetId ?? firstLiveMonsterId(state);
  if (!targetId) return { state, character: nextCharacter, cast: false };
  const target = findMonster(state, targetId);
  if (!target) return { state, character: nextCharacter, cast: false };

  const attackBonus = spellAttackBonus(nextCharacter);
  const toHit = roller.d20('normal', attackBonus);
  const crit = critRange(nextCharacter).includes(toHit.rolls[0]);
  const hit = crit || (toHit.total >= target.instance.ac && !toHit.natural1);

  const logs: CombatLogEntry[] = [
    {
      id: nextLogId(state),
      kind: 'roll',
      text: `${nextCharacter.name} hurls a Fire Bolt at ${target.instance.displayName}. d20${attackBonus >= 0 ? '+' : ''}${attackBonus} = ${toHit.total} vs AC ${target.instance.ac} ${crit ? '— CRITICAL HIT' : hit ? '— hit' : '— miss'}.`,
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
    // Fire Bolt adds the caster's INT modifier on hit — Eldritch-Blast-style
    // floor. Without this the L1 wizard's only at-will action is 1d10 (avg
    // 5.5) vs AC 13-15 mobs, and once the 2 starting slots burn through they
    // can't keep up DPR. Sim showed median 2-room death at L1; the INT-mod
    // bump (+3 with starting INT 16) lifts cantrip floor by ~55%.
    const intMod = abilityModifier(effectiveAbilityScores(nextCharacter).int);
    const bonus = spellDamageBonus(nextCharacter) + intMod;
    const total = damageRoll.total + bonus;
    const damaged = applyDamage(nextState, targetId, total, nextCharacter);
    nextState = damaged.state;
    nextCharacter = damaged.character;
    nextState = appendLog(nextState, {
      id: nextLogId(nextState),
      kind: 'damage',
      text: `Damage: ${damageRoll.rolls.join('+')}${bonus > 0 ? `+${bonus}` : ''} = ${total} fire.`,
    });
  }

  nextCharacter = markActionUsed(nextCharacter);
  const ended = evaluateCombatEndFull(nextState, nextCharacter);
  return { state: ended.state, character: ended.character, cast: true };
}
