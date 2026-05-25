import type { DelveState } from '../../types/delve';

interface RoomHeaderProps {
  delve: DelveState;
}

/**
 * Compact crumb showing the player's progress through the delve.
 * Renders below the main room title in each room component.
 */
export function RoomHeader({ delve }: RoomHeaderProps) {
  return (
    <div className="text-[var(--color-text-dim)] text-xs uppercase tracking-widest flex items-center gap-2">
      <span>{delve.dungeonName}</span>
      <span>·</span>
      <span>
        Room {delve.currentRoomIdx + 1} / {delve.rooms.length}
      </span>
      <div className="flex gap-1 ml-2">
        {delve.rooms.map((_, idx) => (
          <span
            key={idx}
            className={`
              w-2 h-2 border
              ${idx < delve.currentRoomIdx
                ? 'bg-[var(--color-accent-gold)] border-[var(--color-accent-gold)]'
                : idx === delve.currentRoomIdx
                  ? 'bg-[var(--color-accent-amber)] border-[var(--color-accent-amber)] animate-pulse'
                  : 'bg-transparent border-[var(--color-border-dim)]'}
            `}
          />
        ))}
      </div>
    </div>
  );
}
