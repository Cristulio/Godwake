import { describe, it, expect, beforeEach } from 'vitest';
import { getItem } from './index';
import type { Consumable } from '../../schemas/item';
import { createCharacter } from '../../engine/character/initialize';
import { presetCreationInput } from '../../engine/character/defaultCharacter';
import { createCombat, _resetMonsterInstanceCounter } from '../../engine/combat/createCombat';
import { useConsumable } from '../../engine/combat/useItem';
import { endTurn } from '../../engine/combat/turn';
import { setActiveRoller, parseDiceExpression, type DiceRoller } from '../../engine/dice';
import type { RollResult } from '../../types/dice';
import { getMonster } from '../monsters';
import type { Character } from '../../types/character';
import type { CombatState } from '../../types/combat';
import type { ClassId } from '../../schemas/ids';

/**
 * Healing draughts and antitoxin are quaffed as a BONUS action so a wounded
 * delver can top up and still attack the same turn. No consumable should cost
 * a full action.
 */
describe('consumables — quick-quaff action economy', () => {
  const bonusIds = [
    'potion-of-healing',
    'potion-of-greater-healing',
    'potion-of-heroism',
    'antitoxin',
  ];

  it.each(bonusIds)('%s costs a bonus action', (id) => {
    const item = getItem(id) as Consumable;
    expect(item.kind).toBe('consumable');
    expect(item.actionCost).toBe('bonus');
  });
});

// ---------------------------------------------------------------------------
// Potion of Vitality — the regen draught (small immediate + two follow-up ticks)
// ---------------------------------------------------------------------------

/** A roller whose damage rolls are scripted from a queue, defaulting to the die
 *  midpoint when the queue runs dry. Mirror of the druid-signature suite's. */
