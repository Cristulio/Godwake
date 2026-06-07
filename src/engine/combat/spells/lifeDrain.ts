import type { Character, SpellSlotLevel } from '../../../types/character';
import type { CombatState } from '../../../types/combat';
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
} from './helpers';
import { scaleSpellDamage } from './scaling';
import { t } from '../../../i18n';

function intMod(character: Readonly<Character>): number {
  return abilityModifier(effectiveAbilityScores(character).int);
}

/**
 * Shared body for the necrotic life-drain workings: roll Nd6 + INT + spell-damage
 * gear, land it (no roll, no save — the wound simply opens), then close half of
 * the toll into the caster's own flesh, capped at full HP. The two drains differ
 * only by slot level, dice count, and the in-world line, so they share this.
 */
function castDrain(
  ctx: CastSpellContext,
  opts: { slot: SpellSlotLevel; dice: number; strikeLine: (caster: string, target: string, dealt: number) => string },
): CastResult {
  const { state, roller } = ctx;
  const targetId = ctx.targetId ?? firstLiveMonsterId(state);
  if (!targetId) return { state, character: ctx.character, cast: false };
  const target = findMonster(state, targetId);
  if (!target) return { state, character: ctx.character, cast: false };

  let nextCharacter: Character = consumeSlot(ctx.character, opts.slot);
  const roll = roller.roll({ count: opts.dice, die: 6, modifier: 0 });
  const scaled = scaleSpellDamage(roll.total, nextCharacter, opts.slot);
  const dealt = scaled + intMod(nextCharacter) + spellDamageBonus(nextCharacter);

  let nextState: CombatState = appendLog(state, {
    id: nextLogId(state),
    kind: 'roll',
    text: opts.strikeLine(nextCharacter.name, target.instance.displayName, dealt),
  });
  nextState = attachSpellEffect(nextState, 'spell-drain', 'player', targetId, spellElement(ctx.spellId));
  const damaged = applyDamage(nextState, targetId, dealt, nextCharacter);
  nextState = damaged.state;
  nextCharacter = damaged.character;

  const healAmount = Math.floor(dealt / 2);
  const before = nextCharacter.hp.current;
  const after = Math.min(nextCharacter.hp.max, before + healAmount);
  nextCharacter = { ...nextCharacter, hp: { ...nextCharacter.hp, current: after } };
  nextState = appendLog(nextState, {
    id: nextLogId(nextState),
    kind: 'system',
    text: t('combat.log.lifeDrainRestore', { name: nextCharacter.name, amount: after - before }),
  });

  nextCharacter = markActionUsed(nextCharacter);
  const ended = evaluateCombatEndFull(nextState, nextCharacter);
  return { state: ended.state, character: ended.character, cast: true };
}

/**
 * Vampiric Touch (3rd) — necromancy. A grip of grave-cold draws the warmth out
 * of one target for 5d6 necrotic (+ INT + spell-damage gear), and half of that
 * toll knits the caster's own wounds. The drain that lets a wizard trade slots
 * for staying power against a single tough foe.
 */
export function castVampiricTouch(ctx: CastSpellContext): CastResult {
  return castDrain(ctx, {
    slot: 3,
    dice: 5,
    strikeLine: (caster, target, dealt) =>
      t('combat.log.vampiricTouch', { caster, target, dealt }),
  });
}

/**
 * Exsanguinate (6th) — necromancy. The drain taken to its limit: 10d6 necrotic
 * (+ INT + spell-damage gear) torn from one target, half of it poured back into
 * the caster. A heavy single-target punch that pays for itself in blood.
 */
export function castExsanguinate(ctx: CastSpellContext): CastResult {
  return castDrain(ctx, {
    slot: 6,
    dice: 10,
    strikeLine: (caster, target, dealt) =>
      t('combat.log.exsanguinate', { caster, target, dealt }),
  });
}
