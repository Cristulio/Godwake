import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SpoilsScreen } from './SpoilsScreen';
import { useGameStore } from '../../stores/gameStore';
import { createCharacter, STANDARD_ARRAY } from '../../engine/character/initialize';
import type { Character } from '../../types/character';
import type { LootSummary } from '../../stores/delveStore';

function makeFighter(extra: Partial<Character> = {}): Character {
  return {
    ...createCharacter({
      id: 'spoils-fighter',
      name: 'Brick',
      raceId: 'human',
      classId: 'fighter',
      baseAbilityScores: {
        str: STANDARD_ARRAY[0],
        con: STANDARD_ARRAY[1],
        dex: STANDARD_ARRAY[2],
        wis: STANDARD_ARRAY[3],
        cha: STANDARD_ARRAY[4],
        int: STANDARD_ARRAY[5],
      },
      skillProficiencies: ['athletics', 'perception'],
    }),
    ...extra,
  };
}

const lootWithItem: LootSummary = {
  gold: 12,
  xp: 40,
  items: [{ name: 'Rusted Blade', rarity: 'green', description: '+1 to hit' }],
  renown: 3,
};

describe('SpoilsScreen — level-up is forced before the pack', () => {
  beforeEach(() => {
    useGameStore.setState({ combat: null, delve: null });
  });

  it('offers ONLY the level-up action — no pack bypass — when a level-up is owed', () => {
    // Level 3 carrying L4 XP (xpForLevel(4) = 1000) → a level-up is owed.
    useGameStore.setState({
      character: makeFighter({ level: 3, xp: 1000 }),
      lastLoot: lootWithItem,
    });

    render(<SpoilsScreen />);

    expect(screen.getByRole('button', { name: /level up/i })).toBeInTheDocument();
    // The "Open Pack Instead" shortcut would let the player skip the owed
    // level-up and start another fight — it must not be offered here.
    expect(screen.queryByText(/open pack instead/i)).toBeNull();
  });

  it('keeps the pack shortcut when nothing is owed (normal spoils flow unchanged)', () => {
    useGameStore.setState({
      character: makeFighter({ level: 3, xp: 0 }),
      lastLoot: lootWithItem,
    });

    render(<SpoilsScreen />);

    expect(screen.getByRole('button', { name: /^accept/i })).toBeInTheDocument();
    expect(screen.getByText(/open pack instead/i)).toBeInTheDocument();
  });
});
