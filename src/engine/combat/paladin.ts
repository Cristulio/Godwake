import type { DiceRoller } from '../dice';
import type { Character, SpellSlotLevel } from '../../types/character';
import type { CombatState, CombatLogEntry, MonsterCombatant } from '../../types/combat';
import { abilityModifier } from '../../types/abilities';
import { characterHasMechanic, effectiveAbilityScores } from '../character/derived';
import {
  combatResult,
  patchActionEconomy,
  patchHp,
  patchResources,
  patchSpellSlots,
  type CombatActionResult,
} from './types';
import { appendLog } from './log';
import { attachCombatVfx } from './vfx';
import { t } from '../../i18n';

/** True for the Charisma half-caster holy warrior. */
export function isPaladin(character: Readonly<Character>): boolean {
  return character.classId === 'paladin';
}

function chaMod(character: Readonly<Character>): number {
  return abilityModifier(effectiveAbilityScores(character as Character).cha);
}

// ─── Lay on Hands ────────────────────────────────────────────────────────────
//
// A per-encounter self-heal POOL (HP points), refreshed each fight in createCombat
// the way the Fighter's Second Wind / Monk's Ki refresh. A bonus action pours a
// chunk of the pool into the Paladin's own wounds. The pool scales with level and
// Charisma; the L20 capstone deepens it. SIM-TUNED — the constants here are the
// provisional band, not hand-picked win-rate targets.

/** The Paladin's full Lay on Hands pool — the per-fight refresh target. Zero for
 *  a non-Paladin or one that hasn't learned the kit. */
export function layOnHandsMax(character: Readonly<Character>): number {
  if (!isPaladin(character) || !characterHasMechanic(character as Character, 'lay-on-hands')) {
    return 0;
  }
  const base = 4 + character.level * 2 + Math.max(0, chaMod(character));
  // Unyielding Oath (L20 capstone): the well of mercy runs a full level deeper.
  const capstone = characterHasMechanic(character as Character, 'oathkeeper') ? character.level : 0;
  return base + capstone;
}

/** HP points left in the Lay on Hands pool right now. */
export function layOnHandsLeft(character: Readonly<Character>): number {
  return character.resources.layOnHandsRemaining ?? 0;
}

/** HP a single Lay on Hands use pours out — half the full pool, so two spends
 *  empty a fresh well. Bounded by what is actually left and the wound to close. */
export function layOnHandsChunk(character: Readonly<Character>): number {
  return Math.max(1, Math.ceil(layOnHandsMax(character) / 2));
}

export interface PaladinContext {
  character: Character;
  state: CombatState;
}

/**
 * Lay on Hands. Bonus action: spend a chunk of the renewable pool to heal the
 * Paladin itself. Heals the lesser of the chunk, the pool left, and the wound to
 * close — so it never overheals or overspends. Returns the patched combat state +
 * character, or the inputs unchanged when it can't fire (no pool, no bonus action,
 * already at full HP).
 */
export function useLayOnHands(ctx: PaladinContext): CombatActionResult {
  const { character, state } = ctx;
  if (!isPaladin(character)) return combatResult(state, character);
  if (!characterHasMechanic(character, 'lay-on-hands')) return combatResult(state, character);
  if (character.actionEconomy.bonusActionUsed) return combatResult(state, character);
  const pool = layOnHandsLeft(character);
  if (pool <= 0) return combatResult(state, character);
  const missing = character.hp.max - character.hp.current;
  if (missing <= 0) return combatResult(state, character);

  const heal = Math.min(pool, layOnHandsChunk(character), missing);
  if (heal <= 0) return combatResult(state, character);

  let nextCharacter: Character = patchHp(character, { current: character.hp.current + heal });
  nextCharacter = patchResources(nextCharacter, { layOnHandsRemaining: pool - heal });
  nextCharacter = patchActionEconomy(nextCharacter, { bonusActionUsed: true });

  const log: CombatLogEntry = {
    id: state.log.length + 1,
    kind: 'narration',
    text: t('combat.log.layOnHands', { name: nextCharacter.name, amount: heal }),
  };
  return combatResult(attachCombatVfx(appendLog(state, log), 'second-wind', 'player'), nextCharacter);
}

// ─── Divine Smite ────────────────────────────────────────────────────────────
//
// A weapon-hit rider: armed as a free stance (useDivineSmite), it spends a half-
// caster spell slot on the next LANDED weapon hit to sear the target with radiant
// damage that scales with the slot tier. Resolved in playerAttack via
// {@link paladinSmiteOnHit}. The Oaths reshape it — Radiant smites bigger
// (radiant-smite / sears-the-wicked add dice); Bulwark's crit-smite fires a free
// smite whenever a crit lands, even unarmed.

/** The lowest spell-slot tier the Paladin can spend right now, or 0 if empty.
 *  Smite spends the cheapest slot so the deeper ones stay banked for spells. */
