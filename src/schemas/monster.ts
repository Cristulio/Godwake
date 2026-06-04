import { z } from 'zod';
import { AbilitySchema, DamageTypeSchema, SizeSchema } from './ids';

const DiceExpressionStringSchema = z
  .string()
  .regex(/^(\d+)?d(\d+)(?:\s*[+-]\s*\d+)?$/i, 'Expected dice expression like "1d6+2"');

/**
 * boss-framework: a telegraphed wind-up. Any action may carry one. On the turn
 * the picker selects a telegraphed action the monster CHARGES it — no damage,
 * clearly shown on the boss + combat header — and the action RESOLVES on the
 * monster's NEXT turn, giving the player one turn to race the HP, mitigate, or
 * hard-control the boss to cancel it (paralyze/stun/knockdown clears the charge).
 */
const TelegraphSchema = z.object({
  /** In-world line shown while the special is charging (combat log + intent tooltip). */
  chargeText: z.string().optional(),
  /** Rounds to charge before it resolves. Default 1 (charge this turn, resolve next). */
  windUpRounds: z.number().int().positive().optional(),
});
export type Telegraph = z.infer<typeof TelegraphSchema>;

const MonsterAttackSchema = z.object({
  kind: z.literal('attack'),
  name: z.string(),
  attackBonus: z.number(),
  damage: DiceExpressionStringSchema,
  damageType: DamageTypeSchema,
  /** Melee reach in feet (e.g. 5). */
  reach: z.number().optional(),
  /** Ranged [normal, long] in feet. */
  range: z.tuple([z.number(), z.number()]).optional(),
  /**
   * Life-drain: the monster heals for this fraction (0-1) of the damage it
   * deals with this attack, capped at its max HP. Models necrotic touch /
   * psychic feeding (Shadow, Mind Leech).
   */
  lifeDrain: z.number().min(0).max(1).optional(),
  description: z.string().optional(),
  telegraph: TelegraphSchema.optional(),
});

const MonsterParalyzeSchema = z.object({
  kind: z.literal('paralyze'),
  name: z.string(),
  saveDC: z.number().int().positive(),
  saveAbility: AbilitySchema,
  /** Max rounds the condition persists if no save succeeds. */
  durationRounds: z.number().int().positive(),
  description: z.string().optional(),
  telegraph: TelegraphSchema.optional(),
});

/**
 * Conditions a monster debuff can inflict on the player. Restricted to the set
 * the combat engine actually reads (playerConditionMods) so a debuff can never
 * be authored as flavor-only:
 *   poisoned / frightened — player attacks at disadvantage
 *   blinded / restrained  — player attacks at disadvantage AND attackers gain
 *                           advantage against the player
 *   weakened              — flat reduction to the player's outgoing weapon damage
 */
const DebuffConditionSchema = z.enum([
  'poisoned',
  'frightened',
  'blinded',
  'restrained',
  'weakened',
]);

const MonsterDebuffSchema = z.object({
  kind: z.literal('debuff'),
  name: z.string(),
  condition: DebuffConditionSchema,
  saveDC: z.number().int().positive(),
  saveAbility: AbilitySchema,
  /** Rounds the condition lasts on a failed save. */
  durationRounds: z.number().int().positive(),
  /** For 'weakened' only: flat damage the player loses per weapon hit. Default 3. */
  amount: z.number().int().positive().optional(),
  description: z.string().optional(),
  telegraph: TelegraphSchema.optional(),
});

const MonsterSummonSchema = z.object({
  kind: z.literal('summon'),
  name: z.string(),
  /** Monster def id to spawn as reinforcement(s). */
  summonDefId: z.string(),
  /** How many to spawn per cast. Default 1. */
  count: z.number().int().positive().optional(),
  /** Skip the summon while this many of summonDefId are already alive on the field. */
  maxActive: z.number().int().positive().optional(),
  /** If true, this monster summons at most once per encounter. */
  once: z.boolean().optional(),
  /** Earliest round this summon may fire. Before it the monster takes a normal
   *  action (e.g. an attack) instead of calling reinforcements. Default 1 (no delay). */
  minRound: z.number().int().positive().optional(),
  /** Minimum rounds between summons (the picker alternates with attacks). Default 2. */
  cooldownRounds: z.number().int().positive().optional(),
  description: z.string().optional(),
  telegraph: TelegraphSchema.optional(),
});

const MonsterSustainSchema = z.object({
  kind: z.literal('sustain'),
  name: z.string(),
  /** 'self' heals the caster; 'ally' heals / wards another live monster. Default 'self'. */
  target: z.enum(['self', 'ally']).optional(),
  /** HP healed (real current-HP recovery). Optional if the action only wards. */
  heal: DiceExpressionStringSchema.optional(),
  /** Temp-HP ward granted to the target (does not stack — takes the larger). */
  wardTempHp: z.number().int().positive().optional(),
  /** If true, fires at most once per encounter. */
  once: z.boolean().optional(),
  /** Minimum rounds between casts. Default 2. */
  cooldownRounds: z.number().int().positive().optional(),
  description: z.string().optional(),
  telegraph: TelegraphSchema.optional(),
});

const MonsterMultiattackSchema = z.object({
  kind: z.literal('multiattack'),
  name: z.string(),
  /** Resolve the monster's first attack action this many times in one turn. */
  attacks: z.number().int().min(2).max(4),
  description: z.string().optional(),
  telegraph: TelegraphSchema.optional(),
});

