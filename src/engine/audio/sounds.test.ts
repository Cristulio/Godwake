import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { audioEngine } from './AudioEngine';
import { MUSIC_IDS, SFX_IDS, playMusic, playSfx, stopMusic } from './sounds';
import { BOSS_MUSIC_POOL, COMBAT_MUSIC_POOL, pickCombatMusic } from './index';

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
  detune = new FakeParam();
  Q = new FakeParam();
  delayTime = new FakeParam();
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
  createDelay() {
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
      'spell_necrotic',
      'reincarnation_sting',
      'swing_claw_tear',
      'swing_claw_tear_heavy',
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
        'title_theme',
        'grove_theme',
        'shop_theme',
        'event_theme',
        'combat_elite',
        'combat_throne',
        'boss_throne',
        'hub_theme',
        'combat_theme',
        'combat_theme_tense',
        'combat_march',
        'combat_prowl',
        'combat_grim',
        'combat_frenzy',
        'combat_rally',
        'boss_theme',
        'boss_theme_dire',
        'boss_theme_wrath',
        'victory_theme',
      ]),
    );
  });
});

describe('mob-aware combat-music selector', () => {
  it('keeps both pools a subset of the registered builders', () => {
    for (const id of [...COMBAT_MUSIC_POOL, ...BOSS_MUSIC_POOL]) {
      expect(MUSIC_IDS).toContain(id);
    }
  });

  it('returns a combat-pool member and spreads foes across variants', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) {
      const id = pickCombatMusic(`creature-kind-${i}`);
      expect(COMBAT_MUSIC_POOL).toContain(id);
      seen.add(id);
    }
    // Different foes should reach several distinct themes, not collapse to one.
    expect(seen.size).toBeGreaterThan(2);
  });

  it('never repeats the previous fight back-to-back', () => {
    let prev: string | null = null;
    for (let i = 0; i < 200; i++) {
      const id = pickCombatMusic(`foe-${i % 9}`, { boss: i % 5 === 0 });
      expect(id).not.toBe(prev);
      prev = id;
    }
  });

  it('draws boss fights from the boss pool', () => {
    const id = pickCombatMusic('archlich', { boss: true });
    expect(BOSS_MUSIC_POOL).toContain(id);
  });

  it('routes elite and Throne-act fights to their dedicated themes', () => {
    expect(pickCombatMusic('hunter', { elite: true })).toBe('combat_elite');
    expect(pickCombatMusic('courtier', { throne: true })).toBe('combat_throne');
    expect(pickCombatMusic('slain-god', { throne: true, boss: true })).toBe('boss_throne');
  });
});
