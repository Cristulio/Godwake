export interface FloatingDamageItem {
  id: number;
  amount: number;
  kind: 'damage' | 'heal' | 'miss' | 'crit' | 'block';
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
  { color: string; prefix: string; suffix: string; animation: string; size: string }
> = {
  damage: {
    color: 'text-[var(--color-dmg-normal)]',
    prefix: '−',
    suffix: '',
    animation: 'animate-damage-float',
    size: 'text-[42px]',
  },
  crit: {
    color: 'text-[var(--color-dmg-crit)]',
    prefix: '−',
    suffix: '!',
    animation: 'animate-damage-crit',
    size: 'text-[58px]',
  },
  heal: {
    color: 'text-[var(--color-dmg-heal)]',
    prefix: '+',
    suffix: '',
    animation: 'animate-damage-float',
    size: 'text-[42px]',
  },
  block: {
    color: 'text-[var(--color-dmg-block)]',
    prefix: '',
    suffix: ' blocked',
    animation: 'animate-damage-float',
    size: 'text-[30px]',
  },
  miss: {
    color: 'text-[var(--color-text-secondary)]',
    prefix: '',
    suffix: '',
    animation: 'animate-damage-float',
    size: 'text-[34px]',
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

  // Spread numbers slightly so back-to-back hits don't perfectly overlap
  const offsetX = ((item.id % 5) - 2) * 14;

  return (
    <div
      className={`absolute top-1/3 font-display font-extrabold ${style.color} ${style.size} ${style.animation} pointer-events-none`}
      style={{
        left: '50%',
        transform: `translate(calc(-50% + ${offsetX}px), 0)`,
        textShadow:
          item.kind === 'crit'
            ? '0 0 12px rgba(255,71,48,0.9), 0 0 22px rgba(255,71,48,0.6), 3px 3px 0 rgba(0,0,0,0.95), -3px -3px 0 rgba(0,0,0,0.95)'
            : '0 0 6px rgba(0,0,0,0.95), 0 0 14px rgba(0,0,0,0.85), 2px 2px 0 rgba(0,0,0,0.9)',
        letterSpacing: '0.02em',
      }}
    >
      {label}
    </div>
  );
}
