import { useState } from 'react';
import { getBossIntelCard } from '../../content/bossIntel';

interface BossIntelBadgeProps {
  bossDefId: string;
  level: 'partial' | 'full';
}

/**
 * Small overlay badge shown during boss combat when the player paid the toll
 * for intel in the pre-boss room. Collapsed by default to one line; expand
 * to read the full stat block.
 */
export function BossIntelBadge({ bossDefId, level }: BossIntelBadgeProps) {
  const card = getBossIntelCard(bossDefId);
  const [open, setOpen] = useState(false);
  if (!card) return null;

  const hpText = level === 'full' ? `${card.exactHp} HP` : card.hpRangeText;
  const acText = level === 'full' ? `AC ${card.ac}` : 'AC unknown';
  const summary = `INTEL · ${hpText} · ${acText} · ${card.signature}`;

  return (
    <div
      className="border-2 border-[var(--color-accent-amber)]/60 bg-[var(--color-bg-panel)]/85 px-3 py-2 text-[10px] tracking-widest uppercase text-[var(--color-text-secondary)] cursor-pointer hover:bg-[var(--color-bg-panel-hover)] transition-colors"
      onClick={() => setOpen((o) => !o)}
      data-testid="boss-intel-badge"
      title={open ? 'Hide intel' : 'Show full intel'}
    >
      <div className="flex justify-between items-baseline gap-2">
        <span className="text-[var(--color-accent-amber)] truncate">{summary}</span>
        <span className="text-[var(--color-text-dim)] text-[9px] shrink-0">
          {open ? '▾' : '▸'}
        </span>
      </div>
      {open && (
        <ul className="mt-2 pt-2 border-t border-[var(--color-border-dim)] flex flex-col gap-1 font-mono normal-case tracking-normal text-[11px] text-[var(--color-text-primary)]">
          {level === 'full' ? (
            card.fullActions.map((line, idx) => (
              <li key={idx} className="leading-snug">· {line}</li>
            ))
          ) : (
            <li className="leading-snug italic text-[var(--color-text-secondary)]">
              · The omens named the threat but not the full ledger. (Pay the scout
              next time for exact numbers.)
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
