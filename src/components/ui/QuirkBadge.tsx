import { getQuirk } from '../../content/quirks';

/** Base soul-mark bonus a single (unit-weight) bane earns, as a percent. */
export const SOUL_MARK_PCT_PER_BANE = 20;

interface QuirkBadgeProps {
  quirkId: string;
  size?: 'sm' | 'md';
  /**
   * The whole soul's bane count and its already-resolved soul-mark percent
   * (weighted — harsh banes count for more). When given, the badge shows the
   * soul's actual total instead of the per-bane rate (e.g. "your 2 marks earn
   * +40%", not "+20% per bane").
   */
  baneCount?: number;
  soulMarkPct?: number;
}

export function QuirkBadge({ quirkId, size = 'sm', baneCount, soulMarkPct }: QuirkBadgeProps) {
  let q;
  try {
    q = getQuirk(quirkId);
  } catch {
    return null;
  }

  const colorClass =
    q.sentiment === 'boon'
      ? 'border-[var(--color-status-poison)] text-[var(--color-status-poison)]'
      : q.sentiment === 'bane'
        ? 'border-[var(--color-accent-blood)] text-[var(--color-accent-blood)]'
        : 'border-[var(--color-accent-amber)] text-[var(--color-accent-amber)]';

  const sizeClass =
    size === 'sm'
      ? 'text-[10px] px-1.5 py-0.5'
      : 'text-xs px-2 py-1';

  // Banes contribute to the soul-mark reward bonus (+20% gold/xp/renown each).
  // Surface that in the tooltip so the player understands the trade — resolved
  // to this soul's actual total when the bane count is known, not the rate.
  const tooltipParts = [`${q.name} — ${q.effect}`, q.flavor];
  if (q.sentiment === 'bane') {
    const soulMarkLine =
      baneCount && baneCount > 0 && soulMarkPct !== undefined
        ? `Soul-mark: your ${baneCount} ${baneCount === 1 ? 'mark earns' : 'marks earn'} +${soulMarkPct}% gold, XP, and renown.`
        : `Soul-mark: +${SOUL_MARK_PCT_PER_BANE}% gold, XP, and renown earned per bane.`;
    tooltipParts.splice(1, 0, soulMarkLine);
  }

  return (
    <span
      className={`inline-block border ${colorClass} ${sizeClass} uppercase tracking-widest font-bold bg-[var(--color-bg-panel)]/80`}
      title={tooltipParts.join('\n\n')}
    >
      {q.name}
    </span>
  );
}

interface QuirkRowProps {
  quirkIds: string[];
  emptyText?: string;
}

export function QuirkRow({ quirkIds, emptyText = 'No quirks' }: QuirkRowProps) {
  if (quirkIds.length === 0) {
    return (
      <span className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest italic">
        {emptyText}
      </span>
    );
  }
  // Resolve the soul's soul-mark total here (the row sees every mark), weighting
  // harsh banes the way the reward engine does, so each bane badge can show the
  // soul's real bonus rather than the bare per-bane rate.
  let baneCount = 0;
  let weightedBanes = 0;
  for (const id of quirkIds) {
    try {
      const q = getQuirk(id);
      if (q.sentiment === 'bane') {
        baneCount += 1;
        weightedBanes += q.soulMarkWeight ?? 1.0;
      }
    } catch {
      continue;
    }
  }
  const soulMarkPct = Math.round(weightedBanes * SOUL_MARK_PCT_PER_BANE);
  return (
    <div className="flex flex-wrap gap-1">
      {quirkIds.map((id) => (
        <QuirkBadge key={id} quirkId={id} baneCount={baneCount} soulMarkPct={soulMarkPct} />
      ))}
    </div>
  );
}
