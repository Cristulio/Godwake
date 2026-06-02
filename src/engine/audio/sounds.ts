/**
 * SFX + music registry. Each entry is a small Web Audio graph builder.
 * Swap any entry for a buffer-source loader later without touching callers.
 */
import { audioEngine, type SfxRenderer } from './AudioEngine';

export type SfxId =
  | 'ui_click'
  | 'ui_hover'
  | 'dice_clack'
  | 'swing_whoosh'
  | 'swing_whoosh_blade'
  | 'swing_whoosh_blunt'
  | 'swing_whoosh_bow'
  | 'swing_whoosh_dagger'
  | 'hit_thud'
  | 'crit_hit'
  | 'miss_whiff'
  | 'player_hurt'
  | 'armor_clang'
  | 'level_up_sting'
  | 'death_sting'
  | 'monster_death'
  | 'victory_sting'
  | 'shrine_chime'
  | 'heal_chime'
  | 'boss_intro'
  | 'boss_phase'
  | 'footstep'
  // Spell casts — element-flavored.
  | 'spell_fire'
  | 'spell_ice'
  | 'spell_lightning'
  | 'spell_arcane'
  | 'spell_holy'
  | 'spell_debuff'
  // Class-ability signatures.
  | 'buff_surge'
  | 'second_wind'
  // Enemy abilities.
  | 'enemy_cast';

export type MusicId =
  | 'hub_theme'
  | 'combat_theme'
  | 'combat_theme_tense'
  | 'boss_theme'
  | 'victory_theme';

// Cache noise buffers per context + duration so we don't re-allocate and
// re-fill on every sound play. The same broadband noise texture is
// inaudibly repeated; the filter sweep that follows is what shapes timbre.
const _noiseCache = new WeakMap<AudioContext, Map<number, AudioBuffer>>();

function noiseBuffer(ctx: AudioContext, ms: number): AudioBuffer {
  let byCtx = _noiseCache.get(ctx);
  if (!byCtx) {
    byCtx = new Map();
    _noiseCache.set(ctx, byCtx);
  }
  let buf = byCtx.get(ms);
  if (!buf) {
    const sampleRate = ctx.sampleRate;
    const length = Math.max(1, Math.floor((ms / 1000) * sampleRate));
    buf = ctx.createBuffer(1, length, sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    byCtx.set(ms, buf);
  }
  return buf;
}

// Multiply a frequency by a small random factor so repeated SFX don't grate.
// `cents` is the half-width of the jitter window in musical cents (100 = a
// semitone). A touch of detune per play keeps the 8-bit timbre but breaks up
// the machine-gun sameness of identical impacts.
function jitter(freq: number, cents = 35): number {
  const span = (Math.random() * 2 - 1) * cents;
  return freq * Math.pow(2, span / 1200);
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

const renderUiHover: SfxRenderer = (ctx, out, now) => {
  // Whisper-quiet high tick — feedback for moving over a control.
  blip(ctx, out, jitter(2600, 25), now, 0.03, 0.04, 'square');
};

const renderPlayerHurt: SfxRenderer = (ctx, out, now) => {
  // Lower, pained version of the impact: a sub thud + a short downward
  // square grunt so a blow LANDING ON YOU reads differently from your hits.
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(jitter(120, 20), now);
  osc.frequency.exponentialRampToValueAtTime(38, now + 0.16);
  const oGain = ctx.createGain();
  oGain.gain.setValueAtTime(0.5, now);
  oGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
  osc.connect(oGain).connect(out);
  osc.start(now);
  osc.stop(now + 0.24);

  const grunt = ctx.createOscillator();
  grunt.type = 'square';
  grunt.frequency.setValueAtTime(jitter(220, 30), now);
  grunt.frequency.exponentialRampToValueAtTime(90, now + 0.14);
  const gGain = ctx.createGain();
  gGain.gain.setValueAtTime(0.0001, now);
  gGain.gain.linearRampToValueAtTime(0.16, now + 0.02);
  gGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
  grunt.connect(gGain).connect(out);
  grunt.start(now);
  grunt.stop(now + 0.18);
};

const renderArmorClang: SfxRenderer = (ctx, out, now) => {
  // Bright metallic clang — a blow turned by armor/ward. Short noise transient
  // plus two inharmonic ringing partials so it sings like struck steel.
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, 40);
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 3200;
  filter.Q.value = 1.5;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.4, now);
  ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
  src.connect(filter).connect(ng).connect(out);
  src.start(now);
  blip(ctx, out, jitter(2100, 20), now, 0.28, 0.12, 'triangle');
  blip(ctx, out, jitter(3170, 20), now + 0.005, 0.2, 0.08, 'triangle');
};

