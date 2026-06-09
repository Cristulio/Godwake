import type { Character } from '../../../types/character';
import type { CombatState, MonsterCombatant, SpellElement } from '../../../types/combat';
import type { SpellSlotLevel } from '../../../types/character';
import type { DieSize } from '../../../types/dice';
import { appendLog } from '../log';
import {
  type CastResult,
  type CastSpellContext,
  applyAreaSaveForHalf,
  attachSpellEffect,
  consumeSlot,
  evaluateCombatEndFull,
  markActionUsed,
  nextLogId,
  spellDamageBonus,
  spellSaveDC,
} from './helpers';
import { scaleSpellDamage } from './scaling';
import { t } from '../../../i18n';

interface BlastConfig {
  slotLevel: SpellSlotLevel;
  dice: number;
  die: DieSize;
  damageType: SpellElement;
  flavor: string;
}

/**
 * Shared resolver for the higher-tier AoE evocations (Rime Blast → Cataclysm).
 * Every enemy rolls its own DEX save for half off the shared per-monster helper,
 * so the only thing each spell varies is its dice and element. The caster's
 * spell-damage gear folds into the rolled total before the save split, so
 * spell-damage affixes scale the blast — the same lever Scorching Ray and the
 * cantrips already reward.
 */
function castAreaBlast(ctx: CastSpellContext, cfg: BlastConfig): CastResult {
  const { state, roller } = ctx;
  let nextCharacter: Character = consumeSlot(ctx.character, cfg.slotLevel);

  const aliveMonsters = state.combatants.filter(
    (c) => c.kind === 'monster' && c.instance.hp.current > 0,
  ) as MonsterCombatant[];

  const damageRoll = roller.roll({ count: cfg.dice, die: cfg.die, modifier: 0 });
  const scaledDice = scaleSpellDamage(damageRoll.total, nextCharacter, cfg.slotLevel);
  const fullDmg = scaledDice + spellDamageBonus(nextCharacter);
  const dc = spellSaveDC(nextCharacter);

  let nextState: CombatState = appendLog(state, {
    id: nextLogId(state),
    kind: 'roll',
    text: t('combat.log.highBlast', {
      name: nextCharacter.name,
      flavor: cfg.flavor,
      rolls: damageRoll.rolls.join('+'),
      dmg: fullDmg,
      type: t(`combat.dmg.${cfg.damageType}`),
      dc,
    }),
  });
  // Lightning AoE arcs as a fork; every other element blooms as a burst across
  // the enemy line. Element drives the palette either way.
  const shape = cfg.damageType === 'lightning' ? 'spell-fork' : 'spell-burst';
  nextState = attachSpellEffect(nextState, shape, 'player', aliveMonsters[0]?.id, cfg.damageType);

  const result = applyAreaSaveForHalf(nextState, nextCharacter, aliveMonsters, {
    roller,
    fullDmg,
    dc,
    damageType: cfg.damageType,
  });
  nextState = result.state;
  nextCharacter = result.character;

  nextCharacter = markActionUsed(nextCharacter);
  const ended = evaluateCombatEndFull(nextState, nextCharacter);
  return { state: ended.state, character: ended.character, cast: true };
}

/**
 * Thunderwave (2nd) — the Bard's pack tool. A wave of concussive sound bursts
 * across the whole enemy line for a thunder AoE, DEX save for half. Shares the
 * area-blast machinery; the low slot keeps it a workhorse crowd-clear rather than
 * a finisher (the caster-bard's answer to a room, where its single-target book
 * and control hold one foe at a time).
 */
export function castThunderwave(ctx: CastSpellContext): CastResult {
  return castAreaBlast(ctx, {
    slotLevel: 2,
    dice: 5,
    die: 6,
    damageType: 'thunder',
    flavor: t('combat.log.blastFlavor.thunderwave'),
  });
}

export function castRimeBlast(ctx: CastSpellContext): CastResult {
  return castAreaBlast(ctx, {
    slotLevel: 4,
    dice: 7,
    die: 6,
    damageType: 'cold',
    flavor: t('combat.log.blastFlavor.rime'),
  });
}

export function castGlacialCone(ctx: CastSpellContext): CastResult {
  return castAreaBlast(ctx, {
    slotLevel: 5,
    dice: 9,
    die: 8,
    damageType: 'cold',
    flavor: t('combat.log.blastFlavor.glacial'),
  });
}

export function castSunfireBurst(ctx: CastSpellContext): CastResult {
  return castAreaBlast(ctx, {
    slotLevel: 6,
    dice: 11,
    die: 6,
    damageType: 'fire',
    flavor: t('combat.log.blastFlavor.sunfire'),
  });
}

export function castStormcrash(ctx: CastSpellContext): CastResult {
  return castAreaBlast(ctx, {
    slotLevel: 7,
    dice: 13,
    die: 6,
    damageType: 'lightning',
    flavor: t('combat.log.blastFlavor.storm'),
  });
}

export function castCataclysm(ctx: CastSpellContext): CastResult {
  return castAreaBlast(ctx, {
    slotLevel: 8,
    dice: 15,
    die: 6,
    damageType: 'fire',
    flavor: t('combat.log.blastFlavor.cataclysm'),
  });
}
