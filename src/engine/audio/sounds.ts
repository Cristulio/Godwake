/**
 * SFX + music registry. Each entry is a small Web Audio graph builder.
 * Swap any entry for a buffer-source loader later without touching callers.
 */
import { audioEngine, type SfxRenderer } from './AudioEngine';

export type SfxId =
  | 'ui_click'
  | 'dice_clack'
  | 'swing_whoosh'
  | 'hit_thud'
  | 'crit_hit'
  | 'miss_whiff'
  | 'level_up_sting'
  | 'death_sting'
  | 'victory_sting'
  | 'shrine_chime'
  | 'heal_chime';

export type MusicId = 'combat_bed' | 'hub_bed';

function noiseBuffer(ctx: AudioContext, ms: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.max(1, Math.floor((ms / 1000) * sampleRate));
  const buf = ctx.createBuffer(1, length, sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buf;
}

// Small chiptune note: a square wave with a fast attack/decay envelope.
function blip(
  ctx: AudioContext,
  out: AudioNode,
  freq: number,
  start: number,
  durationS: number,
  level: number,
  type: OscillatorType = 'square',
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(level, start + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + durationS);
  osc.connect(gain).connect(out);
  osc.start(start);
  osc.stop(start + durationS + 0.02);
}

const renderUiClick: SfxRenderer = (ctx, out, now) => {
  blip(ctx, out, 1800, now, 0.05, 0.12, 'square');
};

const renderDiceClack: SfxRenderer = (ctx, out, now) => {
  // Two short noise ticks, like a die hitting wood.
  for (let i = 0; i < 2; i++) {
    const t = now + i * 0.04;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, 25);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2400 - i * 400;
    filter.Q.value = 4;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    src.connect(filter).connect(gain).connect(out);
    src.start(t);
  }
};

const renderSwingWhoosh: SfxRenderer = (ctx, out, now) => {
  // Filtered noise swept down — air moving past a blade.
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, 180);
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 3;
  filter.frequency.setValueAtTime(1800, now);
  filter.frequency.exponentialRampToValueAtTime(400, now + 0.18);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.35, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
  src.connect(filter).connect(gain).connect(out);
  src.start(now);
};

const renderHitThud: SfxRenderer = (ctx, out, now) => {
  // Low sine drop + noise burst — meaty impact.
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(140, now);
  osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);
  const oGain = ctx.createGain();
  oGain.gain.setValueAtTime(0.5, now);
  oGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
  osc.connect(oGain).connect(out);
  osc.start(now);
  osc.stop(now + 0.2);

  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, 50);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 600;
  const nGain = ctx.createGain();
  nGain.gain.setValueAtTime(0.35, now);
  nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
  src.connect(filter).connect(nGain).connect(out);
  src.start(now);
};

const renderCritHit: SfxRenderer = (ctx, out, now) => {
  // Heavier thud + a bright metallic ping.
  renderHitThud(ctx, out, now);
  blip(ctx, out, 1320, now + 0.04, 0.18, 0.18, 'triangle');
  blip(ctx, out, 1760, now + 0.07, 0.22, 0.15, 'triangle');
};

const renderMissWhiff: SfxRenderer = (ctx, out, now) => {
  // Faster, thinner whoosh — no impact tail.
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, 120);
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(2200, now);
  filter.frequency.exponentialRampToValueAtTime(800, now + 0.12);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.18, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
  src.connect(filter).connect(gain).connect(out);
  src.start(now);
};

const renderLevelUpSting: SfxRenderer = (ctx, out, now) => {
  // Rising arpeggio — major chord.
  const notes = [392, 494, 587, 784]; // G4 B4 D5 G5
  notes.forEach((f, i) => {
    blip(ctx, out, f, now + i * 0.09, 0.45, 0.18, 'triangle');
  });
};

const renderVictorySting: SfxRenderer = (ctx, out, now) => {
  // Three-note triumph: G4 -> C5 -> E5 (held).
  blip(ctx, out, 392, now, 0.18, 0.2, 'triangle');
  blip(ctx, out, 523, now + 0.12, 0.18, 0.2, 'triangle');
  blip(ctx, out, 659, now + 0.24, 0.6, 0.22, 'triangle');
};

const renderDeathSting: SfxRenderer = (ctx, out, now) => {
  // Descending dread: low sine sweep + low square growl.
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.exponentialRampToValueAtTime(55, now + 1.0);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.linearRampToValueAtTime(0.35, now + 0.1);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
  osc.connect(g).connect(out);
  osc.start(now);
  osc.stop(now + 1.15);

  const osc2 = ctx.createOscillator();
  osc2.type = 'square';
  osc2.frequency.setValueAtTime(110, now + 0.15);
  osc2.frequency.exponentialRampToValueAtTime(40, now + 0.9);
  const g2 = ctx.createGain();
  g2.gain.setValueAtTime(0.0001, now + 0.15);
  g2.gain.linearRampToValueAtTime(0.12, now + 0.25);
  g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);
  osc2.connect(g2).connect(out);
  osc2.start(now + 0.15);
  osc2.stop(now + 1.0);
};

