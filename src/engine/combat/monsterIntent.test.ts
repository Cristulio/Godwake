import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacter } from '../character/initialize';
import { createCombat, _resetMonsterInstanceCounter } from './createCombat';
import { monsterAttack, refreshMonsterIntents } from './attack';
import { endTurn } from './turn';
import { applyParalyze } from './holdPerson';
import { createDiceRoller, setActiveRoller } from '../dice';
import { getMonster as getDef } from '../../content/monsters';
import type { Character } from '../../types/character';
import type { CombatState, MonsterCombatant } from '../../types/combat';

function makeFighter(): Character {
  return {
    ...createCharacter({
      id: 'tele-f',
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

function monster(state: CombatState, defId: string): MonsterCombatant {
  return state.combatants.find(
    (c): c is MonsterCombatant => c.kind === 'monster' && c.instance.defId === defId,
  )!;
}

describe('enemy-intent telegraph', () => {
  beforeEach(() => {
    _resetMonsterInstanceCounter();
    setActiveRoller('telegraph-seed');
  });

  it('seeds a plain attacker with an attack intent carrying expected damage', () => {
    const init = createCombat({
      roller: createDiceRoller(1),
      character: makeFighter(),
      monsters: [{ def: getDef('goblin') }],
    });
    const intent = monster(init.state, 'goblin').instance.intent;
    expect(intent).toBeDefined();
    expect(intent!.kind).toBe('attack');
    expect(intent!.actionName).toBe('Scimitar');
    // Scimitar is 1d6+2 → range 3–8, matching monsterAttack's rawDamage.
    expect(intent!.damageMin).toBe(3);
    expect(intent!.damageMax).toBe(8);
  });

  it('telegraphs a multiattack with its hit count and per-hit range', () => {
    const init = createCombat({
      roller: createDiceRoller(2),
      character: makeFighter(),
      monsters: [{ def: getDef('famished-ghast') }],
    });
    const intent = monster(init.state, 'famished-ghast').instance.intent;
    expect(intent!.kind).toBe('multiattack');
    expect(intent!.hits).toBe(2);
    // Ravening Claws is 1d6+3 → per-hit range 4–9 (badge shows "2× 4–9").
    expect(intent!.damageMin).toBe(4);
    expect(intent!.damageMax).toBe(9);
  });

  it("telegraphs a boss's round-1 paralyze opener", () => {
    const init = createCombat({
      roller: createDiceRoller(3),
      character: makeFighter(),
      monsters: [{ def: getDef('athkatla-magistrate') }],
    });
    expect(monster(init.state, 'athkatla-magistrate').instance.intent!.kind).toBe('paralyze');
  });

  it('telegraphs a summoner', () => {
    const init = createCombat({
      roller: createDiceRoller(4),
      character: makeFighter(),
      monsters: [{ def: getDef('spider-broodmother') }],
    });
    expect(monster(init.state, 'spider-broodmother').instance.intent!.kind).toBe('summon');
  });

  it('never lies: the resolved action matches the telegraphed intent', () => {
    // Broodmother telegraphs "summon" → resolving it actually summons.
    const init = createCombat({
      roller: createDiceRoller(5),
      character: makeFighter(),
      monsters: [{ def: getDef('spider-broodmother') }],
    });
    const bid = monster(init.state, 'spider-broodmother').id;
    expect(monster(init.state, 'spider-broodmother').instance.intent!.kind).toBe('summon');
    const before = init.state.combatants.length;
    const r = monsterAttack(
      { roller: createDiceRoller(5), character: init.character, state: init.state },
      bid,
    );
    expect(r.state.combatants.length).toBeGreaterThan(before);
  });

  it('clears intent while a monster is paralyzed (no honest move to show)', () => {
    const init = createCombat({
      roller: createDiceRoller(6),
      character: makeFighter(),
      monsters: [{ def: getDef('goblin') }],
    });
    const gid = monster(init.state, 'goblin').id;
    const held: CombatState = {
      ...init.state,
      combatants: init.state.combatants.map((c) =>
        c.id === gid && c.kind === 'monster'
          ? {
              ...c,
              instance: {
                ...c.instance,
                conditions: [
                  { name: 'paralyzed', duration: { kind: 'rounds', value: 2 } },
                ],
              },
            }
          : c,
      ),
    };
    const refreshed = refreshMonsterIntents(held, init.character);
    expect(monster(refreshed, 'goblin').instance.intent).toBeUndefined();
  });

  it('re-plans intent across the player turn when the situation changes', () => {
    // A self-healer at full HP telegraphs an attack; once bloodied at the start
    // of the player's turn it telegraphs the heal instead.
    let state = createCombat({
      roller: createDiceRoller(7),
      character: makeFighter(),
      monsters: [{ def: getDef('sphere-aberration') }],
    }).state;
    const sid = monster(state, 'sphere-aberration').id;
    expect(monster(state, 'sphere-aberration').instance.intent!.kind).not.toBe('sustain-heal');
    // Wound it below half, then run the turn around to the player.
    state = {
      ...state,
      combatants: state.combatants.map((c) =>
        c.id === sid && c.kind === 'monster'
          ? { ...c, instance: { ...c.instance, hp: { ...c.instance.hp, current: 8 } } }
          : c,
      ),
    };
    const hero = makeFighter();
    const t1 = endTurn(state, hero); // → monster
    const t2 = endTurn(t1.state, t1.character); // → player (refresh fires)
    expect(monster(t2.state, 'sphere-aberration').instance.intent!.kind).toBe('sustain-heal');
  });

  it('a paralyze opener is dropped once the player is already held', () => {
    const init = createCombat({
      roller: createDiceRoller(8),
      character: makeFighter(),
      monsters: [{ def: getDef('athkatla-magistrate') }],
    });
    // Round 1, player free → the opener is telegraphed.
    expect(monster(init.state, 'athkatla-magistrate').instance.intent!.kind).toBe('paralyze');
    // Player now held → re-planning drops the opener for the attack it will
    // actually resolve (never a paralyze it won't cast).
    const held = applyParalyze(init.character, {
      rounds: 3,
      saveDC: 14,
      saveAbility: 'wis',
      source: 'test',
    });
    const refreshed = refreshMonsterIntents(init.state, held);
    expect(monster(refreshed, 'athkatla-magistrate').instance.intent!.kind).toBe('attack');
  });
});
