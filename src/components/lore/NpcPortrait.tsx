/**
 * Pixel-art NPC portraits for soul-bond voice bubbles, shrine pickers, and
 * future event-room scenes. Same 24×40 viewBox and crispEdges style as the
 * combat PlayerPortrait so they feel like the same world.
 *
 * Each portrait is a named export so callers can `import { Imoen } from ...`
 * and drop it in like a sprite.
 */

import type React from 'react';

type PortraitProps = {
  className?: string;
  ariaLabel?: string;
};

const baseProps = {
  viewBox: '0 0 24 40',
  shapeRendering: 'crispEdges' as const,
  preserveAspectRatio: 'xMidYMax meet',
};

function SvgFrame({
  className = '',
  ariaLabel,
  children,
}: PortraitProps & { children: React.ReactNode }) {
  return (
    <svg {...baseProps} className={className} aria-label={ariaLabel}>
      {children}
    </svg>
  );
}

/* ─────────────── Imoen ─────────────── */
/* Auburn hair, bright eyes, leather jerkin, dagger at the belt. */
export function Imoen({ className, ariaLabel = 'Imoen' }: PortraitProps) {
  return (
    <SvgFrame className={className} ariaLabel={ariaLabel}>
      {/* Hair back layer */}
      <rect x="6" y="3" width="12" height="12" fill="#a04020" />
      <rect x="5" y="6" width="14" height="9" fill="#a04020" />
      <rect x="5" y="14" width="2" height="6" fill="#a04020" />
      <rect x="17" y="14" width="2" height="6" fill="#a04020" />
      {/* Hair highlight */}
      <rect x="7" y="4" width="8" height="2" fill="#c8542a" />
      <rect x="6" y="6" width="3" height="3" fill="#c8542a" />
      {/* Face */}
      <rect x="8" y="7" width="8" height="9" fill="#f4d4a8" />
      <rect x="8" y="13" width="8" height="3" fill="#e8c098" />
      {/* Fringe */}
      <rect x="8" y="6" width="8" height="2" fill="#a04020" />
      <rect x="10" y="6" width="4" height="1" fill="#c8542a" />
      {/* Eyes — bright */}
      <rect x="9" y="10" width="2" height="2" fill="#1a1410" />
      <rect x="10" y="10" width="1" height="1" fill="#a8d4ff" />
      <rect x="13" y="10" width="2" height="2" fill="#1a1410" />
      <rect x="14" y="10" width="1" height="1" fill="#a8d4ff" />
      {/* Cheek dot — Imoen has a softness to her */}
      <rect x="9" y="13" width="1" height="1" fill="#e08a78" opacity="0.7" />
      <rect x="14" y="13" width="1" height="1" fill="#e08a78" opacity="0.7" />
      {/* Mouth — small smile */}
      <rect x="11" y="14" width="2" height="1" fill="#a04030" />
      <rect x="10" y="14" width="1" height="1" fill="#a04030" />
      <rect x="13" y="14" width="1" height="1" fill="#a04030" />
      {/* Neck */}
      <rect x="10" y="16" width="4" height="2" fill="#e8c098" />
      {/* Collar — leather jerkin */}
      <rect x="6" y="18" width="12" height="2" fill="#3a2418" />
      <rect x="5" y="18" width="14" height="1" fill="#5a3624" />
      {/* Jerkin body */}
      <rect x="6" y="20" width="12" height="13" fill="#6b3a22" />
      <rect x="6" y="20" width="1" height="13" fill="#3a2010" />
      <rect x="17" y="20" width="1" height="13" fill="#3a2010" />
      {/* Lacing */}
      <rect x="11" y="22" width="2" height="1" fill="#d4b062" />
      <rect x="11" y="25" width="2" height="1" fill="#d4b062" />
      <rect x="11" y="28" width="2" height="1" fill="#d4b062" />
      <line x1="11.5" y1="22" x2="11.5" y2="29" stroke="#3a2010" strokeWidth="0.3" />
      {/* Belt */}
      <rect x="6" y="32" width="12" height="2" fill="#1a1008" />
      <rect x="11" y="32" width="2" height="2" fill="#d4b062" />
      {/* Dagger at the belt — hilt on right hip */}
      <rect x="16" y="29" width="1" height="4" fill="#c8c4d6" />
      <rect x="15" y="33" width="3" height="1" fill="#5a3624" />
      <rect x="16" y="34" width="1" height="3" fill="#1a1410" />
      {/* Skirt / lower */}
      <rect x="7" y="34" width="10" height="5" fill="#3a2418" />
      <rect x="7" y="38" width="10" height="2" fill="#1a1008" />
    </SvgFrame>
  );
}

