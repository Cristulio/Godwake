import { useSettingsStore } from '../stores/settingsStore';
import { LOCALES, DEFAULT_LOCALE, type Locale } from './locale';

export { LOCALES, DEFAULT_LOCALE, type Locale };

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };
type NamespaceData = Record<string, Json>;
type Registry = Record<string, Record<string, NamespaceData>>;

/**
 * Eagerly load every locale JSON. Built as a glob so a later content-overlay
 * lane only has to drop `es/<namespace>.json` into place — no wiring here.
 */
// `import.meta.glob` is a Vite build transform; in the app it's replaced with
// the eager JSON imports. Under a raw node/tsx run (the balance sims import the
// engine, which transitively imports this module) it isn't available and throws
// — fall back to an empty registry so t()/getLocalized just return the English
// source. The literal call stays intact so Vite still transforms it for the app.
let modules: Record<string, { default: NamespaceData }>;
try {
  modules = import.meta.glob<{ default: NamespaceData }>('./locales/*/*.json', {
    eager: true,
  });
} catch {
  modules = {};
}

const registry: Registry = {};
for (const path in modules) {
  const match = path.match(/\/locales\/([^/]+)\/([^/]+)\.json$/);
  if (!match) continue;
  const [, lang, namespace] = match;
  (registry[lang] ??= {})[namespace] = modules[path].default;
}

export function getLocale(): Locale {
  return useSettingsStore.getState().locale;
}

/**
 * Fold accents to their base letters (Í→I, ñ→n, …). Used ONLY for text rendered
 * in the pixel display font (Press Start 2P), which has no accented-capital
 * glyphs — without this an accented char falls back to a mismatched font and
 * renders "weird". Body/narrative fonts keep their accents, so this is applied at
 * the pixel-heading render site, never to the source strings. No-op for English.
 */
export function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function resolvePath(data: NamespaceData | undefined, path: string[]): Json | undefined {
  let node: Json | undefined = data;
  for (const seg of path) {
    if (node == null || typeof node !== 'object' || Array.isArray(node)) return undefined;
    node = (node as { [k: string]: Json })[seg];
  }
  return node;
}

function interpolate(s: string, params?: Record<string, string | number>): string {
  if (!params) return s;
  return s.replace(/\{(\w+)\}/g, (_, k) =>
    k in params ? String(params[k]) : `{${k}}`,
  );
}

/**
 * Look up a UI string by `namespace.dotted.path`. Resolves against the active
 * locale, falls back to English, then to the key itself so a missing string is
 * loud but never crashes. Pass a `count` param to pick a `{ one, other }` node.
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const locale = getLocale();
  const [namespace, ...path] = key.split('.');

  const lookup = (lang: string): Json | undefined =>
    resolvePath(registry[lang]?.[namespace], path);

  let value = lookup(locale);
  if (value === undefined && locale !== DEFAULT_LOCALE) value = lookup(DEFAULT_LOCALE);

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const count = params?.count;
    if (typeof count === 'number') {
      const form = count === 1 ? value.one : value.other;
      if (typeof form === 'string') return interpolate(form, params);
    }
    return key;
  }

  if (typeof value !== 'string') return key;
  return interpolate(value, params);
}

/**
 * The CONTENT seam. Returns the Spanish overlay field for a content row when
 * the locale is Spanish and the overlay exists; otherwise the English source
 * that lives on the content object. Later lanes add `es/<namespace>.json`
 * shaped `{ "<id>": { "<field>": "…" } }` with zero changes to content files
 * or Zod schemas.
 */
export function getLocalized(
  namespace: string,
  id: string,
  field: string,
  fallbackEnglish: string,
): string {
  if (getLocale() === DEFAULT_LOCALE) return fallbackEnglish;
  const row = registry.es?.[namespace]?.[id];
  if (row && typeof row === 'object' && !Array.isArray(row)) {
    const val = (row as { [k: string]: Json })[field];
    if (typeof val === 'string') return val;
  }
  return fallbackEnglish;
}

/**
 * Localize a monster ACTION name / description. These live inline on the monster
 * def's `actions[]`, so the overlay nests under the monster's es row as
 * `actions: { "<English action name>": { "name": "…", "desc": "…" } }`, keyed by
 * the English action NAME (which doubles as the engine's stable action key — it
 * must stay English everywhere it's stored/looked-up, so localize ONLY at the
 * point of display). Falls back to the English source out of locale / untranslated.
 */
function monsterActionRow(monsterId: string, englishName: string): { name?: Json; desc?: Json } | undefined {
  const row = registry.es?.monsters?.[monsterId];
  if (!row || typeof row !== 'object' || Array.isArray(row)) return undefined;
  const actions = (row as { [k: string]: Json }).actions;
  if (!actions || typeof actions !== 'object' || Array.isArray(actions)) return undefined;
  const entry = (actions as { [k: string]: Json })[englishName];
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return undefined;
  return entry as { name?: Json; desc?: Json };
}

export function getLocalizedMonsterActionName(monsterId: string, englishName: string): string {
  if (getLocale() === DEFAULT_LOCALE) return englishName;
  const val = monsterActionRow(monsterId, englishName)?.name;
  return typeof val === 'string' ? val : englishName;
}

export function getLocalizedMonsterActionDesc(
  monsterId: string,
  englishName: string,
  englishDesc: string,
): string {
  if (getLocale() === DEFAULT_LOCALE) return englishDesc;
  const val = monsterActionRow(monsterId, englishName)?.desc;
  return typeof val === 'string' ? val : englishDesc;
}

/**
 * Localize a PROCEDURAL delve room string — an encounter / room title or flavor.
 * These live inline in the pool + delve code with NO ids, so the overlay
 * (es/rooms{chapter}.json) is keyed by the ENGLISH SOURCE string and bucketed by
 * the chapter the room belongs to. Falls back to the English source out of locale
 * or when untranslated. Event / boss-intel rooms do NOT use this — they localize
 * through es/events.json / es/bossIntel.json.
 */
export function localizeRoomText(chapter: number | undefined, englishSource: string): string {
  if (!englishSource || getLocale() === DEFAULT_LOCALE || !chapter) return englishSource;
  const val = registry.es?.[`rooms${chapter}`]?.[englishSource];
  return typeof val === 'string' ? val : englishSource;
}