const renderSpellFire: SfxRenderer = (ctx, out, now) => {
  // Rising filtered-noise roar + a low whump — combustion swelling out.
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, 360);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(500, now);
  filter.frequency.exponentialRampToValueAtTime(2600, now + 0.18);
  filter.frequency.exponentialRampToValueAtTime(700, now + 0.36);
  filter.Q.value = 1.2;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.0001, now);
  ng.gain.linearRampToValueAtTime(0.34, now + 0.06);
  ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
  src.connect(filter).connect(ng).connect(out);
  src.start(now);

  const whump = ctx.createOscillator();
  whump.type = 'sine';
  whump.frequency.setValueAtTime(jitter(160, 25), now);
  whump.frequency.exponentialRampToValueAtTime(60, now + 0.3);
  const wg = ctx.createGain();
  wg.gain.setValueAtTime(0.0001, now);
  wg.gain.linearRampToValueAtTime(0.22, now + 0.04);
  wg.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
  whump.connect(wg).connect(out);
  whump.start(now);
  whump.stop(now + 0.36);
};

const renderSpellIce: SfxRenderer = (ctx, out, now) => {
  // Crystalline shimmer: a high triangle cluster ringing down + thin sparkle.
  const base = jitter(1320, 18);
  [base, base * 1.5, base * 2].forEach((f, i) => {
    blip(ctx, out, f, now + i * 0.015, 0.5, 0.1 - i * 0.02, 'triangle');
  });
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, 220);
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 5200;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.0001, now);
  ng.gain.linearRampToValueAtTime(0.1, now + 0.02);
  ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
  src.connect(filter).connect(ng).connect(out);
  src.start(now);
};

const renderSpellLightning: SfxRenderer = (ctx, out, now) => {
  // Sharp electric snap: highpassed noise crack + fast descending crackle.
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, 160);
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(6000, now);
  filter.frequency.exponentialRampToValueAtTime(2000, now + 0.14);
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.4, now);
  ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
  src.connect(filter).connect(ng).connect(out);
  src.start(now);
  const top = jitter(3000, 20);
  [0, 0.03, 0.06, 0.09].forEach((dt, i) => {
    blip(ctx, out, top * (1 - i * 0.18), now + dt, 0.05, 0.1, 'square');
  });
};

const renderSpellArcane: SfxRenderer = (ctx, out, now) => {
  // Warbling twinkle — magic-missile sparkle. Detuned triangle arpeggio rising.
  const root = jitter(660, 18);
  [root, root * 1.26, root * 1.5, root * 2].forEach((f, i) => {
    blip(ctx, out, f, now + i * 0.05, 0.18, 0.13, 'triangle');
    blip(ctx, out, f * 1.005, now + i * 0.05, 0.18, 0.06, 'sine');
  });
};

const renderSpellHoly: SfxRenderer = (ctx, out, now) => {
  // Bright consonant bell chord — radiant restorative shimmer.
  const root = jitter(523, 12); // ~C5
  [root, root * 1.25, root * 1.5, root * 2].forEach((f) => {
    blip(ctx, out, f, now, 0.8, 0.1, 'triangle');
  });
  blip(ctx, out, root * 3, now + 0.06, 0.5, 0.05, 'sine');
};