/* ─────────────── Irenicus ─────────────── */
/* Gaunt, dark robes, hollow violet eyes, severe brow. */
export function Irenicus({ className, ariaLabel = 'Irenicus' }: PortraitProps) {
  return (
    <SvgFrame className={className} ariaLabel={ariaLabel}>
      {/* Robe shoulders */}
      <rect x="2" y="18" width="20" height="22" fill="#1a0a14" />
      <rect x="3" y="17" width="18" height="2" fill="#2a0a1c" />
      {/* High collar */}
      <rect x="8" y="16" width="8" height="4" fill="#0a0408" />
      <polygon points="6,20 8,16 8,22" fill="#2a0a1c" />
      <polygon points="18,20 16,16 16,22" fill="#2a0a1c" />
      {/* Long thin hair / cowl frame */}
      <rect x="6" y="3" width="12" height="3" fill="#0a0408" />
      <rect x="5" y="5" width="14" height="4" fill="#0a0408" />
      {/* Face — pale, gaunt */}
      <rect x="8" y="6" width="8" height="11" fill="#d6c4b0" />
      {/* Shadow under cheekbones */}
      <rect x="8" y="13" width="8" height="2" fill="#a89880" />
      <rect x="8" y="15" width="8" height="1" fill="#7a6856" />
      <rect x="8" y="11" width="1" height="2" fill="#a89880" />
      <rect x="15" y="11" width="1" height="2" fill="#a89880" />
      {/* Forehead lines / brow */}
      <rect x="9" y="8" width="2" height="1" fill="#5a4030" />
      <rect x="13" y="8" width="2" height="1" fill="#5a4030" />
      {/* Hollow violet eyes */}
      <rect x="9" y="9" width="2" height="2" fill="#1a0a1a" />
      <rect x="10" y="9" width="1" height="1" fill="#6a4090" />
      <rect x="13" y="9" width="2" height="2" fill="#1a0a1a" />
      <rect x="14" y="9" width="1" height="1" fill="#6a4090" />
      {/* Nose shadow */}
      <rect x="11" y="11" width="2" height="2" fill="#a89880" />
      {/* Thin, severe mouth */}
      <rect x="10" y="14" width="4" height="1" fill="#3a1820" />
      {/* Scarred chin — hint of the burns */}
      <rect x="11" y="16" width="2" height="1" fill="#5a3a30" />
      {/* Robe chest — sigil pendant */}
      <rect x="11" y="22" width="2" height="2" fill="#3a1230" />
      <rect x="10" y="23" width="4" height="1" fill="#3a1230" />
      <rect x="11" y="22" width="2" height="3" fill="#7a3060" opacity="0.6" />
      <line x1="12" y1="20" x2="12" y2="22" stroke="#3a2030" strokeWidth="0.5" />
      {/* Robe folds */}
      <rect x="5" y="24" width="1" height="14" fill="#2a1020" />
      <rect x="18" y="24" width="1" height="14" fill="#2a1020" />
      <rect x="11" y="26" width="2" height="12" fill="#0a0408" />
    </SvgFrame>
  );
}

