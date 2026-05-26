import type { DelveState } from '../../types/delve';

interface RoomHeaderProps {
  delve: DelveState;
}

/**
 * A minimal breadcrumb showing only the dungeon's name. The total room count
 * is intentionally hidden — the player should not know how deep the delve
 * goes. The room's flavor title (shown in the combat header) is their only
 * spatial cue.
 */
export function RoomHeader({ delve }: RoomHeaderProps) {
  return (
    <div className="text-[var(--color-text-dim)] text-xs uppercase tracking-widest">
      {delve.dungeonName}
    </div>
  );
}
