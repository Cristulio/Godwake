import { z } from 'zod';
import { AbilitySchema, DamageTypeSchema, SizeSchema } from './ids';

const DiceExpressionStringSchema = z
  .string()
  .regex(/^(\d+)?d(\d+)(?:\s*[+-]\s*\d+)?$/i, 'Expected dice expression like "1d6+2"');

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
  description: z.string().optional(),
});

const MonsterParalyzeSchema = z.object({
  kind: z.literal('paralyze'),
  name: z.string(),
  saveDC: z.number().int().positive(),
  saveAbility: AbilitySchema,
  /** Max rounds the condition persists if no save succeeds. */
  durationRounds: z.number().int().positive(),
  description: z.string().optional(),
});

export const MonsterActionSchema = z.discriminatedUnion('kind', [
  MonsterAttackSchema,
  MonsterParalyzeSchema,
]);
export type MonsterAttack = z.infer<typeof MonsterAttackSchema>;
export type MonsterParalyze = z.infer<typeof MonsterParalyzeSchema>;
export type MonsterAction = z.infer<typeof MonsterActionSchema>;

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
   * Optional boss mechanic id. The combat engine reads this to apply per-boss
   * behaviors. 'battle-rage' = on the first turn this monster is at or below
   * half HP, it enters Battle Rage: +2 damage per hit from then until end of
   * combat. (No advantage — the advantage component was dropped in the boss-
   * math rebalance because it converted misses into hits and snowballed past
   * the player's healing curve.)
   */
  bossMechanic: z.enum(['battle-rage']).optional(),
});

export type Monster = z.infer<typeof MonsterSchema>;
