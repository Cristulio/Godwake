import { getQuirk } from '../../content/quirks';

interface QuirkBadgeProps {
  quirkId: string;
  size?: 'sm' | 'md';
}

export function QuirkBadge({ quirkId, size = 'sm' }: QuirkBadgeProps) {
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
  // Surface that in the tooltip so the player understands the trade.
  const tooltipParts = [`${q.name} — ${q.effect}`, q.flavor];
  if (q.sentiment === 'bane') {
    tooltipParts.splice(1, 0, 'Soul-mark: +20% gold, XP, and renown earned per bane.');
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
  return (
    <div className="flex flex-wrap gap-1">
      {quirkIds.map((id) => (
        <QuirkBadge key={id} quirkId={id} />
      ))}
    </div>
  );
}
