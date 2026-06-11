/**
 * Render the whole audio bank offline and report levels — the "ears" of the
 * audio pass (see .briefs/audio-bible.md). Every MusicId gets ~16 bars and
 * every SfxId a one-shot, written as wav files to /tmp/gw-audio/ plus a
 * peak/RMS table. The gate: peaks must stay at or below -3 dBFS.
 *
 * Usage:
 *   npx tsx scripts/render-audio-preview.ts             # full bank
 *   npx tsx scripts/render-audio-preview.ts --only hub_theme,crit_hit
 *   npx tsx scripts/render-audio-preview.ts --seconds 12
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { OfflineAudioContext } from 'node-web-audio-api';
import {
  MUSIC_BUILDERS,
  MUSIC_IDS,
  SFX_IDS,
  SFX_RENDERERS,
  type MusicId,
  type SfxId,
} from '../src/engine/audio/sounds';

const OUT_DIR = '/tmp/gw-audio';
const SAMPLE_RATE = 44100;
const PEAK_LIMIT_DB = -3;
const SFX_SECONDS = 4;

interface RenderRow {
  id: string;
  kind: 'music' | 'sfx';
  seconds: number;
  peakDb: number;
  rmsDb: number;
  pass: boolean;
}

function parseArgs(): { only: Set<string> | null; musicSeconds: number } {
  const args = process.argv.slice(2);
  let only: Set<string> | null = null;
  let musicSeconds = 30;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--only' && args[i + 1]) {
      only = new Set(args[++i].split(',').map((s) => s.trim()));
    } else if (args[i] === '--seconds' && args[i + 1]) {
      musicSeconds = Number(args[++i]) || musicSeconds;
    }
  }
  return { only, musicSeconds };
}

function db(x: number): number {
  return x <= 0 ? -Infinity : 20 * Math.log10(x);
}

function fmtDb(x: number): string {
  return x === -Infinity ? '  -inf' : x.toFixed(1).padStart(6);
}

/** Peak (max |sample|) and RMS across all channels, measured pre-clamp. */
function analyze(buffer: AudioBuffer): { peak: number; rms: number } {
  let peak = 0;
  let sumSq = 0;
  let count = 0;
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < data.length; i++) {
      const v = Math.abs(data[i]);
      if (v > peak) peak = v;
      sumSq += data[i] * data[i];
    }
    count += data.length;
  }
  return { peak, rms: Math.sqrt(sumSq / Math.max(1, count)) };
}

/** Minimal 16-bit PCM wav writer (interleaved, little-endian). */
function writeWav(path: string, buffer: AudioBuffer): void {
  const channels = buffer.numberOfChannels;
  const frames = buffer.length;
  const dataBytes = frames * channels * 2;
  const out = new DataView(new ArrayBuffer(44 + dataBytes));
  const ascii = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) out.setUint8(offset + i, s.charCodeAt(i));
  };
  ascii(0, 'RIFF');
  out.setUint32(4, 36 + dataBytes, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  out.setUint32(16, 16, true);
  out.setUint16(20, 1, true); // PCM
  out.setUint16(22, channels, true);
  out.setUint32(24, buffer.sampleRate, true);
  out.setUint32(28, buffer.sampleRate * channels * 2, true);
  out.setUint16(32, channels * 2, true);
  out.setUint16(34, 16, true);
  ascii(36, 'data');
  out.setUint32(40, dataBytes, true);
  const chans = Array.from({ length: channels }, (_, c) => buffer.getChannelData(c));
  let offset = 44;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < channels; c++) {
      const v = Math.max(-1, Math.min(1, chans[c][i]));
      out.setInt16(offset, Math.round(v * 32767), true);
      offset += 2;
    }
  }
  writeFileSync(path, new Uint8Array(out.buffer));
}

function makeContext(seconds: number): AudioContext {
  // node-web-audio-api implements the browser interface; the builders only
  // need the BaseAudioContext surface, so the cast is safe here.
  return new OfflineAudioContext({
    numberOfChannels: 2,
    length: Math.ceil(seconds * SAMPLE_RATE),
    sampleRate: SAMPLE_RATE,
  }) as unknown as AudioContext;
}

async function renderMusic(id: MusicId, seconds: number): Promise<RenderRow> {
  const ctx = makeContext(seconds);
  const handle = MUSIC_BUILDERS[id](ctx, ctx.destination, { seconds });
  const buffer = await (
    ctx as unknown as { startRendering(): Promise<AudioBuffer> }
  ).startRendering();
  handle.stop();
  const { peak, rms } = analyze(buffer);
  writeWav(join(OUT_DIR, `music_${id}.wav`), buffer);
  return {
    id,
    kind: 'music',
    seconds,
    peakDb: db(peak),
    rmsDb: db(rms),
    pass: db(peak) <= PEAK_LIMIT_DB,
  };
}

async function renderSfx(id: SfxId): Promise<RenderRow> {
  const ctx = makeContext(SFX_SECONDS);
  SFX_RENDERERS[id](ctx, ctx.destination, 0.05);
  const buffer = await (
    ctx as unknown as { startRendering(): Promise<AudioBuffer> }
  ).startRendering();
  const { peak, rms } = analyze(buffer);
  writeWav(join(OUT_DIR, `sfx_${id}.wav`), buffer);
  return {
    id,
    kind: 'sfx',
    seconds: SFX_SECONDS,
    peakDb: db(peak),
    rmsDb: db(rms),
    pass: db(peak) <= PEAK_LIMIT_DB,
  };
}

async function main() {
  const { only, musicSeconds } = parseArgs();
  mkdirSync(OUT_DIR, { recursive: true });

  const rows: RenderRow[] = [];
  for (const id of MUSIC_IDS) {
    if (only && !only.has(id)) continue;
    rows.push(await renderMusic(id, musicSeconds));
  }
  for (const id of SFX_IDS) {
    if (only && !only.has(id)) continue;
    rows.push(await renderSfx(id));
  }

  console.log(`\n${'id'.padEnd(24)} kind   len(s)  peak(dB)  rms(dB)  gate`);
  console.log('-'.repeat(64));
  for (const r of rows) {
    console.log(
      `${r.id.padEnd(24)} ${r.kind.padEnd(6)} ${String(r.seconds).padStart(5)}  ` +
        `${fmtDb(r.peakDb)}    ${fmtDb(r.rmsDb)}  ${r.pass ? 'ok' : 'FAIL'}`,
    );
  }
  const fails = rows.filter((r) => !r.pass);
  console.log(
    `\n${rows.length} files -> ${OUT_DIR}; peak gate ${PEAK_LIMIT_DB} dBFS; ` +
      `${fails.length === 0 ? 'all pass' : `${fails.length} FAIL`}`,
  );
  // Builders may have pending loop timers; exit explicitly.
  process.exit(fails.length === 0 ? 0 : 1);
}

void main();
