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
  | 'reincarnation_sting'
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
  | 'spell_necrotic'
  // Class-ability signatures.
  | 'buff_surge'
  | 'second_wind'
  // Enemy abilities.
  | 'enemy_cast';

/** Regular-fight combat themes the mob-aware selector rotates between. */
export type CombatMusicId =
  | 'combat_theme'
  | 'combat_theme_tense'
  | 'combat_march'
  | 'combat_prowl'
  | 'combat_grim'
  | 'combat_frenzy'
  | 'combat_rally';

/** Boss themes — a smaller pool the selector rotates per-boss. */
export type BossMusicId = 'boss_theme' | 'boss_theme_dire' | 'boss_theme_wrath';

export type MusicId =
  | 'title_theme'
  | 'hub_theme'
  | 'grove_theme'
  | 'shop_theme'
  | 'event_theme'
  | 'victory_theme'
  | 'combat_elite'
  | 'combat_throne'
  | 'boss_throne'
  | CombatMusicId
  | BossMusicId;

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
  // Soft rounded tick — felt more than heard. Sine tap + a whisper of noise.
  blip(ctx, out, jitter(1050, 15), now, 0.05, 0.1, 'sine');
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, 14);
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 1600;
  f.Q.value = 2;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.05, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);
  src.connect(f).connect(g).connect(out);
  src.start(now);
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
  // Transient + body + tail: noise click, low sine drop, faint ring.
  const click = ctx.createBufferSource();
  click.buffer = noiseBuffer(ctx, 14);
  const cf = ctx.createBiquadFilter();
  cf.type = 'highpass';
  cf.frequency.value = 2400;
  const cg = ctx.createGain();
  cg.gain.setValueAtTime(0.16, now);
  cg.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);
  click.connect(cf).connect(cg).connect(out);
  click.start(now);

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

  // Low ring tail — the blow resonates a beat after it lands.
  const ring = ctx.createOscillator();
  ring.type = 'triangle';
  ring.frequency.setValueAtTime(jitter(88, 18), now + 0.02);
  const rg = ctx.createGain();
  rg.gain.setValueAtTime(0.0001, now + 0.02);
  rg.gain.linearRampToValueAtTime(0.09, now + 0.05);
  rg.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
  ring.connect(rg).connect(out);
  ring.start(now + 0.02);
  ring.stop(now + 0.32);
};

const renderCritHit: SfxRenderer = (ctx, out, now) => {
  // The hit, plus a sub-thump and a rising highpass sweep — the blow that
  // mattered.
  renderHitThud(ctx, out, now);
  const sub = ctx.createOscillator();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(64, now);
  sub.frequency.exponentialRampToValueAtTime(30, now + 0.22);
  const sg = ctx.createGain();
  sg.gain.setValueAtTime(0.0001, now);
  sg.gain.linearRampToValueAtTime(0.32, now + 0.015);
  sg.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);
  sub.connect(sg).connect(out);
  sub.start(now);
  sub.stop(now + 0.28);
  const sweep = ctx.createBufferSource();
  sweep.buffer = noiseBuffer(ctx, 160);
  const f = ctx.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.setValueAtTime(900, now + 0.02);
  f.frequency.exponentialRampToValueAtTime(6200, now + 0.18);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, now + 0.02);
  g.gain.linearRampToValueAtTime(0.11, now + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
  sweep.connect(f).connect(g).connect(out);
  sweep.start(now + 0.02);
  blip(ctx, out, 1320, now + 0.04, 0.18, 0.16, 'triangle');
  blip(ctx, out, 1760, now + 0.07, 0.22, 0.13, 'triangle');
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
  // Rising major arpeggio with bell octaves and a warm swell underneath.
  const notes = [392, 494, 587, 784]; // G4 B4 D5 G5
  notes.forEach((f, i) => {
    blip(ctx, out, f, now + i * 0.09, 0.5, 0.16, 'triangle');
    blip(ctx, out, f * 2, now + i * 0.09 + 0.02, 0.3, 0.05, 'sine');
  });
  const pad = ctx.createOscillator();
  pad.type = 'triangle';
  pad.frequency.value = 196; // G3
  const pg = ctx.createGain();
  pg.gain.setValueAtTime(0.0001, now);
  pg.gain.linearRampToValueAtTime(0.1, now + 0.2);
  pg.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
  pad.connect(pg).connect(out);
  pad.start(now);
  pad.stop(now + 0.85);
};

const renderVictorySting: SfxRenderer = (ctx, out, now) => {
  // Three-note triumph: G4 -> C5 -> E5 (held), with a root swell and a bell
  // halo on the landing.
  blip(ctx, out, 392, now, 0.18, 0.2, 'triangle');
  blip(ctx, out, 523, now + 0.12, 0.18, 0.2, 'triangle');
  blip(ctx, out, 659, now + 0.24, 0.6, 0.22, 'triangle');
  blip(ctx, out, 1318, now + 0.26, 0.4, 0.06, 'sine');
  const root = ctx.createOscillator();
  root.type = 'triangle';
  root.frequency.value = 130.8; // C3
  const rg = ctx.createGain();
  rg.gain.setValueAtTime(0.0001, now);
  rg.gain.linearRampToValueAtTime(0.11, now + 0.2);
  rg.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
  root.connect(rg).connect(out);
  root.start(now);
  root.stop(now + 0.95);
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

  // The motif falling — the wheel takes the soul back.
  const fall = [220, 196, 146.83, 110]; // A3 G3 D3 A2
  fall.forEach((f, i) => {
    blip(ctx, out, f, now + 0.12 + i * 0.22, 0.32, 0.11, 'square');
  });
};

const renderReincarnationSting: SfxRenderer = (ctx, out, now) => {
  // The Godwake motif on rising bells — the wheel turns, the soul returns.
  const steps: Array<[number, number]> = [
    [440, 0], [523.25, 0.18], [493.88, 0.34], [659.25, 0.5],
    [587.33, 0.78], [880, 1.0],
  ]; // A4 C5 B4 E5 D5 A5
  for (const [f, dt] of steps) {
    blip(ctx, out, f, now + dt, 0.7, 0.1, 'triangle');
    blip(ctx, out, f * 2.01, now + dt + 0.01, 0.4, 0.03, 'sine');
  }
  const shimmer = ctx.createBufferSource();
  shimmer.buffer = noiseBuffer(ctx, 900);
  const sf = ctx.createBiquadFilter();
  sf.type = 'highpass';
  sf.frequency.value = 5200;
  const sg = ctx.createGain();
  sg.gain.setValueAtTime(0.0001, now);
  sg.gain.linearRampToValueAtTime(0.04, now + 0.5);
  sg.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
  shimmer.connect(sf).connect(sg).connect(out);
  shimmer.start(now);
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
  // A tiny steel snick at the top of the flick.
  blip(ctx, out, jitter(3400, 25), now + 0.01, 0.05, 0.06, 'triangle');
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

  // Settling tail — the body drops.
  const tail = ctx.createOscillator();
  tail.type = 'sine';
  tail.frequency.setValueAtTime(70, now + 0.1);
  tail.frequency.exponentialRampToValueAtTime(42, now + 0.5);
  const tg = ctx.createGain();
  tg.gain.setValueAtTime(0.0001, now + 0.1);
  tg.gain.linearRampToValueAtTime(0.11, now + 0.16);
  tg.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
  tail.connect(tg).connect(out);
  tail.start(now + 0.1);
  tail.stop(now + 0.6);
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
  padGain.gain.linearRampToValueAtTime(0.2, now + 0.4);
  padGain.gain.setValueAtTime(0.2, now + 2.2);
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
    g.gain.linearRampToValueAtTime(0.42, t + 0.015);
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
  const smack = ctx.createBufferSource();
  smack.buffer = noiseBuffer(ctx, 30);
  const sf = ctx.createBiquadFilter();
  sf.type = 'bandpass';
  sf.frequency.value = 480;
  sf.Q.value = 1.2;
  const smg = ctx.createGain();
  smg.gain.setValueAtTime(0.28, now);
  smg.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
  smack.connect(sf).connect(smg).connect(out);
  smack.start(now);

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
  // Saw zap burst — the arc itself.
  const zap = ctx.createOscillator();
  zap.type = 'sawtooth';
  zap.frequency.setValueAtTime(jitter(2800, 30), now);
  zap.frequency.exponentialRampToValueAtTime(320, now + 0.11);
  const zg = ctx.createGain();
  zg.gain.setValueAtTime(0.0001, now);
  zg.gain.linearRampToValueAtTime(0.15, now + 0.008);
  zg.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
  zap.connect(zg).connect(out);
  zap.start(now);
  zap.stop(now + 0.15);
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

const renderSpellNecrotic: SfxRenderer = (ctx, out, now) => {
  // Detuned low growl + a breath of dark noise — life pulled out by the root.
  [jitter(108, 12), jitter(114, 12)].forEach((f) => {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(f, now);
    o.frequency.exponentialRampToValueAtTime(f * 0.55, now + 0.42);
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(900, now);
    filt.frequency.exponentialRampToValueAtTime(260, now + 0.4);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.15, now + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.46);
    o.connect(filt).connect(g).connect(out);
    o.start(now);
    o.stop(now + 0.48);
  });
  const breath = ctx.createBufferSource();
  breath.buffer = noiseBuffer(ctx, 380);
  const bf = ctx.createBiquadFilter();
  bf.type = 'bandpass';
  bf.frequency.setValueAtTime(700, now);
  bf.frequency.exponentialRampToValueAtTime(180, now + 0.4);
  bf.Q.value = 1.4;
  const bg = ctx.createGain();
  bg.gain.setValueAtTime(0.0001, now);
  bg.gain.linearRampToValueAtTime(0.13, now + 0.08);
  bg.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
  breath.connect(bf).connect(bg).connect(out);
  breath.start(now);
  const sub = ctx.createOscillator();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(55, now);
  sub.frequency.exponentialRampToValueAtTime(36, now + 0.35);
  const subg = ctx.createGain();
  subg.gain.setValueAtTime(0.0001, now);
  subg.gain.linearRampToValueAtTime(0.15, now + 0.06);
  subg.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
  sub.connect(subg).connect(out);
  sub.start(now);
  sub.stop(now + 0.42);
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
  reincarnation_sting: renderReincarnationSting,
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
  spell_necrotic: renderSpellNecrotic,
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

// ---------------------------------------------------------------------------
// HD-chiptune song engine. Themes below are scheduled block-by-block (a block
// = one pass of the song's form, a whole number of bars) at absolute context
// times: live playback keeps one block of lookahead via a timer; the render
// script passes `offline` and gets the same bars scheduled deterministically
// with no wall-clock timers. All voices share the block grid, so layers never
// drift and loop seams land on bar boundaries.
//
// Musical material is plain note data (name strings + beat durations) — to
// revise a theme after listening, edit the step lists, not the synthesis.
// ---------------------------------------------------------------------------

type StopHandle = { stop: () => void; setIntensity?: (level: number) => void };

const NOTE_OFFSET: Record<string, number> = {
  C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
};

/** 'C#3' / 'Eb4' / 'A2' → midi number. */
function midi(name: string): number {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) return 69;
  const [, letter, acc, oct] = m;
  return (
    (Number(oct) + 1) * 12 +
    NOTE_OFFSET[letter] +
    (acc === '#' ? 1 : acc === 'b' ? -1 : 0)
  );
}

