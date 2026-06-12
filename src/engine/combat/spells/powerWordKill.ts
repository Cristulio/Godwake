import type { Character } from '../../../types/character';
import type { CombatState } from '../../../types/combat';
import { getMonster } from '../../../content/monsters';
import { abilityModifier } from '../../../types/abilities';
import { effectiveAbilityScores } from '../../character/derived';
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
  spellDamageBonus,
  spellElement,
  spellSaveDC,
} from './helpers';
import { scaleSpellDamage } from './scaling';
import { t } from '../../../i18n';

// PROVISIONAL dice — owned by the end-of-campaign sim batch, not hand-tuned
// here. Sized against Unmake's 18d8 (~81): the survive case lands lighter (the
// word's upside is the kill, not the roll), the boss fail-case lands heavier
// (the lone L9 slot still has to be worth speaking at a thing that cannot die
// to it), the boss resist-case is half that.
/** Normal/elite passed the save: heavy necrotic instead of death (10d12 ≈ 65). */
export const POWER_WORD_KILL_SURVIVE_DICE = { count: 10, die: 12 } as const;
/** Boss failed the save: the big hit (14d12 ≈ 91) — it bleeds, it never dies. */
export const POWER_WORD_KILL_BOSS_FAIL_DICE = { count: 14, die: 12 } as const;
/** Boss passed the save: the reduced hit (7d12 ≈ 45). */
export const POWER_WORD_KILL_BOSS_RESIST_DICE = { count: 7, die: 12 } as const;

/**
 * Power Word: Kill (9th) — the save-or-die capstone. One foe rolls a CON save
 * against the caster's spell DC:
 *
 *  - rank-and-file AND elites: a failed save is death outright — the target is
 *    unsaid, not damaged. A passed save takes the heavy survive-roll instead.
 *  - bosses (instance rank 'boss') NEVER die to the word: a failed save deals
 *    the big boss roll, a passed save the reduced one.
 *
 * The save is deliberately NOT a control save — legendary resistance does not
 * auto-block it (rank, not the LR pool, is what shields a boss), and no one
 * rolls it with advantage: the word is absolute, rank decides survival.
 *
 * The kill routes lethal damage (temp + current HP) through {@link applyDamage}
 * rather than zeroing HP directly, so every death hook fires — ward gates still
 * hold (a warded foe survives the word until its anchor falls), the codex
 * records the defeat, the death SFX plays.
 */
export function castPowerWordKill(ctx: CastSpellContext): CastResult {
  const { state, roller } = ctx;
  const targetId = ctx.targetId ?? firstLiveMonsterId(state);
  if (!targetId) return { state, character: ctx.character, cast: false };
  const target = findMonster(state, targetId);
  if (!target || target.instance.hp.current <= 0) {
    return { state, character: ctx.character, cast: false };
  }

  let nextCharacter: Character = consumeSlot(ctx.character, 9);
  const dc = spellSaveDC(nextCharacter);
  const monsterDef = getMonster(target.instance.defId);
  const conMod = abilityModifier(monsterDef.abilityScores.con ?? 10);
  const isBoss = target.instance.rank === 'boss';

  let nextState: CombatState = appendLog(state, {
    id: nextLogId(state),
    kind: 'narration',
    text: t('combat.log.powerWordSpoken', {
      name: nextCharacter.name,
      target: target.instance.displayName,
    }),
  });

  const save = roller.d20('normal', conMod);
  const resisted = save.total >= dc;
  nextState = appendLog(nextState, {
    id: nextLogId(nextState),
    kind: 'roll',
    text: t('combat.log.powerWordSave', {
      name: target.instance.displayName,
      mod: `${conMod >= 0 ? '+' : ''}${conMod}`,
      total: save.total,
      dc,
      result: resisted ? t('combat.f.resists') : t('combat.f.fails'),
    }),
  });

  if (!isBoss && !resisted) {
    // Death outright. No damage number floats — the word is not a roll.
    nextState = attachSpellEffect(
      nextState,
      'spell-bolt',
      'player',
      targetId,
      spellElement(ctx.spellId),
    );
    const lethal = target.instance.hp.temp + target.instance.hp.current;
    const killed = applyDamage(nextState, targetId, lethal, nextCharacter);
    nextState = killed.state;
    nextCharacter = killed.character;
    const after = findMonster(nextState, targetId);
    if (!after || after.instance.hp.current <= 0) {
      nextState = appendLog(nextState, {
        id: nextLogId(nextState),
        kind: 'narration',
        text: t('combat.log.powerWordKill', { name: target.instance.displayName }),
      });
    }
  } else {
    const dice = isBoss
      ? resisted
        ? POWER_WORD_KILL_BOSS_RESIST_DICE
        : POWER_WORD_KILL_BOSS_FAIL_DICE
      : POWER_WORD_KILL_SURVIVE_DICE;
    const roll = roller.roll({ count: dice.count, die: dice.die, modifier: 0 });
    const intMod = abilityModifier(effectiveAbilityScores(nextCharacter).int);
    const dealt =
      scaleSpellDamage(roll.total, nextCharacter, 9) +
      intMod +
      spellDamageBonus(nextCharacter);
    nextState = attachSpellEffect(
      nextState,
      'spell-bolt',
      'player',
      targetId,
      spellElement(ctx.spellId),
      undefined,
      dealt,
    );
    const damaged = applyDamage(nextState, targetId, dealt, nextCharacter);
    nextState = damaged.state;
    nextCharacter = damaged.character;
    const lineKey = isBoss
      ? resisted
        ? 'combat.log.powerWordBossResist'
        : 'combat.log.powerWordBossFail'
      : 'combat.log.powerWordSurvive';
    nextState = appendLog(nextState, {
      id: nextLogId(nextState),
      kind: 'damage',
      text: t(lineKey, { name: target.instance.displayName, dealt }),
    });
  }

  nextCharacter = markActionUsed(nextCharacter);
  const ended = evaluateCombatEndFull(nextState, nextCharacter);
  return { state: ended.state, character: ended.character, cast: true };
}
