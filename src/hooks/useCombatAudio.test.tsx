import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { act } from 'react';
import type { CombatState } from '../types/combat';
import { useCombatStore } from '../stores/combatStore';
import { sfxForSpellEffect, useCombatAudio } from './useCombatAudio';

const playSfx = vi.fn();
vi.mock('../engine/audio', () => ({
  playSfx: (...args: unknown[]) => playSfx(...args),
}));

// The hook only reads combat.spellEffectEvent; the rest of CombatState is irrelevant.
function combatWith(
  spellEffectEvent: CombatState['spellEffectEvent'],
): CombatState {
  return { spellEffectEvent } as unknown as CombatState;
}

afterEach(() => {
  playSfx.mockClear();
  useCombatStore.setState({ combat: null });
});

describe('sfxForSpellEffect mapping', () => {
  it('maps bespoke spell casts to their sounds', () => {
    expect(sfxForSpellEffect('magic-missile')).toBe('spell_arcane');
    expect(sfxForSpellEffect('burning-hands')).toBe('spell_fire');
    expect(sfxForSpellEffect('shield')).toBe('armor_clang');
    expect(sfxForSpellEffect('second-wind')).toBe('second_wind');
    expect(sfxForSpellEffect('enemy-frenzy')).toBe('boss_phase');
  });

  it('resolves the element-aware shape kinds off their element', () => {
    expect(sfxForSpellEffect('spell-burst', 'fire')).toBe('spell_fire');
    expect(sfxForSpellEffect('spell-fork', 'lightning')).toBe('spell_lightning');
    expect(sfxForSpellEffect('spell-burst', 'cold')).toBe('spell_ice');
    expect(sfxForSpellEffect('spell-drain', 'necrotic')).toBe('spell_debuff');
    expect(sfxForSpellEffect('spell-bolt', 'force')).toBe('spell_arcane');
    // No element to key off — stays silent rather than guessing.
    expect(sfxForSpellEffect('spell-bolt')).toBeUndefined();
  });

  it('does NOT claim weapon swings — those sound via the attack path', () => {
    expect(sfxForSpellEffect('slash')).toBeUndefined();
    expect(sfxForSpellEffect('pierce')).toBeUndefined();
    expect(sfxForSpellEffect('arrow')).toBeUndefined();
    expect(sfxForSpellEffect('multiattack-flurry')).toBeUndefined();
  });
});

describe('useCombatAudio reaction', () => {
  it('fires the mapped SFX when a new spell-effect event arrives', () => {
    renderHook(() => useCombatAudio());
    expect(playSfx).not.toHaveBeenCalled();

    act(() => {
      useCombatStore.setState({
        combat: combatWith({ id: 1, kind: 'spell-burst', attackerId: 'player', element: 'fire' }),
      });
    });
    expect(playSfx).toHaveBeenCalledWith('spell_fire');
  });

  it('does not re-fire for the same event id', () => {
    renderHook(() => useCombatAudio());
    act(() => {
      useCombatStore.setState({
        combat: combatWith({ id: 7, kind: 'spell-fork', attackerId: 'player', element: 'lightning' }),
      });
    });
    expect(playSfx).toHaveBeenCalledTimes(1);

    // A new store write that keeps the same event id must not re-trigger.
    act(() => {
      useCombatStore.setState({
        combat: combatWith({ id: 7, kind: 'spell-fork', attackerId: 'player', element: 'lightning' }),
      });
    });
    expect(playSfx).toHaveBeenCalledTimes(1);
  });

  it('stays silent for an unmapped weapon-swing event', () => {
    renderHook(() => useCombatAudio());
    act(() => {
      useCombatStore.setState({
        combat: combatWith({ id: 2, kind: 'slash', attackerId: 'player' }),
      });
    });
    expect(playSfx).not.toHaveBeenCalled();
  });
});