function midiHz(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

interface ParsedStep {
  /** Midi note, or null for a rest. */
  m: number | null;
  beats: number;
  vel: number;
}

type MStep = [string | null, number] | [string | null, number, number];

/** Parse a melody once at module level: [note, beats, velocity?]. */
function mel(steps: MStep[]): ParsedStep[] {
  return steps.map((s) => ({
    m: s[0] === null ? null : midi(s[0]),
    beats: s[1],
    vel: s[2] ?? 1,
  }));
}

/** Chord helper: note names → midi array. */
function ch(...names: string[]): number[] {
  return names.map(midi);
}

// ---------------------------------------------------------------------------
// The Godwake motif — the game's leitmotif. Scale degrees 1 ♭3 2 5 4 1: a
// soul climbing to the dominant and being pulled back to the wheel. Stated
// straight by the title/hub/grove leads, inverted (falling) under bosses, and
// with a major third in the victory tag — so the whole game sounds like one
// work. Offsets are semitones from the theme's root; beats keep its rhythm.
// ---------------------------------------------------------------------------
const MOTIF: Array<[number, number]> = [
  [0, 1.5], [3, 0.5], [2, 1], [7, 2], [5, 1], [0, 2],
];

function motifSteps(
  root: string,
  variant: 'straight' | 'inverted' | 'major' = 'straight',
  stretch = 1,
  /** Inversions land on chord tones, not a strict mirror — overridable. */
  invertedOffsets: number[] = [0, -4, -2, -7, -5, 0],
): ParsedStep[] {
  const rootMidi = midi(root);
  return MOTIF.map(([semi, beats], i) => ({
    m:
      rootMidi +
      (variant === 'inverted'
        ? invertedOffsets[i]
        : variant === 'major' && semi === 3
          ? 4
          : semi),
    beats: beats * stretch,
    vel: 1,
  }));
}

// ---------------------------------------------------------------------------
// Voice helpers. All schedule at absolute times and self-stop their nodes.
// ---------------------------------------------------------------------------

interface ToneOpts {
  type: OscillatorType;
  attack: number;
  vibrato?: { hz: number; cents: number; after?: number };
  glideFromHz?: number | null;
  glideS?: number;
}

function toneAt(
  ctx: AudioContext,
  out: AudioNode,
  freq: number,
  t: number,
  durS: number,
  level: number,
  opts: ToneOpts,
) {
  const osc = ctx.createOscillator();
  osc.type = opts.type;
  if (opts.glideFromHz && opts.glideS) {
    osc.frequency.setValueAtTime(opts.glideFromHz, t);
    osc.frequency.exponentialRampToValueAtTime(
      freq,
      t + Math.min(opts.glideS, durS * 0.5),
    );
  } else {
    osc.frequency.setValueAtTime(freq, t);
  }
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(level, t + opts.attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + durS);
  osc.connect(g).connect(out);
  // Vibrato only earns its two extra nodes on held notes.
  if (opts.vibrato && durS > 0.22) {
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = opts.vibrato.hz;
    const depth = ctx.createGain();
    const onset = t + (opts.vibrato.after ?? 0.12);
    depth.gain.setValueAtTime(0, t);
    depth.gain.setValueAtTime(0, onset);
    depth.gain.linearRampToValueAtTime(
      freq * (Math.pow(2, opts.vibrato.cents / 1200) - 1),
      onset + 0.2,
    );
    lfo.connect(depth).connect(osc.frequency);
    lfo.start(t);
    lfo.stop(t + durS + 0.03);
  }
  osc.start(t);
  osc.stop(t + durS + 0.03);
}

interface LineOpts {
  level: number;
  type?: OscillatorType;
  /** Fraction of each step the note sounds. */
  sustain?: number;
  attack?: number;
  semitones?: number;
  /** Push off-8th positions late by this fraction of a beat. */
  swing?: number;
  vibrato?: { hz: number; cents: number; after?: number };
  /** Portamento seconds from the previous note (mono lines). */
  glide?: number;
}

/** Schedule a monophonic line starting at t0. Returns its length in beats. */
function lineAt(
  ctx: AudioContext,
  out: AudioNode,
  steps: ParsedStep[],
  t0: number,
  beatS: number,
  opts: LineOpts,
): number {
  let pos = 0;
  let prevHz: number | null = null;
  for (const s of steps) {
    if (s.m !== null) {
      const f = midiHz(s.m + (opts.semitones ?? 0));
      const eighth = pos * 2;
      const onOffEighth = Math.abs(eighth - Math.round(eighth)) < 1e-6 && Math.round(eighth) % 2 === 1;
      const off = opts.swing && onOffEighth ? opts.swing * beatS : 0;
      toneAt(
        ctx, out, f,
        t0 + pos * beatS + off,
        Math.max(0.05, s.beats * beatS * (opts.sustain ?? 0.85)),
        opts.level * s.vel,
        {
          type: opts.type ?? 'square',
          attack: opts.attack ?? 0.006,
          vibrato: opts.vibrato,
          glideFromHz: opts.glide ? prevHz : null,
          glideS: opts.glide,
        },
      );
      prevHz = f;
    }
    pos += s.beats;
  }
  return pos;
}

interface PadOpts {
  level: number;
  type?: OscillatorType;
  /** Cents — each chord note becomes a ± detuned pair for width. */
  detune?: number;
  attack?: number;
  release?: number;
  semitones?: number;
  lowpass?: number;
}

/** A sustained chord: detuned osc pairs through one envelope. */
function padChordAt(
  ctx: AudioContext,
  out: AudioNode,
  midis: number[],
  t: number,
  durS: number,
  opts: PadOpts,
) {
  const oscCount = midis.length * (opts.detune ? 2 : 1);
  const g = ctx.createGain();
  const att = opts.attack ?? Math.min(0.4, durS * 0.3);
  const rel = opts.release ?? Math.min(0.6, durS * 0.3);
  const holdT = Math.max(t + att, t + durS - rel);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(opts.level / oscCount, t + att);
  g.gain.setValueAtTime(opts.level / oscCount, holdT);
  g.gain.linearRampToValueAtTime(0.0001, t + durS);
  let input: AudioNode = g;
  if (opts.lowpass) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = opts.lowpass;
    f.connect(g);
    input = f;
  }
  g.connect(out);
  const spread = opts.detune ? [-opts.detune, opts.detune] : [0];
  for (const m of midis) {
    const base = midiHz(m + (opts.semitones ?? 0));
    for (const cents of spread) {
      const o = ctx.createOscillator();
      o.type = opts.type ?? 'sawtooth';
      o.frequency.value = base * Math.pow(2, cents / 1200);
      o.connect(input);
      o.start(t);
      o.stop(t + durS + 0.05);
    }
  }
}

/** Bell: fundamental + inharmonic partials, long ring. */
function bellAt(
  ctx: AudioContext,
  out: AudioNode,
  noteMidi: number,
  t: number,
  durS: number,
  level: number,
  semitones = 0,
) {
  const f = midiHz(noteMidi + semitones);
  toneAt(ctx, out, f, t, durS, level, { type: 'sine', attack: 0.004 });
  toneAt(ctx, out, f * 2.76, t, durS * 0.45, level * 0.26, {
    type: 'sine',
    attack: 0.002,
  });
  toneAt(ctx, out, f * 5.4, t, durS * 0.18, level * 0.09, {
    type: 'sine',
    attack: 0.002,
  });
}

// ---------------------------------------------------------------------------
// Noise-burst drum kit on a 16th grid. Pattern chars per bar (16 per 4/4 bar):
// k kick / K accent kick / s snare / S fat snare / h hat / H open hat /
// t tom / . rest. Fills live in the pattern data, not the synthesis.
// ---------------------------------------------------------------------------

function drumHitAt(
  ctx: AudioContext,
  out: AudioNode,
  kind: string,
  t: number,
  level: number,
) {
  if (kind === 'k' || kind === 'K') {
    const accent = kind === 'K' ? 1.3 : 1;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(46, t + 0.11);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.3 * level * accent, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.17);
    // Click transient so the kick reads on small speakers.
    const click = ctx.createBufferSource();
    click.buffer = noiseBuffer(ctx, 12);
    const cf = ctx.createBiquadFilter();
    cf.type = 'highpass';
    cf.frequency.value = 2500;
    const cg = ctx.createGain();
    cg.gain.setValueAtTime(0.05 * level * accent, t);
    cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.02);
    click.connect(cf).connect(cg).connect(out);
    click.start(t);
    return;
  }
  if (kind === 't') {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(190, t);
    o.frequency.exponentialRampToValueAtTime(85, t + 0.16);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.2 * level, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.22);
    return;
  }
  if (kind === 's' || kind === 'S') {
    const fat = kind === 'S' ? 1.35 : 1;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, 90);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1700;
    f.Q.value = 0.9;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.16 * level * fat, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
    src.connect(f).connect(g).connect(out);
    src.start(t);
    // Short 200Hz body under the noise crack.
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(210, t);
    o.frequency.exponentialRampToValueAtTime(140, t + 0.06);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.07 * level * fat, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.connect(og).connect(out);
    o.start(t);
    o.stop(t + 0.09);
    return;
  }
  // Hats.
  const open = kind === 'H';
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, open ? 110 : 35);
  const f = ctx.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = 7400;
  const g = ctx.createGain();
  g.gain.setValueAtTime((open ? 0.07 : 0.05) * level, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + (open ? 0.13 : 0.04));
  src.connect(f).connect(g).connect(out);
  src.start(t);
}

/** One bar of drums from a 16th-grid pattern string. */
function drumBarAt(
  ctx: AudioContext,
  out: AudioNode,
  pattern: string,
  t0: number,
  beatS: number,
  level = 1,
  swing = 0,
) {
  const stepS = beatS / 4;
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === '.') continue;
    // Swing the off-8ths (grid 2, 6, 10, 14), half-swing stray 16ths.
    const off =
      i % 4 === 2 ? swing * beatS : i % 2 === 1 ? swing * beatS * 0.55 : 0;
    drumHitAt(ctx, out, c, t0 + i * stepS + off, level);
  }
}

