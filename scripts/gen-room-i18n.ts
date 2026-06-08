/**
 * Generate / refresh the per-chapter Spanish overlay scaffold for the procedural
 * delve room text (encounter titles + flavor, and the shrine/rest/shop/camp/
 * treasure room titles + flavor). These strings live inline in the pool/delve
 * code with NO ids, so the overlay is keyed by the ENGLISH STRING and bucketed by
 * the chapter the room belongs to.
 *
 * Samples many full-chain delves (deterministic seed range) and collects every
 * rendered room string per chapter, then writes src/i18n/locales/es/rooms{N}.json
 * as `{ "<english>": "<spanish>" }`. RE-RUNNABLE: adds missing keys with the
 * English text as a placeholder value, never clobbers an existing translation.
 * The es/content-completeness room test enumerates the SAME way.
 *
 *   npx tsx scripts/gen-room-i18n.ts
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { collectRoomStrings, TOTAL_CHAPTERS } from './roomI18nStrings';

function fileFor(chapter: number): string {
  return resolve(process.cwd(), `src/i18n/locales/es/rooms${chapter}.json`);
}

function main() {
  const byChapter = collectRoomStrings();
  let totalKeys = 0;
  let added = 0;
  for (let ch = 1; ch <= TOTAL_CHAPTERS; ch++) {
    const strings = [...(byChapter.get(ch) ?? new Set<string>())].sort();
    if (strings.length === 0) continue;
    const path = fileFor(ch);
    const existing: Record<string, string> = existsSync(path)
      ? (JSON.parse(readFileSync(path, 'utf8')) as Record<string, string>)
      : {};
    const out: Record<string, string> = {};
    for (const en of strings) {
      out[en] = existing[en] ?? en; // keep a translation; placeholder = English
      if (existing[en] === undefined) added++;
    }
    totalKeys += strings.length;
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(out, null, 2) + '\n');
    const untranslated = strings.filter((s) => out[s] === s).length;
    console.log(
      `ch${String(ch).padStart(2)}: ${String(strings.length).padStart(3)} strings · ${untranslated} still English`,
    );
  }
  console.log(`\nTotal: ${totalKeys} room strings across chapters · ${added} new keys this run.`);
}

main();
