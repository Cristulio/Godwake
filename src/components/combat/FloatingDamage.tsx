import { useLayoutEffect, useRef, useState } from 'react';
import type { AttackEvent } from '../../types/combat';

export interface FloatingDamageItem {
  id: number;
  amount: number;
  kind: 'damage' | 'heal' | 'miss' | 'crit' | 'block';
}

/** Which combatant a sprite represents, for matching against an attack event. */
export type FloatSelf =
  | { kind: 'player' }
  | { kind: 'monster'; displayName: string };

function attackLandsOn(lastAttack: AttackEvent, self: FloatSelf): boolean {
  if (!lastAttack.hit) return false;
  return self.kind === 'player'
    ? lastAttack.attackerKind === 'monster'
    : lastAttack.attackerKind === 'player' && lastAttack.targetName === self.displayName;
}

/**
 * The floating combat number a sprite should show this commit, or null for
 * nothing. A fresh attack event that lands on this sprite is authoritative: it
 * shows the true rolled damage (`damageDealt` already folds in crit-doubling,
 * affix bonuses, and off-type segments) regardless of how little HP actually
 * came off — so overkill and temp-HP soak read true instead of collapsing to a
 * clamped "1". Damage with no fresh attack (poison/bleed ticks, environment)
 * falls back to the HP delta; HP gains float as heals.
 */
export function resolveSpriteFloat(args: {
  lastAttack: AttackEvent | undefined;
  self: FloatSelf;
  /** prevHp − currentHp: positive = damage taken, negative = healed. */
  hpDelta: number;
  /** True when `lastAttack.id` is one this sprite has not processed yet. */
  isNewAttack: boolean;
}): { amount: number; kind: FloatingDamageItem['kind'] } | null {
  const { lastAttack, self, hpDelta, isNewAttack } = args;
  if (
    isNewAttack &&
    lastAttack &&
    attackLandsOn(lastAttack, self) &&
    (lastAttack.damageDealt ?? 0) > 0
  ) {
    return { amount: lastAttack.damageDealt!, kind: lastAttack.crit ? 'crit' : 'damage' };
  }
  if (hpDelta > 0) return { amount: hpDelta, kind: 'damage' };
  if (hpDelta < 0) return { amount: -hpDelta, kind: 'heal' };
  return null;
}

interface FloatingDamageProps {
  items: FloatingDamageItem[];
}

export function FloatingDamage({ items }: FloatingDamageProps) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible z-10">
      {items.map((item) => (
        <DamageNumber key={item.id} item={item} />
      ))}
    </div>
  );
}

const KIND_STYLE: Record<
  FloatingDamageItem['kind'],
  { color: string; prefix: string; suffix: string; animation: string; size: string; glow: string }
> = {
  damage: {
    color: 'text-[var(--color-dmg-normal)]',
    prefix: '−',
    suffix: '',
    animation: 'animate-damage-float',
    size: 'text-[42px]',
    glow: 'rgba(255,179,71,0.55)',
  },
  crit: {
    color: 'text-[var(--color-dmg-crit)]',
    prefix: '−',
    suffix: '!',
    animation: 'animate-damage-crit',
    size: 'text-[60px]',
    glow: 'rgba(255,71,48,0.9)',
  },
  heal: {
    color: 'text-[var(--color-dmg-heal)]',
    prefix: '+',
    suffix: '',
    animation: 'animate-damage-heal',
    size: 'text-[42px]',
    glow: 'rgba(111,217,84,0.75)',
  },
  block: {
    color: 'text-[var(--color-dmg-block)]',
    prefix: '',
    suffix: ' blocked',
    animation: 'animate-damage-deflect',
    size: 'text-[30px]',
    glow: 'rgba(138,168,255,0.7)',
  },
  miss: {
    color: 'text-[var(--color-text-secondary)]',
    prefix: '',
    suffix: '',
    animation: 'animate-damage-deflect',
    size: 'text-[34px]',
    glow: 'rgba(0,0,0,0)',
  },
};

function DamageNumber({ item }: { item: FloatingDamageItem }) {
  const style = KIND_STYLE[item.kind];
  const label =
    item.kind === 'miss'
      ? 'MISS'
      : item.kind === 'block'
        ? `${item.amount}${style.suffix}`
        : `${style.prefix}${item.amount}${style.suffix}`;

  // Spread numbers slightly so back-to-back hits don't perfectly overlap.
  const offsetX = ((item.id % 5) - 2) * 14;

  // Crit keeps the dramatic dual-glow + thick outline; everything else gets a
  // tighter coloured halo over a hard black edge so it pops on any background.
  const textShadow =
    item.kind === 'crit'
      ? `0 0 12px ${style.glow}, 0 0 24px rgba(255,71,48,0.6), 3px 3px 0 rgba(0,0,0,0.95), -2px -2px 0 rgba(0,0,0,0.95)`
      : `0 0 9px ${style.glow}, 0 0 4px rgba(0,0,0,0.95), 2px 2px 0 rgba(0,0,0,0.9)`;

  // Measure rendered bounds and shift horizontally to stay within the viewport.
  // useLayoutEffect fires before paint, so the correction is invisible to the eye.
  const ref = useRef<HTMLDivElement>(null);
  const [xClamp, setXClamp] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const margin = 6;
    if (rect.right > window.innerWidth - margin) {
      setXClamp(window.innerWidth - margin - rect.right);
    } else if (rect.left < margin) {
      setXClamp(margin - rect.left);
    }
  }, [item.id]);

  return (
    <div
      ref={ref}
      className={`absolute top-1/3 font-display font-extrabold ${style.color} ${style.size} ${style.animation} pointer-events-none`}
      style={{
        left: '50%',
        transform: `translate(calc(-50% + ${offsetX + xClamp}px), 0)`,
        textShadow,
        letterSpacing: '0.02em',
      }}
    >
      {label}
    </div>
  );
}
