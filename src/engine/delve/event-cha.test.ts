import { describe, it, expect } from 'vitest';
import { createCharacter } from '../character/initialize';
import { modifierFor } from '../character/derived';
import { rollChoiceCheck } from './applyEventOutcome';
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
    label: 'skill test',
    outcome: { resolution: 'ok', effects: [] },
    ...opts,
  };
}


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
    expect(speak?.failureOutcome).toBeDefined();
  });
});