/* ─────────────── Linene Graywind ─────────────── */
/* Lionshield merchant — middle-aged human woman, hard expression, leather apron. */
export function LineneGraywind({ className, ariaLabel = 'Linene Graywind' }: PortraitProps) {
  return (
    <SvgFrame className={className} ariaLabel={ariaLabel}>
      {/* Hair — pinned back, brown with grey */}
      <rect x="6" y="4" width="12" height="10" fill="#3a2418" />
      <rect x="7" y="3" width="10" height="3" fill="#3a2418" />
      <rect x="7" y="5" width="2" height="3" fill="#7a6856" />
      <rect x="15" y="6" width="2" height="2" fill="#7a6856" />
      {/* Face */}
      <rect x="8" y="7" width="8" height="9" fill="#e8c8a0" />
      <rect x="8" y="14" width="8" height="2" fill="#c8a878" />
      {/* Lines around the eyes — hard years */}
      <rect x="8" y="10" width="2" height="1" fill="#a88056" />
      <rect x="14" y="10" width="2" height="1" fill="#a88056" />
      <rect x="8" y="12" width="1" height="1" fill="#a88056" />
      <rect x="15" y="12" width="1" height="1" fill="#a88056" />
      {/* Brow line */}
      <rect x="9" y="8" width="2" height="1" fill="#3a2418" />
      <rect x="13" y="8" width="2" height="1" fill="#3a2418" />
      {/* Eyes — narrow, sharp */}
      <rect x="9" y="10" width="2" height="1" fill="#1a1410" />
      <rect x="13" y="10" width="2" height="1" fill="#1a1410" />
      {/* Mouth — set, no smile */}
      <rect x="10" y="14" width="4" height="1" fill="#7a3a30" />
      {/* Neck */}
      <rect x="10" y="16" width="4" height="2" fill="#c8a878" />
      {/* Linen shirt */}
      <rect x="5" y="18" width="14" height="3" fill="#a89070" />
      <rect x="5" y="18" width="14" height="1" fill="#c8b090" />
      {/* Leather apron */}
      <rect x="6" y="21" width="12" height="18" fill="#5a3a22" />
      <rect x="6" y="21" width="1" height="18" fill="#3a2418" />
      <rect x="17" y="21" width="1" height="18" fill="#3a2418" />
      {/* Apron straps over shoulders */}
      <rect x="6" y="18" width="2" height="3" fill="#3a2418" />
      <rect x="16" y="18" width="2" height="3" fill="#3a2418" />
      {/* Apron pocket */}
      <rect x="8" y="28" width="8" height="6" fill="#3a2418" />
      <rect x="8" y="28" width="8" height="1" fill="#5a3a22" />
      {/* Lionshield badge — small shield on chest */}
      <rect x="10" y="24" width="4" height="3" fill="#d4b062" />
      <rect x="11" y="24" width="2" height="3" fill="#a07a30" />
      <polygon points="10,27 12,29 14,27" fill="#d4b062" />
      {/* Belt with pouch */}
      <rect x="6" y="34" width="12" height="2" fill="#1a1008" />
      <rect x="11" y="34" width="2" height="2" fill="#d4b062" />
      <rect x="15" y="34" width="3" height="4" fill="#3a2418" />
      <rect x="15" y="35" width="3" height="1" fill="#1a1008" />
    </SvgFrame>
  );
}

