/**
 * Shared, side-effect-free enumeration of the procedural delve room strings
 * (encounter + room titles/flavor) bucketed by chapter. Both the overlay
 * generator (gen-room-i18n.ts) and the completeness test walk the SAME fixed
 * seed range so they always agree on the string set. Event / boss-intel rooms
 * are excluded — they localize through es/events.json / es/bossIntel.json.
 */
import { createGodwakeDelve, TOTAL_CHAPTERS } from '../src/engine/delve';

export { TOTAL_CHAPTERS };

/** Deterministic seed range — wide enough to surface the whole pool per chapter. */
export const ROOM_I18N_SEEDS = Array.from({ length: 600 }, (_, i) => i + 1);

/** Distinct rendered room strings (title + flavorText) bucketed by chapter. */
export function collectRoomStrings(): Map<number, Set<string>> {
  const byChapter = new Map<number, Set<string>>();
  for (const seed of ROOM_I18N_SEEDS) {
    const delve = createGodwakeDelve({ seed, fullChain: true });
    for (const room of delve.rooms) {
      const ch = (room as { chapter?: number }).chapter ?? 0;
      if (ch < 1 || (room as { kind?: string }).kind === 'event') continue;
      const set = byChapter.get(ch) ?? new Set<string>();
      const title = (room as { title?: string }).title;
      const flavor = (room as { flavorText?: string }).flavorText;
      if (title) set.add(title);
      if (flavor) set.add(flavor);
      byChapter.set(ch, set);
    }
  }
  return byChapter;
}
