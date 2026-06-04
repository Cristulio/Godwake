import type { DiceRoller } from '../../dice';
import type { Character, SpellSlotLevel } from '../../../types/character';
import type {
  CombatState,
  MonsterCombatant,
  SpellEffectKind,
  SpellElement,
} from '../../../types/combat';
import { getSpell } from '../../../content/spells';
import { getMonster } from '../../../content/monsters';
import { applyDamage, evaluateCombatEnd as evaluateCombatEndShared } from '../attack';
import { abilityModifier } from '../../../types/abilities';
import {
  isFullCaster,
  proficiencyBonus,
  spellcastingMod,
} from '../../character/derived';
import { characterCampBoonMods } from '../../character/campBoons';
import { characterBlessingMods } from '../../character/blessings';
import { characterAffixMods } from '../../items/affixMods';
import { APOTHEOSIS_BONUS_DAMAGE, isAscendant } from '../apotheosis';
import { appendLog } from '../log';
import { patchActionEconomy, patchSpellSlots } from '../types';
import { attachCombatVfx } from '../vfx';

export interface CastSpellContext {
  roller: DiceRoller;
  character: Character;
  state: CombatState;
  spellId: string;
  /** Required for any spell with target: 'single' or 'area' (area: a primary target id to anchor). */
  targetId?: string;
}

export interface CastResult {
  state: CombatState;
  /** Fresh character reference per the CombatActionResult contract. */
  character: Character;
  /** True if the spell actually cast. False = invalid (no slot, bad target, etc.) — state returned unchanged. */
  cast: boolean;
}

export function nextLogId(state: CombatState): number {
  return state.log.length + 1;
}

export function spellAttackBonus(character: Readonly<Character>): number {
  const boonBonus = characterCampBoonMods(character).spellAttackBonus ?? 0;
  const blessingBonus = characterBlessingMods(character).spellAttackBonus ?? 0;
  return (
    spellcastingMod(character) +
    proficiencyBonus(character.level) +
    (character.permanentBonuses?.spellAttack ?? 0) +
    (character.delveSpellAttackBonus ?? 0) +
    boonBonus +
    blessingBonus +
    characterAffixMods(character).spellAttackBonus
  );
}

export function spellSaveDC(character: Readonly<Character>): number {
  // Full casters get a +1 baseline ("Focused Casting") so save-or-suck spells
  // like Burning Hands actually land — without this, DC 12 vs typical +2/+3 DEX
  // saves means ~55% save rate and AoE feels useless.
  const classBonus = isFullCaster(character.classId) ? 1 : 0;
  const boonBonus = characterCampBoonMods(character).spellDcBonus ?? 0;
  const blessingBonus = characterBlessingMods(character).spellDcBonus ?? 0;
  return (
    8 +
    spellcastingMod(character) +
    proficiencyBonus(character.level) +
    classBonus +
    (character.permanentBonuses?.spellDc ?? 0) +
    boonBonus +
    blessingBonus +
    characterAffixMods(character).spellDcBonus
  );
}

export function spellDamageBonus(character: Readonly<Character>): number {
  const boonBonus = characterCampBoonMods(character).spellDamageBonus ?? 0;
  const blessingBonus = characterBlessingMods(character).spellDamageBonus ?? 0;
  const ascendantBonus = isAscendant(character) ? APOTHEOSIS_BONUS_DAMAGE : 0;
  return (
    (character.permanentBonuses?.spellDamage ?? 0) +
    boonBonus +
    blessingBonus +
    ascendantBonus +
    characterAffixMods(character).spellDamageBonus
  );
}

export function attachSpellEffect(
  state: CombatState,
  kind: SpellEffectKind,
  attackerId: string,
  targetId?: string,
  element?: SpellElement,
): CombatState {
  return attachCombatVfx(state, kind, attackerId, targetId, element);
}

const SPELL_ELEMENTS: ReadonlySet<string> = new Set<SpellElement>([
  'fire',
  'cold',
  'lightning',
  'thunder',
  'acid',
  'poison',
  'necrotic',
  'radiant',
  'force',
]);

/**
 * The VFX element for a spell, read off its content `damageType`. Returns
 * undefined for non-damage spells (no element) — those route to their own
 * bespoke effects rather than a shape kind, so the shape components never see
 * a missing palette. Lets every damage handler emit an element-correct shape
 * straight from the canonical content, no per-spell hardcoding.
 */
export function spellElement(spellId: string): SpellElement | undefined {
  const dt = getSpell(spellId).damageType;
  return dt && SPELL_ELEMENTS.has(dt) ? (dt as SpellElement) : undefined;
}

/**
 * Returns the count of slots available at level n, treating undefined as 0.
 */
export function slotsAt(character: Readonly<Character>, level: SpellSlotLevel): number {
  return character.resources.spellSlots?.[level] ?? 0;
}

/**
 * Spend one slot of the given level. Returns the patched character. Caller
 * checked availability.
 */
