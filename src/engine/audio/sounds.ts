/**
 * SFX + music registry. Each entry is a small Web Audio graph builder.
 * Swap any entry for a buffer-source loader later without touching callers.
 */
import { audioEngine, type SfxRenderer } from './AudioEngine';

export type SfxId =
  | 'ui_click'
  | 'dice_clack'
  | 'swing_whoosh'
  | 'swing_whoosh_blade'
  | 'swing_whoosh_blunt'
  | 'swing_whoosh_bow'
  | 'swing_whoosh_dagger'
  | 'hit_thud'
  | 'crit_hit'
  | 'miss_whiff'
  | 'level_up_sting'
  | 'death_sting'
  | 'monster_death'
  | 'victory_sting'
  | 'shrine_chime'
  | 'heal_chime'
  | 'boss_intro'
  | 'footstep';

export type MusicId =
  | 'combat_bed'
  | 'combat_bed_tense'
  | 'combat_bed_bossly'
  | 'hub_bed'
  | 'hub_ambient';

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

const renderSwingBlade: SfxRenderer = (ctx, out, now) => {
  // Long, metallic edge cut: bandpass swept down with a faint ringing
  // overtone that suggests sharpened steel.
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, 220);
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 4;
  filter.frequency.setValueAtTime(2400, now);
  filter.frequency.exponentialRampToValueAtTime(520, now + 0.22);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.36, now + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
  src.connect(filter).connect(gain).connect(out);
  src.start(now);
  // Faint metallic ring.
  blip(ctx, out, 2600, now + 0.04, 0.12, 0.06, 'triangle');
};

const renderSwingBlunt: SfxRenderer = (ctx, out, now) => {
  // Heavy slow whoosh: lower band of noise + a low thunk on the swing tail.
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, 280);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = 1;
  filter.frequency.setValueAtTime(900, now);
  filter.frequency.exponentialRampToValueAtTime(220, now + 0.26);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.38, now + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
  src.connect(filter).connect(gain).connect(out);
  src.start(now);
  // Low body thunk near the tail.
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(90, now + 0.08);
  osc.frequency.exponentialRampToValueAtTime(50, now + 0.22);
  const og = ctx.createGain();
  og.gain.setValueAtTime(0.0001, now + 0.08);
  og.gain.linearRampToValueAtTime(0.15, now + 0.1);
  og.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
  osc.connect(og).connect(out);
  osc.start(now + 0.08);
  osc.stop(now + 0.26);
};

const renderSwingBow: SfxRenderer = (ctx, out, now) => {
  // String release: short twang + a thin arrow whistle.
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(260, now);
  osc.frequency.exponentialRampToValueAtTime(120, now + 0.08);
  const og = ctx.createGain();
  og.gain.setValueAtTime(0.0001, now);
  og.gain.linearRampToValueAtTime(0.22, now + 0.005);
  og.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
  osc.connect(og).connect(out);
  osc.start(now);
  osc.stop(now + 0.1);
  // Thin filtered whistle as the arrow leaves.
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, 180);
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 3200;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.0001, now + 0.04);
  ng.gain.linearRampToValueAtTime(0.18, now + 0.06);
  ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
  src.connect(filter).connect(ng).connect(out);
  src.start(now + 0.04);
};

const renderSwingDagger: SfxRenderer = (ctx, out, now) => {
  // Very short, high whip — flick of a small blade.
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, 100);
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 6;
  filter.frequency.setValueAtTime(3600, now);
  filter.frequency.exponentialRampToValueAtTime(1400, now + 0.1);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.32, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
  src.connect(filter).connect(gain).connect(out);
  src.start(now);
};

const renderMonsterDeath: SfxRenderer = (ctx, out, now) => {
  // Sharp brassy thud: hard noise body + a downward brass-square snarl.
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, 80);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 520;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.5, now);
  ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
  src.connect(filter).connect(ng).connect(out);
  src.start(now);

  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.exponentialRampToValueAtTime(70, now + 0.28);
  const og = ctx.createGain();
  og.gain.setValueAtTime(0.0001, now);
  og.gain.linearRampToValueAtTime(0.22, now + 0.03);
  og.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
  osc.connect(og).connect(out);
  osc.start(now);
  osc.stop(now + 0.32);

  // A short brass blat on top.
  const osc2 = ctx.createOscillator();
  osc2.type = 'square';
  osc2.frequency.setValueAtTime(440, now);
  osc2.frequency.exponentialRampToValueAtTime(180, now + 0.18);
  const og2 = ctx.createGain();
  og2.gain.setValueAtTime(0.0001, now);
  og2.gain.linearRampToValueAtTime(0.1, now + 0.02);
  og2.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
  osc2.connect(og2).connect(out);
  osc2.start(now);
  osc2.stop(now + 0.22);
};