// ---------------------------------------------------------------------------
// Continuous fixtures: echo, drones, wind. Built once per theme in `setup`,
// torn down by the returned stop.
// ---------------------------------------------------------------------------

interface Fixture {
  stop: () => void;
}

/** Feedback delay on the theme output — space and dread, kept dark. */
function makeEcho(
  ctx: AudioContext,
  out: AudioNode,
  timeS: number,
  feedback: number,
  wet: number,
): { input: GainNode } & Fixture {
  const input = ctx.createGain();
  input.connect(out);
  const delay = ctx.createDelay(2);
  delay.delayTime.value = timeS;
  const damp = ctx.createBiquadFilter();
  damp.type = 'lowpass';
  damp.frequency.value = 2300;
  const fb = ctx.createGain();
  fb.gain.value = feedback;
  const wetG = ctx.createGain();
  wetG.gain.value = wet;
  input.connect(delay);
  delay.connect(damp);
  damp.connect(fb);
  fb.connect(delay);
  damp.connect(wetG);
  wetG.connect(out);
  return {
    input,
    stop: () => {
      try {
        fb.gain.value = 0;
        input.disconnect();
        delay.disconnect();
        damp.disconnect();
        wetG.disconnect();
      } catch {
        /* ignore */
      }
    },
  };
}

/** Detuned low drone through a slowly-breathing lowpass. */
function makeDrone(
  ctx: AudioContext,
  out: AudioNode,
  freqs: Array<{ hz: number; type: OscillatorType; level: number }>,
  lowpassHz: number,
  lfo?: { hz: number; depth: number },
): Fixture {
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lowpassHz;
  filter.Q.value = 0.9;
  filter.connect(out);
  const stops: Array<() => void> = [];
  if (lfo) {
    const l = ctx.createOscillator();
    l.type = 'sine';
    l.frequency.value = lfo.hz;
    const lg = ctx.createGain();
    lg.gain.value = lfo.depth;
    l.connect(lg).connect(filter.frequency);
    l.start();
    stops.push(() => l.stop());
  }
  for (const f of freqs) {
    const o = ctx.createOscillator();
    o.type = f.type;
    o.frequency.value = f.hz;
    const g = ctx.createGain();
    g.gain.value = f.level;
    o.connect(g).connect(filter);
    o.start();
    stops.push(() => o.stop());
  }
  return {
    stop: () => {
      for (const s of stops) {
        try {
          s();
        } catch {
          /* ignore */
        }
      }
    },
  };
}

/** Looped filtered-noise wind with a slow swell. */
function makeWind(
  ctx: AudioContext,
  out: AudioNode,
  centerHz: number,
  level: number,
): Fixture {
  const wind = ctx.createBufferSource();
  wind.buffer = noiseBuffer(ctx, 4000);
  wind.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = centerHz;
  f.Q.value = 0.6;
  const g = ctx.createGain();
  g.gain.value = level;
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.07;
  const lg = ctx.createGain();
  lg.gain.value = level * 0.4;
  lfo.connect(lg).connect(g.gain);
  lfo.start();
  wind.connect(f).connect(g).connect(out);
  wind.start();
  return {
    stop: () => {
      try {
        wind.stop();
        lfo.stop();
      } catch {
        /* ignore */
      }
    },
  };
}

// ---------------------------------------------------------------------------
// The song runner.
// ---------------------------------------------------------------------------

interface SongSetup {
  /** Node block voices should target (e.g. an echo input). Defaults to out. */
  input?: AudioNode;
  stop?: () => void;
  /** Ramp continuous layer gains — boss phase intensity. */
  setIntensity?: (level: number, t: number) => void;
}

interface SongSpec {
  bpm: number;
  barsPerBlock: number;
  beatsPerBar?: number;
  /**
   * Per-theme output gain — the one calibration knob the render script's
   * loudness table tunes, so themes sit within ±2dB of the hub anchor
   * without retouching composition levels.
   */
  trim?: number;
  setup?: (ctx: AudioContext, out: AudioNode) => SongSetup;
  block: (
    ctx: AudioContext,
    out: AudioNode,
    t0: number,
    blockIdx: number,
    intensity: number,
  ) => void;
}

function runSong(
  ctx: AudioContext,
  outRaw: AudioNode,
  spec: SongSpec,
  offline?: { seconds: number },
): StopHandle {
  let out: AudioNode = outRaw;
  if (spec.trim && spec.trim !== 1) {
    const g = ctx.createGain();
    g.gain.value = spec.trim;
    g.connect(outRaw);
    out = g;
  }
  const beatS = 60 / spec.bpm;
  const blockS = spec.barsPerBlock * (spec.beatsPerBar ?? 4) * beatS;
  const made = spec.setup?.(ctx, out) ?? {};
  const input = made.input ?? out;

  if (offline) {
    // Deterministic schedule for the render script — intensity steps up per
    // block so the wav shows the arrangement building.
    let i = 0;
    for (let t = 0.06; t < offline.seconds; t += blockS, i++) {
      const lvl = Math.min(2, i);
      made.setIntensity?.(lvl, t);
      spec.block(ctx, input, t, i, lvl);
    }
    return {
      stop: () => {
        made.stop?.();
      },
    };
  }

  let intensity = 0;
  let nextT = ctx.currentTime + 0.08;
  let blockIdx = 0;
  const tick = () => {
    while (nextT < ctx.currentTime + 2.0) {
      spec.block(ctx, input, nextT, blockIdx, intensity);
      blockIdx++;
      nextT += blockS;
    }
  };
  tick();
  const timer = setInterval(tick, 300);
  return {
    stop: () => {
      clearInterval(timer);
      made.stop?.();
    },
    setIntensity: (level: number) => {
      intensity = level;
      made.setIntensity?.(level, ctx.currentTime);
    },
  };
}

// ---------------------------------------------------------------------------
// TITLE — "the god is dead; you are awake." A minor, slow and wide: lone
// square lead states the motif over a deep drone, bell answers, long echo.
// The answer leans on the raised seventh — the wound that will not shut.
// ---------------------------------------------------------------------------

const TITLE_LEAD_A = mel([
  // The motif, stated plainly...
  ['A3', 1.5], ['C4', 0.5], ['B3', 1], ['E4', 2], ['D4', 1], ['A3', 2],
  [null, 3],
  // ...and the answer sinks onto the leading tone before it can rest.
  ['E4', 1], ['C4', 1], ['B3', 1.5], ['G#3', 0.5], ['A3', 4], [null, 3],
  // Up an octave, farther away.
  ['A4', 1.5, 0.7], ['C5', 0.5, 0.7], ['B4', 1, 0.7], ['E5', 2, 0.7],
  ['D5', 1, 0.65], ['C5', 2, 0.65],
  [null, 1],
  // The sigh home: down to the seventh, lifted, let go.
  ['C5', 1, 0.6], ['B4', 1, 0.6], ['A4', 1, 0.6], ['G#4', 1, 0.6],
  ['A4', 3, 0.75],
]);

const TITLE_SPEC: SongSpec = {
  bpm: 70,
  barsPerBlock: 10,
  trim: 1.06,
  setup: (ctx, out) => {
    const echo = makeEcho(ctx, out, 0.46, 0.38, 0.3);
    const drone = makeDrone(
      ctx, out,
      [
        { hz: midiHz(midi('A1')), type: 'triangle', level: 0.085 },
        { hz: midiHz(midi('E2')), type: 'sine', level: 0.05 },
        { hz: midiHz(midi('A2')) * 1.003, type: 'triangle', level: 0.03 },
      ],
      900,
      { hz: 0.05, depth: 260 },
    );
    return {
      input: echo.input,
      stop: () => {
        echo.stop();
        drone.stop();
      },
    };
  },
  block: (ctx, out, t0, blockIdx) => {
    const beatS = 60 / 70;
    lineAt(ctx, out, TITLE_LEAD_A, t0, beatS, {
      level: 0.085,
      type: 'square',
      sustain: 0.92,
      attack: 0.02,
      vibrato: { hz: 5.2, cents: 14, after: 0.25 },
    });
    // Tolling bells, sparser than the lead.
    bellAt(ctx, out, midi('A4'), t0, 4 * beatS, 0.05);
    bellAt(ctx, out, midi('E5'), t0 + 20 * beatS, 4 * beatS, 0.04);
    if (blockIdx % 2 === 1) {
      bellAt(ctx, out, midi('C5'), t0 + 30 * beatS, 4 * beatS, 0.035);
    }
    // A distant boom opens every block.
    drumHitAt(ctx, out, 'K', t0 + 0.02, 0.5);
  },
};

// ---------------------------------------------------------------------------
// HUB — Wakeford at night: the fire is lit, and almost no one is left to sit
// at it. A minor over an i–VI–iv–V wheel; the pads are hollowed to open
// fifths and the bass walks the raised seventh into every return home.
// ---------------------------------------------------------------------------

const HUB_PROG: number[][] = [
  ch('A2', 'E3', 'A3'),
  ch('F2', 'C3', 'F3'),
  ch('D3', 'A3', 'D4'),
  ch('E3', 'B3', 'E4'),
];
const HUB_BASS_ROOTS = ['A2', 'F2', 'D2', 'E2'];

const HUB_LEAD_A = mel([
  // Long tones falling; the E-major bar holds the leading tone like a breath.
  ['A4', 2.5], ['C5', 0.5], ['B4', 1],
  ['A4', 1.5], ['G4', 0.5], ['F4', 2],
  ['E4', 2], ['D4', 1.5], [null, 0.5],
  ['E4', 1], ['G#4', 2], ['B4', 1],
  ['A4', 2.5], [null, 0.5], ['E5', 1],
  ['C5', 1.5], ['A4', 0.5], ['G4', 2],
  ['F4', 1], ['E4', 2], ['D4', 1],
  ['C4', 1.5], ['B3', 1.5], [null, 1],
]);
// Second half: the far voice, ending unresolved on G# — the motif answers it.
const HUB_LEAD_B = mel([
  ['E5', 2.5], ['D5', 0.5], ['C5', 1],
  ['C5', 1], ['A4', 2], [null, 1],
  ['F4', 1.5], ['E4', 1.5], ['D4', 1],
  ['B3', 1], ['G#4', 1.5], [null, 1.5],
]);

