import type { Character } from '../../../types/character';
import type { CombatState } from '../../../types/combat';
import { getMonster } from '../../../content/monsters';
import { abilityModifier } from '../../../types/abilities';
import { effectiveAbilityScores } from '../../character/derived';
import { applyDamage } from '../attack';
import { appendLog } from '../log';
import { patchResources } from '../types';
import {
  APOTHEOSIS_AC_BONUS,
  APOTHEOSIS_ROUNDS,
  APOTHEOSIS_TEMP_HP,
} from '../apotheosis';
import { SHAPE_CHANGE_ROUNDS, SHAPE_CHANGE_TEMP_HP } from '../shapeChange';
import {
  BEAR_FORM_AC_BONUS,
  BEAR_FORM_ROUNDS,
  BEAR_FORM_TEMP_HP,
} from '../bearForm';
import { TIME_STOP_EXTRA_TURNS } from '../timeStop';
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

/**
 * Apotheosis (9th) — the transform-self capstone. The caster sheds the limits of
 * flesh: temporary hit points (taken as the max of any existing pool — the
 * tempHp take-max rule), +{@link APOTHEOSIS_AC_BONUS} AC, and +{@link
 * APOTHEOSIS_BONUS_DAMAGE} to every attack — weapon AND spell — for
 * {@link APOTHEOSIS_ROUNDS} rounds. The buff reads in computeAC (AC), playerAttack
 * (weapon damage), spells/helpers spellDamageBonus (spell damage), and decrements
 * in turn.ts. A self-cast: no target.
 */
export function castApotheosis(
  character: Readonly<Character>,
  state: CombatState,
): CastResult {
  let nextCharacter: Character = consumeSlot(character, 9);
  nextCharacter = patchResources(nextCharacter, {
    ascendantRoundsRemaining: APOTHEOSIS_ROUNDS,
  });
  const temp = Math.max(nextCharacter.hp.temp, APOTHEOSIS_TEMP_HP);
  nextCharacter = { ...nextCharacter, hp: { ...nextCharacter.hp, temp } };
  nextCharacter = markActionUsed(nextCharacter);

  let nextState: CombatState = appendLog(state, {
    id: nextLogId(state),
    kind: 'narration',
    text: t('combat.log.apotheosis', {
      name: nextCharacter.name,
      temp: APOTHEOSIS_TEMP_HP,
      ac: APOTHEOSIS_AC_BONUS,
      rounds: APOTHEOSIS_ROUNDS,
    }),
  });
  nextState = attachSpellEffect(nextState, 'mage-armor', 'player');
  return { state: nextState, character: nextCharacter, cast: true };
}

/**
 * Time Stop (9th) — the held-instant capstone. The world freezes and the caster
 * banks {@link TIME_STOP_EXTRA_TURNS} extra full turns: the turn engine keeps
 * handing the turn back to the player (and resetting the action economy) without
 * letting any enemy act, spending one banked turn each time, until the freeze
 * runs out. A self-cast: no target. The free turns are delivered in turn.ts.
 */
export function castTimeStop(
  character: Readonly<Character>,
  state: CombatState,
): CastResult {
  let nextCharacter: Character = consumeSlot(character, 9);
  nextCharacter = patchResources(nextCharacter, {
    extraTurnsRemaining: TIME_STOP_EXTRA_TURNS,
  });
  nextCharacter = markActionUsed(nextCharacter);

  let nextState: CombatState = appendLog(state, {
    id: nextLogId(state),
    kind: 'narration',
    text: t('combat.log.timeStop', {
      name: nextCharacter.name,
      turns: TIME_STOP_EXTRA_TURNS,
    }),
  });
  nextState = attachSpellEffect(nextState, 'mage-armor', 'player');
  return { state: nextState, character: nextCharacter, cast: true };
}

/**
 * Shape Change → Dragon (9th) — the transform-into-a-monster capstone. The
 * caster becomes a dragon: a wall of temporary hit points (taken as the max of
 * any existing pool — the tempHp take-max rule) that fights with three claw
 * strikes per Attack for {@link SHAPE_CHANGE_ROUNDS} rounds. The form reads in
 * playerAttack (attack count + the +3/+3 claw bonus) and the attack call sites
 * (the weapon swap), and decrements in turn.ts. A self-cast: no target.
 */
export function castShapeChange(
  character: Readonly<Character>,
  state: CombatState,
): CastResult {
  let nextCharacter: Character = consumeSlot(character, 9);
  nextCharacter = patchResources(nextCharacter, {
    dragonFormRoundsRemaining: SHAPE_CHANGE_ROUNDS,
  });
  const temp = Math.max(nextCharacter.hp.temp, SHAPE_CHANGE_TEMP_HP);
  nextCharacter = { ...nextCharacter, hp: { ...nextCharacter.hp, temp } };
  nextCharacter = markActionUsed(nextCharacter);

  let nextState: CombatState = appendLog(state, {
    id: nextLogId(state),
    kind: 'narration',
    text: t('combat.log.shapeChange', {
      name: nextCharacter.name,
      temp: SHAPE_CHANGE_TEMP_HP,
      rounds: SHAPE_CHANGE_ROUNDS,
    }),
  });
  nextState = attachSpellEffect(nextState, 'rage', 'player');
  return { state: nextState, character: nextCharacter, cast: true };
}

