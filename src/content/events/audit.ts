import type {
  EventTemplate,
  EventChoice,
  EventChoiceOutcome,
  EventEffect,
} from '../../schemas/event';

/**
 * The events-overhaul gate (events-overhaul-spec). An event should read like a
 * Slay-the-Spire "?" room: a real decision with consequences.
 *
 * The hard, automatable bar is the **risk-free gamble**: a gated option (skill
 * check or chance) whose FAILURE carries no cost — you risk nothing to try for
 * the reward (the Scribe's "sell a lie" +25/whiff archetype). Every gated option
 * must have a real failure cost. This is the systemic pattern and the one a test
 * can enforce cleanly going forward.
 *
 * (Consequence-free LOOT/THEFT grabs — a deterministic "take the gold from the
 * shrine" with no karma — are the other free-upside shape, but they can't be
 * auto-distinguished from legitimate virtuous-decline beats like "walk out of
 * the greed vault empty-handed," so those are curated by hand, not gated here.)
 */

/** Effects that represent a cost or a risk the player pays. */
function isCostEffect(e: EventEffect): boolean {
  if (e.kind === 'hp_delta' || e.kind === 'gold_delta') return e.amount < 0;
  return e.kind === 'spawn_ambush';
}

/** Effects that represent a reward the player gains. */
function isRewardEffect(e: EventEffect): boolean {
  switch (e.kind) {
    case 'hp_delta':
    case 'gold_delta':
      return e.amount > 0;
    case 'temp_hp':
    case 'cha_scaled_gold':
    case 'grant_blessing':
    case 'grant_blessing_id':
    case 'grant_item':
    case 'grant_quirk_reroll':
    case 'apply_attack_bonus_run':
    case 'grant_boss_buff':
      return true;
    default:
      return false; // mark_bold_approach etc. — tactical/neutral, not a reward
  }
}

function outcomeEffects(o: EventChoiceOutcome): EventEffect[] {
  if ('random' in o) return o.random.flatMap((r) => r.outcome.effects ?? []);
  return o.effects ?? [];
}

/** A reward with no cost/risk in the same bundle. */
function isPositiveOnly(effects: EventEffect[]): boolean {
  return effects.some(isRewardEffect) && !effects.some(isCostEffect);
}

/** A gated option (skill check / chance) whose failure costs nothing — a
 *  risk-free gamble at the reward. This is the test gate. */
export function isRiskFreeGamble(choice: EventChoice): boolean {
  const gated = choice.skillCheck != null || choice.successChance != null;
  if (!gated) return false;
  // An absent failureOutcome means "nothing happens on failure" — the no-risk case.
  const fail = choice.failureOutcome ? outcomeEffects(choice.failureOutcome) : [];
  if (fail.length === 0) return true;
  return !fail.some(isCostEffect);
}

/** Risk-free gambles in an event (empty = clean). The hard gate. */
export function riskFreeGambles(ev: EventTemplate): EventChoice[] {
  return ev.choices.filter(isRiskFreeGamble);
}

/** A deterministic option that's a reward with no cost — reporting only (the
 *  hand-curated loot/theft-vs-decline judgment, not an automatable gate). */
export function isPositiveOnlyDeterministic(choice: EventChoice): boolean {
  const gated = choice.skillCheck != null || choice.successChance != null;
  return !gated && isPositiveOnly(outcomeEffects(choice.outcome));
}
