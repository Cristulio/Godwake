import { describe, it, expect } from 'vitest';
import { combatIntroEligible, type CombatIntroGate } from './CombatCoach';
import { COMBAT_INTRO_TUTORIAL_ID } from '../../content/tutorials';

const FRESH_STARTER: CombatIntroGate = {
  hasReincarnated: false,
  seenTutorials: [],
  classId: 'fighter',
  scene: 'combat',
};

describe('combatIntroEligible — first-combat coach gate', () => {
  it('fires on a brand-new soul’s first combat, for every starter class', () => {
    expect(combatIntroEligible(FRESH_STARTER)).toBe(true);
    expect(combatIntroEligible({ ...FRESH_STARTER, classId: 'barbarian' })).toBe(true);
    expect(combatIntroEligible({ ...FRESH_STARTER, classId: 'ranger' })).toBe(true);
  });

  it('is gated OFF once the seen-flag is set', () => {
    expect(
      combatIntroEligible({ ...FRESH_STARTER, seenTutorials: [COMBAT_INTRO_TUTORIAL_ID] }),
    ).toBe(false);
  });

  it('never fires on a non-first life (the soul has already reincarnated)', () => {
    expect(combatIntroEligible({ ...FRESH_STARTER, hasReincarnated: true })).toBe(false);
  });

  it('never fires for a non-starter class', () => {
    expect(combatIntroEligible({ ...FRESH_STARTER, classId: 'wizard' })).toBe(false);
    expect(combatIntroEligible({ ...FRESH_STARTER, classId: 'rogue' })).toBe(false);
    expect(combatIntroEligible({ ...FRESH_STARTER, classId: 'druid' })).toBe(false);
  });

  it('does not teach basics on a boss as the first encounter', () => {
    expect(combatIntroEligible({ ...FRESH_STARTER, scene: 'boss' })).toBe(false);
  });
});
