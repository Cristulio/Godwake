import { useEffect, useRef } from 'react';
import type { CombatLogEntry } from '../../types/combat';

interface CombatLogProps {
  entries: CombatLogEntry[];
}

const KIND_STYLE: Record<string, string> = {
  roll: 'text-[var(--color-accent-gold)]',
  damage: 'text-[var(--color-accent-blood)]',
  system: 'text-[var(--color-accent-amber)] uppercase tracking-wider',
  narration: 'text-[var(--color-text-secondary)] italic',
};

export function CombatLog({ entries }: CombatLogProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [entries.length]);

  return (
    <div
      ref={ref}
      className="bg-[var(--color-bg-elevated)] border border-[var(--color-border-dim)] p-3 h-48 overflow-y-auto font-mono text-xs leading-relaxed"
    >
      {entries.map((entry) => (
        <div
          key={entry.id}
          className={`${KIND_STYLE[entry.kind ?? 'narration'] ?? 'text-[var(--color-text-secondary)]'} mb-1`}
        >
          {entry.kind === 'system' ? entry.text : `> ${entry.text}`}
        </div>
      ))}
    </div>
  );
}
