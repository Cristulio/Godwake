import { useLayoutEffect, useRef, useState } from 'react';
import type { AttackEvent } from '../../types/combat';
import { useT } from '../../i18n/useT';

export interface FloatingDamageItem {
  id: number;
  amount: number;
  kind: 'damage' | 'heal' | 'miss' | 'crit' | 'block' | 'landed' | 'resisted' | 'graze';
  /** Element of the blow (fire/cold/...) — tints the number. Physical/absent = default. */
  damageType?: string;
}

/** Which combatant a sprite represents, for matching against an attack event. */
export type FloatSelf =
  | { kind: 'player' }
  | { kind: 'monster'; displayName: string };

/**
 * True when `lastAttack` is aimed at this sprite, regardless of whether it
 * connected. `attackLandsOn` adds the hit requirement on top; the sprite reads
 * the aim-only form to float a "MISS" whiff on a swing that whistled past.
 */
export function attackAimedAt(lastAttack: AttackEvent, self: FloatSelf): boolean {
  return self.kind === 'player'
    ? lastAttack.attackerKind === 'monster'
    : lastAttack.attackerKind === 'player' && lastAttack.targetName === self.displayName;
}

function attackLandsOn(lastAttack: AttackEvent, self: FloatSelf): boolean {
  return lastAttack.hit && attackAimedAt(lastAttack, self);
}

/**
 * True when `lastAttack` is the tail of a multi-swing batch aimed at this sprite
 * that committed atomically — the case the per-turn batch effect floats swing by
 * swing, so the main float effect must defer to it (and not double-count via the
 * HP delta).
 *
 * Crucially it requires `lastAttack` to actually BE one of the batched events.
 * The batch (`attackEvents`) is only ever written by a monster multiattack and
 * is NOT cleared when the player then takes their turn, so a stale 2+ batch from
 * the monster's last turn lingers in state. Without the membership check, the
 * player's own fresh single swing — whose `lastAttack` is aimed at the struck
 * monster — would match `length >= 2 && aimedAt(self)` against that stale batch,
 * the main effect would defer, and the batch effect (keyed on the unchanged
 * `attackEvents` reference) would never re-run — so the hit floated nothing.
 */
