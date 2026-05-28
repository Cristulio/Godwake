/**
 * Pixel-art NPC portraits for the soul-bond voice bubbles. Each portrait
 * ships as a separate .svg asset (see src/assets/sprites/npcs/) so the JS
 * bundle stays small.
 *
 * Same 24×40 viewBox and crispEdges style as the combat PlayerPortrait so
 * they feel like the same world. Each portrait is a named export so callers
 * can `import { Imoen } from ...` and drop it in like a sprite.
 */

import imoenUrl from '../../assets/sprites/npcs/imoen.svg';
import irenicusUrl from '../../assets/sprites/npcs/irenicus.svg';

type PortraitProps = {
  className?: string;
  ariaLabel?: string;
};

// preserveAspectRatio="xMidYMax meet" → object-fit: contain + object-position: bottom.
const PORTRAIT_STYLE = { objectFit: 'contain', objectPosition: 'bottom' } as const;

function PortraitImg({
  url,
  fallbackLabel,
  className = '',
  ariaLabel,
}: PortraitProps & { url: string; fallbackLabel: string }) {
  return (
    <img
      src={url}
      alt={ariaLabel ?? fallbackLabel}
      className={className}
      style={PORTRAIT_STYLE}
    />
  );
}

export function Imoen(props: PortraitProps) {
  return <PortraitImg url={imoenUrl} fallbackLabel="Imoen" {...props} />;
}

export function Irenicus(props: PortraitProps) {
  return <PortraitImg url={irenicusUrl} fallbackLabel="Velnaris" {...props} />;
}
