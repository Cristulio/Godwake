import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacter } from '../character/initialize';
import { createCombat, _resetMonsterInstanceCounter } from './createCombat';
import { monsterAttack } from './attack';
import { createDiceRoller } from '../dice';
import { getMonster as getDef } from '../../content/monsters';
import type { Character } from '../../types/character';
import type { CombatState, MonsterCombatant } from '../../types/combat';

function makeFighter(): Character {
  return {
    ...createCharacter({
      id: 'f1',
      name: 'Brick',
      raceId: 'human',
      classId: 'fighter',
      baseAbilityScores: { str: 15, dex: 13, con: 14, int: 8, wis: 10, cha: 12 },
      skillProficiencies: ['athletics', 'perception'],
    }),
    inventory: [{ itemId: 'longsword' }],
    equipped: { mainHand: { itemId: 'longsword' }, offHand: null, armor: null },
  };
}

function primary(state: CombatState): MonsterCombatant {
  return state.combatants.find((c): c is MonsterCombatant => c.kind === 'monster')!;
}

/** Drop the primary foe to a quarter of max HP (bloodied) without other changes. */
function bloody(state: CombatState, id: string): CombatState {
  return {
    ...state,
    combatants: state.combatants.map((c) =>
      c.kind === 'monster' && c.id === id
        ? { ...c, instance: { ...c.instance, hp: { ...c.instance.hp, current: Math.max(1, Math.floor(c.instance.hp.max / 4)) } } }
        : c,
    ),
  };
}

const SECOND_WIND = /furious second wind/;

describe('ascension boss extra-phase second wind', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('a bloodied boss at Asc 3 fires one extra action on its turn', () => {
    const roller = createDiceRoller(7);
    const init = createCombat({
      character: makeFighter(),
      monsters: [{ def: getDef('goblin') }],
      ascension: 3,
      isBoss: true,
    });
    const id = primary(init.state).id;
    expect(primary(init.state).instance.bossExtraPhaseArmed).toBe(true);

    const s = bloody(init.state, id);
    const before = s.attackEventCounter;
    const r = monsterAttack({ roller, character: init.character, state: s }, id);

    expect(r.state.attackEventCounter - before).toBe(2);
    expect(r.state.log.some((l) => SECOND_WIND.test(l.text))).toBe(true);
    expect(primary(r.state).instance.bossExtraPhaseArmed).toBe(false);
  });

  it('fires only once per fight — the next bloodied turn is a single action', () => {
    const roller = createDiceRoller(7);
    const init = createCombat({
      character: makeFighter(),
      monsters: [{ def: getDef('goblin') }],
      ascension: 3,
      isBoss: true,
    });
    const id = primary(init.state).id;
    const first = monsterAttack({ roller, character: init.character, state: bloody(init.state, id) }, id);

    // Still bloodied, but the wind is spent — a normal single action follows.
    const s2 = bloody(first.state, id);
    const before = s2.attackEventCounter;
    const logBefore = s2.log.length;
    const r2 = monsterAttack({ roller, character: first.character, state: s2 }, id);
    expect(r2.state.attackEventCounter - before).toBe(1);
    expect(r2.state.log.slice(logBefore).some((l) => SECOND_WIND.test(l.text))).toBe(false);
  });

  it('does not fire while the boss is above half HP', () => {
    const roller = createDiceRoller(7);
    const init = createCombat({
      character: makeFighter(),
      monsters: [{ def: getDef('goblin') }],
      ascension: 3,
      isBoss: true,
    });
    const id = primary(init.state).id;
    const before = init.state.attackEventCounter;
    const r = monsterAttack({ roller, character: init.character, state: init.state }, id);
    expect(r.state.attackEventCounter - before).toBe(1);
    expect(r.state.log.some((l) => SECOND_WIND.test(l.text))).toBe(false);
  });

  it('does not arm below Asc 3', () => {
    const roller = createDiceRoller(7);
    const init = createCombat({
      character: makeFighter(),
      monsters: [{ def: getDef('goblin') }],
      ascension: 2,
      isBoss: true,
    });
    const id = primary(init.state).id;
    expect(primary(init.state).instance.bossExtraPhaseArmed).toBeUndefined();
    const s = bloody(init.state, id);
    const before = s.attackEventCounter;
    const r = monsterAttack({ roller, character: init.character, state: s }, id);
    expect(r.state.attackEventCounter - before).toBe(1);
    expect(r.state.log.some((l) => SECOND_WIND.test(l.text))).toBe(false);
  });

  it('never arms a non-boss enemy, even at high ascension', () => {
    const roller = createDiceRoller(7);
    const init = createCombat({
      character: makeFighter(),
      monsters: [{ def: getDef('goblin') }],
      ascension: 6,
      isBoss: false,
    });
    const id = primary(init.state).id;
    expect(primary(init.state).instance.bossExtraPhaseArmed).toBeUndefined();
    const s = bloody(init.state, id);
    const before = s.attackEventCounter;
    const r = monsterAttack({ roller, character: init.character, state: s }, id);
    expect(r.state.attackEventCounter - before).toBe(1);
    expect(r.state.log.some((l) => SECOND_WIND.test(l.text))).toBe(false);
  });
});
