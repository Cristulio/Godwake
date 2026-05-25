import type { AbilityName } from './abilities';

export type ConditionName =
  | 'blinded'
  | 'charmed'
  | 'deafened'
  | 'frightened'
  | 'grappled'
  | 'incapacitated'
  | 'invisible'
  | 'paralyzed'
  | 'petrified'
  | 'poisoned'
  | 'prone'
  | 'restrained'
  | 'stunned'
  | 'unconscious'
  | 'exhausted';

export const CONDITION_NAMES: readonly ConditionName[] = [
  'blinded', 'charmed', 'deafened', 'frightened', 'grappled',
  'incapacitated', 'invisible', 'paralyzed', 'petrified',
  'poisoned', 'prone', 'restrained', 'stunned', 'unconscious', 'exhausted',
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
