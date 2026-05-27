import type { Character } from '../../../types/character';
import type { CombatState, MonsterCombatant } from '../../../types/combat';
import { characterHasMechanic } from '../../character/derived';
import { applyDamage } from '../attack';
import { appendLog } from '../log';
import {
  type CastResult,
  type CastSpellContext,
  attachSpellEffect,
  consumeSlot,
  evaluateCombatEndFull,
  markActionUsed,
  nextLogId,
  spellDamageBonus,
} from './helpers';

export function castBurningHands(ctx: CastSpellContext): CastResult {
  const { character, state, roller } = ctx;
  let nextCharacter: Character = consumeSlot(character, 1);
  // Evocation subclass: Sculpt Spells reflavor — Burning Hands burns one die hotter.
  const evoker = characterHasMechanic(nextCharacter, 'sculpt-spells');
  const dice = evoker ? 4 : 3;

  const aliveMonsters = state.combatants.filter(
    (c) => c.kind === 'monster' && c.instance.hp.current > 0,
  ) as MonsterCombatant[];

  // Primary target (the cone's anchor) takes the full roll; in our solo combat
  // the cone catches everything in front. We damage every living monster.
  const damageRoll = roller.roll({ count: dice, die: 6, modifier: 0 });
  const bonus = spellDamageBonus(nextCharacter);
  const dmg = damageRoll.total + bonus;

  let nextState: CombatState = appendLog(state, {
    id: nextLogId(state),
    kind: 'roll',
    text: `${nextCharacter.name} hurls a cone of flame. ${damageRoll.rolls.join('+')}${bonus > 0 ? `+${bonus}` : ''} = ${dmg} fire${evoker ? ' (Sculpt Spells)' : ''}.`,
  });

  nextState = attachSpellEffect(
    nextState,
    'burning-hands',
    'player',
    aliveMonsters[0]?.id,
  );

  for (const m of aliveMonsters) {
    nextState = {
      ...nextState,
      combatants: nextState.combatants.map((c) => {
        if (c.kind !== 'monster' || c.id !== m.id) return c;
        if (c.instance.acRevealed) return c;
        return { ...c, instance: { ...c.instance, acRevealed: true } };
      }),
    };
    const damaged = applyDamage(nextState, m.id, dmg, nextCharacter);
    nextState = damaged.state;
    nextCharacter = damaged.character;
    nextState = appendLog(nextState, {
      id: nextLogId(nextState),
      kind: 'damage',
      text: `${m.instance.displayName} takes ${dmg} fire.`,
    });
  }

  nextCharacter = markActionUsed(nextCharacter);
  const ended = evaluateCombatEndFull(nextState, nextCharacter);
  return { state: ended.state, character: ended.character, cast: true };
}
