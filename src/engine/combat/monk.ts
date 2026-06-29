import type { Character } from '../../types/character';
import type { CombatState, CombatLogEntry } from '../../types/combat';
import { abilityModifier } from '../../types/abilities';
import { getItem } from '../../content/items';
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
import { t } from '../../i18n';

/**
 * Per-hit damage edge a monk earns for going weaponless — the stand-in for the
 * bigger die, rolled affixes, and +N enhancement a weapon-class stacks onto
 * every swing. SCALES with the school so the bare hand keeps pace with the gear
 * a wielder accrues (owner 2026-06-28: the fist should rival an armed class):
 * +3 → +4 (L5) → +5 (L11) → +6 (L17). Rides every bare-handed strike (each
 * Flurry strike included), but goes dark the moment a monk picks up ANY weapon.
 */
export function monkUnarmedDamageEdge(character: Readonly<Character>): number {
  const lvl = character.level;
  return lvl >= 17 ? 6 : lvl >= 11 ? 5 : lvl >= 5 ? 4 : 3;
}

/**
 * The virtual unarmed-strike profiles the engine swaps in at each Martial Arts
 * tier (see {@link martialArtsWeaponId}). Pure attack-dispatch internals: they
 * are never owned, dealt, or equipped — a monk's empty main-hand IS the unarmed
 * state, and the dispatch resolves one of these ids only at the moment of the
 * swing. These — and an empty hand — are the only things that count as
 * "unarmed". A real weapon, even a themed monk weapon, does not.
 */
const UNARMED_STRIKE_IDS: ReadonlySet<string> = new Set([
  'monk-fists',
  'monk-fists-adept',
  'monk-fists-master',
  'monk-fists-grandmaster',
]);

/** Whether this item id is the monk's bare-fist unarmed strike — the only weapon
 *  id that earns the Martial Arts die + unarmed damage edge. */
export function isUnarmedStrikeId(itemId: string): boolean {
  return UNARMED_STRIKE_IDS.has(itemId);
}

/** Whether this item id is a themed monk weapon (war staff / paired kama /
 *  temple glaive — the `monkWeapon` content flag): an arm drilled into the
 *  forms, so the Ki kit keeps flowing around it (see {@link monkKitActive}).
 *  The virtual fists are "unarmed", not a weapon, and don't carry the flag. */
export function isMonkWeaponId(itemId: string): boolean {
  const item = getItem(itemId);
  return item.kind === 'weapon' && item.monkWeapon === true;
}

/**
 * Is this monk striking TRULY unarmed — and thus rolling the level-scaled
 * Martial Arts die plus the unarmed damage edge? The ONLY unarmed state is an
 * EMPTY main-hand (owner ruling 2026-06-12): the virtual fists ids live solely
 * inside the attack dispatch, are refused at equip, and legacy saves holding a
 * rolled Fists item are stripped at load (persistMigration). ANY equipped
 * weapon turns this off, including a themed monk weapon: a wielded arm swings
 * its own die, affixes, and enhancement instead. Non-monks are never "unarmed".
 */
export function monkFightsUnarmed(character: Readonly<Character>): boolean {
  if (character.classId !== 'monk') return false;
  return character.equipped.mainHand == null;
}

/**
 * Does the monk's Ki kit fire — Flurry of Blows, Patient Defense, Stunning
 * Strike, and the Ki-flavoured per-hit riders (Ki-Empowered, Open Hand, Shadow)?
 * True bare-handed AND with a themed monk weapon in hand: those arms are drilled
 * into the forms, so wielding one trades only the Martial Arts die + unarmed
 * edge for the weapon's die, affixes, and enhancement — the Ki keeps flowing.
 * An ordinary weapon (a found shortsword, a longbow) stills the whole kit.
 */
export function monkKitActive(character: Readonly<Character>): boolean {
  if (character.classId !== 'monk') return false;
  if (monkFightsUnarmed(character)) return true;
  const mainHand = character.equipped.mainHand;
  return mainHand != null && isMonkWeaponId(mainHand.itemId);
}

/** Max Ki points for a monk: one per level, +2 at the L20 capstone (Perfect Self),
 *  plus any Grove "Brimming Well" reservoir (permanentBonuses.kiPoints). */
export function monkKiMax(character: Readonly<Character>): number {
  if (character.classId !== 'monk' || !characterHasMechanic(character, 'ki')) return 0;
  const grove = character.permanentBonuses?.kiPoints ?? 0;
  return character.level + (characterHasMechanic(character, 'perfect-self') ? 2 : 0) + grove;
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

/** Ki spent to arm a Stunning Strike. Owner retune 2026-06-11: Ki flows far
 *  more freely than scarcer pools (Resolve), so a 2-Ki stun was too cheap —
 *  now 3, and the Open Hand Ki Focus (L10) discount lands at 2. */
export function stunningStrikeKiCost(character: Readonly<Character>): number {
  return characterHasMechanic(character as Character, 'ki-focus') ? 2 : 3;
}

/** Extra strikes a single Flurry of Blows throws: 2 base, 3 at L9, 4 at the L20 capstone. */
export function flurryStrikeCount(character: Readonly<Character>): number {
  if (characterHasMechanic(character, 'perfect-self')) return 4;
  if (characterHasMechanic(character, 'flurry-three')) return 3;
  return 2;
}

/**
 * Should the monk's turn be held open rather than auto-ended? True while a Flurry
 * still has queued strikes to throw — ending the turn would discard them (and the
 * Ki already spent to queue them) — or while an unspent Ki bonus (Flurry / a
 * stance) is still affordable this turn. The CombatScreen auto-end guard reads
 * this so a paused monk doesn't lose a half-thrown flurry, mirroring the fighter
 * Second Wind / rogue Cunning Action holds.
 */
export function monkHasPendingTurnAction(character: Readonly<Character>): boolean {
  if (character.classId !== 'monk') return false;
  const pendingFlurry = (character.flurryStrikesRemaining ?? 0) > 0;
  // An affordable Ki bonus only holds the turn while the kit can actually fire —
  // a monk who took up an ordinary weapon has no Flurry to wait for.
  const usableKi =
    monkKitActive(character) &&
    characterHasMechanic(character, 'flurry-of-blows') &&
    (character.resources.kiPointsRemaining ?? 0) > 0 &&
    !character.actionEconomy.bonusActionUsed;
  return pendingFlurry || usableKi;
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
  if (!monkKitActive(character)) return combatResult(state, character);
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
    text: t('combat.log.flurry', { name: nextCharacter.name, strikes }),
  };
  return combatResult(attachCombatVfx(appendLog(state, log), 'ki-charge', 'player'), nextCharacter);
}

