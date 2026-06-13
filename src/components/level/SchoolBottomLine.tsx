import type { Subclass } from '../../schemas/class';
import { useT } from '../../i18n/useT';
import { stripDiacritics } from '../../i18n';

/**
 * Accent color per archetype word, keyed by the EN source word (stable across
 * locales — the es overlay only changes the displayed label). Words that share
 * a meaning may share a hue (Tank/Warden), but the schools WITHIN one class
 * always carry distinct words, so a chooser's options read as different things
 * at a glance. Hues anchor to the design palette: blood red, arcane violet,
 * block blue, amber.
 */
export const ARCHETYPE_ACCENTS: Record<string, string> = {
  Striker: '#E8584F',
  'Two-Blades': '#ED7434',
  Tank: '#8AA8FF',
  Caster: '#A87FE0',
  Ambusher: '#58B97A',
  Duelist: '#E1C25A',
  Cleaver: '#F4A742',
  'Boss-Killer': '#CE6BD6',
  Blaster: '#FF8147',
  Warden: '#8AA8FF',
  Mirage: '#4ECDC4',
  Shapeshifter: '#8FBF6E',
};

const DEFAULT_ACCENT = '#F4A742';

export function archetypeAccent(archetype: string): string {
  return ARCHETYPE_ACCENTS[archetype] ?? DEFAULT_ACCENT;
}

/** Dice (2d8), level marks (L10), ranges (19–20), signed ints and percentages —
 *  the magnitudes the whole block exists to surface. Single capture group so a
 *  split() alternates plain / highlighted parts. */
const NUMBER_TOKEN = /(\d*d\d+|L\d+|[+−-]?\d+(?:[–—-]\d+)?%?|×\d+)/g;

function HighlightedLever({ text, accent }: { text: string; accent: string }) {
  const parts = text.split(NUMBER_TOKEN);
  return (
    <span>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className="font-bold" style={{ color: accent }}>
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  );
}

/**
 * The loud mechanical summary at the foot of a school card: the archetype chip
 * plus the lever bullets, all in the school's accent color. The flavor copy
 * above it stays flavorful; this block is where the player reads what actually
 * changes.
 */
export function SchoolBottomLine({ classId, sub }: { classId: string; sub: Subclass }) {
  const { tc } = useT();
  const bl = sub.bottomLine;
  const accent = archetypeAccent(bl.archetype);
  const key = `${classId}.${sub.id}`;
  return (
    <div className="mt-2.5 pt-2.5 normal-case tracking-normal" style={{ borderTop: `1px solid ${accent}55` }}>
      <span
        className="inline-block font-display text-[10px] uppercase tracking-[0.22em] px-2 py-1 border"
        style={{
          color: accent,
          borderColor: accent,
          background: `${accent}1f`,
          textShadow: `0 0 10px ${accent}66`,
        }}
      >
        {stripDiacritics(tc('classes', key, 'archetype', bl.archetype))}
      </span>
      <ul className="mt-2 flex flex-col gap-1.5">
        {bl.levers.map((lever, i) => (
          <li
            key={i}
            className="flex gap-1.5 text-xs leading-snug font-semibold text-[var(--color-text-primary)]"
          >
            <span aria-hidden style={{ color: accent }}>
              ▸
            </span>
            <HighlightedLever text={tc('classes', key, `lever${i}`, lever)} accent={accent} />
          </li>
        ))}
      </ul>
    </div>
  );
}
