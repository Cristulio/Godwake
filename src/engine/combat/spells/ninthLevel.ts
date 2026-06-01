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
  spellSaveDC,
} from './helpers';

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
    text: `${nextCharacter.name} sheds the limits of flesh and blazes as something greater — ${APOTHEOSIS_TEMP_HP} temp HP, +${APOTHEOSIS_AC_BONUS} AC, and every strike biting deeper for ${APOTHEOSIS_ROUNDS} rounds.`,
  });
  nextState = attachSpellEffect(nextState, 'mage-armor', 'player');
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
  const dealt = roll.total + intMod + spellDamageBonus(nextCharacter);
  const dc = spellSaveDC(nextCharacter);

  let nextState: CombatState = appendLog(state, {
    id: nextLogId(state),
    kind: 'roll',
    text: `${nextCharacter.name} speaks ${target.instance.displayName} half-out of the world — ${dealt} necrotic as its form buckles.`,
  });
  nextState = attachSpellEffect(nextState, 'hold-person', 'player', targetId);
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
      text: `${survivor.instance.displayName} CON save vs the binding${resoluteWill ? ' (resolute will — advantage)' : ''}: d20${conMod >= 0 ? '+' : ''}${conMod} = ${save.total} vs DC ${dc} — ${resisted ? 'resists' : 'fails'}.`,
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
          text: `${survivor.instance.displayName} is remade into something helpless — paralyzed for 2 rounds.`,
        },
      );
    }
  }

  nextCharacter = markActionUsed(nextCharacter);
  const ended = evaluateCombatEndFull(nextState, nextCharacter);
  return { state: ended.state, character: ended.character, cast: true };
}
