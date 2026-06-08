import { describe, it, expect } from 'vitest';
import { collectRoomStrings, TOTAL_CHAPTERS } from '../../scripts/roomI18nStrings';

/**
 * Structural guard for the procedural delve room-text overlay (es/rooms{N}.json).
 * Every rendered room title/flavor for a chapter must have an overlay slot, and
 * the overlay must hold no stale (orphan) keys. This checks COVERAGE, not
 * translation-ness — a slot whose value is still the English source passes here
 * (the per-chapter translation lanes fill the values; this keeps the structure
 * from drifting). Re-run the scaffold with `npx tsx scripts/gen-room-i18n.ts` if
 * this fails after a content change.
 */
const overlayModules = import.meta.glob('./locales/es/rooms*.json', {
  eager: true,
}) as Record<string, { default: Record<string, string> }>;

const overlays: Record<number, Record<string, string>> = {};
for (const path in overlayModules) {
  const m = path.match(/rooms(\d+)\.json$/);
  if (m) overlays[Number(m[1])] = overlayModules[path].default;
}

const byChapter = collectRoomStrings();

describe('es room-text overlay completeness (es/rooms{N}.json)', () => {
  for (let ch = 1; ch <= TOTAL_CHAPTERS; ch++) {
    const strings = [...(byChapter.get(ch) ?? new Set<string>())];
    if (strings.length === 0) continue;
    it(`chapter ${ch}: covers every rendered room string with no orphans`, () => {
      const overlay = overlays[ch] ?? {};
      expect(Object.keys(overlay).length, `missing es/rooms${ch}.json`).toBeGreaterThan(0);
      const keys = new Set(Object.keys(overlay));
      const present = new Set(strings);
      const missing = strings.filter((s) => !keys.has(s));
      const orphans = Object.keys(overlay).filter((k) => !present.has(k));
      expect(missing, `chapter ${ch} room strings with no es slot`).toEqual([]);
      expect(orphans, `chapter ${ch} stale es slots (regenerate)`).toEqual([]);
    });
  }
});
