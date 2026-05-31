/**
 * AudioEngine — Web Audio singleton.
 *
 * Owns one AudioContext and three gain busses: master, sfx, music.
 * SFX are synthesized on demand from small WebAudio graphs (no asset bytes).
 * A music bus hosts a single looping drone scene that fades in/out.
 *
 * Browser autoplay policy: AudioContext starts suspended until the user
 * interacts with the page. `ensureReady` resumes it; we wire it to the first
 * pointerdown/keydown via `attachAutoResume`.
 *
 * Swap a synth sound for an asset later by replacing its entry in sounds.ts —
 * the play() signature stays the same.
 */

type SfxRenderer = (ctx: AudioContext, out: AudioNode, now: number) => void;

class _AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private musicNodes: { stop: () => void } | null = null;
  private currentMusicId: string | null = null;
  private autoResumeAttached = false;

  // Current store-driven values; the store calls setVolumes on change.
  private state = {
    master: 0.8,
    sfx: 1.0,
    music: 0.6,
    muted: false,
  };

  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    if (typeof window === 'undefined') return null;
    const AC: typeof AudioContext | undefined =
      (window.AudioContext as typeof AudioContext | undefined) ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    try {
      this.ctx = new AC();
    } catch {
      return null;
    }
    const ctx = this.ctx;

    this.master = ctx.createGain();
    this.sfxBus = ctx.createGain();
    this.musicBus = ctx.createGain();
    this.sfxBus.connect(this.master);
    this.musicBus.connect(this.master);
    this.master.connect(ctx.destination);
    this.applyVolumes();
    return ctx;
  }

  private applyVolumes() {
    if (!this.master || !this.sfxBus || !this.musicBus) return;
    const m = this.state.muted ? 0 : this.state.master;
    this.master.gain.value = m;
    this.sfxBus.gain.value = this.state.sfx;
    this.musicBus.gain.value = this.state.music;
  }

  setVolumes(v: { master: number; sfx: number; music: number; muted: boolean }) {
    this.state = { ...v };
    this.applyVolumes();
  }

  /** Resume the AudioContext. Safe to call repeatedly. */
  async ensureReady() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        /* ignore */
      }
    }
  }

  /**
   * Attach a one-shot listener that calls ensureReady on the first user
   * gesture. Browsers gate AudioContext.resume() behind a gesture.
   */
  attachAutoResume() {
    if (this.autoResumeAttached) return;
    if (typeof window === 'undefined') return;
    this.autoResumeAttached = true;
    const handler = () => {
      void this.ensureReady();
    };
    window.addEventListener('pointerdown', handler, { once: false });
    window.addEventListener('keydown', handler, { once: false });
    window.addEventListener('touchstart', handler, { once: false });
  }

  /** Render a one-shot SFX into the sfx bus. */
  playSfx(renderer: SfxRenderer) {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxBus) return;
    if (ctx.state === 'suspended') {
      // Context is paused — resume it but DROP this sound rather than scheduling
      // at the frozen ctx.currentTime. Queuing at a stale timestamp causes a
      // burst of every pending sound the moment the context resumes, which is
      // what produces SFX arriving seconds after the action that triggered them.
      void ctx.resume();
      return;
    }
    renderer(ctx, this.sfxBus, ctx.currentTime);
  }

  /**
   * Start a looping music bed. If `id` matches the currently playing bed,
   * do nothing. Otherwise crossfade.
   */
  playMusic(
    id: string,
    build: (ctx: AudioContext, out: AudioNode) => { stop: () => void },
  ) {
    const ctx = this.ensureContext();
    if (!ctx || !this.musicBus) return;
    if (this.currentMusicId === id && this.musicNodes) return;
    if (ctx.state === 'suspended') void ctx.resume();

    // Fade out the previous bed.
    this.stopMusic();

    // Fade in the new bed via a per-track gain node.
    const trackGain = ctx.createGain();
    trackGain.gain.value = 0;
    trackGain.connect(this.musicBus);
    const handle = build(ctx, trackGain);
    const now = ctx.currentTime;
    trackGain.gain.linearRampToValueAtTime(1, now + 0.8);
    this.musicNodes = {
      stop: () => {
        try {
          const t = ctx.currentTime;
          trackGain.gain.cancelScheduledValues(t);
          trackGain.gain.setValueAtTime(trackGain.gain.value, t);
          trackGain.gain.linearRampToValueAtTime(0, t + 0.6);
          setTimeout(() => {
            try {
              handle.stop();
              trackGain.disconnect();
            } catch {
              /* ignore */
            }
          }, 700);
        } catch {
          /* ignore */
        }
      },
    };
    this.currentMusicId = id;
  }

  stopMusic() {
    if (this.musicNodes) {
      try {
        this.musicNodes.stop();
      } catch {
        /* ignore */
      }
      this.musicNodes = null;
    }
    this.currentMusicId = null;
  }

  currentMusic(): string | null {
    return this.currentMusicId;
  }
}

export const audioEngine = new _AudioEngine();
export type { SfxRenderer };