/* ─────────────── Ilmater shrine priest ─────────────── */
/* Bandaged hands raised in supplication, red-knot pendant on a rope. */
export function IlmaterPriest({ className, ariaLabel = 'Priest of Ilmater' }: PortraitProps) {
  return (
    <SvgFrame className={className} ariaLabel={ariaLabel}>
      {/* Hood */}
      <rect x="5" y="2" width="14" height="5" fill="#3a2820" />
      <rect x="4" y="4" width="2" height="10" fill="#3a2820" />
      <rect x="18" y="4" width="2" height="10" fill="#3a2820" />
      <rect x="5" y="2" width="14" height="1" fill="#5a3a30" />
      {/* Hood inner shadow */}
      <rect x="6" y="5" width="12" height="3" fill="#1a1008" />
      {/* Face — weary, lined */}
      <rect x="8" y="6" width="8" height="10" fill="#d8b890" />
      <rect x="8" y="13" width="8" height="3" fill="#b89870" />
      {/* Sunken cheeks */}
      <rect x="8" y="11" width="1" height="2" fill="#9a7858" />
      <rect x="15" y="11" width="1" height="2" fill="#9a7858" />
      {/* Eyes — closed in prayer */}
      <rect x="9" y="10" width="2" height="1" fill="#3a2418" />
      <rect x="13" y="10" width="2" height="1" fill="#3a2418" />
      {/* Mouth — set in pain */}
      <rect x="10" y="14" width="4" height="1" fill="#7a3a30" />
      {/* Neck */}
      <rect x="10" y="16" width="4" height="2" fill="#b89870" />
      {/* Red-knot pendant on rope */}
      <line x1="9" y1="17" x2="11" y2="20" stroke="#5a4030" strokeWidth="0.5" />
      <line x1="15" y1="17" x2="13" y2="20" stroke="#5a4030" strokeWidth="0.5" />
      <rect x="11" y="20" width="2" height="2" fill="#a8181c" />
      <rect x="10" y="20" width="1" height="1" fill="#7a1010" />
      <rect x="13" y="20" width="1" height="1" fill="#7a1010" />
      <rect x="11" y="22" width="2" height="1" fill="#7a1010" />
      {/* Robe body — humble brown */}
      <rect x="5" y="18" width="14" height="22" fill="#5a3a22" />
      <rect x="5" y="18" width="1" height="22" fill="#3a2418" />
      <rect x="18" y="18" width="1" height="22" fill="#3a2418" />
      {/* Sash */}
      <rect x="5" y="30" width="14" height="2" fill="#7a1010" />
      <rect x="5" y="30" width="14" height="1" fill="#a8181c" />
      {/* Bandaged hands in front */}
      <rect x="8" y="24" width="3" height="5" fill="#e8d8c0" />
      <rect x="13" y="24" width="3" height="5" fill="#e8d8c0" />
      <line x1="8" y1="25" x2="11" y2="25" stroke="#7a6856" strokeWidth="0.4" />
      <line x1="8" y1="27" x2="11" y2="27" stroke="#7a6856" strokeWidth="0.4" />
      <line x1="13" y1="25" x2="16" y2="25" stroke="#7a6856" strokeWidth="0.4" />
      <line x1="13" y1="27" x2="16" y2="27" stroke="#7a6856" strokeWidth="0.4" />
      {/* Blood seep on bandages */}
      <rect x="9" y="26" width="1" height="1" fill="#7a1010" opacity="0.7" />
      <rect x="14" y="26" width="1" height="1" fill="#7a1010" opacity="0.7" />
    </SvgFrame>
  );
}

/* ─────────────── Lathander shrine priest ─────────────── */
/* Dawn-gold hair, sun emblem on the robes, warm cream-and-rose vestment. */
export function LathanderPriest({ className, ariaLabel = 'Priest of Lathander' }: PortraitProps) {
  return (
    <SvgFrame className={className} ariaLabel={ariaLabel}>
      {/* Hair — long, dawn-gold */}
      <rect x="5" y="3" width="14" height="13" fill="#e8b840" />
      <rect x="4" y="6" width="16" height="11" fill="#e8b840" />
      <rect x="6" y="2" width="12" height="2" fill="#f4d260" />
      <rect x="7" y="4" width="3" height="4" fill="#f4d260" />
      <rect x="14" y="4" width="3" height="4" fill="#f4d260" />
      {/* Face */}
      <rect x="8" y="7" width="8" height="9" fill="#f4d4a8" />
      <rect x="8" y="13" width="8" height="3" fill="#e8c098" />
      {/* Eyes — calm, looking up */}
      <rect x="9" y="10" width="2" height="2" fill="#1a1410" />
      <rect x="9" y="10" width="2" height="1" fill="#7a6856" />
      <rect x="10" y="11" width="1" height="1" fill="#3a8a3a" />
      <rect x="13" y="10" width="2" height="2" fill="#1a1410" />
      <rect x="13" y="10" width="2" height="1" fill="#7a6856" />
      <rect x="14" y="11" width="1" height="1" fill="#3a8a3a" />
      {/* Soft smile */}
      <rect x="10" y="14" width="4" height="1" fill="#a04030" />
      <rect x="9" y="14" width="1" height="1" fill="#a04030" />
      <rect x="14" y="14" width="1" height="1" fill="#a04030" />
      {/* Neck */}
      <rect x="10" y="16" width="4" height="2" fill="#e8c098" />
      {/* Vestment — cream */}
      <rect x="4" y="18" width="16" height="22" fill="#f0e0c0" />
      <rect x="4" y="18" width="16" height="2" fill="#e8c878" />
      {/* Rose mantle over shoulders */}
      <rect x="3" y="18" width="2" height="14" fill="#d8704a" />
      <rect x="19" y="18" width="2" height="14" fill="#d8704a" />
      <rect x="4" y="18" width="16" height="3" fill="#d8704a" />
      {/* Sun emblem at the chest */}
      <circle cx="12" cy="26" r="3" fill="#f4d042" />
      <circle cx="12" cy="26" r="1.5" fill="#e88a30" />
      {/* Sun rays */}
      <rect x="11" y="22" width="2" height="1" fill="#f4d042" />
      <rect x="11" y="30" width="2" height="1" fill="#f4d042" />
      <rect x="7" y="25" width="1" height="2" fill="#f4d042" />
      <rect x="16" y="25" width="1" height="2" fill="#f4d042" />
      <rect x="8" y="22" width="1" height="1" fill="#f4d042" />
      <rect x="15" y="22" width="1" height="1" fill="#f4d042" />
      <rect x="8" y="30" width="1" height="1" fill="#f4d042" />
      <rect x="15" y="30" width="1" height="1" fill="#f4d042" />
      {/* Belt — gold cord */}
      <rect x="4" y="33" width="16" height="2" fill="#d4a040" />
      <rect x="4" y="33" width="16" height="1" fill="#f4d042" />
    </SvgFrame>
  );
}

