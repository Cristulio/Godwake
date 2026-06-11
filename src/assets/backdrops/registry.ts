import ch1Combat from './ch1-combat.svg';
import ch1Elite from './ch1-elite.svg';
import ch1Boss from './ch1-boss.svg';
import ch1Event from './ch1-event.svg';
import ch2Combat from './ch2-combat.svg';
import ch2Elite from './ch2-elite.svg';
import ch2Boss from './ch2-boss.svg';
import ch2Event from './ch2-event.svg';
import ch3Combat from './ch3-combat.svg';
import ch3Elite from './ch3-elite.svg';
import ch3Boss from './ch3-boss.svg';
import ch3Event from './ch3-event.svg';
import ch4Combat from './ch4-combat.svg';
import ch4Elite from './ch4-elite.svg';
import ch4Boss from './ch4-boss.svg';
import ch4Event from './ch4-event.svg';
import ch5Combat from './ch5-combat.svg';
import ch5Elite from './ch5-elite.svg';
import ch5Boss from './ch5-boss.svg';
import ch5Event from './ch5-event.svg';
import ch6Combat from './ch6-combat.svg';
import ch6Elite from './ch6-elite.svg';
import ch6Boss from './ch6-boss.svg';
import ch6Event from './ch6-event.svg';

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
  3: { combat: ch3Combat, elite: ch3Elite, boss: ch3Boss, event: ch3Event },
  4: { combat: ch4Combat, elite: ch4Elite, boss: ch4Boss, event: ch4Event },
  5: { combat: ch5Combat, elite: ch5Elite, boss: ch5Boss, event: ch5Event },
  6: { combat: ch6Combat, elite: ch6Elite, boss: ch6Boss, event: ch6Event },
};

export function backdropFor(
  chapter: number | undefined,
  kind: BackdropKind | 'rest',
): string | undefined {
  if (!chapter) return undefined;
  return SCENES[chapter]?.[kind === 'rest' ? 'event' : kind];
}
