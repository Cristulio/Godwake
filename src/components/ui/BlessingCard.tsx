import { getBlessing } from '../../content/blessings';
import { BLESSING_GOD_LABEL } from '../../schemas/blessing';

interface BlessingCardProps {
  blessingId: string;
  onPick?: () => void;
  pickable?: boolean;
  /**
   * This life's bane count and delve level. When given, a blessing whose effect
   * scales with run state shows the resolved total for THIS soul ("+4 temp HP"
   * with two banes) instead of the bare per-bane / per-level rate.
   */
  baneCount?: number;
  delveLevel?: number;
}

/**
 * For a blessing whose payoff scales with run state, the resolved total for the
 * soul standing at the altar — null when nothing on this blessing scales (or no
 * run context was supplied).
 */
function resolvedEffect(
  mods: ReturnType<typeof getBlessing>['modifiers'],
  baneCount?: number,
  delveLevel?: number,
): string | null {
  const parts: string[] = [];
  if (baneCount !== undefined && mods.acBonusPerBaneQuirk) {
    parts.push(`+${mods.acBonusPerBaneQuirk * baneCount} AC`);
  }
  if (baneCount !== undefined && mods.tempHpPerBaneQuirk) {
    parts.push(`+${mods.tempHpPerBaneQuirk * baneCount} temp HP each combat`);
  }
  if (delveLevel !== undefined && mods.tempHpPerDelveLevel) {
    parts.push(`+${mods.tempHpPerDelveLevel * delveLevel} temp HP each combat`);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

export function BlessingCard({
  blessingId,
  onPick,
  pickable = false,
  baneCount,
  delveLevel,
}: BlessingCardProps) {
  let b;
  try {
    b = getBlessing(blessingId);
  } catch {
    return null;
  }

  const resolved = resolvedEffect(b.modifiers, baneCount, delveLevel);

  const baseClass =
    'bg-[var(--color-bg-panel)] border-2 border-[var(--color-accent-gold)]/40 p-4 transition-all h-full flex flex-col';
  const interactiveClass = pickable
    ? 'hover:border-[var(--color-accent-amber)] hover:bg-[var(--color-bg-panel-hover)] hover:scale-[1.015] cursor-pointer text-left w-full shadow-[0_0_0_rgba(244,167,66,0)] hover:shadow-[0_0_18px_rgba(244,167,66,0.25)]'
    : '';

  const inner = (
    <>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="text-[var(--color-accent-amber)] uppercase tracking-wider text-sm font-bold leading-tight">
          ◆ {b.name}
        </div>
        <span className="shrink-0 text-[9px] uppercase tracking-widest px-1.5 py-0.5 border border-[var(--color-accent-gold)] text-[var(--color-accent-gold)] whitespace-nowrap">
          {BLESSING_GOD_LABEL[b.god]}
        </span>
      </div>
      <p className="text-[var(--color-text-secondary)] text-xs italic mb-3 leading-relaxed">
        {b.flavor}
      </p>
      <p className="text-[var(--color-text-primary)] text-xs mt-auto pt-2 border-t border-[var(--color-border-dim)]">
        <span className="text-[var(--color-text-dim)] uppercase tracking-widest text-[10px] mr-1">
          Effect:
        </span>
        {b.effect}
      </p>
      {resolved && (
        <p className="text-[var(--color-accent-amber)] text-xs mt-1">
          <span className="text-[var(--color-text-dim)] uppercase tracking-widest text-[10px] mr-1">
            For this soul:
          </span>
          {resolved}
        </p>
      )}
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