/* ─────────────── Helm shrine priest ─────────────── */
/* Armored, blank-faced great helm with a single vertical slit. Watcher's eye. */
export function HelmPriest({ className, ariaLabel = 'Priest of Helm' }: PortraitProps) {
  return (
    <SvgFrame className={className} ariaLabel={ariaLabel}>
      {/* Helm crown */}
      <rect x="6" y="2" width="12" height="2" fill="#5a6878" />
      <rect x="5" y="4" width="14" height="3" fill="#7a8898" />
      <rect x="5" y="4" width="14" height="1" fill="#9aa8b8" />
      {/* Helm body */}
      <rect x="5" y="7" width="14" height="10" fill="#5a6878" />
      <rect x="6" y="7" width="12" height="10" fill="#7a8898" />
      <rect x="6" y="7" width="1" height="10" fill="#9aa8b8" />
      {/* Cheek plates */}
      <rect x="5" y="13" width="2" height="4" fill="#3a4858" />
      <rect x="17" y="13" width="2" height="4" fill="#3a4858" />
      {/* Vertical slit — single watching eye */}
      <rect x="11" y="9" width="2" height="6" fill="#0a0612" />
      <rect x="11" y="11" width="2" height="2" fill="#a8d4ff" />
      <rect x="11" y="11" width="2" height="1" fill="#fff4c8" />
      {/* Cross-strut riveted across the slit */}
      <rect x="9" y="12" width="6" height="1" fill="#5a6878" />
      <rect x="9" y="12" width="1" height="1" fill="#9aa8b8" />
      <rect x="14" y="12" width="1" height="1" fill="#9aa8b8" />
      {/* Decorative wing motifs over the ears */}
      <polygon points="4,9 6,12 4,12" fill="#9aa8b8" />
      <polygon points="20,9 18,12 20,12" fill="#9aa8b8" />
      <line x1="4" y1="9" x2="6" y2="12" stroke="#3a4858" strokeWidth="0.4" />
      <line x1="20" y1="9" x2="18" y2="12" stroke="#3a4858" strokeWidth="0.4" />
      {/* Gorget */}
      <rect x="6" y="17" width="12" height="3" fill="#3a4858" />
      <rect x="6" y="17" width="12" height="1" fill="#5a6878" />
      {/* Plate cuirass */}
      <rect x="4" y="20" width="16" height="14" fill="#5a6878" stroke="#0a0612" strokeWidth="0.5" />
      <rect x="4" y="20" width="2" height="14" fill="#3a4858" />
      <rect x="18" y="20" width="2" height="14" fill="#3a4858" />
      {/* Open-eye emblem */}
      <ellipse cx="12" cy="26" rx="4" ry="2" fill="#0a0612" />
      <ellipse cx="12" cy="26" rx="3" ry="1.4" fill="#a8d4ff" />
      <circle cx="12" cy="26" r="1" fill="#0a0612" />
      <circle cx="12" cy="26" r="0.5" fill="#fff4c8" />
      {/* Pauldron rivets */}
      <circle cx="6" cy="22" r="0.8" fill="#9aa8b8" />
      <circle cx="18" cy="22" r="0.8" fill="#9aa8b8" />
      <circle cx="6" cy="30" r="0.8" fill="#9aa8b8" />
      <circle cx="18" cy="30" r="0.8" fill="#9aa8b8" />
      {/* Belt */}
      <rect x="4" y="34" width="16" height="2" fill="#1a1008" />
      <rect x="11" y="34" width="2" height="2" fill="#d4b062" />
      {/* Tabard */}
      <rect x="9" y="36" width="6" height="4" fill="#2a3848" />
      <rect x="11" y="36" width="2" height="4" fill="#5a6878" />
    </SvgFrame>
  );
}

