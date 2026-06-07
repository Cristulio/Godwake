import { getBlessing } from '../../content/blessings';
import { useT } from '../../i18n/useT';

interface BlessingBadgeProps {
  blessingId: string;
}

export function BlessingBadge({ blessingId }: BlessingBadgeProps) {
  const { tc } = useT();
  let b;
  try {
    b = getBlessing(blessingId);
  } catch {
    return null;
  }

  const name = tc('blessings', b.id, 'name', b.name);
  return (
    <span
      className="inline-flex items-center gap-1 border border-[var(--color-accent-gold)] text-[var(--color-accent-gold)] text-[10px] uppercase tracking-widest font-bold bg-[var(--color-bg-panel)]/80 px-1.5 py-0.5"
      title={`${name} — ${tc('blessings', b.id, 'effect', b.effect)}\n\n${tc('blessings', b.id, 'flavor', b.flavor)}`}
    >
      <span className="text-[var(--color-accent-amber)]">◆</span>
      {name}
    </span>
  );
}

interface BlessingRowProps {
  blessingIds: string[];
  emptyText?: string;
}

export function BlessingRow({ blessingIds, emptyText }: BlessingRowProps) {
  if (blessingIds.length === 0) {
    if (!emptyText) return null;
    return (
      <span className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest italic">
        {emptyText}
      </span>
    );
  }
  return (
    <div className="flex flex-wrap gap-1">
      {blessingIds.map((id) => (
        <BlessingBadge key={id} blessingId={id} />
      ))}
    </div>
  );
}