export function isBatchedMultiattack(
  attackEvents: AttackEvent[] | undefined,
  lastAttack: AttackEvent | undefined,
  self: FloatSelf,
): boolean {
  if (!lastAttack || (attackEvents?.length ?? 0) < 2) return false;
  if (!attackEvents!.some((e) => e.id === lastAttack.id)) return false;
  return attackAimedAt(lastAttack, self);
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
  // A graze carries hit=false but real chip damage — float it as its own
  // smaller kind so a near-miss reads as a near-miss, not a landed blow.
  if (
    isNewAttack &&
    lastAttack &&
    lastAttack.graze === true &&
    attackAimedAt(lastAttack, self) &&
    (lastAttack.damageDealt ?? 0) > 0
  ) {
    return { amount: lastAttack.damageDealt!, kind: 'graze' };
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
    suffix: '',
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
  // A control spell that took hold — violet force-tint with a soft glow so the
  // verdict reads as a magical bind, not a struck blow.
  landed: {
    color: 'text-[#c9a8ff]',
    prefix: '',
    suffix: '',
    animation: 'animate-damage-float',
    size: 'text-[34px]',
    glow: 'rgba(201,168,255,0.78)',
  },
  // Shrugged off — styled like a MISS: dim, deflecting, no glow.
  resisted: {
    color: 'text-[var(--color-text-secondary)]',
    prefix: '',
    suffix: '',
    animation: 'animate-damage-deflect',
    size: 'text-[34px]',
    glow: 'rgba(0,0,0,0)',
  },
  // A grazing near-miss — real damage, but a glancing one: clearly smaller
  // and duller than a landed hit, with the word attached so it never reads
  // as a full blow.
  graze: {
    color: 'text-[#d9a96b]',
    prefix: '−',
    suffix: '',
    animation: 'animate-damage-float',
    size: 'text-[30px]',
    glow: 'rgba(217,169,107,0.35)',
  },
};

/**
 * Per-element tint for the floating number, keyed off `lastAttack.damageType`.
 * Physical types (slashing/piercing/bludgeoning) and absent types fall through
 * to the kind's default colour so a sword swing keeps the familiar amber/red.
 */
const ELEMENT_TINT: Record<string, { color: string; glow: string }> = {
  fire: { color: '#ff7a3a', glow: 'rgba(255,107,43,0.75)' },
  cold: { color: '#8fe6ff', glow: 'rgba(143,230,255,0.75)' },
  lightning: { color: '#ffe066', glow: 'rgba(255,224,102,0.8)' },
  poison: { color: '#b6f04a', glow: 'rgba(146,200,30,0.7)' },
  acid: { color: '#caf04a', glow: 'rgba(170,210,40,0.7)' },
  necrotic: { color: '#b07ad8', glow: 'rgba(176,122,216,0.72)' },
  radiant: { color: '#ffe9a8', glow: 'rgba(255,220,120,0.85)' },
  force: { color: '#c9a8ff', glow: 'rgba(201,168,255,0.78)' },
  psychic: { color: '#ff8ae0', glow: 'rgba(255,138,224,0.72)' },
};

function DamageNumber({ item }: { item: FloatingDamageItem }) {
  const { t } = useT();
  const style = KIND_STYLE[item.kind];
  // Damage / crit floats tint to their element when one is present; heals,
  // misses, and blocks keep their semantic colour.
  const tint =
    (item.kind === 'damage' || item.kind === 'crit') && item.damageType
      ? ELEMENT_TINT[item.damageType]
      : undefined;
  const label =
    item.kind === 'miss'
      ? t('combat.float.miss')
      : item.kind === 'landed'
        ? t('combat.float.landed')
        : item.kind === 'resisted'
          ? t('combat.float.resisted')
          : item.kind === 'block'
            ? `${item.amount}${t('combat.float.blocked')}`
            : item.kind === 'graze'
              ? `${style.prefix}${item.amount}${t('combat.float.graze')}`
              : `${style.prefix}${item.amount}${style.suffix}`;

  // Spread numbers slightly so back-to-back hits don't perfectly overlap.
  const offsetX = ((item.id % 5) - 2) * 14;

  const glow = tint?.glow ?? style.glow;
  // Crit keeps the dramatic dual-glow + thick outline; everything else gets a
  // tighter coloured halo over a hard black edge so it pops on any background.
  const textShadow =
    item.kind === 'crit'
      ? `0 0 12px ${glow}, 0 0 24px ${tint?.glow ?? 'rgba(255,71,48,0.6)'}, 3px 3px 0 rgba(0,0,0,0.95), -2px -2px 0 rgba(0,0,0,0.95)`
      : `0 0 9px ${glow}, 0 0 4px rgba(0,0,0,0.95), 2px 2px 0 rgba(0,0,0,0.9)`;

  // The CSS animation owns `transform` entirely — inline transform would be
  // overridden the moment the animation starts and the clamp would have no effect.
  // Fix: outer div owns the clamped X position via `left` (never touched by the
  // animation); inner div carries the animation class (translateY + scale only).
  //
  // useLayoutEffect + setState triggers a synchronous re-render before the first
  // browser paint, so the corrected `left` value is what gets painted — no flash.
  const outerRef = useRef<HTMLDivElement>(null);
  const [left, setLeft] = useState<string>('50%');

  useLayoutEffect(() => {
    const outer = outerRef.current;
    if (!outer) return;
    const container = outer.parentElement;
    if (!container) return;
    const cRect = container.getBoundingClientRect();
    const textW = outer.getBoundingClientRect().width;
    // Reserve space for the peak animation scale so the number stays in bounds
    // at every frame, not just at rest.
    const peakScale = item.kind === 'crit' ? 1.7 : 1.4;
    const halfW = (textW * peakScale) / 2;
    const margin = 8;
    const nominalVP = cRect.left + cRect.width / 2 + offsetX;
    const clampedVP = Math.max(margin + halfW, Math.min(window.innerWidth - margin - halfW, nominalVP));
    setLeft(`${clampedVP - cRect.left - textW / 2}px`);
  }, [item.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={outerRef}
      className="absolute top-1/3 pointer-events-none"
      style={{ left }}
    >
      <div
        className={`font-display font-extrabold whitespace-nowrap ${tint ? '' : style.color} ${style.size} ${style.animation}`}
        style={{ textShadow, letterSpacing: '0.02em', ...(tint ? { color: tint.color } : null) }}
      >
        {label}
      </div>
    </div>
  );
}
