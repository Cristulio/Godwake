import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacter, STANDARD_ARRAY } from '../character/initialize';
import { createCombat, _resetMonsterInstanceCounter } from './createCombat';
import { monsterAttack } from './attack';
import { endTurn } from './turn';
import { createDiceRoller } from '../dice';
import { setActiveRoller } from '../dice';
import { getMonster } from '../../content/monsters';
import type { Character } from '../../types/character';

function makeHuman(extra: Partial<Character> = {}): Character {
  return {
    ...createCharacter({
      id: 'test-hero',
      name: 'Tester',
      raceId: 'human',
      classId: 'fighter',
      baseAbilityScores: {
        str: STANDARD_ARRAY[0],
        dex: STANDARD_ARRAY[2],
        con: STANDARD_ARRAY[1],
        int: STANDARD_ARRAY[5],
        wis: STANDARD_ARRAY[3],
        cha: STANDARD_ARRAY[4],
      },
      skillProficiencies: ['athletics', 'perception'],
    }),
    inventory: [{ itemId: 'longsword' }],
    equipped: { mainHand: { itemId: 'longsword' }, offHand: null, armor: null },
    ...extra,
  };
}

describe('Hold Person — Magistrate boss mechanic', () => {
  beforeEach(() => {
    _resetMonsterInstanceCounter();
    // turn.ts uses getActiveRoller() for end-of-turn saves; arm it deterministically.
    setActiveRoller('hold-person-test-seed');
  });

  it('Magistrate opens with paralyze action before attacking', () => {
    const magistrate = getMonster('athkatla-magistrate');
    expect(magistrate.actions[0].kind).toBe('paralyze');
    const hero = makeHuman();
    const roller = createDiceRoller(1);
    const state = createCombat({ roller, character: hero, monsters: [{ def: magistrate }] });
    const monsterId = state.combatants.find((c) => c.kind === 'monster')!.id;
    const after = monsterAttack({ roller, character: hero, state }, monsterId);
    // First turn must be a save line, not a damage line.
    const lastTwo = after.log.slice(-2).map((l) => l.text).join(' || ');
    expect(lastTwo).toMatch(/Hold Person/);
    expect(lastTwo).toMatch(/save/);
  });

  it('failed save applies paralyzed condition to the player', () => {
    const magistrate = getMonster('athkatla-magistrate');
    // A WIS-3 hero will fail the DC14 save on basically any d20.
    const hero = makeHuman({ baseAbilityScores: {
      str: 14, dex: 12, con: 13, int: 10, wis: 8, cha: 10,
    } });
    const roller = createDiceRoller(2);
    const state = createCombat({ roller, character: hero, monsters: [{ def: magistrate }] });
    const monsterId = state.combatants.find((c) => c.kind === 'monster')!.id;
    monsterAttack({ roller, character: hero, state }, monsterId);
    const paralyzed = hero.conditions.find((c) => c.name === 'paralyzed');
    // The seed and the score combination should land on a fail. If a future
    // test flake hits here, swap the seed — the mechanic is the assertion.
    expect(paralyzed).toBeDefined();
    expect(paralyzed!.saveDC).toBe(14);
    expect(paralyzed!.saveAbility).toBe('wis');
  });

  it('attacker gains advantage when attacking a paralyzed player', () => {
    const magistrate = getMonster('athkatla-magistrate');
    const hero = makeHuman();
    // Pre-paralyze the hero so the second turn rolls Mind Spike.
    hero.conditions = [{
      name: 'paralyzed',
      duration: { kind: 'rounds', value: 3 },
      saveDC: 14,
      saveAbility: 'wis',
    }];
    const roller = createDiceRoller(5);
    const state = createCombat({ roller, character: hero, monsters: [{ def: magistrate }] });
    const monsterId = state.combatants.find((c) => c.kind === 'monster')!.id;
    const after = monsterAttack({ roller, character: hero, state }, monsterId);
    const attackLine = after.log.find((l) => l.text.includes('Mind Spike'));
    expect(attackLine).toBeDefined();
    expect(attackLine!.text).toContain('advantage');
  });

  it('paralyzed player turn fails save and locks action economy', () => {
    const magistrate = getMonster('athkatla-magistrate');
    const hero = makeHuman({ baseAbilityScores: {
      str: 14, dex: 12, con: 13, int: 10, wis: 8, cha: 10,
    } });
    hero.conditions = [{
      name: 'paralyzed',
      duration: { kind: 'rounds', value: 3 },
      saveDC: 14,
      saveAbility: 'wis',
    }];
    const roller = createDiceRoller(9);
    let state = createCombat({ roller, character: hero, monsters: [{ def: magistrate }] });
    // Advance until it's the player's turn — rolled initiative order may
    // place the monster first or the player first depending on the d20.
    while (state.initiativeOrder[state.currentTurnIndex] !== 'player') {
      state = endTurn(state, hero);
    }
    expect(hero.actionEconomy.actionUsed).toBe(true);
    expect(hero.actionEconomy.bonusActionUsed).toBe(true);
    const lockoutLog = state.log.find((l) => l.text.includes('cannot move'));
    expect(lockoutLog).toBeDefined();
  });
});
