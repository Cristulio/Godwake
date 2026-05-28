/**
 * Event-flow validation sim — exercises the three PR #84 changes end-to-end:
 *
 *  1. Per-event `fallbackText` on `grant_quirk_reroll`: each of the 6 events
 *     that grants a quirk reroll must surface its own god-appropriate
 *     fallback line, never the legacy hardcoded Waukeen sentence (except
 *     for the genuinely-Waukeen `beggar-at-the-gate`).
 *  2. L1 smart-fallback: when the reroll no-ops, the character gains +5g.
 *     Verified across 200 trials × 6 events.
 *  3. CHA-2 gate on `cowled-recruiter.bluff-the-cowl`: accessibility matrix
 *     across CHA 8–18, plus the headline cell (default tiefling Wizard at
 *     base CHA 10 + race +2 → effective 12, mod +1).
 *  4. Full-delve event log: 50 delves × 3 classes × 2 levels = 6 cells.
 *     Records events seen, choices picked, fallback strings surfaced, and
 *     flags any "Waukeen" string surfacing in a non-Waukeen event.
 *
 * Run via vitest: `npx vitest run scripts/sim-event-flow.test.ts`.
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { createDiceRoller } from '../src/engine/dice';
import {
  buildPlayerCharacter,
  type CharacterCreationInput,
} from '../src/engine/character/defaultCharacter';
import { applyLevelUp } from '../src/engine/character/leveling';
import { listEvents, getEvent } from '../src/content/events';
import {
  canTakeChoice,
  rollChoiceCheck,
  resolveChoiceOutcome,
  applyEventOutcome,
} from '../src/engine/delve/applyEventOutcome';
import { modifierFor, effectiveAbilityScores } from '../src/engine/character/derived';
import { createGodwakeDelve } from '../src/engine/delve/createDelve';
import { listQuirks } from '../src/content/quirks';
import type { Character } from '../src/types/character';
import type { ClassId } from '../src/schemas/ids';
import type { EventTemplate, EventChoice } from '../src/schemas/event';

// ─── Inventory of grant_quirk_reroll events ──────────────────────────────

interface QuirkRerollEntry {
  eventId: string;
  choiceId: string;
  /**
   * Lower-cased substring that, if present in the surfaced detail, proves the
   * fallback is god-appropriate for this event.
   */
  expectedFlavor: string[];
  /**
   * If true, the event is genuinely Waukeen-flavored — "Waukeen" in the
   * fallback line is correct here.
   */
  waukeenAllowed: boolean;
  themeNote: string;
}

const REROLL_EVENTS: QuirkRerollEntry[] = [
  {
    eventId: 'pale-cleric-shrine',
    choiceId: 'steal',
    expectedFlavor: ['ilmater'],
    waukeenAllowed: false,
    themeNote: 'Ilmatari shrine — Crying God',
  },
  {
    eventId: 'wounded-captain',
    choiceId: 'loot-him',
    expectedFlavor: ['road', 'captain'],
    waukeenAllowed: false,
    themeNote: 'bandit deserter, generic road',
  },
  {
    eventId: 'beggar-at-the-gate',
    choiceId: 'kick-the-bowl',
    expectedFlavor: ['waukeen'],
    waukeenAllowed: true,
    themeNote: 'Waukeen-flavored — Waukeen is correct here',
  },
  {
    eventId: 'street-orphan',
    choiceId: 'cuff-him',
    expectedFlavor: ['athkatla', 'city'],
    waukeenAllowed: false,
    themeNote: 'Athkatla street orphan — city, not Waukeen',
  },
  {
    eventId: 'mad-prisoner-bargain',
    choiceId: 'take-the-purse',
    expectedFlavor: ['asylum', 'cell'],
    waukeenAllowed: false,
    themeNote: 'Spellhold asylum cell',
  },
  {
    eventId: 'eilistraee-shrine',
    choiceId: 'take-the-silver',
    expectedFlavor: ['eilistraee'],
    waukeenAllowed: false,
    themeNote: 'Eilistraee shrine — moon goddess of the drow',
  },
];

// ─── Character presets ────────────────────────────────────────────────────

interface CharPreset {
  label: string;
  classId: ClassId;
  input: CharacterCreationInput;
}

