/**
 * sim-shrine-omen — the measuring stick for the shrines/omens/bonuses balance pass.
 *
 * The owner's directive (2026-06-12) has three principles:
 *   1. CHAPTER-RELEVANCE — a reward that matters in Ch2 must not be noise in Ch11.
 *   2. SHRINE ≈ OMEN — shrines must not be overwhelmingly better than omens.
 *   3. RISK PAYS — where an effect needs a high roll, the reward should beat the
 *      safe pick.
 *
 * Balance here is sim-specced, not hand-specced (house rule): this script is the
 * "spec" — it converts every event's choices into a gold-equivalent expected
 * value (EV), weights skill-gated outcomes by their success odds, and reports
 * the three relationships above so the tuning pass has numbers to move, not
 * vibes. It changes NO content — it only measures. The valuation weights below
 * ARE the model; they're the knobs a follow-up calibrates.
 *
 * Run: `npx tsx scripts/sim-shrine-omen.ts`  (fast — static analysis, no combat).
 * Writes a markdown audit to docs/sim-findings/shrine-omen-audit.md.
 */
import { writeFileSync } from 'node:fs';
import { listEvents } from '../src/content/events';
import { chapterGoldRamp, chapterHpRamp, eventGoldScale } from '../src/engine/delve/eventGoldScale';
import { proficiencyBonus } from '../src/engine/character/derived';
import type { EventTemplate, EventChoice, EventEffect, EventChoiceOutcome } from '../src/schemas/event';

// ─── Valuation model (gold-equivalent). PROVISIONAL — these are the knobs the
//     tuning pass calibrates; they encode "how much is one HP / blessing / run-
//     long +to-hit worth in gold?". Gold is the base unit. ────────────────────
const GOLD_PER_HP = 2; // a point of healing/▼cost in gold-equiv
const TEMP_HP_FACTOR = 0.55; // temp HP expires → worth less than real HP
const BLESSING_GOLD = 130; // a (random) blessing — persistent power, ~a blessing buy
const ITEM_GOLD = 80; // a granted item ≈ a mid drop
const QUIRK_REROLL_GOLD = 45; // a bane-quirk reroll
const ATTACK_BONUS_RUN_GOLD = 160; // per +1 to-hit for the WHOLE run — very strong
const AMBUSH_COST_PER_MOB = 35; // a forced fight is a cost, scaled by pack size
const WEAK_SPOT_GOLD = 35; // boss intel: free tier
const BATTLE_PLAN_GOLD = 90; // boss intel: deep tier
const MARK_BOLD_GOLD = 30;
const CHA_MOD_PROXY = 3; // assumed CHA mod for cha_scaled_gold valuation

// Skill-check success model: an INVESTED character (proficient + a good ability).
// We don't bias by class — the question is "for the player who can attempt this
// gate, does the high DC pay?" so we assume the player built for it.
const INVESTED_ABILITY_MOD = 3;

/** Ch1→L1 … Ch14→L20, the campaign's level spine, for proficiency-by-chapter. */
function chapterLevel(chapter: number): number {
  return Math.max(1, Math.min(20, Math.round(1 + (chapter - 1) * (19 / 13))));
}

/** P(d20 + invested skill bonus ≥ dc), clamped for nat-1/nat-20 realism. */
function successChanceFor(dc: number, chapter: number): number {
  const bonus = proficiencyBonus(chapterLevel(chapter)) + INVESTED_ABILITY_MOD;
  const need = dc - bonus; // need a d20 of at least this
  const faces = Math.max(0, Math.min(20, 21 - need)); // # of d20 faces that clear it
  return Math.max(0.05, Math.min(0.95, faces / 20));
}

interface Valued {
  gold: number; // gold-equiv that WILL chapter-scale
  flat: number; // gold-equiv that will NOT chapter-scale (the staleness mass)
}
const ZERO: Valued = { gold: 0, flat: 0 };
const add = (a: Valued, b: Valued): Valued => ({ gold: a.gold + b.gold, flat: a.flat + b.flat });

