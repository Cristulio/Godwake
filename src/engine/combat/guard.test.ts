import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacter, STANDARD_ARRAY } from '../character/initialize';
import { createCombat, _resetMonsterInstanceCounter } from './createCombat';
import { applyDamage } from './attack';
import { endTurn } from './turn';
import { createDiceRoller } from '../dice';
import { getMonster } from '../../content/monsters';
import type { Character } from '../../types/character';

function makeFighter(extra: Partial<Character> = {}): Character {
  return {
    ...createCharacter({
      id: 'test-fighter',
      name: 'Brick',
      raceId: 'human',
      classId: 'fighter',
      baseAbilityScores: {
        str: STANDARD_ARRAY[0], // 15
        con: STANDARD_ARRAY[1], // 14
        dex: STANDARD_ARRAY[2], // 13
        wis: STANDARD_ARRAY[3], // 12
        cha: STANDARD_ARRAY[4], // 10
        int: STANDARD_ARRAY[5], // 8
      },
      skillProficiencies: ['athletics', 'perception'],
    }),
    inventory: [{ itemId: 'longsword' }],
    equipped: { mainHand: { itemId: 'longsword' }, offHand: null, armor: null },
    ...extra,
  };
}

/** Spin up a fight and apply one raw incoming hit through the damage pipeline. */
function combatFor(fighter: Character) {
  const roller = createDiceRoller(1);
  const init = createCombat({
    roller,
    character: fighter,
    monsters: [{ def: getMonster('goblin') }],
  });
  return init;
}

describe('Fighter — Guard (L1-4 first-hit cushion)', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('blunts the first incoming hit by 2 and spends the reaction at L1', () => {
    let fighter = makeFighter({ level: 1 });
    const init = combatFor(fighter);
    const state = init.state;
    fighter = init.character;
    const hpBefore = fighter.hp.current;

    const dmg = applyDamage(state, 'player', 6, fighter);
    fighter = dmg.character;

    expect(fighter.hp.current).toBe(hpBefore - 4); // 6 - 2 Guard
    expect(fighter.actionEconomy.reactionUsed).toBe(true);
    expect(dmg.state.log.find((l) => l.text.includes('Guard'))).toBeDefined();
  });

  it('still blunts at L4 (the last guarded level)', () => {
    let fighter = makeFighter({ level: 4 });
    const init = combatFor(fighter);
    fighter = init.character;
    const hpBefore = fighter.hp.current;

    const dmg = applyDamage(init.state, 'player', 6, fighter);
    fighter = dmg.character;

    expect(fighter.hp.current).toBe(hpBefore - 4);
    expect(fighter.actionEconomy.reactionUsed).toBe(true);
  });

  it('does NOT blunt at L5 — the cushion has faded (Extra Attack online)', () => {
    let fighter = makeFighter({ level: 5 });
    const init = combatFor(fighter);
    fighter = init.character;
    const hpBefore = fighter.hp.current;

    const dmg = applyDamage(init.state, 'player', 6, fighter);
    fighter = dmg.character;

    expect(fighter.hp.current).toBe(hpBefore - 6); // full damage, no Guard
    expect(fighter.actionEconomy.reactionUsed).toBe(false);
    expect(dmg.state.log.find((l) => l.text.includes('Guard'))).toBeUndefined();
  });

  it('only the FIRST hit each round is blunted — a second hit lands clean', () => {
    let fighter = makeFighter({ level: 1 });
    const init = combatFor(fighter);
    let state = init.state;
    fighter = init.character;

    let dmg = applyDamage(state, 'player', 6, fighter); // first: 6 -> 4
    state = dmg.state;
    fighter = dmg.character;
    const hpAfterFirst = fighter.hp.current;
    expect(fighter.actionEconomy.reactionUsed).toBe(true);

    dmg = applyDamage(state, 'player', 6, fighter); // second same round: full 6
    fighter = dmg.character;
    expect(fighter.hp.current).toBe(hpAfterFirst - 6);
  });

  it('refreshes when the fighter\'s turn comes back around', () => {
    let fighter = makeFighter({ level: 1 });
    const init = combatFor(fighter);
    let state = init.state;
    fighter = init.character;

    let dmg = applyDamage(state, 'player', 8, fighter); // 8 -> 6, reaction spent
    state = dmg.state;
    fighter = dmg.character;
    expect(fighter.actionEconomy.reactionUsed).toBe(true);

    // Cycle initiative back to the player so the reaction (and Guard) resets.
    for (let i = 0; i < state.turnOrder.length; i++) {
      const et = endTurn(state, fighter);
      state = et.state;
      fighter = et.character;
      if (state.turnOrder[state.currentTurnIndex] === 'player') break;
    }
    expect(state.turnOrder[state.currentTurnIndex]).toBe('player');
    expect(fighter.actionEconomy.reactionUsed).toBe(false);

    const hpBefore = fighter.hp.current;
    dmg = applyDamage(state, 'player', 6, fighter); // guarded again: 6 -> 4
    fighter = dmg.character;
    expect(fighter.hp.current).toBe(hpBefore - 4);
  });

  it('a blunted hit still bites for at least 1 (floored, never to 0)', () => {
    let fighter = makeFighter({ level: 1 });
    const init = combatFor(fighter);
    fighter = init.character;
    const hpBefore = fighter.hp.current;

    const dmg = applyDamage(init.state, 'player', 2, fighter); // 2 - 2 -> floored to 1
    fighter = dmg.character;

    expect(fighter.hp.current).toBe(hpBefore - 1);
    expect(fighter.actionEconomy.reactionUsed).toBe(true);
  });

  it('a zero-damage hit does not waste the Guard', () => {
    let fighter = makeFighter({ level: 1 });
    const init = combatFor(fighter);
    fighter = init.character;

    const dmg = applyDamage(init.state, 'player', 0, fighter);
    fighter = dmg.character;

    expect(fighter.actionEconomy.reactionUsed).toBe(false);
  });
});
