import type { MonsterCombatant } from '../../types/combat';

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

  return (
    <button
      type="button"
      disabled={!selectable || dead}
      onClick={onSelect}
      className={`
        bg-[var(--color-bg-panel)] border-2 p-3 min-w-[140px] text-left transition-all
        ${selectable && !dead
          ? 'border-[var(--color-accent-amber)] cursor-pointer hover:bg-[var(--color-bg-panel-hover)] hover:scale-[1.02] shadow-[0_0_12px_rgba(244,167,66,0.3)]'
          : 'border-[var(--color-border-warm)]'}
        ${isActiveTurn ? 'ring-2 ring-[var(--color-accent-blood)]' : ''}
        ${dead ? 'opacity-30 grayscale' : ''}
        disabled:cursor-not-allowed
      `}
    >
      <div className="aspect-square bg-[var(--color-bg-elevated)] border border-[var(--color-border-dim)] mb-2 flex items-center justify-center text-3xl">
        <span aria-hidden>👹</span>
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
      <div className="h-1 bg-[var(--color-bg-elevated)] mt-1">
        <div
          className="h-full bg-[var(--color-accent-blood)] transition-all"
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