const HUB_SPEC: SongSpec = {
  bpm: 84,
  barsPerBlock: 16,
  trim: 1.19,
  setup: (ctx, out) => {
    const echo = makeEcho(ctx, out, 0.33, 0.22, 0.16);
    const wind = makeWind(ctx, out, 380, 0.13);
    const drone = makeDrone(
      ctx, out,
      [{ hz: midiHz(midi('A1')), type: 'sine', level: 0.07 }],
      700,
      { hz: 0.06, depth: 150 },
    );
    return {
      input: echo.input,
      stop: () => {
        echo.stop();
        wind.stop();
        drone.stop();
      },
    };
  },
  block: (ctx, out, t0, blockIdx) => {
    const beatS = 60 / 84;
    const barS = 4 * beatS;
    // Pads + bass walk the Am–F–Dm–E wheel; the E bar's bass lifts to G#.
    for (let bar = 0; bar < 16; bar++) {
      const chord = HUB_PROG[bar % 4];
      const t = t0 + bar * barS;
      const root = HUB_BASS_ROOTS[bar % 4];
      padChordAt(ctx, out, chord, t, barS * 1.02, {
        level: 0.075,
        type: 'triangle',
        detune: 6,
        attack: barS * 0.45,
        lowpass: 1000,
      });
      lineAt(
        ctx, out,
        mel(
          bar % 4 === 3
            ? [[root, 1.5], [null, 0.5], ['G#2', 1], [null, 1]]
            : [[root, 1.5], [null, 0.5], [root, 1], [null, 1]],
        ),
        t, beatS,
        { level: 0.085, type: 'triangle', sustain: 0.9 },
      );
      // One soft hat tick per bar once the theme has settled in.
      if (blockIdx > 0) {
        drumBarAt(ctx, out, '............h...', t, beatS, 0.35);
      }
    }
    // Lead: wistful verse, rising answer, motif cadence.
    lineAt(ctx, out, HUB_LEAD_A, t0, beatS, {
      level: 0.082,
      type: 'triangle',
      sustain: 0.92,
      vibrato: { hz: 5, cents: 10, after: 0.18 },
    });
    lineAt(ctx, out, HUB_LEAD_B, t0 + 32 * beatS, beatS, {
      level: 0.07,
      type: 'triangle',
      sustain: 0.92,
      vibrato: { hz: 5, cents: 10, after: 0.18 },
    });
    lineAt(ctx, out, motifSteps('A4'), t0 + 48 * beatS, beatS, {
      level: 0.085,
      type: 'triangle',
      sustain: 0.95,
      vibrato: { hz: 5, cents: 12, after: 0.2 },
    });
    // Fire crackles, scattered through the block.
    const blockS = 16 * barS;
    for (let i = 0; i < 12; i++) {
      const t = t0 + Math.random() * blockS;
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(ctx, 30 + Math.random() * 40);
      const f = ctx.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = 1800;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.09 + Math.random() * 0.06, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05 + Math.random() * 0.05);
      src.connect(f).connect(g).connect(out);
      src.start(t);
    }
  },
};

// ---------------------------------------------------------------------------
// GROVE — sacred green, grieving. E minor in hollowed fifths: harp arpeggios,
// bell motif at half speed, and the raised seventh (D#) arrives once per
// round like light reaching the forest floor.
// ---------------------------------------------------------------------------

const GROVE_PROG: number[][] = [
  ch('E3', 'B3', 'E4'), ch('E3', 'B3', 'E4'),
  ch('A3', 'E4', 'A4'), ch('A3', 'E4', 'A4'),
  ch('E3', 'B3', 'E4'), ch('C3', 'G3', 'E4'),
  ch('B2', 'F#3', 'B3'), ch('E3', 'B3', 'E4'),
];
const GROVE_BASS = ['E2', 'E2', 'A2', 'A2', 'E2', 'C2', 'B1', 'E2'];
const GROVE_ARPS: Record<string, string[]> = {
  E2: ['E3', 'B3', 'E4', 'G4', 'B4', 'G4', 'E4', 'B3'],
  C2: ['C3', 'G3', 'C4', 'E4', 'G4', 'E4', 'C4', 'G3'],
  A2: ['A3', 'E4', 'A4', 'C5', 'E5', 'C5', 'A4', 'E4'],
  B1: ['B2', 'F#3', 'B3', 'D#4', 'F#4', 'D#4', 'B3', 'F#3'],
};

const GROVE_SPEC: SongSpec = {
  bpm: 72,
  barsPerBlock: 8,
  trim: 1.19,
  setup: (ctx, out) => {
    const echo = makeEcho(ctx, out, 0.4, 0.3, 0.26);
    const drone = makeDrone(
      ctx, out,
      [
        { hz: midiHz(midi('E2')), type: 'sine', level: 0.06 },
        { hz: midiHz(midi('B2')), type: 'triangle', level: 0.028 },
      ],
      800,
      { hz: 0.045, depth: 200 },
    );
    const wind = makeWind(ctx, out, 620, 0.07);
    return {
      input: echo.input,
      stop: () => {
        echo.stop();
        drone.stop();
        wind.stop();
      },
    };
  },
  block: (ctx, out, t0, blockIdx) => {
    const beatS = 60 / 72;
    const barS = 4 * beatS;
    for (let bar = 0; bar < 8; bar++) {
      const t = t0 + bar * barS;
      padChordAt(ctx, out, GROVE_PROG[bar], t, barS * 1.05, {
        level: 0.06,
        type: 'triangle',
        detune: 7,
        attack: barS * 0.5,
        lowpass: 1200,
      });
      // Harp: one arpeggio sweep per bar.
      const arp = GROVE_ARPS[GROVE_BASS[bar]];
      lineAt(
        ctx, out,
        mel(arp.map((n) => [n, 0.5] as MStep)),
        t, beatS,
        { level: 0.055, type: 'triangle', sustain: 0.55, attack: 0.003 },
      );
      lineAt(ctx, out, mel([[GROVE_BASS[bar], 4]]), t, beatS, {
        level: 0.075,
        type: 'sine',
        sustain: 0.95,
      });
      // The forest's heartbeat.
      drumHitAt(ctx, out, 'k', t + 0.01, 0.45);
    }
    // Bell motif at half speed — even blocks; odd blocks get the falling answer.
    if (blockIdx % 2 === 0) {
      const steps = motifSteps('E4', 'straight', 2);
      let pos = 0;
      for (const s of steps) {
        if (s.m !== null) {
          bellAt(ctx, out, s.m, t0 + 8 * beatS + pos * beatS, s.beats * beatS * 0.9, 0.045);
        }
        pos += s.beats;
      }
    } else {
      for (const [i, n] of (['B4', 'G4', 'F#4', 'E4'] as const).entries()) {
        bellAt(ctx, out, midi(n), t0 + (12 + i * 4) * beatS, 3 * beatS, 0.04);
      }
    }
  },
};

// ---------------------------------------------------------------------------
// COMBAT cores. Three distinct engines; the seven shipped ids are knobs on
// these (transpose / tempo / swing / drum pattern), so a foe keeps a
// consistent flavor while fights stay varied. The selector lives in index.ts.
// ---------------------------------------------------------------------------

interface CombatKnob {
  semitones: number;
  /** Multiplies beat duration: >1 slower, <1 faster. */
  tempoMul: number;
  swing: number;
  drums?: { verse: string; fill: string };
  trim?: number;
}

interface CombatCoreDef {
  bpm: number;
  drone: (root: number) => Array<{ hz: number; type: OscillatorType; level: number }>;
  droneLowpass: number;
  rootMidi: number;
  drums: { verse: string; fill: string };
  drumLevel: number;
  block: (
    ctx: AudioContext,
    out: AudioNode,
    t0: number,
    blockIdx: number,
    beatS: number,
    semitones: number,
    swing: number,
    drums: { verse: string; fill: string },
    drumLevel: number,
  ) => void;
}

function makeCombatSpec(core: CombatCoreDef, knob: CombatKnob): SongSpec {
  const drums = knob.drums ?? core.drums;
  return {
    bpm: core.bpm / knob.tempoMul,
    barsPerBlock: 8,
    trim: knob.trim,
    setup: (ctx, out) =>
      makeDrone(
        ctx, out,
        core.drone(core.rootMidi + knob.semitones),
        core.droneLowpass,
        { hz: 0.14, depth: 90 },
      ),
    block: (ctx, out, t0, blockIdx) => {
      const beatS = (60 / core.bpm) * knob.tempoMul;
      core.block(
        ctx, out, t0, blockIdx, beatS,
        knob.semitones, knob.swing, drums, core.drumLevel,
      );
    },
  };
}

// BROOD — the front-line fight. D harmonic-minor world, driving 8ths:
// Dm Dm Bb Bb / Dm Dm Gm A — the old bright C-major answer turned down into
// Bb, and the A-major cadence (the raised seventh) pulling the loop home.
const BROOD_BASS_BARS: ParsedStep[][] = [
  ...['D2', 'D2', 'Bb1', 'Bb1', 'D2', 'D2'].map((r) => {
    const up = midi(r) + 12;
    return mel([
      [r, 0.5], [r, 0.5], [null, 0.5], [r, 0.5],
      [r, 0.5], [null, 0.5], [r, 0.5], [r, 0.5],
    ]).map((s, i) => (i === 3 ? { ...s, m: up } : s));
  }),
  mel([
    ['G1', 0.5], ['G1', 0.5], [null, 0.5], ['G2', 0.5],
    ['G1', 0.5], [null, 0.5], ['G1', 0.5], ['G1', 0.5],
  ]),
  mel([
    ['A1', 0.5], ['A1', 0.5], [null, 0.5], ['A2', 0.5],
    ['A1', 0.5], ['A1', 0.5], ['A2', 0.5], ['A1', 0.5],
  ]),
];

const BROOD_LEAD = mel([
  // Bars 1-2: the rising D-minor call.
  ['D4', 0.5], ['F4', 0.5], ['A4', 0.5], ['D5', 1], ['C5', 0.5], ['A4', 1],
  ['F4', 0.5], ['A4', 0.5], ['C5', 0.5], ['A4', 1.5], [null, 1],
  // Bars 3-4: the answer turns down through Bb — grief with its teeth out.
  ['D4', 0.5], ['F4', 0.5], ['Bb4', 0.5], ['D5', 1], ['C5', 0.5], ['A4', 1],
  ['F4', 0.5], ['G4', 0.5], ['F4', 0.5], ['D4', 1.5], [null, 1],
  // Bars 5-6: the call again, higher tension.
  ['D4', 0.5], ['F4', 0.5], ['A4', 0.5], ['D5', 1], ['E5', 0.5], ['D5', 1],
  ['C5', 0.5], ['A4', 0.5], ['F4', 0.5], ['D4', 1.5], [null, 1],
]);

const BROOD_STAB_CHORDS = [
  ch('D4', 'F4', 'A4'),
  ch('G3', 'Bb3', 'D4'),
  ch('A3', 'C#4', 'E4'),
];

