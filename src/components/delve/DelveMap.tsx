import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { Character } from '../../types/character';
import type { DelveState, RoomKind, RoomSpec } from '../../types/delve';
import { chapterLabel, chapterMapNodes, getTwist } from '../../engine/delve';
import { useGameStore } from '../../stores/gameStore';
import { playSfx } from '../../engine/audio';
import { Button } from '../ui/Button';
import { EliteCoach, useEliteIntroCoach } from './EliteCoach';
import { useT } from '../../i18n/useT';

const COL_W = 150;
const ROW_H = 92;
const PAD_X = 44;
const PAD_Y = 44;
const NODE = 60;

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
  const { t, tc } = useT();
  const chooseRoom = useGameStore((s) => s.chooseRoom);
  const goToInventory = useGameStore((s) => s.goToInventory);
  const abandonDelve = useGameStore((s) => s.abandonDelve);
  const [hovered, setHovered] = useState<RoomSpec | null>(null);
  const [confirmAbandon, setConfirmAbandon] = useState(false);

  const frameRef = useRef<HTMLDivElement>(null);
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
    const lines: Array<{ x1: number; y1: number; x2: number; y2: number; lit: boolean; open: boolean; locked: boolean }> = [];
    for (const p of placed) {
      for (const nid of p.room.next ?? []) {
        const t = byId.get(nid);
        if (!t) continue; // cross-chapter edge (boss→camp) — not drawn
        const locked = !!t.room.locked;
        const open = !locked && p.room.id === current?.id && reachable.has(nid);
        const lit = visited.has(p.room.id) && visited.has(nid);
        lines.push({ x1: p.cx, y1: p.cy, x2: t.cx, y2: t.cy, lit, open, locked });
      }
    }
    return lines;
  }, [placed, byId, visited, reachable, current]);

  // First-elite coach: fires once when a brand-new soul first has a SELECTABLE
  // (reachable + unlocked) elite on the route. Each between-rooms step re-mounts
  // DelveMap, so the hook activates on the first such map and the seen-flag it
  // writes on activation keeps every later map ineligible (#417 lesson).
  const hasSelectableElite = useMemo(
    () => placed.some(({ room }) => room.kind === 'elite' && reachable.has(room.id) && !room.locked),
    [placed, reachable],
  );
  const { active: eliteCoachActive, dismiss: dismissEliteCoach } =
    useEliteIntroCoach(hasSelectableElite);

  // Follow the run: scroll the current node toward the centre of the viewport
  // each step, so a deep route shows where you are instead of staying pinned left.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || !current) return;
    const node = byId.get(current.id);
    if (!node) return;
    const max = frame.scrollWidth - frame.clientWidth;
    if (max <= 0) return;
    const left = Math.max(0, Math.min(node.cx - frame.clientWidth / 2, max));
    try {
      frame.scrollTo({ left, behavior: 'smooth' });
    } catch {
      frame.scrollLeft = left;
    }
  }, [current?.id, byId, width]);

  const detail = hovered;
  const detailTwist = detail ? getTwist(detail.twistId) : undefined;

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-5xl mx-auto flex flex-col gap-4 animate-fade-in">
      <header className="pb-3 border-b border-[var(--color-border-warm)] flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-xl text-[var(--color-accent-amber)] tracking-wider uppercase">
            {t('ui.map.chooseRoad')}
          </h1>
          <p className="text-[var(--color-text-secondary)] text-xs uppercase tracking-widest">
            {delve.dungeonName} · {chapterLabel(delve, chapter)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div
            className="panel-etched-warm border border-[var(--color-accent-gold)] px-3 py-1.5 text-right"
            title={t('ui.map.hpTitle')}
          >
            <div className="font-display text-[9px] text-[var(--color-text-dim)] uppercase tracking-widest">
              ◇ {t('ui.map.hp')}
            </div>
            <div className="font-mono text-sm text-[var(--color-text-primary)] leading-none">
              {character.hp.current}/{character.hp.max}
            </div>
          </div>
          <div
            className="panel-etched-warm border border-[var(--color-accent-gold)] px-3 py-1.5 text-right"
            title={t('ui.map.goldTitle')}
          >
            <div className="font-display text-[9px] text-[var(--color-text-dim)] uppercase tracking-widest">
              ◈ {t('ui.map.gold')}
            </div>
            <div className="font-mono text-sm text-[var(--color-accent-gold)] leading-none">
              {character.goldInPocket}
            </div>
          </div>
          <Button variant="ghost" onClick={goToInventory}>
            ◆ {t('ui.map.pack')}
          </Button>
          <Button variant="ghost" onClick={() => setConfirmAbandon(true)}>
            ⚑ {t('ui.map.abandon')}
          </Button>
        </div>
      </header>

      <div ref={frameRef} className="bm-map-frame overflow-x-auto">
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
                strokeDasharray={e.locked ? '1 7' : e.open || e.lit ? undefined : '3 5'}
                strokeLinecap={e.locked ? 'round' : undefined}
                opacity={e.open ? 0.95 : e.lit ? 0.7 : e.locked ? 0.18 : 0.35}
              />
            ))}
          </svg>

          {placed.map(({ room, cx, cy }) => {
            const isCurrent = room.id === current?.id;
            const isLocked = !!room.locked;
            const isReachable = reachable.has(room.id) && !isLocked;
            const isVisited = visited.has(room.id);
            const tag =
              room.kind === 'event' &&
              (room.next ?? []).some(
                (id) => delve.rooms.find((r) => r.id === id)?.kind === 'boss',
              )
                ? t('ui.map.tag.intel')
                : t(`ui.map.tag.${room.kind}`);
            const accent = kindColor(room.kind);
            const stateClass = isLocked
              ? 'bm-node-blocked'
              : isReachable
                ? 'bm-node-reachable'
                : isCurrent
                  ? 'bm-node-current'
                  : isVisited
                    ? 'bm-node-visited'
                    : 'bm-node-locked';
            return (
              <div key={room.id} className="bm-node-anchor" style={{ left: cx, top: cy }}>
                <button
                  type="button"
                  disabled={!isReachable}
                  data-tutorial={room.kind === 'elite' && isReachable ? 'elite' : undefined}
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
                      minWidth: NODE,
                      height: NODE,
                      '--bm-accent': accent,
                    } as CSSProperties
                  }
                  title={room.title}
                >
                  <span className="bm-node-tag">{tag}</span>
                  {isLocked && (
                    <>
                      <span className="bm-node-seal" aria-label={t('ui.map.sealedAria')}>
                        ⚿ {t('ui.map.sealed')}
                      </span>
                      <span className="bm-node-seal-hint">{t('ui.map.sealedYet')}</span>
                    </>
                  )}
                  {room.twistId && (
                    <span
                      className="absolute -top-1 -right-1 text-[var(--color-accent-blood)] text-xs leading-none"
                      aria-label="twisted"
                    >
                      ✦
                    </span>
                  )}
                </button>
              </div>
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
              {t(`ui.map.blurb.${detail.kind}`)}
            </div>
            {detail.locked && (
              <div className="text-[var(--color-text-dim)] text-xs italic mt-1 leading-relaxed">
                {t('ui.map.sealedHint')}
              </div>
            )}
            {detailTwist && (
              <div className="text-[var(--color-accent-blood)] text-xs italic mt-1 leading-relaxed">
                ✦ {tc('twists', detailTwist.id, 'telegraph', detailTwist.telegraph)}
              </div>
            )}
          </>
        ) : (
          <div className="text-[var(--color-text-dim)] text-xs uppercase tracking-widest italic">
            {t('ui.map.hoverHint')}
          </div>
        )}
      </div>

      {eliteCoachActive && <EliteCoach onDismiss={dismissEliteCoach} />}

      {confirmAbandon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-bg-base)]/80">
          <div className="bg-[var(--color-bg-panel)] border-2 border-[var(--color-border-warm)] p-6 max-w-sm">
            <div className="text-[var(--color-accent-amber)] text-sm uppercase tracking-widest mb-2">
              {t('ui.map.abandonTitle')}
            </div>
            <p className="text-[var(--color-text-secondary)] text-sm mb-4">
              {t('ui.map.abandonBody')}
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setConfirmAbandon(false)}>
                {t('ui.map.abandonStay')}
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setConfirmAbandon(false);
                  abandonDelve();
                }}
              >
                {t('ui.map.abandonConfirm')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
