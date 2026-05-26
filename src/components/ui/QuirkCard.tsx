import { getQuirk } from '../../content/quirks';

interface QuirkCardProps {
  quirkId: string;
}

export function QuirkCard({ quirkId }: QuirkCardProps) {
  let q;
  try {
    q = getQuirk(quirkId);
  } catch {
    return null;
  }

  const sentimentLabel =
    q.sentiment === 'boon' ? 'Boon' : q.sentiment === 'bane' ? 'Bane' : 'Odd';
  const sentimentClass =
    q.sentiment === 'boon'
      ? 'border-[var(--color-status-poison)] text-[var(--color-status-poison)]'
      : q.sentiment === 'bane'
        ? 'border-[var(--color-accent-blood)] text-[var(--color-accent-blood)]'
        : 'border-[var(--color-accent-amber)] text-[var(--color-accent-amber)]';
  const borderClass =
    q.sentiment === 'boon'
      ? 'border-[var(--color-status-poison)]/40'
      : q.sentiment === 'bane'
        ? 'border-[var(--color-accent-blood)]/40'
        : 'border-[var(--color-accent-amber)]/40';

  return (
    <div className={`bg-[var(--color-bg-panel)] border-2 ${borderClass} p-3`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="text-[var(--color-accent-amber)] uppercase tracking-wider text-sm font-bold">
          {q.name}
        </div>
        <span
          className={`text-[9px] uppercase tracking-widest px-1.5 py-0.5 border ${sentimentClass}`}
        >
          {sentimentLabel}
        </span>
      </div>
      <p className="text-[var(--color-text-secondary)] text-xs italic mb-2 leading-relaxed">
        {q.flavor}
      </p>
      <p className="text-[var(--color-text-primary)] text-xs">
        <span className="text-[var(--color-text-dim)] uppercase tracking-widest text-[10px] mr-1">
          Effect:
        </span>
        {q.effect}
      </p>
    </div>
  );
}
