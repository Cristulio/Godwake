import type { Character } from '../../../types/character';
import type { CombatState, CombatLogEntry } from '../../../types/combat';
import { abilityModifier } from '../../../types/abilities';
import { spellcastingMod } from '../../character/derived';
import { getSpell } from '../../../content/spells';
import { getMonster } from '../../../content/monsters';
import { applyDamage } from '../attack';
import { appendLog } from '../log';
import { scaleSpellDamage } from './scaling';
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
import { t, getLocalized } from '../../../i18n';

/**
 * Vicious Mockery — the Bard's signature cantrip. A string of withering insult
 * lances psychic damage into one target and, on a failed Wisdom save, leaves it
 * RATTLED: frightened for one round, so its next blow is thrown wild
 * (disadvantage). It is a CONTROL cantrip, not a damage one — a small d4 base
 * (vs Fire Bolt's d10) so the rattle is the point and the chip stays under the
 * wizard's damage cantrip. A made save still takes half the barb but shrugs off
 * the sting. No slot — at will, the Bard's soft-control opener.
 */
export function castViciousMockery(ctx: CastSpellContext): CastResult {
  const { character, state, roller } = ctx;
  let nextCharacter: Character = character;
  const targetId = ctx.targetId ?? firstLiveMonsterId(state);
  if (!targetId) return { state, character: nextCharacter, cast: false };
  const target = findMonster(state, targetId);
  if (!target) return { state, character: nextCharacter, cast: false };

  const dc = spellSaveDC(nextCharacter);
  const monsterDef = getMonster(target.instance.defId);
  const wisMod = abilityModifier(monsterDef.abilityScores.wis ?? 10);
  // Resolute will: a boss/elite shrugs the rattle with advantage rather than
  // auto-succeeding — the chip still lands, the fright is just harder to stick.
  const resoluteWill = (target.instance.legendaryResistances ?? 0) > 0;
  const save = roller.d20(resoluteWill ? 'advantage' : 'normal', wisMod);
  const saved = save.total >= dc;

  const damageRoll = roller.roll({ count: 1, die: 4, modifier: 0 });
  const scaledDice = scaleSpellDamage(damageRoll.total, nextCharacter, 0);
  const bonus = spellDamageBonus(nextCharacter) + spellcastingMod(nextCharacter);
  const fullDamage = scaledDice + bonus;
  const dealt = saved ? Math.floor(fullDamage / 2) : fullDamage;

  const logs: CombatLogEntry[] = [
    {
      id: nextLogId(state),
      kind: 'roll',
      text: t('combat.log.viciousMockeryCast', {
        name: nextCharacter.name,
        spell: getLocalized('spells', ctx.spellId, 'name', getSpell(ctx.spellId).name),
        target: target.instance.displayName,
        resolute: resoluteWill ? t('combat.f.resoluteAdv') : '',
        mod: `${wisMod >= 0 ? '+' : ''}${wisMod}`,
        total: save.total,
        dc,
        result: saved ? t('combat.f.success') : t('combat.f.fail'),
      }),
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
  // Psychic carries no elemental palette, so the bolt shows its default cast. No
  // outcome verdict here — VM deals real damage, so the number floats (like Fire
  // Bolt); the rattle reads from the combat log + the frightened condition icon.
  nextState = attachSpellEffect(nextState, 'spell-bolt', 'player', targetId, undefined, undefined, dealt);

  const damaged = applyDamage(nextState, targetId, dealt, nextCharacter);
  nextState = damaged.state;
  nextCharacter = damaged.character;
  nextState = appendLog(nextState, {
    id: nextLogId(nextState),
    kind: 'damage',
    text: t('combat.log.viciousMockeryDamage', {
      target: target.instance.displayName,
      dealt,
      halved: saved ? t('combat.log.halvedSuffix') : '',
    }),
  });

  // On a failed save, leave the target rattled — frightened for one round, so its
  // next attack is thrown at disadvantage (read in resolveSingleAttack, ticked in
  // monsterAttack). Skip if the chip already felled it.
  if (!saved) {
    const stillAlive = nextState.combatants.some(
      (c) => c.kind === 'monster' && c.id === targetId && c.instance.hp.current > 0,
    );
    if (stillAlive) {
      nextState = {
        ...nextState,
        combatants: nextState.combatants.map((c) => {
          if (c.kind !== 'monster' || c.id !== targetId) return c;
          return {
            ...c,
            instance: {
              ...c.instance,
              conditions: [
                ...c.instance.conditions.filter((x) => x.name !== 'frightened'),
                { name: 'frightened' as const, duration: { kind: 'rounds' as const, value: 1 } },
              ],
            },
          };
        }),
      };
      nextState = appendLog(nextState, {
        id: nextLogId(nextState),
        kind: 'system',
        text: t('combat.log.viciousMockeryRattle', { target: target.instance.displayName }),
      });
    }
  }

  nextCharacter = markActionUsed(nextCharacter);
  const ended = evaluateCombatEndFull(nextState, nextCharacter);
  return { state: ended.state, character: ended.character, cast: true };
}
