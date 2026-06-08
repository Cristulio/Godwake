import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacter, STANDARD_ARRAY } from '../character/initialize';
import { createCombat, _resetMonsterInstanceCounter } from './createCombat';
import { chooseCombatAction, applyPlannedAction, runAutoTurn } from './actionPolicy';
import { monsterAttack } from './attack/monsterAttack';
import { endTurn, isPlayerTurn } from './turn';
import { createDiceRoller, type DiceRoller } from '../dice';
import { getMonster } from '../../content/monsters';
import { isRaging } from '../character/derived';
import type { CombatState, MonsterCombatant } from '../../types/combat';
import type { Character } from '../../types/character';

function makeBarbarian(level = 2): Character {
  return {
    ...createCharacter({
      id: 'sim-barbarian',
      name: 'Cali Trava Consumer',
      raceId: 'human',
      classId: 'barbarian',
      baseAbilityScores: {
        str: STANDARD_ARRAY[0],
        dex: STANDARD_ARRAY[2],
        con: STANDARD_ARRAY[1],
        cha: STANDARD_ARRAY[3],
        wis: STANDARD_ARRAY[4],
        int: STANDARD_ARRAY[5],
      },
      skillProficiencies: ['athletics', 'intimidation'],
    }),
    level,
    inventory: [{ itemId: 'greataxe' }, { itemId: 'potion-of-healing' }],
    equipped: { mainHand: { itemId: 'greataxe' }, offHand: null, armor: null },
  };
}

function makeRanger(level = 2): Character {
  return {
    ...createCharacter({
      id: 'sim-ranger',
      name: 'Chompolario Biologo Trolo',
      raceId: 'wood-elf',
      classId: 'ranger',
      baseAbilityScores: {
        dex: STANDARD_ARRAY[0],
        con: STANDARD_ARRAY[1],
        str: STANDARD_ARRAY[2],
        wis: STANDARD_ARRAY[3],
        int: STANDARD_ARRAY[4],
        cha: STANDARD_ARRAY[5],
      },
      skillProficiencies: ['perception', 'survival'],
    }),
    level,
    inventory: [{ itemId: 'longbow' }, { itemId: 'shortsword' }, { itemId: 'potion-of-healing' }],
    equipped: { mainHand: { itemId: 'longbow' }, offHand: null, armor: { itemId: 'leather-armor' } },
  };
}

function monsterId(state: CombatState): string {
  return (state.combatants.find((c) => c.kind === 'monster') as MonsterCombatant).id;
}

/** Drive a full fight with the shared policy. Returns whether the player won. */
function runFight(roller: DiceRoller, startState: CombatState, startChar: Character): {
  win: boolean;
  state: CombatState;
  character: Character;
} {
  let state = startState;
  let character = startChar;
  for (let guard = 0; guard < 200 && state.status === 'active'; guard++) {
    if (isPlayerTurn(state)) {
      const r = runAutoTurn(roller, state, character);
      state = r.state;
      character = r.character;
      if (state.status !== 'active') break;
      const et = endTurn(state, character);
      state = et.state;
      character = et.character;
    } else {
      const ma = monsterAttack({ roller, character, state }, currentMonsterId(state));
      state = ma.state;
      character = ma.character;
      if (state.status !== 'active') break;
      const et = endTurn(state, character);
      state = et.state;
      character = et.character;
    }
  }
  return { win: state.status === 'player-victory', state, character };
}

function currentMonsterId(state: CombatState): string {
  return state.turnOrder[state.currentTurnIndex];
}

describe('Policy — Barbarian', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('opens with Rage, then declares Reckless while healthy, then attacks', () => {
    const barb = makeBarbarian(2);
    const roller = createDiceRoller(1);
    const init = createCombat({ roller, character: barb, monsters: [{ def: getMonster('goblin') }] });

    const first = chooseCombatAction(init.state, init.character);
    expect(first.kind).toBe('rage');

    const afterRage = applyPlannedAction({ roller, state: init.state, character: init.character }, first);
    expect(isRaging(afterRage.character)).toBe(true);

    const second = chooseCombatAction(afterRage.state, afterRage.character);
    expect(second.kind).toBe('reckless-attack');

    const afterReck = applyPlannedAction({ roller, state: afterRage.state, character: afterRage.character }, second);
    const third = chooseCombatAction(afterReck.state, afterReck.character);
    expect(third.kind).toBe('attack');
  });

  it('wins a basic encounter under the auto-battle policy', () => {
    let wins = 0;
    for (let seed = 1; seed <= 12; seed++) {
      _resetMonsterInstanceCounter();
      const barb = makeBarbarian(2);
      const roller = createDiceRoller(seed);
      const init = createCombat({ roller, character: barb, monsters: [{ def: getMonster('goblin') }] });
      if (runFight(roller, init.state, init.character).win) wins++;
    }
    expect(wins).toBeGreaterThan(0);
  });
});

describe('Policy — Ranger', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it("opens with Hunter's Mark on the focus target, then attacks", () => {
    const ranger = makeRanger(2);
    const roller = createDiceRoller(1);
    const init = createCombat({ roller, character: ranger, monsters: [{ def: getMonster('goblin') }] });
    const gid = monsterId(init.state);

    const first = chooseCombatAction(init.state, init.character);
    expect(first.kind).toBe('hunters-mark');
    if (first.kind === 'hunters-mark') expect(first.targetId).toBe(gid);

    const afterMark = applyPlannedAction({ roller, state: init.state, character: init.character }, first);
    expect(afterMark.state.huntersMarkTargetId).toBe(gid);

    const second = chooseCombatAction(afterMark.state, afterMark.character);
    expect(second.kind).toBe('attack');
  });

  it('wins a basic encounter under the auto-battle policy', () => {
    let wins = 0;
    for (let seed = 1; seed <= 12; seed++) {
      _resetMonsterInstanceCounter();
      const ranger = makeRanger(2);
      const roller = createDiceRoller(seed);
      const init = createCombat({ roller, character: ranger, monsters: [{ def: getMonster('goblin') }] });
      if (runFight(roller, init.state, init.character).win) wins++;
    }
    expect(wins).toBeGreaterThan(0);
  });
});
