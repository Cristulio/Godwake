import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { audioEngine } from './AudioEngine';
import { MUSIC_IDS, SFX_IDS, playMusic, playSfx, stopMusic } from './sounds';

// jsdom has no Web Audio; a minimal stub lets us exercise the synth graphs
// (every renderer/builder) and the engine's bus wiring without real audio.
class FakeParam {
  value = 0;
  setValueAtTime() {
    return this;
  }
  linearRampToValueAtTime() {
    return this;
  }
  exponentialRampToValueAtTime() {
    return this;
  }
  cancelScheduledValues() {
    return this;
  }
}

class FakeNode {
  gain = new FakeParam();
  frequency = new FakeParam();
  Q = new FakeParam();
  type = '';
  buffer: unknown = null;
  loop = false;
  // Real AudioNode.connect returns the destination so calls can chain.
  connect(dest: unknown) {
    return dest;
  }
  disconnect() {}
  start() {}
  stop() {}
}

class FakeAudioContext {
  currentTime = 0;
  state: 'running' | 'suspended' = 'running';
  sampleRate = 44100;
  destination = new FakeNode();
  createGain() {
    return new FakeNode();
  }
  createOscillator() {
    return new FakeNode();
  }
  createBufferSource() {
    return new FakeNode();
  }
  createBiquadFilter() {
    return new FakeNode();
  }
  createBuffer(_channels: number, length: number) {
    return { getChannelData: () => new Float32Array(length) };
  }
  resume() {
    return Promise.resolve();
  }
}

describe('audio SFX registry', () => {
  beforeAll(() => {
    vi.useFakeTimers();
    (globalThis as unknown as { AudioContext: unknown }).AudioContext =
      FakeAudioContext;
    (window as unknown as { AudioContext: unknown }).AudioContext =
      FakeAudioContext;
    audioEngine.setVolumes({ master: 0.8, sfx: 1, music: 0.35, muted: false });
  });

  afterEach(() => {
    stopMusic();
    vi.clearAllTimers();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('registers a renderer for every SFX id and fires each without throwing', () => {
    expect(SFX_IDS.length).toBeGreaterThan(20);
    for (const id of SFX_IDS) {
      expect(() => playSfx(id)).not.toThrow();
    }
  });

  it('includes the newly-wired combat and spell sounds', () => {
    for (const id of [
      'spell_fire',
      'spell_ice',
      'spell_lightning',
      'spell_arcane',
      'spell_holy',
      'spell_debuff',
      'buff_surge',
      'second_wind',
      'enemy_cast',
      'boss_phase',
      'player_hurt',
      'armor_clang',
      'ui_hover',
    ] as const) {
      expect(SFX_IDS).toContain(id);
    }
  });
});

describe('audio music beds', () => {
  beforeAll(() => {
    vi.useFakeTimers();
    (globalThis as unknown as { AudioContext: unknown }).AudioContext =
      FakeAudioContext;
    (window as unknown as { AudioContext: unknown }).AudioContext =
      FakeAudioContext;
  });

  afterEach(() => {
    stopMusic();
    vi.clearAllTimers();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('builds every melodic theme without throwing', () => {
    for (const id of MUSIC_IDS) {
      expect(() => playMusic(id)).not.toThrow();
      stopMusic();
    }
  });

  it('switches the active bed when a different track plays', () => {
    playMusic('combat_theme');
    expect(audioEngine.currentMusic()).toBe('combat_theme');
    playMusic('boss_theme');
    expect(audioEngine.currentMusic()).toBe('boss_theme');
  });

  it('exposes the expected track set, all turned on by default', () => {
    expect(MUSIC_IDS).toEqual(
      expect.arrayContaining([
        'hub_theme',
        'combat_theme',
        'combat_theme_tense',
        'boss_theme',
        'victory_theme',
      ]),
    );
  });
});
