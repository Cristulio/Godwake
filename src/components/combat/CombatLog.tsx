import { useEffect, useRef } from 'react';
import type { CombatLogEntry } from '../../types/combat';
import { useT } from '../../i18n/useT';

interface CombatLogProps {
  entries: CombatLogEntry[];
  /** Cap on rendered entries; older are clipped. Default 80. */
  maxEntries?: number;
}

// Visual hierarchy by kind: the action beats a player cares about — attack
// rolls and the damage they land — read big and bright; bookkeeping (turn
// markers, brace/temp-HP, flavor) shrinks and dims so it recedes. This is the
// foe/neutral baseline; the hero's own beats are promoted by PLAYER_KIND_STYLE.
const KIND_STYLE: Record<string, string> = {
  roll: 'text-[12px] font-semibold text-[var(--color-accent-gold)]',
  damage: 'text-[13px] font-bold tracking-wide text-[var(--color-accent-blood)]',
  system: 'text-[9px] uppercase tracking-wider font-display text-[var(--color-accent-amber)] opacity-60',
  narration: 'text-[10px] italic text-[var(--color-text-secondary)] opacity-60',
};

// The hero's OWN rolls and the damage THEY deal (entry.source === 'player') read
// a clear step larger and brighter than the foe's lines, so a glance at the log
// instantly surfaces what the player just did. Only roll/damage are promoted —
// system/narration stay recessive whatever the source, so flavor never shouts.
const PLAYER_KIND_STYLE: Record<string, string> = {
  roll: 'text-[15px] font-bold text-[var(--color-accent-gold)]',
  damage: 'text-[17px] font-bold tracking-wide text-[var(--color-accent-blood)] brightness-110',
};

const KIND_GLYPH: Record<string, string> = {
  roll: '⚀',
  damage: '✦',
  system: '◆',
  narration: '›',
};

export function CombatLog({ entries, maxEntries = 80 }: CombatLogProps) {
  const { t } = useT();
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
          {clipped === 1 ? t('combat.order.clippedOne', { n: clipped }) : t('combat.order.clippedMany', { n: clipped })}
        </div>
      )}
      {tail.map((entry) => {
        const kind = entry.kind ?? 'narration';
        // The hero's own roll/damage beats render at the promoted size; all else
        // (the foe's lines, system, narration) keeps the recessive baseline.
        const isPlayer = entry.source === 'player';
        const style =
          (isPlayer ? PLAYER_KIND_STYLE[kind] : undefined) ??
          KIND_STYLE[kind] ??
          'text-[var(--color-text-secondary)]';
        const promoted = isPlayer && PLAYER_KIND_STYLE[kind] !== undefined;
        return (
          <div
            key={entry.id}
            className={`${style} mb-0.5 flex gap-2 items-baseline`}
          >
            <span className={`shrink-0 w-3 ${promoted ? 'opacity-80 text-[12px]' : 'opacity-50 text-[10px]'}`}>
              {KIND_GLYPH[kind] ?? '›'}
            </span>
            <span className="flex-1">{entry.text}</span>
          </div>
        );
      })}
    </div>
  );
}
