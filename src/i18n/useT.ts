import { useSettingsStore } from '../stores/settingsStore';
import {
  t as translate,
  getLocalized as getLocalizedRaw,
  localizeRoomText as localizeRoomTextRaw,
  type Locale,
} from './index';

type Params = Record<string, string | number>;

/**
 * Subscribes the calling component to the active locale and returns the bound
 * translation helpers. `t` resolves UI keys; `tc` is the content seam; `lr`
 * localizes procedural delve room text (title/flavor) keyed by the English
 * source + chapter. All read the live locale, but going through this hook
 * guarantees a re-render on a language switch. `locale` is exposed for the rare
 * branch that needs it.
 */
export function useT(): {
  t: (key: string, params?: Params) => string;
  tc: (namespace: string, id: string, field: string, fallbackEnglish: string) => string;
  lr: (chapter: number | undefined, englishSource: string) => string;
  locale: Locale;
} {
  const locale = useSettingsStore((s) => s.locale);
  void locale; // subscription is the point; the helpers read the live store.
  return { t: translate, tc: getLocalizedRaw, lr: localizeRoomTextRaw, locale };
}