const BROOD_CORE_DEF: CombatCoreDef = {
  bpm: 132,
  rootMidi: midi('D2'),
  drone: (root) => [
    { hz: midiHz(root - 12), type: 'sawtooth', level: 0.05 },
    { hz: midiHz(root - 12) * 1.006, type: 'sawtooth', level: 0.05 },
    { hz: midiHz(root - 5), type: 'sine', level: 0.04 },
  ],
  droneLowpass: 330,
  drums: { verse: 'k.h.s.h.k.h.s.h.', fill: 'k.h.s.h.k.h.ssss' },
  drumLevel: 1,
  block: (ctx, out, t0, blockIdx, beatS, semi, swing, drums, drumLevel) => {
    const barS = 4 * beatS;
    for (let bar = 0; bar < 8; bar++) {
      const t = t0 + bar * barS;
      lineAt(ctx, out, BROOD_BASS_BARS[bar], t, beatS, {
        level: 0.1,
        type: 'square',
        sustain: 0.55,
        semitones: semi,
        swing,
      });
      drumBarAt(
        ctx, out,
        bar === 3 || bar === 7 ? drums.fill : drums.verse,
        t, beatS, drumLevel, swing,
      );
      // Offbeat saw stabs through the back half of the form.
      if (bar >= 4) {
        const chord =
          bar < 6 ? BROOD_STAB_CHORDS[0] : bar === 6 ? BROOD_STAB_CHORDS[1] : BROOD_STAB_CHORDS[2];
        for (const beat of [1.5, 3.5]) {
          padChordAt(ctx, out, chord, t + beat * beatS, beatS * 0.42, {
            level: 0.05,
            type: 'sawtooth',
            detune: 8,
            attack: 0.01,
            release: beatS * 0.2,
            semitones: semi,
            lowpass: 2200,
          });
        }
      }
    }
    // Lead: six bars of riff, then the motif drives the Bb–A cadence home.
    lineAt(ctx, out, BROOD_LEAD, t0, beatS, {
      level: 0.08,
      type: 'square',
      sustain: 0.6,
      semitones: semi,
      swing,
      vibrato: { hz: 5.6, cents: 9, after: 0.1 },
    });
    lineAt(ctx, out, motifSteps('D4'), t0 + 24 * beatS, beatS, {
      level: 0.085,
      type: 'square',
      sustain: 0.7,
      semitones: semi,
      swing,
      vibrato: { hz: 5.6, cents: 11, after: 0.12 },
    });
    // High shimmer over the Bb bars once the fight has lived a block; the
    // back half stays clear for the cadence.
    if (blockIdx > 0) {
      for (const bar of [2, 3]) {
        lineAt(
          ctx, out,
          mel([
            ['D5', 0.25], ['F5', 0.25], ['Bb5', 0.25], ['F5', 0.25],
            ['D5', 0.25], ['F5', 0.25], ['Bb5', 0.25], ['F5', 0.25],
            ['D5', 0.25], ['F5', 0.25], ['Bb5', 0.25], ['F5', 0.25],
            ['D5', 0.25], ['F5', 0.25], ['Bb5', 0.25], ['F5', 0.25],
          ]),
          t0 + bar * barS, beatS,
          { level: 0.032, type: 'square', sustain: 0.5, semitones: semi },
        );
      }
    }
  },
};

// STALK — something is hunting you. A minor with the phrygian Bb leaning in,
// swung hats, chromatic snake lead (the old tense identity, kept and sharpened).
const STALK_BASS_BARS: ParsedStep[][] = [
  mel([['A2', 0.75], ['A2', 0.25], [null, 0.5], ['A2', 0.5], [null, 0.5], ['E2', 0.5], ['A2', 0.5], [null, 0.5]]),
  mel([['A2', 0.75], ['A2', 0.25], [null, 0.5], ['A2', 0.5], [null, 0.5], ['G2', 0.5], ['E2', 0.5], [null, 0.5]]),
  mel([['Bb2', 0.75], ['Bb2', 0.25], [null, 0.5], ['Bb2', 0.5], [null, 0.5], ['Bb2', 0.5], ['F2', 0.5], [null, 0.5]]),
  mel([['Bb2', 0.75], ['Bb2', 0.25], [null, 0.5], ['A2', 0.5], [null, 0.5], ['G2', 0.5], ['A2', 0.5], [null, 0.5]]),
  mel([['A2', 0.75], ['A2', 0.25], [null, 0.5], ['A2', 0.5], [null, 0.5], ['E2', 0.5], ['A2', 0.5], [null, 0.5]]),
  mel([['G2', 0.75], ['G2', 0.25], [null, 0.5], ['G2', 0.5], [null, 0.5], ['D2', 0.5], ['G2', 0.5], [null, 0.5]]),
  mel([['Bb2', 0.75], ['Bb2', 0.25], [null, 0.5], ['Bb2', 0.5], [null, 0.5], ['Bb2', 0.5], ['Bb2', 0.5], [null, 0.5]]),
  mel([['E2', 0.75], ['E2', 0.25], [null, 0.5], ['E2', 0.5], [null, 0.5], ['E2', 0.5], ['E3', 0.5], ['E2', 0.5]]),
];

const STALK_LEAD = mel([
  // The snake: minor seconds circling.
  ['E4', 0.5], ['F4', 0.5], ['E4', 0.5], ['D4', 0.5], ['E4', 1], ['A4', 0.5], ['E4', 0.5],
  ['E4', 0.5], ['F4', 0.5], ['E4', 0.5], ['D4', 0.5], ['C4', 1], ['Bb3', 1],
  ['A3', 1.5], ['C4', 0.5], ['E4', 1], ['F4', 0.5], ['E4', 0.5],
  ['D4', 0.5], ['E4', 0.5], ['F4', 0.5], ['G4', 0.5], ['F4', 1], ['E4', 1],
  // The answer creeps higher before sliding home.
  ['A4', 0.5], ['G4', 0.5], ['F4', 0.5], ['E4', 0.5], ['F4', 1], ['D4', 1],
  ['E4', 0.5], ['F4', 0.5], ['G4', 0.5], ['A4', 0.5], ['Bb4', 1.5], ['A4', 0.5],
  ['G4', 0.5], ['F4', 0.5], ['E4', 0.5], ['D4', 0.5], ['C4', 1], ['Bb3', 1],
  ['A3', 2], ['E4', 2],
]);

const STALK_CORE_DEF: CombatCoreDef = {
  bpm: 120,
  rootMidi: midi('A2'),
  drone: (root) => [
    { hz: midiHz(root - 12), type: 'sawtooth', level: 0.045 },
    { hz: midiHz(root - 11), type: 'sawtooth', level: 0.035 },
    { hz: midiHz(root), type: 'sine', level: 0.03 },
  ],
  droneLowpass: 380,
  drums: { verse: 'k.h.h.s...h.h.h.', fill: 'k.h.h.s...h.ssss' },
  drumLevel: 0.85,
  block: (ctx, out, t0, blockIdx, beatS, semi, swing, drums, drumLevel) => {
    const barS = 4 * beatS;
    for (let bar = 0; bar < 8; bar++) {
      const t = t0 + bar * barS;
      lineAt(ctx, out, STALK_BASS_BARS[bar], t, beatS, {
        level: 0.1,
        type: 'square',
        sustain: 0.5,
        semitones: semi,
        swing,
      });
      drumBarAt(
        ctx, out,
        bar === 7 ? drums.fill : drums.verse,
        t, beatS, drumLevel, swing,
      );
      // Minor-second cluster swell — the held breath.
      if (bar === 2 || bar === 6) {
        padChordAt(ctx, out, ch('A3', 'Bb3'), t, barS * 2, {
          level: 0.035,
          type: 'sawtooth',
          detune: 5,
          attack: barS * 0.8,
          semitones: semi,
          lowpass: 900,
        });
      }
    }
    const stalkLevel = blockIdx === 0 ? 0.075 : 0.08;
    lineAt(ctx, out, STALK_LEAD, t0, beatS, {
      level: stalkLevel,
      type: 'square',
      sustain: 0.55,
      semitones: semi,
      swing,
      glide: 0.04,
      vibrato: { hz: 5.4, cents: 8, after: 0.14 },
    });
  },
};

// SURGE — blades out, blood up. E harmonic-minor gallop at speed: still
// frantic, but the bright bVII bars now bare the V-major's raised seventh —
// the augmented-second snarl instead of the heroic shine.
const SURGE_BASS_ROOTS = ['E2', 'E2', 'C2', 'B1', 'E2', 'C2', 'B1', 'E2'];

const SURGE_LEAD = mel([
  ['E4', 0.5], ['G4', 0.5], ['B4', 0.5], ['E5', 1], ['D5', 0.5], ['B4', 1],
  ['G4', 0.5], ['A4', 0.5], ['B4', 0.5], ['G4', 1], ['E4', 0.5], [null, 1],
  ['C5', 0.75], ['B4', 0.25], ['A4', 0.5], ['B4', 1], ['G4', 0.5], ['E4', 1],
  ['D#5', 0.75], ['C5', 0.25], ['B4', 0.5], ['A4', 1], ['B4', 0.5], [null, 1],
  ['E5', 0.5], ['D5', 0.5], ['B4', 0.5], ['G4', 1], ['A4', 0.5], ['B4', 1],
  ['C5', 0.5], ['B4', 0.5], ['A4', 0.5], ['F#4', 1], ['D#4', 0.5], [null, 1],
]);

const SURGE_CORE_DEF: CombatCoreDef = {
  bpm: 150,
  rootMidi: midi('E2'),
  drone: (root) => [
    { hz: midiHz(root - 12), type: 'sawtooth', level: 0.045 },
    { hz: midiHz(root - 12) * 1.007, type: 'sawtooth', level: 0.045 },
    { hz: midiHz(root + 7 - 12), type: 'sine', level: 0.03 },
  ],
  droneLowpass: 420,
  drums: { verse: 'K.hkk.hks.hkk.hk', fill: 'K.hkk.hkS.S.S.S.' },
  drumLevel: 0.9,
  block: (ctx, out, t0, blockIdx, beatS, semi, swing, drums, drumLevel) => {
    const barS = 4 * beatS;
    for (let bar = 0; bar < 8; bar++) {
      const t = t0 + bar * barS;
      const root = SURGE_BASS_ROOTS[bar];
      // Gallop bass: one-and-a, repeated.
      const gallop: MStep[] = [];
      for (let b = 0; b < 4; b++) {
        gallop.push([root, 0.5], [root, 0.25], [root, 0.25]);
      }
      lineAt(ctx, out, mel(gallop), t, beatS, {
        level: 0.095,
        type: 'square',
        sustain: 0.5,
        semitones: semi,
        swing,
      });
      drumBarAt(
        ctx, out,
        bar === 3 || bar === 7 ? drums.fill : drums.verse,
        t, beatS, drumLevel, swing,
      );
      // Power-fifth stabs on the backbeats.
      if (bar % 2 === 1) {
        const r = midi(root) + 24;
        padChordAt(ctx, out, [r, r + 7], t + 1 * beatS, beatS * 0.4, {
          level: 0.045,
          type: 'sawtooth',
          detune: 9,
          attack: 0.008,
          release: beatS * 0.15,
          semitones: semi,
          lowpass: 2600,
        });
      }
    }
    lineAt(ctx, out, SURGE_LEAD, t0, beatS, {
      level: 0.08,
      type: 'square',
      sustain: 0.6,
      semitones: semi,
      swing,
      vibrato: { hz: 6, cents: 9, after: 0.08 },
    });
    // Bars 7-8: the motif at full tilt.
    lineAt(ctx, out, motifSteps('E4'), t0 + 24 * beatS, beatS, {
      level: 0.085,
      type: 'square',
      sustain: 0.65,
      semitones: semi,
      swing,
      vibrato: { hz: 6, cents: 10, after: 0.1 },
    });
    if (blockIdx > 0) {
      for (const bar of [3, 7]) {
        lineAt(
          ctx, out,
          mel([
            ['E5', 0.25], ['G5', 0.25], ['B5', 0.25], ['G5', 0.25],
            ['E5', 0.25], ['G5', 0.25], ['B5', 0.25], ['G5', 0.25],
            ['B4', 0.25], ['D#5', 0.25], ['F#5', 0.25], ['D#5', 0.25],
            ['B4', 0.25], ['D#5', 0.25], ['F#5', 0.25], ['D#5', 0.25],
          ]),
          t0 + bar * barS, beatS,
          { level: 0.03, type: 'square', sustain: 0.45, semitones: semi },
        );
      }
    }
  },
};

