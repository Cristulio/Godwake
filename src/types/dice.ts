export type DieSize = 4 | 6 | 8 | 10 | 12 | 20 | 100;

export const DIE_SIZES: readonly DieSize[] = [4, 6, 8, 10, 12, 20, 100] as const;

export interface DiceExpression {
  count: number;
  die: DieSize;
  modifier: number;
}

export type RollAdvantage = 'normal' | 'advantage' | 'disadvantage';

export interface RollResult {
  expression: DiceExpression;
  rolls: number[];
  modifier: number;
  total: number;
  natural20: boolean;
  natural1: boolean;
  advantage: RollAdvantage;
  /** For d20 advantage/disadvantage, the discarded roll. */
  discardedRoll?: number;
}