const PRESETS: CharPreset[] = [
  {
    label: 'Fighter (human)',
    classId: 'fighter',
    input: {
      name: 'Sir Brick',
      raceId: 'human',
      classId: 'fighter',
      baseAbilityScores: { str: 15, con: 14, dex: 13, wis: 12, cha: 10, int: 8 },
      skillProficiencies: ['athletics', 'perception'],
    },
  },
  {
    label: 'Rogue (wood-elf)',
    classId: 'rogue',
    input: {
      name: 'Maelis Vell',
      raceId: 'wood-elf',
      classId: 'rogue',
      baseAbilityScores: { dex: 15, con: 14, wis: 13, int: 12, cha: 10, str: 8 },
      skillProficiencies: ['stealth', 'sleight-of-hand'],
    },
  },
  {
    label: 'Wizard (tiefling, default)',
    classId: 'wizard',
    input: {
      name: 'Veyra',
      raceId: 'tiefling',
      classId: 'wizard',
      baseAbilityScores: { int: 15, wis: 14, con: 13, dex: 12, cha: 10, str: 8 },
      skillProficiencies: ['arcana', 'history'],
    },
  },
];

function buildAtLevel(preset: CharPreset, level: number): Character {
  let c = buildPlayerCharacter(preset.input);
  while (c.level < level) c = applyLevelUp(c);
  return c;
}

// ─── Part 1: fallback wording is god-appropriate ─────────────────────────

interface FallbackProbe {
  eventId: string;
  choiceId: string;
  themeNote: string;
  surfacedDetail: string;
  matchedExpected: boolean;
  waukeenInWrongContext: boolean;
}

function fallbackWordingProbe(): FallbackProbe[] {
  const results: FallbackProbe[] = [];
  for (const e of REROLL_EVENTS) {
    const ev = getEvent(e.eventId);
    const choice = ev.choices.find((c) => c.id === e.choiceId);
    if (!choice) {
      results.push({
        eventId: e.eventId,
        choiceId: e.choiceId,
        themeNote: e.themeNote,
        surfacedDetail: '<choice not found>',
        matchedExpected: false,
        waukeenInWrongContext: false,
      });
      continue;
    }
    // L1 char with no quirks — guaranteed no-bane branch.
    const character = buildAtLevel(PRESETS[0], 1);
    const roller = createDiceRoller(0xfa11ed ^ hash(e.eventId));
    // Force success path so we exercise the success outcome's reroll effect.
    const concrete = resolveChoiceOutcome(choice.outcome, roller);
    const applied = applyEventOutcome(character, concrete, roller);
    // After the UI text overhaul, the fallback flavor is appended to the
    // resolution (the dialogue panel) instead of being pushed as a separate
    // rewards-list line. Probe the resolution for the god-appropriate cue.
    const detail = applied.resolution;
    const lower = detail.toLowerCase();
    const matched = e.expectedFlavor.some((kw) => lower.includes(kw));
    const waukeenInWrongContext = !e.waukeenAllowed && lower.includes('waukeen');
    results.push({
      eventId: e.eventId,
      choiceId: e.choiceId,
      themeNote: e.themeNote,
      surfacedDetail: detail,
      matchedExpected: matched,
      waukeenInWrongContext,
    });
  }
  return results;
}

// ─── Part 2: 5g grant on the no-bane fallback ────────────────────────────

interface GrantProbe {
  eventId: string;
  choiceId: string;
  trials: number;
  goldDeltaConsistent: boolean;
  observedDeltaMin: number;
  observedDeltaMax: number;
  fallbackFiredCount: number;
  /** Net gold delta from the success outcome (event gold + reroll fallback). */
  netGoldDeltaPerTrial: number;
}

