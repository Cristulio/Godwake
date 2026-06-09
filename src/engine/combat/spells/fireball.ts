import type { Character } from '../../../types/character';
import type { CombatState, MonsterCombatant } from '../../../types/combat';
import { getMonster } from '../../../content/monsters';
import { abilityModifier } from '../../../types/abilities';
import { characterHasMechanic } from '../../character/derived';
import { appendLog } from '../log';
import { applyDamage } from '../attack';
import {
  type CastResult,
  type CastSpellContext,
  attachSpellEffect,
  consumeSlot,
  empoweredEvocationBonus,
  evaluateCombatEndFull,
  markActionUsed,
  nextLogId,
  spellElement,
  spellSaveDC,
} from './helpers';
import { scaleSpellDamage } from './scaling';
import { t } from '../../../i18n';

export function castFireball(ctx: CastSpellContext): CastResult {
  const { character, state, roller } = ctx;
  let nextCharacter: Character = consumeSlot(character, 3);

  const aliveMonsters = state.combatants.filter(
    (c) => c.kind === 'monster' && c.instance.hp.current > 0,
  ) as MonsterCombatant[];

  const evoker = characterHasMechanic(nextCharacter, 'sculpt-spells');
  const dice = evoker ? 9 : 8;
  const damageRoll = roller.roll({ count: dice, die: 6, modifier: 0 });
  // Empowered Evocation rides the blast directly (Fireball bypasses spellDamageBonus).
  const fullDmg = scaleSpellDamage(damageRoll.total, nextCharacter, 3) + empoweredEvocationBonus(nextCharacter);
  const dc = spellSaveDC(nextCharacter);

  let nextState: CombatState = appendLog(state, {
    id: nextLogId(state),
    kind: 'roll',
    text: t('combat.log.fireballCast', {
      name: nextCharacter.name,
      rolls: damageRoll.rolls.join('+'),
      dmg: fullDmg,
      evoker: evoker ? t('combat.log.sculptSpells') : '',
      dc,
    }),
  });

  nextState = attachSpellEffect(nextState, 'spell-burst', 'player', aliveMonsters[0]?.id, spellElement(ctx.spellId));

  const failedIds = new Set<string>();

  for (const m of aliveMonsters) {
    const monsterDef = getMonster(m.instance.defId);
    const dexMod = abilityModifier(monsterDef.abilityScores.dex ?? 10);
    const save = roller.d20('normal', dexMod);
    const success = save.total >= dc;
    const dmg = success ? Math.floor(fullDmg / 2) : fullDmg;
    if (!success) failedIds.add(m.id);

    nextState = {
      ...nextState,
      combatants: nextState.combatants.map((c) => {
        if (c.kind !== 'monster' || c.id !== m.id) return c;
        if (c.instance.acRevealed) return c;
        return { ...c, instance: { ...c.instance, acRevealed: true } };
      }),
    };
    nextState = appendLog(nextState, {
      id: nextLogId(nextState),
      kind: 'roll',
      text: t('combat.log.fireballSave', {
        name: m.instance.displayName,
        mod: `${dexMod >= 0 ? '+' : ''}${dexMod}`,
        total: save.total,
        dc,
        result: success ? t('combat.f.successHalf') : t('combat.f.failFullIgnited'),
      }),
    });
    const damaged = applyDamage(nextState, m.id, dmg, nextCharacter);
    nextState = damaged.state;
    nextCharacter = damaged.character;
    nextState = appendLog(nextState, {
      id: nextLogId(nextState),
      kind: 'damage',
      text: t('combat.log.takesDamage', {
        name: m.instance.displayName,
        dmg,
        type: t('combat.dmg.fire'),
      }),
    });
  }

  // Ignite survivors that failed their save — burn for 1d6 fire at start of player's next turn.
  const igniteSurvivors = nextState.combatants.filter(
    (c): c is MonsterCombatant =>
      c.kind === 'monster' && failedIds.has(c.id) && c.instance.hp.current > 0,
  );
  if (igniteSurvivors.length > 0) {
    const igniteDie = roller.roll({ count: 1, die: 6, modifier: 0 });
    const igniteDmg = igniteDie.total;
    nextState = {
      ...nextState,
      combatants: nextState.combatants.map((c) => {
        if (c.kind !== 'monster' || !failedIds.has(c.id) || c.instance.hp.current <= 0) return c;
        return { ...c, instance: { ...c.instance, burnDamagePerTurn: igniteDmg, burnTurnsRemaining: 1 } };
      }),
    };
    const names = igniteSurvivors.map((m) => m.instance.displayName).join(', ');
    nextState = appendLog(nextState, {
      id: nextLogId(nextState),
      kind: 'system',
      text:
        igniteSurvivors.length === 1
          ? t('combat.log.fireballIgniteOne', { names, dmg: igniteDmg })
          : t('combat.log.fireballIgniteMany', { names, dmg: igniteDmg }),
    });
  }

  nextCharacter = markActionUsed(nextCharacter);
  const ended = evaluateCombatEndFull(nextState, nextCharacter);
  return { state: ended.state, character: ended.character, cast: true };
}
