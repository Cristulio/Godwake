import { describe, it, expect } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { ActionBar } from './ActionBar';
import { maxAttacksPerAction } from '../../engine/combat/attack/playerAttack';
import { createCharacter, STANDARD_ARRAY } from '../../engine/character/initialize';
import { applyLevelUp } from '../../engine/character/leveling';
import type { Character } from '../../types/character';
import type { CombatState } from '../../types/combat';

const handlers = {
  onAttack: () => {},
  onSecondWind: () => {},
  onActionSurge: () => {},
  onMartialOffense: () => {},
  onMartialDefense: () => {},
  onMartialDisrupt: () => {},
  onCunningAction: () => {},
  onRage: () => {},
  onRecklessAttack: () => {},
  onFlurry: () => {},
  onPatientDefense: () => {},
  onStunningStrike: () => {},
  onHuntersMark: () => {},
  onSpells: () => {},
  onUseItem: () => {},
  onEndTurn: () => {},
};

function playerTurnState(overrides: Partial<CombatState> = {}): CombatState {
  return {
    combatants: [],
    turnOrder: ['player'],
    currentTurnIndex: 0,
    round: 1,
    log: [],
    status: 'active',
    attackEventCounter: 0,
    playerHasAttacked: false,
    rerollMissesEncounterRemaining: 0,
    playerAttacksThisTurn: 0,
    ...overrides,
  };
}

// Default createCharacter leaves mainHand null, so maxAttacksPerAction reads
// purely off the class mechanic — exactly the swing tiers we want to assert.
function fighterAt(levelUps: number): Character {
  let f = createCharacter({
    id: 'ab-fighter',
    name: 'Test',
    raceId: 'human',
    classId: 'fighter',
    baseAbilityScores: {
      str: STANDARD_ARRAY[0],
      dex: STANDARD_ARRAY[2],
      con: STANDARD_ARRAY[1],
      int: STANDARD_ARRAY[5],
      wis: STANDARD_ARRAY[3],
      cha: STANDARD_ARRAY[4],
    },
    skillProficiencies: ['athletics', 'intimidation'],
  });
  for (let i = 0; i < levelUps; i++) f = applyLevelUp(f);
  return f;
}

function characterOfClass(classId: Character['classId']): Character {
  return createCharacter({
    id: `ab-${classId}`,
    name: 'Test',
    raceId: 'human',
    classId,
    baseAbilityScores: {
      str: STANDARD_ARRAY[0],
      dex: STANDARD_ARRAY[2],
      con: STANDARD_ARRAY[1],
      int: STANDARD_ARRAY[5],
      wis: STANDARD_ARRAY[3],
      cha: STANDARD_ARRAY[4],
    },
    skillProficiencies: ['athletics', 'intimidation'],
  });
}

function hasSpellsButton(character: Character): boolean {
  const { container } = render(
    <ActionBar character={character} state={playerTurnState()} {...handlers} />,
  );
  const present = Array.from(container.querySelectorAll('button')).some((b) =>
    (b.textContent ?? '').includes('Spells'),
  );
  cleanup();
  return present;
}

function attackLabel(character: Character): string {
  const { container } = render(
    <ActionBar character={character} state={playerTurnState()} {...handlers} />,
  );
  const text = container.querySelector('[data-tutorial="attack"]')?.textContent ?? '';
  cleanup();
  return text;
}

describe('ActionBar attack label', () => {
  // The denominator must track the real swing count (maxAttacksPerAction), not a
  // hardcoded /2 — an L11+ Fighter swings 3-4 times per Attack action.
  it('uses maxAttacksPerAction as the denominator — 1 / 2 / 3 / 4 by mechanic', () => {
    const cases = [
      { levelUps: 0, expected: 1 }, // L1  — no Extra Attack
      { levelUps: 4, expected: 2 }, // L5  — Extra Attack
      { levelUps: 10, expected: 3 }, // L11 — Relentless Assault
      { levelUps: 19, expected: 4 }, // L20 — Unstoppable
    ];
    for (const { levelUps, expected } of cases) {
      const f = fighterAt(levelUps);
      expect(maxAttacksPerAction(f)).toBe(expected);

      const label = attackLabel(f);
      if (expected > 1) {
        // Start of turn (0 swings made) → "1/<max>"; the denominator is the max.
        expect(label).toContain(`1/${expected}`);
      } else {
        // No Extra Attack: a plain Attack with no swing-count fraction.
        expect(label).toContain('Attack');
        expect(label).not.toContain('/');
      }
    }
  });
});

describe('ActionBar spell button gating', () => {
  // The manual cast UI is surfaced for every full caster (Wizard + Druid) —
  // the Druid was previously locked out and could only cast via AUTO. Martials
  // never get the button.
  it('shows the SPELLS button for full casters, not for martials', () => {
    expect(hasSpellsButton(characterOfClass('wizard'))).toBe(true);
    expect(hasSpellsButton(characterOfClass('druid'))).toBe(true);
    expect(hasSpellsButton(characterOfClass('fighter'))).toBe(false);
    expect(hasSpellsButton(characterOfClass('rogue'))).toBe(false);
  });
});
