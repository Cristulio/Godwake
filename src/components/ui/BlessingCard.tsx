import { getBlessing } from '../../content/blessings';
import { BLESSING_GOD_LABEL } from '../../schemas/blessing';

interface BlessingCardProps {
  blessingId: string;
  onPick?: () => void;
  pickable?: boolean;
}

export function BlessingCard({ blessingId, onPick, pickable = false }: BlessingCardProps) {
  let b;
  try {
    b = getBlessing(blessingId);
  } catch {
    return null;
  }

  const baseClass =
    'bg-[var(--color-bg-panel)] border-2 border-[var(--color-accent-gold)]/40 p-4 transition-all';
  const interactiveClass = pickable
    ? 'hover:border-[var(--color-accent-amber)] hover:bg-[var(--color-bg-panel-hover)] hover:scale-[1.015] cursor-pointer text-left w-full shadow-[0_0_0_rgba(244,167,66,0)] hover:shadow-[0_0_18px_rgba(244,167,66,0.25)]'
    : '';

  const inner = (
    <>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="text-[var(--color-accent-amber)] uppercase tracking-wider text-sm font-bold">
          ◆ {b.name}
        </div>
        <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 border border-[var(--color-accent-gold)] text-[var(--color-accent-gold)]">
          {BLESSING_GOD_LABEL[b.god]}
        </span>
      </div>
      <p className="text-[var(--color-text-secondary)] text-xs italic mb-2 leading-relaxed">
        {b.flavor}
      </p>
      <p className="text-[var(--color-text-primary)] text-xs">
        <span className="text-[var(--color-text-dim)] uppercase tracking-widest text-[10px] mr-1">
          Effect:
        </span>
        {b.effect}
      </p>
    </>
  );

  if (pickable) {
    return (
      <button type="button" onClick={onPick} className={`${baseClass} ${interactiveClass}`}>
        {inner}
      </button>
    );
  }
  return <div className={baseClass}>{inner}</div>;
}
