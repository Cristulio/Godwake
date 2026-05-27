import type { Character } from '../../../types/character';
import type { CombatState, CombatLogEntry } from '../../../types/combat';
import { getMonster } from '../../../content/monsters';
import { abilityModifier } from '../../../types/abilities';
import { appendLog } from '../log';
import {
  type CastResult,
  type CastSpellContext,
  attachSpellEffect,
  consumeSlot,
  findMonster,
  firstLiveMonsterId,
  markActionUsed,
  nextLogId,
  spellSaveDC,
} from './helpers';

export function castHoldPerson(ctx: CastSpellContext): CastResult {
  const { character, state, roller } = ctx;
  let nextCharacter: Character = character;
  const targetId = ctx.targetId ?? firstLiveMonsterId(state);
  if (!targetId) return { state, character: nextCharacter, cast: false };
  const target = findMonster(state, targetId);
  if (!target) return { state, character: nextCharacter, cast: false };

  nextCharacter = consumeSlot(nextCharacter, 2);

  const dc = spellSaveDC(nextCharacter);
  const monsterDef = getMonster(target.instance.defId);
  const targetWisMod = abilityModifier(monsterDef.abilityScores.wis ?? 10);
  const save = roller.d20('normal', targetWisMod);
  const success = save.total >= dc;

  const logs: CombatLogEntry[] = [
    {
      id: nextLogId(state),
      kind: 'roll',
      text: `${nextCharacter.name} weaves Hold Person at ${target.instance.displayName}. WIS save: d20${targetWisMod >= 0 ? '+' : ''}${targetWisMod} = ${save.total} vs DC ${dc} — ${success ? 'success' : 'fail'}.`,
    },
  ];

  let nextState: CombatState = appendLog(state, ...logs);
  nextState = attachSpellEffect(nextState, 'hold-person', 'player', targetId);
  if (!success) {
    // Apply the paralyzed condition to the monster. Reuse the player-side
    // shape: write the condition into the monster instance directly.
    nextState = appendLog(
      {
        ...nextState,
        combatants: nextState.combatants.map((c) => {
          if (c.kind !== 'monster' || c.id !== targetId) return c;
          const cond = {
            name: 'paralyzed' as const,
            duration: { kind: 'rounds' as const, value: 2 },
            saveDC: dc,
            saveAbility: 'wis' as const,
            source: nextCharacter.id,
          };
          return {
            ...c,
            instance: {
              ...c.instance,
              conditions: [
                ...c.instance.conditions.filter((x) => x.name !== 'paralyzed'),
                cond,
              ],
            },
          };
        }),
      },
      {
        id: nextLogId(nextState),
        kind: 'system',
        text: `${target.instance.displayName} stiffens — bound by the spell.`,
      },
    );
  }
  nextCharacter = markActionUsed(nextCharacter);
  return { state: nextState, character: nextCharacter, cast: true };
}
