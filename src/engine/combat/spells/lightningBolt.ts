import type { Character } from '../../../types/character';
import type { CombatState, MonsterCombatant } from '../../../types/combat';
import { getMonster } from '../../../content/monsters';
import { abilityModifier } from '../../../types/abilities';
import { characterHasMechanic } from '../../character/derived';
import { appendLog } from '../log';
import { applyDamage } from '../attack';
import {
  type CastResult,
  type CastSpellContext,
  attachSpellEffect,
  consumeSlot,
  evaluateCombatEndFull,
  markActionUsed,
  nextLogId,
  spellSaveDC,
} from './helpers';

export function castLightningBolt(ctx: CastSpellContext): CastResult {
  const { character, state, roller } = ctx;
  let nextCharacter: Character = consumeSlot(character, 3);

  const aliveMonsters = state.combatants.filter(
    (c) => c.kind === 'monster' && c.instance.hp.current > 0,
  ) as MonsterCombatant[];

  // 6d6 base (7 for Evocation evoker) — lower burst than Fireball, but the arc
  // finds even those who dodge: a successful save still takes 1d6 lightning.
  const evoker = characterHasMechanic(nextCharacter, 'sculpt-spells');
  const dice = evoker ? 7 : 6;
  const damageRoll = roller.roll({ count: dice, die: 6, modifier: 0 });
  const fullDmg = damageRoll.total;
  const dc = spellSaveDC(nextCharacter);

  let nextState: CombatState = appendLog(state, {
    id: nextLogId(state),
    kind: 'roll',
    text: `${nextCharacter.name} hurls a white arc of lightning across the room. ${damageRoll.rolls.join('+')} = ${fullDmg} lightning${evoker ? ' (Sculpt Spells)' : ''}. DEX save DC ${dc} for half; successes still take 1d6.`,
  });

  nextState = attachSpellEffect(nextState, 'lightning-bolt', 'player', aliveMonsters[0]?.id);

  const savedIds = new Set<string>();

  for (const m of aliveMonsters) {
    const monsterDef = getMonster(m.instance.defId);
    const dexMod = abilityModifier(monsterDef.abilityScores.dex ?? 10);
    const save = roller.d20('normal', dexMod);
    const success = save.total >= dc;
    const dmg = success ? Math.floor(fullDmg / 2) : fullDmg;
    if (success) savedIds.add(m.id);

    nextState = {
      ...nextState,
      combatants: nextState.combatants.map((c) => {
        if (c.kind !== 'monster' || c.id !== m.id) return c;
        if (c.instance.acRevealed) return c;
        return { ...c, instance: { ...c.instance, acRevealed: true } };
      }),
    };
    nextState = appendLog(nextState, {
      id: nextLogId(nextState),
      kind: 'roll',
      text: `${m.instance.displayName} DEX save: d20${dexMod >= 0 ? '+' : ''}${dexMod} = ${save.total} vs DC ${dc} — ${success ? 'success (half + arc)' : 'fail (full)'}.`,
    });
    const damaged = applyDamage(nextState, m.id, dmg, nextCharacter);
    nextState = damaged.state;
    nextCharacter = damaged.character;
    nextState = appendLog(nextState, {
      id: nextLogId(nextState),
      kind: 'damage',
      text: `${m.instance.displayName} takes ${dmg} lightning.`,
    });
  }

  // Pierce: the arc clips even those who saved — 1d6 lightning, no save.
  const arcSurvivors = nextState.combatants.filter(
    (c): c is MonsterCombatant =>
      c.kind === 'monster' && savedIds.has(c.id) && c.instance.hp.current > 0,
  );
  if (arcSurvivors.length > 0) {
    const arcRoll = roller.roll({ count: 1, die: 6, modifier: 0 });
    const arcDmg = arcRoll.total;
    for (const m of arcSurvivors) {
      const pierced = applyDamage(nextState, m.id, arcDmg, nextCharacter);
      nextState = pierced.state;
      nextCharacter = pierced.character;
      nextState = appendLog(nextState, {
        id: nextLogId(nextState),
        kind: 'damage',
        text: `${m.instance.displayName} takes ${arcDmg} lightning (arc).`,
      });
    }
  }

  nextCharacter = markActionUsed(nextCharacter);
  const ended = evaluateCombatEndFull(nextState, nextCharacter);
  return { state: ended.state, character: ended.character, cast: true };
}