const renderSpellDebuff: SfxRenderer = (ctx, out, now) => {
  // Sour descending tone + low sapping noise — something taking hold of you.
  const osc = ctx.createOscillator();
  osc.type = 'square';
  osc.frequency.setValueAtTime(jitter(330, 20), now);
  osc.frequency.exponentialRampToValueAtTime(110, now + 0.4);
  const og = ctx.createGain();
  og.gain.setValueAtTime(0.0001, now);
  og.gain.linearRampToValueAtTime(0.14, now + 0.04);
  og.gain.exponentialRampToValueAtTime(0.0001, now + 0.44);
  osc.connect(og).connect(out);
  osc.start(now);
  osc.stop(now + 0.46);

  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, 300);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 700;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.0001, now);
  ng.gain.linearRampToValueAtTime(0.12, now + 0.06);
  ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
  src.connect(filter).connect(ng).connect(out);
  src.start(now);
};

const renderBuffSurge: SfxRenderer = (ctx, out, now) => {
  // Power swell: a sawtooth sweep up + a quick triumphant flick.
  const sweep = ctx.createOscillator();
  sweep.type = 'sawtooth';
  sweep.frequency.setValueAtTime(140, now);
  sweep.frequency.exponentialRampToValueAtTime(jitter(560, 15), now + 0.22);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(700, now);
  filter.frequency.exponentialRampToValueAtTime(2600, now + 0.22);
  const sg = ctx.createGain();
  sg.gain.setValueAtTime(0.0001, now);
  sg.gain.linearRampToValueAtTime(0.2, now + 0.05);
  sg.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
  sweep.connect(filter).connect(sg).connect(out);
  sweep.start(now);
  sweep.stop(now + 0.3);
  blip(ctx, out, 523, now + 0.2, 0.12, 0.12, 'square');
  blip(ctx, out, 784, now + 0.26, 0.16, 0.12, 'square');
};

const renderSecondWind: SfxRenderer = (ctx, out, now) => {
  // Resolve regained: a warm rising fourth on triangle with a soft body.
  blip(ctx, out, 392, now, 0.3, 0.16, 'triangle'); // G4
  blip(ctx, out, 523, now + 0.12, 0.45, 0.16, 'triangle'); // C5
  const body = ctx.createOscillator();
  body.type = 'sine';
  body.frequency.setValueAtTime(196, now);
  body.frequency.linearRampToValueAtTime(262, now + 0.4);
  const bg = ctx.createGain();
  bg.gain.setValueAtTime(0.0001, now);
  bg.gain.linearRampToValueAtTime(0.14, now + 0.08);
  bg.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
  body.connect(bg).connect(out);
  body.start(now);
  body.stop(now + 0.52);
};

const renderBossPhase: SfxRenderer = (ctx, out, now) => {
  // Short menacing brass stab — the boss refuses to fall. A low minor cluster
  // plus a hard drum hit; punchier and quicker than the 3s boss_intro.
  const cluster = [73, 87, 110]; // D2, F2, A2 — minor triad
  cluster.forEach((f) => {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = jitter(f, 8);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.16, now + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    o.connect(filter).connect(g).connect(out);
    o.start(now);
    o.stop(now + 0.62);
  });
  const kick = ctx.createOscillator();
  kick.type = 'sine';
  kick.frequency.setValueAtTime(170, now);
  kick.frequency.exponentialRampToValueAtTime(44, now + 0.3);
  const kg = ctx.createGain();
  kg.gain.setValueAtTime(0.0001, now);
  kg.gain.linearRampToValueAtTime(0.5, now + 0.015);
  kg.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
  kick.connect(kg).connect(out);
  kick.start(now);
  kick.stop(now + 0.36);
};

const renderEnemyCast: SfxRenderer = (ctx, out, now) => {
  // Eerie summon: detuned descending sines + a swelling noise breath.
  [jitter(440, 15), jitter(415, 15)].forEach((f) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f, now);
    o.frequency.exponentialRampToValueAtTime(f * 0.5, now + 0.4);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.12, now + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
    o.connect(g).connect(out);
    o.start(now);
    o.stop(now + 0.44);
  });
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, 320);
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(300, now);
  filter.frequency.exponentialRampToValueAtTime(1400, now + 0.3);
  filter.Q.value = 2;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.0001, now);
  ng.gain.linearRampToValueAtTime(0.12, now + 0.12);
  ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);
  src.connect(filter).connect(ng).connect(out);
  src.start(now);
};