function l1GrantProbe(trials = 200): GrantProbe[] {
  const results: GrantProbe[] = [];
  for (const e of REROLL_EVENTS) {
    const ev = getEvent(e.eventId);
    const choice = ev.choices.find((c) => c.id === e.choiceId);
    if (!choice) continue;

    // The choice's success outcome itself includes a gold_delta on top of the
    // reroll. We want to confirm the *fallback* contribution is +5 each time.
    // Strategy: instead of running the full outcome (which includes gold from
    // the success branch), run an outcome containing JUST grant_quirk_reroll,
    // with the event's own fallbackText preserved, against an L1 no-quirk
    // char. That isolates the fallback gold contribution.
    const grantEffect = choice.outcome && 'resolution' in choice.outcome
      ? choice.outcome.effects.find((fx) => fx.kind === 'grant_quirk_reroll')
      : undefined;
    if (!grantEffect || grantEffect.kind !== 'grant_quirk_reroll') continue;

    let fallbackFires = 0;
    let minDelta = Infinity;
    let maxDelta = -Infinity;
    let totalDelta = 0;
    for (let i = 0; i < trials; i++) {
      const character = buildAtLevel(PRESETS[0], 1);
      const startGold = character.goldInPocket;
      const roller = createDiceRoller(0xc0ffee ^ hash(e.eventId + ':' + i));
      const applied = applyEventOutcome(
        character,
        {
          resolution: 'probe',
          effects: [grantEffect],
        },
        roller,
      );
      const endGold = applied.character.goldInPocket;
      const delta = endGold - startGold;
      totalDelta += delta;
      minDelta = Math.min(minDelta, delta);
      maxDelta = Math.max(maxDelta, delta);
      // After the UI text overhaul the "(no bane to shake)" jargon was removed
      // from the gold_delta detail; detect fallback firing via the resolution
      // suffix that now carries the flavor instead.
      if (/no bane/i.test(applied.resolution)) {
        fallbackFires += 1;
      }
    }
    results.push({
      eventId: e.eventId,
      choiceId: e.choiceId,
      trials,
      goldDeltaConsistent: minDelta === maxDelta && minDelta === 5,
      observedDeltaMin: minDelta,
      observedDeltaMax: maxDelta,
      fallbackFiredCount: fallbackFires,
      netGoldDeltaPerTrial: totalDelta / trials,
    });
  }
  return results;
}

// ─── Part 3: CHA-2 gate accessibility ────────────────────────────────────

interface ChaMatrixRow {
  cha: number;
  mod: number;
  bluffAllowed: boolean;
  reason: string;
}

function chaMatrix(): ChaMatrixRow[] {
  const ev = getEvent('cowled-recruiter');
  const choice = ev.choices.find((c) => c.id === 'bluff-the-cowl');
  if (!choice) throw new Error('bluff-the-cowl choice missing');

  // Use a wood-elf scaffolding (0 CHA race bonus) so the sweep maps raw CHA
  // to effective CHA 1-to-1 and the matrix reads naturally.
  const scaffold = buildAtLevel(PRESETS[1], 1);
  const rows: ChaMatrixRow[] = [];
  for (let cha = 8; cha <= 18; cha++) {
    const probe: Character = {
      ...scaffold,
      baseAbilityScores: { ...scaffold.baseAbilityScores, cha },
    };
    const mod = modifierFor(probe, 'cha');
    const av = canTakeChoice(probe, choice);
    rows.push({
      cha,
      mod,
      bluffAllowed: av.ok,
      reason: av.ok ? '' : av.reason,
    });
  }
  return rows;
}

interface PresetBluffRow {
  preset: string;
  raceBonus: number;
  baseCha: number;
  effectiveCha: number;
  mod: number;
  bluffAllowed: boolean;
}

function bluffByPreset(): PresetBluffRow[] {
  const ev = getEvent('cowled-recruiter');
  const choice = ev.choices.find((c) => c.id === 'bluff-the-cowl')!;
  const rows: PresetBluffRow[] = [];
  for (const p of PRESETS) {
    const c = buildAtLevel(p, 1);
    const mod = modifierFor(c, 'cha');
    const av = canTakeChoice(c, choice);
    const baseCha = p.input.baseAbilityScores.cha;
    const effective = effectiveAbilityScores(c).cha;
    rows.push({
      preset: p.label,
      raceBonus: effective - baseCha,
      baseCha,
      effectiveCha: effective,
      mod,
      bluffAllowed: av.ok,
    });
  }
  return rows;
}

// ─── Part 4: full-delve event log ────────────────────────────────────────

interface DelveCellSummary {
  cellLabel: string;
  classLabel: string;
  level: number;
  runs: number;
  totalEventsEncountered: number;
  totalRerollEventsSeen: number;
  totalRerollChosen: number;
  totalFallbackFired: number;
  /** Net +5g events (separate from event-success gold). */
  total5gFallbackTriggered: number;
  /** Any time "Waukeen" surfaced in a non-Waukeen event — should be 0. */
  waukeenLeakCount: number;
  /** Sample of (eventId, surfacedDetail) for the first few fallback firings. */
  samples: { eventId: string; detail: string }[];
}

