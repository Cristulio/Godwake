import { useEffect, useState } from 'react';

export interface FloatingDamageItem {
  id: number;
  amount: number;
  kind: 'damage' | 'heal' | 'miss';
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

function DamageNumber({ item }: { item: FloatingDamageItem }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  const color =
    item.kind === 'damage'
      ? 'text-[var(--color-accent-blood)]'
      : item.kind === 'heal'
        ? 'text-[var(--color-status-poison)]'
        : 'text-[var(--color-text-dim)]';

  const label =
    item.kind === 'miss'
      ? 'MISS'
      : item.kind === 'heal'
        ? `+${item.amount}`
        : `−${item.amount}`;

  return (
    <div
      className={`
        absolute left-1/2 top-1/3 -translate-x-1/2 font-mono text-4xl font-extrabold ${color}
        transition-all duration-[1400ms] ease-out
        ${visible ? '-translate-y-20 opacity-0' : 'translate-y-0 opacity-100'}
      `}
      style={{
        textShadow:
          '0 0 6px rgba(0,0,0,0.95), 0 0 14px rgba(0,0,0,0.85), 2px 2px 0 rgba(0,0,0,0.9)',
      }}
    >
      {label}
    </div>
  );
}
