import { describe, it, expect } from 'vitest';
import { createCharacter } from '../character/initialize';
import { modifierFor } from '../character/derived';
import { canTakeChoice } from './applyEventOutcome';
import type { EventChoice } from '../../schemas/event';
import type { Character } from '../../types/character';

function makeWizard(raceId: 'half-elf' | 'tiefling', cha: number): Character {
  return createCharacter({
    id: `${raceId}-wiz`,
    name: 'Caster',
    raceId,
    classId: 'wizard',
    baseAbilityScores: {
      str: 8,
      dex: 12,
      con: 13,
      int: 15,
      wis: 10,
      cha,
    },
    skillProficiencies: ['arcana', 'history'],
  });
}

function choice(opts: Partial<EventChoice>): EventChoice {
  return {
    id: 'test-choice',
    label: '[Charisma] test',
    outcome: { resolution: 'ok', effects: [] },
    ...opts,
  };
}

/**
 * (9) CHA-gated event option visibility. requiresCha gates on the EFFECTIVE
 * CHA modifier (modifierFor(c, 'cha')) — race bonuses apply, so the input is
 * the post-race score, not the base.
 */
describe('CHA-gated event options — visibility threshold (PR #58 wiring)', () => {
  it('Half-Elf wizard with effective CHA 12 (+1 mod) is hidden at requiresCha: 2', () => {
    // Half-Elf adds +2 CHA. Base 10 → effective 12 → mod +1.
    const c = makeWizard('half-elf', 10);
    expect(modifierFor(c, 'cha')).toBe(1);
    const av = canTakeChoice(c, choice({ requiresCha: 2 }));
    expect(av.ok).toBe(false);
    if (!av.ok) expect(av.gate).toBe('cha');
  });

  it('Tiefling wizard with effective CHA 13 (+1 mod) is also hidden at requiresCha: 2', () => {
    // Tiefling adds +2 CHA. Base 11 → effective 13 → mod +1.
    const c = makeWizard('tiefling', 11);
    expect(modifierFor(c, 'cha')).toBe(1);
    const av = canTakeChoice(c, choice({ requiresCha: 2 }));
    expect(av.ok).toBe(false);
  });

  it('Tiefling wizard with effective CHA 14 (+2 mod) is now visible at requiresCha: 2', () => {
    // Base 12 + 2 (Tiefling) = 14 → mod +2.
    const c = makeWizard('tiefling', 12);
    expect(modifierFor(c, 'cha')).toBe(2);
    const av = canTakeChoice(c, choice({ requiresCha: 2 }));
    expect(av.ok).toBe(true);
  });

  it('requiresCha: 0 admits any modifier (sanity)', () => {
    const c = makeWizard('half-elf', 8); // effective 10 → mod 0
    expect(modifierFor(c, 'cha')).toBe(0);
    const av = canTakeChoice(c, choice({ requiresCha: 0 }));
    expect(av.ok).toBe(true);
  });
});

/**
 * (10) CHA save-style event outcome. The brief asked for a chaCheck: { dc: 13 }
 * roll-based gate. The current engine has NO such field — events only gate on
 * a static CHA modifier via `requiresCha`. No d20 save flow exists for events.
 *
 * Per the brief's escape clause ("If the test fails because the production
 * code has a real bug — or in this case, an unimplemented feature — add
 * `it.skip` with a TODO. Don't modify production code."), this test stays
 * skipped until the chaCheck system is built. See `applyEventOutcome.ts` and
 * `schemas/event.ts` — neither has a save-roll concept for event options.
 */
describe('CHA save-style event outcome — not yet implemented', () => {
  it.skip(
    'rolls a d20 + CHA mod vs a chaCheck DC and routes to pass / fail outcomes (TODO: feature not built; see schemas/event.ts — no chaCheck field exists)',
    () => {
      // Intentionally blank — flagged as a missing feature, not a bug.
    },
  );
});
