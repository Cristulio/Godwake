import ch1Combat from './ch1-combat.svg';
import ch1Elite from './ch1-elite.svg';
import ch1Boss from './ch1-boss.svg';
import ch1Event from './ch1-event.svg';
import ch2Combat from './ch2-combat.svg';
import ch2Elite from './ch2-elite.svg';
import ch2Boss from './ch2-boss.svg';
import ch2Event from './ch2-event.svg';

/**
 * Battlefield scene registry — full-bleed pixel-painted backdrops, keyed by
 * chapter x room kind. Scenes are dense rect-grid SVGs (160x84 logical px,
 * crispEdges, preserveAspectRatio="none") authored per the backgrounds bible:
 * upper-left torch key, quiet mid band at y38-63 so sprites/HP bars read,
 * floor band at y66-84 (the parallax near-strip seam), no baked-in vignette.
 *
 * `rest` rooms share the chapter's `event` scene (the calmer corner of the
 * biome). Chapters land incrementally: a missing entry means the battlefield
 * falls back to its gradient + legacy decoration, so partial coverage ships.
 */
export type BackdropKind = 'combat' | 'elite' | 'boss' | 'event';

const SCENES: Record<number, Partial<Record<BackdropKind, string>>> = {
  1: { combat: ch1Combat, elite: ch1Elite, boss: ch1Boss, event: ch1Event },
  2: { combat: ch2Combat, elite: ch2Elite, boss: ch2Boss, event: ch2Event },
};

export function backdropFor(
  chapter: number | undefined,
  kind: BackdropKind | 'rest',
): string | undefined {
  if (!chapter) return undefined;
  return SCENES[chapter]?.[kind === 'rest' ? 'event' : kind];
}