const SFX: Record<SfxId, SfxRenderer> = {
  ui_click: renderUiClick,
  ui_hover: renderUiHover,
  dice_clack: renderDiceClack,
  swing_whoosh: renderSwingWhoosh,
  swing_whoosh_blade: renderSwingBlade,
  swing_whoosh_blunt: renderSwingBlunt,
  swing_whoosh_bow: renderSwingBow,
  swing_whoosh_dagger: renderSwingDagger,
  hit_thud: renderHitThud,
  crit_hit: renderCritHit,
  miss_whiff: renderMissWhiff,
  player_hurt: renderPlayerHurt,
  armor_clang: renderArmorClang,
  level_up_sting: renderLevelUpSting,
  victory_sting: renderVictorySting,
  death_sting: renderDeathSting,
  monster_death: renderMonsterDeath,
  shrine_chime: renderShrineChime,
  heal_chime: renderHealChime,
  boss_intro: renderBossIntro,
  boss_phase: renderBossPhase,
  footstep: renderFootstep,
  spell_fire: renderSpellFire,
  spell_ice: renderSpellIce,
  spell_lightning: renderSpellLightning,
  spell_arcane: renderSpellArcane,
  spell_holy: renderSpellHoly,
  spell_debuff: renderSpellDebuff,
  buff_surge: renderBuffSurge,
  second_wind: renderSecondWind,
  enemy_cast: renderEnemyCast,
};

/** Every registered SFX id. The record is `Record<SfxId, …>`, so this is total. */
export const SFX_IDS = Object.keys(SFX) as SfxId[];

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
  // The atmospheric base the hub theme's melody and bass sit on top of.
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

// ---------------------------------------------------------------------------
// Chiptune sequencer. The beds above are atmosphere; the themes below lay
// actual melodies/bass/percussion on top of them. Each track is a small
// note-data array so the musicality is trivial to revise after listening —
// edit the step lists, not the synthesis.
// ---------------------------------------------------------------------------

type StopHandle = { stop: () => void };

// Note frequencies (equal temperament). Add entries as melodies need them.
const HZ = {
  D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.0, A2: 110.0, Bb2: 116.54,
  C3: 130.81, D3: 146.83, Eb3: 155.56, E3: 164.81, F3: 174.61, G3: 196.0,
  A3: 220.0, Bb3: 233.08, C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23,
  G4: 392.0, A4: 440.0, Bb4: 466.16, B4: 493.88, C5: 523.25, D5: 587.33,
  E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.0,
} as const;

const REST = 0;
/** [frequency in Hz (0 = rest), duration in beats]. */
type Step = [number, number];

interface SeqOpts {
  beatS: number;
  level: number;
  type?: OscillatorType;
  /** Fraction of each step the note actually sounds (rest is the gap). */
  sustain?: number;
}

/**
 * Loop a monophonic note sequence. Each loop is scheduled a bar ahead with
 * `blip` (which self-stops its oscillators), then a timer reschedules the next
 * loop — so there are never hanging nodes and `stop()` just halts rescheduling.
 */
function startSequence(
  ctx: AudioContext,
  out: AudioNode,
  steps: Step[],
  opts: SeqOpts,
): StopHandle {
  let stopped = false;
  const loopBeats = steps.reduce((s, [, b]) => s + b, 0);
  const loopMs = loopBeats * opts.beatS * 1000;
  const play = () => {
    if (stopped) return;
    let t = ctx.currentTime + 0.04;
    for (const [freq, beats] of steps) {
      const d = beats * opts.beatS;
      if (freq > 0) {
        blip(ctx, out, freq, t, Math.max(0.05, d * (opts.sustain ?? 0.85)),
          opts.level, opts.type ?? 'square');
      }
      t += d;
    }
    setTimeout(play, loopMs);
  };
  play();
  return { stop: () => { stopped = true; } };
}

type Drum = 'k' | 'h' | 's' | '.'; // kick / hat / snare / rest

function drumHit(ctx: AudioContext, out: AudioNode, t: number, kind: Drum) {
  if (kind === 'k') {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.32, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.18);
    return;
  }
  // Hat and snare are filtered noise; snare is fatter and lower-passed.
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, kind === 's' ? 90 : 40);
  const f = ctx.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = kind === 's' ? 1400 : 7000;
  const g = ctx.createGain();
  const peak = kind === 's' ? 0.18 : 0.07;
  g.gain.setValueAtTime(peak, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + (kind === 's' ? 0.12 : 0.05));
  src.connect(f).connect(g).connect(out);
  src.start(t);
}

