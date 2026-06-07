import type { Character } from '../../../types/character';
import type { CombatState, MonsterCombatant } from '../../../types/combat';
import { characterHasMechanic } from '../../character/derived';
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

export function castBurningHands(ctx: CastSpellContext): CastResult {
  const { character, state, roller } = ctx;
  let nextCharacter: Character = consumeSlot(character, 1);
  // Evocation subclass: Sculpt Spells reflavor — Burning Hands burns one die hotter.
  const evoker = characterHasMechanic(nextCharacter, 'sculpt-spells');
  const dice = evoker ? 4 : 3;

  const aliveMonsters = state.combatants.filter(
    (c) => c.kind === 'monster' && c.instance.hp.current > 0,
  ) as MonsterCombatant[];

  // The cone catches everything in front; each monster rolls a DEX save for
  // half via the shared AoE path so a L1 slot no longer out-values a L3 one.
  const damageRoll = roller.roll({ count: dice, die: 6, modifier: 0 });
  const scaledDice = scaleSpellDamage(damageRoll.total, nextCharacter, 1);
  const bonus = spellDamageBonus(nextCharacter);
  const fullDmg = scaledDice + bonus;
  const dc = spellSaveDC(nextCharacter);

  let nextState: CombatState = appendLog(state, {
    id: nextLogId(state),
    kind: 'roll',
    text: t('combat.log.burningHands', {
      name: nextCharacter.name,
      rolls: damageRoll.rolls.join('+'),
      bonus: bonus > 0 ? `+${bonus}` : '',
      dmg: fullDmg,
      evoker: evoker ? t('combat.log.sculptSpells') : '',
      dc,
    }),
  });

  nextState = attachSpellEffect(
    nextState,
    'burning-hands',
    'player',
    aliveMonsters[0]?.id,
  );

  const resolved = applyAreaSaveForHalf(nextState, nextCharacter, aliveMonsters, {
    roller,
    fullDmg,
    dc,
    damageType: 'fire',
  });
  nextState = resolved.state;
  nextCharacter = resolved.character;

  nextCharacter = markActionUsed(nextCharacter);
  const ended = evaluateCombatEndFull(nextState, nextCharacter);
  return { state: ended.state, character: ended.character, cast: true };
}
