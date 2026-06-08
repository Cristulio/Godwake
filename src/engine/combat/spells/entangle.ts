import type { Character } from '../../../types/character';
import type { CombatState, MonsterCombatant } from '../../../types/combat';
import { getMonster } from '../../../content/monsters';
import { abilityModifier } from '../../../types/abilities';
import { appendLog } from '../log';
import { patchActionEconomy } from '../types';
import {
  type CastResult,
  type CastSpellContext,
  attachSpellEffect,
  consumeSlot,
  nextLogId,
  spellSaveDC,
} from './helpers';
import { t } from '../../../i18n';

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
    text: t('combat.log.entangleCast', { name: nextCharacter.name, dc }),
  });

  const rooted: string[] = [];
  for (const m of live) {
    const monsterDef = getMonster(m.instance.defId);
    const strMod = abilityModifier(monsterDef.abilityScores.str ?? 10);
    // Resolute will: a boss/elite saves with advantage rather than auto-resisting
    // — parity with Hold Person, so the AoE still sometimes catches a leader.
    const resoluteWill = (m.instance.legendaryResistances ?? 0) > 0;
    const save = roller.d20(resoluteWill ? 'advantage' : 'normal', strMod);
    const success = save.total >= dc;

    // Anchor the restrain VFX + the caster's-eye verdict on the primary target
    // (the first live foe): rooted = it LANDED, made the save = RESISTED.
    if (m.id === live[0].id) {
      nextState = attachSpellEffect(
        nextState,
        'debuff-restrain',
        'player',
        m.id,
        undefined,
        success ? 'resisted' : 'landed',
      );
    }

    nextState = appendLog(nextState, {
      id: nextLogId(nextState),
      kind: 'roll',
      text: t('combat.log.entangleSave', {
        name: m.instance.displayName,
        resolute: resoluteWill ? t('combat.f.resoluteAdv') : '',
        mod: `${strMod >= 0 ? '+' : ''}${strMod}`,
        total: save.total,
        dc,
        result: success ? t('combat.f.success') : t('combat.f.failRooted'),
      }),
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
      text:
        rooted.length === 1
          ? t('combat.log.entangleRootedOne', { names: rooted.join(', ') })
          : t('combat.log.entangleRootedMany', { names: rooted.join(', ') }),
    });
  }

  // Bonus action, not the main action: the druid roots the whole room AND still
  // attacks/casts the same turn. The 2nd-level slot already spent above keeps it
  // bounded — a free every-turn room-wide lock would be overpowered.
  nextCharacter = patchActionEconomy(nextCharacter, { bonusActionUsed: true });
  return { state: nextState, character: nextCharacter, cast: true };
}