/** Value one effect, splitting depth-scaling value (gold + HP) from flat,
 *  chapter-invariant value (qualitative rewards: blessings, buffs, items). */
function valueEffect(e: EventEffect, goldScale: number): Valued {
  switch (e.kind) {
    case 'gold_delta':
      return { gold: e.amount * goldScale, flat: 0 };
    case 'cha_scaled_gold':
      return { gold: e.perPoint * CHA_MOD_PROXY * goldScale, flat: 0 };
    // HP and temp-HP now chapter-scale on their own ramp (eventHpScale), so they
    // count as scaling value, not stale flat — same bucket as gold for the
    // staleness metric (both grow with depth; only qualitative effects stay flat).
    case 'hp_delta':
      return { gold: e.amount * GOLD_PER_HP, flat: 0 };
    case 'temp_hp':
      return { gold: e.amount * GOLD_PER_HP * TEMP_HP_FACTOR, flat: 0 };
    case 'grant_blessing':
    case 'grant_blessing_id':
      return { gold: 0, flat: BLESSING_GOLD };
    case 'grant_item':
      return { gold: 0, flat: ITEM_GOLD };
    case 'grant_quirk_reroll':
      return { gold: 0, flat: QUIRK_REROLL_GOLD };
    case 'apply_attack_bonus_run':
      return { gold: 0, flat: e.amount * ATTACK_BONUS_RUN_GOLD };
    case 'spawn_ambush':
      return { gold: 0, flat: -AMBUSH_COST_PER_MOB * e.monsterDefIds.length };
    case 'grant_boss_buff':
      return { gold: 0, flat: e.tier === 'battle-plan' ? BATTLE_PLAN_GOLD : WEAK_SPOT_GOLD };
    case 'mark_bold_approach':
      return { gold: 0, flat: MARK_BOLD_GOLD };
    default:
      return ZERO;
  }
}

/** Value an outcome (a flat effect list, or a weighted-random bag of outcomes). */
function valueOutcome(outcome: EventChoiceOutcome, goldScale: number): Valued {
  if ('random' in outcome) {
    const total = outcome.random.reduce((s, r) => s + r.weight, 0) || 1;
    return outcome.random.reduce<Valued>((acc, r) => {
      const v = (r.outcome.effects ?? []).reduce<Valued>(
        (a, e) => add(a, valueEffect(e, goldScale)),
        ZERO,
      );
      return add(acc, { gold: (v.gold * r.weight) / total, flat: (v.flat * r.weight) / total });
    }, ZERO);
  }
  return (outcome.effects ?? []).reduce<Valued>((a, e) => add(a, valueEffect(e, goldScale)), ZERO);
}

interface ChoiceEV {
  label: string;
  ev: Valued;
  total: number;
  gated: boolean;
  dc: number | null;
  successValue: number; // total gold-equiv of the success branch (the "reward" risk buys)
}

/** Expected value of a choice, weighting a skill/chance gate by its odds. */
function valueChoice(choice: EventChoice, chapter: number, goldScale: number): ChoiceEV {
  const success = valueOutcome(choice.outcome, goldScale);
  const successValue = success.gold + success.flat;
  let p = 1;
  let dc: number | null = null;
  if (choice.skillCheck) {
    dc = choice.skillCheck.dc;
    p = successChanceFor(dc, chapter);
  } else if (typeof choice.successChance === 'number') {
    p = choice.successChance;
  }
  const failure = choice.failureOutcome ? valueOutcome(choice.failureOutcome, goldScale) : ZERO;
  const ev: Valued = {
    gold: p * success.gold + (1 - p) * failure.gold,
    flat: p * success.flat + (1 - p) * failure.flat,
  };
  return {
    label: choice.label,
    ev,
    total: ev.gold + ev.flat,
    gated: choice.skillCheck != null || choice.successChance != null,
    dc,
    successValue,
  };
}

