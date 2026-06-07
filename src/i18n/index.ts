import { useSettingsStore } from '../stores/settingsStore';

export type Locale = 'en' | 'es';
export const LOCALES: Locale[] = ['en', 'es'];
export const DEFAULT_LOCALE: Locale = 'en';

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };
type NamespaceData = Record<string, Json>;
type Registry = Record<string, Record<string, NamespaceData>>;

/**
 * Eagerly load every locale JSON. Built as a glob so a later content-overlay
 * lane only has to drop `es/<namespace>.json` into place — no wiring here.
 */
const modules = import.meta.glob<{ default: NamespaceData }>('./locales/*/*.json', {
  eager: true,
});

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