/* ─────────────── Tymora shrine priestess ─────────────── */
/* Laughing, blonde, coin necklace, deep blue robe with stars. */
export function TymoraPriestess({ className, ariaLabel = 'Priestess of Tymora' }: PortraitProps) {
  return (
    <SvgFrame className={className} ariaLabel={ariaLabel}>
      {/* Hair — wavy, bright blonde */}
      <rect x="5" y="3" width="14" height="13" fill="#f4d260" />
      <rect x="4" y="6" width="16" height="11" fill="#f4d260" />
      <rect x="6" y="2" width="12" height="2" fill="#fff0a8" />
      <rect x="6" y="4" width="3" height="3" fill="#fff0a8" />
      <rect x="15" y="4" width="3" height="3" fill="#fff0a8" />
      {/* Curl tips */}
      <rect x="4" y="16" width="2" height="2" fill="#e8b840" />
      <rect x="18" y="16" width="2" height="2" fill="#e8b840" />
      {/* Face */}
      <rect x="8" y="7" width="8" height="9" fill="#f8dab0" />
      <rect x="8" y="13" width="8" height="3" fill="#ecc090" />
      {/* Eyes — squinted in laughter */}
      <path d="M 9 11 q 1 -1 2 0" stroke="#1a1410" strokeWidth="0.8" fill="none" />
      <path d="M 13 11 q 1 -1 2 0" stroke="#1a1410" strokeWidth="0.8" fill="none" />
      {/* Cheek flush */}
      <rect x="8" y="12" width="2" height="2" fill="#e88060" opacity="0.7" />
      <rect x="14" y="12" width="2" height="2" fill="#e88060" opacity="0.7" />
      {/* Open laughing mouth */}
      <rect x="10" y="13" width="4" height="2" fill="#7a2418" />
      <rect x="11" y="13" width="2" height="1" fill="#f4d4a8" />
      <rect x="10" y="15" width="4" height="1" fill="#a04030" />
      {/* Neck */}
      <rect x="10" y="16" width="4" height="2" fill="#ecc090" />
      {/* Coin necklace */}
      <line x1="8" y1="18" x2="16" y2="18" stroke="#d4b062" strokeWidth="0.5" />
      <rect x="11" y="19" width="2" height="2" fill="#f4d042" />
      <circle cx="12" cy="20" r="0.8" fill="#a07a30" />
      <rect x="9" y="18" width="1" height="1" fill="#d4b062" />
      <rect x="14" y="18" width="1" height="1" fill="#d4b062" />
      {/* Robe — deep blue with stars */}
      <rect x="4" y="20" width="16" height="20" fill="#1a2868" />
      <rect x="4" y="20" width="16" height="2" fill="#2a3878" />
      {/* Stars on the robe */}
      <rect x="6" y="24" width="1" height="1" fill="#fff4c8" />
      <rect x="9" y="28" width="1" height="1" fill="#fff4c8" />
      <rect x="14" y="26" width="1" height="1" fill="#fff4c8" />
      <rect x="17" y="30" width="1" height="1" fill="#fff4c8" />
      <rect x="11" y="34" width="1" height="1" fill="#fff4c8" />
      <rect x="7" y="36" width="1" height="1" fill="#fff4c8" />
      <rect x="15" y="36" width="1" height="1" fill="#fff4c8" />
      {/* Lucky coin clasp at chest */}
      <circle cx="12" cy="26" r="2" fill="#d4b062" />
      <circle cx="12" cy="26" r="1.2" fill="#f4d042" />
      <rect x="11.5" y="25.5" width="1" height="1" fill="#a07a30" />
      {/* Belt */}
      <rect x="4" y="33" width="16" height="2" fill="#7a6020" />
      <rect x="11" y="33" width="2" height="2" fill="#f4d042" />
    </SvgFrame>
  );
}