export const MonsterActionSchema = z.discriminatedUnion('kind', [
  MonsterAttackSchema,
  MonsterParalyzeSchema,
  MonsterDebuffSchema,
  MonsterSummonSchema,
  MonsterSustainSchema,
  MonsterMultiattackSchema,
]);
export type MonsterAttack = z.infer<typeof MonsterAttackSchema>;
export type MonsterParalyze = z.infer<typeof MonsterParalyzeSchema>;
export type MonsterDebuff = z.infer<typeof MonsterDebuffSchema>;
export type MonsterSummon = z.infer<typeof MonsterSummonSchema>;
export type MonsterSustain = z.infer<typeof MonsterSustainSchema>;
export type MonsterMultiattack = z.infer<typeof MonsterMultiattackSchema>;
export type MonsterAction = z.infer<typeof MonsterActionSchema>;

/**
 * boss-framework: an HP-threshold phase. Evaluated at the boss's turn start; the
 * first time its HP drops to/below `atHpPctBelow`% of max it enters this phase
 * ONCE and can: extend or replace its action list, gain extra actions per turn
 * (the multi-action endgame), enrage (flat bonus damage and/or an AC swing), and
 * flip a `transform` flag a content/UI lane can hook for a sprite/name change.
 * Additive — a boss with no `phases` behaves exactly as before. (The legacy
 * `bossMechanic: 'battle-rage'` path is left intact and runs independently.)
 */
const MonsterPhaseSchema = z.object({
  /** Fires when current HP is at or below this percent of max (e.g. 50 = bloodied). */
  atHpPctBelow: z.number().min(1).max(100),
  /** Short name shown in the transition log + the phase marker on the portrait. */
  name: z.string().optional(),
  /** Custom transition log line. Falls back to a generic surge line. */
  enterText: z.string().optional(),
  /** Actions granted on entry — appended to the base list (or replacing it, below). */
  addActions: z.array(MonsterActionSchema).optional(),
  /** If true, the boss's actions become exactly `addActions` from this phase on. */
  replaceActions: z.boolean().optional(),
  /** Raise the boss's actions-per-turn from this phase on (the Ch9+ multi-action escalation). */
  actionsPerTurn: z.number().int().min(1).max(4).optional(),
  /** Flat bonus damage added to every attack from this phase on (enrage). */
  bonusDamage: z.number().int().optional(),
  /** AC delta applied on entry (negative = the enraged boss drops its guard). */
  acDelta: z.number().int().optional(),
  /** Flip the `transformed` flag (a sprite/name change hook for content/UI). */
  transform: z.boolean().optional(),
});
export type MonsterPhase = z.infer<typeof MonsterPhaseSchema>;

/**
 * boss-framework: a condition gate. While active the boss takes greatly reduced
 * (or zero) damage; the gate lifts when its condition is met. Today the
 * condition is "the linked add is alive" — kill the add (Yaga-Shura's hidden
 * heart, a Sendai statue, a weak-point) to drop the ward. The UI surfaces
 * `wardLabel` so the player reads WHY the boss is shrugging off blows.
 */
const MonsterGateSchema = z.object({
  /**
   * Damage the boss takes while gated, as a fraction of incoming: 0 = fully
   * warded (invulnerable), 0.25 = takes a quarter (heavy DR). Default 0.
   */
  damageTakenPct: z.number().min(0).max(1).optional(),
  /** The gate holds while a monster of this def id is alive on the field. */
  whileAddAlive: z.string(),
  /** Why the boss is warded, for the on-portrait indicator (e.g. "destroy the heart"). */
  wardLabel: z.string(),
});
export type MonsterGate = z.infer<typeof MonsterGateSchema>;

export const MonsterAbilityScoresSchema = z.record(AbilitySchema, z.number());

export const MonsterSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** Display CR e.g. "1/4", "1", "5". */
  cr: z.string(),
  size: SizeSchema,
  /** e.g. "humanoid (goblinoid)", "undead", "beast". Free text. */
  creatureType: z.string(),
  ac: z.number().int().positive(),
  maxHp: z.number().int().positive(),
  speed: z.number().int().nonnegative(),
  abilityScores: MonsterAbilityScoresSchema,
  passivePerception: z.number().int().nonnegative(),
  actions: z.array(MonsterActionSchema).min(1),
  resistances: z.array(DamageTypeSchema).optional(),
  immunities: z.array(DamageTypeSchema).optional(),
  vulnerabilities: z.array(DamageTypeSchema).optional(),
  /** Sprite path or identifier. Optional at MVP. */
  art: z.string().optional(),
  flavorText: z.string().optional(),
  /**
   * Optional escalation mechanic. Despite the name this is NOT boss-only — any
   * monster may carry it; the combat engine reads it the same way for a frenzied
   * ghast as for a chapter boss. 'battle-rage' = on the first turn this monster
   * is at or below half HP, it enters Battle Rage: +2 damage per hit from then
   * until end of combat. (No advantage — the advantage component was dropped in
   * the boss-math rebalance because it converted misses into hits and snowballed
   * past the player's healing curve.)
   */
  bossMechanic: z.enum(['battle-rage']).optional(),
  /**
   * boss-framework: actions resolved per turn. Default 1 (every existing
   * monster). Set to 2 for the endgame "acts more than once a turn" bosses; a
   * phase can also raise it mid-fight. The monster turn resolves this many
   * actions in sequence, each telegraphed and resolved in order.
   */
  actionsPerTurn: z.number().int().min(1).max(4).optional(),
  /**
   * boss-framework: HP-threshold phases (see {@link MonsterPhaseSchema}).
   * Evaluated at this monster's turn start, each entered at most once.
   */
  phases: z.array(MonsterPhaseSchema).optional(),
  /**
   * boss-framework: a condition gate (see {@link MonsterGateSchema}). While the
   * linked add lives, incoming damage to this monster is negated/heavily reduced.
   */
  gate: MonsterGateSchema.optional(),
});

export type Monster = z.infer<typeof MonsterSchema>;
