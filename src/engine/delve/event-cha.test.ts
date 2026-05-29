import { describe, it, expect } from 'vitest';
import { createCharacter } from '../character/initialize';
import { modifierFor } from '../character/derived';
import { canTakeChoice, rollChoiceCheck } from './applyEventOutcome';
import { getEvent } from '../../content/events';
import type { EventChoice } from '../../schemas/event';
import type { Character } from '../../types/character';
import type { DiceRoller } from '../dice';
import type { RollResult } from '../../types/dice';

/** A roller pinned to a single d20 face, for deterministic skill-check routing. */
function fixedD20(face: number): DiceRoller {
  const result: RollResult = {
    expression: { count: 1, die: 20, modifier: 0 },
    rolls: [face],
    modifier: 0,
    total: face,
    natural20: face === 20,
    natural1: face === 1,
    advantage: 'normal',
  };
  return { roll: () => result, d20: () => result, serialize: () => ({ state: 0 }) };
}

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
 * (10) Skill-check event outcome — now built. `rollChoiceCheck` rolls a d20 +
 * the skill's ability modifier + proficiency against the choice's `skillCheck.dc`
 * and routes pass → `outcome`, fail → `failureOutcome`. This is what makes the
 * CHA skills (and the WIS/STR ones) actually pay off in events.
 */
describe('skill-check event outcome — d20 routing', () => {
  function checkChoice(): EventChoice {
    return choice({
      skillCheck: { skill: 'persuasion', dc: 12 },
      outcome: { resolution: 'won', effects: [{ kind: 'gold_delta', amount: 10 }] },
      failureOutcome: { resolution: 'lost', effects: [{ kind: 'hp_delta', amount: -3 }] },
    });
  }

  it('a clearing roll routes to the success outcome and reports the tally', () => {
    // Tiefling base CHA 14 → effective 16 → mod +3. d20 18 + 3 = 21 ≥ 12.
    const c = makeWizard('tiefling', 14);
    const res = rollChoiceCheck(checkChoice(), fixedD20(18), c);
    expect(res.succeeded).toBe(true);
    expect(res.outcome).toMatchObject({ resolution: 'won' });
    expect(res.skillCheck?.skill).toBe('persuasion');
    expect(res.skillCheck?.passed).toBe(true);
    expect(res.skillCheck?.total).toBe(18 + modifierFor(c, 'cha'));
  });

  it('a missed roll routes to the failure outcome', () => {
    const c = makeWizard('half-elf', 8); // low CHA, untrained
    const res = rollChoiceCheck(checkChoice(), fixedD20(3), c);
    expect(res.succeeded).toBe(false);
    expect(res.outcome).toMatchObject({ resolution: 'lost' });
    expect(res.skillCheck?.passed).toBe(false);
  });

  it('skill proficiency lifts the same roll over the DC', () => {
    // Half-Elf base CHA 8 → effective 10 → mod 0. A bare 12 clears DC 12 only
    // because proficiency (+2 at L1) is added on top.
    const bare = makeWizard('half-elf', 8);
    const trained: Character = { ...bare, skillProficiencies: [...bare.skillProficiencies, 'persuasion'] };
    expect(rollChoiceCheck(checkChoice(), fixedD20(10), bare).succeeded).toBe(false);
    expect(rollChoiceCheck(checkChoice(), fixedD20(10), trained).succeeded).toBe(true);
  });

  it('a real event (pale-cleric speak-gently) is a persuasion check with both branches', () => {
    const ev = getEvent('pale-cleric-shrine');
    const speak = ev.choices.find((c) => c.id === 'speak-gently');
    expect(speak?.skillCheck?.skill).toBe('persuasion');
    expect(speak?.requiresCha).toBeUndefined();
    expect(speak?.failureOutcome).toBeDefined();
  });
});