function makeScriptedRoller(damageRolls: number[][]): DiceRoller {
  let ri = 0;
  return {
    d20(advantage = 'normal', modifier = 0): RollResult {
      return {
        expression: { count: 1, die: 20, modifier },
        rolls: [10],
        modifier,
        total: 10 + modifier,
        natural20: false,
        natural1: false,
        advantage,
      };
    },
    roll(expression, advantage = 'normal'): RollResult {
      const expr = typeof expression === 'string' ? parseDiceExpression(expression) : expression;
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

function makeChar(classId: ClassId, inventory: { itemId: string }[]): Character {
  const base = createCharacter({ id: `${classId}-1`, ...presetCreationInput(classId) });
  return { ...base, inventory };
}

/** One full round: player -> monster -> back to player, running start-of-turn
 *  ticks. No monster attack is rolled, so the hero's HP only moves on its ticks. */
function advanceRound(state: CombatState, character: Character) {
  let s = state;
  let ch = character;
  ({ state: s, character: ch } = endTurn(s, ch));
  ({ state: s, character: ch } = endTurn(s, ch));
  return { state: s, character: ch };
}

const POTION = 'potion-of-heroism';

beforeEach(() => {
  _resetMonsterInstanceCounter();
  setActiveRoller('vitality-potion-test-seed');
});

describe('Potion of Vitality — regen draught', () => {
  it('heals a small amount immediately, then again at the start of each of the next two turns, then stops', () => {
    const fighter = makeChar('fighter', [{ itemId: POTION }]);
    const init = createCombat({ character: fighter, monsters: [{ def: getMonster('goblin') }] });
    const potionIdx = init.character.inventory.findIndex((r) => r.itemId === POTION);
    const hurt: Character = {
      ...init.character,
      hp: { current: 20, max: 100, temp: 0 },
    };

    // Immediate 1d4+2 = 4, per-turn 1d6+3 = 6 (scripted, rolled once on drink).
    const roller = makeScriptedRoller([[2], [3]]);
    let { state, character } = useConsumable(
      { roller, character: hurt, state: init.state },
      potionIdx,
    );

    // Small immediate knit + the regen armed for two more turns; bonus spent;
    // the draught left the bag.
    expect(character.hp.current).toBe(24);
    expect(character.resources.vitalityRegenHealPerTurn).toBe(6);
    expect(character.resources.vitalityRegenTurnsRemaining).toBe(2);
    expect(character.actionEconomy.bonusActionUsed).toBe(true);
    expect(character.inventory.filter((r) => r.itemId === POTION)).toHaveLength(0);

    // Tick 1.
    ({ state, character } = advanceRound(state, character));
    expect(character.hp.current).toBe(30);
    expect(character.resources.vitalityRegenTurnsRemaining).toBe(1);

    // Tick 2 (last).
    ({ state, character } = advanceRound(state, character));
    expect(character.hp.current).toBe(36);
    expect(character.resources.vitalityRegenTurnsRemaining).toBe(0);

    // Expired — no third tick.
    ({ state, character } = advanceRound(state, character));
    expect(character.hp.current).toBe(36);
    expect(character.resources.vitalityRegenTurnsRemaining).toBe(0);
  });

  it('the immediate heal is much smaller than the old one-shot burst (it is a regen now)', () => {
    const item = getItem(POTION) as Consumable;
    expect(item.healDice).toBe('1d4+2');
    expect(item.regenPerTurnDice).toBe('1d6+3');
    expect(item.regenTurns).toBe(2);
  });

  it('drinks it while raging — immediate heal HALVED (rounded up), regen still banked, potion spent', () => {
    const barb = makeChar('barbarian', [{ itemId: POTION }]);
    const init = createCombat({ character: barb, monsters: [{ def: getMonster('goblin') }] });
    const potionIdx = init.character.inventory.findIndex((r) => r.itemId === POTION);
    const hurt: Character = { ...init.character, hp: { current: 5, max: 100, temp: 0 } };
    const raging: Character = {
      ...hurt,
      resources: { ...hurt.resources, rageRoundsRemaining: 5 },
    };

    // Same scripted rolls for both so only Rage's halving differs.
    const calm = useConsumable(
      { roller: makeScriptedRoller([[2], [3]]), character: hurt, state: init.state },
      potionIdx,
    );
    const drunk = useConsumable(
      { roller: makeScriptedRoller([[2], [3]]), character: raging, state: init.state },
      potionIdx,
    );

    const calmHealed = calm.character.hp.current - 5;
    const rageHealed = drunk.character.hp.current - 5;
    expect(calmHealed).toBeGreaterThan(0);
    // Immediate heal halved (rounded up); it no longer locks the draught out.
    expect(rageHealed).toBe(Math.ceil(calmHealed / 2));
    // The regen tail is still banked — it's halved per-tick in turn.ts, not here.
    expect(drunk.character.resources.vitalityRegenTurnsRemaining ?? 0).toBeGreaterThan(0);
    // The potion is SPENT now, not kept.
    expect(drunk.character.inventory.filter((r) => r.itemId === POTION)).toHaveLength(0);
  });

  it('does not erase an already-active Mending (state) or Regrowth (resources) regen', () => {
    const druid = makeChar('druid', [{ itemId: POTION }]);
    const init = createCombat({ character: druid, monsters: [{ def: getMonster('goblin') }] });
    const potionIdx = init.character.inventory.findIndex((r) => r.itemId === POTION);

    // Arm a Mending regen on the combat state and a Regrowth HOT on resources,
    // then drink the Potion of Vitality on top of both.
    const stateWithMending: CombatState = { ...init.state, playerRegenStacks: 3 };
    const charWithRegrowth: Character = {
      ...init.character,
      hp: { current: 20, max: 100, temp: 0 },
      resources: {
        ...init.character.resources,
        regrowthTurnsRemaining: 2,
        regrowthHealPerTurn: 5,
      },
    };

    const roller = makeScriptedRoller([[2], [3]]);
    const res = useConsumable(
      { roller, character: charWithRegrowth, state: stateWithMending },
      potionIdx,
    );

    // Vitality regen is now armed...
    expect(res.character.resources.vitalityRegenTurnsRemaining).toBe(2);
    expect(res.character.resources.vitalityRegenHealPerTurn).toBe(6);
    // ...and neither existing regen was clobbered.
    expect(res.state.playerRegenStacks).toBe(3);
    expect(res.character.resources.regrowthTurnsRemaining).toBe(2);
    expect(res.character.resources.regrowthHealPerTurn).toBe(5);
  });

  it('is cleared at the start of a fresh combat (no leak across fights)', () => {
    const fighter = makeChar('fighter', [{ itemId: POTION }]);
    // A half-spent draught carried in from a prior fight.
    const carried: Character = {
      ...fighter,
      resources: {
        ...fighter.resources,
        vitalityRegenTurnsRemaining: 1,
        vitalityRegenHealPerTurn: 6,
      },
    };
    const init = createCombat({ character: carried, monsters: [{ def: getMonster('goblin') }] });
    expect(init.character.resources.vitalityRegenTurnsRemaining).toBe(0);
    expect(init.character.resources.vitalityRegenHealPerTurn).toBe(0);
  });
});
