import type { Character } from '../../../types/character';
import type { CombatState } from '../../../types/combat';
import { getMonster } from '../../../content/monsters';
import { abilityModifier } from '../../../types/abilities';
import { critRange, effectiveAbilityScores } from '../../character/derived';
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
  spellAttackBonus,
  spellDamageBonus,
  spellElement,
  spellSaveDC,
} from './helpers';
import { scaleSpellDamage } from './scaling';
import { t } from '../../../i18n';

function intMod(character: Readonly<Character>): number {
  return abilityModifier(effectiveAbilityScores(character).int);
}

/**
 * Force Lance (4th) — a spear of hardened force that simply lands. No attack
 * roll, no save (the Magic Missile contract, scaled up): guaranteed 6d8 + INT +
 * spell-damage gear. The reliable-finish single-target pick at its tier.
 */
export function castForceLance(ctx: CastSpellContext): CastResult {
  const { state, roller } = ctx;
  const targetId = ctx.targetId ?? firstLiveMonsterId(state);
  if (!targetId) return { state, character: ctx.character, cast: false };
  const target = findMonster(state, targetId);
  if (!target) return { state, character: ctx.character, cast: false };

  let nextCharacter: Character = consumeSlot(ctx.character, 4);
  const roll = roller.roll({ count: 6, die: 8, modifier: 0 });
  const scaled = scaleSpellDamage(roll.total, nextCharacter, 4);
  const dealt = scaled + intMod(nextCharacter) + spellDamageBonus(nextCharacter);

  let nextState: CombatState = appendLog(state, {
    id: nextLogId(state),
    kind: 'roll',
    text: t('combat.log.forceLance', { name: nextCharacter.name, target: target.instance.displayName, dealt }),
  });
  nextState = attachSpellEffect(nextState, 'spell-bolt', 'player', targetId, spellElement(ctx.spellId), undefined, dealt);
  const damaged = applyDamage(nextState, targetId, dealt, nextCharacter);
  nextState = damaged.state;
  nextCharacter = damaged.character;

  nextCharacter = markActionUsed(nextCharacter);
  const ended = evaluateCombatEndFull(nextState, nextCharacter);
  return { state: ended.state, character: ended.character, cast: true };
}

/**
 * Void Ray (5th) — a spell-attack beam of un-light. 10d6 necrotic on a hit
 * (crit doubles the dice), nothing on a miss. The high-roll single-target burst.
 */
export function castVoidRay(ctx: CastSpellContext): CastResult {
  const { state, roller } = ctx;
  const targetId = ctx.targetId ?? firstLiveMonsterId(state);
  if (!targetId) return { state, character: ctx.character, cast: false };
  const target = findMonster(state, targetId);
  if (!target) return { state, character: ctx.character, cast: false };

  let nextCharacter: Character = consumeSlot(ctx.character, 5);
  const attackBonus = spellAttackBonus(nextCharacter);
  const ac = target.instance.ac;
  const toHit = roller.d20('normal', attackBonus);
  // Crit gear widens the spell-attack crit window (see Scorching Ray) — Void Ray
  // is an attack roll, so a caster's crit affixes double its dice on the wider band.
  const crit = critRange(nextCharacter).includes(toHit.rolls[0]);
  const hit = crit || (toHit.total >= ac && !toHit.natural1);

  let nextState: CombatState = appendLog(
    {
      ...state,
      combatants: state.combatants.map((c) =>
        c.kind === 'monster' && c.id === targetId && !c.instance.acRevealed
          ? { ...c, instance: { ...c.instance, acRevealed: true } }
          : c,
      ),
    },
    {
      id: nextLogId(state),
      kind: 'roll',
      text: t('combat.log.voidRayRoll', {
        name: nextCharacter.name,
        target: target.instance.displayName,
        mod: `${attackBonus >= 0 ? '+' : ''}${attackBonus}`,
        total: toHit.total,
        ac,
        result: crit ? t('combat.f.resCrit') : hit ? t('combat.f.resHit') : t('combat.f.resMissGraze'),
      }),
    },
  );
  nextState = attachSpellEffect(nextState, 'spell-bolt', 'player', targetId, spellElement(ctx.spellId));

  // A hit bores full (a crit doubles the dice); a clean miss still GRAZES for
  // half — the beam of un-light leaves its mark even off-true, so a 5th-level
  // slot is never wholly wasted on one bad roll.
  const roll = roller.roll({ count: 10 * (crit ? 2 : 1), die: 6, modifier: 0 });
  const scaled = scaleSpellDamage(roll.total, nextCharacter, 5);
  const full = scaled + intMod(nextCharacter) + spellDamageBonus(nextCharacter);
  const dealt = hit ? full : Math.floor(full / 2);
  const damaged = applyDamage(nextState, targetId, dealt, nextCharacter);
  nextState = damaged.state;
  nextCharacter = damaged.character;
  nextState = appendLog(nextState, {
    id: nextLogId(nextState),
    kind: 'damage',
    text: hit
      ? t('combat.log.voidRayHit', { dealt })
      : t('combat.log.voidRayMiss', { target: target.instance.displayName, dealt }),
  });

  nextCharacter = markActionUsed(nextCharacter);
  const ended = evaluateCombatEndFull(nextState, nextCharacter);
  return { state: ended.state, character: ended.character, cast: true };
}

