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
 * Pick a swing SFX based on the weapon's shape. Falls back to the generic
 * `swing_whoosh` if no category applies.
 */
export function swingSfxForWeapon(weapon: Weapon): SfxId {
  if (weapon.properties.includes('ammunition')) return 'swing_whoosh_bow';
  if (weapon.damageType === 'bludgeoning') return 'swing_whoosh_blunt';
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
