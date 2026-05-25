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

export const MonsterActionSchema = z.discriminatedUnion('kind', [MonsterAttackSchema]);
export type MonsterAttack = z.infer<typeof MonsterAttackSchema>;
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
  /** Boss gimmick: this monster takes its turn before the player on round 1. */
  firstStrike: z.boolean().optional(),
});

export type Monster = z.infer<typeof MonsterSchema>;
