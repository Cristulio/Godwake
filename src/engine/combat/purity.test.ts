/**
 * Internal-purity regression guards. Each engine action MUST NOT mutate the
 * `character` it receives — instead it threads a local `nextCharacter` and
 * returns the fresh reference via CombatActionResult / CastResult / DamageResult.
 *
 * Snapshot strategy: JSON.stringify the input character before the call and
 * compare to JSON.stringify after. Any in-place write into a tracked field
 * would break the snapshot equality.
 *
 * These tests fail on the pre-refactor baseline (where engines mutated
 * `ctx.character` in place) and pass after the refactor.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacter, STANDARD_ARRAY } from '../character/initialize';
import { createCombat, _resetMonsterInstanceCounter } from './createCombat';
import { applyDamage, playerAttack, monsterAttack } from './attack';
import { useConsumable } from './useItem';
import { useCunningAction } from './cunningAction';
import { useActionSurge } from './actionSurge';
import { castSpell } from './spells';
import { applyParalyze } from './holdPerson';
import { createDiceRoller } from '../dice';
import { getMonster } from '../../content/monsters';
import { applyLevelUp } from '../character/leveling';
import type { Character } from '../../types/character';

function makeFighter(): Character {
  return {
    ...createCharacter({
      id: 'pure-fighter',
      name: 'Anvil',
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
    inventory: [{ itemId: 'longsword' }, { itemId: 'potion-of-healing' }],
    equipped: { mainHand: { itemId: 'longsword' }, offHand: null, armor: null },
  };
}

function makeRogue(): Character {
  return {
    ...createCharacter({
      id: 'pure-rogue',
      name: 'Whisper',
      raceId: 'human',
      classId: 'rogue',
      baseAbilityScores: {
        str: STANDARD_ARRAY[5],
        dex: STANDARD_ARRAY[0],
        con: STANDARD_ARRAY[1],
        int: STANDARD_ARRAY[2],
        wis: STANDARD_ARRAY[3],
        cha: STANDARD_ARRAY[4],
      },
      skillProficiencies: ['stealth', 'sleight-of-hand'],
    }),
    inventory: [{ itemId: 'dagger' }],
    equipped: { mainHand: { itemId: 'dagger' }, offHand: null, armor: null },
  };
}

function makeWizard(): Character {
  return {
    ...createCharacter({
      id: 'pure-wizard',
      name: 'Echo',
      raceId: 'human',
      classId: 'wizard',
      baseAbilityScores: {
        str: STANDARD_ARRAY[5],
        dex: STANDARD_ARRAY[2],
        con: STANDARD_ARRAY[1],
        int: STANDARD_ARRAY[0],
        wis: STANDARD_ARRAY[3],
        cha: STANDARD_ARRAY[4],
      },
      skillProficiencies: ['arcana', 'history'],
    }),
    inventory: [{ itemId: 'dagger' }],
    equipped: { mainHand: { itemId: 'dagger' }, offHand: null, armor: null },
  };
}

function snapshot(c: Character): string {
  return JSON.stringify(c);
}

describe('engine internal purity — character is never mutated in place', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('createCombat does not mutate the input character (Rogue)', () => {
    const goblin = getMonster('goblin');
    const rogue = makeRogue();
    const before = snapshot(rogue);
    createCombat({ roller: createDiceRoller(1), character: rogue, monsters: [{ def: goblin }] });
    expect(snapshot(rogue)).toBe(before);
  });

  it('createCombat does not mutate the input character (Wizard mage-armor branch)', () => {
    const goblin = getMonster('goblin');
    const wizard = makeWizard();
    const before = snapshot(wizard);
    createCombat({ roller: createDiceRoller(2), character: wizard, monsters: [{ def: goblin }] });
    expect(snapshot(wizard)).toBe(before);
  });

  it('playerAttack does not mutate the input character', () => {
    const goblin = getMonster('goblin');
    const fighter = makeFighter();
    const init = createCombat({
      roller: createDiceRoller(3),
      character: fighter,
      monsters: [{ def: goblin }],
    });
    const character = init.character;
    const before = snapshot(character);
    const goblinId = init.state.combatants.find((c) => c.kind === 'monster')!.id;
    playerAttack(
      { roller: createDiceRoller(3), character, state: init.state },
      goblinId,
      'longsword',
    );
    expect(snapshot(character)).toBe(before);
  });

  it('monsterAttack does not mutate the input character', () => {
    const goblin = getMonster('goblin');
    const fighter = makeFighter();
    const init = createCombat({
      roller: createDiceRoller(4),
      character: fighter,
      monsters: [{ def: goblin }],
    });
    const character = init.character;
    const before = snapshot(character);
    const goblinId = init.state.combatants.find((c) => c.kind === 'monster')!.id;
    monsterAttack(
      { roller: createDiceRoller(4), character, state: init.state },
      goblinId,
    );
    expect(snapshot(character)).toBe(before);
  });

  it('applyDamage does not mutate the input character (player target)', () => {
    const goblin = getMonster('goblin');
    const fighter = makeFighter();
    const init = createCombat({
      roller: createDiceRoller(5),
      character: fighter,
      monsters: [{ def: goblin }],
    });
    const character = init.character;
    const before = snapshot(character);
    applyDamage(init.state, 'player', 5, character);
    expect(snapshot(character)).toBe(before);
  });

  it('useCunningAction does not mutate the input character', () => {
    const goblin = getMonster('goblin');
    const rogue = makeRogue();
    const init = createCombat({
      roller: createDiceRoller(6),
      character: rogue,
      monsters: [{ def: goblin }],
    });
    const character = init.character;
    const before = snapshot(character);
    useCunningAction({ character, state: init.state, choice: 'hide' });
    expect(snapshot(character)).toBe(before);
    useCunningAction({ character, state: init.state, choice: 'dash' });
    expect(snapshot(character)).toBe(before);
    useCunningAction({ character, state: init.state, choice: 'disengage' });
    expect(snapshot(character)).toBe(before);
  });

  it('useConsumable does not mutate the input character', () => {
    const goblin = getMonster('goblin');
    let fighter = makeFighter();
    // Drop HP so the potion has something to heal.
    fighter = { ...fighter, hp: { ...fighter.hp, current: 1 } };
    const init = createCombat({
      roller: createDiceRoller(7),
      character: fighter,
      monsters: [{ def: goblin }],
    });
    const character = init.character;
    const before = snapshot(character);
    useConsumable(
      { roller: createDiceRoller(7), character, state: init.state },
      character.inventory.findIndex((r) => r.itemId === 'potion-of-healing'),
    );
    expect(snapshot(character)).toBe(before);
  });

  it('useActionSurge does not mutate the input character', () => {
    let fighter = applyLevelUp({ ...makeFighter(), xp: 300 }); // L2 unlocks Surge
    fighter = { ...fighter, actionEconomy: { ...fighter.actionEconomy, actionUsed: true } };
    const before = snapshot(fighter);
    useActionSurge({
      character: fighter,
      state: {
        combatants: [],
        turnOrder: [],
        currentTurnIndex: 0,
        round: 1,
        log: [],
        status: 'active',
        attackEventCounter: 0,
        playerHasAttacked: false,
        rerollMissesEncounterRemaining: 0,
        playerAttacksThisTurn: 0,
      },
    });
    expect(snapshot(fighter)).toBe(before);
  });

  it('castSpell (Burning Hands) does not mutate the input character', () => {
    const goblin = getMonster('goblin');
    const wizard = makeWizard();
    const init = createCombat({
      roller: createDiceRoller(8),
      character: wizard,
      monsters: [{ def: goblin }],
    });
    const character = init.character;
    const before = snapshot(character);
    castSpell({
      roller: createDiceRoller(8),
      character,
      state: init.state,
      spellId: 'burning-hands',
    });
    expect(snapshot(character)).toBe(before);
  });

  it('castSpell (Magic Missile) does not mutate the input character', () => {
    const goblin = getMonster('goblin');
    const wizard = makeWizard();
    const init = createCombat({
      roller: createDiceRoller(9),
      character: wizard,
      monsters: [{ def: goblin }],
    });
    const character = init.character;
    const before = snapshot(character);
    castSpell({
      roller: createDiceRoller(9),
      character,
      state: init.state,
      spellId: 'magic-missile',
    });
    expect(snapshot(character)).toBe(before);
  });

  it('applyParalyze does not mutate the input character', () => {
    const fighter = makeFighter();
    const before = snapshot(fighter);
    applyParalyze(fighter, {
      rounds: 3,
      saveDC: 12,
      saveAbility: 'wis',
      source: 'test',
    });
    expect(snapshot(fighter)).toBe(before);
  });
});