function startDrums(
  ctx: AudioContext,
  out: AudioNode,
  pattern: Drum[],
  beatS: number,
): StopHandle {
  let stopped = false;
  const loopMs = pattern.length * beatS * 1000;
  const play = () => {
    if (stopped) return;
    let t = ctx.currentTime + 0.04;
    for (const step of pattern) {
      if (step !== '.') drumHit(ctx, out, t, step);
      t += beatS;
    }
    setTimeout(play, loopMs);
  };
  play();
  return { stop: () => { stopped = true; } };
}

function combine(...handles: StopHandle[]): StopHandle {
  return {
    stop: () => {
      for (const h of handles) {
        try {
          h.stop();
        } catch {
          /* ignore */
        }
      }
    },
  };
}

function buildHubTheme(ctx: AudioContext, out: AudioNode): StopHandle {
  // Fireside bed + a slow, wistful A-minor lead and a sparse low bass.
  const bed = buildHubAmbient(ctx, out);
  const lead = startSequence(ctx, out, [
    [HZ.A4, 1.5], [REST, 0.5], [HZ.C5, 1], [HZ.B4, 1], [HZ.A4, 2], [HZ.E4, 2],
    [HZ.F4, 1.5], [REST, 0.5], [HZ.A4, 1], [HZ.G4, 1], [HZ.E4, 2], [HZ.D4, 2],
    [HZ.C5, 1.5], [REST, 0.5], [HZ.B4, 1], [HZ.A4, 1], [HZ.G4, 2], [HZ.E4, 2],
    [HZ.F4, 1], [HZ.E4, 1], [HZ.D4, 1], [HZ.C4, 1], [HZ.A3, 4],
  ], { beatS: 0.46, level: 0.1, type: 'triangle', sustain: 0.9 });
  const bass = startSequence(ctx, out, [
    [HZ.A2, 4], [HZ.F2, 4], [HZ.C3, 4], [HZ.E2, 4],
  ], { beatS: 0.46, level: 0.1, type: 'triangle', sustain: 0.95 });
  return combine(bed, lead, bass);
}

function buildCombatTheme(ctx: AudioContext, out: AudioNode): StopHandle {
  // Brooding bed + a driving D-minor arpeggio, pulsing bass, four-on-the-floor.
  const bed = buildCombatBed(ctx, out);
  const lead = startSequence(ctx, out, [
    [HZ.D4, 1], [HZ.A4, 1], [HZ.D5, 1], [HZ.A4, 1], [HZ.F4, 1], [HZ.A4, 1], [HZ.D5, 1], [HZ.A4, 1],
    [HZ.C4, 1], [HZ.G4, 1], [HZ.C5, 1], [HZ.G4, 1], [HZ.E4, 1], [HZ.A4, 1], [HZ.C5, 1], [HZ.A4, 1],
  ], { beatS: 0.2, level: 0.09, type: 'square', sustain: 0.6 });
  const bass = startSequence(ctx, out, [
    [HZ.D2, 1], [REST, 1], [HZ.D2, 1], [REST, 1], [HZ.C3, 1], [REST, 1], [HZ.E2, 1], [REST, 1],
  ], { beatS: 0.4, level: 0.13, type: 'square', sustain: 0.5 });
  const drums = startDrums(ctx, out,
    ['k', 'h', 's', 'h', 'k', 'k', 's', 'h'], 0.4);
  return combine(bed, lead, bass, drums);
}

