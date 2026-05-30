import type { GearRarity, Item } from '../../schemas/item';
import type { Rarity } from '../../schemas/ids';
import { GEAR_RARITY_COLOR } from './rarity';

interface ItemIconProps {
  item: Item;
  size?: number;
  className?: string;
  /** Rolled-loot rarity. When set, the frame uses the gear palette. */
  gearRarity?: GearRarity;
}

const RARITY_FRAME: Record<Rarity, string> = {
  common: 'var(--color-border-warm)',
  uncommon: 'var(--color-status-poison)',
  rare: 'var(--color-status-frost)',
  'very-rare': 'var(--color-accent-amber)',
  legendary: 'var(--color-accent-gold)',
  artifact: 'var(--color-accent-blood)',
};

export function ItemIcon({ item, size = 40, className = '', gearRarity }: ItemIconProps) {
  const borderColor =
    gearRarity && gearRarity !== 'white' ? GEAR_RARITY_COLOR[gearRarity] : RARITY_FRAME[item.rarity];
  return (
    <div
      className={`inline-flex items-center justify-center bg-[var(--color-bg-elevated)] border-2 shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        borderColor,
      }}
    >
      <svg viewBox="0 0 32 32" width={size - 8} height={size - 8} aria-hidden>
        {renderGlyph(item)}
      </svg>
    </div>
  );
}

function renderGlyph(item: Item) {
  switch (item.kind) {
    case 'weapon':
      return weaponGlyph(item.id);
    case 'armor':
      return armorGlyph(item.id, item.category);
    case 'consumable':
      return consumableGlyph(item.id, item.effect);
  }
}

const stroke = 'var(--color-text-primary)';
const dim = 'var(--color-text-secondary)';
const accent = 'var(--color-accent-amber)';
const blood = 'var(--color-accent-blood)';
const poison = 'var(--color-status-poison)';

function weaponGlyph(id: string) {
  switch (id) {
    case 'longsword':
      return (
        <g fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round">
          <line x1="22" y1="6" x2="10" y2="22" />
          <line x1="20" y1="8" x2="24" y2="12" stroke={accent} />
          <line x1="9" y1="20" x2="13" y2="24" stroke={accent} />
          <circle cx="8" cy="25" r="1.4" fill={accent} stroke="none" />
        </g>
      );
    case 'dagger':
      return (
        <g fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round">
          <line x1="20" y1="9" x2="13" y2="19" />
          <line x1="11" y1="17" x2="15" y2="21" stroke={accent} />
          <line x1="10" y1="22" x2="13" y2="25" stroke={accent} strokeWidth="2" />
        </g>
      );
    case 'shortbow':
      return (
        <g fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round">
          <path d="M 10 6 Q 4 16 10 26" />
          <line x1="10" y1="6" x2="10" y2="26" stroke={accent} strokeDasharray="2 2" />
          <line x1="14" y1="16" x2="26" y2="16" />
          <path d="M 25 13 L 28 16 L 25 19" />
        </g>
      );
    case 'greatsword':
      return (
        <g fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round">
          <line x1="16" y1="4" x2="16" y2="22" />
          <line x1="11" y1="22" x2="21" y2="22" stroke={accent} strokeWidth="2" />
          <line x1="16" y1="22" x2="16" y2="28" />
          <circle cx="16" cy="29" r="1.6" fill={accent} stroke="none" />
        </g>
      );
    case 'warhammer':
      return (
        <g fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round">
          <rect x="9" y="7" width="14" height="6" stroke={stroke} fill="none" />
          <line x1="16" y1="13" x2="16" y2="26" />
          <line x1="14" y1="26" x2="18" y2="26" stroke={accent} />
        </g>
      );
    case 'rapier':
      return (
        <g fill="none" stroke={stroke} strokeWidth="1.4" strokeLinecap="round">
          <line x1="22" y1="6" x2="10" y2="22" />
          <circle cx="9" cy="23" r="2.5" fill="none" stroke={accent} />
          <line x1="8" y1="25" x2="6" y2="27" />
        </g>
      );
    default:
      return (
        <g fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round">
          <line x1="22" y1="6" x2="10" y2="22" />
        </g>
      );
  }
}

function armorGlyph(id: string, category: 'light' | 'medium' | 'heavy' | 'shield') {
  if (category === 'shield' || id === 'shield') {
    return (
      <g fill="none" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round">
        <path d="M 16 4 L 26 8 L 26 17 Q 26 25 16 28 Q 6 25 6 17 L 6 8 Z" />
        <line x1="16" y1="4" x2="16" y2="28" stroke={accent} />
        <line x1="6" y1="14" x2="26" y2="14" stroke={accent} />
      </g>
    );
  }
  const fill = category === 'heavy' ? dim : 'none';
  return (
    <g fill={fill} stroke={stroke} strokeWidth="1.6" strokeLinejoin="round">
      <path d="M 10 6 L 22 6 L 24 10 L 22 26 L 10 26 L 8 10 Z" />
      <path d="M 13 6 L 16 9 L 19 6" stroke={accent} fill="none" />
      {category === 'heavy' && (
        <>
          <line x1="11" y1="14" x2="21" y2="14" stroke={accent} strokeWidth="1" />
          <line x1="11" y1="18" x2="21" y2="18" stroke={accent} strokeWidth="1" />
          <line x1="11" y1="22" x2="21" y2="22" stroke={accent} strokeWidth="1" />
        </>
      )}
      {category === 'medium' && (
        <>
          <circle cx="13" cy="16" r="1" fill={accent} stroke="none" />
          <circle cx="19" cy="16" r="1" fill={accent} stroke="none" />
          <circle cx="13" cy="20" r="1" fill={accent} stroke="none" />
          <circle cx="19" cy="20" r="1" fill={accent} stroke="none" />
        </>
      )}
    </g>
  );
}

function consumableGlyph(id: string, effect: 'heal' | 'buff' | 'utility') {
  const liquidColor = effect === 'heal' ? blood : effect === 'buff' ? accent : poison;
  const isGreater = id.includes('greater');
  return (
    <g fill="none" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
      <rect x="13" y="4" width="6" height="3" />
      <line x1="14" y1="7" x2="14" y2="10" />
      <line x1="18" y1="7" x2="18" y2="10" />
      <path d="M 11 10 L 21 10 L 23 14 L 23 26 Q 23 28 21 28 L 11 28 Q 9 28 9 26 L 9 14 Z" />
      <path
        d={isGreater ? 'M 10 14 L 22 14 L 22 27 L 10 27 Z' : 'M 10 18 L 22 18 L 22 27 L 10 27 Z'}
        fill={liquidColor}
        opacity="0.6"
        stroke="none"
      />
      <circle cx="13" cy={isGreater ? 17 : 21} r="0.8" fill={stroke} stroke="none" />
    </g>
  );
}
