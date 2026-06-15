import beastUrl from '../../assets/sprites/wild-shape-beast.svg';

interface BeastPortraitProps {
  className?: string;
  /**
   * 'dire' = the ordinary Wild Shape beast. 'great-bear' = the Avatar of the
   * Wilds capstone form: the same beast silhouette grown heavier and darker so
   * the apex form reads distinct from a routine shift (a bespoke bear sprite is
   * future art — this styles the existing asset rather than ship a worse one).
   */
  variant?: 'dire' | 'great-bear';
}

// The druid's Wild Shape battlefield form — rendered in place of the class
// portrait while a beast/bear form holds (see BattlefieldSprite). Shares the
// monster-sprite render convention: an external SVG drawn as an <img> with
// object-fit: contain + object-position: bottom so the beast keeps its pixel
// aspect ratio and stays planted on the ground line of the player slot.
const SPRITE_STYLE = { objectFit: 'contain', objectPosition: 'bottom' } as const;

// Great Bear: scale up from the feet (a bigger primal body) and warm/darken the
// coat so it doesn't read as the same animal as a routine Wild Shape.
const GREAT_BEAR_STYLE = {
  ...SPRITE_STYLE,
  transform: 'scale(1.14)',
  transformOrigin: 'bottom center',
  filter: 'brightness(0.9) saturate(1.15) contrast(1.05)',
} as const;

export function BeastPortrait({ className = '', variant = 'dire' }: BeastPortraitProps) {
  const bear = variant === 'great-bear';
  return (
    <img
      src={beastUrl}
      alt={bear ? 'Avatar of the Wilds — the Great Bear' : 'Wild Shape — Dire Beast'}
      className={className}
      style={bear ? GREAT_BEAR_STYLE : SPRITE_STYLE}
    />
  );
}