/* ─────────────── Cowled Wizard ─────────────── */
/* Masked silver collar, deep cowled robe, leaning, watchful. */
export function CowledWizard({ className, ariaLabel = 'Cowled Wizard' }: PortraitProps) {
  return (
    <SvgFrame className={className} ariaLabel={ariaLabel}>
      {/* Wide cowl */}
      <rect x="3" y="3" width="18" height="6" fill="#1a1228" />
      <rect x="2" y="5" width="20" height="10" fill="#1a1228" />
      <rect x="2" y="5" width="20" height="2" fill="#2a1c38" />
      {/* Cowl front edge — falls forward asymmetric (leaning) */}
      <polygon points="3,8 8,4 9,8" fill="#2a1c38" />
      <polygon points="21,8 16,4 15,8" fill="#0a0510" />
      {/* Inner hood shadow — pure black with mask visible */}
      <rect x="6" y="7" width="12" height="11" fill="#020005" />
      {/* Silver collar — wide, ringed */}
      <rect x="4" y="15" width="16" height="4" fill="#c8c4d6" stroke="#3a3848" strokeWidth="0.5" />
      <rect x="4" y="15" width="16" height="1" fill="#fff" opacity="0.6" />
      {/* Collar etched runes */}
      <rect x="6" y="17" width="1" height="1" fill="#3a3848" />
      <rect x="9" y="17" width="1" height="1" fill="#3a3848" />
      <rect x="12" y="17" width="1" height="1" fill="#3a3848" />
      <rect x="15" y="17" width="1" height="1" fill="#3a3848" />
      <rect x="18" y="17" width="1" height="1" fill="#3a3848" />
      {/* Mask glint — only two faint eye-points visible in the cowl */}
      <rect x="9" y="10" width="1" height="1" fill="#a8b8ff" opacity="0.85" />
      <rect x="14" y="10" width="1" height="1" fill="#a8b8ff" opacity="0.85" />
      <rect x="9" y="10" width="1" height="1" fill="#fff" opacity="0.4" />
      {/* Robe body */}
      <rect x="3" y="19" width="18" height="21" fill="#0e0a1a" />
      <rect x="3" y="19" width="2" height="21" fill="#1a1228" />
      <rect x="19" y="19" width="2" height="21" fill="#1a1228" />
      {/* Lean — left shoulder slightly forward */}
      <polygon points="3,19 9,22 9,26 3,26" fill="#1a1228" />
      {/* Wide sleeves (hands tucked) */}
      <rect x="5" y="26" width="6" height="10" fill="#0a0612" />
      <rect x="13" y="26" width="6" height="10" fill="#0a0612" />
      {/* Subtle arcane sigil on the chest */}
      <polygon
        points="12,24 14,27 12,30 10,27"
        fill="none"
        stroke="#5a4080"
        strokeWidth="0.6"
        opacity="0.85"
      />
      <circle cx="12" cy="27" r="0.6" fill="#a08acc" opacity="0.85" />
      {/* Belt */}
      <rect x="3" y="33" width="18" height="2" fill="#020005" />
    </SvgFrame>
  );
}

