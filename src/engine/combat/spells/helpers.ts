import type { DiceRoller } from '../../dice';
import type { Character } from '../../../types/character';
import type {
  CombatState,
  MonsterCombatant,
  SpellEffectKind,
} from '../../../types/combat';
import { getSpell } from '../../../content/spells';
import { applyDamage } from '../attack';
import { abilityModifier } from '../../../types/abilities';
import {
  effectiveAbilityScores,
  proficiencyBonus,
} from '../../character/derived';
import { appendLog } from '../log';

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

export function spellAttackBonus(character: Character): number {
  const scores = effectiveAbilityScores(character);
  return (
    abilityModifier(scores.int) +
    proficiencyBonus(character.level) +
    (character.permanentSpellAttackBonus ?? 0)
  );
}

export function spellSaveDC(character: Character): number {
  const scores = effectiveAbilityScores(character);
  // Wizards get +1 baseline ("Focused Casting") so save-or-suck spells like
  // Burning Hands actually land — without this, DC 12 vs typical +2/+3 DEX
  // saves means ~55% save rate and AoE feels useless.
  const classBonus = character.classId === 'wizard' ? 1 : 0;
  return (
    8 +
    abilityModifier(scores.int) +
    proficiencyBonus(character.level) +
    classBonus +
    (character.permanentSpellDcBonus ?? 0)
  );
}

export function spellDamageBonus(character: Character): number {
  return character.permanentSpellDamageBonus ?? 0;
}

export function attachSpellEffect(
  state: CombatState,
  kind: SpellEffectKind,
  attackerId: string,
  targetId?: string,
): CombatState {
  const next = (state.spellEffectCounter ?? 0) + 1;
  return {
    ...state,
    spellEffectCounter: next,
    spellEffectEvent: { id: next, kind, attackerId, targetId },
  };
}

/**
 * Returns the count of slots available at level n, treating undefined as 0.
 */
export function slotsAt(character: Character, level: 1 | 2 | 3 | 4): number {
  return character.resources.spellSlots?.[level] ?? 0;
}

/**
 * Spend one slot of the given level (mutates resources). Caller checked availability.
 */
export function consumeSlot(character: Character, level: 1 | 2 | 3 | 4): void {
  const slots = { ...(character.resources.spellSlots ?? {}) };
  slots[level] = Math.max(0, (slots[level] ?? 0) - 1);
  character.resources = { ...character.resources, spellSlots: slots };
}

export function markActionUsed(character: Character): void {
  character.actionEconomy = { ...character.actionEconomy, actionUsed: true };
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
  character: Character,
  spellId: string,
): { ok: true } | { ok: false; reason: string } {
  const known = character.resources.knownSpells ?? [];
  if (!known.includes(spellId)) return { ok: false, reason: 'Spell not prepared.' };
  const spell = getSpell(spellId);
  // Bonus-action spells (Misty Step) gate on the bonus-action slot, not action.
  if (spell.effectKey === 'misty-step') {
    if (character.actionEconomy.bonusActionUsed) {
      return { ok: false, reason: 'Bonus action already used.' };
    }
  } else if (character.actionEconomy.actionUsed) {
    return { ok: false, reason: 'Action already used.' };
  }
  if (spell.level === 0) return { ok: true };
  const lvl = spell.level as 1 | 2 | 3;
  if (slotsAt(character, lvl) <= 0) return { ok: false, reason: `No level-${lvl} slot remaining.` };
  return { ok: true };
}

/**
 * Local evaluator — matches attack.ts logic but kept local to avoid a circular
 * import. Marks combat resolved if all monsters are dead.
 */
export function evaluateCombatEnd(state: CombatState, character: Character): CombatState {
  const aliveMonsters = state.combatants.filter(
    (c) => c.kind === 'monster' && c.instance.hp.current > 0,
  );
  if (aliveMonsters.length === 0) {
    return appendLog(
      { ...state, status: 'player-victory' },
      { id: nextLogId(state), kind: 'system', text: 'Victory. The room falls silent.' },
    );
  }
  if (character.hp.current <= 0) {
    return appendLog(
      { ...state, status: 'player-defeat' },
      { id: nextLogId(state), kind: 'system', text: 'You have fallen.' },
    );
  }
  return state;
}

/**
 * Shared AoE evocation handler — Fireball and Lightning Bolt both roll 8d6
 * against every living monster, with a DEX save for half (mirrors 5e RAW for
 * the shape; the engine has no terrain so cone/line/sphere collapse to "all").
 */
export function castAreaEvocation(
  ctx: CastSpellContext,
  effect: 'fireball' | 'lightning-bolt',
): CastResult {
  const { character, state, roller } = ctx;
  consumeSlot(character, 3);

  const damageType: 'fire' | 'lightning' = effect === 'fireball' ? 'fire' : 'lightning';
  const flavor =
    effect === 'fireball'
      ? `${character.name} flicks an ember — it blooms into a roar of flame`
      : `${character.name} hurls a white arc of lightning across the room`;

  const aliveMonsters = state.combatants.filter(
    (c) => c.kind === 'monster' && c.instance.hp.current > 0,
  ) as MonsterCombatant[];

  const damageRoll = roller.roll({ count: 8, die: 6, modifier: 0 });
  const fullDmg = damageRoll.total;
  const dc = spellSaveDC(character);

  let nextState: CombatState = appendLog(state, {
    id: nextLogId(state),
    kind: 'roll',
    text: `${flavor}. ${damageRoll.rolls.join('+')} = ${fullDmg} ${damageType}. DEX save DC ${dc} for half.`,
  });

  nextState = attachSpellEffect(nextState, effect, 'player', aliveMonsters[0]?.id);

  for (const m of aliveMonsters) {
    // Monster DEX save — engine doesn't track per-monster save mods, so use
    // the same wis-mod=0 approximation Hold Person uses. DC scales with caster.
    const save = roller.d20('normal', 0);
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
      text: `${m.instance.displayName} DEX save: ${save.total} vs DC ${dc} — ${success ? 'success (half)' : 'fail (full)'}.`,
    });
    nextState = applyDamage(nextState, m.id, dmg, character);
    nextState = appendLog(nextState, {
      id: nextLogId(nextState),
      kind: 'damage',
      text: `${m.instance.displayName} takes ${dmg} ${damageType}.`,
    });
  }

  markActionUsed(character);
  return { state: evaluateCombatEnd(nextState, character), character, cast: true };
}
