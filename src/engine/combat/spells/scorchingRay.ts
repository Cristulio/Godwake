import type { Character } from '../../../types/character';
import type { CombatState, CombatLogEntry } from '../../../types/combat';
import { critRange } from '../../character/derived';
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
  spellElement,
} from './helpers';

/**
 * Scorching Ray gains rays as the caster grows, so the L2 slot scales past a
 * free Fire Bolt instead of being eclipsed by it: 3 rays, +1 every third level
 * from 6th (4 @ L6, 5 @ L9, … 8 @ L18). Its niche is the multi-roll — more rays
 * mean more chances to crit, and a hard target rarely shrugs off all of them.
 */
export function scorchingRayCount(level: number): number {
  return 3 + Math.max(0, Math.floor((level - 3) / 3));
}

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
  const rayCount = scorchingRayCount(nextCharacter.level);
  // Crit gear (Keen weapon, "of the Predator" ring, Cloak of the Nightwind…)
  // widens the spell-attack crit window too — a ray is an attack roll, so the
  // same band the engine reads for weapons makes that loot matter to a caster.
  const critRolls = critRange(nextCharacter);

  // Each ray is its own attack roll. Damage from hitting rays is summed and
  // applied once so a target that drops mid-volley doesn't desync the log.
  const baseId = nextLogId(state);
  const logs: CombatLogEntry[] = [
    {
      id: baseId,
      kind: 'narration',
      text: `${nextCharacter.name} levels ${rayCount} scorching rays at ${target.instance.displayName}.`,
    },
  ];
  let hits = 0;
  let rayDamage = 0;
  for (let i = 0; i < rayCount; i++) {
    const toHit = roller.d20('normal', attackBonus);
    const crit = critRolls.includes(toHit.rolls[0]);
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
  nextState = attachSpellEffect(nextState, 'spell-bolt', 'player', targetId, spellElement(ctx.spellId));

  if (totalDamage > 0) {
    const damaged = applyDamage(nextState, targetId, totalDamage, nextCharacter);
    nextState = damaged.state;
    nextCharacter = damaged.character;
    nextState = appendLog(nextState, {
      id: nextLogId(nextState),
      kind: 'damage',
      text: `${hits} of ${rayCount} ray${hits === 1 ? '' : 's'} land${hits === 1 ? 's' : ''} — ${totalDamage} fire.`,
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