function buildCombatThemeTense(ctx: AudioContext, out: AudioNode): StopHandle {
  // Stalking bed + a tighter, more chromatic line at a faster clip.
  const bed = buildCombatBedTense(ctx, out);
  const lead = startSequence(ctx, out, [
    [HZ.E4, 1], [HZ.F4, 1], [HZ.E4, 1], [HZ.D4, 1], [HZ.E4, 1], [HZ.A4, 1], [HZ.E4, 1], [HZ.F4, 1],
    [HZ.E4, 1], [HZ.D4, 1], [HZ.C4, 1], [HZ.Bb3, 1], [HZ.A3, 2], [HZ.E4, 2],
  ], { beatS: 0.18, level: 0.085, type: 'square', sustain: 0.55 });
  const bass = startSequence(ctx, out, [
    [HZ.A2, 1], [REST, 1], [HZ.A2, 1], [HZ.Bb2, 1], [HZ.A2, 1], [REST, 1], [HZ.E2, 1], [REST, 1],
  ], { beatS: 0.36, level: 0.13, type: 'square', sustain: 0.5 });
  const drums = startDrums(ctx, out,
    ['k', 'h', 's', 'h', 'k', 'h', 's', 'k'], 0.36);
  return combine(bed, lead, bass, drums);
}

function buildBossTheme(ctx: AudioContext, out: AudioNode): StopHandle {
  // Heavy bossly bed + a slow, menacing low theme and high tension stabs.
  const bed = buildCombatBedBossly(ctx, out);
  const lead = startSequence(ctx, out, [
    [HZ.D3, 2], [HZ.Eb3, 2], [HZ.D3, 1], [HZ.C3, 1], [HZ.D3, 2],
    [HZ.F3, 2], [HZ.E3, 2], [HZ.D3, 3], [REST, 1],
  ], { beatS: 0.34, level: 0.12, type: 'square', sustain: 0.7 });
  const stab = startSequence(ctx, out, [
    [REST, 8], [HZ.A4, 1], [HZ.Bb4, 1], [HZ.A4, 2], [REST, 4],
  ], { beatS: 0.34, level: 0.07, type: 'triangle', sustain: 0.8 });
  const drums = startDrums(ctx, out,
    ['k', '.', '.', 's', '.', '.', 'k', '.', '.', 's', '.', '.'], 0.34);
  return combine(bed, lead, stab, drums);
}

function buildVictoryTheme(ctx: AudioContext, out: AudioNode): StopHandle {
  // Bright C-major fanfare loop — no dark drone under it.
  const lead = startSequence(ctx, out, [
    [HZ.G4, 1], [HZ.C5, 1], [HZ.E5, 1], [HZ.G5, 2], [HZ.E5, 1], [HZ.G5, 3],
    [HZ.F5, 1], [HZ.E5, 1], [HZ.D5, 1], [HZ.C5, 2], [HZ.E5, 1], [HZ.G5, 3],
  ], { beatS: 0.17, level: 0.13, type: 'square', sustain: 0.7 });
  const harmony = startSequence(ctx, out, [
    [HZ.C4, 1], [HZ.E4, 1], [HZ.G4, 1], [HZ.C5, 2], [HZ.G4, 1], [HZ.C5, 3],
    [HZ.A4, 1], [HZ.G4, 1], [HZ.F4, 1], [HZ.E4, 2], [HZ.G4, 1], [HZ.C5, 3],
  ], { beatS: 0.17, level: 0.06, type: 'triangle', sustain: 0.8 });
  const bass = startSequence(ctx, out, [
    [HZ.C3, 2], [HZ.G2, 2], [HZ.C3, 2], [HZ.G2, 2],
    [HZ.F2, 2], [HZ.C3, 2], [HZ.G2, 2], [HZ.G2, 2],
  ], { beatS: 0.17, level: 0.12, type: 'triangle', sustain: 0.85 });
  const drums = startDrums(ctx, out,
    ['k', 'h', 's', 'h', 'k', 'h', 's', 'h'], 0.34);
  return combine(lead, harmony, bass, drums);
}

const MUSIC_BUILDERS: Record<MusicId, (ctx: AudioContext, out: AudioNode) => StopHandle> = {
  hub_theme: buildHubTheme,
  combat_theme: buildCombatTheme,
  combat_theme_tense: buildCombatThemeTense,
  boss_theme: buildBossTheme,
  victory_theme: buildVictoryTheme,
};

/** Every registered music track id. */
export const MUSIC_IDS = Object.keys(MUSIC_BUILDERS) as MusicId[];

export function playMusic(id: MusicId) {
  audioEngine.playMusic(id, MUSIC_BUILDERS[id]);
}

export function stopMusic() {
  audioEngine.stopMusic();
}
