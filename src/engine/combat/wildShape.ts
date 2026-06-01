import type { Character } from '../../types/character';
import type { CombatState, CombatLogEntry } from '../../types/combat';
import { characterHasMechanic } from '../character/derived';
import {
  combatResult,
  patchActionEconomy,
  patchHp,
  patchResources,
  type CombatActionResult,
} from './types';
import { appendLog } from './log';
import { attachCombatVfx } from './vfx';

/** Rounds a Wild Shape holds once entered — a longer window than Rage; the form
 *  is a commitment, not a one-turn burst. It also ends early when the beast's
 *  vitality (temp HP) is spent. */
export const WILD_SHAPE_ROUNDS = 5;

/**
 * The beast's vitality, granted as temporary HP on the change. Scales with the
 * druid's level (the form grows with the soul). Circle of the Moon wears the
 * larger, sturdier predators — a deeper cushion that doubles its level scaling.
 */
export function wildShapeTempHp(character: Readonly<Character>): number {
  const moon = characterHasMechanic(character, 'circle-of-the-moon');
  return (moon ? 6 : 3) + character.level * (moon ? 2 : 1);
}

/** Wild Shape uses per combat — 1 base, +1 for Circle of the Moon, +1 for the
 *  L20 Archdruid capstone. */
export function wildShapeUsesMax(character: Readonly<Character>): number {
  if (!characterHasMechanic(character, 'wild-shape')) return 0;
  const moon = characterHasMechanic(character, 'circle-of-the-moon') ? 1 : 0;
  const archdruid = characterHasMechanic(character, 'archdruid') ? 1 : 0;
  return 1 + moon + archdruid;
}

/** Which natural-weapon profile the beast form fights with. Moon druids rend
 *  with the heavier Dire Claws. */
export function beastWeaponId(character: Readonly<Character>): string {
  return characterHasMechanic(character, 'circle-of-the-moon') ? 'dire-claws' : 'beast-claws';
}

export interface WildShapeContext {
  character: Character;
  state: CombatState;
}

/**
 * Druid Wild Shape. Bonus action: shed the body for a beast form — gain the
 * beast's vitality as temp HP and fight with a natural claw/bite profile (the
 * attack path swaps to {@link beastWeaponId} while shaped) for
 * {@link WILD_SHAPE_ROUNDS} rounds or until that vitality is spent. Available a
 * fixed number of times each combat (refreshed in createCombat); Circle of the
 * Moon grants a second change and a sturdier shape.
 */
export function useWildShape(ctx: WildShapeContext): CombatActionResult {
  const { character, state } = ctx;
  if (character.classId !== 'druid') return combatResult(state, character);
  if (!characterHasMechanic(character, 'wild-shape')) return combatResult(state, character);
  if (character.actionEconomy.bonusActionUsed) return combatResult(state, character);
  if ((character.resources.wildShapeRoundsRemaining ?? 0) > 0) return combatResult(state, character);
  const usesLeft = character.resources.wildShapeUsesRemaining ?? 0;
  if (usesLeft <= 0) return combatResult(state, character);

  const tempHp = wildShapeTempHp(character);
  let nextCharacter: Character = patchResources(character, {
    wildShapeRoundsRemaining: WILD_SHAPE_ROUNDS,
    wildShapeUsesRemaining: usesLeft - 1,
  });
  // Temp HP doesn't stack — take the higher of the beast's vitality and any
  // temp HP already on the sheet (RAW), mirroring the createCombat fold.
  nextCharacter = patchHp(nextCharacter, { temp: Math.max(nextCharacter.hp.temp, tempHp) });
  nextCharacter = patchActionEconomy(nextCharacter, { bonusActionUsed: true });

  const log: CombatLogEntry = {
    id: state.log.length + 1,
    kind: 'narration',
    text: `${nextCharacter.name} sheds the body for a beast's shape — ${tempHp} temporary HP and claws to bare, until the form spends out or fades.`,
  };
  return combatResult(attachCombatVfx(appendLog(state, log), 'rage', 'player'), nextCharacter);
}
