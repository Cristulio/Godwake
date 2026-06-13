import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { LevelUpScreen } from './LevelUpScreen';
import { useGameStore } from '../../stores/gameStore';
import { createCharacter } from '../../engine/character/initialize';
import type { Character } from '../../types/character';
import type { AbilityScores } from '../../types/abilities';

// The level-up sting lazy-loads the synth module on mount; stub it so the test
// renders without touching Web Audio.
vi.mock('../../engine/audio', () => ({ playSfx: () => {} }));

/**
 * A fighter one level below an ASI (L3 → L4 grants the ASI). Subclass is pinned
 * so the archetype picker doesn't also render. Human's +1-across lifts the base
 * scores by one, so `str: 18` lands at an effective 19 — one point shy of the
 * cap, the cleanest case for the 18+ cost and the 20 ceiling.
 */
function fighterAtAsi(base: AbilityScores): Character {
  const c = createCharacter({
    id: 'lvl',
    name: 'Brick',
    raceId: 'human',
    classId: 'fighter',
    baseAbilityScores: base,
  });
  return { ...c, level: 3, subclassId: 'champion' };
}

const LOW: AbilityScores = { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 };

describe('LevelUpScreen — skills removed', () => {
  it('renders no skill-proficiency picker at an ASI level', () => {
    useGameStore.setState({ character: fighterAtAsi(LOW) });
    render(<LevelUpScreen />);
    // The ASI panel is present (its point-spend copy is unique to the panel)…
    expect(screen.getByText(/costs 2 per point/i)).toBeInTheDocument();
    // …but the old skill-proficiency picker is gone.
    expect(screen.queryByText(/skill proficiency/i)).not.toBeInTheDocument();
  });
});

describe('LevelUpScreen — school chooser bottom lines', () => {
  function unchosenAt(classId: 'fighter' | 'bard' | 'paladin', level: number): Character {
    const c = createCharacter({
      id: 'pick',
      name: 'Pick',
      raceId: 'human',
      classId,
      baseAbilityScores: LOW,
    });
    return { ...c, level };
  }

  it('fighter chooser renders every school with its archetype chip + levers, no contrast header', () => {
    useGameStore.setState({ character: unchosenAt('fighter', 1) });
    render(<LevelUpScreen />);

    expect(screen.getByText('Striker')).toBeInTheDocument();
    expect(screen.getByText('Two-Blades')).toBeInTheDocument();
    expect(screen.getByText('Tank')).toBeInTheDocument();
    // One lever per school, numbers intact through the highlighter.
    expect(screen.getByText(/Crits land on/)).toBeInTheDocument();
    expect(screen.getByText(/followed by an off-hand swing/)).toBeInTheDocument();
    // (the leading "3" sits in its own highlight span, so match the plain tail)
    expect(screen.getByText(/\+ level temporary HP/)).toBeInTheDocument();
    // All schools share the martial lean — no contrast header.
    expect(screen.queryByText(/play out very differently/)).not.toBeInTheDocument();
  });

  it('bard chooser shows both schools’ levers and the cross-lean contrast header', () => {
    useGameStore.setState({ character: unchosenAt('bard', 2) });
    render(<LevelUpScreen />);

    expect(screen.getByText('Caster')).toBeInTheDocument();
    expect(screen.getByText('Striker')).toBeInTheDocument();
    expect(screen.getByText(/Cutting Words: spend an Inspiration die/)).toBeInTheDocument();
    expect(screen.getByText(/attack twice per Attack action/)).toBeInTheDocument();
    expect(screen.getByText(/play out very differently/)).toBeInTheDocument();
  });

  it('paladin chooser shows the cross-lean contrast header', () => {
    useGameStore.setState({ character: unchosenAt('paladin', 2) });
    render(<LevelUpScreen />);
    expect(screen.getByText(/play out very differently/)).toBeInTheDocument();
  });
});

describe('LevelUpScreen — ASI costs 2 points per +1 above 18', () => {
  it('surfaces the 18+ cost in the panel copy', () => {
    useGameStore.setState({ character: fighterAtAsi(LOW) });
    render(<LevelUpScreen />);
    expect(screen.getByText(/costs 2 per point/i)).toBeInTheDocument();
  });

  it('an 18+ stat takes one point, consumes the whole budget, and caps at 20', () => {
    useGameStore.setState({ character: fighterAtAsi({ ...LOW, str: 18 }) }); // effective 19
    render(<LevelUpScreen />);

    const strRow = screen.getByText('Strength').parentElement!.parentElement!;
    const strPlus = within(strRow).getByRole('button', { name: '+' });
    expect(strPlus).not.toBeDisabled(); // a single +1 onto an 18+ score is allowed

    fireEvent.click(strPlus);

    // 19 → 20, never past the cap.
    expect(strRow.textContent?.replace(/\s+/g, ' ')).toContain('18 → 20');
    // The one bump spent both points, so the level-up can be confirmed…
    expect(screen.getByRole('button', { name: /continue/i })).not.toBeDisabled();
    // …and no further bump is offered: at the cap and out of budget.
    expect(within(strRow).getByRole('button', { name: '+' })).toBeDisabled();
    // Another stat cannot be raised either — the 2 points are gone.
    const dexRow = screen.getByText('Dexterity').parentElement!.parentElement!;
    expect(within(dexRow).getByRole('button', { name: '+' })).toBeDisabled();
  });

  it('two sub-18 stats can each take +1 to spend the budget', () => {
    useGameStore.setState({ character: fighterAtAsi(LOW) });
    render(<LevelUpScreen />);

    expect(screen.getByRole('button', { name: /place 2 more point/i })).toBeDisabled();

    const strRow = screen.getByText('Strength').parentElement!.parentElement!;
    const dexRow = screen.getByText('Dexterity').parentElement!.parentElement!;
    fireEvent.click(within(strRow).getByRole('button', { name: '+' }));
    fireEvent.click(within(dexRow).getByRole('button', { name: '+' }));

    expect(screen.getByRole('button', { name: /continue/i })).not.toBeDisabled();
  });
});
