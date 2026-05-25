import { useEffect, useRef, useState } from 'react';
import type { MonsterCombatant } from '../../types/combat';
import { MonsterPortrait } from './MonsterPortrait';
import { FloatingDamage, type FloatingDamageItem } from './FloatingDamage';

interface EnemyCardProps {
  combatant: MonsterCombatant;
  isActiveTurn: boolean;
  selectable: boolean;
  onSelect?: () => void;
}

export function EnemyCard({ combatant, isActiveTurn, selectable, onSelect }: EnemyCardProps) {
  const { instance } = combatant;
  const dead = instance.hp.current <= 0;
  const hpPercent = (instance.hp.current / instance.hp.max) * 100;

  const prevHp = useRef(instance.hp.current);
  const [damageFloats, setDamageFloats] = useState<FloatingDamageItem[]>([]);
  const [hitFlash, setHitFlash] = useState(false);

  useEffect(() => {
    if (prevHp.current === instance.hp.current) return;
    const delta = prevHp.current - instance.hp.current;
    prevHp.current = instance.hp.current;
    if (delta > 0) {
      const id = Date.now() + Math.random();
      setDamageFloats((d) => [...d, { id, amount: delta, kind: 'damage' }]);
      setTimeout(() => {
        setDamageFloats((d) => d.filter((x) => x.id !== id));
      }, 1500);
      setHitFlash(true);
      setTimeout(() => setHitFlash(false), 220);
    }
  }, [instance.hp.current]);

  return (
    <button
      type="button"
      disabled={!selectable || dead}
      onClick={onSelect}
      className={`
        relative bg-[var(--color-bg-panel)] border-2 p-3 min-w-[148px] text-left transition-all overflow-visible
        ${selectable && !dead
          ? 'border-[var(--color-accent-amber)] cursor-pointer hover:bg-[var(--color-bg-panel-hover)] hover:scale-[1.04] shadow-[0_0_14px_rgba(244,167,66,0.35)]'
          : 'border-[var(--color-border-warm)]'}
        ${isActiveTurn && !dead ? 'ring-2 ring-[var(--color-accent-blood)] ring-offset-2 ring-offset-[var(--color-bg-base)]' : ''}
        ${dead ? 'opacity-30 grayscale' : ''}
        disabled:cursor-not-allowed
      `}
    >
      <div
        className={`
          aspect-square bg-[var(--color-bg-elevated)] border border-[var(--color-border-dim)] mb-2 flex items-center justify-center relative overflow-hidden
          ${hitFlash ? 'animate-pulse' : ''}
        `}
      >
        <MonsterPortrait defId={instance.defId} className="w-full h-full" />
        {hitFlash && (
          <div className="absolute inset-0 bg-[var(--color-accent-blood)] opacity-50 mix-blend-screen" />
        )}
        <FloatingDamage items={damageFloats} />
      </div>
      <div className="text-[var(--color-text-primary)] text-xs uppercase tracking-wider font-bold truncate">
        {instance.displayName}
      </div>
      <div className="mt-1 text-[var(--color-text-secondary)] text-xs flex items-center gap-2">
        <span>HP</span>
        <span className="font-mono">
          {instance.hp.current}/{instance.hp.max}
        </span>
      </div>
      <div className="h-1.5 bg-[var(--color-bg-elevated)] mt-1 border border-[var(--color-border-dim)] relative overflow-hidden">
        <div
          className="h-full bg-[var(--color-accent-blood)] transition-all duration-500 ease-out"
          style={{ width: `${hpPercent}%` }}
        />
      </div>
      <div className="mt-1 text-[var(--color-text-secondary)] text-xs">
        <span>AC </span>
        <span className="font-mono">{instance.ac}</span>
      </div>
      {dead && (
        <div className="text-[var(--color-accent-blood)] text-xs uppercase tracking-widest mt-1">
          Slain
        </div>
      )}
    </button>
  );
}
