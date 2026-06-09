import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CharacterCreationScreen } from './CharacterCreationScreen';
import { useGameStore } from '../../stores/gameStore';
import { useMetaStore } from '../../stores/metaStore';
import { getClass } from '../../content/classes';
import { buildPlayerCharacter, presetCreationInput } from '../../engine/character/defaultCharacter';

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
  // originClass is write-once and renownSpent paces the class ladder — both live
  // in the metaStore (a singleton across tests in this file). Clear them so each
  // first-creation case starts from a fresh, unspent soul.
  useMetaStore.setState({ originClass: null, renownSpent: 0 });
}

describe('CharacterCreationScreen — selection', () => {
  beforeEach(resetStore);

  it('offers the three starters (Fighter, Mage, Hunter) as choosable souls', () => {
    render(<CharacterCreationScreen />);
    expect(screen.getByRole('heading', { name: /choose a soul/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sir brick/i })).toBeInTheDocument(); // Fighter
    expect(screen.getByRole('button', { name: /veyra ash/i })).toBeInTheDocument(); // Wizard (Mage)
    expect(screen.getByRole('button', { name: /faelar quill/i })).toBeInTheDocument(); // Ranger (Hunter)
  });

  it('seals the non-starter souls (Barbarian, Rogue, Druid, Monk) on a fresh soul — not choosable', () => {
    render(<CharacterCreationScreen />);
    // The sealed placeholders name only the class, never the character, and are
    // not buttons — a fresh walker cannot forge Korrek Bloodmane, Maelis Vell,
    // Lureth Oakshadow, or Shen Ironroot. Barbarian is no longer a starter.
    expect(screen.queryByRole('button', { name: /korrek bloodmane/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /maelis vell/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /lureth oakshadow/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /shen ironroot/i })).not.toBeInTheDocument();
    // The five sealed non-starters (barbarian/rogue/druid/monk/bard) sit at
    // 200/300/450/600/800 renown spent for every origin — none is the
    // first-offering slot.
    expect(screen.getAllByText(/unlocks at \d+ renown spent/i).length).toBe(5);
  });

  it('renders sealed souls in the origin order, each naming its renown-spent bar (origin=wizard swap)', () => {
    // A wizard-origin soul mid-swap with nothing spent yet: only the worn Mage is
    // choosable; the other six are sealed in the wizard order — Fighter first (on
    // the first offering), then Hunter@100, then the non-starters at 200..600.
    useGameStore.setState({ character: buildPlayerCharacter(presetCreationInput('wizard')) });
    useMetaStore.setState({ originClass: 'wizard', renownSpent: 0 });
    render(<CharacterCreationScreen />);
    const bars = screen
      .getAllByText(/renown spent|after your first offering/i)
      .map((el) => el.textContent);
    expect(bars).toEqual([
      'After your first offering',
      'Unlocks at 100 renown spent',
      'Unlocks at 200 renown spent',
      'Unlocks at 300 renown spent',
      'Unlocks at 450 renown spent',
      'Unlocks at 600 renown spent',
      'Unlocks at 800 renown spent',
    ]);
  });

  it('has no point-buy or multi-step controls', () => {
    render(<CharacterCreationScreen />);
    expect(screen.queryByRole('button', { name: /^next/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/pts? left/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /preset/i })).not.toBeInTheDocument();
  });

  it('does not surface skill proficiencies on the soul cards', () => {
    render(<CharacterCreationScreen />);
    // The old cards carried a "Skills · …" line off recommendedSkills; skills
    // were removed from the player flow, so that line is gone. Kit/Hallmarks stay.
    expect(screen.queryByText(/skills ·/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/hallmarks ·/i).length).toBeGreaterThan(0);
  });

  it('confirm is disabled until a soul is picked', () => {
    render(<CharacterCreationScreen />);
    expect(screen.getByRole('button', { name: /choose a soul/i })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /veyra ash/i }));
    expect(
      screen.getByRole('button', { name: /begin as veyra ash/i }),
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
    // Skills were removed from the player flow — a fresh soul trains nothing.
    expect(char.skillProficiencies).toEqual([]);
  });

  it('picking Veyra Ash commits the fixed Wizard (Mage) block', () => {
    render(<CharacterCreationScreen />);
    fireEvent.click(screen.getByRole('button', { name: /veyra ash/i }));
    fireEvent.click(screen.getByRole('button', { name: /begin/i }));
    const char = useGameStore.getState().character!;
    const preset = getClass('wizard').preset!;
    expect(char.classId).toBe('wizard');
    expect(char.raceId).toBe(preset.recommendedRaceId);
    expect(char.baseAbilityScores).toEqual(preset.abilityScores);
  });

  it('stamps originClass once on first creation (anchors the relative unlock ladder)', () => {
    render(<CharacterCreationScreen />);
    fireEvent.click(screen.getByRole('button', { name: /veyra ash/i }));
    fireEvent.click(screen.getByRole('button', { name: /begin/i }));
    expect(useGameStore.getState().originClass).toBe('wizard');
  });
});