interface EventRow {
  id: string;
  type: string;
  minChapter: number;
  bestTotal: number;
  bestLabel: string;
  flatShare: number; // fraction of the best choice's value that WON'T chapter-scale
  maxDc: number | null;
  maxDcReward: number | null;
  // P2/P3 reward-when-earned lens — strips the probability discount that the
  // EV metric applies, so an event whose richest reward sits behind a hard gate
  // is compared on what the reward IS, not on how often a bot clears the gate.
  bestSuccessValue: number; // best choice's success-branch gold-equiv (any choice)
  bestGatedSuccess: number; // best GATED choice's success value (0 if none)
  bestSafeEv: number; // best ungated choice's EV (the "play it safe" baseline)
  // P3 within-event: does the best high-roll reward beat playing it safe? An
  // event with a gate fails this if its richest gated payoff is no better than
  // its best no-risk option — risk that does not pay (principle 3).
  riskPays: boolean | null; // null = no gated choice to judge
}

function auditEvent(ev: EventTemplate): EventRow {
  const minChapter = ev.minChapter ?? 1;
  // Evaluate at the event's own floor — gold scale is ×1 there (apples to apples
  // across events authored for different depths).
  const goldScale = eventGoldScale(minChapter, minChapter);
  const choices = ev.choices.map((c) => valueChoice(c, minChapter, goldScale));
  const best = choices.reduce((a, b) => (b.total > a.total ? b : a));
  const bestMass = Math.abs(best.ev.gold) + Math.abs(best.ev.flat);
  const gatedChoices = choices.filter((c) => c.gated && c.dc != null);
  const maxByDc = gatedChoices.reduce<ChoiceEV | null>(
    (a, c) => (a == null || (c.dc ?? 0) > (a.dc ?? 0) ? c : a),
    null,
  );
  const safeChoices = choices.filter((c) => !c.gated);
  const bestSafeEv = safeChoices.length ? Math.max(...safeChoices.map((c) => c.total)) : 0;
  const bestGatedSuccess = gatedChoices.length
    ? Math.max(...gatedChoices.map((c) => c.successValue))
    : 0;
  return {
    id: ev.id,
    type: ev.eventType,
    minChapter,
    bestTotal: Math.round(best.total),
    bestLabel: best.label,
    flatShare: bestMass > 0 ? Math.abs(best.ev.flat) / bestMass : 0,
    maxDc: maxByDc?.dc ?? null,
    maxDcReward: maxByDc ? Math.round(maxByDc.successValue) : null,
    bestSuccessValue: Math.round(Math.max(...choices.map((c) => c.successValue))),
    bestGatedSuccess: Math.round(bestGatedSuccess),
    bestSafeEv: Math.round(bestSafeEv),
    riskPays: gatedChoices.length ? bestGatedSuccess > bestSafeEv : null,
  };
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

function main() {
  const rows = listEvents().map(auditEvent);
  const shrines = rows.filter((r) => r.type === 'shrine');
  const omens = rows.filter((r) => r.type === 'omen');

  const lines: string[] = [];
  lines.push('# Shrine / Omen / Bonus balance audit', '');
  lines.push(
    '_Generated by `scripts/sim-shrine-omen.ts`. Gold-equivalent EV of each',
    "event's best choice, evaluated at the event's own minChapter (gold scale ×1",
    'there). Valuation weights are the model in the script header — PROVISIONAL,',
    'the knobs the tuning pass moves. No content is changed by this run._',
    '',
  );

  // Principle 2 — shrine vs omen parity. Reported on TWO lenses:
  //  • best-choice EV — what a bot nets on average (probability-discounted).
  //  • best success VALUE — the reward when the chosen path pays off, stripping
  //    the gate's success odds. The fairer parity lens: shrines lean on harder
  //    rolls, so the EV lens under-counts them; the reward-when-earned lens asks
  //    "is the prize comparable?" which is the owner's actual question.
  lines.push('## Principle 2 — shrine vs omen parity', '');
  const sEv = mean(shrines.map((r) => r.bestTotal));
  const oEv = mean(omens.map((r) => r.bestTotal));
  const sRw = mean(shrines.map((r) => r.bestSuccessValue));
  const oRw = mean(omens.map((r) => r.bestSuccessValue));
  lines.push(`- Shrines (${shrines.length}): mean best-choice EV **${sEv.toFixed(0)}g** · mean best success-value **${sRw.toFixed(0)}g**`);
  lines.push(`- Omens (${omens.length}): mean best-choice EV **${oEv.toFixed(0)}g** · mean best success-value **${oRw.toFixed(0)}g**`);
  const ratio = oEv === 0 ? 0 : sEv / oEv;
  const rwRatio = oRw === 0 ? 0 : sRw / oRw;
  lines.push(`- Shrine/Omen EV ratio: **${ratio.toFixed(2)}×** · reward-when-earned ratio: **${rwRatio.toFixed(2)}×** (target band 0.9–1.3; >1.3 = shrines dominate)`, '');

  // Principle 3 — does a higher DC pay better? (across all gated choices)
  lines.push('## Principle 3 — risk pays (DC vs reward)', '');
  const gatedPairs: { id: string; dc: number; reward: number }[] = [];
  for (const ev of listEvents()) {
    const minChapter = ev.minChapter ?? 1;
    const gs = eventGoldScale(minChapter, minChapter);
    for (const c of ev.choices) {
      const vc = valueChoice(c, minChapter, gs);
      if (vc.dc != null) gatedPairs.push({ id: ev.id, dc: vc.dc, reward: Math.round(vc.successValue) });
    }
  }
  const byBand = (lo: number, hi: number) =>
    mean(gatedPairs.filter((g) => g.dc >= lo && g.dc <= hi).map((g) => g.reward));
  lines.push('| DC band | # gates | mean reward (success value) |');
  lines.push('|---|--:|--:|');
  for (const [lo, hi, lbl] of [[1, 11, 'easy ≤11'], [12, 14, 'medium 12–14'], [15, 30, 'hard ≥15']] as const) {
    const n = gatedPairs.filter((g) => g.dc >= lo && g.dc <= hi).length;
    lines.push(`| ${lbl} | ${n} | ${byBand(lo, hi).toFixed(0)}g |`);
  }
  lines.push('', '_If hard gates do not out-reward easy ones, risk is not paying (principle 3)._', '');

  // Principle 3, within-event lens — the stronger test, SCOPED to shrines/omens
  // (this pass's remit; the loot/theft "grab" beats in ruin/treasure/bargain are
  // deterministic take-it choices by design, hand-curated, not roll-for-reward —
  // see events/audit.ts). For each shrine/omen with a gated option, does its best
  // high-roll reward (success value) beat the best no-risk option's EV? A gate
  // whose prize is no better than playing it safe is a roll for nothing.
  const gatedRows = [...shrines, ...omens].filter((r) => r.riskPays !== null);
  const offenders = gatedRows.filter((r) => r.riskPays === false);
  lines.push('### within-event (shrines/omens): does the high-roll beat playing it safe?', '');
  lines.push(
    `${gatedRows.length - offenders.length}/${gatedRows.length} gated shrine/omen events pass`,
    '(best gated success-value > best safe EV). Offenders — a roll whose prize is no',
    'better than the no-risk option:',
    '',
  );
  if (offenders.length === 0) {
    lines.push('_None — every gate out-pays its safe alternative._', '');
  } else {
    lines.push('| event | type | minCh | best gated success | best safe EV |');
    lines.push('|---|---|--:|--:|--:|');
    for (const r of offenders.sort((a, b) => a.minChapter - b.minChapter)) {
      lines.push(`| ${r.id} | ${r.type} | ${r.minChapter} | ${r.bestGatedSuccess}g | ${r.bestSafeEv}g |`);
    }
    lines.push('');
  }

  // Principle 1 — value composition. After the tuning pass, every NUMERIC reward
  // scales with depth: gold (eventGoldScale) and HP/temp-HP (eventHpScale). The
  // only value left flat is QUALITATIVE — blessings, run buffs, items, quirk
  // rerolls — which are chapter-invariant by nature (a blessing is a blessing at
  // any depth). So a high flat-share is now EXPECTED, not a staleness bug; the
  // genuine "+5 heal goes stale by the Throne" problem is fixed.
  const qualitative = rows.filter((r) => r.flatShare >= 0.8).sort((a, b) => b.bestTotal - a.bestTotal);
  lines.push('## Principle 1 — chapter-relevance (gold + HP now scale; flat = qualitative)', '');
  lines.push(
    `${qualitative.length} of ${rows.length} events draw ≥80% of their best-choice value from`,
    'QUALITATIVE effects (blessings/buffs/items/rerolls) — chapter-invariant by',
    'design. Numeric value (gold + HP/temp-HP) now ramps with depth, so the genuine',
    'staleness — a flat heal/cost worth a quarter-bar in Ch1 and a rounding error by',
    'the Throne — is closed. The events below are qualitative-reward beats, listed',
    'for review, not flagged as broken:',
    '',
  );
  lines.push('| event | type | minCh | best EV | qualitative-share |');
  lines.push('|---|---|--:|--:|--:|');
  for (const r of qualitative.slice(0, 25)) {
    lines.push(`| ${r.id} | ${r.type} | ${r.minChapter} | ${r.bestTotal}g | ${(r.flatShare * 100).toFixed(0)}% |`);
  }
  lines.push('');

  // Full table.
  lines.push('## All events (best-choice EV)', '');
  lines.push('| event | type | minCh | best EV | best success | best choice | flat% | maxDC | maxDC reward |');
  lines.push('|---|---|--:|--:|--:|---|--:|--:|--:|');
  for (const r of [...rows].sort((a, b) => a.minChapter - b.minChapter || b.bestTotal - a.bestTotal)) {
    lines.push(
      `| ${r.id} | ${r.type} | ${r.minChapter} | ${r.bestTotal}g | ${r.bestSuccessValue}g | ${r.bestLabel.slice(0, 36)} | ${(r.flatShare * 100).toFixed(0)}% | ${r.maxDc ?? '—'} | ${r.maxDcReward ?? '—'} |`,
    );
  }
  lines.push('');

  const out = lines.join('\n');
  writeFileSync('docs/sim-findings/shrine-omen-audit.md', out);

  // Console summary.
  console.log(`shrine-omen audit: ${rows.length} events (${shrines.length} shrine / ${omens.length} omen)`);
  console.log(`  P2 shrine vs omen — EV ${sEv.toFixed(0)}g/${oEv.toFixed(0)}g (${ratio.toFixed(2)}×) · reward-when-earned ${sRw.toFixed(0)}g/${oRw.toFixed(0)}g (${rwRatio.toFixed(2)}×)`);
  console.log(`  P3 DC reward by band: easy ${byBand(1, 11).toFixed(0)}g · medium ${byBand(12, 14).toFixed(0)}g · hard ${byBand(15, 30).toFixed(0)}g`);
  console.log(`  P3 within-event risk-pays: ${gatedRows.length - offenders.length}/${gatedRows.length} gates beat playing safe${offenders.length ? ` (offenders: ${offenders.map((r) => r.id).join(', ')})` : ''}`);
  console.log(`  qualitative-reward share: ${qualitative.length}/${rows.length} events ≥80% qualitative (blessings/buffs — scale-invariant by design)`);
  console.log(`  numeric value now scales: gold ×${chapterGoldRamp(14).toFixed(1)} + HP ×${chapterHpRamp(14).toFixed(1)} by Ch14 (was: HP flat = stale)`);
  console.log('  → docs/sim-findings/shrine-omen-audit.md');
}

main();
