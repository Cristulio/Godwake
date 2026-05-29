import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CharacterCreationScreen } from './CharacterCreationScreen';
import { useGameStore } from '../../stores/gameStore';
import { getClass } from '../../content/classes';

function resetStore() {
  // No existing character = first-life creation (commit → intro), not a swap.
  useGameStore.setState({
    screen: 'character-creation',
    character: null,
    delve: null,
    combat: null,
    introSeen: false,
    hasReincarnated: false,
    deathCount: 0,
  });
}

describe('CharacterCreationScreen — selection', () => {
  beforeEach(resetStore);

  it('renders all three soul cards', () => {
    render(<CharacterCreationScreen />);
    expect(screen.getByRole('heading', { name: /choose a soul/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sir brick/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /maelis vell/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /veyra ash/i })).toBeInTheDocument();
  });

  it('has no point-buy or multi-step controls', () => {
    render(<CharacterCreationScreen />);
    expect(screen.queryByRole('button', { name: /^next/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/pts? left/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /preset/i })).not.toBeInTheDocument();
  });

  it('confirm is disabled until a soul is picked', () => {
    render(<CharacterCreationScreen />);
    expect(screen.getByRole('button', { name: /choose a soul/i })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /maelis vell/i }));
    expect(
      screen.getByRole('button', { name: /begin as maelis vell/i }),
    ).not.toBeDisabled();
  });

  it('picking Sir Brick commits the fixed Fighter block (Human, fixed stats)', () => {
    render(<CharacterCreationScreen />);
    fireEvent.click(screen.getByRole('button', { name: /sir brick/i }));
    fireEvent.click(screen.getByRole('button', { name: /begin/i }));
    const char = useGameStore.getState().character!;
    const preset = getClass('fighter').preset!;
    expect(char.name).toBe('Sir Brick');
    expect(char.classId).toBe('fighter');
    expect(char.raceId).toBe('human');
    expect(char.baseAbilityScores).toEqual(preset.abilityScores);
    expect([...char.skillProficiencies].sort()).toEqual(
      [...preset.recommendedSkills].sort(),
    );
  });

  it('picking Veyra Ash commits the fixed Wizard INT block + Tiefling', () => {
    render(<CharacterCreationScreen />);
    fireEvent.click(screen.getByRole('button', { name: /veyra ash/i }));
    fireEvent.click(screen.getByRole('button', { name: /begin/i }));
    const char = useGameStore.getState().character!;
    const preset = getClass('wizard').preset!;
    expect(char.classId).toBe('wizard');
    expect(char.raceId).toBe(preset.recommendedRaceId);
    expect(char.baseAbilityScores).toEqual(preset.abilityScores);
  });
});
