import type { DiceRoller } from '../dice';
import type { Character } from '../../types/character';
import type {
  CombatState,
  CombatLogEntry,
  MonsterCombatant,
} from '../../types/combat';
import { getSpell } from '../../content/spells';
import { applyDamage } from './attack';
import { abilityModifier } from '../../types/abilities';
import { effectiveAbilityScores, characterHasMechanic, proficiencyBonus } from '../character/derived';

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
  /** True if the spell actually cast. False = invalid (no slot, bad target, etc.) — state returned unchanged. */
  cast: boolean;
}

function nextLogId(state: CombatState): number {
  return state.log.length + 1;
}

function spellAttackBonus(character: Character): number {
  const scores = effectiveAbilityScores(character);
  return abilityModifier(scores.int) + proficiencyBonus(character.level);
}

function spellSaveDC(character: Character): number {
  const scores = effectiveAbilityScores(character);
  return 8 + abilityModifier(scores.int) + proficiencyBonus(character.level);
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
function consumeSlot(character: Character, level: 1 | 2 | 3 | 4): void {
  const slots = { ...(character.resources.spellSlots ?? {}) };
  slots[level] = Math.max(0, (slots[level] ?? 0) - 1);
  character.resources = { ...character.resources, spellSlots: slots };
}

function markActionUsed(character: Character): void {
  character.actionEconomy = { ...character.actionEconomy, actionUsed: true };
}

function findMonster(state: CombatState, id: string): MonsterCombatant | undefined {
  const c = state.combatants.find((x) => x.id === id);
  return c && c.kind === 'monster' ? c : undefined;
}

function firstLiveMonsterId(state: CombatState): string | undefined {
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
  if (character.actionEconomy.actionUsed) return { ok: false, reason: 'Action already used.' };
  const known = character.resources.knownSpells ?? [];
  if (!known.includes(spellId)) return { ok: false, reason: 'Spell not prepared.' };
  const spell = getSpell(spellId);
  if (spell.level === 0) return { ok: true };
  const lvl = spell.level as 1 | 2 | 3;
  if (slotsAt(character, lvl) <= 0) return { ok: false, reason: `No level-${lvl} slot remaining.` };
  return { ok: true };
}

/**
 * Cast a known spell. Spell-by-spell switch — slot consumption and action
 * marking handled inside each branch so spells with unique cost shapes (e.g.,
 * Shield as a future reaction) stay flexible. Returns updated combat state.
 */
export function castSpell(ctx: CastSpellContext): CastResult {
  const { character, state, spellId, roller } = ctx;
  const check = canCastSpell(character, spellId);
  if (!check.ok) return { state, cast: false };

  const spell = getSpell(spellId);
  switch (spell.effectKey) {
    case 'fire-bolt':
      return castFireBolt(ctx);
    case 'magic-missile':
      return castMagicMissile(ctx);
    case 'burning-hands':
      return castBurningHands(ctx);
    case 'shield':
      return castShield(character, state);
    case 'mage-armor':
      return castMageArmor(character, state);
    case 'hold-person':
      return castHoldPerson(ctx);
    default:
      // Exhaustive guard — if a new effectKey is added, this branch becomes
      // unreachable but keeps the switch honest.
      void roller;
      return { state, cast: false };
  }
}

function castFireBolt(ctx: CastSpellContext): CastResult {
  const { character, state, roller } = ctx;
  const targetId = ctx.targetId ?? firstLiveMonsterId(state);
  if (!targetId) return { state, cast: false };
  const target = findMonster(state, targetId);
  if (!target) return { state, cast: false };

  const attackBonus = spellAttackBonus(character);
  const toHit = roller.d20('normal', attackBonus);
  const crit = toHit.rolls[0] === 20;
  const hit = crit || (toHit.total >= target.instance.ac && !toHit.natural1);

  const logs: CombatLogEntry[] = [
    {
      id: nextLogId(state),
      kind: 'roll',
      text: `${character.name} hurls a Fire Bolt at ${target.instance.displayName}. d20${attackBonus >= 0 ? '+' : ''}${attackBonus} = ${toHit.total} vs AC ${target.instance.ac} ${crit ? '— CRITICAL HIT' : hit ? '— hit' : '— miss'}.`,
    },
  ];

  let nextState: CombatState = {
    ...state,
    log: [...state.log, ...logs],
    combatants: state.combatants.map((c) => {
      if (c.kind !== 'monster' || c.id !== targetId) return c;
      if (c.instance.acRevealed) return c;
      return { ...c, instance: { ...c.instance, acRevealed: true } };
    }),
  };

  if (hit) {
    const damageRoll = roller.roll({
      count: 1 * (crit ? 2 : 1),
      die: 10,
      modifier: 0,
    });
    nextState = applyDamage(nextState, targetId, damageRoll.total, character);
    nextState = {
      ...nextState,
      log: [
        ...nextState.log,
        {
          id: nextLogId(nextState),
          kind: 'damage',
          text: `Damage: ${damageRoll.rolls.join('+')} = ${damageRoll.total} fire.`,
        },
      ],
    };
  }

  markActionUsed(character);
  return { state: evaluateCombatEnd(nextState, character), cast: true };
}

function castMagicMissile(ctx: CastSpellContext): CastResult {
  const { character, state, roller } = ctx;
  const targetId = ctx.targetId ?? firstLiveMonsterId(state);
  if (!targetId) return { state, cast: false };
  const target = findMonster(state, targetId);
  if (!target) return { state, cast: false };

  consumeSlot(character, 1);
  const rolls: number[] = [];
  let total = 0;
  for (let i = 0; i < 3; i++) {
    const r = roller.roll({ count: 1, die: 4, modifier: 1 });
    rolls.push(r.total);
    total += r.total;
  }

  let nextState: CombatState = {
    ...state,
    combatants: state.combatants.map((c) => {
      if (c.kind !== 'monster' || c.id !== targetId) return c;
      if (c.instance.acRevealed) return c;
      return { ...c, instance: { ...c.instance, acRevealed: true } };
    }),
    log: [
      ...state.log,
      {
        id: nextLogId(state),
        kind: 'roll',
        text: `${character.name} casts Magic Missile. Three darts streak at ${target.instance.displayName} — ${rolls.join('+')} = ${total} force, auto-hit.`,
      },
    ],
  };

  nextState = applyDamage(nextState, targetId, total, character);
  markActionUsed(character);
  return { state: evaluateCombatEnd(nextState, character), cast: true };
}

function castBurningHands(ctx: CastSpellContext): CastResult {
  const { character, state, roller } = ctx;

  consumeSlot(character, 1);
  // Evocation subclass: Sculpt Spells reflavor — Burning Hands burns one die hotter.
  const evoker = characterHasMechanic(character, 'sculpt-spells');
  const dice = evoker ? 4 : 3;

  const aliveMonsters = state.combatants.filter(
    (c) => c.kind === 'monster' && c.instance.hp.current > 0,
  ) as MonsterCombatant[];

  // Primary target (the cone's anchor) takes the full roll; in our solo combat
  // the cone catches everything in front. We damage every living monster.
  const damageRoll = roller.roll({ count: dice, die: 6, modifier: 0 });
  const dmg = damageRoll.total;

  let nextState: CombatState = {
    ...state,
    log: [
      ...state.log,
      {
        id: nextLogId(state),
        kind: 'roll',
        text: `${character.name} hurls a cone of flame. ${damageRoll.rolls.join('+')} = ${dmg} fire${evoker ? ' (Sculpt Spells)' : ''}.`,
      },
    ],
  };

  for (const m of aliveMonsters) {
    nextState = {
      ...nextState,
      combatants: nextState.combatants.map((c) => {
        if (c.kind !== 'monster' || c.id !== m.id) return c;
        if (c.instance.acRevealed) return c;
        return { ...c, instance: { ...c.instance, acRevealed: true } };
      }),
    };
    nextState = applyDamage(nextState, m.id, dmg, character);
    nextState = {
      ...nextState,
      log: [
        ...nextState.log,
        {
          id: nextLogId(nextState),
          kind: 'damage',
          text: `${m.instance.displayName} takes ${dmg} fire.`,
        },
      ],
    };
  }

  markActionUsed(character);
  return { state: evaluateCombatEnd(nextState, character), cast: true };
}

function castShield(character: Character, state: CombatState): CastResult {
  consumeSlot(character, 1);
  character.resources = { ...character.resources, shieldActive: true };
  markActionUsed(character);
  return {
    state: {
      ...state,
      log: [
        ...state.log,
        {
          id: nextLogId(state),
          kind: 'narration',
          text: `${character.name} snaps a wall of force into place — +5 AC until next turn.`,
        },
      ],
    },
    cast: true,
  };
}

function castMageArmor(character: Character, state: CombatState): CastResult {
  consumeSlot(character, 1);
  character.resources = { ...character.resources, mageArmorActive: true };
  markActionUsed(character);
  return {
    state: {
      ...state,
      log: [
        ...state.log,
        {
          id: nextLogId(state),
          kind: 'narration',
          text: `${character.name} wraps themselves in shimmering force — +3 AC for this fight.`,
        },
      ],
    },
    cast: true,
  };
}

function castHoldPerson(ctx: CastSpellContext): CastResult {
  const { character, state, roller } = ctx;
  const targetId = ctx.targetId ?? firstLiveMonsterId(state);
  if (!targetId) return { state, cast: false };
  const target = findMonster(state, targetId);
  if (!target) return { state, cast: false };

  consumeSlot(character, 2);

  // Monster save vs. Hold Person. We don't have monster save proficiencies
  // wired generically; use WIS modifier from the monster's ability scores
  // (most beasts have WIS 8-12 so it stays a meaningful threat).
  const dc = spellSaveDC(character);
  // Pull monster def for ability scores — but to avoid an import cycle here,
  // approximate save mod from monster AC vs. baseline. Simpler: roll d20+0
  // (treat all targets as having a wis mod of 0). Keeps the engine honest
  // and gives Hold Person bite proportional to the wizard's INT/proficiency.
  const wisMod = 0;
  const save = roller.d20('normal', wisMod);
  const success = save.total >= dc;

  const logs: CombatLogEntry[] = [
    {
      id: nextLogId(state),
      kind: 'roll',
      text: `${character.name} weaves Hold Person at ${target.instance.displayName}. WIS save: d20${wisMod >= 0 ? '+' : ''}${wisMod} = ${save.total} vs DC ${dc} — ${success ? 'success' : 'fail'}.`,
    },
  ];

  let nextState: CombatState = { ...state, log: [...state.log, ...logs] };
  if (!success) {
    // Apply the paralyzed condition to the monster. Reuse the player-side
    // shape: write the condition into the monster instance directly.
    nextState = {
      ...nextState,
      combatants: nextState.combatants.map((c) => {
        if (c.kind !== 'monster' || c.id !== targetId) return c;
        const cond = {
          name: 'paralyzed' as const,
          duration: { kind: 'rounds' as const, value: 2 },
          saveDC: dc,
          saveAbility: 'wis' as const,
          source: character.id,
        };
        return {
          ...c,
          instance: {
            ...c.instance,
            conditions: [
              ...c.instance.conditions.filter((x) => x.name !== 'paralyzed'),
              cond,
            ],
          },
        };
      }),
      log: [
        ...nextState.log,
        {
          id: nextLogId(nextState),
          kind: 'system',
          text: `${target.instance.displayName} stiffens — bound by the spell.`,
        },
      ],
    };
  }
  markActionUsed(character);
  return { state: nextState, cast: true };
}

/**
 * Local evaluator — matches attack.ts logic but kept local to avoid a circular
 * import. Marks combat resolved if all monsters are dead.
 */
function evaluateCombatEnd(state: CombatState, character: Character): CombatState {
  const aliveMonsters = state.combatants.filter(
    (c) => c.kind === 'monster' && c.instance.hp.current > 0,
  );
  if (aliveMonsters.length === 0) {
    return {
      ...state,
      status: 'player-victory',
      log: [
        ...state.log,
        { id: nextLogId(state), kind: 'system', text: 'Victory. The room falls silent.' },
      ],
    };
  }
  if (character.hp.current <= 0) {
    return {
      ...state,
      status: 'player-defeat',
      log: [
        ...state.log,
        { id: nextLogId(state), kind: 'system', text: 'You have fallen.' },
      ],
    };
  }
  return state;
}
