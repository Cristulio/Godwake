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
  spellElement,
  spellSaveDC,
} from './helpers';
import { scaleSpellDamage } from './scaling';

export function castFireball(ctx: CastSpellContext): CastResult {
  const { character, state, roller } = ctx;
  let nextCharacter: Character = consumeSlot(character, 3);

  const aliveMonsters = state.combatants.filter(
    (c) => c.kind === 'monster' && c.instance.hp.current > 0,
  ) as MonsterCombatant[];

  const evoker = characterHasMechanic(nextCharacter, 'sculpt-spells');
  const dice = evoker ? 9 : 8;
  const damageRoll = roller.roll({ count: dice, die: 6, modifier: 0 });
  const fullDmg = scaleSpellDamage(damageRoll.total, nextCharacter, 3);
  const dc = spellSaveDC(nextCharacter);

  let nextState: CombatState = appendLog(state, {
    id: nextLogId(state),
    kind: 'roll',
    text: `${nextCharacter.name} flicks an ember — it blooms into a roar of flame. ${damageRoll.rolls.join('+')} = ${fullDmg} fire${evoker ? ' (Sculpt Spells)' : ''}. DEX save DC ${dc} for half; failures ignite.`,
  });

  nextState = attachSpellEffect(nextState, 'spell-burst', 'player', aliveMonsters[0]?.id, spellElement(ctx.spellId));

  const failedIds = new Set<string>();

  for (const m of aliveMonsters) {
    const monsterDef = getMonster(m.instance.defId);
    const dexMod = abilityModifier(monsterDef.abilityScores.dex ?? 10);
    const save = roller.d20('normal', dexMod);
    const success = save.total >= dc;
    const dmg = success ? Math.floor(fullDmg / 2) : fullDmg;
    if (!success) failedIds.add(m.id);

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
      text: `${m.instance.displayName} DEX save: d20${dexMod >= 0 ? '+' : ''}${dexMod} = ${save.total} vs DC ${dc} — ${success ? 'success (half)' : 'fail (full, ignited)'}.`,
    });
    const damaged = applyDamage(nextState, m.id, dmg, nextCharacter);
    nextState = damaged.state;
    nextCharacter = damaged.character;
    nextState = appendLog(nextState, {
      id: nextLogId(nextState),
      kind: 'damage',
      text: `${m.instance.displayName} takes ${dmg} fire.`,
    });
  }

  // Ignite survivors that failed their save — burn for 1d6 fire at start of player's next turn.
  const igniteSurvivors = nextState.combatants.filter(
    (c): c is MonsterCombatant =>
      c.kind === 'monster' && failedIds.has(c.id) && c.instance.hp.current > 0,
  );
  if (igniteSurvivors.length > 0) {
    const igniteDie = roller.roll({ count: 1, die: 6, modifier: 0 });
    const igniteDmg = igniteDie.total;
    nextState = {
      ...nextState,
      combatants: nextState.combatants.map((c) => {
        if (c.kind !== 'monster' || !failedIds.has(c.id) || c.instance.hp.current <= 0) return c;
        return { ...c, instance: { ...c.instance, burnDamagePerTurn: igniteDmg, burnTurnsRemaining: 1 } };
      }),
    };
    const names = igniteSurvivors.map((m) => m.instance.displayName).join(', ');
    nextState = appendLog(nextState, {
      id: nextLogId(nextState),
      kind: 'system',
      text: `${names} ignite${igniteSurvivors.length === 1 ? 's' : ''} — burning for ${igniteDmg} fire next turn.`,
    });
  }

  nextCharacter = markActionUsed(nextCharacter);
  const ended = evaluateCombatEndFull(nextState, nextCharacter);
  return { state: ended.state, character: ended.character, cast: true };
}