export function consumeSlot(
  character: Readonly<Character>,
  level: SpellSlotLevel,
): Character {
  const current = character.resources.spellSlots?.[level] ?? 0;
  return patchSpellSlots(character, { [level]: Math.max(0, current - 1) });
}

export function markActionUsed(character: Readonly<Character>): Character {
  return patchActionEconomy(character, { actionUsed: true });
}

export function findMonster(state: CombatState, id: string): MonsterCombatant | undefined {
  const c = state.combatants.find((x) => x.id === id);
  return c && c.kind === 'monster' ? c : undefined;
}

export function firstLiveMonsterId(state: CombatState): string | undefined {
  for (const c of state.combatants) {
    if (c.kind === 'monster' && c.instance.hp.current > 0) return c.id;
  }
  return undefined;
}

/**
 * Whether the player can cast this spell right now (slot available, action open).
 * Returns reason on failure for UI tooltips.
 */
export function canCastSpell(
  character: Readonly<Character>,
  spellId: string,
): { ok: true } | { ok: false; reason: string } {
  const known = character.resources.knownSpells ?? [];
  if (!known.includes(spellId)) return { ok: false, reason: 'Spell not prepared.' };
  const spell = getSpell(spellId);
  if (spell.effectKey === 'misty-step') {
    if (character.actionEconomy.bonusActionUsed) {
      return { ok: false, reason: 'Bonus action already used.' };
    }
  } else if (spell.effectKey === 'shield') {
    if (character.actionEconomy.reactionUsed) {
      return { ok: false, reason: 'Reaction already used.' };
    }
  } else if (character.actionEconomy.actionUsed) {
    return { ok: false, reason: 'Action already used.' };
  }
  if (spell.level === 0) return { ok: true };
  const lvl = spell.level as SpellSlotLevel;
  if (slotsAt(character, lvl) <= 0) return { ok: false, reason: `No level-${lvl} slot remaining.` };
  return { ok: true };
}

/**
 * Local evaluator — delegates to the shared evaluator in attack/damage.ts but
 * returns only the state for callsites that want to keep their character
 * accumulator threaded externally. Use `evaluateCombatEndFull` to get the
 * fresh character back as well.
 */
export function evaluateCombatEnd(
  state: CombatState,
  character: Readonly<Character>,
): CombatState {
  return evaluateCombatEndShared(state, character).state;
}

/** Same as evaluateCombatEnd, but also returns the fresh character (poison-immune flag cleanup, etc.). */
export function evaluateCombatEndFull(
  state: CombatState,
  character: Readonly<Character>,
): { state: CombatState; character: Character } {
  return evaluateCombatEndShared(state, character);
}

/**
 * Per-monster DEX-save-for-half application, shared by every AoE evocation
 * (Fireball, Lightning Bolt, Burning Hands). Each monster rolls its own DEX
 * save off its actual ability scores, so a nimble enemy dodges more often than
 * a sluggish one; success halves the damage. DC scales with the caster
 * (spellSaveDC, which carries the wizard Focused Casting +1). Callers pass the
 * already-rolled full damage and the per-cast DC so spell-specific dice and
 * bonuses stay in each spell's own handler.
 */
export function applyAreaSaveForHalf(
  state: CombatState,
  character: Character,
  monsters: readonly MonsterCombatant[],
  opts: { roller: DiceRoller; fullDmg: number; dc: number; damageType: string },
): { state: CombatState; character: Character } {
  const { roller, fullDmg, dc, damageType } = opts;
  let nextState = state;
  let nextCharacter = character;

  for (const m of monsters) {
    const monsterDef = getMonster(m.instance.defId);
    const dexMod = abilityModifier(monsterDef.abilityScores.dex ?? 10);
    const save = roller.d20('normal', dexMod);
    const success = save.total >= dc;
    const dmg = success ? Math.floor(fullDmg / 2) : fullDmg;

    nextState = {
      ...nextState,
      combatants: nextState.combatants.map((c) => {
        if (c.kind !== 'monster' || c.id !== m.id) return c;
        if (c.instance.acRevealed) return c;
        return { ...c, instance: { ...c.instance, acRevealed: true } };
      }),
    };
    nextState = appendLog(nextState, {
      id: nextLogId(nextState),
      kind: 'roll',
      text: `${m.instance.displayName} DEX save: d20${dexMod >= 0 ? '+' : ''}${dexMod} = ${save.total} vs DC ${dc} — ${success ? 'success (half)' : 'fail (full)'}.`,
    });
    const damaged = applyDamage(nextState, m.id, dmg, nextCharacter);
    nextState = damaged.state;
    nextCharacter = damaged.character;
    nextState = appendLog(nextState, {
      id: nextLogId(nextState),
      kind: 'damage',
      text: `${m.instance.displayName} takes ${dmg} ${damageType}.`,
    });
  }

  return { state: nextState, character: nextCharacter };
}
