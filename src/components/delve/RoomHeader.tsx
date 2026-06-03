import { useEffect, useState } from 'react';
import type { DelveState } from '../../types/delve';
import { chapterLabel, getTwist } from '../../engine/delve';
import { BlessingCard } from '../ui/BlessingCard';
import { QuirkCard } from '../ui/QuirkCard';

interface RoomHeaderProps {
  delve: DelveState;
  blessingIds?: string[];
  quirkIds?: string[];
}

/**
 * Minimal breadcrumb. The total room count is intentionally hidden — the
 * player should not know how deep the delve goes. The room's flavor title
 * (shown in the combat header) is their only spatial cue.
 *
 * The Soul Ledger button opens an any-time review of both quirks and
 * blessings — the two persistent run-flavors the player can re-read from
 * any room type without leaving.
 */
export function RoomHeader({ delve, blessingIds = [], quirkIds = [] }: RoomHeaderProps) {
  const [open, setOpen] = useState(false);
  const total = blessingIds.length + quirkIds.length;
  const twist = getTwist(delve.rooms[delve.currentRoomIdx]?.twistId);
  const chapter = delve.rooms[delve.currentRoomIdx]?.chapter;

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
        <div className="font-display text-[var(--color-text-dim)] text-[10px] uppercase tracking-[0.3em]">
          {delve.dungeonName}
          {chapter ? ` · ${chapterLabel(delve, chapter)}` : ''}
        </div>
        {total > 0 && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="
              border border-[var(--color-accent-gold)] text-[var(--color-accent-gold)]
              hover:bg-[var(--color-bg-panel-hover)] hover:text-[var(--color-accent-amber)]
              text-[10px] uppercase tracking-widest font-bold px-2 py-1 transition-colors
              flex items-center gap-2
            "
            title="Show all active quirks and blessings"
          >
            <span>◆ Soul Ledger</span>
            {quirkIds.length > 0 && (
              <span className="text-[var(--color-accent-amber)]">
                ◉ {quirkIds.length}
              </span>
            )}
            {blessingIds.length > 0 && (
              <span className="text-[var(--color-accent-gold)]">
                ◇ {blessingIds.length}
              </span>
            )}
          </button>
        )}
      </div>

      {twist && (
        <div className="mt-2 border border-[var(--color-accent-deep-blood)] bg-[var(--color-bg-panel)] px-3 py-2 flex items-start gap-2">
          <span className="text-[var(--color-accent-blood)] text-sm leading-none mt-0.5">✦</span>
          <div>
            <div className="font-display text-[var(--color-accent-blood)] text-[10px] uppercase tracking-[0.3em]">
              {twist.name}
            </div>
            <p className="text-[var(--color-text-secondary)] text-xs italic mt-0.5 leading-snug">
              {twist.flavorText}
            </p>
          </div>
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setOpen(false)}
        >
          <div
            className="panel-etched-warm border-2 border-[var(--color-accent-gold)] max-w-2xl w-full max-h-[80vh] overflow-y-auto animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 p-4 border-b border-[var(--color-border-warm)]">
              <div>
                <h2 className="font-display text-[var(--color-accent-amber)] text-base uppercase tracking-[0.2em]">
                  ◆ The Soul's Ledger
                </h2>
                <p className="text-[var(--color-text-dim)] text-xs italic mt-1 normal-case tracking-normal">
                  Quirks are scars of the soul — they survive the wheel. Blessings belong to the body and end with it.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-accent-amber)] text-xs uppercase tracking-widest transition-colors"
                title="Close (Esc)"
              >
                ✕ Close
              </button>
            </div>

            {quirkIds.length > 0 && (
              <div className="p-4 border-b border-[var(--color-border-dim)]">
                <div className="font-display text-[var(--color-accent-amber)] text-[10px] uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                  <span>◉ Quirks</span>
                  <span className="text-[var(--color-text-dim)]">
                    · {quirkIds.length} mark{quirkIds.length === 1 ? '' : 's'} on the soul
                  </span>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  {quirkIds.map((id) => (
                    <QuirkCard key={id} quirkId={id} />
                  ))}
                </div>
              </div>
            )}

            {blessingIds.length > 0 && (
              <div className="p-4">
                <div className="font-display text-[var(--color-accent-gold)] text-[10px] uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                  <span>◇ Blessings</span>
                  <span className="text-[var(--color-text-dim)]">
                    · {blessingIds.length} gift{blessingIds.length === 1 ? '' : 's'} for the road
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  {blessingIds.map((id) => (
                    <BlessingCard key={id} blessingId={id} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
