import type { Size } from '../../schemas/ids';

/**
 * Display scale for an on-field combat sprite, keyed off the creature's lore
 * size so a huge giant towers over a medium soldier and a tiny imp reads small.
 * Medium is the 1.0 baseline. Unknown/absent size (a legacy in-progress combat
 * rehydrated from a save before sprites carried size) falls back to medium so
 * nothing renders at zero.
 */
export function spriteSizeScale(size: Size | undefined): number {
  switch (size) {
    case 'tiny':
      return 0.7;
    case 'small':
      return 0.85;
    case 'large':
      return 1.25;
    case 'huge':
      return 1.5;
    case 'gargantuan':
      return 1.6;
    case 'medium':
    default:
      return 1;
  }
}
