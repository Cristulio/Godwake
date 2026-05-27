import { z } from 'zod';

export const EventEffectSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('hp_delta'), amount: z.number() }),
  z.object({ kind: z.literal('temp_hp'), amount: z.number().positive() }),
  z.object({ kind: z.literal('gold_delta'), amount: z.number() }),
  z.object({ kind: z.literal('grant_blessing'), random: z.literal(true).optional() }),
  z.object({ kind: z.literal('grant_blessing_id'), id: z.string() }),
  z.object({ kind: z.literal('grant_quirk_reroll') }),
  z.object({ kind: z.literal('apply_attack_bonus_run'), amount: z.number().positive() }),
  z.object({ kind: z.literal('init_bonus_run'), amount: z.number().positive() }),
  z.object({ kind: z.literal('spawn_ambush'), monsterDefIds: z.array(z.string()) }),
]);
export type EventEffect = z.infer<typeof EventEffectSchema>;

export const EventOutcomeSchema = z.object({
  resolution: z.string(),
  effects: z.array(EventEffectSchema),
});
export type EventOutcome = z.infer<typeof EventOutcomeSchema>;

export const EventChoiceOutcomeSchema = z.union([
  EventOutcomeSchema,
  z.object({
    random: z.array(
      z.object({
        weight: z.number().positive(),
        outcome: EventOutcomeSchema,
      }),
    ),
  }),
]);
export type EventChoiceOutcome = z.infer<typeof EventChoiceOutcomeSchema>;

export const EventChoiceSchema = z.object({
  id: z.string(),
  label: z.string(),
  hint: z.string().optional(),
  requiresGold: z.number().optional(),
  requiresHpAtLeast: z.number().optional(),
  /**
   * Minimum effective CHA modifier required to take this option (BG2-style
   * [Persuade] gate). Threshold is compared against `modifierFor(c, 'cha')`,
   * which includes racial bonuses. UI hides/disables the option below it.
   */
  requiresCha: z.number().optional(),
  /**
   * Probability in [0,1] that `outcome` fires. When undefined, the choice is
   * deterministic and `outcome` always fires. When set, the UI shows a chance
   * chip and the engine rolls: pass → `outcome`, fail → `failureOutcome`
   * (or an empty outcome if none is supplied).
   */
  successChance: z.number().min(0).max(1).optional(),
  outcome: EventChoiceOutcomeSchema,
  failureOutcome: EventChoiceOutcomeSchema.optional(),
});
export type EventChoice = z.infer<typeof EventChoiceSchema>;

export const EventTemplateSchema = z.object({
  id: z.string(),
  title: z.string(),
  flavor: z.string(),
  minChapter: z.number().int().positive().optional(),
  choices: z.array(EventChoiceSchema).min(2).max(4),
});
export type EventTemplate = z.infer<typeof EventTemplateSchema>;
