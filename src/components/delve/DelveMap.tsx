import { useMemo, useState, type CSSProperties } from 'react';
import type { Character } from '../../types/character';
import type { DelveState, RoomKind, RoomSpec } from '../../types/delve';
import { chapterMapNodes } from '../../engine/delve';
import { useGameStore } from '../../stores/gameStore';
import { playSfx } from '../../engine/audio';
import { Button } from '../ui/Button';

const COL_W = 118;
const ROW_H = 92;
const PAD_X = 44;
const PAD_Y = 44;
const NODE = 60;

/** Short uppercase tag shown inside each node. */
const KIND_TAG: Record<RoomKind, string> = {
  combat: 'FIGHT',
  elite: 'ELITE',
  boss: 'BOSS',
  rest: 'REST',
  shrine: 'SHRINE',
  event: 'OMEN',
  shop: 'SHOP',
  treasure: 'SPOILS',
  camp: 'CAMP',
};

/** One-line descriptor surfaced when a node is focused/hovered. */
const KIND_BLURB: Record<RoomKind, string> = {
  combat: 'A fight on the road. XP and what the dead were carrying.',
  elite: 'A dangerous foe — harder than the road around it, and richer for it.',
  boss: 'The one who holds this chapter. There is no way past but through.',
  rest: 'A safe pause. Bind your wounds before the dark deepens.',
  shrine: 'A god still listens here. A blessing for the asking.',
  event: 'Something waits that is not a fight. Or not only a fight.',
  shop: 'Coin changes hands. Stock yourself before the road runs out.',
  treasure: 'Spoils left unguarded. Take what you can carry.',
  camp: 'A fire on the seam between chapters.',
};

/** Node accent colour (CSS var) by kind. */
function kindColor(kind: RoomKind): string {
  switch (kind) {
    case 'boss':
      return 'var(--color-accent-blood)';
    case 'elite':
      return 'var(--color-accent-deep-blood)';
    case 'shrine':
      return 'var(--color-accent-arcane)';
    case 'shop':
      return 'var(--color-accent-gold)';
    case 'rest':
      return 'var(--color-accent-teal-shadow)';
    case 'event':
      return 'var(--color-accent-amber)';
    default:
      return 'var(--color-border-warm)';
  }
}

interface Placed {
  room: RoomSpec;
  cx: number;
  cy: number;
}

/**
 * The branching route map: the current chapter's nodes laid out left-to-right
 * by layer, the road already walked lit, the reachable next nodes glowing and
 * clickable, the rest dark. Picking a reachable node steps the run into it.
 */
