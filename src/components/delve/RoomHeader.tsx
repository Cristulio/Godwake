import { useEffect, useState } from 'react';
import type { DelveState, RoomKind } from '../../types/delve';
import { BlessingCard } from '../ui/BlessingCard';
import { QuirkCard } from '../ui/QuirkCard';
import { useGameStore } from '../../stores/gameStore';

interface RoomHeaderProps {
  delve: DelveState;
  blessingIds?: string[];
  quirkIds?: string[];
}

/** Short labels for the Wayfarer's Map road-ahead chips. Kind only, never depth. */
const ROOM_AHEAD_LABEL: Record<RoomKind, string> = {
  combat: 'Fight',
  boss: 'Boss',
  rest: 'Rest',
  treasure: 'Spoils',
  event: 'Omen',
  shrine: 'Shrine',
  camp: 'Camp',
};

/**
 * Minimal breadcrumb. The total room count is intentionally hidden — the
 * player should not know how deep the delve goes. The room's flavor title
 * (shown in the combat header) is their only spatial cue.
 *
 * The Soul-marks button opens an any-time review of both quirks and
 * blessings — the two persistent run-flavors the player can re-read from
 * any room type without leaving.
 */
export function RoomHeader({ delve, blessingIds = [], quirkIds = [] }: RoomHeaderProps) {
  const [open, setOpen] = useState(false);
  const total = blessingIds.length + quirkIds.length;

  // Wayfarer's Map (Grove on-ramp): reveal the KIND of the next `rank` rooms.
  // Read the owned rank straight from the meta store — the upgrade itself is a
  // no-op marker. Total depth is never shown; only the upcoming kinds.
  const wayfarerRank = useGameStore((s) => s.unlockedUpgrades['wayfarers-map'] ?? 0);
  const roadAhead =
    wayfarerRank > 0
      ? delve.rooms.slice(delve.currentRoomIdx + 1, delve.currentRoomIdx + 1 + wayfarerRank)
      : [];

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
            <span>◆ Soul-marks</span>
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

      {roadAhead.length > 0 && (
        <div className="flex items-center gap-2 mt-1.5">
          <span className="font-display text-[var(--color-text-dim)] text-[9px] uppercase tracking-[0.3em]">
            Road ahead
          </span>
          <div className="flex items-center gap-1">
            {roadAhead.map((r, i) => (
              <span
                key={`${r.id}-${i}`}
                className="font-display text-[9px] uppercase tracking-widest px-1.5 py-0.5 border border-[var(--color-border-dim)] text-[var(--color-text-secondary)] bg-[var(--color-bg-deep)]/40"
              >
                {ROOM_AHEAD_LABEL[r.kind]}
              </span>
            ))}
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
                  ◆ Soul-marks
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