/**
 * Avatar of the Wilds → Great Bear (9th) — the druid's transform capstone, the
 * tankier counterpart to the wizard's Shape Change. The druid rises as a primal
 * bear: a wall of temporary hit points (taken as the max of any existing pool —
 * the tempHp take-max rule), +{@link BEAR_FORM_AC_BONUS} AC, and
 * {@link BEAR_CLAW_ATTACKS} heavy claw strikes per Attack for
 * {@link BEAR_FORM_ROUNDS} rounds. An upgraded Wild Shape that stands above the
 * whole beast ladder. The form reads in playerAttack (attack count + the +3/+3
 * claw bonus + the weapon swap), computeAC (AC), and decrements in turn.ts. A
 * self-cast: no target.
 */
export function castGreatBear(
  character: Readonly<Character>,
  state: CombatState,
): CastResult {
  let nextCharacter: Character = consumeSlot(character, 9);
  nextCharacter = patchResources(nextCharacter, {
    bearFormRoundsRemaining: BEAR_FORM_ROUNDS,
  });
  const temp = Math.max(nextCharacter.hp.temp, BEAR_FORM_TEMP_HP);
  nextCharacter = { ...nextCharacter, hp: { ...nextCharacter.hp, temp } };
  nextCharacter = markActionUsed(nextCharacter);

  let nextState: CombatState = appendLog(state, {
    id: nextLogId(state),
    kind: 'narration',
    text: t('combat.log.greatBear', {
      name: nextCharacter.name,
      temp: BEAR_FORM_TEMP_HP,
      ac: BEAR_FORM_AC_BONUS,
      rounds: BEAR_FORM_ROUNDS,
    }),
  });
  nextState = attachSpellEffect(nextState, 'rage', 'player');
  return { state: nextState, character: nextCharacter, cast: true };
}

/**
 * Unmake (9th) — the remake-the-enemy capstone. One foe is spoken half-out of
 * existence: 18d8 necrotic that always lands (the unmaking), then a CON save or
 * be paralyzed for 2 rounds (the binding — remade into something helpless). A
 * boss's resolute will rolls that save with advantage, never auto-negates it —
 * the damage always lands, and the binding can still take hold on a bad roll.
 */
export function castUnmake(ctx: CastSpellContext): CastResult {
  const { state, roller } = ctx;
  const targetId = ctx.targetId ?? firstLiveMonsterId(state);
  if (!targetId) return { state, character: ctx.character, cast: false };
  const target = findMonster(state, targetId);
  if (!target) return { state, character: ctx.character, cast: false };

  let nextCharacter: Character = consumeSlot(ctx.character, 9);
  const roll = roller.roll({ count: 18, die: 8, modifier: 0 });
  const intMod = abilityModifier(effectiveAbilityScores(nextCharacter).int);
  const scaled = scaleSpellDamage(roll.total, nextCharacter, 9);
  const dealt = scaled + intMod + spellDamageBonus(nextCharacter);
  const dc = spellSaveDC(nextCharacter);

  let nextState: CombatState = appendLog(state, {
    id: nextLogId(state),
    kind: 'roll',
    text: t('combat.log.ninthDrain', { name: nextCharacter.name, target: target.instance.displayName, dealt }),
  });
  // The unmaking — a heavy necrotic strike — is the headline; the binding it
  // also lays is narrated below. Show the necrotic bolt, not the control viz.
  nextState = attachSpellEffect(nextState, 'spell-bolt', 'player', targetId, spellElement(ctx.spellId));
  const damaged = applyDamage(nextState, targetId, dealt, nextCharacter);
  nextState = damaged.state;
  nextCharacter = damaged.character;

  const survivor = findMonster(nextState, targetId);
  if (survivor && survivor.instance.hp.current > 0) {
    const monsterDef = getMonster(survivor.instance.defId);
    const conMod = abilityModifier(monsterDef.abilityScores.con ?? 10);
    const resoluteWill = (survivor.instance.legendaryResistances ?? 0) > 0;
    const save = roller.d20(resoluteWill ? 'advantage' : 'normal', conMod);
    const resisted = save.total >= dc;

    nextState = appendLog(nextState, {
      id: nextLogId(nextState),
      kind: 'roll',
      text: t('combat.log.ninthBindRoll', {
        name: survivor.instance.displayName,
        resolute: resoluteWill ? t('combat.f.resoluteAdv') : '',
        mod: `${conMod >= 0 ? '+' : ''}${conMod}`,
        total: save.total,
        dc,
        result: resisted ? t('combat.f.resists') : t('combat.f.fails'),
      }),
    });

    if (!resisted) {
      nextState = appendLog(
        {
          ...nextState,
          combatants: nextState.combatants.map((c) => {
            if (c.kind !== 'monster' || c.id !== targetId) return c;
            const cond = {
              name: 'paralyzed' as const,
              duration: { kind: 'rounds' as const, value: 2 },
              saveDC: dc,
              saveAbility: 'con' as const,
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
          text: t('combat.log.ninthBindParalyze', { name: survivor.instance.displayName }),
        },
      );
    }
  }

  nextCharacter = markActionUsed(nextCharacter);
  const ended = evaluateCombatEndFull(nextState, nextCharacter);
  return { state: ended.state, character: ended.character, cast: true };
}
