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
import { scaleSpellDamage, spellAcquisitionLevel } from './scaling';

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
  const scaledDice = scaleSpellDamage(damageRoll.total, nextCharacter, spellAcquisitionLevel(cfg.slotLevel));
  const fullDmg = scaledDice + spellDamageBonus(nextCharacter);
  const dc = spellSaveDC(nextCharacter);

  let nextState: CombatState = appendLog(state, {
    id: nextLogId(state),
    kind: 'roll',
    text: `${nextCharacter.name} ${cfg.flavor} ${damageRoll.rolls.join('+')} = ${fullDmg} ${cfg.damageType}. DEX save DC ${dc} for half.`,
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

export function castRimeBlast(ctx: CastSpellContext): CastResult {
  return castAreaBlast(ctx, {
    slotLevel: 4,
    dice: 7,
    die: 6,
    damageType: 'cold',
    flavor: 'detonates a pressure-wave of killing frost —',
  });
}

export function castGlacialCone(ctx: CastSpellContext): CastResult {
  return castAreaBlast(ctx, {
    slotLevel: 5,
    dice: 9,
    die: 8,
    damageType: 'cold',
    flavor: 'sweeps the room with a fan of glacier-cold —',
  });
}

export function castSunfireBurst(ctx: CastSpellContext): CastResult {
  return castAreaBlast(ctx, {
    slotLevel: 6,
    dice: 11,
    die: 6,
    damageType: 'fire',
    flavor: 'blooms a second sun —',
  });
}

export function castStormcrash(ctx: CastSpellContext): CastResult {
  return castAreaBlast(ctx, {
    slotLevel: 7,
    dice: 13,
    die: 6,
    damageType: 'lightning',
    flavor: 'brings the sky down indoors —',
  });
}

export function castCataclysm(ctx: CastSpellContext): CastResult {
  return castAreaBlast(ctx, {
    slotLevel: 8,
    dice: 15,
    die: 6,
    damageType: 'fire',
    flavor: 'calls a column of ruin down —',
  });
}
