import ch1Combat from './ch1-combat.svg';
import ch1Elite from './ch1-elite.svg';
import ch1Boss from './ch1-boss.svg';
import ch1Event from './ch1-event.svg';
import ch2Combat from './ch2-combat.svg';
import ch2Elite from './ch2-elite.svg';
import ch2Boss from './ch2-boss.svg';
import ch2Event from './ch2-event.svg';
import ch11Combat from './ch11-combat.svg';
import ch11Elite from './ch11-elite.svg';
import ch11Boss from './ch11-boss.svg';
import ch11Event from './ch11-event.svg';
import ch12Combat from './ch12-combat.svg';
import ch12Elite from './ch12-elite.svg';
import ch12Boss from './ch12-boss.svg';
import ch12Event from './ch12-event.svg';
import ch13Combat from './ch13-combat.svg';
import ch13Elite from './ch13-elite.svg';
import ch13Boss from './ch13-boss.svg';
import ch13Event from './ch13-event.svg';
import ch14Combat from './ch14-combat.svg';
import ch14Elite from './ch14-elite.svg';
import ch14Boss from './ch14-boss.svg';
import ch14Event from './ch14-event.svg';

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
  11: { combat: ch11Combat, elite: ch11Elite, boss: ch11Boss, event: ch11Event },
  12: { combat: ch12Combat, elite: ch12Elite, boss: ch12Boss, event: ch12Event },
  13: { combat: ch13Combat, elite: ch13Elite, boss: ch13Boss, event: ch13Event },
  14: { combat: ch14Combat, elite: ch14Elite, boss: ch14Boss, event: ch14Event },
};

export function backdropFor(
  chapter: number | undefined,
  kind: BackdropKind | 'rest',
): string | undefined {
  if (!chapter) return undefined;
  return SCENES[chapter]?.[kind === 'rest' ? 'event' : kind];
}
