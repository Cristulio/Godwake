import type { Character } from '../../../types/character';
import type { CombatState, CombatLogEntry } from '../../../types/combat';
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
  spellAttackBonus,
  spellDamageBonus,
} from './helpers';

const RAY_COUNT = 3;

export function castScorchingRay(ctx: CastSpellContext): CastResult {
  const { character, state, roller } = ctx;
  let nextCharacter: Character = character;
  const targetId = ctx.targetId ?? firstLiveMonsterId(state);
  if (!targetId) return { state, character: nextCharacter, cast: false };
  const target = findMonster(state, targetId);
  if (!target) return { state, character: nextCharacter, cast: false };

  nextCharacter = consumeSlot(nextCharacter, 2);
  const attackBonus = spellAttackBonus(nextCharacter);
  const ac = target.instance.ac;

  // Each ray is its own attack roll. Damage from hitting rays is summed and
  // applied once so a target that drops mid-volley doesn't desync the log.
  const baseId = nextLogId(state);
  const logs: CombatLogEntry[] = [
    {
      id: baseId,
      kind: 'narration',
      text: `${nextCharacter.name} levels three scorching rays at ${target.instance.displayName}.`,
    },
  ];
  let hits = 0;
  let rayDamage = 0;
  for (let i = 0; i < RAY_COUNT; i++) {
    const toHit = roller.d20('normal', attackBonus);
    const crit = toHit.rolls[0] === 20;
    const hit = crit || (toHit.total >= ac && !toHit.natural1);
    if (hit) {
      hits += 1;
      const dmg = roller.roll({ count: crit ? 4 : 2, die: 6, modifier: 0 });
      rayDamage += dmg.total;
    }
    logs.push({
      id: baseId + 1 + i,
      kind: 'roll',
      text: `Ray ${i + 1}: d20${attackBonus >= 0 ? '+' : ''}${attackBonus} = ${toHit.total} vs AC ${ac} — ${crit ? 'CRITICAL HIT' : hit ? 'hit' : 'miss'}.`,
    });
  }

  const bonus = hits > 0 ? spellDamageBonus(nextCharacter) : 0;
  const totalDamage = rayDamage + bonus;

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

  if (totalDamage > 0) {
    const damaged = applyDamage(nextState, targetId, totalDamage, nextCharacter);
    nextState = damaged.state;
    nextCharacter = damaged.character;
    nextState = appendLog(nextState, {
      id: nextLogId(nextState),
      kind: 'damage',
      text: `${hits} of ${RAY_COUNT} ray${hits === 1 ? '' : 's'} land${hits === 1 ? 's' : ''} — ${totalDamage} fire.`,
    });
  } else {
    nextState = appendLog(nextState, {
      id: nextLogId(nextState),
      kind: 'system',
      text: `Every ray goes wide — ${target.instance.displayName} is untouched.`,
    });
  }

  nextCharacter = markActionUsed(nextCharacter);
  const ended = evaluateCombatEndFull(nextState, nextCharacter);
  return { state: ended.state, character: ended.character, cast: true };
}
