import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacter, STANDARD_ARRAY } from '../../character/initialize';
import { createCombat, _resetMonsterInstanceCounter } from '../createCombat';
import { castSpell } from './dispatch';
import { chooseCombatAction } from '../actionPolicy';
import { availableWizardSpellsForLearn } from '../../character/leveling';
import { wizardSpellSlotsForLevel } from '../../character/actions';
import type { DiceRoller } from '../../dice';
import { parseDiceExpression } from '../../dice';
import type { RollResult } from '../../../types/dice';
import { getMonster } from '../../../content/monsters';
import type { Character } from '../../../types/character';
import type { CombatState, MonsterCombatant } from '../../../types/combat';

/** Two scripted queues — d20 naturals and damage-dice faces — defaulting
 *  gracefully when a queue runs dry. Mirror of the druid suite's roller. */
function makeScriptedRoller(opts: {
  d20Faces?: number[];
  damageRolls?: number[][];
}): DiceRoller {
  const d20Faces = opts.d20Faces ?? [];
  const damageRolls = opts.damageRolls ?? [];
  let di = 0;
  let ri = 0;
  const face = () => (di < d20Faces.length ? d20Faces[di++] : 10);
  return {
    d20(advantage = 'normal', modifier = 0): RollResult {
      const first = face();
      if (advantage === 'normal') {
        return {
          expression: { count: 1, die: 20, modifier },
          rolls: [first],
          modifier,
          total: first + modifier,
          natural20: first === 20,
          natural1: first === 1,
          advantage,
        };
      }
      const second = face();
      const chosen =
        advantage === 'advantage' ? Math.max(first, second) : Math.min(first, second);
      const discarded =
        advantage === 'advantage' ? Math.min(first, second) : Math.max(first, second);
      return {
        expression: { count: 1, die: 20, modifier },
        rolls: [chosen],
        modifier,
        total: chosen + modifier,
        natural20: chosen === 20,
        natural1: chosen === 1,
        advantage,
        discardedRoll: discarded,
      };
    },
    roll(expression, advantage = 'normal'): RollResult {
      const expr =
        typeof expression === 'string' ? parseDiceExpression(expression) : expression;
      const dice =
        ri < damageRolls.length
          ? damageRolls[ri++]
          : Array.from({ length: expr.count }, () => Math.max(1, Math.floor(expr.die / 2)));
      const sum = dice.reduce((a, b) => a + b, 0);
      return {
        expression: expr,
        rolls: dice,
        modifier: expr.modifier,
        total: sum + expr.modifier,
        natural20: false,
        natural1: false,
        advantage,
      };
    },
    serialize() {
      return { state: 0 };
    },
  };
}

/** A level-17 wizard who knows the given spells, with the full L17 slot table. */
function makeArchmage(spellIds: string[], level = 17): Character {
  const base = createCharacter({
    id: 'archmage',
    name: 'Veyra Ash',
    raceId: 'human',
    classId: 'wizard',
    baseAbilityScores: {
      str: STANDARD_ARRAY[5],
      dex: STANDARD_ARRAY[3],
      con: STANDARD_ARRAY[2],
      int: STANDARD_ARRAY[0],
      wis: STANDARD_ARRAY[1],
      cha: STANDARD_ARRAY[4],
    },
    skillProficiencies: ['arcana', 'history'],
  });
  return {
    ...base,
    level,
    resources: {
      ...base.resources,
      spellSlots: wizardSpellSlotsForLevel(level),
      knownSpells: [...(base.resources.knownSpells ?? []), ...spellIds],
    },
  };
}

function findMonster(state: CombatState, id?: string): MonsterCombatant {
  const monsters = state.combatants.filter(
    (c): c is MonsterCombatant => c.kind === 'monster',
  );
  return (id ? monsters.find((m) => m.id === id) : monsters[0]) as MonsterCombatant;
}

beforeEach(() => {
  _resetMonsterInstanceCounter();
});

