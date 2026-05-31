import { z } from 'zod';
import { SkillSchema } from './ids';

export const EventEffectSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('hp_delta'), amount: z.number() }),
  z.object({ kind: z.literal('temp_hp'), amount: z.number().positive() }),
  z.object({ kind: z.literal('gold_delta'), amount: z.number() }),
  z.object({ kind: z.literal('grant_blessing'), random: z.literal(true).optional() }),
  z.object({ kind: z.literal('grant_blessing_id'), id: z.string() }),
  /**
   * Hand the character a piece of gear (weapon/armor/consumable). Set `itemId`
   * for a fixed item, or `randomFrom` to roll one id from a pool (the road
   * "find a weapon" beat). When both are present, `itemId` wins. The granted
   * item lands in inventory unequipped — the player equips it from the bag.
   */
  z.object({
    kind: z.literal('grant_item'),
    itemId: z.string().optional(),
    randomFrom: z.array(z.string()).min(1).optional(),
    /** Pre-bake these affix ids onto the granted item (makes it a named rolled piece). */
    affixIds: z.array(z.string()).optional(),
  }),
  /**
   * Bonus gold scaled by the character's effective CHA modifier — the payoff
   * half of a [Charisma] choice, so a silver tongue is worth more than the
   * binary gate. Grants `perPoint × max(0, chaMod)` gold (a positive value can
   * also offset an upfront cost, i.e. "haggle the price down").
   */
  z.object({ kind: z.literal('cha_scaled_gold'), perPoint: z.number().int().positive() }),
  z.object({
    kind: z.literal('grant_quirk_reroll'),
    /**
     * Optional flavor line shown when the reroll no-ops because the character
     * has no bane quirk to shake. Each event can supply a god-appropriate
     * line; when omitted, a god-agnostic default is used.
     */
    fallbackText: z.string().optional(),
  }),
  z.object({ kind: z.literal('apply_attack_bonus_run'), amount: z.number().positive() }),
  z.object({ kind: z.literal('spawn_ambush'), monsterDefIds: z.array(z.string()) }),
  /**
   * Ready a tactical edge against an upcoming chapter boss. `weak-spot` (free)
   * is a minor opener advantage; `battle-plan` (paid) is a bigger gird + brace.
   * The buff is stored on the character keyed by boss def id and consumed at
   * the boss fight in `createCombat`. Buff magnitudes live in `bossIntel.ts`.
   */
  z.object({
    kind: z.literal('grant_boss_buff'),
    bossDefId: z.string(),
    tier: z.union([z.literal('weak-spot'), z.literal('battle-plan')]),
  }),
  z.object({ kind: z.literal('mark_bold_approach'), bossDefId: z.string() }),
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
   * Probability in [0,1] that `outcome` fires. When undefined, the choice is
   * deterministic and `outcome` always fires. When set, the UI shows a chance
   * chip and the engine rolls: pass → `outcome`, fail → `failureOutcome`
   * (or an empty outcome if none is supplied).
   */
  successChance: z.number().min(0).max(1).optional(),
  /**
   * Roll-based skill gate: d20 + the skill's ability modifier + proficiency
   * (see `skillCheck`) against `dc`. When set, the option is always offerable
   * (no hidden floor) and the engine rolls on pick — pass → `outcome`, fail →
   * `failureOutcome`. This is what makes a skill proficiency (persuasion,
   * deception, athletics, …) actually pay off in play. Distinct from the flat
   * `successChance` lottery, which ignores the character sheet.
   */
  skillCheck: z
    .object({
      skill: SkillSchema,
      dc: z.number().int().positive(),
    })
    .optional(),
  outcome: EventChoiceOutcomeSchema,
  failureOutcome: EventChoiceOutcomeSchema.optional(),
});
export type EventChoice = z.infer<typeof EventChoiceSchema>;

/**
 * Visual taxonomy for the event header motif (see `EventMotif`). Keyed to the
 * event's theme, not bespoke per-event art. Untagged events (e.g. the boss-intel
 * rooms built in `bossIntel.ts`) fall back to `omen`, which fits a pre-threat
 * "reading the portents" beat.
 */
export const EVENT_TYPES = [
  'shrine',
  'omen',
  'treasure',
  'beast',
  'stranger',
  'bargain',
  'lore',
  'ruin',
] as const;
export const EventTypeSchema = z.enum(EVENT_TYPES);
export type EventType = z.infer<typeof EventTypeSchema>;

export const EventTemplateSchema = z.object({
  id: z.string(),
  title: z.string(),
  flavor: z.string(),
  minChapter: z.number().int().positive().optional(),
  eventType: EventTypeSchema.default('omen'),
  choices: z.array(EventChoiceSchema).min(2).max(4),
});
export type EventTemplate = z.infer<typeof EventTemplateSchema>;
