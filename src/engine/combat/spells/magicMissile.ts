import type { Character } from '../../../types/character';
import type { CombatState } from '../../../types/combat';
import { getSpell } from '../../../content/spells';
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
} from './helpers';
import { t, getLocalized } from '../../../i18n';

/**
 * Magic Missile gains darts as the caster grows, so the guaranteed-hit L1 slot
 * keeps pace with a scaling Fire Bolt instead of being left behind: 3 darts,
 * +1 every third level from 5th (4 @ L5, 5 @ L8, … 8 @ L17). Its niche is the
 * un-missable, un-savable hit — every dart lands, full, no roll.
 */
export function magicMissileDartCount(level: number): number {
  return 3 + Math.max(0, Math.floor((level - 2) / 3));
}

export function castMagicMissile(ctx: CastSpellContext): CastResult {
  const { character, state, roller, spellId } = ctx;
  let nextCharacter: Character = character;
  const targetId = ctx.targetId ?? firstLiveMonsterId(state);
  if (!targetId) return { state, character: nextCharacter, cast: false };
  const target = findMonster(state, targetId);
  if (!target) return { state, character: nextCharacter, cast: false };

  // The Druid's Thornlash shares this auto-hit machinery but throws heavier
  // barbed thorns (1d6+1) than the wizard's force darts (1d4+1) — a deliberate
  // step up so the L1 slot clearly beats the at-will Produce Flame (the cantrip
  // was reading ~ the slot, so the slot wasn't worth spending). Same dart COUNT
  // and the same guaranteed minimum (1+1 per dart), so the bot's reads hold; the
  // wizard's Magic Missile is untouched.
  const isDruid = getSpell(spellId).book === 'druid';
  const die = isDruid ? 6 : 4;

  nextCharacter = consumeSlot(nextCharacter, 1);
  const darts = magicMissileDartCount(nextCharacter.level);
  const rolls: number[] = [];
  let total = 0;
  for (let i = 0; i < darts; i++) {
    const r = roller.roll({ count: 1, die, modifier: 1 });
    rolls.push(r.total);
    total += r.total;
  }
  const bonus = spellDamageBonus(nextCharacter);
  total += bonus;

  let nextState: CombatState = appendLog(
    {
      ...state,
      combatants: state.combatants.map((c) => {
        if (c.kind !== 'monster' || c.id !== targetId) return c;
        if (c.instance.acRevealed) return c;
        return { ...c, instance: { ...c.instance, acRevealed: true } };
      }),
    },
    {
      id: nextLogId(state),
      kind: 'roll',
      text: t('combat.log.magicMissile', {
        name: nextCharacter.name,
        spell: getLocalized('spells', spellId, 'name', getSpell(spellId).name),
        darts,
        projectile: isDruid ? t('combat.log.magicMissileThorns') : t('combat.log.magicMissileDarts'),
        target: target.instance.displayName,
        rolls: rolls.join('+'),
        bonus: bonus > 0 ? `+${bonus}` : '',
        total,
      }),
    },
  );

  const damaged = applyDamage(nextState, targetId, total, nextCharacter);
  nextState = damaged.state;
  nextCharacter = damaged.character;
  nextState = attachSpellEffect(nextState, isDruid ? 'thorn-lash' : 'magic-missile', 'player', targetId);
  nextCharacter = markActionUsed(nextCharacter);
  const ended = evaluateCombatEndFull(nextState, nextCharacter);
  return { state: ended.state, character: ended.character, cast: true };
}
