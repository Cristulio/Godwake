import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createCharacter } from '../character/initialize';
import { createCombat, _resetMonsterInstanceCounter } from './createCombat';
import { monsterAttack, applyDamage } from './attack';
import { createDiceRoller } from '../dice';
import { _setTestMonster, _clearTestMonsters } from '../../content/monsters';
import { MonsterSchema, type Monster } from '../../schemas/monster';
import type { Character } from '../../types/character';
import type { CombatState, MonsterCombatant } from '../../types/combat';

/**
 * boss-framework smoke tests. Each primitive is proven end-to-end against a
 * test-only fixture registered in the monster registry (the engine re-derives a
 * monster's canonical def by id, so the fixture must be resolvable). No real
 * boss is touched — per-boss authoring lands in the content wave.
 */

function fighter(hp = 200): Character {
  const base: Character = {
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
  // Cushion HP so a multi-action boss's two swings never end the fight before we
  // can read the action count.
  return { ...base, hp: { current: hp, max: hp, temp: 0 } };
}

function testMonster(overrides: Record<string, unknown>): Monster {
  return MonsterSchema.parse({
    id: 'test-monster',
    name: 'Test Construct',
    cr: '5',
    size: 'large',
    creatureType: 'construct (test)',
    ac: 8, // low so the fighter's swings (and the boss's) resolve predictably
    maxHp: 200,
    speed: 30,
    abilityScores: { str: 16, dex: 10, con: 16, int: 10, wis: 10, cha: 10 },
    passivePerception: 10,
    actions: [
      { kind: 'attack', name: 'Slam', attackBonus: 4, damage: '1d4', damageType: 'bludgeoning' },
    ],
    ...overrides,
  });
}

function primary(state: CombatState): MonsterCombatant {
  return state.combatants.find((c): c is MonsterCombatant => c.kind === 'monster')!;
}

function instanceById(state: CombatState, id: string): MonsterCombatant {
  return state.combatants.find((c): c is MonsterCombatant => c.kind === 'monster' && c.id === id)!;
}

/** Drop a monster instance to an exact current HP without touching anything else. */
function setHp(state: CombatState, id: string, current: number): CombatState {
  return {
    ...state,
    combatants: state.combatants.map((c) =>
      c.kind === 'monster' && c.id === id
        ? { ...c, instance: { ...c.instance, hp: { ...c.instance.hp, current } } }
        : c,
    ),
  };
}

/** Inject a condition onto a monster instance (e.g. paralyzed) for control tests. */
function addCondition(state: CombatState, id: string, name: 'paralyzed'): CombatState {
  return {
    ...state,
    combatants: state.combatants.map((c) =>
      c.kind === 'monster' && c.id === id
        ? {
            ...c,
            instance: {
              ...c.instance,
              conditions: [
                ...c.instance.conditions,
                { name, duration: { kind: 'rounds' as const, value: 2 } },
              ],
            },
          }
        : c,
    ),
  };
}

describe('boss-framework', () => {
  beforeEach(() => _resetMonsterInstanceCounter());
  afterEach(() => _clearTestMonsters());

  describe('multi-action turns', () => {
    it('resolves actionsPerTurn actions in one turn (2 → two attacks)', () => {
      const def = testMonster({ id: 'test-twin', actionsPerTurn: 2 });
      _setTestMonster(def);
      const roller = createDiceRoller(7);
      const init = createCombat({ character: fighter(), monsters: [{ def }] });
      const id = primary(init.state).id;
      const before = init.state.attackEventCounter;

      const r = monsterAttack({ roller, character: init.character, state: init.state }, id);
      expect(r.state.attackEventCounter - before).toBe(2);
    });

    it('a plain monster still takes exactly one action (parity)', () => {
      const def = testMonster({ id: 'test-plain' });
      _setTestMonster(def);
      const roller = createDiceRoller(7);
      const init = createCombat({ character: fighter(), monsters: [{ def }] });
      const id = primary(init.state).id;
      const before = init.state.attackEventCounter;

      const r = monsterAttack({ roller, character: init.character, state: init.state }, id);
      expect(r.state.attackEventCounter - before).toBe(1);
    });
  });

  describe('HP phases', () => {
    function phaseBoss(): Monster {
      return testMonster({
        id: 'test-phase',
        maxHp: 100,
        phases: [
          {
            atHpPctBelow: 50,
            name: 'Unbound',
            actionsPerTurn: 2,
            bonusDamage: 4,
          },
        ],
      });
    }

    it('does not fire while above the HP threshold', () => {
      _setTestMonster(phaseBoss());
      const roller = createDiceRoller(7);
      const init = createCombat({ character: fighter(), monsters: [{ def: phaseBoss() }] });
      const id = primary(init.state).id;
      const before = init.state.attackEventCounter;

      const r = monsterAttack({ roller, character: init.character, state: init.state }, id);
      // Full HP → still a single action, no phase log/state.
      expect(r.state.attackEventCounter - before).toBe(1);
      expect(r.state.log.some((l) => /Unbound/.test(l.text))).toBe(false);
      expect(instanceById(r.state, id).instance.phasesEntered ?? []).toEqual([]);
    });

    it('fires once at its threshold and changes behaviour (gains a 2nd action + enrage)', () => {
      _setTestMonster(phaseBoss());
      const roller = createDiceRoller(7);
      const init = createCombat({ character: fighter(), monsters: [{ def: phaseBoss() }] });
      const id = primary(init.state).id;

      const bloodied = setHp(init.state, id, 40); // 40% of 100 → below 50
      const before = bloodied.attackEventCounter;
      const r = monsterAttack({ roller, character: init.character, state: bloodied }, id);

      // Phase entered exactly once, with its enrage/AP changes applied.
      expect(r.state.log.some((l) => /Unbound/.test(l.text))).toBe(true);
      const inst = instanceById(r.state, id).instance;
      expect(inst.phasesEntered).toEqual([0]);
      expect(inst.phaseDamageBonus).toBe(4);
      // The newly-granted second action fires the SAME turn the phase opens.
      expect(r.state.attackEventCounter - before).toBe(2);

      // A second bloodied turn does NOT re-enter the phase (one-time), but keeps
      // the two-action cadence.
      const before2 = r.state.attackEventCounter;
      const logLen = r.state.log.length;
      const r2 = monsterAttack({ roller, character: r.character, state: r.state }, id);
      expect(r2.state.log.slice(logLen).some((l) => /Unbound/.test(l.text))).toBe(false);
      expect(r2.state.attackEventCounter - before2).toBe(2);
    });
  });

  describe('telegraphed wind-up specials', () => {
    function windupBoss(): Monster {
      return testMonster({
        id: 'test-windup',
        actions: [
          {
            kind: 'attack',
            name: 'Molten Breath',
            attackBonus: 6,
            damage: '4d10',
            damageType: 'fire',
            telegraph: { chargeText: 'The construct inhales, gathering a molten breath.' },
          },
        ],
      });
    }

    it('charges on turn N (no hit), then resolves on turn N+1', () => {
      _setTestMonster(windupBoss());
      const roller = createDiceRoller(11);
      const init = createCombat({ character: fighter(), monsters: [{ def: windupBoss() }] });
      const id = primary(init.state).id;

      // Turn N: the special charges — no attack roll, a pending marker is parked.
      const beforeCharge = init.state.attackEventCounter;
      const charged = monsterAttack({ roller, character: init.character, state: init.state }, id);
      expect(charged.state.attackEventCounter - beforeCharge).toBe(0);
      expect(charged.state.log.some((l) => /molten breath/i.test(l.text))).toBe(true);
      expect(instanceById(charged.state, id).instance.pendingTelegraph?.actionName).toBe('Molten Breath');

      // Turn N+1: the charge resolves — one real attack lands, pending cleared.
      const beforeResolve = charged.state.attackEventCounter;
      const resolved = monsterAttack({ roller, character: charged.character, state: charged.state }, id);
      expect(resolved.state.attackEventCounter - beforeResolve).toBe(1);
      expect(resolved.state.log.some((l) => /unleashes the charged Molten Breath/.test(l.text))).toBe(true);
      expect(instanceById(resolved.state, id).instance.pendingTelegraph).toBeUndefined();
    });

    it('is cancelled if the boss is paralyzed before it resolves', () => {
      _setTestMonster(windupBoss());
      const roller = createDiceRoller(11);
      const init = createCombat({ character: fighter(), monsters: [{ def: windupBoss() }] });
      const id = primary(init.state).id;

      const charged = monsterAttack({ roller, character: init.character, state: init.state }, id);
      expect(instanceById(charged.state, id).instance.pendingTelegraph).toBeDefined();

      // Lock the boss down before its next turn — the charge must fizzle, uncast.
      const held = addCondition(charged.state, id, 'paralyzed');
      const before = held.attackEventCounter;
      const r = monsterAttack({ roller, character: charged.character, state: held }, id);
      expect(r.state.attackEventCounter - before).toBe(0); // never lands
      expect(r.state.log.some((l) => /collapses, uncast/.test(l.text))).toBe(true);
      expect(instanceById(r.state, id).instance.pendingTelegraph).toBeUndefined();
    });
  });

  describe('condition gate (invulnerability until the add dies)', () => {
    function gatedBoss(): Monster {
      return testMonster({
        id: 'test-gated',
        maxHp: 200,
        gate: { whileAddAlive: 'test-heart', damageTakenPct: 0, wardLabel: 'destroy the heart' },
      });
    }
    function heart(): Monster {
      return testMonster({ id: 'test-heart', maxHp: 20, size: 'small' });
    }

    it('negates damage while the linked add lives, then takes full damage once it dies', () => {
      _setTestMonster(gatedBoss());
      _setTestMonster(heart());
      const init = createCombat({
        character: fighter(),
        monsters: [{ def: gatedBoss() }, { def: heart() }],
      });
      const bossId = primary(init.state).id;
      const heartId = init.state.combatants.find(
        (c): c is MonsterCombatant => c.kind === 'monster' && c.instance.defId === 'test-heart',
      )!.id;

      // Warded: a big blow on the boss does nothing while the heart beats.
      const warded = applyDamage(init.state, bossId, 60, init.character);
      expect(instanceById(warded.state, bossId).instance.hp.current).toBe(200);
      expect(warded.state.log.some((l) => /wards hold|destroy the heart/i.test(l.text))).toBe(true);

      // Destroy the heart — the gate lifts.
      const heartDead = applyDamage(warded.state, heartId, 60, warded.character);
      expect(instanceById(heartDead.state, heartId).instance.hp.current).toBe(0);

      // Now the boss takes damage in full.
      const landed = applyDamage(heartDead.state, bossId, 60, heartDead.character);
      expect(instanceById(landed.state, bossId).instance.hp.current).toBe(140);
    });
  });
});