describe('Power Word: Kill — the save-or-die capstone', () => {
  it('unmakes a rank-and-file foe outright on a failed save, however big its HP pool', () => {
    const roller = makeScriptedRoller({ d20Faces: [1] }); // the save fails
    const w = makeArchmage(['power-word-kill']);
    const init = createCombat({ character: w, monsters: [{ def: getMonster('fire-giant') }] });
    const mon = findMonster(init.state);
    expect(mon.instance.hp.current).toBe(240); // the word ignores the pool's size

    const r = castSpell({
      roller,
      character: init.character,
      state: init.state,
      spellId: 'power-word-kill',
      targetId: mon.id,
    });

    expect(r.cast).toBe(true);
    expect(r.character.resources.spellSlots?.[9]).toBe(0);
    expect(findMonster(r.state, mon.id).instance.hp.current).toBe(0);
    expect(r.state.status).toBe('player-victory');
  });

  it('deals heavy necrotic instead when the foe holds itself together (passed save)', () => {
    const roller = makeScriptedRoller({
      d20Faces: [20], // the save holds
      damageRolls: [Array(10).fill(4)], // 10d12 scripted to 40
    });
    const w = makeArchmage(['power-word-kill']);
    const init = createCombat({ character: w, monsters: [{ def: getMonster('fire-giant') }] });
    const mon = findMonster(init.state);
    const hpBefore = mon.instance.hp.current;

    const r = castSpell({
      roller,
      character: init.character,
      state: init.state,
      spellId: 'power-word-kill',
      targetId: mon.id,
    });

    expect(r.cast).toBe(true);
    const after = findMonster(r.state, mon.id);
    expect(after.instance.hp.current).toBeGreaterThan(0);
    expect(after.instance.hp.current).toBeLessThan(hpBefore);
  });

  it('kills an ELITE on a failed save — legendary resistance does not block the word', () => {
    const roller = makeScriptedRoller({ d20Faces: [1] });
    const w = makeArchmage(['power-word-kill']);
    const init = createCombat({
      character: w,
      monsters: [{ def: getMonster('fire-giant') }],
      isElite: true,
    });
    const mon = findMonster(init.state);
    expect(mon.instance.rank).toBe('elite');
    expect(mon.instance.legendaryResistances).toBe(1); // unspent — and irrelevant

    const r = castSpell({
      roller,
      character: init.character,
      state: init.state,
      spellId: 'power-word-kill',
      targetId: mon.id,
    });

    expect(findMonster(r.state, mon.id).instance.hp.current).toBe(0);
    expect(r.state.status).toBe('player-victory');
  });

  it('NEVER kills a boss — a failed save deals the big hit instead', () => {
    const roller = makeScriptedRoller({
      d20Faces: [1], // the boss's will buckles
      damageRolls: [Array(14).fill(4)], // 14d12 scripted to 56
    });
    const w = makeArchmage(['power-word-kill']);
    const init = createCombat({
      character: w,
      monsters: [{ def: getMonster('fire-giant') }],
      isBoss: true,
    });
    const mon = findMonster(init.state);
    expect(mon.instance.rank).toBe('boss');
    const hpBefore = mon.instance.hp.current;

    const r = castSpell({
      roller,
      character: init.character,
      state: init.state,
      spellId: 'power-word-kill',
      targetId: mon.id,
    });

    expect(r.cast).toBe(true);
    const after = findMonster(r.state, mon.id);
    expect(after.instance.hp.current).toBeGreaterThan(0); // it bleeds, it never dies
    expect(after.instance.hp.current).toBeLessThan(hpBefore);
    expect(r.state.status).toBe('active');
  });

  it('a boss that holds the word takes the reduced hit — smaller than the failed-save hit', () => {
    const w = makeArchmage(['power-word-kill']);
    const sameFaces = (count: number) => [Array(count).fill(4)];

    const failInit = createCombat({
      character: w,
      monsters: [{ def: getMonster('fire-giant') }],
      isBoss: true,
    });
    const failMon = findMonster(failInit.state);
    const failR = castSpell({
      roller: makeScriptedRoller({ d20Faces: [1], damageRolls: sameFaces(14) }),
      character: failInit.character,
      state: failInit.state,
      spellId: 'power-word-kill',
      targetId: failMon.id,
    });
    const failDamage =
      failMon.instance.hp.current - findMonster(failR.state, failMon.id).instance.hp.current;

    _resetMonsterInstanceCounter();
    const holdInit = createCombat({
      character: w,
      monsters: [{ def: getMonster('fire-giant') }],
      isBoss: true,
    });
    const holdMon = findMonster(holdInit.state);
    const holdR = castSpell({
      roller: makeScriptedRoller({ d20Faces: [20], damageRolls: sameFaces(7) }),
      character: holdInit.character,
      state: holdInit.state,
      spellId: 'power-word-kill',
      targetId: holdMon.id,
    });
    const holdDamage =
      holdMon.instance.hp.current - findMonster(holdR.state, holdMon.id).instance.hp.current;

    expect(failDamage).toBeGreaterThan(holdDamage);
    expect(holdDamage).toBeGreaterThan(0);
  });

  it('does nothing without a 9th-level slot', () => {
    const roller = makeScriptedRoller({ d20Faces: [1] });
    const w = makeArchmage(['power-word-kill'], 8); // L8 → no 9th-level slot
    const init = createCombat({ character: w, monsters: [{ def: getMonster('goblin') }] });
    const mon = findMonster(init.state);

    const r = castSpell({
      roller,
      character: init.character,
      state: init.state,
      spellId: 'power-word-kill',
      targetId: mon.id,
    });

    expect(r.cast).toBe(false);
    expect(findMonster(r.state, mon.id).instance.hp.current).toBe(mon.instance.hp.current);
  });

  it('arrives through the L17 capstone picker alongside the other 9th-level workings', () => {
    const w = makeArchmage([]);
    const pool = availableWizardSpellsForLearn(w, 9).map((s) => s.id);
    expect(pool).toContain('power-word-kill');
    expect(pool).toContain('shape-change'); // the existing path it mirrors
  });
});

