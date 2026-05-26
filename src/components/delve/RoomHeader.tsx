import { useEffect, useState } from 'react';
import type { DelveState } from '../../types/delve';
import { BlessingCard } from '../ui/BlessingCard';

interface RoomHeaderProps {
  delve: DelveState;
  blessingIds?: string[];
}

/**
 * A minimal breadcrumb showing only the dungeon's name. The total room count
 * is intentionally hidden — the player should not know how deep the delve
 * goes. The room's flavor title (shown in the combat header) is their only
 * spatial cue.
 *
 * The blessings button is the player's any-time review surface during a
 * delve — they can pop it open from any room type to re-read their gifts.
 */
export function RoomHeader({ delve, blessingIds = [] }: RoomHeaderProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="text-[var(--color-text-dim)] text-xs uppercase tracking-widest">
          {delve.dungeonName}
        </div>
        {blessingIds.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="
              border border-[var(--color-accent-gold)] text-[var(--color-accent-gold)]
              hover:bg-[var(--color-bg-panel-hover)] hover:text-[var(--color-accent-amber)]
              text-[10px] uppercase tracking-widest font-bold px-2 py-1 transition-colors
            "
            title="Show all active blessings"
          >
            ◆ Blessings ({blessingIds.length})
          </button>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-[var(--color-bg-panel)] border-2 border-[var(--color-accent-gold)] max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 p-4 border-b border-[var(--color-border-warm)]">
              <div>
                <h2 className="text-[var(--color-accent-amber)] text-lg uppercase tracking-widest">
                  Active Blessings
                </h2>
                <p className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest">
                  Wiped at the next return to Phandalin
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-accent-amber)] text-xs uppercase tracking-widest"
                title="Close (Esc)"
              >
                ✕ Close
              </button>
            </div>
            <div className="p-4 flex flex-col gap-3">
              {blessingIds.map((id) => (
                <BlessingCard key={id} blessingId={id} />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
