import type { Weapon } from '../../schemas/item';
import type { SfxId } from './sounds';

export { audioEngine } from './AudioEngine';
export { playSfx, playMusic, stopMusic } from './sounds';
export type { SfxId, MusicId } from './sounds';

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
