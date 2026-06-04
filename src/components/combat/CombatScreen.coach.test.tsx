import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { CombatScreen } from './CombatScreen';
import { combatIntroEligible } from './CombatCoach';
import { useMetaStore } from '../../stores/metaStore';
import { buildPlayerCharacter, presetCreationInput } from '../../engine/character/defaultCharacter';
import { createCombat } from '../../engine/combat';
import { createDiceRoller } from '../../engine/dice';
import { getMonster } from '../../content/monsters';
import { COMBAT_INTRO_TUTORIAL_ID } from '../../content/tutorials';
import type { ClassId } from '../../schemas/ids';
import type { Character } from '../../types/character';

/**
 * Regression guard for the first-combat coach being a STRICTLY one-time
 * onboarding. The bug: the seen-flag was written only by finishCoach (explicit
 * Skip/Dismiss), so a player who simply played the first fight through — never
 * dismissing — left it unset and the coach re-appeared every later fight. The
 * fix writes the flag the moment the coach activates on mount, so a second
 * combat is ineligible whether or not the first was dismissed.
 *
 * jsdom lacks ResizeObserver (CombatScreen's mobile-scale layout effect) and we
 * pin requestAnimationFrame to a non-firing stub so the coach's rect-tracking
 * loop doesn't churn — the seen-flag is written by the mount effect regardless
 * of whether the spotlight ever paints.
 */

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
});

afterAll(() => {
  vi.unstubAllGlobals();
});

beforeEach(() => {
  useMetaStore.setState({ hasReincarnated: false, seenTutorials: [] });
});

afterEach(() => {
  cleanup();
});

function make(classId: ClassId): Character {
  return buildPlayerCharacter(presetCreationInput(classId));
}

function arena(character: Character) {
  return createCombat({
    roller: createDiceRoller(1),
    character,
    monsters: [{ def: getMonster('goblin') }],
  });
}

function renderCombat(character: Character) {
  const { state } = arena(character);
  return render(
    <CombatScreen character={character} state={state} onCombatResolved={() => {}} scene="combat" />,
  );
}

describe('CombatScreen — first-combat coach is strictly one-time', () => {
  it('writes the seen-flag on activation (no dismiss), so a second combat is ineligible', () => {
    const gate = {
      hasReincarnated: false,
      seenTutorials: [] as string[],
      classId: 'wizard' as ClassId,
      scene: 'combat' as const,
    };
    // A brand-new soul IS eligible for its very first combat.
    expect(combatIntroEligible(gate)).toBe(true);

    // Play the first combat: mount the screen, do NOT touch Skip / "Got it".
    renderCombat(make('wizard'));

    const seen = useMetaStore.getState().seenTutorials;
    expect(seen).toContain(COMBAT_INTRO_TUTORIAL_ID);

    // The very next combat for the same soul is no longer eligible.
    expect(combatIntroEligible({ ...gate, seenTutorials: seen })).toBe(false);
  });

  it('does not mark seen when the coach is not eligible (a veteran soul)', () => {
    useMetaStore.setState({ hasReincarnated: true, seenTutorials: [] });
    renderCombat(make('wizard'));
    expect(useMetaStore.getState().seenTutorials).not.toContain(COMBAT_INTRO_TUTORIAL_ID);
  });
});
