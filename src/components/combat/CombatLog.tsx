import { useEffect, useRef } from 'react';
import type { CombatLogEntry } from '../../types/combat';

interface CombatLogProps {
  entries: CombatLogEntry[];
  /** Cap on rendered entries; older are clipped. Default 80. */
  maxEntries?: number;
}

const KIND_STYLE: Record<string, string> = {
  roll: 'text-[var(--color-accent-gold)]',
  damage: 'text-[var(--color-accent-blood)]',
  system: 'text-[var(--color-accent-amber)] uppercase tracking-wider font-display text-[10px]',
  narration: 'text-[var(--color-text-secondary)] italic',
};

const KIND_GLYPH: Record<string, string> = {
  roll: '⚀',
  damage: '✦',
  system: '◆',
  narration: '›',
};

export function CombatLog({ entries, maxEntries = 80 }: CombatLogProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [entries.length]);

  // Show only the last N entries — combat log doesn't need to be unbounded
  // and DOM-rendering 500+ log lines per delve is wasteful.
  const tail = entries.length > maxEntries
    ? entries.slice(-maxEntries)
    : entries;
  const clipped = entries.length - tail.length;

  return (
    <div
      ref={ref}
      className="panel-etched border border-[var(--color-border-dim)] px-3 py-2 h-32 overflow-y-auto font-mono text-[11px] leading-relaxed"
    >
      {clipped > 0 && (
        <div className="text-[var(--color-text-muted)] text-[10px] uppercase tracking-widest italic text-center pb-1 border-b border-[var(--color-border-dim)] mb-1">
          … {clipped} earlier line{clipped === 1 ? '' : 's'} clipped
        </div>
      )}
      {tail.map((entry) => {
        const kind = entry.kind ?? 'narration';
        return (
          <div
            key={entry.id}
            className={`${KIND_STYLE[kind] ?? 'text-[var(--color-text-secondary)]'} mb-0.5 flex gap-2 items-baseline`}
          >
            <span className="opacity-50 text-[10px] shrink-0 w-3">
              {KIND_GLYPH[kind] ?? '›'}
            </span>
            <span className="flex-1">{entry.text}</span>
          </div>
        );
      })}
    </div>
  );
}