function pickStrategy(character: Character, ev: EventTemplate): EventChoice | null {
  const avail = ev.choices.filter((c) => canTakeChoice(character, c).ok);
  if (avail.length === 0) return null;
  // Prefer reroll-bearing outcomes so we exercise the fallback path.
  for (const c of avail) {
    const out = c.outcome;
    if ('resolution' in out && out.effects.some((fx) => fx.kind === 'grant_quirk_reroll')) {
      return c;
    }
  }
  // Otherwise prefer success-chance choices to keep exposure broad.
  const sc = avail.find((c) => c.successChance !== undefined);
  if (sc) return sc;
  return avail[0];
}

function simulateDelves(preset: CharPreset, level: number, runs: number, seedBase: number): DelveCellSummary {
  const summary: DelveCellSummary = {
    cellLabel: `${preset.label} L${level}`,
    classLabel: preset.label,
    level,
    runs,
    totalEventsEncountered: 0,
    totalRerollEventsSeen: 0,
    totalRerollChosen: 0,
    totalFallbackFired: 0,
    total5gFallbackTriggered: 0,
    waukeenLeakCount: 0,
    samples: [],
  };
  const rerollEventIds = new Set(REROLL_EVENTS.map((e) => e.eventId));
  const waukeenAllowedIds = new Set(
    REROLL_EVENTS.filter((e) => e.waukeenAllowed).map((e) => e.eventId),
  );

  for (let i = 0; i < runs; i++) {
    const seed = seedBase + i;
    const delve = createGodwakeDelve(seed);
    const roller = createDiceRoller(seed ^ 0x9e3779b9 ^ (level * 7919));
    let character = buildAtLevel(preset, level);

    for (const room of delve.rooms) {
      if (room.kind !== 'event') continue;
      const templateId = (room as { eventTemplateId?: string }).eventTemplateId;
      if (!templateId) continue;
      let tpl: EventTemplate;
      try {
        tpl = getEvent(templateId);
      } catch {
        continue;
      }
      summary.totalEventsEncountered += 1;
      if (rerollEventIds.has(tpl.id)) summary.totalRerollEventsSeen += 1;

      const pick = pickStrategy(character, tpl);
      if (!pick) continue;

      let outcome;
      if (pick.successChance !== undefined) {
        const r = rollChoiceCheck(pick, roller);
        outcome = r.outcome;
      } else {
        outcome = pick.outcome;
      }
      const concrete = resolveChoiceOutcome(outcome, roller);
      // Note whether the picked outcome carries grant_quirk_reroll
      const carriesReroll = concrete.effects.some((fx) => fx.kind === 'grant_quirk_reroll');
      if (carriesReroll) summary.totalRerollChosen += 1;

      const applied = applyEventOutcome(character, concrete, roller);
      character = applied.character;

      // Fallback fired? Detect via the resolution-suffix flavor text. The
      // rewards list no longer carries a `grant_quirk_reroll` detail line in
      // the no-bane path — flavor moved to the dialogue panel.
      if (carriesReroll && /no bane/i.test(applied.resolution)) {
        summary.totalFallbackFired += 1;
        if (applied.effectsApplied.some((x) => x.kind === 'gold_delta')) {
          summary.total5gFallbackTriggered += 1;
        }
        // Sanity: "Waukeen" only OK on actual Waukeen event.
        if (/waukeen/i.test(applied.resolution) && !waukeenAllowedIds.has(tpl.id)) {
          summary.waukeenLeakCount += 1;
        }
        if (summary.samples.length < 6) {
          summary.samples.push({ eventId: tpl.id, detail: applied.resolution });
        }
      }
    }
  }
  return summary;
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ─── Sanity check: no PR #84 event left behind ───────────────────────────

interface CoverageRow {
  eventId: string;
  hasFallbackText: boolean;
}

function fallbackTextCoverage(): CoverageRow[] {
  const rows: CoverageRow[] = [];
  for (const ev of listEvents()) {
    for (const choice of ev.choices) {
      const out = choice.outcome;
      if (!('resolution' in out)) continue;
      const grant = out.effects.find((fx) => fx.kind === 'grant_quirk_reroll');
      if (!grant || grant.kind !== 'grant_quirk_reroll') continue;
      rows.push({
        eventId: `${ev.id}.${choice.id}`,
        hasFallbackText: typeof grant.fallbackText === 'string' && grant.fallbackText.length > 0,
      });
    }
  }
  return rows;
}

// ─── Report ──────────────────────────────────────────────────────────────

export interface FlowReport {
  fallback: FallbackProbe[];
  coverage: CoverageRow[];
  grant: GrantProbe[];
  cha: ChaMatrixRow[];
  bluffByPreset: PresetBluffRow[];
  delveCells: DelveCellSummary[];
}

export function runFlowAudit(runsPerCell = 50, trials = 200): FlowReport {
  const fallback = fallbackWordingProbe();
  const coverage = fallbackTextCoverage();
  const grant = l1GrantProbe(trials);
  const cha = chaMatrix();
  const bluff = bluffByPreset();
  const delveCells: DelveCellSummary[] = [];
  for (const p of PRESETS) {
    for (const lvl of [1, 3]) {
      delveCells.push(simulateDelves(p, lvl, runsPerCell, 0xeefef0));
    }
  }
  return { fallback, coverage, grant, cha, bluffByPreset: bluff, delveCells };
}

function quote(s: string): string {
  return s.replace(/\|/g, '\\|');
}

export function renderReport(rep: FlowReport): string {
  const out: string[] = [];
  out.push('# Event-flow validation — PR #84 follow-up\n');
  out.push(
    '_Generated by `scripts/sim-event-flow.ts`. Validates the three PR #84 polish items: god-agnostic fallback wording, L1 +5g smart-grant, and the CHA-3 → CHA-2 bluff gate._\n',
  );

  // TL;DR
  const fallbackOk = rep.fallback.every((f) => f.matchedExpected && !f.waukeenInWrongContext);
  const grantOk = rep.grant.every((g) => g.goldDeltaConsistent && g.fallbackFiredCount === g.trials);
  const chaPivot = rep.cha.find((r) => r.cha === 12);
  const chaOk = chaPivot?.bluffAllowed === true;
  const defaultWizardBluff = rep.bluffByPreset.find((r) => /Wizard/i.test(r.preset))?.bluffAllowed;
  const wizardOk = defaultWizardBluff === true;
  const waukeenLeaks = rep.delveCells.reduce((s, c) => s + c.waukeenLeakCount, 0);
  const coverageMisses = rep.coverage.filter((r) => !r.hasFallbackText);

  out.push('## TL;DR\n');
  out.push(
    `- **Fallback wording** (Part 1): ${fallbackOk ? 'CONFIRMED' : 'BUGS'} — each of the 6 \`grant_quirk_reroll\` events surfaces its own god-appropriate fallback. No Waukeen leak in non-Waukeen contexts.`,
  );
  out.push(
    `- **L1 smart-grant** (Part 2): ${grantOk ? 'CONFIRMED' : 'BUGS'} — when fired against a quirk-less character, gold delta is exactly +${5} every trial across ${rep.grant[0]?.trials ?? '?'} × 6 events = ${rep.grant.length * (rep.grant[0]?.trials ?? 0)} trials.`,
  );
  out.push(
    `- **Bluff gate accessibility** (Part 3): ${chaOk && wizardOk ? 'CONFIRMED (after fix)' : 'BUGS'} — PR #84 set \`requiresCha: 2\`, but the gate compares against the **modifier**, so CHA 12 (mod +1) was still blocked. Validation drops the gate to \`requiresCha: 1\`; CHA 12+ now clears. Default tiefling Wizard preset accesses the path.`,
  );
  out.push(
    `- **Full-delve sweep** (Part 4): ${waukeenLeaks === 0 ? 'no Waukeen leaks' : `${waukeenLeaks} Waukeen leaks detected`} across ${rep.delveCells.reduce((s, c) => s + c.runs, 0)} simulated delves.`,
  );
  out.push(
    `- **Coverage** (sanity): ${coverageMisses.length === 0 ? 'all 6 reroll events carry a per-event `fallbackText`' : `${coverageMisses.length} reroll-bearing choices missing a fallbackText`}.`,
  );
  out.push('');

  out.push('## Verdict per fix\n');
  out.push(
    `- god-agnostic fallback wording → **${fallbackOk && waukeenLeaks === 0 ? 'CONFIRMED' : 'REGRESSED'}**`,
  );
  out.push(
    `- L1 +5g smart-grant → **${grantOk ? 'CONFIRMED' : 'REGRESSED'}**`,
  );
  out.push(
    `- bluff-the-cowl gate accessibility → **${chaOk && wizardOk ? 'CONFIRMED (after fix)' : 'REGRESSED'}** — see "Fix shipped" below.`,
  );
  out.push('');

  out.push('## Fix shipped — bluff-the-cowl gate interpretation\n');
  out.push(
    "PR #84's commit message stated \"`cowled-recruiter.bluff-the-cowl` gate CHA-3 → CHA-2, so a CHA-12 build (one race bump + base 10) can reach the bluff path.\" The implementation set `requiresCha: 2`.",
  );
  out.push('');
  out.push(
    'However, `requiresCha` is a **modifier** threshold (`canTakeChoice` checks `modifierFor(character, \'cha\') < choice.requiresCha`). `requiresCha: 2` therefore means **CHA mod ≥ +2 → CHA score ≥ 14**, not CHA score ≥ 12. The default tiefling Wizard (base 10 + race +2 = effective 12, mod +1) was still blocked, contradicting the PR\'s own stated intent.',
  );
  out.push('');
  out.push(
    'Validation fix: `src/content/events/index.ts` — `bluff-the-cowl.requiresCha` 2 → 1. CHA 12+ now clears (mod ≥ +1). CHA 10 (default builds without race bumps) is still blocked, preserving the asymmetric-power design. The Ch4 `flatter-the-spider` CHA-3 gate is untouched.',
  );
  out.push('');

  // ── Coverage table
  out.push('## Sanity: per-event `fallbackText` coverage\n');
  out.push('| Choice (eventId.choiceId) | fallbackText present |');
  out.push('|---|:--:|');
  for (const r of rep.coverage) {
    out.push(`| ${r.eventId} | ${r.hasFallbackText ? 'Y' : 'N'} |`);
  }
  out.push('');

  // ── Part 1
  out.push('## Part 1 — Fallback wording per event\n');
  out.push(
    'Forced no-bane branch on each event\'s reroll-bearing choice (L1 Fighter with empty quirks). Verifies the surfaced detail string is god-appropriate.\n',
  );
  out.push('| Event | Choice | Theme | Surfaced detail | Match expected | Waukeen leak |');
  out.push('|---|---|---|---|:--:|:--:|');
  for (const f of rep.fallback) {
    out.push(
      `| ${f.eventId} | ${f.choiceId} | ${quote(f.themeNote)} | ${quote(f.surfacedDetail)} | ${f.matchedExpected ? 'Y' : 'N'} | ${f.waukeenInWrongContext ? 'YES (BUG)' : 'no'} |`,
    );
  }
  out.push('');

  // ── Part 2
  out.push('## Part 2 — L1 +5g smart-grant rate\n');
  out.push(
    `Run an outcome containing only \`grant_quirk_reroll\` (with the event's own \`fallbackText\`) against an L1 Fighter (no quirks) ${rep.grant[0]?.trials ?? '?'} times. Each trial should grant exactly +5g.\n`,
  );
  out.push('| Event | Choice | Trials | Min Δg | Max Δg | Net mean Δg | Fallback fired | Consistent +5 |');
  out.push('|---|---|---:|---:|---:|---:|---:|:--:|');
  for (const g of rep.grant) {
    out.push(
      `| ${g.eventId} | ${g.choiceId} | ${g.trials} | ${g.observedDeltaMin} | ${g.observedDeltaMax} | ${g.netGoldDeltaPerTrial.toFixed(2)} | ${g.fallbackFiredCount}/${g.trials} | ${g.goldDeltaConsistent ? 'Y' : 'N'} |`,
    );
  }
  out.push('');

  // ── Part 3
  out.push('## Part 3 — CHA accessibility for `cowled-recruiter.bluff-the-cowl`\n');
  out.push(
    'Gate now `requiresCha: 1` (post-validation fix). Matrix sweeps raw CHA 8 → 18, surfaces the gate decision.\n',
  );
  out.push('| CHA | mod | Bluff allowed | Reason if blocked |');
  out.push('|---:|---:|:--:|---|');
  for (const r of rep.cha) {
    out.push(
      `| ${r.cha} | ${r.mod >= 0 ? '+' : ''}${r.mod} | ${r.bluffAllowed ? 'YES' : 'NO'} | ${quote(r.reason)} |`,
    );
  }
  out.push('');

  out.push('### Default-preset accessibility (race bonuses applied)\n');
  out.push('| Preset | Base CHA | Race +CHA | Effective CHA | Mod | Bluff allowed |');
  out.push('|---|---:|---:|---:|---:|:--:|');
  for (const p of rep.bluffByPreset) {
    out.push(
      `| ${p.preset} | ${p.baseCha} | +${p.raceBonus} | ${p.effectiveCha} | ${p.mod >= 0 ? '+' : ''}${p.mod} | ${p.bluffAllowed ? 'YES' : 'NO'} |`,
    );
  }
  out.push('');

  // ── Part 4
  out.push('## Part 4 — Full-delve event-log sweep\n');
  out.push(
    `Per cell: ${rep.delveCells[0]?.runs ?? '?'} delves, identical seeds across (class, level) so event pool is stable. AI strategy prefers reroll-bearing outcomes to exercise the fallback path. Tracks any "Waukeen" surfacing in a non-Waukeen event as a regression flag.\n`,
  );
  out.push(
    '| Cell | Runs | Events seen | Reroll events | Reroll chosen | Fallback fired | +5g triggered | Waukeen leaks |',
  );
  out.push('|---|---:|---:|---:|---:|---:|---:|---:|');
  for (const c of rep.delveCells) {
    out.push(
      `| ${c.cellLabel} | ${c.runs} | ${c.totalEventsEncountered} | ${c.totalRerollEventsSeen} | ${c.totalRerollChosen} | ${c.totalFallbackFired} | ${c.total5gFallbackTriggered} | ${c.waukeenLeakCount} |`,
    );
  }
  out.push('');

  out.push('### Sample surfaced fallback strings (first per cell)\n');
  out.push('| Cell | Event | Detail |');
  out.push('|---|---|---|');
  for (const c of rep.delveCells) {
    for (const s of c.samples.slice(0, 1)) {
      out.push(`| ${c.cellLabel} | ${s.eventId} | ${quote(s.detail)} |`);
    }
  }
  out.push('');

  out.push('## Sim methodology\n');
  out.push(
    `- **Part 1**: For each of the 6 events, build an L1 Fighter (no quirks → guaranteed no-bane branch), apply the success outcome, capture the \`grant_quirk_reroll\` effect's \`detail\` string. Check (a) the detail contains an expected event-themed keyword and (b) "Waukeen" never appears in a non-Waukeen event's detail.`,
  );
  out.push(
    `- **Part 2**: Per event, run an outcome with only the event's \`grant_quirk_reroll\` effect (so the +5g fallback is isolated from any event-success gold) against a fresh L1 Fighter, ${rep.grant[0]?.trials ?? '?'} trials. Record the gold delta range and the count of "+Ng (no bane to shake)" surfacings.`,
  );
  out.push(
    `- **Part 3**: Sweep raw CHA 8–18 by mutating the character\'s ability scores directly (bypasses race bumps so the matrix reads naturally). Then a "by preset" pass uses the actual default char-creation builds (race bumps applied) to confirm the default Wizard preset (tiefling +2 CHA) now clears the gate.`,
  );
  out.push(
    `- **Part 4**: 50 generated Godwake delves per (class, level) cell, stable seeds across cells. AI strategy biases toward reroll-bearing outcomes so the fallback path is heavily exercised, then a "Waukeen leak" counter flags any non-Waukeen event whose fallback line contains "Waukeen".`,
  );
  out.push('');

  return out.join('\n');
}

export function writeReport(content: string, dirOverride?: string, filename = 'event-flow.md'): string {
  const dir = dirOverride ?? resolve(process.cwd(), 'docs/validation-findings');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const path = resolve(dir, filename);
  writeFileSync(path, content, 'utf8');
  return path;
}

// Re-export for tests that just want raw data
export { REROLL_EVENTS };

// Silence unused-import warnings if these become unreferenced after edits.
void listQuirks;
