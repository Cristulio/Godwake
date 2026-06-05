import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacter } from '../../character/initialize';
import { presetCreationInput } from '../../character/defaultCharacter';
import { spellcastingMod } from '../../character/derived';
import { createCombat, _resetMonsterInstanceCounter } from '../createCombat';
import { monsterAttack, playerAttack } from '../attack';
import { endTurn } from '../turn';
import { castSpell } from './dispatch';
import { createDiceRoller, setActiveRoller, type DiceRoller } from '../../dice';
import { parseDiceExpression } from '../../dice';
import type { RollResult } from '../../../types/dice';
import { getSpell, listSpells } from '../../../content/spells';
import { getMonster } from '../../../content/monsters';
import type { Character } from '../../../types/character';
import type { CombatState, MonsterCombatant } from '../../../types/combat';

/** Two scripted queues — d20 naturals and damage-dice faces — defaulting
 *  gracefully when a queue runs dry. Mirror of the wizard-L2 suite's roller. */
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

/** A fresh druid (knows the whole nature book) with the given spell slots and an
 *  optional HP override, so a test can hand it exactly the slots it needs. */
function makeDruid(opts: {
  slots?: Record<number, number>;
  hp?: { current: number; max: number; temp: number };
}): Character {
  const base = createCharacter({ id: 'druid-1', ...presetCreationInput('druid') });
  return {
    ...base,
    hp: opts.hp ?? base.hp,
    resources: {
      ...base.resources,
      spellSlots: { ...(base.resources.spellSlots ?? {}), ...(opts.slots ?? {}) },
    },
  };
}

/** Force one monster instance's HP so damage deltas are exact and survival is
 *  guaranteed regardless of any chapter scaling in createCombat. */
function setMonsterHp(state: CombatState, hp: number): CombatState {
  return {
    ...state,
    combatants: state.combatants.map((c) =>
      c.kind === 'monster'
        ? { ...c, instance: { ...c.instance, hp: { current: hp, max: hp, temp: 0 } } }
        : c,
    ),
  };
}

function monsters(state: CombatState): MonsterCombatant[] {
  return state.combatants.filter((c): c is MonsterCombatant => c.kind === 'monster');
}

/** One full round: player -> monster, then monster -> player (back to us). No
 *  monster attack is rolled — endTurn only advances + runs start-of-turn ticks. */
function advanceRound(state: CombatState, character: Character) {
  let s = state;
  let ch = character;
  ({ state: s, character: ch } = endTurn(s, ch));
  ({ state: s, character: ch } = endTurn(s, ch));
  return { state: s, character: ch };
}

beforeEach(() => {
  _resetMonsterInstanceCounter();
  setActiveRoller('druid-signature-test-seed');
});

describe('Regrowth — the Druid heal-over-time', () => {
  it('heals on cast, then again at the start of the next two turns, then expires', () => {
    const goblin = getMonster('goblin');
    const druid = makeDruid({ slots: { 2: 2 }, hp: { current: 5, max: 100, temp: 0 } });
    const init = createCombat({ character: druid, monsters: [{ def: goblin }] });
    const mod = spellcastingMod(init.character);
    const perTurn = 4 + mod; // scripted 1d6 = 4
    const slotsBefore = init.character.resources.spellSlots?.[2] ?? 0;

    const roller = makeScriptedRoller({ damageRolls: [[4]] });
    let { state, character } = castSpell({
      roller,
      character: init.character,
      state: init.state,
      spellId: 'regrowth',
    });

    // Immediate knit + the HOT armed for two more turns.
    expect(character.hp.current).toBe(5 + perTurn);
    expect(character.resources.regrowthHealPerTurn).toBe(perTurn);
    expect(character.resources.regrowthTurnsRemaining).toBe(2);
    expect(character.resources.spellSlots?.[2]).toBe(slotsBefore - 1);
    expect(character.actionEconomy.actionUsed).toBe(true);

    // Tick 1.
    ({ state, character } = advanceRound(state, character));
    expect(character.hp.current).toBe(5 + perTurn * 2);
    expect(character.resources.regrowthTurnsRemaining).toBe(1);

    // Tick 2 (last).
    ({ state, character } = advanceRound(state, character));
    expect(character.hp.current).toBe(5 + perTurn * 3);
    expect(character.resources.regrowthTurnsRemaining).toBe(0);

    // Expired — no further healing.
    character = advanceRound(state, character).character;
    expect(character.hp.current).toBe(5 + perTurn * 3);
    expect(character.resources.regrowthTurnsRemaining).toBe(0);
  });
});