const STRAIGHT: CombatKnob = { semitones: 0, tempoMul: 1, swing: 0 };

const COMBAT_VARIANTS: Record<CombatMusicId, SongSpec> = {
  combat_theme: makeCombatSpec(BROOD_CORE_DEF, { ...STRAIGHT, trim: 1.12 }),
  combat_theme_tense: makeCombatSpec(STALK_CORE_DEF, { ...STRAIGHT, swing: 0.1, trim: 1.35 }),
  combat_march: makeCombatSpec(BROOD_CORE_DEF, {
    semitones: -3,
    tempoMul: 1.06,
    swing: 0,
    trim: 1.06,
    drums: { verse: 'K.h.s.h.k.k.s.h.', fill: 'K.h.s.h.k.k.s.ss' },
  }),
  combat_prowl: makeCombatSpec(STALK_CORE_DEF, { semitones: 2, tempoMul: 1.02, swing: 0.16, trim: 1.35 }),
  combat_grim: makeCombatSpec(BROOD_CORE_DEF, {
    semitones: -5,
    tempoMul: 1.16,
    swing: 0.06,
    trim: 1.12,
    drums: { verse: 'K...t.t.s.......', fill: 'K...t.t.s...t.ts' },
  }),
  combat_frenzy: makeCombatSpec(SURGE_CORE_DEF, { ...STRAIGHT, trim: 1.12 }),
  combat_rally: makeCombatSpec(SURGE_CORE_DEF, {
    semitones: 5,
    tempoMul: 1.04,
    swing: 0.05,
    trim: 1.06,
    drums: { verse: 'K.hkk.hks.hkk.hk', fill: 'K.hkS.hkS.hkS.S.' },
  }),
};

// ---------------------------------------------------------------------------
// ELITE — the named hunter steps out of the rank and file. C minor chug,
// double-kick, the motif inverted: heavier than any rotation theme, lighter
// than a boss.
// ---------------------------------------------------------------------------

const ELITE_PROG_ROOTS = ['C2', 'C2', 'Ab1', 'Bb1', 'C2', 'Ab1', 'G1', 'G1'];
const ELITE_STABS: Record<string, number[]> = {
  C2: ch('C4', 'Eb4', 'G4'),
  Ab1: ch('Ab3', 'C4', 'Eb4'),
  Bb1: ch('Bb3', 'D4', 'F4'),
  G1: ch('G3', 'B3', 'D4'),
};

const ELITE_SPEC: SongSpec = {
  bpm: 136,
  barsPerBlock: 8,
  setup: (ctx, out) =>
    makeDrone(
      ctx, out,
      [
        { hz: midiHz(midi('C1')), type: 'sawtooth', level: 0.05 },
        { hz: midiHz(midi('C1')) * 1.005, type: 'sawtooth', level: 0.05 },
        { hz: midiHz(midi('G1')), type: 'sine', level: 0.04 },
      ],
      300,
      { hz: 0.11, depth: 80 },
    ),
  block: (ctx, out, t0, blockIdx) => {
    const beatS = 60 / 136;
    const barS = 4 * beatS;
    for (let bar = 0; bar < 8; bar++) {
      const t = t0 + bar * barS;
      const root = ELITE_PROG_ROOTS[bar];
      const up = midi(root) + 12;
      // Chugging bass with octave snaps.
      lineAt(
        ctx, out,
        mel([
          [root, 0.5], [root, 0.5], [root, 0.5], [null, 0.25], [root, 0.25],
          [root, 0.5], [root, 0.25], [root, 0.25], [root, 0.5], [root, 0.5],
        ]).map((s, i) => (i === 7 ? { ...s, m: up } : s)),
        t, beatS,
        { level: 0.1, type: 'square', sustain: 0.5 },
      );
      drumBarAt(
        ctx, out,
        bar === 3 ? 'k.k.s..kk.k.ssss' : bar === 7 ? 'k.k.s..kk.kS.S.S' : 'k.k.s..kk.k.s..k',
        t, beatS, 1,
      );
      // Stabs on the and-of-two and four.
      for (const beat of [1.5, 3]) {
        padChordAt(ctx, out, ELITE_STABS[root], t + beat * beatS, beatS * 0.45, {
          level: 0.05,
          type: 'sawtooth',
          detune: 8,
          attack: 0.008,
          release: beatS * 0.2,
          lowpass: 2000,
        });
      }
    }
    // The elite's banner: the motif inverted, falling out of C5.
    lineAt(
      ctx, out,
      mel([
        ['C5', 1.5], ['Ab4', 0.5], ['Bb4', 1], ['F4', 2], ['G4', 1], ['C4', 2],
      ]),
      t0 + 8 * beatS, beatS,
      {
        level: 0.085,
        type: 'square',
        sustain: 0.7,
        vibrato: { hz: 5.4, cents: 10, after: 0.12 },
      },
    );
    // And answered straight, defiant, over the half-cadence.
    lineAt(ctx, out, motifSteps('C4'), t0 + 24 * beatS, beatS, {
      level: 0.08,
      type: 'square',
      sustain: 0.65,
      vibrato: { hz: 5.4, cents: 10, after: 0.12 },
    });
    if (blockIdx > 0) {
      for (const bar of [2, 6]) {
        lineAt(
          ctx, out,
          mel([
            ['C5', 0.25], ['Eb5', 0.25], ['G5', 0.25], ['Eb5', 0.25],
            ['C5', 0.25], ['Eb5', 0.25], ['G5', 0.25], ['Eb5', 0.25],
            ['C5', 0.25], ['Eb5', 0.25], ['G5', 0.25], ['Eb5', 0.25],
            ['C5', 0.25], ['Eb5', 0.25], ['G5', 0.25], ['Eb5', 0.25],
          ]),
          t0 + bar * barS, beatS,
          { level: 0.03, type: 'square', sustain: 0.5 },
        );
      }
    }
  },
};

// ---------------------------------------------------------------------------
// BOSS — D phrygian, 96bpm, in three intensity layers. Layer 0 is the dread
// floor (drone, timpani, the low lead). Layer 1 adds the war drums and stab
// pads. Layer 2 adds the high counter-motif — the hero's answer — and the
// kit opens up. Phase transitions ramp layers in mid-bar via setIntensity;
// long fights also climb on their own each block.
// ---------------------------------------------------------------------------

const BOSS_LOW_LEAD = mel([
  ['D3', 2], ['Eb3', 2],
  ['D3', 1], ['C3', 1], ['D3', 2],
  ['F3', 2], ['E3', 2],
  ['D3', 3], [null, 1],
]);

interface LayeredSetup extends SongSetup {
  l1: GainNode;
  l2: GainNode;
}

function layeredSetup(
  ctx: AudioContext,
  out: AudioNode,
  drone: Fixture,
  echo?: { input: GainNode } & Fixture,
): LayeredSetup {
  const target = echo?.input ?? out;
  const l1 = ctx.createGain();
  const l2 = ctx.createGain();
  l1.gain.value = 0;
  l2.gain.value = 0;
  l1.connect(target);
  l2.connect(target);
  return {
    input: echo?.input,
    l1,
    l2,
    setIntensity: (level, t) => {
      const ramp = (g: GainNode, on: boolean) => {
        g.gain.cancelScheduledValues(t);
        g.gain.setValueAtTime(g.gain.value, t);
        g.gain.linearRampToValueAtTime(on ? 1 : 0, t + 1.4);
      };
      ramp(l1, level >= 1);
      ramp(l2, level >= 2);
    },
    stop: () => {
      drone.stop();
      echo?.stop();
      try {
        l1.disconnect();
        l2.disconnect();
      } catch {
        /* ignore */
      }
    },
  };
}