/**
 * Monk Patient Defense. Bonus action, 1 Ki: flow into a yielding guard — attacks
 * against the monk roll at disadvantage until the start of its next turn (read in
 * monsterAttack, cleared in endTurn).
 */
export function usePatientDefense(ctx: MonkActionContext): CombatActionResult {
  const { character, state } = ctx;
  if (character.classId !== 'monk') return combatResult(state, character);
  if (!monkKitActive(character)) return combatResult(state, character);
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
    text: t('combat.log.patientDefense', { name: nextCharacter.name }),
  };
  return combatResult(attachCombatVfx(appendLog(state, log), 'shield', 'player'), nextCharacter);
}

/**
 * Monk Stunning Strike. A free stance (no action cost) that ARMS a staggering
 * blow ({@link stunningStrikeKiCost} Ki): the next kit-bearing hit — bare-handed
 * or with a monk weapon — forces the target to save against the monk's Ki DC or
 * be staggered (it loses its next turn) — resolved on the connecting hit in
 * playerAttack. A clean miss leaves it armed; the Ki was spent to arm it.
 * Cleared at the start of the next turn.
 */
export function useStunningStrike(ctx: MonkActionContext): CombatActionResult {
  const { character, state } = ctx;
  if (character.classId !== 'monk') return combatResult(state, character);
  if (!monkKitActive(character)) return combatResult(state, character);
  if (!characterHasMechanic(character, 'stunning-strike')) return combatResult(state, character);
  if (character.stunningStrikeActive === true) return combatResult(state, character);
  const ki = character.resources.kiPointsRemaining ?? 0;
  const cost = stunningStrikeKiCost(character);
  if (ki < cost) return combatResult(state, character);

  let nextCharacter: Character = { ...character, stunningStrikeActive: true };
  nextCharacter = patchResources(nextCharacter, { kiPointsRemaining: ki - cost });

  const log: CombatLogEntry = {
    id: state.log.length + 1,
    kind: 'narration',
    text: t('combat.log.stunningStrike', { name: nextCharacter.name }),
  };
  return combatResult(attachCombatVfx(appendLog(state, log), 'ki-charge', 'player'), nextCharacter);
}

// ─── Way of the Four Elements — the ki-caster monk ───────────────────────────

/** Ki spent to loose an Elemental Burst (L3). 1 — it competes with Flurry for the
 *  bonus action AND the same Ki pool, which is the conclave's core turn-by-turn
 *  choice: the single-target deluge vs the room-wide blast. */
export const ELEMENTAL_BURST_KI_COST = 1;

/** d6s the Elemental Burst rolls at the monk's level — a climb (3 → 4 at L5 → 5 at
 *  L11 → 6 at L17), +1 once Elemental Mastery (L10) lands. It hits EVERY foe, but
 *  the bot focus-fires (spread AoE under-clears), so the per-foe bite has to be
 *  real to kill the priority foe — sim-tuned from a too-soft 2d6 to this band. */
export function monkElementalBurstDice(character: Readonly<Character>): number {
  const lvl = character.level;
  const base = lvl >= 17 ? 6 : lvl >= 11 ? 5 : lvl >= 5 ? 4 : 3;
  return base + (characterHasMechanic(character as Character, 'elemental-mastery') ? 1 : 0);
}

/** Turns the Elemental Burst's lingering fire ticks for (the turn.ts burn DOT). */
export const ELEMENTAL_BURN_TURNS = 2;

/**
 * The burn the Elemental Burst leaves on every foe it touches — the RIDER that
 * makes the blast land beyond its one-shot, save-halved damage (owner 2026-06-28:
 * the burst felt flat). UNCONDITIONAL once applied (no save), it ticks
 * {@link ELEMENTAL_BURN_TURNS} turns in turn.ts, so even the bot's focus-fire
 * can't waste it — the whole rank keeps burning. Climbs with the school:
 * 3 → 4 (L5) → 5 (L11), +1 at Elemental Mastery (L10).
 */
export function monkElementalBurnPerTurn(character: Readonly<Character>): number {
  const lvl = character.level;
  const base = lvl >= 11 ? 5 : lvl >= 5 ? 4 : 3;
  return base + (characterHasMechanic(character as Character, 'elemental-mastery') ? 1 : 0);
}
