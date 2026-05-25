export type AbilityName = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';

export const ABILITY_NAMES: readonly AbilityName[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;

export const ABILITY_FULL_NAMES: Record<AbilityName, string> = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
};

export type AbilityScores = Record<AbilityName, number>;

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}