function lowestAvailableSlot(character: Readonly<Character>): SpellSlotLevel | 0 {
  const slots = character.resources.spellSlots;
  if (!slots) return 0;
  for (let lvl = 1 as SpellSlotLevel; lvl <= 5; lvl = (lvl + 1) as SpellSlotLevel) {
    if ((slots[lvl] ?? 0) > 0) return lvl;
  }
  return 0;
}

/** True when the Paladin holds at least one spell slot to fund a smite. */
export function paladinHasSmiteSlot(character: Readonly<Character>): boolean {
  return lowestAvailableSlot(character) !== 0;
}

/** Smite dice (d8) for a slot of the given tier, before crit doubling: a base of
 *  1 + slot tier (capped at 5), deepened by the Radiant oath's smite milestones
 *  and the core Improved Divine Smite. */
export function divineSmiteDice(character: Readonly<Character>, slotLevel: number): number {
  let dice = Math.min(1 + slotLevel, 5);
  if (characterHasMechanic(character as Character, 'radiant-smite')) dice += 1;
  if (characterHasMechanic(character as Character, 'sears-the-wicked')) dice += 1;
  if (characterHasMechanic(character as Character, 'improved-divine-smite')) dice += 1;
  return dice;
}

/**
 * Arm a Divine Smite — a free stance (no action cost; the cost is the slot, paid
 * on the landing hit). The next weapon hit that connects spends the cheapest slot
 * for radiant damage. Requires a slot in hand to arm (so it is never armed to no
 * purpose). One at a time; a banked smite must land before another is raised.
 */
export function useDivineSmite(ctx: PaladinContext): CombatActionResult {
  const { character, state } = ctx;
  if (!isPaladin(character)) return combatResult(state, character);
  if (!characterHasMechanic(character, 'divine-smite')) return combatResult(state, character);
  if (character.smiteArmed === true) return combatResult(state, character);
  if (!paladinHasSmiteSlot(character)) return combatResult(state, character);

  const nextCharacter: Character = { ...character, smiteArmed: true };
  const log: CombatLogEntry = {
    id: state.log.length + 1,
    kind: 'narration',
    text: t('combat.log.divineSmiteArm', { name: nextCharacter.name }),
  };
  return combatResult(attachCombatVfx(appendLog(state, log), 'reckless', 'player'), nextCharacter);
}

/**
 * Resolve a Divine Smite on a landing weapon hit (called from playerAttack). The
 * smite fires when it is armed, or — for a Bulwark Paladin with Smite of the
 * Crusader — whenever a crit lands, even unarmed. Spends the cheapest slot, rolls
 * the radiant dice (doubled on a crit, like all weapon-hit dice), clears the armed
 * flag, and returns the freshly-patched character plus the radiant total to fold
 * into the hit's damage. Returns null to leave the strike untouched.
 */
export function paladinSmiteOnHit(
  character: Readonly<Character>,
  crit: boolean,
  roller: DiceRoller,
): { character: Character; total: number; dice: number } | null {
  if (!isPaladin(character)) return null;
  const armed = character.smiteArmed === true;
  const critSmite = crit && characterHasMechanic(character as Character, 'crit-smite');
  if (!armed && !critSmite) return null;
  const slot = lowestAvailableSlot(character);
  if (slot === 0) {
    // Armed but the well ran dry — drop the stance, deal no radiant.
    return armed ? { character: { ...(character as Character), smiteArmed: false }, total: 0, dice: 0 } : null;
  }
  const dice = divineSmiteDice(character, slot);
  const roll = roller.roll({ count: dice * (crit ? 2 : 1), die: 8, modifier: 0 });
  let next: Character = patchSpellSlots(character as Character, {
    [slot]: Math.max(0, (character.resources.spellSlots?.[slot] ?? 0) - 1),
  });
  next = { ...next, smiteArmed: false };
  return { character: next, total: roll.total, dice };
}

// ─── Auras (self-buff) ───────────────────────────────────────────────────────
//
// Passive self-buffs the Paladin carries into every fight (single-player, so the
// aura girds the Paladin, not allies). Aura of Protection adds CHA to every save
// (resolved in rollPlayerSave); the Bulwark oath deepens the aura into front-line
// staying power — per-combat temp HP (createCombat) and a flat damage cushion on
// each incoming hit (applyDamage).

/** Aura of Protection: +CHA modifier to every saving throw. Zero for a non-Paladin
 *  or one without the aura. Read in rollPlayerSave. */
export function paladinAuraSaveBonus(character: Readonly<Character>): number {
  if (!isPaladin(character) || !characterHasMechanic(character as Character, 'aura-of-protection')) {
    return 0;
  }
  return Math.max(0, chaMod(character));
}

/** Per-combat temp HP from the Bulwark aura, joined into the start-of-combat temp-
 *  HP pool (max-of) in createCombat. Deepened by the L10 Unbreakable Aura. */
export function paladinAuraTempHp(character: Readonly<Character>): number {
  if (!isPaladin(character)) return 0;
  if (characterHasMechanic(character as Character, 'unbreakable-aura')) return 6 + character.level;
  if (characterHasMechanic(character as Character, 'aura-of-the-bulwark')) return 4 + character.level;
  return 0;
}

