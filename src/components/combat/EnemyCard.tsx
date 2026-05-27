import { memo, useEffect, useRef, useState } from 'react';
import type { MonsterCombatant, AttackEvent } from '../../types/combat';
import { MonsterPortrait } from './MonsterPortrait';
import { FloatingDamage, type FloatingDamageItem } from './FloatingDamage';

interface EnemyCardProps {
  combatant: MonsterCombatant;
  isActiveTurn: boolean;
  selectable: boolean;
  onSelect?: () => void;
  /** Most recent attack event in the combat — used to detect crits on this monster. */
  lastAttack?: AttackEvent;
}

function EnemyCardImpl({ combatant, isActiveTurn, selectable, onSelect, lastAttack }: EnemyCardProps) {
  const { instance } = combatant;
  const dead = instance.hp.current <= 0;
  const hpPercent = (instance.hp.current / instance.hp.max) * 100;

  const prevHp = useRef(instance.hp.current);
  const [damageFloats, setDamageFloats] = useState<FloatingDamageItem[]>([]);
  const [hitFlash, setHitFlash] = useState<'normal' | 'crit' | null>(null);
  const [hitPause, setHitPause] = useState(false);
  const [sparks, setSparks] = useState<Array<{ id: number; dx: number; dy: number }>>([]);

  useEffect(() => {
    if (prevHp.current === instance.hp.current) return;
    const delta = prevHp.current - instance.hp.current;
    prevHp.current = instance.hp.current;
    if (delta > 0) {
      const wasCrit =
        lastAttack?.crit === true &&
        lastAttack.attackerKind === 'player' &&
        lastAttack.targetName === instance.displayName;
      const id = Date.now() + Math.random();
      setDamageFloats((d) => [
        ...d,
        { id, amount: delta, kind: wasCrit ? 'crit' : 'damage' },
      ]);
      setTimeout(() => {
        setDamageFloats((d) => d.filter((x) => x.id !== id));
      }, wasCrit ? 1500 : 1200);
      setHitFlash(wasCrit ? 'crit' : 'normal');
      setTimeout(() => setHitFlash(null), wasCrit ? 320 : 220);
      setHitPause(true);
      setTimeout(() => setHitPause(false), 160);

      if (wasCrit) {
        // Six spark particles in a burst.
        const burst = Array.from({ length: 8 }, (_, i) => {
          const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.6;
          const dist = 32 + Math.random() * 20;
          return {
            id: id + i + 1,
            dx: Math.cos(angle) * dist,
            dy: Math.sin(angle) * dist,
          };
        });
        setSparks((s) => [...s, ...burst]);
        setTimeout(() => {
          setSparks((s) => s.filter((sp) => !burst.find((b) => b.id === sp.id)));
        }, 600);
      }
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
          ${hitPause ? 'animate-hit-pause' : ''}
        `}
      >
        <MonsterPortrait defId={instance.defId} className="w-full h-full" />
        {hitFlash === 'normal' && (
          <div className="absolute inset-0 bg-[var(--color-accent-blood)] opacity-50 mix-blend-screen pointer-events-none" />
        )}
        {hitFlash === 'crit' && (
          <div className="absolute inset-0 pointer-events-none animate-hit-flash-crit" />
        )}
        {/* Crit spark particles */}
        {sparks.map((s) => (
          <div
            key={s.id}
            className="absolute left-1/2 top-1/2 w-1.5 h-1.5 bg-[var(--color-accent-torch)] pointer-events-none animate-spark"
            style={{
              boxShadow:
                '0 0 6px rgba(255,179,71,0.95), 0 0 12px rgba(255,71,48,0.6)',
              ['--spark-dest' as string]: `translate(${s.dx}px, ${s.dy}px)`,
            }}
          />
        ))}
        <FloatingDamage items={damageFloats} />
      </div>
      <div className="text-[var(--color-text-primary)] text-xs uppercase tracking-wider font-bold truncate">
        {instance.displayName}
      </div>
      <div className="mt-1 text-[var(--color-text-secondary)] text-[10px] flex items-center gap-2">
        <span className="font-display text-[8px]">HP</span>
        <span className="font-mono">
          {instance.hp.current}/{instance.hp.max}
        </span>
      </div>
      <div className="h-2 bg-[var(--color-bg-deep)] mt-1 border border-[var(--color-border-dim)] relative overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ease-out ${
            hpPercent > 60
              ? 'bg-gradient-to-r from-[var(--color-accent-blood)] to-[var(--color-accent-deep-blood)]'
              : hpPercent > 30
                ? 'bg-gradient-to-r from-[var(--color-accent-torch)] to-[var(--color-accent-blood)]'
                : 'bg-gradient-to-r from-[var(--color-accent-blood)] to-[var(--color-accent-deep-blood)] animate-pulse'
          }`}
          style={{ width: `${hpPercent}%` }}
        />
        {/* HP bar shine overlay */}
        <div
          className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent pointer-events-none"
          style={{ width: `${hpPercent}%` }}
        />
      </div>
      <div className="mt-1 text-[var(--color-text-secondary)] text-[10px] flex items-center gap-2">
        <span className="font-display text-[8px]">AC</span>
        <span className="font-mono">{instance.ac}</span>
      </div>
      {dead && (
        <div className="text-[var(--color-accent-blood)] text-[10px] uppercase tracking-widest mt-1 font-display">
          Slain
        </div>
      )}
    </button>
  );
}

/**
 * Memoized — same reasoning as BattlefieldSprite: combat state churns hard
 * during a dice/swing/hit cascade, and a single card only needs to re-render
 * when its OWN monster instance or selectability changes.
 */
export const EnemyCard = memo(EnemyCardImpl, (prev, next) => {
  if (prev.isActiveTurn !== next.isActiveTurn) return false;
  if (prev.selectable !== next.selectable) return false;
  if (prev.lastAttack?.id !== next.lastAttack?.id) return false;
  // onSelect intentionally not compared; callers re-create arrows each render.
  return prev.combatant === next.combatant;
});
