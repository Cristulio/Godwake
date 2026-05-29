export { applyDamage, evaluateCombatEnd } from './damage';
export {
  playerAttack,
  sneakAttackDiceForLevel,
  type AttackContext,
} from './playerAttack';
export { monsterAttack } from './monsterAttack';
export {
  refreshMonsterIntents,
  selectMonsterIntent,
  resolveIntentAction,
} from './monsterIntent';
export type { CombatActionResult } from '../types';