describe('Power Word: Kill — bot policy', () => {
  /** Patch one monster's current HP on a combat state (rank/stamps untouched). */
  function withHp(state: CombatState, id: string, hp: number): CombatState {
    return {
      ...state,
      combatants: state.combatants.map((c) =>
        c.kind === 'monster' && c.id === id
          ? { ...c, instance: { ...c.instance, hp: { ...c.instance.hp, current: hp } } }
          : c,
      ),
    };
  }

  it('speaks the word at the ELITE first, even when a normal foe has more HP', () => {
    const w = makeArchmage(['power-word-kill', 'unmake']);
    const init = createCombat({
      character: w,
      monsters: [
        { def: getMonster('fire-giant'), displayName: 'Giant A' },
        { def: getMonster('fire-giant'), displayName: 'Giant B' },
      ],
      isElite: true,
    });
    const monsters = init.state.combatants.filter(
      (c): c is MonsterCombatant => c.kind === 'monster',
    );
    const elite = monsters.find((m) => m.instance.rank === 'elite') as MonsterCombatant;
    const normal = monsters.find((m) => m.instance.rank === undefined) as MonsterCombatant;
    // The normal foe is left fatter than the elite — rank must outrank HP.
    const state = withHp(init.state, elite.id, 150);

    const action = chooseCombatAction(state, init.character);

    expect(action).toEqual({ kind: 'cast', spellId: 'power-word-kill', targetId: elite.id });
    expect(normal.instance.hp.current).toBe(240);
  });

  it('never aims the word at a boss while a proper capstone nuke remains', () => {
    const w = makeArchmage(['power-word-kill', 'wither']);
    const init = createCombat({
      character: w,
      monsters: [{ def: getMonster('fire-giant') }],
      isBoss: true,
    });
    const boss = findMonster(init.state);

    const action = chooseCombatAction(init.state, init.character);

    expect(action).toEqual({ kind: 'cast', spellId: 'wither', targetId: boss.id });
  });

  it('falls back to the word on a boss once the deeper nukes are spent', () => {
    const w = makeArchmage(['power-word-kill', 'wither']);
    const spent: Character = {
      ...w,
      resources: {
        ...w.resources,
        spellSlots: { ...wizardSpellSlotsForLevel(17), 8: 0 },
      },
    };
    const init = createCombat({
      character: spent,
      monsters: [{ def: getMonster('fire-giant') }],
      isBoss: true,
    });
    const boss = findMonster(init.state);

    const action = chooseCombatAction(init.state, init.character);

    expect(action).toEqual({ kind: 'cast', spellId: 'power-word-kill', targetId: boss.id });
  });

  it('holds the word below the worth threshold — trash dies to lesser slots', () => {
    const w = makeArchmage(['power-word-kill']);
    const init = createCombat({ character: w, monsters: [{ def: getMonster('goblin') }] });

    const action = chooseCombatAction(init.state, init.character);

    expect(action.kind).toBe('cast');
    if (action.kind === 'cast') {
      expect(action.spellId).not.toBe('power-word-kill');
    }
  });
});
