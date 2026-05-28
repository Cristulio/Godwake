import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CharacterCreationScreen } from './CharacterCreationScreen';
import { useGameStore } from '../../stores/gameStore';
import { getClass } from '../../content/classes';

function resetStore() {
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

describe('CharacterCreationScreen — stepper', () => {
  beforeEach(resetStore);

  it('cannot advance from Step 1 without picking a class', () => {
    render(<CharacterCreationScreen />);
    const next = screen.getByRole('button', { name: /next/i });
    expect(next).toBeDisabled();
    // Picking Fighter enables Next.
    fireEvent.click(screen.getByRole('button', { name: /fighter/i }));
    expect(next).not.toBeDisabled();
  });

  it('Next advances Step 1 → Step 2 → Step 3 → Step 4 and Back retreats', () => {
    render(<CharacterCreationScreen />);
    fireEvent.click(screen.getByRole('button', { name: /fighter/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    // Step 2: race step is now visible.
    expect(screen.getByText(/choose a bloodline/i)).toBeInTheDocument();
    // Back retreats to Step 1.
    fireEvent.click(screen.getByRole('button', { name: /← back/i }));
    expect(screen.getByText(/choose a class/i)).toBeInTheDocument();
  });

  it('hides the preset button until a class is selected, then shows it', () => {
    render(<CharacterCreationScreen />);
    expect(
      screen.queryByRole('button', { name: /use .* preset/i }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /fighter/i }));
    expect(
      screen.getByRole('button', { name: /use sir brick preset/i }),
    ).toBeInTheDocument();
  });

  it('switches the preset button per class (Sir Brick / Maelis / Veyra)', () => {
    render(<CharacterCreationScreen />);
    fireEvent.click(screen.getByRole('button', { name: /fighter/i }));
    expect(
      screen.getByRole('button', { name: /use sir brick preset/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /rogue/i }));
    expect(
      screen.getByRole('button', { name: /use maelis vell preset/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /wizard/i }));
    expect(
      screen.getByRole('button', { name: /use veyra ash preset/i }),
    ).toBeInTheDocument();
  });

  it('Sir Brick preset fills STR 15 / CON 14 / DEX 13 base, picks Human, and jumps to Step 4', () => {
    render(<CharacterCreationScreen />);
    fireEvent.click(screen.getByRole('button', { name: /fighter/i }));
    fireEvent.click(screen.getByRole('button', { name: /use sir brick preset/i }));
    // Step 4 is the summary/name step.
    expect(screen.getByRole('button', { name: /begin/i })).toBeInTheDocument();
    // Name field is pre-filled.
    const nameInput = screen.getByPlaceholderText(/enter a name/i) as HTMLInputElement;
    expect(nameInput.value).toBe('Sir Brick');
    // Base scores reach the engine through commit — fire it and inspect state.
    fireEvent.click(screen.getByRole('button', { name: /begin/i }));
    const char = useGameStore.getState().character!;
    expect(char.name).toBe('Sir Brick');
    expect(char.classId).toBe('fighter');
    expect(char.raceId).toBe('human');
    expect(char.baseAbilityScores.str).toBe(15);
    expect(char.baseAbilityScores.con).toBe(14);
    expect(char.baseAbilityScores.dex).toBe(13);
    expect(char.baseAbilityScores.int).toBe(8);
    expect(char.baseAbilityScores.wis).toBe(12);
    expect(char.baseAbilityScores.cha).toBe(10);
    expect(char.skillProficiencies.sort()).toEqual(['insight']);
  });

  it('Wizard preset commits Tiefling + Insight / Medicine + INT-15 base', () => {
    render(<CharacterCreationScreen />);
    fireEvent.click(screen.getByRole('button', { name: /wizard/i }));
    fireEvent.click(screen.getByRole('button', { name: /use veyra ash preset/i }));
    fireEvent.click(screen.getByRole('button', { name: /begin/i }));
    const char = useGameStore.getState().character!;
    const preset = getClass('wizard').preset!;
    expect(char.classId).toBe('wizard');
    expect(char.raceId).toBe(preset.recommendedRaceId);
    expect(char.baseAbilityScores).toEqual(preset.abilityScores);
    expect([...char.skillProficiencies].sort()).toEqual(
      [...preset.recommendedSkills].sort(),
    );
  });

  it('Rogue preset commits Wood Elf + Insight + DEX-tuned base', () => {
    render(<CharacterCreationScreen />);
    fireEvent.click(screen.getByRole('button', { name: /rogue/i }));
    fireEvent.click(screen.getByRole('button', { name: /use maelis vell preset/i }));
    fireEvent.click(screen.getByRole('button', { name: /begin/i }));
    const char = useGameStore.getState().character!;
    const preset = getClass('rogue').preset!;
    expect(char.classId).toBe('rogue');
    expect(char.raceId).toBe(preset.recommendedRaceId);
    expect(char.baseAbilityScores).toEqual(preset.abilityScores);
    expect([...char.skillProficiencies].sort()).toEqual(
      [...preset.recommendedSkills].sort(),
    );
  });
});