/** Flat damage shaved off each incoming hit by the L10 Unbreakable Aura (the
 *  Bulwark's resistance lean). Read in applyDamage. Zero otherwise. */
export function paladinAuraDamageReduction(character: Readonly<Character>): number {
  if (!isPaladin(character)) return 0;
  return characterHasMechanic(character as Character, 'unbreakable-aura') ? 3 : 0;
}

// ─── Oath of Vengeance — Vow of Enmity ───────────────────────────────────────
//
// The striker oath's signature: at the start of each fight the paladin swears
// vengeance on the deadliest foe (the living monster with the highest max HP —
// the boss/biggest), and against that sworn quarry every blow lands with
// ADVANTAGE and for flat bonus damage. Relentless Avenger (L10) deepens the bite
// AND leaps the vow to the next-deadliest living foe the instant the quarry
// falls, so the hunt never ends. The vowed-target id lives on the combat state
// ({@link CombatState.vowedTargetId}); the advantage + damage rider resolve in
// playerAttack, the re-mark on a kill in applyDamage. SIM-TUNED — the bonus
// knobs below are the band, not hand-picked win-rate numbers.

/** Flat bonus damage a strike on the sworn quarry deals at L3 (Vow of Enmity).
 *  The advantage itself is the larger part of the striker's edge (more crits →
 *  more smite fuel); this is the steady on-type top-up. */
export const VOW_BONUS_DAMAGE = 3;

/** Flat bonus damage on the sworn quarry once Relentless Avenger (L10) deepens
 *  the vow — the hunt bites harder as it leaps from corpse to corpse. Replaces
 *  (does not stack with) {@link VOW_BONUS_DAMAGE}. */
export const VOW_BONUS_DAMAGE_L10 = 6;

/** True for an Oath of Vengeance paladin who has sworn the L3 vow. */
export function hasVowOfEnmity(character: Readonly<Character>): boolean {
  return isPaladin(character) && characterHasMechanic(character as Character, 'vow-of-enmity');
}

/** Flat bonus damage the vow adds to a strike on the sworn quarry — deeper once
 *  Relentless Avenger (L10) is online. Zero for a paladin without the oath. */
export function vowBonusDamage(character: Readonly<Character>): number {
  if (!hasVowOfEnmity(character)) return 0;
  return characterHasMechanic(character as Character, 'relentless-avenger')
    ? VOW_BONUS_DAMAGE_L10
    : VOW_BONUS_DAMAGE;
}

/**
 * The combatant id the Vow of Enmity swears at the start of a fight: the living
 * monster with the highest max HP (the boss/biggest), ties broken by spawn order
 * (the first such monster). Undefined when no monster lives — the caller then
 * leaves the vow unset. Shared by createCombat (initial vow) and the Relentless
 * re-mark in applyDamage (next quarry after the current one falls), so both pick
 * the quarry the same way.
 */
export function deadliestLivingMonsterId(combatants: readonly MonsterCombatant[]): string | undefined {
  let best: MonsterCombatant | undefined;
  for (const c of combatants) {
    if (c.instance.hp.current <= 0) continue;
    if (!best || c.instance.hp.max > best.instance.hp.max) best = c;
  }
  return best?.id;
}

/**
 * Relentless Avenger (L10) re-mark: when the sworn quarry is dead or gone, leap
 * the vow to the next-deadliest LIVING foe — or clear it when none remain. A
 * no-op unless the char has the L10 mechanic AND the current vowed target is
 * down, so it is safe to call after ANY damage settle (the attack chokepoint in
 * applyDamage, the DOT ticks in turn.ts) and stays idempotent: once the vow
 * points at a living foe again it does nothing. Without L10 the vow never leaps
 * — it stays on the fallen id (dead, so it simply stops biting) until the next
 * fight. Logs the leap when it happens; returns the (possibly) patched state.
 */
export function reconcileVow(state: CombatState, character: Readonly<Character>): CombatState {
  if (!characterHasMechanic(character as Character, 'relentless-avenger')) return state;
  const vowed = state.vowedTargetId;
  if (!vowed) return state;
  const stillAlive = state.combatants.some(
    (c) => c.kind === 'monster' && c.id === vowed && c.instance.hp.current > 0,
  );
  if (stillAlive) return state;
  const monsterCombatants = state.combatants.filter(
    (c): c is MonsterCombatant => c.kind === 'monster',
  );
  const nextQuarry = deadliestLivingMonsterId(monsterCombatants);
  let next: CombatState = { ...state, vowedTargetId: nextQuarry };
  if (nextQuarry) {
    const nextName = monsterCombatants.find((c) => c.id === nextQuarry)?.instance.displayName;
    next = appendLog(next, {
      id: next.log.length + 1,
      kind: 'system',
      text: t('combat.log.vowLeaps', { name: character.name, target: nextName ?? '' }),
    });
  }
  return next;
}
