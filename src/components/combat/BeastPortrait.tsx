import youngUrl from '../../assets/sprites/wild-shape-bear-young.svg';
import direUrl from '../../assets/sprites/wild-shape-beast.svg';
import greatBearUrl from '../../assets/sprites/wild-shape-great-bear.svg';

interface BeastPortraitProps {
  className?: string;
  /**
   * The three escalating Wild Shape rungs, each its own bespoke sprite:
   * 'young' = the early form (a leaner, humbler bear, druid < 10);
   * 'dire'  = Greater Wild Shape (the dire bear-beast, druid >= 10);
   * 'great-bear' = the Avatar of the Wilds capstone (the biggest primal bear).
   */
  variant?: 'young' | 'dire' | 'great-bear';
}

// The druid's Wild Shape battlefield form — rendered in place of the class
// portrait while a beast/bear form holds (see BattlefieldSprite). Shares the
// monster-sprite render convention: an external SVG drawn as an <img> with
// object-fit: contain + object-position: bottom so the beast keeps its pixel
// aspect ratio and stays planted on the ground line of the player slot.
const SPRITE_STYLE = { objectFit: 'contain', objectPosition: 'bottom' } as const;

const SPRITES: Record<NonNullable<BeastPortraitProps['variant']>, { src: string; alt: string }> = {
  young: { src: youngUrl, alt: 'Wild Shape — Young Bear' },
  dire: { src: direUrl, alt: 'Wild Shape — Dire Beast' },
  'great-bear': { src: greatBearUrl, alt: 'Avatar of the Wilds — the Great Bear' },
};

export function BeastPortrait({ className = '', variant = 'dire' }: BeastPortraitProps) {
  const { src, alt } = SPRITES[variant];
  return <img src={src} alt={alt} className={className} style={SPRITE_STYLE} />;
}