const renderBossIntro: SfxRenderer = (ctx, out, now) => {
  // Three-second tense brass + drum hit. Builds with a low brass pad,
  // a snarling minor third on top, and two timpani-ish kicks.
  const padFilter = ctx.createBiquadFilter();
  padFilter.type = 'lowpass';
  padFilter.frequency.value = 900;
  padFilter.Q.value = 1;
  const padGain = ctx.createGain();
  padGain.gain.setValueAtTime(0.0001, now);
  padGain.gain.linearRampToValueAtTime(0.32, now + 0.4);
  padGain.gain.setValueAtTime(0.32, now + 2.2);
  padGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.0);
  padFilter.connect(padGain).connect(out);

  const root = ctx.createOscillator();
  root.type = 'sawtooth';
  root.frequency.value = 73; // D2
  const fifth = ctx.createOscillator();
  fifth.type = 'sawtooth';
  fifth.frequency.value = 110; // A2
  const min3 = ctx.createOscillator();
  min3.type = 'square';
  min3.frequency.value = 87; // F2 (minor third — tense)
  const min3Gain = ctx.createGain();
  min3Gain.gain.value = 0.45;
  root.connect(padFilter);
  fifth.connect(padFilter);
  min3.connect(min3Gain).connect(padFilter);
  root.start(now);
  fifth.start(now);
  min3.start(now);
  root.stop(now + 3.0);
  fifth.stop(now + 3.0);
  min3.stop(now + 3.0);

  // Two timpani hits — one early, one near the end.
  const kickAt = (t: number) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.3);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.55, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.4);
  };
  kickAt(now + 0.05);
  kickAt(now + 2.1);

  // A high anxious sting that rings through.
  blip(ctx, out, 1100, now + 0.6, 1.6, 0.08, 'triangle');
};

const renderFootstep: SfxRenderer = (ctx, out, now) => {
  // Single soft thud: short low-noise tick + a sub blip.
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, 60);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 420;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.22, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
  src.connect(filter).connect(g).connect(out);
  src.start(now);

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(120, now);
  osc.frequency.exponentialRampToValueAtTime(60, now + 0.07);
  const og = ctx.createGain();
  og.gain.setValueAtTime(0.0001, now);
  og.gain.linearRampToValueAtTime(0.18, now + 0.01);
  og.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
  osc.connect(og).connect(out);
  osc.start(now);
  osc.stop(now + 0.1);
};

