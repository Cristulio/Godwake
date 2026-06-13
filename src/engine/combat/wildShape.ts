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
import { t } from '../../i18n';

/** Rounds a Wild Shape holds once entered — a longer window than Rage; the form
 *  is a commitment, not a one-turn burst. It also ends early when the beast's
 *  vitality (temp HP) is spent. */
export const WILD_SHAPE_ROUNDS = 5;

/**
 * Druid L6 Primal Strike (Circle of the Moon): while shapeshifted, the beast's
 * claws bite past hide and ward — a flat to-hit edge and bonus damage on every
 * form attack, gated on the `primal-strike` mechanic. This is the contained,
 * universal expression of the 5e feature: this engine has no live monster damage
 * resistance to "overcome" (the resist arrays are codex/bot-only), and the one
 * real mitigation — the boss `gate` ward — belongs to four endgame bosses a L6
 * druid never meets and exists to gate a "kill the add" puzzle. So rather than a
 * no-op resistance flag or an out-of-scope global-resistance rebalance, Primal
 * Strike keeps the beast form relevant the way it must: the claws simply land
 * surer and bite deeper. Mirrors the dragon-claw form-buff idiom in playerAttack.
 * Magnitudes are CONSERVATIVE and provisional — the caster/druid sim pass
 * calibrates them against the band.
 */
export const PRIMAL_STRIKE_HIT_BONUS = 2;
export const PRIMAL_STRIKE_DAMAGE_BONUS = 2;

/**
 * The beast's vitality, granted as temporary HP on the change. Scales with the
 * druid's level (the form grows with the soul). Circle of the Moon wears the
 * larger, sturdier predators — a deeper base cushion and a steeper level climb.
 *
 * The cushion is intentionally generous (a real power spike for the turns the
 * form is up, not a token 1-2 hits): a base druid opens the form with a band of
 * temp HP that buys it a couple of front-line exchanges and grows meaningfully
 * across the climb. Magnitudes are CONSERVATIVE-but-worthwhile and provisional —
 * the caster/druid sim pass calibrates them against the band.
 */
export function wildShapeTempHp(character: Readonly<Character>): number {
  const moon = characterHasMechanic(character, 'circle-of-the-moon');
  return (moon ? 8 : 4) + character.level * (moon ? 3 : 2);
}

/** Wild Shape uses per combat — 1 base, +1 for Circle of the Moon, +1 for the
 *  L20 Archdruid capstone, plus any Grove "Primal Reservoir"
 *  (permanentBonuses.wildShapeUses). */
export function wildShapeUsesMax(character: Readonly<Character>): number {
  if (!characterHasMechanic(character, 'wild-shape')) return 0;
  const moon = characterHasMechanic(character, 'circle-of-the-moon') ? 1 : 0;
  const archdruid = characterHasMechanic(character, 'archdruid') ? 1 : 0;
  const grove = character.permanentBonuses?.wildShapeUses ?? 0;
  return 1 + moon + archdruid + grove;
}

/**
 * Which natural-weapon profile the beast form fights with — the claw is the
 * form's whole offense, so it climbs a level ladder (mirroring the monk's
 * martialArtsWeaponId): heavier shapes answer at L9, the deep wild at L17.
 * Moon druids walk a parallel, heavier ladder (Dire → Savage → Apex).
 *
 * All tiers carry `casterWeapon`, so the claw attacks and damages off the
 * druid's WISDOM (the form-appropriate stat — playerAttack's caster-weapon
 * read), never the caster's dumped STR/DEX. Tier thresholds are PROVISIONAL —
 * the end-of-campaign sim batch calibrates them with the claw dice.
 */
export function beastWeaponId(character: Readonly<Character>): string {
  const moon = characterHasMechanic(character, 'circle-of-the-moon');
  const lvl = character.level;
  if (moon) {
    if (lvl >= 17) return 'dire-claws-apex';
    if (lvl >= 9) return 'dire-claws-savage';
    return 'dire-claws';
  }
  if (lvl >= 17) return 'beast-claws-primal';
  if (lvl >= 9) return 'beast-claws-elder';
  return 'beast-claws';
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
    text: t('combat.log.wildShape', { name: nextCharacter.name, temp: tempHp }),
  };
  return combatResult(attachCombatVfx(appendLog(state, log), 'rage', 'player'), nextCharacter);
}
