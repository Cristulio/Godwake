import type { AbilityName } from './abilities';

export type ConditionName =
  | 'blinded'
  | 'frightened'
  | 'paralyzed'
  | 'poisoned'
  | 'restrained'
  // Not a 5e condition. Godwake-local: the target's blows land softer — a flat
  // reduction to outgoing weapon damage (amount stored in ActiveCondition.level).
  // Models sapping/withering effects (Cell Wight grip, energy drain).
  | 'weakened';

export const CONDITION_NAMES: readonly ConditionName[] = [
  'blinded', 'frightened', 'paralyzed', 'poisoned', 'restrained', 'weakened',
] as const;

export type DurationKind =
  | { kind: 'rounds'; value: number }
  | { kind: 'minutes'; value: number }
  | { kind: 'hours'; value: number }
  | { kind: 'untilSaveAtTurnEnd' }
  | { kind: 'untilSaveAtTurnStart' }
  | { kind: 'permanent' };

export interface ActiveCondition {
  name: ConditionName;
  duration: DurationKind;
  /** Entity id that applied this condition. */
  source?: string;
  /** If this is a save-or-end condition, the DC. */
  saveDC?: number;
  /** Ability used for the save. */
  saveAbility?: AbilityName;
  /** Optional sub-level for stacking conditions like exhausted. */
  level?: number;
}