/* ─────────────── Drow Priestess of Lolth ─────────────── */
/* Pale-violet skin, spider-crown, dark robes, white hair. */
export function DrowPriestess({ className, ariaLabel = 'Drow Priestess of Lolth' }: PortraitProps) {
  return (
    <SvgFrame className={className} ariaLabel={ariaLabel}>
      {/* Hair — long, silver-white */}
      <rect x="4" y="4" width="16" height="14" fill="#d8d4e0" />
      <rect x="3" y="7" width="18" height="11" fill="#d8d4e0" />
      <rect x="5" y="3" width="14" height="3" fill="#f4f0fc" />
      {/* Hair shadow */}
      <rect x="4" y="14" width="2" height="6" fill="#a8a4b8" />
      <rect x="18" y="14" width="2" height="6" fill="#a8a4b8" />
      {/* Spider crown — black, points outward */}
      <rect x="7" y="2" width="10" height="2" fill="#0a0510" />
      <rect x="6" y="3" width="12" height="1" fill="#0a0510" />
      {/* Crown spider legs / spikes */}
      <polygon points="7,2 8,0 9,2" fill="#0a0510" />
      <polygon points="11,2 12,-1 13,2" fill="#0a0510" />
      <polygon points="15,2 16,0 17,2" fill="#0a0510" />
      {/* Spider in the crown center — ruby body */}
      <circle cx="12" cy="3" r="1" fill="#a8181c" />
      <line x1="11" y1="3" x2="9" y2="2" stroke="#0a0510" strokeWidth="0.4" />
      <line x1="13" y1="3" x2="15" y2="2" stroke="#0a0510" strokeWidth="0.4" />
      <line x1="11" y1="3" x2="9" y2="4" stroke="#0a0510" strokeWidth="0.4" />
      <line x1="13" y1="3" x2="15" y2="4" stroke="#0a0510" strokeWidth="0.4" />
      {/* Face — pale violet */}
      <rect x="8" y="7" width="8" height="9" fill="#b8a0c8" />
      <rect x="8" y="13" width="8" height="3" fill="#9a8aac" />
      {/* Cheek shadow */}
      <rect x="8" y="11" width="1" height="2" fill="#7a6e8c" />
      <rect x="15" y="11" width="1" height="2" fill="#7a6e8c" />
      {/* Eyes — dark, red iris */}
      <rect x="9" y="10" width="2" height="2" fill="#0a0410" />
      <rect x="10" y="10" width="1" height="1" fill="#c83040" />
      <rect x="13" y="10" width="2" height="2" fill="#0a0410" />
      <rect x="14" y="10" width="1" height="1" fill="#c83040" />
      {/* Brow — high arched */}
      <rect x="9" y="9" width="2" height="0.5" fill="#0a0510" />
      <rect x="13" y="9" width="2" height="0.5" fill="#0a0510" />
      {/* Mouth — small, dark */}
      <rect x="10" y="14" width="4" height="1" fill="#3a1228" />
      {/* Neck */}
      <rect x="10" y="16" width="4" height="2" fill="#9a8aac" />
      {/* Robe — black with violet trim */}
      <rect x="4" y="18" width="16" height="22" fill="#0a0410" />
      <rect x="4" y="18" width="16" height="2" fill="#2a1230" />
      <rect x="4" y="18" width="2" height="22" fill="#1a0820" />
      <rect x="18" y="18" width="2" height="22" fill="#1a0820" />
      {/* Spider web pattern on chest */}
      <g stroke="#5a3060" strokeWidth="0.5" fill="none" opacity="0.85">
        <path d="M 12 22 L 8 26" />
        <path d="M 12 22 L 16 26" />
        <path d="M 12 22 L 12 30" />
        <path d="M 12 22 L 9 22" />
        <path d="M 12 22 L 15 22" />
        <path d="M 9 24 L 12 24 L 15 24" />
        <path d="M 9 27 L 12 27 L 15 27" />
      </g>
      {/* Spider broach */}
      <circle cx="12" cy="30" r="1.4" fill="#a8181c" />
      <circle cx="12" cy="30" r="0.7" fill="#5a0a10" />
      {/* Belt with chained weights */}
      <rect x="4" y="34" width="16" height="2" fill="#2a1230" />
      <rect x="11" y="34" width="2" height="2" fill="#c8a4d8" />
      <line x1="8" y1="36" x2="8" y2="40" stroke="#5a3060" strokeWidth="0.6" />
      <line x1="16" y1="36" x2="16" y2="40" stroke="#5a3060" strokeWidth="0.6" />
    </SvgFrame>
  );
}

/**
 * Convenience lookup so dialog systems can resolve a portrait by name.
 * Add new portraits here as they ship.
 */
export const NPC_PORTRAITS = {
  imoen: Imoen,
  irenicus: Irenicus,
  linene: LineneGraywind,
  'ilmater-priest': IlmaterPriest,
  'lathander-priest': LathanderPriest,
  'helm-priest': HelmPriest,
  'tymora-priestess': TymoraPriestess,
  'cowled-wizard': CowledWizard,
  'drow-priestess': DrowPriestess,
} as const;

export type NpcPortraitId = keyof typeof NPC_PORTRAITS;