function makeBossSpec(knob: {
  semitones: number;
  tempoMul: number;
  timpani?: { verse: string; fill: string };
  trim?: number;
}): SongSpec {
  const bpm = 96 / knob.tempoMul;
  const semi = knob.semitones;
  const timpani = knob.timpani ?? {
    verse: 'K...t.t.....s...',
    fill: 'K...t.t.K..ts.ts',
  };
  let layers: LayeredSetup | null = null;
  return {
    bpm,
    barsPerBlock: 8,
    trim: knob.trim,
    setup: (ctx, out) => {
      const drone = makeDrone(
        ctx, out,
        [
          { hz: midiHz(midi('D1') + semi), type: 'sawtooth', level: 0.055 },
          { hz: midiHz(midi('D1') + semi) * 1.004, type: 'sawtooth', level: 0.05 },
          { hz: midiHz(midi('A1') + semi), type: 'sine', level: 0.04 },
        ],
        280,
        { hz: 0.08, depth: 60 },
      );
      layers = layeredSetup(ctx, out, drone);
      return layers;
    },
    block: (ctx, out, t0, blockIdx) => {
      const beatS = 60 / bpm;
      const barS = 4 * beatS;
      const l1 = layers?.l1 ?? out;
      const l2 = layers?.l2 ?? out;
      for (let bar = 0; bar < 8; bar++) {
        const t = t0 + bar * barS;
        const isEb = bar === 2 || bar === 3 || bar === 5;
        // Base: timpani heartbeat.
        drumBarAt(ctx, out, bar === 7 ? timpani.fill : timpani.verse, t, beatS, 1.05);
        // L1: war snares + the Dm/Eb dread pads.
        drumBarAt(ctx, l1, '..s...s...s..ss.', t, beatS, 1.0);
        padChordAt(
          ctx, l1,
          isEb ? ch('Eb3', 'G3', 'Bb3') : ch('D3', 'F3', 'A3'),
          t, barS * 1.02,
          {
            level: 0.095,
            type: 'sawtooth',
            detune: 7,
            attack: barS * 0.35,
            semitones: semi,
            lowpass: 1100,
          },
        );
        // L2: the kit opens.
        drumBarAt(ctx, l2, '..k...k.H..k..H.', t, beatS, 1.0);
      }
      // Base: the god's low theme (bars 1-4), then the motif inverted (5-8).
      lineAt(ctx, out, BOSS_LOW_LEAD, t0, beatS, {
        level: 0.095,
        type: 'square',
        sustain: 0.75,
        semitones: semi,
        vibrato: { hz: 4.6, cents: 9, after: 0.2 },
      });
      lineAt(
        ctx, out,
        motifSteps('D3', 'inverted', 2),
        t0 + 16 * beatS, beatS,
        { level: 0.095, type: 'square', sustain: 0.8, semitones: semi },
      );
      // L1: a mid arpeggio circling the root.
      for (const bar of [1, 3, 5, 7]) {
        lineAt(
          ctx, l1,
          mel([
            ['D4', 0.5], ['F4', 0.5], ['A4', 0.5], ['F4', 0.5],
            ['Eb4', 0.5], ['F4', 0.5], ['A4', 0.5], ['F4', 0.5],
          ]),
          t0 + bar * barS, beatS,
          { level: 0.06, type: 'triangle', sustain: 0.6, semitones: semi },
        );
      }
      // L2: the hero's answer — the motif straight, up high, soaring.
      lineAt(
        ctx, l2,
        motifSteps('D5', 'straight', 2),
        t0 + 16 * beatS, beatS,
        {
          level: 0.08,
          type: 'square',
          sustain: 0.85,
          semitones: semi,
          vibrato: { hz: 5.2, cents: 12, after: 0.25 },
        },
      );
      void blockIdx;
    },
  };
}

const BOSS_VARIANTS: Record<BossMusicId, SongSpec> = {
  boss_theme: makeBossSpec({ semitones: 0, tempoMul: 1, trim: 1.06 }),
  boss_theme_dire: makeBossSpec({
    semitones: -2,
    tempoMul: 1.08,
    timpani: { verse: 'K...t.t.K...s...', fill: 'K..KK..tt.ttS.S.' },
  }),
  boss_theme_wrath: makeBossSpec({ semitones: 3, tempoMul: 0.92, trim: 1.06 }),
};

// ---------------------------------------------------------------------------
// THRONE act (chapters 13-14) — the Slain God's court. C phrygian: the ♭2
// (Db) hangs over everything. Combat is the heaviest rotation theme; the
// boss build is the organ-and-bells cathedral for the Throne itself.
// ---------------------------------------------------------------------------

const THRONE_COMBAT_ROOTS = ['C2', 'Db2', 'C2', 'Bb1', 'C2', 'Db2', 'G1', 'C2'];
const THRONE_STABS: Record<string, number[]> = {
  C2: ch('C4', 'Eb4', 'G4'),
  Db2: ch('Db4', 'F4', 'Ab4'),
  Bb1: ch('Bb3', 'Db4', 'F4'),
  G1: ch('G3', 'B3', 'D4'),
};

const THRONE_COMBAT_SPEC: SongSpec = {
  bpm: 126,
  barsPerBlock: 8,
  trim: 1.06,
  setup: (ctx, out) => {
    const echo = makeEcho(ctx, out, 0.36, 0.28, 0.18);
    const drone = makeDrone(
      ctx, out,
      [
        { hz: midiHz(midi('C1')), type: 'sawtooth', level: 0.055 },
        { hz: midiHz(midi('C1')) * 1.005, type: 'sawtooth', level: 0.05 },
        { hz: midiHz(midi('G1')), type: 'sine', level: 0.04 },
      ],
      290,
      { hz: 0.09, depth: 70 },
    );
    return {
      input: echo.input,
      stop: () => {
        echo.stop();
        drone.stop();
      },
    };
  },
  block: (ctx, out, t0, blockIdx) => {
    const beatS = 60 / 126;
    const barS = 4 * beatS;
    for (let bar = 0; bar < 8; bar++) {
      const t = t0 + bar * barS;
      const root = THRONE_COMBAT_ROOTS[bar];
      lineAt(
        ctx, out,
        mel([
          [root, 0.5], [root, 0.5], [null, 0.5], [root, 0.5],
          [root, 0.5], [root, 0.25], [root, 0.25], [root, 0.5], [null, 0.5],
        ]),
        t, beatS,
        { level: 0.1, type: 'square', sustain: 0.5 },
      );
      drumBarAt(
        ctx, out,
        bar === 3 || bar === 7 ? 'K.h.s.h.kk.sS.S.' : 'K.h.s.h.k.h.s.h.',
        t, beatS, 1,
      );
      for (const beat of [1.5, 3.5]) {
        padChordAt(ctx, out, THRONE_STABS[root], t + beat * beatS, beatS * 0.4, {
          level: 0.05,
          type: 'sawtooth',
          detune: 8,
          attack: 0.008,
          release: beatS * 0.18,
          lowpass: 2100,
        });
      }
      // The court's bell tolls over the fray.
      if (bar % 2 === 0) {
        bellAt(ctx, out, midi('C4'), t, barS * 1.4, 0.045);
      }
    }
    // The god's claim (inverted motif) — then the soul's reply, higher.
    lineAt(ctx, out, motifSteps('C4', 'inverted'), t0 + 8 * beatS, beatS, {
      level: 0.085,
      type: 'square',
      sustain: 0.7,
      vibrato: { hz: 5, cents: 10, after: 0.15 },
    });
    lineAt(ctx, out, motifSteps('C5'), t0 + 24 * beatS, beatS, {
      level: 0.08,
      type: 'square',
      sustain: 0.7,
      vibrato: { hz: 5.4, cents: 11, after: 0.12 },
    });
    void blockIdx;
  },
};

const THRONE_BOSS_PROG: Array<{ pad: number[]; choir: number[] }> = [
  { pad: ch('C2', 'G2', 'C3'), choir: ch('C4', 'Eb4', 'G4') },
  { pad: ch('C2', 'G2', 'C3'), choir: ch('C4', 'Eb4', 'G4') },
  { pad: ch('Db2', 'Ab2', 'Db3'), choir: ch('Db4', 'F4', 'Ab4') },
  { pad: ch('Db2', 'Ab2', 'Db3'), choir: ch('Db4', 'F4', 'Ab4') },
  { pad: ch('Ab1', 'Eb2', 'Ab2'), choir: ch('Ab3', 'C4', 'Eb4') },
  { pad: ch('Db2', 'Ab2', 'Db3'), choir: ch('Db4', 'F4', 'Ab4') },
  { pad: ch('C2', 'G2', 'C3'), choir: ch('C4', 'Eb4', 'G4') },
  { pad: ch('C2', 'G2', 'C3'), choir: ch('C4', 'Eb4', 'G4') },
];

const THRONE_BOSS_SPEC: SongSpec = (() => {
  let layers: LayeredSetup | null = null;
  return {
    bpm: 84,
    barsPerBlock: 8,
    setup: (ctx: AudioContext, out: AudioNode) => {
      const echo = makeEcho(ctx, out, 0.5, 0.4, 0.26);
      const drone = makeDrone(
        ctx, out,
        [
          { hz: midiHz(midi('C1')), type: 'sawtooth', level: 0.06 },
          { hz: midiHz(midi('C1')) * 1.003, type: 'sawtooth', level: 0.055 },
          { hz: midiHz(midi('G1')), type: 'triangle', level: 0.045 },
        ],
        260,
        { hz: 0.06, depth: 50 },
      );
      layers = layeredSetup(ctx, out, drone, echo);
      return layers;
    },
    block: (ctx: AudioContext, out: AudioNode, t0: number, blockIdx: number) => {
      const beatS = 60 / 84;
      const barS = 4 * beatS;
      const l1 = layers?.l1 ?? out;
      const l2 = layers?.l2 ?? out;
      for (let bar = 0; bar < 8; bar++) {
        const t = t0 + bar * barS;
        const { pad, choir } = THRONE_BOSS_PROG[bar];
        // The organ of the court.
        padChordAt(ctx, out, pad, t, barS * 1.04, {
          level: 0.085,
          type: 'sawtooth',
          detune: 6,
          attack: barS * 0.25,
          lowpass: 750,
        });
        drumBarAt(
          ctx, out,
          bar === 7 ? 'K.......K..tt.tt' : 'K...........t.t.',
          t, beatS, 1.1,
        );
        // The dead god's bell.
        if (bar % 2 === 0) {
          bellAt(ctx, out, midi('C3'), t, barS * 1.8, 0.06);
        }
        // L1: the choir gathers.
        padChordAt(ctx, l1, choir, t, barS * 1.04, {
          level: 0.09,
          type: 'triangle',
          detune: 10,
          attack: barS * 0.4,
          lowpass: 1600,
        });
        drumBarAt(ctx, l1, '....s.......s.s.', t, beatS, 1.0);
        // L2: the kit at full court press.
        drumBarAt(ctx, l2, '..k..k...k.kH...', t, beatS, 1.0);
      }
      // The god's claim, vast and slow.
      lineAt(
        ctx, out,
        motifSteps('C3', 'inverted', 2),
        t0, beatS,
        { level: 0.09, type: 'square', sustain: 0.85 },
      );
      // L2: the soul answers from above.
      lineAt(
        ctx, l2,
        motifSteps('C5', 'straight', 2),
        t0 + 16 * beatS, beatS,
        {
          level: 0.08,
          type: 'square',
          sustain: 0.9,
          vibrato: { hz: 5, cents: 12, after: 0.3 },
        },
      );
      void blockIdx;
    },
  };
})();

// ---------------------------------------------------------------------------
// VICTORY — relief, not parade. A minor, the fanfare bones kept but weary;
// the E-major bars carry the raised seventh, and the motif's major tag at
// the cadence is the one shaft of light let through.
// ---------------------------------------------------------------------------