const SFX: Record<SfxId, SfxRenderer> = {
  ui_click: renderUiClick,
  dice_clack: renderDiceClack,
  swing_whoosh: renderSwingWhoosh,
  swing_whoosh_blade: renderSwingBlade,
  swing_whoosh_blunt: renderSwingBlunt,
  swing_whoosh_bow: renderSwingBow,
  swing_whoosh_dagger: renderSwingDagger,
  hit_thud: renderHitThud,
  crit_hit: renderCritHit,
  miss_whiff: renderMissWhiff,
  level_up_sting: renderLevelUpSting,
  victory_sting: renderVictorySting,
  death_sting: renderDeathSting,
  monster_death: renderMonsterDeath,
  shrine_chime: renderShrineChime,
  heal_chime: renderHealChime,
  boss_intro: renderBossIntro,
  footstep: renderFootstep,
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

function buildCombatBedTense(ctx: AudioContext, out: AudioNode) {
  // Faster heartbeat, sharper dissonance — a stalking encounter rather than a
  // brood. Detuned saws a semitone apart with a tighter filter sweep.
  const merger = ctx.createGain();
  merger.gain.value = 0.4;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 380;
  filter.Q.value = 5;

  const lfo = ctx.createOscillator();
  lfo.type = 'triangle';
  lfo.frequency.value = 0.32;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 110;
  lfo.connect(lfoGain).connect(filter.frequency);
  lfo.start();

  const oscA = ctx.createOscillator();
  oscA.type = 'sawtooth';
  oscA.frequency.value = 58; // ~A#1
  const oscB = ctx.createOscillator();
  oscB.type = 'sawtooth';
  oscB.frequency.value = 62; // semitone-ish above — dissonant
  const oscC = ctx.createOscillator();
  oscC.type = 'square';
  oscC.frequency.value = 116;

  oscA.connect(merger);
  oscB.connect(merger);
  const cGain = ctx.createGain();
  cGain.gain.value = 0.18;
  oscC.connect(cGain).connect(merger);

  merger.connect(filter).connect(out);
  oscA.start();
  oscB.start();
  oscC.start();

  // Faster pulse: every ~1.0s.
  let pulseStopped = false;
  const pulse = () => {
    if (pulseStopped) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(78, t);
    o.frequency.exponentialRampToValueAtTime(44, t + 0.16);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.32, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.22);
    setTimeout(pulse, 1000);
  };
  setTimeout(pulse, 600);

  return {
    stop: () => {
      pulseStopped = true;
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

function buildCombatBedBossly(ctx: AudioContext, out: AudioNode) {
  // Slow, heavy, brassy. Lower root, slow swelling pad, deep timpani pulse.
  const merger = ctx.createGain();
  merger.gain.value = 0.5;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 260;
  filter.Q.value = 6;

  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.09;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 60;
  lfo.connect(lfoGain).connect(filter.frequency);
  lfo.start();

  const root = ctx.createOscillator();
  root.type = 'sawtooth';
  root.frequency.value = 44; // F1, heavy
  const fifth = ctx.createOscillator();
  fifth.type = 'sawtooth';
  fifth.frequency.value = 66; // C2
  const min3 = ctx.createOscillator();
  min3.type = 'square';
  min3.frequency.value = 52; // Ab1 — minor third = menacing
  const m3Gain = ctx.createGain();
  m3Gain.gain.value = 0.3;

  root.connect(merger);
  fifth.connect(merger);
  min3.connect(m3Gain).connect(merger);

  merger.connect(filter).connect(out);
  root.start();
  fifth.start();
  min3.start();

  // Timpani heartbeat every ~2s.
  let pulseStopped = false;
  const pulse = () => {
    if (pulseStopped) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(80, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.32);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.42, t + 0.025);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.42);
    setTimeout(pulse, 2000);
  };
  setTimeout(pulse, 900);

  return {
    stop: () => {
      pulseStopped = true;
      try {
        root.stop();
        fifth.stop();
        min3.stop();
        lfo.stop();
      } catch {
        /* ignore */
      }
    },
  };
}

function buildHubAmbient(ctx: AudioContext, out: AudioNode) {
  // Warm, sparse fireside: low wind drone + occasional fire-crackle clicks.
  // Quieter than hub_bed by design — meant to sit under voices.
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 480;
  filter.Q.value = 0.6;

  // Distant wind: filtered noise pad.
  const wind = ctx.createBufferSource();
  wind.buffer = noiseBuffer(ctx, 4000);
  wind.loop = true;
  const windFilter = ctx.createBiquadFilter();
  windFilter.type = 'bandpass';
  windFilter.frequency.value = 380;
  windFilter.Q.value = 0.6;
  const windGain = ctx.createGain();
  windGain.gain.value = 0.16;
  const windLfo = ctx.createOscillator();
  windLfo.type = 'sine';
  windLfo.frequency.value = 0.07;
  const windLfoGain = ctx.createGain();
  windLfoGain.gain.value = 0.06;
  windLfo.connect(windLfoGain).connect(windGain.gain);
  windLfo.start();
  wind.connect(windFilter).connect(windGain).connect(filter);
  wind.start();

  // Low warm drone — a single hearth note.
  const hearth = ctx.createOscillator();
  hearth.type = 'sine';
  hearth.frequency.value = 82.5; // E2
  const hearthGain = ctx.createGain();
  hearthGain.gain.value = 0.1;
  hearth.connect(hearthGain).connect(filter);
  hearth.start();

  filter.connect(out);

  // Sparse fire crackles — random short noise pops every 1–3s.
  let cracklesStopped = false;
  const crackle = () => {
    if (cracklesStopped) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, 30 + Math.random() * 40);
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 1800;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.12 + Math.random() * 0.08, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05 + Math.random() * 0.05);
    src.connect(f).connect(g).connect(out);
    src.start(t);
    setTimeout(crackle, 1000 + Math.random() * 2200);
  };
  setTimeout(crackle, 800);

  return {
    stop: () => {
      cracklesStopped = true;
      try {
        wind.stop();
        hearth.stop();
        windLfo.stop();
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
  combat_bed_tense: buildCombatBedTense,
  combat_bed_bossly: buildCombatBedBossly,
  hub_bed: buildHubBed,
  hub_ambient: buildHubAmbient,
};

export function playMusic(id: MusicId) {
  audioEngine.playMusic(id, MUSIC_BUILDERS[id]);
}

export function stopMusic() {
  audioEngine.stopMusic();
}
