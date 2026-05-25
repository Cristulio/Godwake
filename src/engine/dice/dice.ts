import type { DiceExpression, DieSize, RollAdvantage, RollResult } from '../../types/dice';
import { DIE_SIZES } from '../../types/dice';
import { createRng, hashString, randomSeed, type SeededRng } from './rng';

const DICE_REGEX = /^(\d+)?d(\d+)(?:\s*([+-])\s*(\d+))?$/i;

export function parseDiceExpression(expr: string): DiceExpression {
  const match = DICE_REGEX.exec(expr.trim());
  if (!match) {
    throw new Error(`Invalid dice expression: "${expr}"`);
  }
  const [, countStr, dieStr, sign, modStr] = match;
  const dieNum = Number.parseInt(dieStr, 10);
  if (!DIE_SIZES.includes(dieNum as DieSize)) {
    throw new Error(`Invalid die size: d${dieNum}`);
  }
  const modifier = modStr
    ? (sign === '-' ? -Number.parseInt(modStr, 10) : Number.parseInt(modStr, 10))
    : 0;
  return {
    count: countStr ? Number.parseInt(countStr, 10) : 1,
    die: dieNum as DieSize,
    modifier,
  };
}

function rollOne(rng: SeededRng, die: DieSize): number {
  return Math.floor(rng.next() * die) + 1;
}

export interface DiceRoller {
  /** Roll a dice expression string ("2d6+3") or a parsed expression. */
  roll(expression: string | DiceExpression, advantage?: RollAdvantage): RollResult;
  /** Roll a d20, optionally with advantage/disadvantage and a flat modifier. */
  d20(advantage?: RollAdvantage, modifier?: number): RollResult;
  /** Snapshot the current RNG state. Pass to createDiceRollerFromState() to resume. */
  serialize(): RollerSnapshot;
}

export interface RollerSnapshot {
  /** Current PRNG state. */
  state: number;
}

export function createDiceRoller(seed?: number | string): DiceRoller {
  const seedNum =
    seed === undefined
      ? randomSeed()
      : typeof seed === 'number'
        ? seed >>> 0
        : hashString(seed);
  return makeRoller(createRng(seedNum));
}

export function createDiceRollerFromState(snapshot: RollerSnapshot): DiceRoller {
  return makeRoller(createRng(snapshot.state));
}

function makeRoller(rng: SeededRng): DiceRoller {
  function rollExpression(expr: DiceExpression, advantage: RollAdvantage): RollResult {
    if (advantage !== 'normal') {
      if (expr.die !== 20 || expr.count !== 1) {
        throw new Error('Advantage/disadvantage only applies to single d20 rolls');
      }
    }

    const rolls: number[] = [];
    for (let i = 0; i < expr.count; i++) {
      rolls.push(rollOne(rng, expr.die));
    }

    let chosenRolls = rolls;
    let discardedRoll: number | undefined;

    if (advantage !== 'normal') {
      const second = rollOne(rng, 20);
      const first = rolls[0];
      if (advantage === 'advantage') {
        chosenRolls = [Math.max(first, second)];
        discardedRoll = Math.min(first, second);
      } else {
        chosenRolls = [Math.min(first, second)];
        discardedRoll = Math.max(first, second);
      }
    }

    const sumOfRolls = chosenRolls.reduce((a, b) => a + b, 0);
    const total = sumOfRolls + expr.modifier;
    const isD20 = expr.die === 20 && expr.count === 1;

    return {
      expression: expr,
      rolls: chosenRolls,
      modifier: expr.modifier,
      total,
      natural20: isD20 && chosenRolls[0] === 20,
      natural1: isD20 && chosenRolls[0] === 1,
      advantage,
      discardedRoll,
    };
  }

  return {
    roll(expression, advantage = 'normal') {
      const expr = typeof expression === 'string' ? parseDiceExpression(expression) : expression;
      return rollExpression(expr, advantage);
    },
    d20(advantage = 'normal', modifier = 0) {
      return rollExpression({ count: 1, die: 20, modifier }, advantage);
    },
    serialize() {
      return { state: rng.getState() };
    },
  };
}
