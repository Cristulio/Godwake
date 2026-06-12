import type { Weapon } from '../../schemas/item';
import { audioEngine } from './AudioEngine';
import type { SfxId, MusicId } from './sounds';

export { audioEngine } from './AudioEngine';
export type { SfxId, MusicId } from './sounds';

// The synth SFX renderers + chiptune music data in `sounds.ts` are ~1300 lines
// and never needed before the player interacts (Web Audio is gesture-gated).
// Load that module lazily so it lands in its own async chunk instead of the
// eager critical-path bundle. These wrappers keep the synchronous fire-and-
// forget call signature callers already use; the first sound pays the import.
let soundsModule: typeof import('./sounds') | null = null;
let soundsLoader: Promise<typeof import('./sounds')> | null = null;

function loadSounds(): Promise<typeof import('./sounds')> {
  if (!soundsLoader) {
    soundsLoader = import('./sounds').then((m) => {
      soundsModule = m;
      return m;
    });
  }
  return soundsLoader;
}

export function playSfx(id: SfxId): void {
  if (soundsModule) {
    soundsModule.playSfx(id);
    return;
  }
  void loadSounds().then((m) => m.playSfx(id));
}

export function playMusic(id: MusicId): void {
  if (soundsModule) {
    soundsModule.playMusic(id);
    return;
  }
  void loadSounds().then((m) => m.playMusic(id));
}

export function stopMusic(): void {
  // No need to pull in `sounds.ts` just to stop: if it never loaded, nothing
  // is playing, and the stop logic lives entirely on the (eager) engine.
  audioEngine.stopMusic();
}

/**
 * Raise the current track's arrangement one layer (boss phase transitions).
 * Lives on the eager engine; flat themes ignore it.
 */
export function bumpMusicIntensity(): void {
  audioEngine.bumpMusicIntensity();
}

// Mob-aware combat-music selector. Kept in this eager module (not sounds.ts) so
// importing it from CombatScreen doesn't drag the ~1300-line synth into the
// boot bundle — the actual track build still pays the lazy import on first play.
// These pools mirror the builder ids in sounds.ts; `sounds.test.ts` asserts they
// stay a subset of the registry so the two lists can't silently drift apart.
const COMBAT_MUSIC_POOL: MusicId[] = [
  'combat_theme',
  'combat_theme_tense',
  'combat_march',
  'combat_prowl',
  'combat_grim',
  'combat_frenzy',
  'combat_rally',
];
const BOSS_MUSIC_POOL: MusicId[] = [
  'boss_theme',
  'boss_theme_dire',
  'boss_theme_wrath',
];

export { COMBAT_MUSIC_POOL, BOSS_MUSIC_POOL };

let lastCombatMusicId: MusicId | null = null;

function hashSignal(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * Pick a combat theme for an encounter. `signal` (the lead monster's defId)
 * deterministically maps a given foe to a given variant — so the same creature
 * feels consistent — while the last-played guard guarantees two fights in a row
 * never share a theme. Repeats across non-adjacent fights are fine.
 *
 * Elite rooms get the dedicated heavier theme; the Throne act (chapters 13-14)
 * overrides everything with the Slain God's court themes.
 */
export function pickCombatMusic(
  signal: string,
  opts?: { boss?: boolean; elite?: boolean; throne?: boolean },
): MusicId {
  if (opts?.throne) {
    const id: MusicId = opts.boss ? 'boss_throne' : 'combat_throne';
    lastCombatMusicId = id;
    return id;
  }
  if (opts?.elite) {
    lastCombatMusicId = 'combat_elite';
    return 'combat_elite';
  }
  const pool = opts?.boss ? BOSS_MUSIC_POOL : COMBAT_MUSIC_POOL;
  const base = hashSignal(signal) % pool.length;
  let id = pool[base];
  if (id === lastCombatMusicId && pool.length > 1) {
    id = pool[(base + 1) % pool.length];
  }
  lastCombatMusicId = id;
  return id;
}

/**
 * Pick a swing SFX based on the weapon's shape. Falls back to the generic
 * `swing_whoosh` if no category applies.
 */
export function swingSfxForWeapon(weapon: Weapon): SfxId {
  if (weapon.properties.includes('ammunition')) return 'swing_whoosh_bow';
  if (weapon.damageType === 'bludgeoning') return 'swing_whoosh_blunt';
  // Shapeshift claws — no claw-tear SFX exists yet; the blade whoosh is the
  // closest read for a rending swipe. Without this branch the light beast
  // tiers would fall into the light+finesse case and flick like metal daggers.
  if (
    weapon.id === 'dragon-claws' ||
    weapon.id.startsWith('beast-claws') ||
    weapon.id.startsWith('dire-claws')
  ) {
    return 'swing_whoosh_blade';
  }
  if (
    weapon.id === 'dagger' ||
    (weapon.properties.includes('light') &&
      weapon.properties.includes('finesse'))
  ) {
    return 'swing_whoosh_dagger';
  }
  if (
    weapon.damageType === 'slashing' ||
    weapon.damageType === 'piercing'
  ) {
    return 'swing_whoosh_blade';
  }
  return 'swing_whoosh';
}