/**
 * Dissolution (6th) — matter unknits. 12d6+24 force; a CON save halves it. The
 * heaviest single-target tier-6 punch, with the reliability of a save-for-half
 * floor against a beefy boss.
 */
export function castDissolution(ctx: CastSpellContext): CastResult {
  const { state, roller } = ctx;
  const targetId = ctx.targetId ?? firstLiveMonsterId(state);
  if (!targetId) return { state, character: ctx.character, cast: false };
  const target = findMonster(state, targetId);
  if (!target) return { state, character: ctx.character, cast: false };

  let nextCharacter: Character = consumeSlot(ctx.character, 6);
  const roll = roller.roll({ count: 12, die: 6, modifier: 24 });
  const scaled = scaleSpellDamage(roll.total, nextCharacter, 6);
  const full = scaled + spellDamageBonus(nextCharacter);
  const dc = spellSaveDC(nextCharacter);
  const monsterDef = getMonster(target.instance.defId);
  const conMod = abilityModifier(monsterDef.abilityScores.con ?? 10);
  const save = roller.d20('normal', conMod);
  const saved = save.total >= dc;
  const dealt = saved ? Math.floor(full / 2) : full;

  let nextState: CombatState = appendLog(
    {
      ...state,
      combatants: state.combatants.map((c) =>
        c.kind === 'monster' && c.id === targetId && !c.instance.acRevealed
          ? { ...c, instance: { ...c.instance, acRevealed: true } }
          : c,
      ),
    },
    {
      id: nextLogId(state),
      kind: 'roll',
      text: t('combat.log.halfApart', {
        name: nextCharacter.name,
        target: target.instance.displayName,
        mod: `${conMod >= 0 ? '+' : ''}${conMod}`,
        total: save.total,
        dc,
        result: saved ? t('combat.f.successHalf') : t('combat.f.failFull'),
      }),
    },
  );
  nextState = attachSpellEffect(nextState, 'spell-bolt', 'player', targetId, spellElement(ctx.spellId), undefined, dealt);
  const damaged = applyDamage(nextState, targetId, dealt, nextCharacter);
  nextState = damaged.state;
  nextCharacter = damaged.character;
  nextState = appendLog(nextState, {
    id: nextLogId(nextState),
    kind: 'damage',
    text: t('combat.log.halfApartDamage', { target: target.instance.displayName, dealt }),
  });

  nextCharacter = markActionUsed(nextCharacter);
  const ended = evaluateCombatEndFull(nextState, nextCharacter);
  return { state: ended.state, character: ended.character, cast: true };
}

/**
 * Wither (8th) — years drain in a heartbeat. 16d6 necrotic that always lands,
 * and the survivor is left {@link 'weakened'} (its blows fall softer) for the
 * rest of the fight — the only debuff that reads against a monster's own
 * outgoing damage (see monsterAttack.ts).
 */
