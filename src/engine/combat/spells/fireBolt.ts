import type { Character } from '../../../types/character';
import type { CombatState, CombatLogEntry } from '../../../types/combat';
import { effectiveAbilityScores } from '../../character/derived';
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
  spellDamageBonus,
  spellSaveDC,
} from './helpers';

/**
 * Fire Bolt scales like a 5e cantrip — more d10s as the caster grows. RAW the
 * breakpoints are L5/11/17 (2/3/4 dice), but this game caps characters at level
 * 8, so all four tiers are compressed onto the reachable band (2d10 at L5,
 * 3d10 at L7, 4d10 at L8). This gives the endgame wizard the sustained at-will
 * closing power the ascension ladder demands once enemy HP outscales a flat 1d10.
 */
export function fireBoltDiceCount(level: number): number {
  if (level >= 8) return 4;
  if (level >= 7) return 3;
  if (level >= 5) return 2;
  return 1;
}

export function castFireBolt(ctx: CastSpellContext): CastResult {
  const { character, state, roller } = ctx;
  let nextCharacter: Character = character;
  const targetId = ctx.targetId ?? firstLiveMonsterId(state);
  if (!targetId) return { state, character: nextCharacter, cast: false };
  const target = findMonster(state, targetId);
  if (!target) return { state, character: nextCharacter, cast: false };

  // DEX save for half — Fire Bolt always lands at least half damage. Replaces
  // an attack-roll-vs-AC formulation that missed ~45% vs Ch1 boss AC 15 and
  // made the wizard's only at-will action feel miserable. Per gameplay-over-RAW.
  const dc = spellSaveDC(nextCharacter);
  const save = roller.d20('normal', 0);
  const saved = save.total >= dc;

  const damageRoll = roller.roll({ count: fireBoltDiceCount(nextCharacter.level), die: 10, modifier: 0 });
  const intMod = abilityModifier(effectiveAbilityScores(nextCharacter).int);
  const bonus = spellDamageBonus(nextCharacter) + intMod;
  const fullDamage = damageRoll.total + bonus;
  const dealt = saved ? Math.floor(fullDamage / 2) : fullDamage;

  const damageBreakdown = `${damageRoll.rolls.join('+')}${bonus > 0 ? `+${bonus}` : ''}`;
  const logs: CombatLogEntry[] = [
    {
      id: nextLogId(state),
      kind: 'roll',
      text: `${nextCharacter.name} hurls a Fire Bolt at ${target.instance.displayName}. DEX save DC ${dc}: ${save.total} (${saved ? 'saved' : 'failed'}).`,
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

  const damaged = applyDamage(nextState, targetId, dealt, nextCharacter);
  nextState = damaged.state;
  nextCharacter = damaged.character;
  nextState = appendLog(nextState, {
    id: nextLogId(nextState),
    kind: 'damage',
    text: `Damage: ${damageBreakdown}${saved ? ' halved' : ''} = ${dealt} fire.`,
  });

  nextCharacter = markActionUsed(nextCharacter);
  const ended = evaluateCombatEndFull(nextState, nextCharacter);
  return { state: ended.state, character: ended.character, cast: true };
}