const VICTORY_LEAD = mel([
  // Six bars of weary fanfare; the motif's picardy tag owns bars 7-8.
  ['E5', 1], ['C5', 0.5], ['A4', 0.5], ['B4', 1], ['C5', 1],
  ['D5', 1.5], ['B4', 0.5], ['G4', 2],
  ['A4', 1], ['C5', 1.5], ['B4', 0.5], ['A4', 1],
  ['G#4', 2.5], ['B4', 1], [null, 0.5],
  ['A4', 1], ['C5', 1], ['E5', 1.5], ['D5', 0.5],
  ['C5', 1.5], ['A4', 1], ['F4', 1.5],
]);
const VICTORY_COUNTER = mel([
  ['C5', 1], ['A4', 0.5], ['E4', 0.5], ['G4', 1], ['A4', 1],
  ['B4', 1.5], ['G4', 0.5], ['D4', 2],
  ['F4', 1], ['A4', 1.5], ['G4', 0.5], ['F4', 1],
  ['E4', 2.5], ['G#4', 1], [null, 0.5],
  ['E4', 1], ['A4', 1], ['C5', 1.5], ['B4', 0.5],
  ['A4', 1.5], ['F4', 1], ['D4', 1.5],
]);
const VICTORY_BASS_ROOTS = ['A2', 'G2', 'F2', 'E2', 'A2', 'F2', 'E2', 'A2'];

const VICTORY_SPEC: SongSpec = {
  bpm: 124,
  barsPerBlock: 8,
  trim: 1.45,
  block: (ctx, out, t0) => {
    const beatS = 60 / 124;
    const barS = 4 * beatS;
    const pads = [
      ch('A3', 'C4', 'E4'), ch('G3', 'B3', 'D4'), ch('F3', 'A3', 'C4'),
      ch('E3', 'G#3', 'B3'), ch('A3', 'C4', 'E4'), ch('F3', 'A3', 'C4'),
      ch('E3', 'G#3', 'B3'), ch('A3', 'C#4', 'E4'),
    ];
    for (let bar = 0; bar < 8; bar++) {
      const t = t0 + bar * barS;
      const root = VICTORY_BASS_ROOTS[bar];
      padChordAt(ctx, out, pads[bar], t, barS * 1.02, {
        level: 0.095,
        type: 'triangle',
        detune: 6,
        attack: barS * 0.25,
        lowpass: 1500,
      });
      lineAt(
        ctx, out,
        mel([
          [root, 1], [null, 0.5], [root, 0.5], [root, 1], [root, 0.5], [root, 0.5],
        ]),
        t, beatS,
        { level: 0.13, type: 'triangle', sustain: 0.8 },
      );
      drumBarAt(
        ctx, out,
        bar === 7 ? 'k.h.s.h.k.h.SsSs' : 'k.h.s.h.k.h.s.h.',
        t, beatS, 1.05,
      );
    }
    lineAt(ctx, out, VICTORY_LEAD, t0, beatS, {
      level: 0.082,
      type: 'square',
      sustain: 0.7,
      vibrato: { hz: 6, cents: 9, after: 0.1 },
    });
    lineAt(ctx, out, VICTORY_COUNTER, t0, beatS, {
      level: 0.065,
      type: 'triangle',
      sustain: 0.75,
    });
    // Bars 7-8 over the cadence: the Godwake motif turned major — the light.
    lineAt(ctx, out, motifSteps('A4', 'major'), t0 + 24 * beatS, beatS, {
      level: 0.09,
      type: 'square',
      sustain: 0.8,
      vibrato: { hz: 6, cents: 10, after: 0.12 },
    });
  },
};

// ---------------------------------------------------------------------------
// SHOP — coin and lamplight in a town that remembers. A minor pluck vamp,
// barely swung; the last bar turns on E major (the raised seventh) before
// the lamp gutters back to Am.
// ---------------------------------------------------------------------------

const SHOP_BARS: Array<{ arp: string[]; bass: string }> = [
  { arp: ['A3', 'C4', 'E4', 'G4', 'A4', 'G4', 'E4', 'C4'], bass: 'A2' },
  { arp: ['A3', 'C4', 'E4', 'G4', 'B4', 'G4', 'E4', 'C4'], bass: 'A2' },
  { arp: ['D4', 'F4', 'A4', 'C5', 'D5', 'C5', 'A4', 'F4'], bass: 'D3' },
  { arp: ['D4', 'F4', 'A4', 'C5', 'A4', 'F4', 'D4', 'A3'], bass: 'D3' },
  { arp: ['A3', 'C4', 'E4', 'G4', 'A4', 'G4', 'E4', 'C4'], bass: 'A2' },
  { arp: ['G3', 'B3', 'D4', 'F4', 'G4', 'F4', 'D4', 'B3'], bass: 'G2' },
  { arp: ['A3', 'C4', 'E4', 'A4', 'E4', 'C4', 'A3', 'E3'], bass: 'A2' },
  { arp: ['E3', 'G#3', 'B3', 'E4', 'B3', 'G#3', 'E3', 'B2'], bass: 'E2' },
];

const SHOP_SPEC: SongSpec = {
  bpm: 90,
  barsPerBlock: 8,
  trim: 1.45,
  setup: (ctx, out) =>
    makeDrone(
      ctx, out,
      [{ hz: midiHz(midi('A1')), type: 'sine', level: 0.05 }],
      600,
      { hz: 0.07, depth: 120 },
    ),
  block: (ctx, out, t0, blockIdx) => {
    const beatS = 60 / 90;
    const barS = 4 * beatS;
    for (let bar = 0; bar < 8; bar++) {
      const t = t0 + bar * barS;
      const { arp, bass } = SHOP_BARS[bar];
      lineAt(
        ctx, out,
        mel(arp.map((n) => [n, 0.5] as MStep)),
        t, beatS,
        { level: 0.06, type: 'triangle', sustain: 0.42, swing: 0.1, attack: 0.003 },
      );
      lineAt(
        ctx, out,
        mel([[bass, 1.5], [null, 0.5], [bass, 1], [null, 1]]),
        t, beatS,
        { level: 0.085, type: 'triangle', sustain: 0.8 },
      );
      drumBarAt(ctx, out, 'k.......h.......', t, beatS, 0.3, 0.1);
    }
    // The lamplighter's sigh, every other pass.
    if (blockIdx % 2 === 1) {
      lineAt(
        ctx, out,
        mel([
          ['A4', 1], ['C5', 1.5], ['B4', 0.5], ['A4', 1], ['G#4', 1.5],
          ['A4', 2.5], [null, 2],
        ]),
        t0 + 16 * beatS, beatS,
        {
          level: 0.055,
          type: 'square',
          sustain: 0.75,
          swing: 0.1,
          vibrato: { hz: 5.2, cents: 10, after: 0.15 },
        },
      );
    }
  },
};

// ---------------------------------------------------------------------------
// EVENT — something is being offered, and the price is not written. Sus
// chords that never resolve, a slow pendulum arp, one far-off bell.
// ---------------------------------------------------------------------------

const EVENT_SPEC: SongSpec = {
  bpm: 72,
  barsPerBlock: 8,
  trim: 1.19,
  setup: (ctx, out) => {
    const echo = makeEcho(ctx, out, 0.55, 0.42, 0.24);
    const drone = makeDrone(
      ctx, out,
      [
        { hz: midiHz(midi('A1')), type: 'sine', level: 0.06 },
        { hz: midiHz(midi('E2')), type: 'triangle', level: 0.03 },
      ],
      650,
      { hz: 0.05, depth: 130 },
    );
    return {
      input: echo.input,
      stop: () => {
        echo.stop();
        drone.stop();
      },
    };
  },
  block: (ctx, out, t0, blockIdx) => {
    const beatS = 60 / 72;
    const barS = 4 * beatS;
    const chords = [
      ch('A3', 'B3', 'E4'),
      ch('A3', 'B3', 'E4'),
      ch('G3', 'A3', 'D4'),
      ch('G3', 'A3', 'D4'),
    ];
    for (let bar = 0; bar < 8; bar++) {
      const t = t0 + bar * barS;
      padChordAt(ctx, out, chords[bar % 4], t, barS * 1.06, {
        level: 0.055,
        type: 'triangle',
        detune: 8,
        attack: barS * 0.6,
        lowpass: 950,
      });
      // Pendulum.
      lineAt(
        ctx, out,
        mel(
          bar % 2 === 0
            ? [['A3', 1], ['E4', 1], ['B3', 1], ['E4', 1]]
            : [['G3', 1], ['D4', 1], ['A3', 1], ['D4', 1]],
        ),
        t, beatS,
        { level: 0.05, type: 'triangle', sustain: 0.7 },
      );
    }
    bellAt(ctx, out, midi(blockIdx % 2 === 0 ? 'E5' : 'C5'), t0 + 14 * beatS, 4 * beatS, 0.035);
  },
};

// ---------------------------------------------------------------------------
// Registry.
// ---------------------------------------------------------------------------

/**
 * `offline` is the render-script hook: when set, the builder schedules that
 * many seconds deterministically against the context timeline (no wall-clock
 * timers) so an OfflineAudioContext can capture it.
 */
type MusicBuilder = (
  ctx: AudioContext,
  out: AudioNode,
  offline?: { seconds: number },
) => StopHandle;

function fromSpec(spec: SongSpec): MusicBuilder {
  return (ctx, out, offline) => runSong(ctx, out, spec, offline);
}

const MUSIC_BUILDERS: Record<MusicId, MusicBuilder> = {
  title_theme: fromSpec(TITLE_SPEC),
  hub_theme: fromSpec(HUB_SPEC),
  grove_theme: fromSpec(GROVE_SPEC),
  shop_theme: fromSpec(SHOP_SPEC),
  event_theme: fromSpec(EVENT_SPEC),
  victory_theme: fromSpec(VICTORY_SPEC),
  combat_elite: fromSpec(ELITE_SPEC),
  combat_throne: fromSpec(THRONE_COMBAT_SPEC),
  boss_throne: fromSpec(THRONE_BOSS_SPEC),
  combat_theme: fromSpec(COMBAT_VARIANTS.combat_theme),
  combat_theme_tense: fromSpec(COMBAT_VARIANTS.combat_theme_tense),
  combat_march: fromSpec(COMBAT_VARIANTS.combat_march),
  combat_prowl: fromSpec(COMBAT_VARIANTS.combat_prowl),
  combat_grim: fromSpec(COMBAT_VARIANTS.combat_grim),
  combat_frenzy: fromSpec(COMBAT_VARIANTS.combat_frenzy),
  combat_rally: fromSpec(COMBAT_VARIANTS.combat_rally),
  boss_theme: fromSpec(BOSS_VARIANTS.boss_theme),
  boss_theme_dire: fromSpec(BOSS_VARIANTS.boss_theme_dire),
  boss_theme_wrath: fromSpec(BOSS_VARIANTS.boss_theme_wrath),
};

/** Every registered music track id. */
export const MUSIC_IDS = Object.keys(MUSIC_BUILDERS) as MusicId[];

// Raw registries for scripts/render-audio-preview.ts (offline wav renders).
export { MUSIC_BUILDERS, SFX as SFX_RENDERERS };

export function playMusic(id: MusicId) {
  audioEngine.playMusic(id, MUSIC_BUILDERS[id]);
}

export function stopMusic() {
  audioEngine.stopMusic();
}