export function castWither(ctx: CastSpellContext): CastResult {
  const { state, roller } = ctx;
  const targetId = ctx.targetId ?? firstLiveMonsterId(state);
  if (!targetId) return { state, character: ctx.character, cast: false };
  const target = findMonster(state, targetId);
  if (!target) return { state, character: ctx.character, cast: false };

  let nextCharacter: Character = consumeSlot(ctx.character, 8);
  const roll = roller.roll({ count: 16, die: 6, modifier: 0 });
  const scaled = scaleSpellDamage(roll.total, nextCharacter, 8);
  const dealt = scaled + intMod(nextCharacter) + spellDamageBonus(nextCharacter);

  let nextState: CombatState = appendLog(state, {
    id: nextLogId(state),
    kind: 'roll',
    text: t('combat.log.wither', { name: nextCharacter.name, target: target.instance.displayName, dealt }),
  });
  nextState = attachSpellEffect(nextState, 'spell-bolt', 'player', targetId, spellElement(ctx.spellId), undefined, dealt);
  const damaged = applyDamage(nextState, targetId, dealt, nextCharacter);
  nextState = damaged.state;
  nextCharacter = damaged.character;

  // Apply 'weakened' to the survivor — read by monsterAttack as a flat cut to
  // its outgoing damage. Long duration so it holds for the fight; the per-turn
  // debuff tick in turn.ts still expires it eventually.
  nextState = {
    ...nextState,
    combatants: nextState.combatants.map((c) => {
      if (c.kind !== 'monster' || c.id !== targetId || c.instance.hp.current <= 0) return c;
      return {
        ...c,
        instance: {
          ...c.instance,
          conditions: [
            ...c.instance.conditions.filter((x) => x.name !== 'weakened'),
            {
              name: 'weakened' as const,
              duration: { kind: 'rounds' as const, value: 10 },
              level: 4,
              source: nextCharacter.id,
            },
          ],
        },
      };
    }),
  };

  nextCharacter = markActionUsed(nextCharacter);
  const ended = evaluateCombatEndFull(nextState, nextCharacter);
  return { state: ended.state, character: ended.character, cast: true };
}

/**
 * Soul Snare (7th) — bindings of pure will. WIS save or paralyzed 3 rounds; a
 * far harder grip than the 2nd-level binding. A boss's resolute will rolls the
 * save with advantage rather than auto-negating, so even a lone boss can be
 * snared on a bad roll — control is a gamble, not a guaranteed waste.
 */
export function castSoulSnare(ctx: CastSpellContext): CastResult {
  const { state, roller } = ctx;
  const targetId = ctx.targetId ?? firstLiveMonsterId(state);
  if (!targetId) return { state, character: ctx.character, cast: false };
  const target = findMonster(state, targetId);
  if (!target) return { state, character: ctx.character, cast: false };

  let nextCharacter: Character = consumeSlot(ctx.character, 7);
  const dc = spellSaveDC(nextCharacter);
  const monsterDef = getMonster(target.instance.defId);
  const wisMod = abilityModifier(monsterDef.abilityScores.wis ?? 10);
  const resoluteWill = (target.instance.legendaryResistances ?? 0) > 0;
  const save = roller.d20(resoluteWill ? 'advantage' : 'normal', wisMod);
  const success = save.total >= dc;

  let nextState: CombatState = appendLog(state, {
    id: nextLogId(state),
    kind: 'roll',
    text: t('combat.log.soulSnareRoll', {
      name: nextCharacter.name,
      target: target.instance.displayName,
      resolute: resoluteWill ? t('combat.f.resoluteAdv') : '',
      mod: `${wisMod >= 0 ? '+' : ''}${wisMod}`,
      total: save.total,
      dc,
      result: success ? t('combat.f.success') : t('combat.f.fail'),
    }),
  });
  nextState = attachSpellEffect(nextState, 'hold-person', 'player', targetId);

  if (!success) {
    nextState = appendLog(
      {
        ...nextState,
        combatants: nextState.combatants.map((c) => {
          if (c.kind !== 'monster' || c.id !== targetId) return c;
          const cond = {
            name: 'paralyzed' as const,
            duration: { kind: 'rounds' as const, value: 3 },
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
        text: t('combat.log.soulSnareBound', { target: target.instance.displayName }),
      },
    );
  }

  nextCharacter = markActionUsed(nextCharacter);
  return { state: nextState, character: nextCharacter, cast: true };
}
