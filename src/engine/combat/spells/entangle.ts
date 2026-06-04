import type { Character } from '../../../types/character';
import type { CombatState, MonsterCombatant } from '../../../types/combat';
import { getMonster } from '../../../content/monsters';
import { abilityModifier } from '../../../types/abilities';
import { appendLog } from '../log';
import {
  type CastResult,
  type CastSpellContext,
  attachSpellEffect,
  consumeSlot,
  markActionUsed,
  nextLogId,
  spellSaveDC,
} from './helpers';

/**
 * Entangle (2nd) — transmutation, area. The Druid's signature control, distinct
 * from the Wizard's single-target Hold Person: grasping roots sweep the WHOLE
 * floor and every enemy rolls a Strength save against the caster's DC. A foe
 * that fails is restrained for one round — it loses its next turn wrenching free
 * (resolved in monsterAttack's restrained block). Soft, broad, one-turn control
 * where Hold Person is a hard single-target multi-round lock.
 */
export function castEntangle(ctx: CastSpellContext): CastResult {
  const { state, roller } = ctx;
  const live = state.combatants.filter(
    (c): c is MonsterCombatant => c.kind === 'monster' && c.instance.hp.current > 0,
  );
  if (live.length === 0) return { state, character: ctx.character, cast: false };

  let nextCharacter: Character = consumeSlot(ctx.character, 2);
  const dc = spellSaveDC(nextCharacter);

  let nextState: CombatState = appendLog(state, {
    id: nextLogId(state),
    kind: 'roll',
    text: `${nextCharacter.name} calls grasping roots up through the floor — every foe must make a Strength save vs DC ${dc} or be rooted fast.`,
  });
  nextState = attachSpellEffect(nextState, 'debuff-restrain', 'player', live[0].id);

  const rooted: string[] = [];
  for (const m of live) {
    const monsterDef = getMonster(m.instance.defId);
    const strMod = abilityModifier(monsterDef.abilityScores.str ?? 10);
    // Resolute will: a boss/elite saves with advantage rather than auto-resisting
    // — parity with Hold Person, so the AoE still sometimes catches a leader.
    const resoluteWill = (m.instance.legendaryResistances ?? 0) > 0;
    const save = roller.d20(resoluteWill ? 'advantage' : 'normal', strMod);
    const success = save.total >= dc;

    nextState = appendLog(nextState, {
      id: nextLogId(nextState),
      kind: 'roll',
      text: `${m.instance.displayName} STR save${resoluteWill ? ' (resolute will — advantage)' : ''}: d20${strMod >= 0 ? '+' : ''}${strMod} = ${save.total} vs DC ${dc} — ${success ? 'success' : 'fail (rooted)'}.`,
    });

    if (success) continue;
    rooted.push(m.instance.displayName);
    nextState = {
      ...nextState,
      combatants: nextState.combatants.map((c) => {
        if (c.kind !== 'monster' || c.id !== m.id) return c;
        const cond = {
          name: 'restrained' as const,
          duration: { kind: 'rounds' as const, value: 1 },
          saveDC: dc,
          saveAbility: 'str' as const,
          source: nextCharacter.id,
        };
        return {
          ...c,
          instance: {
            ...c.instance,
            conditions: [
              ...c.instance.conditions.filter((x) => x.name !== 'restrained'),
              cond,
            ],
          },
        };
      }),
    };
  }

  if (rooted.length > 0) {
    nextState = appendLog(nextState, {
      id: nextLogId(nextState),
      kind: 'system',
      text: `${rooted.join(', ')} ${rooted.length === 1 ? 'is' : 'are'} caught fast — the roots hold, and the next turn is lost.`,
    });
  }

  nextCharacter = markActionUsed(nextCharacter);
  return { state: nextState, character: nextCharacter, cast: true };
}