describe('Entangle — AoE root, save-or-lose-a-turn', () => {
  it('every enemy saves; failures are restrained, successes are not', () => {
    const goblin = getMonster('goblin'); // STR 8 (-1)
    const druid = makeDruid({ slots: { 2: 1 } });
    const init = createCombat({ character: druid, monsters: [{ def: goblin }, { def: goblin }] });
    const slotsBefore = init.character.resources.spellSlots?.[2] ?? 0;

    // First foe rolls a natural 1 (fails), second a natural 20 (saves).
    const roller = makeScriptedRoller({ d20Faces: [1, 20] });
    const cast = castSpell({
      roller,
      character: init.character,
      state: init.state,
      spellId: 'entangling-roots',
    });
    expect(cast.cast).toBe(true);
    expect(cast.character.resources.spellSlots?.[2]).toBe(slotsBefore - 1);
    // Bonus action, not the main action — the druid can still attack/cast this turn.
    expect(cast.character.actionEconomy.bonusActionUsed).toBe(true);
    expect(cast.character.actionEconomy.actionUsed).toBe(false);

    const [a, b] = monsters(cast.state);
    expect(a.instance.conditions.some((c) => c.name === 'restrained')).toBe(true);
    expect(b.instance.conditions.some((c) => c.name === 'restrained')).toBe(false);
  });

  it('spends the BONUS action, leaving the main action free to attack the same turn', () => {
    const goblin = getMonster('goblin');
    const druid = makeDruid({ slots: { 2: 1 } });
    const init = createCombat({ character: druid, monsters: [{ def: goblin }, { def: goblin }] });

    // Entangle (bonus action).
    const roller = makeScriptedRoller({ d20Faces: [1, 1] });
    const cast = castSpell({
      roller,
      character: init.character,
      state: init.state,
      spellId: 'entangling-roots',
    });
    expect(cast.cast).toBe(true);
    expect(cast.character.actionEconomy.bonusActionUsed).toBe(true);
    expect(cast.character.actionEconomy.actionUsed).toBe(false);

    // …then a weapon swing the SAME turn — the main action is still free.
    const targetId = monsters(cast.state).find((m) => m.instance.hp.current > 0)!.id;
    const swing = playerAttack(
      { roller: createDiceRoller(7), character: cast.character, state: cast.state },
      targetId,
      'dagger',
    );
    expect(swing.character.actionEconomy.actionUsed).toBe(true);
    expect(swing.character.actionEconomy.bonusActionUsed).toBe(true);
  });

  it('a rooted monster loses its turn and then wrenches free', () => {
    const goblin = getMonster('goblin');
    const druid = makeDruid({ slots: { 2: 1 } });
    const init = createCombat({ character: druid, monsters: [{ def: goblin }] });
    const roller = makeScriptedRoller({ d20Faces: [1] }); // the lone foe fails
    const cast = castSpell({
      roller,
      character: init.character,
      state: init.state,
      spellId: 'entangling-roots',
    });
    const rooted = monsters(cast.state)[0];
    expect(rooted.instance.conditions.some((c) => c.name === 'restrained')).toBe(true);

    const hpBefore = cast.character.hp.current;
    const after = monsterAttack(
      { roller: createDiceRoller(1), character: cast.character, state: cast.state },
      rooted.id,
    );

    // Turn lost: the foe took no swing, the player is untouched, the root released.
    expect(after.character.hp.current).toBe(hpBefore);
    const a = monsters(after.state)[0];
    expect(a.instance.actionEconomy.actionUsed).toBe(true);
    expect(a.instance.conditions.some((c) => c.name === 'restrained')).toBe(false);
    expect(after.state.log.some((l) => l.text.includes('roots'))).toBe(true);
  });
});

describe('Spirit Beast — persistent companion damage', () => {
  it('mauls on cast, then again at the start of the next two turns, then expires', () => {
    const hound = getMonster('slayer-hound');
    const druid = makeDruid({ slots: { 7: 1 } });
    const init0 = createCombat({ character: druid, monsters: [{ def: hound }] });
    const state0 = setMonsterHp(init0.state, 100);
    const slotsBefore = init0.character.resources.spellSlots?.[7] ?? 0;
    const targetId = monsters(state0)[0].id;

    const roller = makeScriptedRoller({ damageRolls: [[5, 5]] }); // 2d8 = 10
    let { state, character } = castSpell({
      roller,
      character: init0.character,
      state: state0,
      spellId: 'spirit-beast',
      targetId,
    });

    // Immediate strike + the companion armed for two more turns.
    expect(monsters(state)[0].instance.hp.current).toBe(90);
    expect(character.resources.spiritBeastDamagePerTurn).toBe(10);
    expect(character.resources.spiritBeastTurnsRemaining).toBe(2);
    expect(character.resources.spellSlots?.[7]).toBe(slotsBefore - 1);
    expect(character.actionEconomy.actionUsed).toBe(true);

    // Tick 1.
    ({ state, character } = advanceRound(state, character));
    expect(monsters(state)[0].instance.hp.current).toBe(80);
    expect(character.resources.spiritBeastTurnsRemaining).toBe(1);

    // Tick 2 (last).
    ({ state, character } = advanceRound(state, character));
    expect(monsters(state)[0].instance.hp.current).toBe(70);
    expect(character.resources.spiritBeastTurnsRemaining).toBe(0);

    // Expired — no further maulings.
    ({ state, character } = advanceRound(state, character));
    expect(monsters(state)[0].instance.hp.current).toBe(70);
    expect(character.resources.spiritBeastTurnsRemaining).toBe(0);
  });
});

describe('Signature identity — no longer Wizard reskins', () => {
  it('the three converted spells carry druid-only effect keys', () => {
    expect(getSpell('regrowth').effectKey).toBe('regrowth');
    expect(getSpell('entangling-roots').effectKey).toBe('entangle');
    expect(getSpell('spirit-beast').effectKey).toBe('summon-beast');
  });

  it('none of the three share an effect key with any wizard-book spell', () => {
    const wizardKeys = new Set(
      listSpells()
        .filter((s) => s.book === 'wizard')
        .map((s) => s.effectKey),
    );
    for (const id of ['regrowth', 'entangling-roots', 'spirit-beast']) {
      expect(wizardKeys.has(getSpell(id).effectKey)).toBe(false);
    }
  });

  it('a fresh druid still knows all 12 nature spells, with the renamed ids', () => {
    const druid = createCharacter({ id: 'd', ...presetCreationInput('druid') });
    const known = druid.resources.knownSpells ?? [];
    expect(known).toHaveLength(12);
    expect(known).toContain('regrowth');
    expect(known).toContain('entangling-roots');
    expect(known).toContain('spirit-beast');
    expect(known).not.toContain('moonfire');
    expect(known).not.toContain('summon-tempest');
  });
});
