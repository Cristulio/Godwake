import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';
import { useGameStore } from '../stores/gameStore';
import { useSettingsStore } from '../stores/settingsStore';
import { ErrorBoundary } from '../components/system/ErrorBoundary';
import { CharacterCreationScreen } from '../components/creation/CharacterCreationScreen';
import { SIR_BRICK_PRESET } from '../engine/character/defaultCharacter';

/**
 * Integration tests covering top-of-tree wiring: routing, persisted store
 * state, error boundary, and the character-creation → first-delve handoff
 * directly via the store (the lazy-loaded screens render their fallback in
 * jsdom because Vite chunk resolution doesn't fire; we test the lazy
 * boundary at runtime via build, and the gameStore actions in isolation
 * here).
 */

function clearGodwakeStorage() {
  if (typeof localStorage === 'undefined') return;
  const keys = Object.keys(localStorage).filter((k) => k.startsWith('godwake-'));
  for (const k of keys) localStorage.removeItem(k);
}

function resetStore() {
  useGameStore.setState({
    screen: 'title',
    character: null,
    delve: null,
    combat: null,
    introSeen: false,
    hasReincarnated: false,
    deathCount: 0,
  });
}

describe('integration — title screen + routing', () => {
  beforeEach(() => {
    resetStore();
    // Reset triggers a persist write to slot 0; clear AFTER so the
    // TitleScreen's hasAnySave() correctly reports no save.
    clearGodwakeStorage();
  });

  it('renders Godwake title + New Game button', () => {
    render(<App />);
    expect(screen.getByText(/godwake/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new game/i })).toBeInTheDocument();
  });

  it('clicking New Game flips screen to character-creation', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /new game/i }));
    // Lazy chunk fallback renders; state has moved.
    expect(useGameStore.getState().screen).toBe('character-creation');
  });
});

describe('integration — character creation → first delve via store', () => {
  beforeEach(() => {
    resetStore();
    // Reset triggers a persist write to slot 0; clear AFTER so the
    // TitleScreen's hasAnySave() correctly reports no save.
    clearGodwakeStorage();
  });

  it('commitCharacterCreation with Sir Brick preset stamps the character', () => {
    useGameStore.getState().startNewGame('test-seed-1');
    useGameStore.getState().commitCharacterCreation({
      name: SIR_BRICK_PRESET.name,
      raceId: SIR_BRICK_PRESET.raceId,
      classId: SIR_BRICK_PRESET.classId,
      baseAbilityScores: { ...SIR_BRICK_PRESET.baseAbilityScores },
    });
    const state = useGameStore.getState();
    expect(state.character).not.toBeNull();
    expect(state.character?.name).toBe('Sir Brick');
    expect(state.character?.classId).toBe('fighter');
    expect(['intro', 'delve']).toContain(state.screen);
  });

  it('renders the standalone CharacterCreationScreen (bypassing lazy)', () => {
    useGameStore.setState({ character: null });
    render(<CharacterCreationScreen />);
    // Selection model: a single "CHOOSE A SOUL" screen with one card per
    // playable class and a confirm that's gated until a soul is picked.
    expect(screen.getByRole('heading', { name: /choose a soul/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sir brick/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /choose a soul/i })).toBeDisabled();
  });
});

describe('integration — error boundary', () => {
  it('shows the wheel-slipped recovery screen when a child throws', () => {
    function Boom(): never {
      throw new Error('test-only crash');
    }
    const originalError = console.error;
    // Suppress the expected React error logs
    console.error = () => {};
    try {
      render(
        <ErrorBoundary>
          <Boom />
        </ErrorBoundary>,
      );
      expect(screen.getByText(/the wheel slipped/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /wipe save/i })).toBeInTheDocument();
      // Plain Reload + Wipe-Save-Reload both match /reload/i; ensure at least one.
      expect(screen.getAllByRole('button', { name: /reload/i }).length).toBeGreaterThanOrEqual(1);
    } finally {
      console.error = originalError;
    }
  });

  it('passes through children when no error', () => {
    render(
      <ErrorBoundary>
        <div>healthy</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText('healthy')).toBeInTheDocument();
  });
});

describe('integration — settings persistence (settingsStore)', () => {
  beforeEach(resetStore);

  it('autoEndTurnDelayMs round-trips through the settings store', () => {
    useSettingsStore.getState().setAutoEndTurnDelay(700);
    expect(useSettingsStore.getState().autoEndTurnDelayMs).toBe(700);
  });

  it('setAutoEndTurnDelay clamps to [200, 3000]', () => {
    useSettingsStore.getState().setAutoEndTurnDelay(50);
    expect(useSettingsStore.getState().autoEndTurnDelayMs).toBe(200);
    useSettingsStore.getState().setAutoEndTurnDelay(99999);
    expect(useSettingsStore.getState().autoEndTurnDelayMs).toBe(3000);
  });

  it('speedMultiplier toggles between 1 and 2', () => {
    useSettingsStore.getState().setSpeed(2);
    expect(useSettingsStore.getState().speedMultiplier).toBe(2);
    useSettingsStore.getState().setSpeed(1);
    expect(useSettingsStore.getState().speedMultiplier).toBe(1);
  });
});
