import type { Character } from '../../../types/character';
import type { CombatState, CombatLogEntry } from '../../../types/combat';
import { getMonster } from '../../../content/monsters';
import { getSpell } from '../../../content/spells';
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
import { t, getLocalized } from '../../../i18n';

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
  // Resolute will: a boss/elite (legendary-resistance flag) rolls control saves
  // with ADVANTAGE rather than auto-negating them. Hard to bind, but not immune —
  // the spell is a gamble that sometimes lands, not a guaranteed wasted slot.
  const resoluteWill = (target.instance.legendaryResistances ?? 0) > 0;
  const save = roller.d20(resoluteWill ? 'advantage' : 'normal', targetWisMod);
  const success = save.total >= dc;

  const logs: CombatLogEntry[] = [
    {
      id: nextLogId(state),
      kind: 'roll',
      text: t('combat.log.holdPersonRoll', {
        name: nextCharacter.name,
        spell: getLocalized('spells', ctx.spellId, 'name', getSpell(ctx.spellId).name),
        target: target.instance.displayName,
        resolute: resoluteWill ? t('combat.f.resoluteAdv') : '',
        mod: `${targetWisMod >= 0 ? '+' : ''}${targetWisMod}`,
        total: save.total,
        dc,
        result: success ? t('combat.f.success') : t('combat.f.fail'),
      }),
    },
  ];

  let nextState: CombatState = appendLog(state, ...logs);
  // Caster's-eye verdict: a failed save means the bind LANDED, a made save means
  // the target RESISTED — the inverse of the save's success.
  nextState = attachSpellEffect(
    nextState,
    'hold-person',
    'player',
    targetId,
    undefined,
    success ? 'resisted' : 'landed',
  );

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
        text: t('combat.log.holdPersonStiffen', { target: target.instance.displayName }),
      },
    );
  }
  nextCharacter = markActionUsed(nextCharacter);
  return { state: nextState, character: nextCharacter, cast: true };
}
