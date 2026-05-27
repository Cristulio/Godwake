/**
 * Pixel-art NPC portraits for soul-bond voice bubbles, shrine pickers, and
 * future event-room scenes. Each portrait ships as a separate .svg asset
 * (see src/assets/sprites/npcs/) so the JS bundle stays small.
 *
 * Same 24×40 viewBox and crispEdges style as the combat PlayerPortrait so
 * they feel like the same world. Each portrait is a named export so callers
 * can `import { Imoen } from ...` and drop it in like a sprite.
 */

import imoenUrl from '../../assets/sprites/npcs/imoen.svg';
import irenicusUrl from '../../assets/sprites/npcs/irenicus.svg';
import lineneGraywindUrl from '../../assets/sprites/npcs/linene-graywind.svg';
import ilmaterPriestUrl from '../../assets/sprites/npcs/ilmater-priest.svg';
import lathanderPriestUrl from '../../assets/sprites/npcs/lathander-priest.svg';
import helmPriestUrl from '../../assets/sprites/npcs/helm-priest.svg';
import tymoraPriestessUrl from '../../assets/sprites/npcs/tymora-priestess.svg';
import cowledWizardUrl from '../../assets/sprites/npcs/cowled-wizard.svg';
import drowPriestessUrl from '../../assets/sprites/npcs/drow-priestess.svg';

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
  return <PortraitImg url={irenicusUrl} fallbackLabel="Irenicus" {...props} />;
}

export function LineneGraywind(props: PortraitProps) {
  return <PortraitImg url={lineneGraywindUrl} fallbackLabel="Linene Graywind" {...props} />;
}

export function IlmaterPriest(props: PortraitProps) {
  return <PortraitImg url={ilmaterPriestUrl} fallbackLabel="Priest of Ilmater" {...props} />;
}

export function LathanderPriest(props: PortraitProps) {
  return <PortraitImg url={lathanderPriestUrl} fallbackLabel="Priest of Lathander" {...props} />;
}

export function HelmPriest(props: PortraitProps) {
  return <PortraitImg url={helmPriestUrl} fallbackLabel="Priest of Helm" {...props} />;
}

export function TymoraPriestess(props: PortraitProps) {
  return <PortraitImg url={tymoraPriestessUrl} fallbackLabel="Priestess of Tymora" {...props} />;
}

export function CowledWizard(props: PortraitProps) {
  return <PortraitImg url={cowledWizardUrl} fallbackLabel="Cowled Wizard" {...props} />;
}

export function DrowPriestess(props: PortraitProps) {
  return <PortraitImg url={drowPriestessUrl} fallbackLabel="Drow Priestess of Lolth" {...props} />;
}

// Convenience lookup so dialog systems can resolve a portrait by name.
// Kept stable across the sprite-sheet refactor.
export const NPC_PORTRAITS = {
  imoen: Imoen,
  irenicus: Irenicus,
  linene: LineneGraywind,
  'ilmater-priest': IlmaterPriest,
  'lathander-priest': LathanderPriest,
  'helm-priest': HelmPriest,
  'tymora-priestess': TymoraPriestess,
  'cowled-wizard': CowledWizard,
  'drow-priestess': DrowPriestess,
} as const;

export type NpcPortraitId = keyof typeof NPC_PORTRAITS;
