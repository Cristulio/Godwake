import type { ReactNode } from 'react';
import type { EventType } from '../../schemas/event';

/**
 * Reusable inline-SVG header keyed to an event's TYPE (not bespoke per-event
 * art). Blocky 8-bit iconography in the warm amber/gold + ember palette, sized
 * as a tasteful header band above the event title.
 */

const AMBER = 'var(--color-accent-amber)';
const GOLD = 'var(--color-accent-gold)';
const ARCANE = 'var(--color-accent-arcane)';
const BLOOD = 'var(--color-accent-blood)';
const TORCH = '#FFB347';
const EMBER = '#FF6B2B';
const HOLY = '#FFD700';
const STONE = '#6B4A2E';
const STONE_DARK = '#3A2E22';
const VOID = '#0a0805';

const MOTIFS: Record<EventType, ReactNode> = {
  shrine: (
    <>
      <ellipse cx="32" cy="14" rx="11" ry="12" fill={TORCH} opacity="0.08" />
      <rect x="18" y="30" width="28" height="6" fill={STONE} />
      <rect x="22" y="26" width="20" height="4" fill={STONE_DARK} />
      <rect x="26" y="22" width="12" height="4" fill={STONE} />
      <ellipse cx="32" cy="14" rx="5" ry="9" fill={EMBER} opacity="0.95" />
      <ellipse cx="32" cy="12" rx="3" ry="6" fill={TORCH} />
      <ellipse cx="32" cy="10" rx="1.6" ry="3.5" fill={HOLY} />
    </>
  ),
  omen: (
    <>
      <g fill={AMBER} opacity="0.7">
        <rect x="31" y="2" width="2" height="4" />
        <rect x="31" y="34" width="2" height="4" />
        <rect x="6" y="19" width="4" height="2" />
        <rect x="54" y="19" width="4" height="2" />
      </g>
      <path d="M14 20 L32 10 L50 20 L32 30 Z" fill={STONE_DARK} stroke={AMBER} strokeWidth="2" />
      <circle cx="32" cy="20" r="6" fill={ARCANE} />
      <circle cx="32" cy="20" r="3" fill={VOID} />
      <circle cx="33.5" cy="18.5" r="1" fill={TORCH} />
    </>
  ),
  treasure: (
    <>
      <g fill={GOLD}>
        <rect x="15" y="34" width="7" height="2" />
        <circle cx="19" cy="33" r="2" />
        <circle cx="46" cy="33" r="2" />
      </g>
      <rect x="18" y="20" width="28" height="14" fill={STONE} stroke={STONE_DARK} strokeWidth="2" />
      <rect x="16" y="13" width="32" height="8" fill={STONE_DARK} />
      <rect x="16" y="13" width="32" height="3" fill={STONE} />
      <rect x="24" y="13" width="2" height="21" fill={GOLD} />
      <rect x="38" y="13" width="2" height="21" fill={GOLD} />
      <rect x="30" y="22" width="4" height="5" fill={HOLY} />
    </>
  ),
  beast: (
    <>
      <polygon points="16,4 21,5 34,34 28,34" fill={BLOOD} />
      <polygon points="29,3 34,4 44,34 38,34" fill={EMBER} />
      <polygon points="42,5 47,6 56,33 50,33" fill={BLOOD} />
      <polygon points="29,3 34,4 44,34 38,34" fill={HOLY} opacity="0.15" />
    </>
  ),
  stranger: (
    <>
      <polygon points="32,10 48,36 16,36" fill={STONE_DARK} />
      <path d="M20 26 Q20 8 32 8 Q44 8 44 26 Z" fill={STONE} />
      <path d="M25 26 Q25 14 32 14 Q39 14 39 26 Z" fill={VOID} />
      <circle cx="29" cy="22" r="1.4" fill={AMBER} />
      <circle cx="35" cy="22" r="1.4" fill={AMBER} />
    </>
  ),
  bargain: (
    <>
      <rect x="24" y="32" width="16" height="3" fill={STONE} />
      <rect x="31" y="10" width="2" height="22" fill={GOLD} />
      <rect x="14" y="12" width="36" height="2" fill={GOLD} />
      <circle cx="32" cy="10" r="2" fill={HOLY} />
      <line x1="16" y1="14" x2="16" y2="20" stroke={GOLD} strokeWidth="1" />
      <polygon points="10,20 22,20 19,25 13,25" fill={AMBER} />
      <line x1="48" y1="14" x2="48" y2="20" stroke={GOLD} strokeWidth="1" />
      <polygon points="42,20 54,20 51,25 45,25" fill={AMBER} />
    </>
  ),
  lore: (
    <>
      <rect x="31" y="14" width="2" height="20" fill={STONE_DARK} />
      <polygon points="31,14 12,18 12,34 31,32" fill={GOLD} />
      <polygon points="33,14 52,18 52,34 33,32" fill={GOLD} />
      <polygon points="31,14 12,18 12,34 31,32" fill={STONE_DARK} opacity="0.15" />
      <g stroke={STONE_DARK} strokeWidth="1" opacity="0.6">
        <line x1="16" y1="22" x2="28" y2="21" />
        <line x1="16" y1="26" x2="28" y2="25" />
        <line x1="36" y1="21" x2="48" y2="22" />
        <line x1="36" y1="25" x2="48" y2="26" />
      </g>
      <rect x="31" y="4" width="2" height="6" fill={TORCH} opacity="0.7" />
      <rect x="28" y="7" width="8" height="2" fill={TORCH} opacity="0.4" />
    </>
  ),
  ruin: (
    <>
      <rect x="22" y="10" width="20" height="16" rx="3" fill={GOLD} />
      <rect x="26" y="26" width="12" height="6" fill={GOLD} />
      <rect x="26" y="15" width="5" height="5" fill={VOID} />
      <rect x="33" y="15" width="5" height="5" fill={VOID} />
      <polygon points="32,21 30,25 34,25" fill={VOID} />
      <g fill={STONE_DARK}>
        <rect x="29" y="26" width="1.5" height="6" />
        <rect x="33.5" y="26" width="1.5" height="6" />
      </g>
    </>
  ),
};

interface EventMotifProps {
  type: EventType;
  className?: string;
}

export function EventMotif({ type, className = '' }: EventMotifProps) {
  return (
    <div
      className={`relative flex h-20 items-center justify-center overflow-hidden border-2 border-[var(--color-border-warm)] bg-gradient-to-b from-[#241c14] to-[#1a1410] ${className}`}
      aria-hidden
    >
      <div className="absolute inset-0 [background-image:radial-gradient(ellipse_at_50%_75%,rgba(244,167,66,0.16),transparent_60%)]" />
      <svg
        viewBox="0 0 64 40"
        width="112"
        height="70"
        shapeRendering="crispEdges"
        className="relative"
      >
        {MOTIFS[type]}
      </svg>
    </div>
  );
}