const renderShrineChime: SfxRenderer = (ctx, out, now) => {
  // Two soft triangle bells, fifth apart.
  blip(ctx, out, 880, now, 0.7, 0.15, 'triangle');
  blip(ctx, out, 1320, now + 0.05, 0.7, 0.12, 'triangle');
};

const renderHealChime: SfxRenderer = (ctx, out, now) => {
  // Gentle rising third.
  blip(ctx, out, 660, now, 0.25, 0.16, 'triangle');
  blip(ctx, out, 990, now + 0.1, 0.32, 0.16, 'triangle');
};

const SFX: Record<SfxId, SfxRenderer> = {
  ui_click: renderUiClick,
  dice_clack: renderDiceClack,
  swing_whoosh: renderSwingWhoosh,
  hit_thud: renderHitThud,
  crit_hit: renderCritHit,
  miss_whiff: renderMissWhiff,
  level_up_sting: renderLevelUpSting,
  victory_sting: renderVictorySting,
  death_sting: renderDeathSting,
  shrine_chime: renderShrineChime,
  heal_chime: renderHealChime,
};

/** Fire-and-forget play. */
export function playSfx(id: SfxId) {
  const renderer = SFX[id];
  if (!renderer) return;
  audioEngine.playSfx(renderer);
}

/**
 * Music beds. Each returns a stop handle so the engine can fade them out.
 * Beds are intentionally minimal — they're meant to add atmosphere, not melody.
 */
function buildCombatBed(ctx: AudioContext, out: AudioNode) {
  // Two detuned low saws + a slow LFO-driven filter = brooding drone.
  const merger = ctx.createGain();
  merger.gain.value = 0.45;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 320;
  filter.Q.value = 4;

  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.18;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 80;
  lfo.connect(lfoGain).connect(filter.frequency);
  lfo.start();

  const oscA = ctx.createOscillator();
  oscA.type = 'sawtooth';
  oscA.frequency.value = 55; // A1
  const oscB = ctx.createOscillator();
  oscB.type = 'sawtooth';
  oscB.frequency.value = 55 * 1.01; // detune
  const oscC = ctx.createOscillator();
  oscC.type = 'sine';
  oscC.frequency.value = 82.5; // perfect 5th up

  oscA.connect(merger);
  oscB.connect(merger);
  const cGain = ctx.createGain();
  cGain.gain.value = 0.35;
  oscC.connect(cGain).connect(merger);

  merger.connect(filter).connect(out);
  oscA.start();
  oscB.start();
  oscC.start();

  // Slow heartbeat: a low sine pulse every ~1.6s.
  let heartbeatStopped = false;
  const heartbeat = () => {
    if (heartbeatStopped) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(70, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.18);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.35, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.25);
    setTimeout(heartbeat, 1600);
  };
  setTimeout(heartbeat, 800);

  return {
    stop: () => {
      heartbeatStopped = true;
      try {
        oscA.stop();
        oscB.stop();
        oscC.stop();
        lfo.stop();
      } catch {
        /* ignore */
      }
    },
  };
}

function buildHubBed(ctx: AudioContext, out: AudioNode) {
  // Warmer, less menacing: triangle drone + slow shimmering fifth.
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 700;

  const oscA = ctx.createOscillator();
  oscA.type = 'triangle';
  oscA.frequency.value = 110; // A2
  const aGain = ctx.createGain();
  aGain.gain.value = 0.25;

  const oscB = ctx.createOscillator();
  oscB.type = 'sine';
  oscB.frequency.value = 165; // E3
  const bGain = ctx.createGain();
  bGain.gain.value = 0.18;

  // Slow tremolo to give it air.
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.12;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.08;
  const trem = ctx.createGain();
  trem.gain.value = 0.7;
  lfo.connect(lfoGain).connect(trem.gain);
  lfo.start();

  oscA.connect(aGain).connect(filter);
  oscB.connect(bGain).connect(filter);
  filter.connect(trem).connect(out);
  oscA.start();
  oscB.start();

  return {
    stop: () => {
      try {
        oscA.stop();
        oscB.stop();
        lfo.stop();
      } catch {
        /* ignore */
      }
    },
  };
}

const MUSIC_BUILDERS: Record<
  MusicId,
  (ctx: AudioContext, out: AudioNode) => { stop: () => void }
> = {
  combat_bed: buildCombatBed,
  hub_bed: buildHubBed,
};

export function playMusic(id: MusicId) {
  audioEngine.playMusic(id, MUSIC_BUILDERS[id]);
}

export function stopMusic() {
  audioEngine.stopMusic();
}
