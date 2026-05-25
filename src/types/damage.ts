export type DamageType =
  | 'slashing'
  | 'piercing'
  | 'bludgeoning'
  | 'fire'
  | 'cold'
  | 'lightning'
  | 'thunder'
  | 'acid'
  | 'poison'
  | 'psychic'
  | 'necrotic'
  | 'radiant'
  | 'force';

export const PHYSICAL_DAMAGE: readonly DamageType[] = ['slashing', 'piercing', 'bludgeoning'] as const;

export interface DamageInstance {
  amount: number;
  type: DamageType;
}