export function DelveMap({ delve, character }: { delve: DelveState; character: Character }) {
  const chooseRoom = useGameStore((s) => s.chooseRoom);
  const goToInventory = useGameStore((s) => s.goToInventory);
  const [hovered, setHovered] = useState<RoomSpec | null>(null);

  const current = delve.rooms[delve.currentRoomIdx];
  const chapter = current?.chapter ?? 1;
  const visited = useMemo(() => new Set(delve.visitedRoomIds ?? []), [delve.visitedRoomIds]);
  const reachable = useMemo(() => new Set(current?.next ?? []), [current]);

  const { placed, width, height, byId } = useMemo(() => {
    const nodes = chapterMapNodes(delve, chapter);
    const byLayer = new Map<number, RoomSpec[]>();
    for (const n of nodes) {
      const l = n.layer ?? 0;
      if (!byLayer.has(l)) byLayer.set(l, []);
      byLayer.get(l)!.push(n);
    }
    const maxLayer = Math.max(0, ...nodes.map((n) => n.layer ?? 0));
    const maxRows = Math.max(1, ...[...byLayer.values()].map((r) => r.length));
    const w = PAD_X * 2 + maxLayer * COL_W + NODE;
    const h = PAD_Y * 2 + (maxRows - 1) * ROW_H + NODE;
    const cy0 = h / 2;
    const out: Placed[] = [];
    const idMap = new Map<string, Placed>();
    for (const [layer, row] of byLayer) {
      row.forEach((room, k) => {
        const cx = PAD_X + layer * COL_W + NODE / 2;
        const cy = cy0 + (k - (row.length - 1) / 2) * ROW_H;
        const p = { room, cx, cy };
        out.push(p);
        idMap.set(room.id, p);
      });
    }
    return { placed: out, width: w, height: h, byId: idMap };
  }, [delve, chapter]);

  const edges = useMemo(() => {
    const lines: Array<{ x1: number; y1: number; x2: number; y2: number; lit: boolean; open: boolean }> = [];
    for (const p of placed) {
      for (const nid of p.room.next ?? []) {
        const t = byId.get(nid);
        if (!t) continue; // cross-chapter edge (boss→camp) — not drawn
        const open = p.room.id === current?.id && reachable.has(nid);
        const lit = visited.has(p.room.id) && visited.has(nid);
        lines.push({ x1: p.cx, y1: p.cy, x2: t.cx, y2: t.cy, lit, open });
      }
    }
    return lines;
  }, [placed, byId, visited, reachable, current]);

  const detail = hovered;
  const chapterName = delve.rooms.find((r) => r.chapter === chapter && r.kind === 'boss')?.title;

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto flex flex-col gap-4 animate-fade-in">
      <header className="pb-3 border-b border-[var(--color-border-warm)] flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-xl text-[var(--color-accent-amber)] tracking-wider uppercase">
            Choose Your Road
          </h1>
          <p className="text-[var(--color-text-secondary)] text-xs uppercase tracking-widest">
            {delve.dungeonName} · Chapter {chapter}
            {chapterName ? ` — toward ${chapterName}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div
            className="panel-etched-warm border border-[var(--color-accent-gold)] px-3 py-1.5 text-right"
            title="Health"
          >
            <div className="font-display text-[9px] text-[var(--color-text-dim)] uppercase tracking-widest">
              ◇ HP
            </div>
            <div className="font-mono text-sm text-[var(--color-text-primary)] leading-none">
              {character.hp.current}/{character.hp.max}
            </div>
          </div>
          <div
            className="panel-etched-warm border border-[var(--color-accent-gold)] px-3 py-1.5 text-right"
            title="Gold in pocket"
          >
            <div className="font-display text-[9px] text-[var(--color-text-dim)] uppercase tracking-widest">
              ◈ Gold
            </div>
            <div className="font-mono text-sm text-[var(--color-accent-gold)] leading-none">
              {character.goldInPocket}
            </div>
          </div>
          <Button variant="ghost" onClick={goToInventory}>
            ◆ Pack
          </Button>
        </div>
      </header>

      <div className="bm-map-frame overflow-x-auto">
        <div className="relative mx-auto" style={{ width, height }}>
          <svg
            className="absolute inset-0 pointer-events-none"
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
          >
            {edges.map((e, i) => (
              <line
                key={i}
                x1={e.x1}
                y1={e.y1}
                x2={e.x2}
                y2={e.y2}
                stroke={
                  e.open
                    ? 'var(--color-accent-amber)'
                    : e.lit
                      ? 'var(--color-accent-gold)'
                      : 'var(--color-border-dim)'
                }
                strokeWidth={e.open ? 3 : e.lit ? 2.5 : 1.5}
                strokeDasharray={e.open || e.lit ? undefined : '3 5'}
                opacity={e.open ? 0.95 : e.lit ? 0.7 : 0.35}
              />
            ))}
          </svg>

          {placed.map(({ room, cx, cy }) => {
            const isCurrent = room.id === current?.id;
            const isReachable = reachable.has(room.id);
            const isVisited = visited.has(room.id);
            const tag =
              room.kind === 'event' &&
              (room.next ?? []).some(
                (id) => delve.rooms.find((r) => r.id === id)?.kind === 'boss',
              )
                ? 'INTEL'
                : KIND_TAG[room.kind];
            const accent = kindColor(room.kind);
            const stateClass = isReachable
              ? 'bm-node-reachable'
              : isCurrent
                ? 'bm-node-current'
                : isVisited
                  ? 'bm-node-visited'
                  : 'bm-node-locked';
            return (
              <button
                key={room.id}
                type="button"
                disabled={!isReachable}
                onMouseEnter={() => setHovered(room)}
                onMouseLeave={() => setHovered((h) => (h === room ? null : h))}
                onFocus={() => setHovered(room)}
                onClick={() => {
                  playSfx('ui_click');
                  chooseRoom(room.id);
                }}
                className={`bm-node ${stateClass}`}
                style={
                  {
                    left: cx - NODE / 2,
                    top: cy - NODE / 2,
                    width: NODE,
                    height: NODE,
                    '--bm-accent': accent,
                  } as CSSProperties
                }
                title={room.title}
              >
                <span className="bm-node-tag">{tag}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-[3.5rem] panel-etched-warm border border-[var(--color-border-warm)] p-3 text-center">
        {detail ? (
          <>
            <div className="text-[var(--color-accent-amber)] text-xs uppercase tracking-widest">
              {detail.title}
            </div>
            <div className="text-[var(--color-text-secondary)] text-xs italic mt-1 leading-relaxed">
              {KIND_BLURB[detail.kind]}
            </div>
          </>
        ) : (
          <div className="text-[var(--color-text-dim)] text-xs uppercase tracking-widest italic">
            The lit paths are open to you. Hover a road, then step.
          </div>
        )}
      </div>
    </div>
  );
}
