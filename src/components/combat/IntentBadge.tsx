import { memo, type ReactElement } from 'react';
import type { MonsterIntent } from '../../types/combat';
import type { ConditionName } from '../../types/conditions';
import { useT } from '../../i18n/useT';
import { getLocalizedMonsterActionName } from '../../i18n';

type TFn = (key: string, params?: Record<string, string | number>) => string;

/**
 * enemy-telegraph: the at-a-glance badge showing what a monster will do on its
 * next turn (Slay-the-Spire intent). Icon + optional value, colour-coded by
 * threat. 8-bit-dark: chunky border, dark fill, monochrome inline-SVG glyphs.
 */

interface IntentBadgeProps {
  intent: MonsterIntent;
  /** Owning monster's def id — localizes the wind-up action name in its label. */
  monsterId?: string;
}

type IntentStyle = {
  /** CSS colour for the glyph + accent. */
  color: string;
  icon: ReactElement;
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
  // boss-framework: a wind-up hourglass — a big special is charging / incoming.
  windup: (
    <path
      d="M3.5 2 H12.5 M3.5 14 H12.5 M4 2.5 L8 8 L4 13.5 M12 2.5 L8 8 L12 13.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="square"
      strokeLinejoin="round"
    />
  ),
};

/** "3" when min===max, else "3–6". Null when the intent carries no damage. */
function rangeText(intent: MonsterIntent): string | null {
  const { damageMin, damageMax } = intent;
  if (damageMin === undefined || damageMax === undefined) return null;
  return damageMin === damageMax ? `${damageMin}` : `${damageMin}–${damageMax}`;
}

/** Total damage across all swings of a multiattack, as a range string. */
function multiTotalText(intent: MonsterIntent): string | null {
  const { damageMin, damageMax, hits } = intent;
  if (damageMin === undefined || damageMax === undefined || !hits) return null;
  const lo = damageMin * hits;
  const hi = damageMax * hits;
  return lo === hi ? `${lo}` : `${lo}–${hi}`;
}

/** What a condition does to the player — so the read is actionable, not just a name. */
function debuffEffect(c: ConditionName | undefined, t: TFn): string {
  switch (c) {
    case 'poisoned':
    case 'frightened':
    case 'blinded':
    case 'restrained':
    case 'weakened':
      return t(`combat.intent.effect.${c}`);
    default:
      return t('combat.intent.effect.default');
  }
}

/** The localized tooltip / screen-reader description for an intent. */
function describeIntent(i: MonsterIntent, t: TFn, monsterId?: string): string {
  const unknown = () => t('combat.intent.unknown');
  const actionName = monsterId ? getLocalizedMonsterActionName(monsterId, i.actionName) : i.actionName;
  switch (i.kind) {
    case 'attack':
      return t('combat.intent.attack', { dmg: rangeText(i) ?? unknown() });
    case 'multiattack': {
      const total = multiTotalText(i);
      return t('combat.intent.multiattack', {
        hits: i.hits ?? 2,
        per: rangeText(i) ?? unknown(),
        total: total ? t('combat.intent.multiTotal', { total }) : '',
      });
    }
    case 'drain':
      return t('combat.intent.drain', { dmg: rangeText(i) ?? unknown() });
    case 'paralyze':
      return t('combat.intent.paralyze');
    case 'debuff':
      return t('combat.intent.debuff', { effect: debuffEffect(i.condition, t) });
    case 'summon':
      return t('combat.intent.summon');
    case 'sustain-heal':
      return t('combat.intent.sustainHeal');
    case 'ward':
      return t('combat.intent.ward');
    case 'windup':
      return i.imminent
        ? t('combat.intent.windupImminent', { action: actionName })
        : t('combat.intent.windupCharging', { action: actionName });
  }
}

const STYLES: Record<MonsterIntent['kind'], IntentStyle> = {
  attack: { color: 'var(--color-accent-blood)', icon: ICONS.attack },
  multiattack: { color: 'var(--color-accent-blood)', icon: ICONS.multiattack },
  drain: { color: 'var(--color-status-necrotic)', icon: ICONS.drain },
  paralyze: { color: 'var(--color-status-holy)', icon: ICONS.paralyze },
  debuff: { color: 'var(--color-status-poison)', icon: ICONS.debuff },
  summon: { color: 'var(--color-accent-arcane)', icon: ICONS.summon },
  'sustain-heal': { color: 'var(--color-status-poison)', icon: ICONS['sustain-heal'] },
  ward: { color: 'var(--color-accent-amber)', icon: ICONS.ward },
  windup: { color: 'var(--color-accent-torch)', icon: ICONS.windup },
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
  // boss-framework: an imminent wind-up flags itself with a bang; a still-
  // charging one reads from the icon + pulse alone.
  if (intent.kind === 'windup') return intent.imminent ? '!' : null;
  const range = rangeText(intent);
  if (intent.kind === 'multiattack') return `${intent.hits ?? 2}× ${range ?? '?'}`;
  return range;
}

function IntentBadgeImpl({ intent, monsterId }: IntentBadgeProps) {
  const { t } = useT();
  const style = STYLES[intent.kind];
  const describe = describeIntent(intent, t, monsterId);
  const color =
    intent.kind === 'debuff'
      ? DEBUFF_COLORS[intent.condition ?? 'poisoned'] ?? style.color
      : // boss-framework: an imminent wind-up burns blood-red; one still charging
        // stays warning-amber.
        intent.kind === 'windup' && intent.imminent
        ? 'var(--color-accent-blood)'
        : style.color;
  const value = valueText(intent);
  const urgent =
    intent.kind === 'attack' ||
    intent.kind === 'multiattack' ||
    intent.kind === 'drain' ||
    intent.kind === 'paralyze' ||
    // An incoming wind-up is the most urgent read on the field; one still
    // charging is a heads-up, not yet a pulse.
    (intent.kind === 'windup' && intent.imminent === true);

  return (
    <div
      className={`enemy-intent-badge ${urgent ? 'enemy-intent-urgent' : ''}`}
      style={{ color, borderColor: color }}
      title={describe}
      aria-label={describe}
    >
      <svg viewBox="0 0 16 16" className="enemy-intent-icon" aria-hidden="true">
        {style.icon}
      </svg>
      {value && <span className="enemy-intent-value">{value}</span>}
    </div>
  );
}

export const IntentBadge = memo(IntentBadgeImpl);
