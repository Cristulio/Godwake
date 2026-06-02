import type { Character } from '../../types/character';
import type { CombatState, CombatLogEntry } from '../../types/combat';
import { abilityModifier } from '../../types/abilities';
import {
  characterHasMechanic,
  effectiveAbilityScores,
  proficiencyBonus,
} from '../character/derived';
import {
  combatResult,
  patchActionEconomy,
  patchResources,
  type CombatActionResult,
} from './types';
import { appendLog } from './log';
import { attachCombatVfx } from './vfx';

/** Max Ki points for a monk: one per level, +2 at the L20 capstone (Perfect Self). */
export function monkKiMax(character: Readonly<Character>): number {
  if (character.classId !== 'monk' || !characterHasMechanic(character, 'ki')) return 0;
  return character.level + (characterHasMechanic(character, 'perfect-self') ? 2 : 0);
}

/** The save DC a foe rolls against the monk's Ki effects (Stunning Strike). 8 + prof + WIS. */
export function monkKiSaveDC(character: Readonly<Character>): number {
  const wisMod = abilityModifier(effectiveAbilityScores(character).wis);
  return 8 + proficiencyBonus(character.level) + wisMod;
}

/**
 * Which unarmed-strike profile (and thus which Martial Arts die) the monk fights
 * with at its current level. Mirrors {@link beastWeaponId} for the druid: the
 * attack dispatch swaps the main-hand to this id so the die scales with the
 * school — d6 → d8 (L5) → d10 (L11) → d12 (L17).
 */
export function martialArtsWeaponId(character: Readonly<Character>): string {
  const lvl = character.level;
  if (lvl >= 17) return 'monk-fists-grandmaster';
  if (lvl >= 11) return 'monk-fists-master';
  if (lvl >= 5) return 'monk-fists-adept';
  return 'monk-fists';
}

/** Extra strikes a single Flurry of Blows throws: 2 base, 3 at L9, 4 at the L20 capstone. */
export function flurryStrikeCount(character: Readonly<Character>): number {
  if (characterHasMechanic(character, 'perfect-self')) return 4;
  if (characterHasMechanic(character, 'flurry-three')) return 3;
  return 2;
}

export interface MonkActionContext {
  character: Character;
  state: CombatState;
}

/**
 * Monk Flurry of Blows. Bonus action, 1 Ki: queue {@link flurryStrikeCount}
 * extra unarmed strikes this turn (the player can keep swinging after the Attack
 * action is spent — playerAttack burns one queued strike per swing). The
 * signature deluge. Cleared at turn end.
 */
export function useFlurryOfBlows(ctx: MonkActionContext): CombatActionResult {
  const { character, state } = ctx;
  if (character.classId !== 'monk') return combatResult(state, character);
  if (!characterHasMechanic(character, 'flurry-of-blows')) return combatResult(state, character);
  if (character.actionEconomy.bonusActionUsed) return combatResult(state, character);
  if ((character.flurryStrikesRemaining ?? 0) > 0) return combatResult(state, character);
  const ki = character.resources.kiPointsRemaining ?? 0;
  if (ki <= 0) return combatResult(state, character);

  const strikes = flurryStrikeCount(character);
  let nextCharacter: Character = { ...character, flurryStrikesRemaining: strikes };
  nextCharacter = patchResources(nextCharacter, { kiPointsRemaining: ki - 1 });
  nextCharacter = patchActionEconomy(nextCharacter, { bonusActionUsed: true });

  const log: CombatLogEntry = {
    id: state.log.length + 1,
    kind: 'narration',
    text: `${nextCharacter.name} pours Ki into a flurry — ${strikes} more strikes fall before the foe can answer.`,
  };
  return combatResult(attachCombatVfx(appendLog(state, log), 'reckless', 'player'), nextCharacter);
}

/**
 * Monk Patient Defense. Bonus action, 1 Ki: flow into a yielding guard — attacks
 * against the monk roll at disadvantage until the start of its next turn (read in
 * monsterAttack, cleared in endTurn).
 */
export function usePatientDefense(ctx: MonkActionContext): CombatActionResult {
  const { character, state } = ctx;
  if (character.classId !== 'monk') return combatResult(state, character);
  if (!characterHasMechanic(character, 'patient-defense')) return combatResult(state, character);
  if (character.patientDefenseActive === true) return combatResult(state, character);
  if (character.actionEconomy.bonusActionUsed) return combatResult(state, character);
  const ki = character.resources.kiPointsRemaining ?? 0;
  if (ki <= 0) return combatResult(state, character);

  let nextCharacter: Character = { ...character, patientDefenseActive: true };
  nextCharacter = patchResources(nextCharacter, { kiPointsRemaining: ki - 1 });
  nextCharacter = patchActionEconomy(nextCharacter, { bonusActionUsed: true });

  const log: CombatLogEntry = {
    id: state.log.length + 1,
    kind: 'narration',
    text: `${nextCharacter.name} settles into a flowing guard — the next blows come at disadvantage.`,
  };
  return combatResult(attachCombatVfx(appendLog(state, log), 'shield', 'player'), nextCharacter);
}

/**
 * Monk Stunning Strike. A free stance (no action cost) that ARMS a staggering
 * blow with 1 Ki: the next unarmed hit forces the target to save against the
 * monk's Ki DC or be staggered (it loses its next turn) — resolved on the
 * connecting hit in playerAttack. A clean miss leaves it armed; the Ki was spent
 * to arm it. Cleared at the start of the next turn.
 */
export function useStunningStrike(ctx: MonkActionContext): CombatActionResult {
  const { character, state } = ctx;
  if (character.classId !== 'monk') return combatResult(state, character);
  if (!characterHasMechanic(character, 'stunning-strike')) return combatResult(state, character);
  if (character.stunningStrikeActive === true) return combatResult(state, character);
  const ki = character.resources.kiPointsRemaining ?? 0;
  if (ki <= 0) return combatResult(state, character);

  let nextCharacter: Character = { ...character, stunningStrikeActive: true };
  nextCharacter = patchResources(nextCharacter, { kiPointsRemaining: ki - 1 });

  const log: CombatLogEntry = {
    id: state.log.length + 1,
    kind: 'narration',
    text: `${nextCharacter.name} gathers Ki behind the next strike — aiming to drop a foe where it stands.`,
  };
  return combatResult(attachCombatVfx(appendLog(state, log), 'reckless', 'player'), nextCharacter);
}
