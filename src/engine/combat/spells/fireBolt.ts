import type { Character } from '../../../types/character';
import type { CombatState, CombatLogEntry } from '../../../types/combat';
import { spellcastingMod } from '../../character/derived';
import { getSpell } from '../../../content/spells';
import { applyDamage } from '../attack';
import { appendLog } from '../log';
import { scaleSpellDamage, spellAcquisitionLevel } from './scaling';
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
 * Fire Bolt is the cantrip arm of the shared spell-scaling model: one d10 base,
 * grown smoothly by character level + casting modifier (see scaling.ts). It used
 * to step its dice discretely (1→4d10, capped at L8), which went stale once the
 * game reached L20 — the parametric multiplier replaces those breakpoints and
 * keeps climbing the whole way up. A DEX save still halves the burn.
 */
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

  const damageRoll = roller.roll({ count: 1, die: 10, modifier: 0 });
  const scaledDice = scaleSpellDamage(damageRoll.total, nextCharacter, spellAcquisitionLevel(0));
  const castMod = spellcastingMod(nextCharacter);
  const bonus = spellDamageBonus(nextCharacter) + castMod;
  const fullDamage = scaledDice + bonus;
  const dealt = saved ? Math.floor(fullDamage / 2) : fullDamage;

  const damageBreakdown = `${scaledDice}${bonus > 0 ? `+${bonus}` : ''}`;
  const logs: CombatLogEntry[] = [
    {
      id: nextLogId(state),
      kind: 'roll',
      text: `${nextCharacter.name} looses ${getSpell(ctx.spellId).name} at ${target.instance.displayName}. DEX save DC ${dc}: ${save.total} (${saved ? 'saved' : 'failed'}).`,
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
