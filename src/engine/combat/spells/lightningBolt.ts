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
  findMonster,
  firstLiveMonsterId,
  markActionUsed,
  nextLogId,
  spellElement,
  spellSaveDC,
} from './helpers';
import { scaleSpellDamage } from './scaling';
import { t } from '../../../i18n';

/**
 * Lightning Bolt — the FOCUSED counterpart to Fireball's crowd-clear. A single
 * line: it strikes the chosen target in full and forks to ONE more for half,
 * touching nothing beyond. Bigger dice than Fireball (10d6, 11 for an evoker) so
 * it out-damages the AoE against a lone boss or a boss-plus-adjutant, while
 * Fireball stays king against a pack. DEX save halves on each target hit.
 */
export function castLightningBolt(ctx: CastSpellContext): CastResult {
  const { character, state, roller } = ctx;
  let nextCharacter: Character = consumeSlot(character, 3);

  const primaryId = ctx.targetId ?? firstLiveMonsterId(state);
  if (!primaryId) return { state, character: nextCharacter, cast: false };
  const primary = findMonster(state, primaryId);
  if (!primary) return { state, character: nextCharacter, cast: false };

  // The fork: the next living foe other than the primary. Hits nothing else.
  const secondary = (state.combatants.find(
    (c) => c.kind === 'monster' && c.id !== primaryId && c.instance.hp.current > 0,
  ) ?? null) as MonsterCombatant | null;

  const evoker = characterHasMechanic(nextCharacter, 'sculpt-spells');
  const dice = evoker ? 11 : 10;
  const damageRoll = roller.roll({ count: dice, die: 6, modifier: 0 });
  // Empowered Evocation rides the bolt directly (Lightning Bolt bypasses spellDamageBonus).
  const fullDmg = scaleSpellDamage(damageRoll.total, nextCharacter, 3) + empoweredEvocationBonus(nextCharacter);
  const dc = spellSaveDC(nextCharacter);

  let nextState: CombatState = appendLog(state, {
    id: nextLogId(state),
    kind: 'roll',
    text: t('combat.log.lightningBolt', {
      name: nextCharacter.name,
      target: primary.instance.displayName,
      rolls: damageRoll.rolls.join('+'),
      dmg: fullDmg,
      evoker: evoker ? t('combat.log.sculptSpells') : '',
      dc,
      fork: secondary ? t('combat.log.lightningForkClause') : '',
    }),
  });
  nextState = attachSpellEffect(nextState, 'spell-fork', 'player', primaryId, spellElement(ctx.spellId));

  // Primary takes the full bolt (save halves).
  {
    const def = getMonster(primary.instance.defId);
    const dexMod = abilityModifier(def.abilityScores.dex ?? 10);
    const save = roller.d20('normal', dexMod);
    const success = save.total >= dc;
    const dmg = success ? Math.floor(fullDmg / 2) : fullDmg;
    nextState = revealAc(nextState, primaryId);
    nextState = appendLog(nextState, {
      id: nextLogId(nextState),
      kind: 'roll',
      text: t('combat.log.lightningSave', {
        name: primary.instance.displayName,
        mod: `${dexMod >= 0 ? '+' : ''}${dexMod}`,
        total: save.total,
        dc,
        result: success ? t('combat.f.successHalf') : t('combat.f.failFull'),
      }),
    });
    const damaged = applyDamage(nextState, primaryId, dmg, nextCharacter);
    nextState = damaged.state;
    nextCharacter = damaged.character;
    nextState = appendLog(nextState, {
      id: nextLogId(nextState),
      kind: 'damage',
      text: t('combat.log.takesDamage', {
        name: primary.instance.displayName,
        dmg,
        type: t('combat.dmg.lightning'),
      }),
    });
  }

  // The fork: a second foe takes HALF the bolt (its own DEX save halves again).
  if (secondary) {
    const base = Math.floor(fullDmg / 2);
    const def = getMonster(secondary.instance.defId);
    const dexMod = abilityModifier(def.abilityScores.dex ?? 10);
    const save = roller.d20('normal', dexMod);
    const success = save.total >= dc;
    const dmg = success ? Math.floor(base / 2) : base;
    nextState = revealAc(nextState, secondary.id);
    nextState = appendLog(nextState, {
      id: nextLogId(nextState),
      kind: 'roll',
      text: t('combat.log.lightningForkRoll', {
        name: secondary.instance.displayName,
        mod: `${dexMod >= 0 ? '+' : ''}${dexMod}`,
        total: save.total,
        dc,
        result: success ? t('combat.f.success') : t('combat.f.fail'),
      }),
    });
    const damaged = applyDamage(nextState, secondary.id, dmg, nextCharacter);
    nextState = damaged.state;
    nextCharacter = damaged.character;
    nextState = appendLog(nextState, {
      id: nextLogId(nextState),
      kind: 'damage',
      text: t('combat.log.lightningForkDamage', { name: secondary.instance.displayName, dmg }),
    });
  }

  nextCharacter = markActionUsed(nextCharacter);
  const ended = evaluateCombatEndFull(nextState, nextCharacter);
  return { state: ended.state, character: ended.character, cast: true };
}

function revealAc(state: CombatState, id: string): CombatState {
  return {
    ...state,
    combatants: state.combatants.map((c) =>
      c.kind === 'monster' && c.id === id && !c.instance.acRevealed
        ? { ...c, instance: { ...c.instance, acRevealed: true } }
        : c,
    ),
  };
}
