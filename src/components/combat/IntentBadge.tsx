import { memo, type ReactElement } from 'react';
import type { MonsterIntent } from '../../types/combat';
import type { ConditionName } from '../../types/conditions';

/**
 * enemy-telegraph: the at-a-glance badge showing what a monster will do on its
 * next turn (Slay-the-Spire intent). Icon + optional value, colour-coded by
 * threat. 8-bit-dark: chunky border, dark fill, monochrome inline-SVG glyphs.
 */

interface IntentBadgeProps {
  intent: MonsterIntent;
}

type IntentStyle = {
  /** CSS colour for the glyph + accent. */
  color: string;
  icon: ReactElement;
  /** Tooltip / screen-reader description. */
  describe: (intent: MonsterIntent) => string;
};

const SWORD: ReactElement = (
  <path
    d="M11 1 L13 3 L6 10 L4.5 11.5 L2.5 9.5 L4 8 Z M2 12 L4 14 M3 11 L5 13"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="square"
  />
);

const ICONS: Record<string, ReactElement> = {
  attack: SWORD,
  multiattack: (
    <g fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="square">
      <path d="M12 2 L5 9 M3 11 L4.5 9.5 M2 13 L3.5 11.5" />
      <path d="M4 2 L11 9 M13 11 L11.5 9.5 M14 13 L12.5 11.5" />
    </g>
  ),
  drain: (
    <g fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <path d="M8 1 C8 1 3 7 3 10 a5 5 0 0 0 10 0 C13 7 8 1 8 1 Z" />
      <path d="M8 6 L8 11 M6 9 L8 11 L10 9" strokeWidth="1.2" />
    </g>
  ),
  paralyze: (
    <path
      d="M9 1 L4 8 L7.5 8 L6 15 L12 6 L8.5 6 Z"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="0.6"
      strokeLinejoin="round"
    />
  ),
  debuff: (
    <g fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4 L8 10 M5.5 8 L8 10.5 L10.5 8" />
    </g>
  ),
  summon: (
    <g fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.5 L8 11.5 M4.5 8 L11.5 8" />
    </g>
  ),
  'sustain-heal': (
    <path
      d="M6 2 L10 2 L10 6 L14 6 L14 10 L10 10 L10 14 L6 14 L6 10 L2 10 L2 6 L6 6 Z"
      fill="currentColor"
    />
  ),
  ward: (
    <path
      d="M8 1 L14 3 L14 8 C14 12 8 15 8 15 C8 15 2 12 2 8 L2 3 Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
  ),
};

function conditionWord(c: ConditionName | undefined): string {
  return c ?? 'a curse';
}

const STYLES: Record<MonsterIntent['kind'], IntentStyle> = {
  attack: {
    color: 'var(--color-accent-blood)',
    icon: ICONS.attack,
    describe: (i) => `Will strike for ~${i.damage} damage`,
  },
  multiattack: {
    color: 'var(--color-accent-blood)',
    icon: ICONS.multiattack,
    describe: (i) => `Will strike ${i.hits ?? 2}× for ~${i.damage} each`,
  },
  drain: {
    color: 'var(--color-status-necrotic)',
    icon: ICONS.drain,
    describe: (i) => `Will drain ~${i.damage} HP and heal itself`,
  },
  paralyze: {
    color: 'var(--color-status-holy)',
    icon: ICONS.paralyze,
    describe: () => 'Will try to paralyze you — save or be held',
  },
  debuff: {
    color: 'var(--color-status-poison)',
    icon: ICONS.debuff,
    describe: (i) => `Will try to inflict ${conditionWord(i.condition)}`,
  },
  summon: {
    color: 'var(--color-accent-arcane)',
    icon: ICONS.summon,
    describe: () => 'Will summon reinforcements',
  },
  'sustain-heal': {
    color: 'var(--color-status-poison)',
    icon: ICONS['sustain-heal'],
    describe: () => 'Will heal itself or a wounded ally',
  },
  ward: {
    color: 'var(--color-accent-amber)',
    icon: ICONS.ward,
    describe: () => 'Will shield itself or an ally with temporary HP',
  },
};

// Per-condition tint for debuff intents, so a poison read differs from a fear read.
const DEBUFF_COLORS: Partial<Record<ConditionName, string>> = {
  poisoned: 'var(--color-status-poison)',
  frightened: 'var(--color-accent-arcane)',
  blinded: 'var(--color-text-secondary)',
  restrained: 'var(--color-accent-teal-shadow)',
  weakened: 'var(--color-text-secondary)',
};

function valueText(intent: MonsterIntent): string | null {
  if (intent.kind === 'multiattack') return `${intent.hits ?? 2}×${intent.damage ?? '?'}`;
  if (intent.damage !== undefined) return `${intent.damage}`;
  return null;
}

function IntentBadgeImpl({ intent }: IntentBadgeProps) {
  const style = STYLES[intent.kind];
  const color =
    intent.kind === 'debuff'
      ? DEBUFF_COLORS[intent.condition ?? 'poisoned'] ?? style.color
      : style.color;
  const value = valueText(intent);
  const urgent =
    intent.kind === 'attack' ||
    intent.kind === 'multiattack' ||
    intent.kind === 'drain' ||
    intent.kind === 'paralyze';

  return (
    <div
      className={`enemy-intent-badge ${urgent ? 'enemy-intent-urgent' : ''}`}
      style={{ color, borderColor: color }}
      title={style.describe(intent)}
      aria-label={style.describe(intent)}
    >
      <svg viewBox="0 0 16 16" className="enemy-intent-icon" aria-hidden="true">
        {style.icon}
      </svg>
      {value && <span className="enemy-intent-value">{value}</span>}
    </div>
  );
}

export const IntentBadge = memo(IntentBadgeImpl);
