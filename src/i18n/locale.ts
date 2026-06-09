/**
 * Locale identity — kept in a dependency-free leaf so non-i18n modules (e.g. the
 * settings store) can read the supported set + default WITHOUT importing the i18n
 * barrel, which pulls in the settings store itself (a cycle that corrupts `t()`
 * during init). The i18n barrel re-exports these, so existing `from '../i18n'`
 * imports are unaffected.
 */
export type Locale = 'en' | 'es';
export const LOCALES: Locale[] = ['en', 'es'];
export const DEFAULT_LOCALE: Locale = 'en';
