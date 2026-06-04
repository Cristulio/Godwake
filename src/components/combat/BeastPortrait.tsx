import beastUrl from '../../assets/sprites/wild-shape-beast.svg';

interface BeastPortraitProps {
  className?: string;
}

// The druid's Wild Shape battlefield form — rendered in place of the class
// portrait while wildShapeRoundsRemaining > 0 (see BattlefieldSprite). Shares
// the monster-sprite render convention: an external SVG drawn as an <img> with
// object-fit: contain + object-position: bottom so the beast keeps its pixel
// aspect ratio and stays planted on the ground line of the player slot.
const SPRITE_STYLE = { objectFit: 'contain', objectPosition: 'bottom' } as const;

export function BeastPortrait({ className = '' }: BeastPortraitProps) {
  return (
    <img
      src={beastUrl}
      alt="Wild Shape — Dire Beast"
      className={className}
      style={SPRITE_STYLE}
    />
  );
}
